# 078 자동 쓰기: 놓친 날 다시 쓰기와 시도 기록 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자동 쓰기 판정이 시도 창 밖에서도 지난 날의 안 쓴 일기를 쓰게 하고, 자동 쓰기가 판정에 들어갈 때마다 경로·결과를 기록해 진단 화면에 보인다.

**Architecture:** 조각 1은 순수 판정 `decideSchedule`(020 D2)에 `today` 입력을 더해 「오늘은 창 안에서만, 지난 날은 언제든」으로 바꾼다 — 백그라운드·앱 열기·진단 수동 실행이 같은 함수를 쓰므로 한 곳이다. 조각 2는 060 쓰기 실패 기록(`src/app/write-failures.ts`)과 같은 꼴의 새 모듈 `src/app/auto-write-attempts.ts`(순수 판정 + `preferences/auto-write-attempts.json` 통로)를 두고, `runAutoDiaryTask`가 시작·끝을, `DiarySection`이 판정 한 줄을 기록하며, `DiagnosticsLayer`가 읽어 `DiagnosticsScreen`의 새 묶음에 그린다. 문구는 062 규칙대로 카탈로그의 새 영역이다.

**Tech Stack:** TypeScript, React Native 0.86 / Expo SDK 57, jest(`logic`·`ui` 두 프로젝트), RNTL 14, `expo-file-system`(`*Sync` 규칙).

**Spec:** `docs/superpowers/specs/2026-10-13-auto-write-missed-day-and-attempt-log-design.md`

## Global Constraints

- 브랜치는 `078-auto-write-retry-and-attempt-log`다. `main`에 커밋하지 않는다(`.githooks`가 막는다). 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 테스트 먼저 쓴다(TDD). 순수 로직은 `npm run test:logic`, 화면은 `npm run test:ui`, 태스크 끝마다 `npm run lint`(eslint + tsc + 헌법 검사 + prettier). 포맷은 `npx prettier --write <파일>`.
- `decision.ts`는 `new Date()`를 부르지 않고 `WINDOW_HOURS`를 export하지 않으며 `pickRetryDay`를 재사용한다(020 D3·D4·D5). `decision.ts`·`auto-write.ts`·`retry.ts`에 `manual`이라는 낱말이 들어가면 안 된다(060 AR3).
- 기록 갈래는 **사람이 못 박은 상수**다: 경로 셋 `background`·`app-open`·`manual`, 결과 열둘 `started`·`simulation`·`disabled`·`not-near-target`·`all-written`·`no-photo-access`·`no-material`·`no-character`·`write`·`already-running`·`ran`·`failed`. 시간·바이트·토큰·단계별 소요·이유 문자열은 기록하지 않는다(원칙 IV).
- 저장 파일은 `preferences/auto-write-attempts.json` `{ items: [{ at, path, outcome }] }`, 최신이 앞, 상한 `MAX_AUTO_WRITE_ATTEMPTS = 20`. 못 읽거나 깨지면 빈 목록, 쓰기 실패는 삼킨다.
- 짧게 사는 `expo-file-system` `File`에는 `textSync()`·`moveSync()`만 쓴다(AGENTS — `__tests__/diary/expo-file-sync.test.ts`가 소스를 센다).
- 화면에 보이는 한글은 `src/i18n/catalogs/ko/`에만 둔다(062 B1). 새 문구는 **새 영역** `attempts`에 두고 옛 영역(`diagnostics`)에 키를 더하지 않는다. 새 한글 리터럴은 `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 올린다 — 골든 json은 다시 쓰지 않는다.
- `text()`·`lazyText` 속성을 모듈 최상단 상수에서 평가하지 않는다(062 C4) — 문구 표는 함수 안에서 만든다.
- 화면(`src/ui/`)은 값과 핸들러만 받는다 — `DiagnosticsScreen`이 기록 모듈을 import하지 않고 `diagnostics-view.ts`가 옮긴 문자열만 받는다.

## Review Focus

1. **자정 wrap(목표 23시, 지금 00:30)**: `today`는 새 날인데 `selectableDays`는 정오 전이라 오늘을 안 넣는다 — 후보는 지난 날뿐이고 어제를 써야 한다. Task 1 D2-2 wrap 테스트(`at(0)`·`at(1)`)가 어제(`2026-08-27`)를 단언한다.
2. **정오 전·창 밖·지난 날 전부 씀**: `not-near-target`이 아니라 `all-written`이어야 한다(오늘은 후보에 없었으므로 「시각이 아니라서」가 아니다). Task 1 테스트 「6시 · 지난 날 다 씀 → all-written」.
3. **앱 열기 줄이 백그라운드 줄을 밀어낸다**: 전경 복귀마다 한 줄이면 하루 20번 앱을 연 사용자의 기록에서 iOS 백그라운드 증거가 사라진다. Task 3이 「바로 앞 줄과 경로·결과가 같으면 시각만 갱신한다」를 더하고(스펙의 「20건 상한이 막는다」를 보강) AT4b가 잠근다.
4. **시작 줄과 끝 줄이 짝을 못 찾는다**: `at`은 `runAutoDiaryTask`가 한 번 만든 `now`를 양쪽에 그대로 넘겨야 한다(ms까지 같은 ISO). Task 4 테스트 「한 실행에 줄이 하나다」가 두 줄이 아니라 한 줄임을 단언한다.
5. **기록 통로가 자동 쓰기를 막는다**: 통로가 던져도 `runAutoDiaryTask` 결과와 파이프라인 호출은 그대로여야 한다. Task 4 테스트 「통로가 던져도 결과는 그대로」.

---

### Task 1: `decideSchedule` — 오늘은 창 안에서만, 지난 날은 언제든

**Files:**
- Modify: `src/schedule/decision.ts`
- Modify: `src/schedule/auto-write.ts` (`today` 전달)
- Modify: `specs/020-scheduled-diary-notification/contracts/schedule-decision.md` (D1·D2)
- Test: `__tests__/schedule/decision.test.ts` (전면 개정)

**Interfaces:**
- Produces: `decideSchedule(input: { settings; now; today: DayDate; selectableDays; existingDiaryDays })` — `ScheduleDecision` 타입은 그대로(`disabled`·`not-near-target`·`all-written`·`{ act: true, day }`).

- [ ] **Step 1: 테스트를 새 규칙으로 다시 쓴다**

`__tests__/schedule/decision.test.ts` 전체를 아래로 바꾼다(소스 검사 블록은 그대로).

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { decideSchedule } from "../../src/schedule/decision";
import type { AutoDiarySettings } from "../../src/schedule/settings";

/**
 * 스케줄 판정의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/schedule-decision.md D1~D4·D7 (078이 D1·D2를 고쳤다)
 *
 * 078 — **오늘은 시도 창 안에서만, 지난 날(`selectableDays` 중 `today`가 아닌 날)은 언제든 쓴다.** iOS `BGTaskScheduler`는
 * 창 안에 깨운다는 보장이 없고 앱 열기 경로도 같은 판정이라, 놓친 날을 다음 기회에 쓰지 않으면 iOS에서 일기가 영영 안 생겼다.
 */

const ENABLED: AutoDiarySettings = { enabled: true, targetHour: 7 };
const TODAY = "2026-08-28";

/** 기기 현지 시각으로 특정 시(hour)를 만든다 — 2026-08-28 hh:30 */
function at(hour: number): Date {
  return new Date(2026, 7, 28, hour, 30, 0, 0);
}

/** 정오 전의 사흘(오늘 없음) — `selectableDays()`의 구성 규칙(049) */
const PAST_ONLY = ["2026-08-27", "2026-08-26", "2026-08-25"] as const;
/** 정오 후의 사흘(오늘 포함) */
const WITH_TODAY = [TODAY, "2026-08-27", "2026-08-26"] as const;
const PAST_WRITTEN = ["2026-08-27", "2026-08-26", "2026-08-25"] as const;

describe("D2-1 — 꺼져 있으면 안 한다", () => {
  it("enabled: false면 { act: false, reason: 'disabled' } — 지난 날이 비어 있어도", () => {
    const r = decideSchedule({
      settings: { ...ENABLED, enabled: false },
      now: at(7),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "disabled" });
  });
});

describe("D2-2 — 오늘은 창 안에서만 (목표 14시, 창 [14, 17))", () => {
  const PM: AutoDiarySettings = { enabled: true, targetHour: 14 };

  it("창 안(14시)이고 오늘이 비어 있으면 오늘", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(14),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });

  it("창의 마지막 시(16시)도 창 안", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(16),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });

  it("창의 끝(17시)이면 오늘은 안 쓴다 — 오늘만 비어 있으면 not-near-target", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(17),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창 직전(13시)도 오늘은 안 쓴다", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(13),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창 안이고 오늘도 어제도 비어 있으면 가장 최근인 오늘", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(15),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });
});

describe("D2-2 — 지난 날은 창과 무관하게 (078)", () => {
  it("창 밖(6시, 목표 7시)이어도 어제가 비어 있으면 어제", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(6),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("창 밖(17시)이고 오늘·어제가 비어 있으면 오늘을 건너 어제", () => {
    const r = decideSchedule({
      settings: { enabled: true, targetHour: 14 },
      now: at(17),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("창 밖이고 어제는 써 있고 그제가 비어 있으면 그제", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(3),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: ["2026-08-27"],
    });
    expect(r).toEqual({ act: true, day: "2026-08-26" });
  });

  it("창 밖(6시)이고 지난 날이 다 써 있으면(오늘은 정오 전이라 후보 아님) all-written", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(6),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });
});

describe("D2-2 — 자정 wrap (목표 23시, 창 [23, 26) → 23·0·1)", () => {
  const LATE: AutoDiarySettings = { ...ENABLED, targetHour: 23 };

  it("23시면 창 안 — 오늘(정오 후)을 쓴다", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(23),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });

  it("자정 넘어 0시면 창 안 — 새 날은 정오 전이라 후보에 없고 어제(그날)를 쓴다", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(0),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("1시도 창 안 — 어제", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(1),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("22시(창 시작 직전)면 오늘은 안 쓴다 — 오늘만 비어 있으면 not-near-target", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(22),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("22시여도 어제가 비어 있으면 어제", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(22),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [TODAY, "2026-08-26"],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });
});

describe("D2-3 — 대상 하루 선정 (retry.ts 재사용)", () => {
  it("창 안이고 전부 써졌으면 { act: false, reason: 'all-written' }", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(7),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });

  it("창 밖이고 오늘 포함 전부 써졌으면 all-written (not-near-target이 아니다)", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(17),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [TODAY, "2026-08-27", "2026-08-26"],
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });

  it("가장 최근이 써졌으면 그다음을 대상으로", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(8),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: ["2026-08-27"],
    });
    expect(r).toEqual({ act: true, day: "2026-08-26" });
  });
});

describe("소스 검사 — D3·D4·D7", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/decision.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("D4 — now를 인자로 받는다 (안에서 new Date() 없음)", () => {
    expect(CODE).not.toMatch(/new Date\(\)/);
  });

  it("D3 — WINDOW_HOURS를 export하지 않는다", () => {
    expect(CODE).not.toMatch(/export\s+(const|let|function)\s+WINDOW_HOURS/);
    expect(CODE).toMatch(/\bWINDOW_HOURS\b/);
  });

  it("D7 — 파이프라인·알림·잠금을 부르지 않는다 (순수 판정)", () => {
    expect(CODE).not.toMatch(/pipeline|\.run\(|notification|acquireLock|present\(/i);
  });

  it("D5 — pickRetryDay를 재사용한다 (대상 선정을 다시 구현하지 않음)", () => {
    expect(CODE).toMatch(/pickRetryDay/);
  });

  it("078 — 하루 경계를 계산하지 않는다 (dayOf·getDate를 import·호출하지 않고 today를 주입받는다)", () => {
    expect(CODE).not.toMatch(/\bdayOf\b|getDate\(/);
    expect(CODE).toMatch(/today/);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest --selectProjects logic __tests__/schedule/decision.test.ts`
Expected: FAIL — `today`가 없는 입력 타입은 jest가 지우므로 타입 오류가 아니라 **창 밖 지난 날 케이스**가 `not-near-target`으로 떨어져 실패한다(「창 밖(6시, 목표 7시)이어도 어제가 비어 있으면 어제」 등). 「078 — 하루 경계를 계산하지 않는다」는 `today`가 소스에 없어 실패한다.

- [ ] **Step 3: `decision.ts`를 고친다**

`src/schedule/decision.ts`의 `decideSchedule`와 그 위 주석을 아래로 바꾼다(`isNearTarget`·`WINDOW_HOURS`·import는 그대로).

```ts
/**
 * 지금 자동 생성을 돌려야 하는가.
 * 판정 순서(고정, D2 — 078 개정):
 *  1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
 *  2. `near` = `now`의 현지 시(hour)가 목표 시각 근방인가. 후보는 `near`면
 *     `selectableDays` 전부, 아니면 거기서 `today`를 뺀 것 — **오늘은 창 안에서만,
 *     지난 날은 언제든**(078: iOS `BGTaskScheduler`는 창 안에 깨운다는 보장이 없다).
 *  3. `pickRetryDay(후보, existingDiaryDays)`가 날을 주면 → `{ act: true, day }`.
 *  4. `null`이면: 창 밖이고 오늘이 `selectableDays`에 있으며 안 쓴 날이면
 *     `not-near-target`, 그 밖은 `all-written`.
 *
 * `today`는 주입이다(`dayOf(now)`) — 이 파일은 하루 경계를 계산하지 않는다(FR-021a).
 */
export function decideSchedule(input: {
  settings: AutoDiarySettings;
  now: Date;
  today: DayDate;
  selectableDays: readonly DayDate[];
  existingDiaryDays: readonly DayDate[];
}): ScheduleDecision {
  const { settings, now, today, selectableDays, existingDiaryDays } = input;

  if (!settings.enabled) {
    return { act: false, reason: "disabled" };
  }

  const near = isNearTarget(now.getHours(), settings.targetHour);
  const candidates = near ? selectableDays : selectableDays.filter((day) => day !== today);

  const day = pickRetryDay(candidates, existingDiaryDays);
  if (day !== null) {
    return { act: true, day };
  }

  const todayPending =
    !near && selectableDays.includes(today) && !existingDiaryDays.includes(today);
  return { act: false, reason: todayPending ? "not-near-target" : "all-written" };
}
```

`src/schedule/auto-write.ts`의 import 한 줄과 `decideSchedule` 호출을 고친다:

```ts
import { dayOf, selectableDays, type DayDate } from "../config/day-boundary";
```

```ts
  const schedule = decideSchedule({
    settings: deps.settings,
    now: deps.now,
    today: dayOf(deps.now),
    selectableDays: selectableDays(deps.now),
    existingDiaryDays: await deps.listDiaryDays(),
  });
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx jest --selectProjects logic __tests__/schedule/decision.test.ts __tests__/schedule/auto-write.test.ts`
Expected: PASS 전부. `auto-write.test.ts`가 실패하면 그 실패가 `today` 전달 때문인지 읽고(예: `decideSchedule` 호출 인자를 `toHaveBeenCalledWith`로 단언하는 테스트) `today: expect.any(String)`을 더해 고친다 — 판정 결과를 바꾸는 단언은 고치지 않는다.

- [ ] **Step 5: 020 계약 문서를 고친다**

`specs/020-scheduled-diary-notification/contracts/schedule-decision.md`에서 D1의 시그니처 블록에 `today: DayDate;              // dayOf(now) — 주입` 줄을 `now: Date;` 다음에 더하고, D2 전체를 아래로 바꾼다.

```markdown
## D2 — 판정 순서 (고정, 078 개정)

1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
2. `near` = `now`의 **현지 시(hour)** 가 `[targetHour, targetHour + WINDOW_HOURS)`
   구간에 있는가. `targetHour + WINDOW_HOURS > 24`이면 자정을 넘겨 wrap한다
   (예: `targetHour=23, WINDOW_HOURS=3` → 23·0·1시가 근방).
   후보 = `near`면 `selectableDays` 전부, 아니면 `selectableDays`에서 `today`를 뺀 것.
   **오늘은 창 안에서만, 지난 날은 언제든 쓴다** — iOS `BGTaskScheduler`는 창 안에
   깨운다는 보장이 없고(078), 앱 열기 경로(057)도 같은 판정이다.
3. `pickRetryDay(후보, existingDiaryDays)`가 날을 주면 → `{ act: true, day }`.
4. `null`이면: `near`가 아니고 `today`가 `selectableDays`에 있으며 안 쓴 날이면
   `{ act: false, reason: "not-near-target" }`, 그 밖은 `{ act: false, reason: "all-written" }`.

`today`는 `dayOf(now)`를 부르는 쪽(`resolveAutoWrite`)이 넘긴다 — `decision.ts`는
하루 경계를 계산하지 않는다(FR-021a).
```

같은 파일 끝의 위반 표에서 「`decideSchedule`가 `settings.targetHour`를 무시하고 항상 `act: true`」 행의 설명을 「D2-2 위반 — 창 밖이면 오늘을 쓰지 않는다(`not-near-target`)」로 고친다.

- [ ] **Step 6: lint 뒤 커밋**

Run: `npx prettier --write src/schedule/decision.ts src/schedule/auto-write.ts __tests__/schedule/decision.test.ts && npm run lint`
Expected: 0 오류. `tsc`가 `decideSchedule` 호출부를 더 짚으면(지금은 `auto-write.ts` 하나) 그 자리에도 `today: dayOf(...)`를 준다.

```bash
git add src/schedule/decision.ts src/schedule/auto-write.ts __tests__/schedule/decision.test.ts specs/020-scheduled-diary-notification/contracts/schedule-decision.md
git commit -m "feat: 078 자동 쓰기 판정 — 오늘은 창 안에서만, 지난 날은 언제든 쓴다 (iOS BGTask가 창 안에 깨운다는 보장이 없다)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 태스크 수준 테스트를 새 규칙에 맞춘다

**Files:**
- Test: `__tests__/schedule/background-generation.test.ts`
- Test: `__tests__/schedule/task-manual.test.ts`

**Interfaces:**
- Consumes: Task 1의 `decideSchedule` 규칙. `runAutoDiaryTask` 시그니처는 그대로.

- [ ] **Step 1: 깨진 테스트를 확인한다**

Run: `npx jest --selectProjects logic __tests__/schedule/background-generation.test.ts __tests__/schedule/task-manual.test.ts`
Expected: FAIL 둘 — 「목표 시각 근방이 아니면 'skipped'」(03:30, 지난 날이 비어 있어 이제 쓴다)와 AR4 「켜져 있어도 창 밖이면 skipped」(15:30, 어제가 비어 있어 이제 쓴다). 다른 실패가 있으면 멈추고 원인을 읽는다.

- [ ] **Step 2: 두 테스트를 새 규칙으로 고치고 새 케이스를 더한다**

`background-generation.test.ts`의 「목표 시각 근방이 아니면 'skipped'」를 아래 둘로 바꾼다:

```ts
  it("창 밖이고 오늘만 비어 있으면 'skipped' (오늘은 창 안에서만)", async () => {
    const { deps, pipelineRun } = baseDeps({
      now: at(15),
      listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"],
    });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
  });

  it("078 — 창 밖이어도 지난 날이 비어 있으면 그 날을 쓴다", async () => {
    const { deps, pipelineRun } = baseDeps({ now: at(3) });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(pipelineRun).toHaveBeenCalledWith(expect.objectContaining({ day: "2026-08-27" }));
  });
```

`task-manual.test.ts`의 AR4 「켜져 있어도 창 밖이면 skipped」를 아래로 바꾸고 하나를 더한다(`make`는 `listDiaryDays`를 이미 받는다):

```ts
  it("켜져 있고 창 밖이며 오늘만 비어 있으면 skipped", async () => {
    const { deps, run } = make({
      enabled: true,
      listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"],
    });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
  });

  it("078 — 켜져 있고 창 밖이어도 어제가 비어 있으면 어제를 쓴다", async () => {
    const { deps, run } = make({ enabled: true });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ day: "2026-08-27" }));
  });
```

- [ ] **Step 3: 통과를 확인한다**

Run: `npx jest --selectProjects logic __tests__/schedule`
Expected: PASS 전부.

- [ ] **Step 4: 커밋**

```bash
git add __tests__/schedule/background-generation.test.ts __tests__/schedule/task-manual.test.ts
git commit -m "test: 078 태스크 테스트를 새 판정(창 밖에도 지난 날)에 맞춘다

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 시도 기록 모듈 `src/app/auto-write-attempts.ts`

**Files:**
- Create: `src/app/auto-write-attempts.ts`
- Test: `__tests__/app/auto-write-attempts.test.ts`

**Interfaces:**
- Consumes: `AutoWriteDecision`(`src/schedule/auto-write.ts`).
- Produces:
  - `type AttemptPath = "background" | "app-open" | "manual"`, `ATTEMPT_PATHS`
  - `type AttemptOutcome = "started" | "simulation" | "disabled" | "not-near-target" | "all-written" | "no-photo-access" | "no-material" | "no-character" | "write" | "already-running" | "ran" | "failed"`, `ATTEMPT_OUTCOMES`
  - `type AutoWriteAttempt = { at: Date; path: AttemptPath; outcome: AttemptOutcome }`
  - `MAX_AUTO_WRITE_ATTEMPTS = 20`
  - `interface AutoWriteAttemptPort { read(): Promise<string | null>; write(serialized: string): Promise<void> }`
  - `attemptOutcomeOf(decision: AutoWriteDecision): AttemptOutcome`
  - `loadAutoWriteAttempts(port): Promise<AutoWriteAttempt[]>`
  - `recordAttemptStart(port, path, at): Promise<void>`
  - `recordAttemptEnd(port, path, at, outcome): Promise<void>`
  - `expoAutoWriteAttemptPort(): AutoWriteAttemptPort`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`__tests__/app/auto-write-attempts.test.ts`:

```ts
/**
 * 078 — 자동 쓰기 시도 기록 (AT1~AT9). 060 쓰기 실패 기록과 같은 꼴이다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ATTEMPT_OUTCOMES,
  ATTEMPT_PATHS,
  MAX_AUTO_WRITE_ATTEMPTS,
  attemptOutcomeOf,
  loadAutoWriteAttempts,
  recordAttemptEnd,
  recordAttemptStart,
  type AutoWriteAttemptPort,
} from "../../src/app/auto-write-attempts";

function memoryPort(initial: string | null = null): AutoWriteAttemptPort & { content: string | null } {
  const port = {
    content: initial,
    async read() {
      return port.content;
    },
    async write(serialized: string) {
      port.content = serialized;
    },
  };
  return port;
}

const AT = new Date("2026-10-13T13:12:03.456Z");
const LATER = new Date("2026-10-13T14:00:00.000Z");

describe("AT1 — 갈래는 사람이 못 박은 상수다", () => {
  it("경로 셋, 결과 열둘 — 순서까지", () => {
    expect(ATTEMPT_PATHS).toEqual(["background", "app-open", "manual"]);
    expect(ATTEMPT_OUTCOMES).toEqual([
      "started",
      "simulation",
      "disabled",
      "not-near-target",
      "all-written",
      "no-photo-access",
      "no-material",
      "no-character",
      "write",
      "already-running",
      "ran",
      "failed",
    ]);
    expect(MAX_AUTO_WRITE_ATTEMPTS).toBe(20);
  });
});

describe("AT2 — 시작은 started 줄을 맨 앞에 넣는다", () => {
  it("빈 기록에 한 줄", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    expect(await loadAutoWriteAttempts(port)).toEqual([
      { at: AT, path: "background", outcome: "started" },
    ]);
    expect(JSON.parse(port.content ?? "")).toEqual({
      items: [{ at: "2026-10-13T13:12:03.456Z", path: "background", outcome: "started" }],
    });
  });

  it("기존 줄 앞에 선다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptStart(port, "manual", LATER);
    expect((await loadAutoWriteAttempts(port)).map((i) => i.path)).toEqual(["manual", "background"]);
  });
});

describe("AT3 — 끝은 같은 at·path의 줄을 결과로 바꾼다", () => {
  it("짝을 찾으면 줄 수가 늘지 않는다 (ms까지 같은 at)", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptEnd(port, "background", AT, "ran");
    expect(await loadAutoWriteAttempts(port)).toEqual([{ at: AT, path: "background", outcome: "ran" }]);
  });

  it("경로가 다르면 짝이 아니다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptEnd(port, "manual", AT, "ran");
    expect((await loadAutoWriteAttempts(port)).map((i) => i.outcome)).toEqual(["ran", "started"]);
  });
});

describe("AT4 — 짝 없는 끝", () => {
  it("짝이 없으면 맨 앞에 넣는다 (앱 열기 경로는 시작 없이 끝만 쓴다)", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    expect(await loadAutoWriteAttempts(port)).toEqual([
      { at: AT, path: "app-open", outcome: "not-near-target" },
    ]);
  });

  it("AT4b — 바로 앞 줄과 경로·결과가 같으면 시각만 갱신한다 (앱 열기 줄이 백그라운드 줄을 밀어내지 않게)", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "background", AT, "not-near-target");
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    await recordAttemptEnd(port, "app-open", LATER, "not-near-target");
    const items = await loadAutoWriteAttempts(port);
    expect(items).toEqual([
      { at: LATER, path: "app-open", outcome: "not-near-target" },
      { at: AT, path: "background", outcome: "not-near-target" },
    ]);
  });

  it("바로 앞 줄과 결과가 다르면 새 줄이다", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    await recordAttemptEnd(port, "app-open", LATER, "write");
    expect((await loadAutoWriteAttempts(port)).map((i) => i.outcome)).toEqual(["write", "not-near-target"]);
  });
});

describe("AT5 — 상한 20", () => {
  it("21번째를 넣으면 가장 오래된 것이 떨어진다", async () => {
    const port = memoryPort();
    for (let n = 0; n < 21; n += 1) {
      await recordAttemptStart(port, "background", new Date(Date.UTC(2026, 9, 1, n)));
    }
    const items = await loadAutoWriteAttempts(port);
    expect(items).toHaveLength(20);
    expect(items[0]?.at.toISOString()).toBe("2026-10-01T20:00:00.000Z");
    expect(items[19]?.at.toISOString()).toBe("2026-10-01T01:00:00.000Z");
  });
});

describe("AT6 — 깨진 기록", () => {
  it.each([
    ["JSON 아님", "{"],
    ["items가 배열 아님", JSON.stringify({ items: 3 })],
    ["객체 아님", "7"],
  ])("%s → 빈 목록", async (_name, raw) => {
    expect(await loadAutoWriteAttempts(memoryPort(raw))).toEqual([]);
  });

  it("모르는 갈래·깨진 시각은 건너뛰고 나머지는 산다", async () => {
    const port = memoryPort(
      JSON.stringify({
        items: [
          { at: "2026-10-13T13:12:03.456Z", path: "background", outcome: "ran" },
          { at: "2026-10-13T13:12:03.456Z", path: "cron", outcome: "ran" },
          { at: "2026-10-13T13:12:03.456Z", path: "background", outcome: "took-5s" },
          { at: "어제", path: "background", outcome: "ran" },
          null,
        ],
      }),
    );
    expect(await loadAutoWriteAttempts(port)).toEqual([{ at: AT, path: "background", outcome: "ran" }]);
  });

  it("읽기 예외 → 빈 목록", async () => {
    const broken: AutoWriteAttemptPort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    expect(await loadAutoWriteAttempts(broken)).toEqual([]);
  });
});

describe("AT7 — 기록 실패는 삼킨다", () => {
  it("쓰기 예외가 밖으로 나오지 않는다", async () => {
    const broken: AutoWriteAttemptPort = {
      read: async () => null,
      write: () => Promise.reject(new Error("io")),
    };
    await expect(recordAttemptStart(broken, "background", AT)).resolves.toBeUndefined();
    await expect(recordAttemptEnd(broken, "background", AT, "ran")).resolves.toBeUndefined();
  });
});

describe("AT8 — 판정 → 갈래", () => {
  it("idle은 reason, skip은 because, write는 write", () => {
    expect(attemptOutcomeOf({ kind: "idle", reason: "disabled" })).toBe("disabled");
    expect(attemptOutcomeOf({ kind: "idle", reason: "not-near-target" })).toBe("not-near-target");
    expect(attemptOutcomeOf({ kind: "idle", reason: "all-written" })).toBe("all-written");
    expect(attemptOutcomeOf({ kind: "skip", day: "2026-10-12", because: "no-photo-access" })).toBe(
      "no-photo-access",
    );
    expect(attemptOutcomeOf({ kind: "skip", day: "2026-10-12", because: "no-material" })).toBe(
      "no-material",
    );
    expect(attemptOutcomeOf({ kind: "write", day: "2026-10-12" })).toBe("write");
  });
});

describe("AT9 — 소스 계약", () => {
  const SRC = readFileSync(join(__dirname, "../../src/app/auto-write-attempts.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("파일은 preferences/auto-write-attempts.json 하나이고 비동기 File 호출을 쓰지 않는다", () => {
    expect(SRC).toMatch(/"preferences"/);
    expect(SRC).toMatch(/"auto-write-attempts\.json"/);
    expect(SRC).toMatch(/textSync\(\)/);
    expect(SRC).toMatch(/moveSync\(/);
    expect(SRC).not.toMatch(/\.text\(\)|\.move\(|\.copy\(|\.bytes\(/);
  });

  it("시간·바이트·토큰을 기록하지 않는다 (원칙 IV)", () => {
    expect(SRC).not.toMatch(/elapsed|duration|bytes|token|timings/i);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest --selectProjects logic __tests__/app/auto-write-attempts.test.ts`
Expected: FAIL — `Cannot find module '../../src/app/auto-write-attempts'`.

- [ ] **Step 3: 모듈을 쓴다**

`src/app/auto-write-attempts.ts`:

```ts
/**
 * 자동 쓰기 시도 기록 (078).
 *
 * 설계: docs/superpowers/specs/2026-10-13-auto-write-missed-day-and-attempt-log-design.md 조각 2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜**: iPhone에서 자동 쓰기가 안 될 때 「OS가 한 번도 깨우지 않았다」·「깼는데 창 밖이었다」·「완주하다 끊겼다」를 가를 증거가 없었다.
 * 자동 쓰기가 **판정에 들어갈 때마다** 경로·결과 한 줄을 남기고 진단 화면이 보인다. 060 쓰기 실패 기록(`write-failures.ts`)과 같은 꼴이다.
 *
 * **갈래는 사람이 못 박은 상수다**(원칙 IV) — 시간·바이트·토큰·단계별 소요·이유 문자열은 싣지 않는다. 백그라운드·수동 실행은
 * 시작(`started`)을 먼저 쓰고 끝에 같은 줄을 결과로 바꾼다 — 끝이 영영 안 오면 `started`가 남고 그것이 「프로세스가 도중에 정지됐다」의
 * 증거다. 앱 열기 경로는 판정이 끊길 일이 없어 끝 한 줄만 쓴다. 바로 앞 줄과 경로·결과가 같으면 새 줄 대신 시각만 갱신한다 —
 * 전경 복귀마다 판정하는 앱 열기 줄이 백그라운드 줄을 상한 밖으로 밀어내지 않게.
 *
 * 058 지우기·059 개발자 끄기·온보딩 다시는 이 파일을 건드리지 않는다. 기록 실패는 삼킨다 — 기록이 자동 쓰기를 막지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AutoWriteDecision } from "../schedule/auto-write";

export type AttemptPath = "background" | "app-open" | "manual";
export const ATTEMPT_PATHS: readonly AttemptPath[] = ["background", "app-open", "manual"];

export type AttemptOutcome =
  | "started"
  | "simulation"
  | "disabled"
  | "not-near-target"
  | "all-written"
  | "no-photo-access"
  | "no-material"
  | "no-character"
  | "write"
  | "already-running"
  | "ran"
  | "failed";
export const ATTEMPT_OUTCOMES: readonly AttemptOutcome[] = [
  "started",
  "simulation",
  "disabled",
  "not-near-target",
  "all-written",
  "no-photo-access",
  "no-material",
  "no-character",
  "write",
  "already-running",
  "ran",
  "failed",
];

export type AutoWriteAttempt = { at: Date; path: AttemptPath; outcome: AttemptOutcome };

/** 최근 몇 건을 남기는가 — 사람이 정한 값 */
export const MAX_AUTO_WRITE_ATTEMPTS = 20;

export interface AutoWriteAttemptPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 057 판정 결과를 갈래로 — `idle`은 020 이유, `skip`은 057 이유, `write`는 「쓸 날을 넘겼다」 */
export function attemptOutcomeOf(decision: AutoWriteDecision): AttemptOutcome {
  if (decision.kind === "idle") return decision.reason;
  if (decision.kind === "skip") return decision.because;
  return "write";
}

function isPath(value: unknown): value is AttemptPath {
  return typeof value === "string" && (ATTEMPT_PATHS as readonly string[]).includes(value);
}

function isOutcome(value: unknown): value is AttemptOutcome {
  return typeof value === "string" && (ATTEMPT_OUTCOMES as readonly string[]).includes(value);
}

/** 못 읽거나 깨졌으면 빈 목록. 깨진 항목은 건너뛴다(060과 같다). */
export async function loadAutoWriteAttempts(port: AutoWriteAttemptPort): Promise<AutoWriteAttempt[]> {
  try {
    const raw = await port.read();
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];
    const out: AutoWriteAttempt[] = [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const { at, path, outcome } = item as { at?: unknown; path?: unknown; outcome?: unknown };
      if (typeof at !== "string" || !isPath(path) || !isOutcome(outcome)) continue;
      const date = new Date(at);
      if (Number.isNaN(date.getTime())) continue;
      out.push({ at: date, path, outcome });
    }
    return out.slice(0, MAX_AUTO_WRITE_ATTEMPTS);
  } catch {
    return [];
  }
}

async function save(port: AutoWriteAttemptPort, items: readonly AutoWriteAttempt[]): Promise<void> {
  await port.write(
    JSON.stringify({
      items: items
        .slice(0, MAX_AUTO_WRITE_ATTEMPTS)
        .map((item) => ({ at: item.at.toISOString(), path: item.path, outcome: item.outcome })),
    }),
  );
}

/** 시작 — `started` 줄을 맨 앞에. 실패는 삼킨다. */
export async function recordAttemptStart(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
): Promise<void> {
  try {
    const previous = await loadAutoWriteAttempts(port);
    await save(port, [{ at, path, outcome: "started" }, ...previous]);
  } catch {
    // 기록이 자동 쓰기를 막지 않는다.
  }
}

/**
 * 끝 — 같은 `at`(ms까지)·`path`의 줄을 결과로 바꾼다. 짝이 없으면: 바로 앞 줄과 경로·결과가 같으면 그 줄의 시각만 갱신하고,
 * 아니면 맨 앞에 넣는다. 실패는 삼킨다.
 */
export async function recordAttemptEnd(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
  outcome: AttemptOutcome,
): Promise<void> {
  try {
    const previous = await loadAutoWriteAttempts(port);
    const key = at.toISOString();
    const index = previous.findIndex((item) => item.path === path && item.at.toISOString() === key);
    if (index >= 0) {
      await save(
        port,
        previous.map((item, n) => (n === index ? { ...item, outcome } : item)),
      );
      return;
    }
    const head = previous[0];
    if (head !== undefined && head.path === path && head.outcome === outcome) {
      await save(port, [{ ...head, at }, ...previous.slice(1)]);
      return;
    }
    await save(port, [{ at, path, outcome }, ...previous]);
  } catch {
    // 기록이 자동 쓰기를 막지 않는다.
  }
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const ATTEMPT_FILE = "auto-write-attempts.json";

async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** `preferences/auto-write-attempts.json`. 임시 파일에 쓰고 옮긴다(060과 같다). 짧게 사는 `File`에는 `*Sync()`만 쓴다(AGENTS). */
export function expoAutoWriteAttemptPort(): AutoWriteAttemptPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, ATTEMPT_FILE);
      return file.exists ? file.textSync() : null;
    },
    async write(serialized) {
      const { dir, File } = await openDirectory();
      const temporary = new File(dir, `${ATTEMPT_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);
      const target = new File(dir, ATTEMPT_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx jest --selectProjects logic __tests__/app/auto-write-attempts.test.ts __tests__/diary/expo-file-sync.test.ts`
Expected: PASS 전부(`expo-file-sync`가 새 파일의 `*Sync` 사용을 센다).

- [ ] **Step 5: lint 뒤 커밋**

Run: `npx prettier --write src/app/auto-write-attempts.ts __tests__/app/auto-write-attempts.test.ts && npm run lint`
Expected: 0 오류.

```bash
git add src/app/auto-write-attempts.ts __tests__/app/auto-write-attempts.test.ts
git commit -m "feat: 078 자동 쓰기 시도 기록 모듈 — 경로 셋·결과 열둘·최근 20건, 시작/끝 따로

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `runAutoDiaryTask`가 시작·끝을 기록한다

**Files:**
- Modify: `src/schedule/task.ts` (`runAutoDiaryTask`·`AutoDiaryTaskDeps`)
- Test: `__tests__/schedule/background-generation.test.ts`, `__tests__/schedule/task-manual.test.ts`, `__tests__/schedule/task-simulation.test.ts`

**Interfaces:**
- Consumes: Task 3의 `recordAttemptStart`·`recordAttemptEnd`·`attemptOutcomeOf`·`expoAutoWriteAttemptPort`·`AutoWriteAttemptPort`·`AttemptPath`·`AttemptOutcome`.
- Produces: `AutoDiaryTaskDeps.attemptPort?: AutoWriteAttemptPort`. 반환 타입 `AutoDiaryTaskResult`는 그대로.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`__tests__/schedule/background-generation.test.ts`의 `baseDeps`에 메모리 통로를 더한다 — 반환 객체에 `attempts`를, `deps`에 `attemptPort: attempts`를 넣는다:

```ts
  const attempts = {
    content: null as string | null,
    async read() {
      return attempts.content;
    },
    async write(serialized: string) {
      attempts.content = serialized;
    },
  };
```

(`return { pipelineRun, present, dismiss, notifiedWrite, skipWrite, attempts, deps: { attemptPort: attempts, skipPort: …` 순으로.) 파일 끝에 새 describe를 더한다:

```ts
describe("078 AT — 자동 쓰기 시도 기록", () => {
  const lines = (port: { content: string | null }) =>
    (JSON.parse(port.content ?? '{"items":[]}') as { items: { path: string; outcome: string; at: string }[] })
      .items;

  it("쓰면 background · ran 한 줄 — 시작과 끝이 같은 줄이다(at이 now와 같다)", async () => {
    const { deps, attempts } = baseDeps();
    await runAutoDiaryTask(deps);
    expect(lines(attempts)).toEqual([
      { path: "background", outcome: "ran", at: at(7).toISOString() },
    ]);
  });

  it.each([
    ["disabled", { settingsPort: { read: async () => JSON.stringify({ ...ENABLED, enabled: false }), write: async () => {} } }],
    ["not-near-target", { now: at(15), listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"] }],
    ["all-written", { listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"] }],
    ["no-character", { loadCharacter: async () => null }],
  ] as const)("%s", async (outcome, over) => {
    const { deps, attempts } = baseDeps({ ...over });
    await runAutoDiaryTask(deps);
    expect(lines(attempts).map((l) => l.outcome)).toEqual([outcome]);
  });

  it("사진 0장이면 no-material, 사진 권한 없음이면 no-photo-access", async () => {
    const a = baseDeps({ makePipeline: pipelineWith(previewOf({ kind: "known", count: 0 })) });
    await runAutoDiaryTask(a.deps);
    expect(lines(a.attempts).map((l) => l.outcome)).toEqual(["no-material"]);
    const b = baseDeps({ makePipeline: pipelineWith(previewOf({ kind: "unknown" }, "denied")) });
    await runAutoDiaryTask(b.deps);
    expect(lines(b.attempts).map((l) => l.outcome)).toEqual(["no-photo-access"]);
  });

  it("already-running·실패·예외·조립 실패는 각각 already-running·failed·failed·failed", async () => {
    const cases: [string, Record<string, unknown>][] = [
      ["already-running", { makePipeline: pipelineWith(WITH_PHOTOS, jest.fn().mockResolvedValue({ ok: false, stage: "already-running", reason: "x" })) }],
      ["failed", { makePipeline: pipelineWith(WITH_PHOTOS, jest.fn().mockResolvedValue({ ok: false, stage: "storage", reason: "x" })) }],
      ["failed", { makePipeline: pipelineWith(WITH_PHOTOS, jest.fn().mockRejectedValue(new Error("boom"))) }],
      ["failed", { makePipeline: () => ({ ok: false, reason: "no-engine" }) }],
    ];
    for (const [outcome, over] of cases) {
      const { deps, attempts } = baseDeps(over);
      await runAutoDiaryTask(deps);
      expect(lines(attempts).map((l) => l.outcome)).toEqual([outcome]);
    }
  });

  it("기록 통로가 던져도 결과와 파이프라인 호출은 그대로다", async () => {
    const broken = { read: () => Promise.reject(new Error("io")), write: () => Promise.reject(new Error("io")) };
    const { deps, pipelineRun } = baseDeps({ attemptPort: broken });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(pipelineRun).toHaveBeenCalledTimes(1);
  });
});
```

`pipelineWith`는 이 파일에 없으면 `baseDeps` 아래에 더한다(기존 `makePipeline` 리터럴과 같은 모양):

```ts
/** 미리보기·실행을 바꾼 파이프라인 조립 대역 */
function pipelineWith(previewDay: ReturnType<typeof previewOf>, run?: jest.Mock) {
  return (() => ({
    ok: true,
    pipeline: { run: run ?? jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false }) },
    location: "on-device",
    previewDay,
    store: {
      listDays: async () => [],
      load: async () => null,
      has: async () => false,
      save: async () => ({ ok: true, overwrote: false }),
    },
  })) as never;
}
```

`__tests__/schedule/task-manual.test.ts`의 `make`에 같은 메모리 통로(`attempts`)를 넣어 `deps.attemptPort`로 주고 반환에 `attempts`를 더한 뒤, 새 describe:

```ts
describe("078 AT — manual은 경로가 manual이다", () => {
  it("쓰면 manual · ran", async () => {
    const { deps, attempts } = make({ manual: true });
    await runAutoDiaryTask(deps);
    const items = (JSON.parse(attempts.content ?? "") as { items: { path: string; outcome: string }[] }).items;
    expect(items).toEqual([{ path: "manual", outcome: "ran", at: expect.any(String) }]);
  });
});
```

`__tests__/schedule/task-simulation.test.ts`의 `make`에도 메모리 통로를 넣고(기존 `simulationPort` 옆에 `attemptPort`), 흉내가 막는 케이스 하나에 `expect(items.map((l) => l.outcome)).toEqual(["simulation"])`를 더한다(그 파일의 첫 「막는다」 테스트 안).

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest --selectProjects logic __tests__/schedule`
Expected: 078 AT 테스트 전부 FAIL(`attempts.content`가 `null` → `JSON.parse("")` 또는 빈 items).

- [ ] **Step 3: `task.ts`를 고친다**

import에 더한다:

```ts
import {
  attemptOutcomeOf,
  expoAutoWriteAttemptPort,
  recordAttemptEnd,
  recordAttemptStart,
  type AttemptOutcome,
  type AttemptPath,
  type AutoWriteAttemptPort,
} from "../app/auto-write-attempts";
```

`AutoDiaryTaskDeps`에 더한다:

```ts
  /** 078 — 자동 쓰기 시도 기록 통로. 주지 않으면 `preferences/auto-write-attempts.json` */
  attemptPort?: AutoWriteAttemptPort;
```

`runAutoDiaryTask`를 아래로 바꾼다 — 기존 본문은 `runBody`로 옮기고 반환마다 갈래를 붙인다. **`recordWriteFailure` 호출 순서와 `already-running` 매핑은 그대로**(060 소스 계약 `app-diagnostics-source.test.ts`가 본다).

```ts
export async function runAutoDiaryTask(deps: AutoDiaryTaskDeps = {}): Promise<AutoDiaryTaskResult> {
  // B7 — now를 한 번만 만든다. 콜백이 도는 도중 시각이 넘어가 판정과 생성이
  // 다른 하루를 보는 것을 막는다. 078 — 시도 기록의 시작·끝도 이 값으로 짝을 맞춘다.
  const now = deps.now ?? new Date();
  const attemptPort = deps.attemptPort ?? expoAutoWriteAttemptPort();
  const path: AttemptPath = deps.manual === true ? "manual" : "background";

  await recordAttemptStart(attemptPort, path, now);
  const { result, outcome } = await runBody(deps, now);
  await recordAttemptEnd(attemptPort, path, now, outcome);
  return result;
}

type BodyOutcome = { result: AutoDiaryTaskResult; outcome: AttemptOutcome };
const skipped = (outcome: AttemptOutcome): BodyOutcome => ({ result: "skipped", outcome });
const FAILED: BodyOutcome = { result: "failed", outcome: "failed" };

/** 본체. 결과와 기록 갈래를 함께 돌려준다 — 기록은 `runAutoDiaryTask`가 한다. */
async function runBody(deps: AutoDiaryTaskDeps, now: Date): Promise<BodyOutcome> {
  try {
    // … 기존 본문 그대로, 반환만 아래처럼 바꾼다 …
    if (simulationBlocksWriting(simulation)) {
      return skipped("simulation");
    }
    // …
    if (!app.ok) {
      return FAILED;
    }
    // …
    if (decision.kind !== "write") {
      return skipped(attemptOutcomeOf(decision));
    }
    // …
    if (!character) {
      return skipped("no-character");
    }
    // …
    if (result.ok) {
      await sendCompletionNotification(decision.day, character, deps);
      return { result: "ran", outcome: "ran" };
    }

    await recordWriteFailure(deps.failurePort ?? expoWriteFailurePort(), result, now);

    if (result.stage === "already-running") {
      return skipped("already-running");
    }
    return FAILED;
  } catch {
    await recordWriteFailure(
      deps.failurePort ?? expoWriteFailurePort(),
      { ok: false, stage: "unexpected", reason: "" },
      now,
    );
    return FAILED;
  }
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx jest --selectProjects logic __tests__/schedule __tests__/app/app-diagnostics-source.test.ts`
Expected: PASS 전부. `app-diagnostics-source`의 「태스크: already-running을 skipped로 돌리기 전에 기록하고 …」가 실패하면 그 정규식이 보는 문장 순서(`recordWriteFailure(` 다음에 `already-running`)를 `runBody` 안에서 그대로 유지했는지 확인한다 — 테스트가 아니라 소스를 고친다.

- [ ] **Step 5: lint 뒤 커밋**

Run: `npx prettier --write src/schedule/task.ts __tests__/schedule/*.test.ts && npm run lint`
Expected: 0 오류.

```bash
git add src/schedule/task.ts __tests__/schedule/background-generation.test.ts __tests__/schedule/task-manual.test.ts __tests__/schedule/task-simulation.test.ts
git commit -m "feat: 078 백그라운드·수동 자동 쓰기가 시도의 시작·끝을 기록한다

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 문구 영역과 진단 줄 조립

**Files:**
- Create: `src/i18n/catalogs/ko/attempts.ts`
- Modify: `src/i18n/catalogs/ko/index.ts`
- Modify: `src/app/diagnostics-text.ts` (`ATTEMPT_TEXT`)
- Modify: `src/app/diagnostics-view.ts` (`attemptLines`)
- Modify: `__tests__/i18n/ko-golden.test.ts` (`ADDED_AFTER_GOLDEN`)
- Test: `__tests__/app/diagnostics-view.test.ts`

**Interfaces:**
- Consumes: Task 3의 `AutoWriteAttempt`·`AttemptPath`·`AttemptOutcome`.
- Produces: `ATTEMPT_TEXT`(`lazyText((c) => c.attempts)`), `type AttemptLine = { headText: string; outcomeText: string }`, `attemptLines(items: readonly AutoWriteAttempt[]): AttemptLine[]`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`__tests__/app/diagnostics-view.test.ts`에 import `attemptLines`를 더하고 끝에:

```ts
describe("DV9 — 078 자동 쓰기 시도 줄", () => {
  it("경로 · 시각이 머리, 결과가 값", () => {
    const lines = attemptLines([
      { path: "background", outcome: "started", at: new Date(2026, 9, 13, 22, 5) },
      { path: "app-open", outcome: "write", at: new Date(2026, 9, 14, 8, 0) },
      { path: "manual", outcome: "ran", at: new Date(2026, 9, 14, 9, 30) },
    ]);
    expect(lines).toEqual([
      { headText: "백그라운드 · 10월 13일 22:05", outcomeText: "시작한 뒤 끝나지 않음" },
      { headText: "앱 열기 · 10월 14일 08:00", outcomeText: "홈에 넘김" },
      { headText: "지금 실행 · 10월 14일 09:30", outcomeText: "썼음" },
    ]);
    for (const line of lines) expect(Object.keys(line).sort()).toEqual(["headText", "outcomeText"]);
  });

  it("열두 갈래 문구가 모두 있고 서로 다르다", () => {
    const outcomes = [
      "started", "simulation", "disabled", "not-near-target", "all-written", "no-photo-access",
      "no-material", "no-character", "write", "already-running", "ran", "failed",
    ] as const;
    const texts = outcomes.map(
      (outcome) => attemptLines([{ path: "background", outcome, at: new Date(2026, 0, 1) }])[0]?.outcomeText,
    );
    expect(texts).toEqual([
      "시작한 뒤 끝나지 않음",
      "상태 흉내가 막음",
      "자동 쓰기 꺼짐",
      "쓰는 시각이 아님",
      "모두 써 있음",
      "사진 권한 없음",
      "재료 없음",
      "캐릭터 없음",
      "홈에 넘김",
      "다른 쓰기가 진행 중",
      "썼음",
      "실패",
    ]);
    expect(new Set(texts).size).toBe(outcomes.length);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx jest --selectProjects logic __tests__/app/diagnostics-view.test.ts`
Expected: FAIL — `attemptLines is not a function`.

- [ ] **Step 3: 카탈로그 영역·문구 상수·줄 조립을 쓴다**

`src/i18n/catalogs/ko/attempts.ts`:

```ts
/**
 * 한국어 카탈로그 — 진단 「최근 자동 쓰기 시도」 묶음 (078). 보드에 없는 묶음이라 문구는 이 작업이 정했다.
 *
 * 062 규칙: 옛 `diagnostics` 영역에 키를 더하지 않고 새 영역으로 둔다(골든 G2가 옛 영역의 키 짝을 잠근다).
 */

export const attempts = {
  group: "최근 자동 쓰기 시도",
  empty: "아직 시도가 없어요",
  /** 경로 셋 */
  pathBackground: "백그라운드",
  pathAppOpen: "앱 열기",
  pathManual: "지금 실행",
  /** 머리 줄 — 「백그라운드 · 10월 13일 22:05」 */
  line: (path: string, time: string): string => `${path} · ${time}`,
  /** 결과 열둘 — `AttemptOutcome` 순서 */
  started: "시작한 뒤 끝나지 않음",
  simulation: "상태 흉내가 막음",
  disabled: "자동 쓰기 꺼짐",
  notNearTarget: "쓰는 시각이 아님",
  allWritten: "모두 써 있음",
  noPhotoAccess: "사진 권한 없음",
  noMaterial: "재료 없음",
  noCharacter: "캐릭터 없음",
  write: "홈에 넘김",
  alreadyRunning: "다른 쓰기가 진행 중",
  ran: "썼음",
  failed: "실패",
};
```

`src/i18n/catalogs/ko/index.ts`: `import { attempts } from "./attempts";`를 더하고 `ko` 객체의 `diagnosticsLanguage,` 다음 줄에 `attempts,`를 넣는다.

`src/app/diagnostics-text.ts` 끝에:

```ts
/** 078 — 진단 「최근 자동 쓰기 시도」 묶음의 문구. 읽는 순간 카탈로그에서 꺼낸다(C4) */
export const ATTEMPT_TEXT = lazyText((c) => c.attempts);
```

`src/app/diagnostics-view.ts`: import에 `import { ATTEMPT_TEXT as A, DIAGNOSTICS_TEXT as T } from "./diagnostics-text";`(기존 `T` import를 이 줄로 바꾼다)와 `import type { AttemptOutcome, AttemptPath, AutoWriteAttempt } from "./auto-write-attempts";`를 더하고, 「최근 실패」 블록 다음에:

```ts
/* ─────────────────────── 최근 자동 쓰기 시도 (078) ─────────────────────── */

export type AttemptLine = { headText: string; outcomeText: string };

/** 062 C4 — 문구 표는 함수 안에서 만든다. `Record<AttemptPath, …>`라 갈래가 늘면 tsc가 짚는다 */
function attemptPathText(path: AttemptPath): string {
  const byPath: Readonly<Record<AttemptPath, string>> = {
    background: A.pathBackground,
    "app-open": A.pathAppOpen,
    manual: A.pathManual,
  };
  return byPath[path];
}

function attemptOutcomeText(outcome: AttemptOutcome): string {
  const byOutcome: Readonly<Record<AttemptOutcome, string>> = {
    started: A.started,
    simulation: A.simulation,
    disabled: A.disabled,
    "not-near-target": A.notNearTarget,
    "all-written": A.allWritten,
    "no-photo-access": A.noPhotoAccess,
    "no-material": A.noMaterial,
    "no-character": A.noCharacter,
    write: A.write,
    "already-running": A.alreadyRunning,
    ran: A.ran,
    failed: A.failed,
  };
  return byOutcome[outcome];
}

/** 기록 순서 그대로(최신이 위). 머리는 「경로 · M월 d일 HH:mm」(시각 형식은 실패 줄과 같다), 값은 결과 문구다. */
export function attemptLines(items: readonly AutoWriteAttempt[]): AttemptLine[] {
  return items.map((item) => ({
    headText: A.line(
      attemptPathText(item.path),
      T.failureTime(item.at.getMonth() + 1, item.at.getDate(), item.at.toTimeString().slice(0, 5)),
    ),
    outcomeText: attemptOutcomeText(item.outcome),
  }));
}
```

- [ ] **Step 4: 골든을 돌려 새 리터럴을 등록한다**

Run: `npx jest --selectProjects logic __tests__/i18n/ko-golden.test.ts`
Expected: FAIL — 골든에 없는 한글 리터럴 목록이 diff로 나온다(「최근 자동 쓰기 시도」·「아직 시도가 없어요」·「백그라운드」·「앱 열기」·「지금 실행」·「시작한 뒤 끝나지 않음」·「상태 흉내가 막음」·「자동 쓰기 꺼짐」·「쓰는 시각이 아님」·「모두 써 있음」·「사진 권한 없음」·「재료 없음」·「캐릭터 없음」·「홈에 넘김」·「다른 쓰기가 진행 중」. 「썼음」·「실패」는 이미 골든에 있어 나오지 않는다). **diff에 나온 것만** `ADDED_AFTER_GOLDEN` 배열 끝에 더한다 — 골든에 이미 있는 문구를 더하면 반대로 빠져서 실패한다.

Run again: 같은 명령 → PASS.

- [ ] **Step 5: 통과를 확인한다**

Run: `npx jest --selectProjects logic __tests__/app/diagnostics-view.test.ts __tests__/app/diagnostics-text.test.ts __tests__/i18n`
Expected: PASS 전부. `npm run lint`로 `__tests__/i18n/catalog-types.ts`(xx 픽스처가 `...ko`를 펼치므로 새 영역이 자동으로 들어간다)와 tsc를 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src/i18n/catalogs/ko/attempts.ts src/i18n/catalogs/ko/index.ts src/app/diagnostics-text.ts src/app/diagnostics-view.ts __tests__/app/diagnostics-view.test.ts __tests__/i18n/ko-golden.test.ts
git commit -m "feat: 078 시도 기록의 문구 영역과 진단 줄 조립

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 진단 화면 묶음과 조립부 배선 (읽기·앱 열기 기록)

**Files:**
- Modify: `src/ui/DiagnosticsScreen.tsx` (props `attempts`, 새 `Group`)
- Modify: `App.tsx` (`AppFrame`의 `attemptPort`, `DiarySection` props·판정 기록, `DiagnosticsLayer` 읽기·전달)
- Test: `__tests__/ui/diagnostics-screen.test.tsx`, Create: `__tests__/app/auto-write-attempts-wiring.test.ts`

**Interfaces:**
- Consumes: Task 5의 `AttemptLine`·`attemptLines`·`ATTEMPT_TEXT`; Task 3의 `recordAttemptEnd`·`attemptOutcomeOf`·`loadAutoWriteAttempts`·`expoAutoWriteAttemptPort`·`AutoWriteAttemptPort`.
- Produces: `DiagnosticsScreenProps.attempts: readonly AttemptLine[]`; `DiarySection` prop `attemptPort?: AutoWriteAttemptPort`; testID `diagnostics-group-attempts`·`diagnostics-attempts-empty`·`diagnostics-attempt-{index}`.

- [ ] **Step 1: 실패하는 화면 테스트를 쓴다**

`__tests__/ui/diagnostics-screen.test.tsx`: `props()`에 `attempts: [],`를 더하고(`failures: [],` 다음), `GROUP_IDS` 끝에 `"diagnostics-group-attempts"`를, DS1 `it` 이름을 「… → 최근 실패 → 최근 자동 쓰기 시도」로 고친다. 파일 끝(소스 계약 블록 앞)에:

```tsx
describe("078 — 최근 자동 쓰기 시도 묶음", () => {
  it("비어 있으면 「아직 시도가 없어요」 한 줄", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    expect(screen.getByTestId("diagnostics-attempts-empty")).toBeTruthy();
    expect(screen.getByText("아직 시도가 없어요")).toBeTruthy();
  });

  it("줄마다 머리(경로 · 시각)와 결과를 그 순서로 그린다", async () => {
    await render(
      <DiagnosticsScreen
        {...props({
          attempts: [
            { headText: "백그라운드 · 10월 13일 22:05", outcomeText: "시작한 뒤 끝나지 않음" },
            { headText: "앱 열기 · 10월 14일 08:00", outcomeText: "홈에 넘김" },
          ],
        })}
      />,
    );
    expect(screen.queryByTestId("diagnostics-attempts-empty")).toBeNull();
    const first = screen.getByTestId("diagnostics-attempt-0");
    expect(within(first).getByText("백그라운드 · 10월 13일 22:05")).toBeTruthy();
    expect(within(first).getByText("시작한 뒤 끝나지 않음")).toBeTruthy();
    expect(within(screen.getByTestId("diagnostics-attempt-1")).getByText("홈에 넘김")).toBeTruthy();
  });
});
```

소스 계약 블록에 화면이 기록 모듈에 닿지 않는 단언을 더한다(그 블록이 `SRC`를 읽는 방식 그대로):

```ts
  it("078 — 화면은 기록 모듈을 import하지 않는다 (줄만 받는다)", () => {
    expect(SRC).not.toMatch(/auto-write-attempts/);
  });
```

- [ ] **Step 2: 실패하는 배선 테스트를 쓴다**

`__tests__/app/auto-write-attempts-wiring.test.ts`:

```ts
/**
 * 078 — 시도 기록의 조립부 배선 (소스 계약). App.tsx를 렌더하지 않는다(074 `AppFrame.firstrun.test.tsx`와 같은 방식).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/** `function Name(` 부터 다음 최상위 `function `·파일 끝까지 */
function functionBody(name: string): string {
  const start = APP.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = APP.slice(start + 1);
  const next = rest.search(/\nfunction [A-Za-z]/);
  return next < 0 ? rest : rest.slice(0, next);
}

describe("앱 열기 경로", () => {
  it("DiarySection이 판정 결과를 app-open 한 줄로 기록한다 — 판정의 now와 같은 시각, 갈래는 attemptOutcomeOf", () => {
    const section = functionBody("DiarySection");
    expect(section).toMatch(/const now = new Date\(\);/);
    expect(section).toMatch(/resolveAutoWrite\(\{\s*settings: autoDiarySettings,\s*now,/);
    expect(section).toMatch(
      /recordAttemptEnd\(attemptPort, "app-open", now, attemptOutcomeOf\(decision\)\)/,
    );
  });

  it("AppFrame이 통로 하나를 만들어 DiarySection에 넘긴다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/const attemptPort = useMemo\(\(\) => expoAutoWriteAttemptPort\(\), \[\]\);/);
    expect(frame).toMatch(/attemptPort=\{attemptPort\}/);
  });
});

describe("진단 화면", () => {
  it("DiagnosticsLayer가 실패 기록과 같은 시점에 읽어 attempts로 넘긴다", () => {
    const layer = functionBody("DiagnosticsLayer");
    expect(layer).toMatch(/loadAutoWriteAttempts\(attemptPort\)/);
    expect(layer).toMatch(/setAttempts\(attemptLines\(/);
    expect(layer).toMatch(/attempts=\{attempts\}/);
  });
});
```

- [ ] **Step 3: 실패를 확인한다**

Run: `npx jest --selectProjects ui __tests__/ui/diagnostics-screen.test.tsx && npx jest --selectProjects logic __tests__/app/auto-write-attempts-wiring.test.ts`
Expected: 둘 다 FAIL(화면에 묶음이 없고, App.tsx에 배선이 없다).

- [ ] **Step 4: 화면을 고친다**

`src/ui/DiagnosticsScreen.tsx`: import를 `import { ATTEMPT_TEXT as A, DIAGNOSTICS_TEXT as T } from "../app/diagnostics-text";`로, 타입 import에 `AttemptLine`을 더한다. props 타입의 `failures` 다음에:

```ts
  /** 078 — 최근 자동 쓰기 시도, 최신이 위 */
  attempts: readonly AttemptLine[];
```

구조 분해에 `attempts,`를 더하고, 「최근 실패」 `Group` 바로 다음(루트 `View` 닫기 전)에:

```tsx
      {/* 078 — 자동 쓰기가 판정에 들어간 기록. 줄이 없으면 OS가 깨우지 않은 것이고, 「시작한 뒤 끝나지 않음」은 도중에 정지된 것이다 */}
      <Group label={A.group} testID="diagnostics-group-attempts">
        {attempts.length === 0 ? (
          <Row label={A.empty} labelTone="muted" testID="diagnostics-attempts-empty" />
        ) : (
          attempts.map((line, index) => (
            // 위치가 키다 — 같은 경로·같은 결과가 이어질 수 있다(035)
            <Row
              key={index}
              label={line.headText}
              testID={`diagnostics-attempt-${index}`}
              trailing={<Value text={line.outcomeText} />}
            />
          ))
        )}
      </Group>
```

- [ ] **Step 5: 조립부를 고친다**

`App.tsx` import에 더한다:

```ts
import {
  attemptOutcomeOf,
  expoAutoWriteAttemptPort,
  loadAutoWriteAttempts,
  recordAttemptEnd,
  type AutoWriteAttemptPort,
} from "./src/app/auto-write-attempts";
```

`attemptLines`·`AttemptLine`을 기존 `./src/app/diagnostics-view` import에 더한다.

**`AppFrame`**: `const failurePort = useMemo(() => expoWriteFailurePort(), []);` 근처(`AppFrame` 안, `skipPort`를 만드는 자리 옆)에 `const attemptPort = useMemo(() => expoAutoWriteAttemptPort(), []);`를 두고, `<DiarySection … skipPort={skipPort}` 다음 줄에 `attemptPort={attemptPort}`를 넘긴다.

**`DiarySection`**: 구조 분해와 props 타입에 더한다:

```ts
  /** 078 — 자동 쓰기 시도 기록 통로. 앱 열기 판정 결과를 한 줄로 남긴다 */
  attemptPort?: AutoWriteAttemptPort;
```

057 `check`를 아래로 바꾼다(판정의 `now`와 기록의 시각이 같다):

```ts
    const check = () => {
      const now = new Date();
      void resolveAutoWrite({
        settings: autoDiarySettings,
        now,
        listDiaryDays: () => store.listDays(),
        previewDay: previewForAuto,
        skipPort,
      })
        .then((decision) => {
          // 078 — 판정에 들어갔다는 사실을 남긴다. 화면이 닫힌 뒤여도 판정은 일어났으므로 `alive`와 무관하게 쓴다.
          if (attemptPort) void recordAttemptEnd(attemptPort, "app-open", now, attemptOutcomeOf(decision));
          if (!alive) return;
          if (decision.kind === "write") setAutoWriteDay(decision.day);
          else if (decision.kind === "skip" && decision.because === "no-photo-access") {
            onSkipped?.(decision.day);
          }
        })
        .catch(() => {});
    };
```

effect의 deps 배열에 `attemptPort`를 더한다.

**`DiagnosticsLayer`**: `const failurePort = …` 다음에 `const attemptPort = useMemo(() => expoAutoWriteAttemptPort(), []);`, 실패 state 옆에 `const [attempts, setAttempts] = useState<AttemptLine[]>([]);`, `readFailures`를 아래로:

```ts
  const readFailures = useCallback(async () => {
    const [items, tries] = await Promise.all([
      loadWriteFailures(failurePort),
      loadAutoWriteAttempts(attemptPort),
    ]);
    if (alive.current) {
      setFailures(failureLines(items));
      setAttempts(attemptLines(tries));
    }
  }, [failurePort, attemptPort]);
```

`<DiagnosticsScreen … failures={failures}` 다음에 `attempts={attempts}`.

- [ ] **Step 6: 통과를 확인한다**

Run: `npx jest --selectProjects ui __tests__/ui/diagnostics-screen.test.tsx && npx jest --selectProjects logic __tests__/app`
Expected: PASS 전부(`app-diagnostics-source.test.ts`의 「값은 열 때와 「다시 읽기」에서만 읽는다」·DS11도 그대로 통과해야 한다).

- [ ] **Step 7: lint·전체 테스트 뒤 커밋**

Run: `npx prettier --write App.tsx src/ui/DiagnosticsScreen.tsx __tests__/ui/diagnostics-screen.test.tsx __tests__/app/auto-write-attempts-wiring.test.ts && npm run lint && npm test`
Expected: 0 오류, 전부 PASS.

```bash
git add App.tsx src/ui/DiagnosticsScreen.tsx __tests__/ui/diagnostics-screen.test.tsx __tests__/app/auto-write-attempts-wiring.test.ts
git commit -m "feat: 078 진단 「최근 자동 쓰기 시도」 묶음과 앱 열기 판정 기록

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: 위반 주입·문서·실기기 확인 항목

**Files:**
- Modify: `AGENTS.md`, `docs/roadmap/README.md`
- (일시) `src/schedule/decision.ts`, `src/schedule/task.ts` — 주입 뒤 되돌린다

- [ ] **Step 1: 위반 주입 — 판정에서 오늘 필터를 뺀다**

`decision.ts`의 `const candidates = near ? selectableDays : selectableDays.filter((day) => day !== today);`를 `const candidates = selectableDays;`로 바꾼다. 치환이 실제로 먹었는지 `grep -n "const candidates" src/schedule/decision.ts`로 본다.

Run: `npx jest --selectProjects logic __tests__/schedule/decision.test.ts`
Expected: FAIL — 「창의 끝(17시)이면 오늘은 안 쓴다」·「22시(창 시작 직전)면 오늘은 안 쓴다」 등. 되돌린다: `git checkout src/schedule/decision.ts`. 되돌아왔는지 `grep`으로 다시 본다.

- [ ] **Step 2: 위반 주입 — 끝 기록을 뺀다**

`task.ts`의 `await recordAttemptEnd(attemptPort, path, now, outcome);` 줄을 지운다. `grep -c recordAttemptEnd src/schedule/task.ts`가 import 한 번만 세는지 본다.

Run: `npx jest --selectProjects logic __tests__/schedule/background-generation.test.ts`
Expected: FAIL — 078 AT 테스트가 `started`를 보고 실패한다. 되돌린다: `git checkout src/schedule/task.ts`.

- [ ] **Step 3: AGENTS.md를 고친다**

- 28행 「진단 화면(보드 `6h`의 일곱 묶음·한 번 써 보기·최근 쓰기 실패)」 → 「진단 화면(보드 `6h`의 일곱 묶음 + 078의 자동 쓰기 시도 묶음·한 번 써 보기·최근 쓰기 실패)」.
- 020 항목(「**자동 생성 설정은 설정 탭에 있다**」 불릿) 끝에 한 문장을 더한다: 「**시도 창은 오늘에만 걸린다**(078) — 지난 날 중 안 쓴 날은 창 밖에서 깨도 쓴다.」
- 057 항목의 「020 `decideSchedule`(켜짐·시도 창 3시간·사흘 중 안 쓴 날)은 그대로 두고」 → 「020 `decideSchedule`(켜짐·오늘은 시도 창 3시간 안·지난 날은 언제든·사흘 중 안 쓴 날 — 078)을 두고」.
- 077 항목 다음에 새 항목을 더한다:

```markdown
### 078 — 자동 쓰기: 놓친 날 다시 쓰기와 시도 기록 (iOS 자동 쓰기 미동작 조사)

- **iPhone에서 자동 쓰기가 안 되는 원인은 배선이 아니라 판정이었다**(2026-10-13, 코드·`expo-background-task`·`expo-task-manager` iOS 소스 읽기 — 실제 iPhone 없음). `Info.plist`(`BGTaskSchedulerPermittedIdentifiers`·`UIBackgroundModes: processing`)·모듈 최상단 `defineTask`·네이티브 큐잉은 bare 앱에서 성립한다. 그러나
  iOS는 `BGProcessingTaskRequest` 하나를 `earliestBeginDate = +15분`·`requiresNetworkConnectivity = true`로 제출하고 실행 시점은 OS가 유휴·충전 조건에서 고른다(하루 한 번 안팎) — 020의 「목표 시각 +3시간 창」 안에 깨운다는 보장이 없어 `skipped`만 쌓였다.
  스와이프 종료·백그라운드 앱 새로 고침 꺼짐·저전력 모드면 아예 깨우지 않고, 깨워도 시간 예산 만료·메모리로 정지되면 일기·알림·실패 기록이 모두 없다(expo의 만료 이벤트는 `userInfo["url"]` 가드 때문에 JS에 오지 않는다). **시뮬레이터는 `supportsBackgroundTasks()`가 거짓이라 어느 것도 재현하지 못한다.**
- **판정**: `decideSchedule`이 `today`를 주입받아 오늘은 창 안에서만, 지난 날(`selectableDays` 중 오늘이 아닌 날)은 언제든 쓴다(020 D2 개정). 플랫폼 분기 없음 — 안드로이드도 어제 시도가 전부 실패했으면 오전 콜백이 어제를 쓴다. 정오 규칙·재료 판정·`manual`은 그대로다.
- **시도 기록**: `src/app/auto-write-attempts.ts`, `preferences/auto-write-attempts.json`(경로 `background`·`app-open`·`manual` × 결과 열둘, 최근 20건, 060 실패 기록과 같은 꼴). 백그라운드·수동은 `runAutoDiaryTask`가 시작(`started`)·끝을 같은 `now`로 짝 맞춰 쓰고, 앱 열기는 `DiarySection`이 판정 한 줄만 쓴다(바로 앞 줄과 경로·결과가 같으면 시각만 갱신). 진단 「최근 자동 쓰기 시도」 묶음이 보인다.
  **iOS 테스터의 진단 스크린샷 읽는 법**: 줄이 없다 → OS가 깨우지 않았다(스와이프 종료·앱 새로 고침·저전력을 묻는다). `백그라운드 · 시작한 뒤 끝나지 않음`이 남았다 → 완주하다 정지됐다(시간 예산·메모리, 미측정). 백그라운드 재실행에서는 `App.tsx`도 그려져 `앱 열기` 줄이 같이 남는다 — 정상.
- **미확인**: iOS 전부(백그라운드 완주 시간·메모리, 실제 깨우는 시각). 안드로이드 dev 실기기 확인은 아래 「실측」.
```

- [ ] **Step 4: 로드맵에 남은 과제를 적는다**

`docs/roadmap/README.md`의 「## 진행 예정 과제」 아래, 「### 헤드리스 자동 쓰기가 생성 시간 한도를 크게 넘는다」 앞에:

```markdown
### iOS 백그라운드 자동 쓰기 완주 실측 — 실제 iPhone이 전제

**배경**: 078이 iPhone 자동 쓰기 미동작의 판정 원인(시도 창)을 고치고 시도 기록을 넣었지만, `BGProcessingTask`의 시간 예산 안에 2GB 모델 적재·캡션·생성이 끝나는지, 백그라운드 메모리 한도(jetsam)에 걸리는지는 실제 iPhone 없이는 어느 설계도 통과를 말할 수 없다(원칙 V). 시뮬레이터는 BGTask를 스케줄하지 않는다.

**할 일**: TestFlight 빌드를 받은 테스터의 진단 「최근 자동 쓰기 시도」 스크린샷을 모은다(줄 없음 / `시작한 뒤 끝나지 않음` / `썼음`). `시작한 뒤 끝나지 않음`이 반복되면 debug 빌드를 Xcode로 붙여 `_simulateLaunchForTaskWithIdentifier:`로 강제 실행하고 만료까지의 시간·메모리를 잰다. 그 결과에 따라 백그라운드에서는 사진 읽기를 건너뛰거나 본문 길이를 줄이는 안을 다시 판단한다.
```

- [ ] **Step 5: lint·전체 테스트 뒤 커밋**

Run: `npm run lint && npm test`
Expected: 0 오류, 전부 PASS.

```bash
git add AGENTS.md docs/roadmap/README.md
git commit -m "docs: 078 iOS 자동 쓰기 미동작 원인·새 판정·시도 기록 읽는 법을 적고 iOS 완주 실측 과제를 남긴다

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 6: 안드로이드 dev 실기기 확인 (사람이 한다 — 기기가 붙어 있을 때)**

AGENTS 「도구 사용법」대로 Metro(`.env.development.local`의 `EXPO_PUBLIC_APP_ENV=dev`)와 dev APK를 띄운 뒤:

1. 설정 → 개발자 → 진단 → 「자동 쓰기 지금 실행」. 「최근 자동 쓰기 시도」에 `지금 실행 · {시각}` 한 줄과 결과(재료 있으면 `썼음`, 없으면 `재료 없음`/`모두 써 있음`)가 보인다. 파일: `adb shell run-as com.a810labs.pocketlog cat files/preferences/auto-write-attempts.json`.
2. 자동 쓰기를 켜고 목표 시각을 지금보다 4시간 전으로 둔 채 어제 일기 파일을 빼고(`files/diary/<어제>.json`을 `/data/local/tmp`로 옮긴다) 앱을 홈 버튼으로 내렸다 다시 연다 → 홈이 어제를 「쓰는 중」으로 시작한다(조각 1 + `앱 열기 · 홈에 넘김`).
3. 같은 상태로 홈 버튼으로 내리고 화면을 끈 뒤 15~30분 기다린다 → `백그라운드 · 썼음`(또는 어제가 이미 써졌으면 `모두 써 있음`) 줄이 생긴다. `am force-stop`을 쓰지 않는다(WorkManager 잡이 사라진다).
4. 결과를 AGENTS 078 항목 끝에 「실측」 한 줄로 적고 커밋한다. 확인하지 못한 항목은 「미확인」에 그대로 둔다.

/**
 * 자동 쓰기 판정 — 「이 날을 자동으로 써도 되는가」 (057, 보드 `6c` ③·`6g`).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md AW1~AW7
 *       spec.md FR-001~FR-009·FR-014·FR-021, research.md R1·R2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **두 경로가 이 판정 하나를 쓴다** — 백그라운드 자동 쓰기(`task.ts`)와 앱을 열 때의 자동 쓰기(`App.tsx`). 둘이
 * 따로 판정하면 「백그라운드는 안 쓴 날을 앱 열기는 쓴다」가 생긴다.
 *
 * **「언제·어느 날」은 020 판정(`decideSchedule`)이 정한다**(켜짐·시도 창·사흘 중 안 쓴 날 — 078부터 차례가 지난 날은 창 밖에서도). 이
 * 판정은 그 날의 신호를 보고 「쓸 재료가 있는가」만 더한다. 날이 정해져야 그 날의 신호를 읽을 수 있으므로 두 축이다.
 *
 * **판정 순서가 계약이다**(FR-003):
 *  1. 020이 돌 일 없음 → `idle`. 신호를 읽지 않는다. (078부터 놓친 날은 창 밖에서도 후보라 재료 없는 날·사진 권한 없는 날에
 *     콜백마다 신호를 읽게 된다 — 백그라운드는 `task.ts`의 「창 밖 따라잡기 하루 한 번」이 그것을 막는다.)
 *  2. 사진 권한이 없음(`denied`·`blocked` — 053이 「아직 묻지 않음」도 `denied`로 옮긴다) → 「사진 권한 없음」 건너뜀.
 *     이것만 기록된다(설정의 사진 행에 보인다, 보드 `6g`).
 *  3. 053 재료 판정이 「바로 쓴다」(사진이나 장소가 하나라도 있음) → 쓴다. 위치 권한만 없고 사진이 있으면 쓴다.
 *  4. 그 외(관측된 0 또는 셀 수 없음뿐) → 그 날은 건너뛰고 **다음 후보(더 오래된 날)를 본다**(105 — 훑기). 후보를 다 보고도 쓸 날이
 *     없으면 「재료 없음」 건너뜀(날은 첫 후보). 지어 쓰기는 사용자가 홈에서 확인할 때만이다(053 `2f`).
 *
 * **훑기(105)**: 후보는 020 판정(`decideSchedule`)의 `days`(최근→과거)다 — 창 규칙(078)이 이미 거른 목록이라 훑기는 후보를 넓히지 않는다.
 * 사진 권한 없음은 전역 사실이라 그 날을 기억하고 멈춘다. 미리보기를 못 읽은 날은 재료 있음으로 단정하지 않고 건너뛰며, 한 곳도 못
 * 읽었으면 첫 예외를 던진다. 재료 없음·못 읽음은 기억하지 않는다. 백그라운드 「창 밖 하루 한 번」 몫은 파이프라인 직전에만 쓰므로(090)
 * 훑기가 몫을 닳게 하지 않는다.
 *
 * **053 판정을 다시 쓰지 않는다** — `decideMaterial`·`fromCountHint`를 그대로 부른다. 그래서 「확인이 뜬 하루」와
 * 「자동으로 안 쓴 하루」가 같은 규칙이다. 사진이 관측된 0이면 장소도 0으로 올리는 승격은 미리보기(`toDayPreview`)가 이미 한다.
 *
 * **계층**: `src/schedule/` → `src/app/material.ts`(순수)·`src/app/state.ts`(타입). `task.ts`가 이미 `app/wiring`을 부르는 방향과
 * 같다(research R1). 앱 전경 상태(`AppState`)를 보지 않는다 — 「앱이 앞으로 왔다」는 다시 판정할 때일 뿐 입력이 아니다(AGENTS).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, selectableDays, type DayDate } from "../config/day-boundary";
import { decideMaterial, fromCountHint } from "../app/material";
import type { DayPreview } from "../app/state";
import { decideSchedule, type ScheduleDecision } from "./decision";
import type { AutoDiarySettings } from "./settings";
import { saveSkippedDay, type SkipStorePort } from "./skip-store";
import { productionTiming, type ScheduleTiming } from "./timing";

export type AutoWriteDecision =
  | { kind: "idle"; reason: Extract<ScheduleDecision, { act: false }>["reason"] }
  | { kind: "write"; day: DayDate }
  | { kind: "skip"; day: DayDate; because: "no-photo-access" | "no-material" };

/** 020 판정 결과와 그 날의 미리보기로 정한다 (순수). */
export function decideAutoWrite(input: {
  schedule: ScheduleDecision;
  preview: DayPreview;
}): AutoWriteDecision {
  const { schedule, preview } = input;
  if (!schedule.act) return { kind: "idle", reason: schedule.reason };

  const day = schedule.day;
  if (preview.photoAccess === "denied" || preview.photoAccess === "blocked") {
    return { kind: "skip", day, because: "no-photo-access" };
  }

  const material = decideMaterial(fromCountHint(preview.photos), fromCountHint(preview.places));
  if (material.kind === "write") return { kind: "write", day };
  return { kind: "skip", day, because: "no-material" };
}

/**
 * 두 경로가 함께 부르는 조합 — 020 판정 → (돌 일이 있을 때만) 그 날의 미리보기 → 판정 → 사진 권한 건너뜀 기록.
 *
 * 기기 통로는 전부 주입받는다. 기록이 실패해도 결정은 바뀌지 않는다(쓰지 않는다는 사실이 먼저다).
 */
export async function resolveAutoWrite(deps: {
  settings: AutoDiarySettings;
  now: Date;
  listDiaryDays: () => Promise<readonly DayDate[]>;
  previewDay: (day: DayDate) => Promise<DayPreview>;
  skipPort: SkipStorePort;
  /** 106 — 시간 규칙. 주지 않으면 배포 규칙(`productionTiming`)이다. 빠른 주기는 호출부가 `timing-source`로 읽어 넘긴다 */
  timing?: ScheduleTiming;
}): Promise<AutoWriteDecision> {
  const timing = deps.timing ?? productionTiming(deps.settings);
  const schedule = decideSchedule({
    settings: deps.settings,
    now: deps.now,
    today: dayOf(deps.now),
    targetDay: timing.targetDay,
    selectableDays: selectableDays(deps.now),
    existingDiaryDays: await deps.listDiaryDays(),
    timing,
  });
  if (!schedule.act) return { kind: "idle", reason: schedule.reason };

  // ★ 105 — 후보를 최근→과거로 훑어 재료 있는 첫 날을 쓴다. 가장 최근 하루만 보면 그 날이 재료 없음일 때 더 오래된 재료 있는 날이
  // 영영 따라잡히지 않았다. 재료 없음·읽지 못함은 어디에도 기억하지 않는다(다음 판정에서 다시 후보다 — 오늘 사진은 밤에 늘 수 있다).
  let firstError: { error: unknown } | null = null;
  let read = 0;
  for (const day of schedule.days) {
    let preview: DayPreview;
    try {
      preview = await deps.previewDay(day);
    } catch (error) {
      // 못 읽은 날은 「재료 없음」도 「있음」도 아니다 — 건너뛰고 더 오래된 날을 본다(원칙 V).
      firstError ??= { error };
      continue;
    }
    read += 1;
    const decision = decideAutoWrite({ schedule: { act: true, day, days: [day] }, preview });
    if (decision.kind === "write") return decision;
    if (decision.kind === "skip" && decision.because === "no-photo-access") {
      // 사진 권한은 전역이다 — 이 날을 기억하고 훑기를 멈춘다(종전과 같다).
      await saveSkippedDay(deps.skipPort, decision.day).catch(() => {});
      return decision;
    }
  }
  // 한 곳도 못 읽었으면 재료 없음이라 단정하지 않고 첫 예외를 그대로 둔다(종전: 호출 쪽이 삼켜 아무것도 반영하지 않는다).
  if (read === 0 && firstError !== null) throw firstError.error;
  return { kind: "skip", day: schedule.day, because: "no-material" };
}

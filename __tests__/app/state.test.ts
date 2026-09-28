import { readFileSync } from "node:fs";
import { join } from "node:path";
/**
 * 화면 상태 전이 계약 테스트.
 *
 * 계약: specs/006-first-diary-app/data-model.md §2·§3, contracts/screens.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **전이가 순수 함수이므로 전 갈래가 기기 없이 검증된다**(SC-023).
 *
 * 002가 `readinessOf`를, 005가 `acceptance`를 순수 함수로 둔 것과 같은 판단이다.
 * 실기기는 「실제로 돈다」를 확인할 뿐 갈래를 검증하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { latestClosedDay } from "../../src/config/day-boundary";
import {
  afterGeneration,
  cancelOverwrite,
  confirmOverwrite,
  initialScreen,
  startWriting,
  toDetail,
  toList,
  toWriting,
  dayParts,
  canSwipeNext,
  cellFor,
  swipeWeek,
  weekCellsFor,
  writePromptFor,
  type DiaryListItem,
  type PhotoHint,
  type WritePrompt,
} from "../../src/app/state";
import { resolveSelection } from "../../src/app/selection";
import type { PipelineResult } from "../../src/diary/pipeline";
import type { DiaryEntry } from "../../src/diary/types";
import { partiallyUnknownDay } from "../../src/signals/fake";
import { FUTURE_CHARACTER } from "../future-character";

const DAY = "2026-08-16";

const entryFor = (day = DAY, text = "오늘 주인은 조용했다"): DiaryEntry => ({
  date: day,
  text,
  character: "quiet",
  signalsUsed: partiallyUnknownDay(day),
  createdAt: new Date("2026-08-17T06:00:00"),
});

const readable = (day: string, photos: PhotoHint = { kind: "none" }): DiaryListItem => ({
  day,
  readable: true,
  photos,
});
// **읽지 못하면 사진도 「모른다」다**(원칙 V) — 「없었다」가 아니다.
const unreadable = (day: string): DiaryListItem => ({
  day,
  readable: false,
  photos: { kind: "unknown" },
});

describe("첫 화면 (FR-018, S7)", () => {
  it("환경 판정이 실패하면 build-error다", () => {
    const screen = initialScreen({ ok: false, reason: "missing", received: undefined }, []);

    expect(screen.kind).toBe("build-error");
  });

  it("환경 판정이 실패하면 일기가 있어도 build-error다", () => {
    // 추론 위치를 고를 수 없으므로 일기 기능이 막힌다(FR-035a).
    const screen = initialScreen({ ok: false, reason: "unknown", received: "prd" }, [
      readable(DAY),
    ]);

    expect(screen.kind).toBe("build-error");
  });

  it("일기가 없으면 빈 목록이다 — 빈 화면이 아니다", () => {
    const screen = initialScreen({ ok: true, environment: "prod" }, []);

    // **목록 자체는 존재한다.** 「무엇을 하면 생기는가」를 화면이 말할 자리가 있어야 한다.
    expect(screen.kind).toBe("list");
    if (screen.kind === "list") expect(screen.items).toEqual([]);
  });

  it("일기가 있으면 목록이다", () => {
    const screen = initialScreen({ ok: true, environment: "prod" }, [readable(DAY)]);

    expect(screen.kind).toBe("list");
    if (screen.kind === "list") expect(screen.items).toHaveLength(1);
  });
});

describe("020 — 알림을 눌러 열렸으면 상세로 바로 (FR-006, SC-004)", () => {
  it("initialDay가 목록에 있고 읽혔으면 첫 화면이 detail이다 — 목록을 안 거친다", () => {
    const entry = entryFor(DAY);
    const screen = initialScreen({ ok: true, environment: "prod" }, [readable(DAY)], {
      initialDay: DAY,
      entry,
    });

    expect(screen.kind).toBe("detail");
    if (screen.kind === "detail") {
      expect(screen.day).toBe(DAY);
      expect(screen.entry).toBe(entry);
    }
  });

  it("initialDay가 목록에 없으면 조용히 목록으로 (원칙 V)", () => {
    const screen = initialScreen({ ok: true, environment: "prod" }, [readable(DAY)], {
      initialDay: "2020-01-01",
      entry: entryFor("2020-01-01"),
    });

    expect(screen.kind).toBe("list");
  });

  it("initialDay는 있으나 entry가 null이면(못 읽음) 목록으로", () => {
    const screen = initialScreen({ ok: true, environment: "prod" }, [readable(DAY)], {
      initialDay: DAY,
      entry: null,
    });

    expect(screen.kind).toBe("list");
  });

  it("initialDay가 unreadable 항목이면 목록으로 (빈 일기를 지어내지 않는다)", () => {
    const screen = initialScreen({ ok: true, environment: "prod" }, [unreadable(DAY)], {
      initialDay: DAY,
      entry: entryFor(DAY),
    });

    expect(screen.kind).toBe("list");
  });

  it("initialDay가 null이면 기존대로 목록이다 (회귀 없음)", () => {
    const screen = initialScreen({ ok: true, environment: "prod" }, [readable(DAY)], {
      initialDay: null,
    });

    expect(screen.kind).toBe("list");
  });

  it("환경 실패면 initialDay가 있어도 build-error다", () => {
    const screen = initialScreen(
      { ok: false, reason: "missing", received: undefined },
      [readable(DAY)],
      { initialDay: DAY, entry: entryFor(DAY) },
    );

    expect(screen.kind).toBe("build-error");
  });
});

describe("목록 → 상세 (FR-019, S3)", () => {
  it("읽을 수 있는 항목을 누르면 전문이 열린다", () => {
    const screen = toDetail(readable(DAY), entryFor());

    expect(screen.kind).toBe("detail");
    if (screen.kind === "detail") {
      expect(screen.day).toBe(DAY);
      expect(screen.entry.text).toBe("오늘 주인은 조용했다");
    }
  });

  /**
   * ★ S3 — **「읽을 수 없다」와 「일기가 없다」는 다른 상태다**(원칙 V).
   *
   * 조용히 빼면 사용자는 일기를 쓴 기억과 화면이 어긋나는 것을 설명할 방법이 없다.
   */
  it("읽을 수 없는 항목은 unreadable로 간다 — detail이 아니다", () => {
    const screen = toDetail(unreadable(DAY), null);

    expect(screen.kind).toBe("unreadable");
    if (screen.kind === "unreadable") expect(screen.day).toBe(DAY);
  });

  it("읽을 수 있다고 했는데 실제로 읽히지 않으면 unreadable이다", () => {
    // 목록을 만든 뒤 파일이 깨졌을 수 있다. 빈 일기를 지어내지 않는다.
    const screen = toDetail(readable(DAY), null);

    expect(screen.kind).toBe("unreadable");
  });

  it("상세에서 목록으로 돌아간다", () => {
    const screen = toList([readable(DAY)]);

    expect(screen.kind).toBe("list");
    if (screen.kind === "list") expect(screen.items).toHaveLength(1);
  });
});

describe("쓰는 중 (FR-021, S6)", () => {
  it("쓰기를 시작하면 writing이다", () => {
    expect(toWriting().kind).toBe("writing");
  });

  /**
   * ★ 원칙 IV — **진행률·남은 시간·토큰 수를 담을 자리가 없다.**
   *
   * `busy`가 불리언 하나인 것과 같은 방어다. **타입에 자리가 없으면 담을 수 없다.**
   */
  it("★ writing에 진행률·시간·토큰을 담을 자리가 없다", () => {
    const screen = toWriting();

    expect(Object.keys(screen)).toEqual(["kind"]);
  });
});

describe("생성 결과 → 화면 (data-model.md §5)", () => {
  it("성공하면 written이고 저장됐다", () => {
    const result: PipelineResult = { ok: true, entry: entryFor(), overwrote: false };
    const screen = afterGeneration(result);

    expect(screen.kind).toBe("written");
    if (screen.kind === "written") {
      expect(screen.entry.text).toBe("오늘 주인은 조용했다");
      expect(screen.saved).toBe(true);
    }
  });

  /**
   * ★ 006 FR-012a·b — **저장 실패는 `failed`가 아니라 `written{saved:false}`다.**
   *
   * 30초를 들여 만든 글이고 다시 생성해도 같은 글이 나오지 않는다. 원칙 I을 어기지
   * 않는다 — 금지된 것은 미리 만든 글을 생성 대신 내놓는 것이지 방금 생성한 글을
   * 보여주는 것이 아니다.
   */
  it("★ 저장에 실패해도 글이 있으면 written이다 (saved: false)", () => {
    const result: PipelineResult = {
      ok: false,
      stage: "storage",
      reason: "저장 공간이 없다",
      entry: entryFor(),
    };
    const screen = afterGeneration(result);

    expect(screen.kind).toBe("written");
    if (screen.kind === "written") {
      expect(screen.entry.text).toBe("오늘 주인은 조용했다");
      // 성공한 것처럼 보이면 사용자는 일기가 남은 줄 안다(SC-008c).
      expect(screen.saved).toBe(false);
    }
  });

  /**
   * ★ 006 FR-034 — **덮어썼다는 사실이 화면까지 간다** (002 FR-023a).
   */
  it("★ 덮어쓴 일기는 그 사실이 화면 상태에 남는다", () => {
    const screen = afterGeneration({ ok: true, entry: entryFor(), overwrote: true });

    expect(screen.kind).toBe("written");
    if (screen.kind === "written") expect(screen.overwrote).toBe(true);
  });

  it("처음 쓴 일기는 덮어쓴 것이 아니다", () => {
    const screen = afterGeneration({ ok: true, entry: entryFor(), overwrote: false });

    if (screen.kind === "written") expect(screen.overwrote).toBe(false);
  });

  it("저장에 실패했으면 덮어쓴 것도 아니다", () => {
    // 쓰기가 실패했으므로 기존 일기가 그대로 남아 있다(002 FR-023b).
    const screen = afterGeneration({
      ok: false,
      stage: "storage",
      reason: "저장 공간이 없다",
      entry: entryFor(),
    });

    if (screen.kind === "written") expect(screen.overwrote).toBe(false);
  });

  it.each([
    ["day-not-closed", /이르다/],
    ["signals", /가져오지 못했다/],
    ["request-build", /캐릭터/],
    ["model-not-ready", /준비/],
    ["generation", /다시 시도/],
  ] as const)("%s 실패는 failed이고 할 수 있는 것을 말한다", (stage, expected) => {
    const result: PipelineResult = { ok: false, stage, reason: "무언가" };
    const screen = afterGeneration(result);

    expect(screen.kind).toBe("failed");
    if (screen.kind === "failed") expect(screen.message).toMatch(expected);
  });

  /**
   * ★ 006 FR-028 — **생성 실패 안에서도 「할 수 있는 것」이 갈린다.**
   *
   * ─────────────────────────────────────────────────────────────────────────
   * 파이프라인은 `generation` 단계의 `reason`에 `kind: detail` 꼴로 무엇이 일어났는지
   * 담아 온다. 그것을 통째로 버리고 한 문장으로 뭉개면 **「캐릭터를 받아야 하는가」와
   * 「다시 눌러 보면 되는가」를 구분할 수 없다** — 003이 `ModelReadiness`를 넷으로 가른
   * 이유가 「사용자에게 무엇을 하라고 말할 수 있어야 한다」였고 같은 판단이다.
   *
   * **모델의 실패 양상은 여전히 새지 않는다**(원칙 III). 005의 `describeFailure()`가
   * 이미 그 방어를 하고 있으므로 **그것을 재사용한다** — 새로 쓰면 방어가 둘로 갈라진다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  it("★ 모델이 없으면 「준비해야 한다」로, 거부되면 「다시 시도」로 갈린다", () => {
    const notFound = afterGeneration({
      ok: false,
      stage: "generation",
      reason: "model-load-failed: not-found",
    });
    const rejected = afterGeneration({
      ok: false,
      stage: "generation",
      reason: "rejected: echo",
    });

    expect(notFound.kind).toBe("failed");
    expect(rejected.kind).toBe("failed");
    if (notFound.kind === "failed" && rejected.kind === "failed") {
      // 뭉개면 사용자가 무엇을 해야 할지 모른다.
      expect(notFound.message).not.toBe(rejected.message);
      expect(notFound.message).toMatch(/준비/);
      expect(rejected.message).toMatch(/다시 시도/);
    }
  });

  it("★ 시간 초과와 끊김이 각자의 말을 가진다", () => {
    const timedOut = afterGeneration({
      ok: false,
      stage: "generation",
      reason: "timed-out",
    });
    const interrupted = afterGeneration({
      ok: false,
      stage: "generation",
      reason: "interrupted",
    });

    if (timedOut.kind === "failed" && interrupted.kind === "failed") {
      expect(timedOut.message).not.toBe(interrupted.message);
      // 앱을 떠나서 멈춘 것은 사용자가 아는 편이 낫다.
      expect(interrupted.message).toMatch(/떠나|벗어/);
    }
  });

  it("★ 갈래를 알 수 없는 reason도 무너지지 않는다", () => {
    const unknown = afterGeneration({
      ok: false,
      stage: "generation",
      reason: "무언가 새로운 것",
    });

    expect(unknown.kind).toBe("failed");
    if (unknown.kind === "failed") expect(unknown.message.length).toBeGreaterThan(0);
  });

  /**
   * ★ S2 — **거부된 글이 어떤 화면 상태에도 담기지 않는다**(SC-014).
   *
   * 접어서 보여주는 것도 화면에 오르는 것이다.
   */
  it("★ failed에 글을 담을 자리가 없다", () => {
    const result: PipelineResult = {
      ok: false,
      stage: "generation",
      reason: "rejected: echo",
    };
    const screen = afterGeneration(result);

    expect(screen.kind).toBe("failed");
    expect(JSON.stringify(screen)).not.toContain("rejected");
    expect(JSON.stringify(screen)).not.toContain("echo");
  });

  /**
   * ★ 원칙 III — **모델의 실패 양상이 문구에 새지 않는다.**
   */
  it("★ 실패 문구에 모델 정보가 없다", () => {
    const leaking = ["되뱉", "메아리", "echo", "empty", "unfinished", "토큰", "모델", "GGUF"];
    const stages = [
      "day-not-closed",
      "signals",
      "request-build",
      "model-not-ready",
      "generation",
      "storage",
    ] as const;

    for (const stage of stages) {
      const screen = afterGeneration({ ok: false, stage, reason: "rejected: echo" });
      const rendered = JSON.stringify(screen);
      for (const word of leaking) {
        expect(rendered).not.toContain(word);
      }
    }
  });

  it("생성 시간·속도·토큰 수를 담는 자리가 없다 (SC-020)", () => {
    const screen = afterGeneration({ ok: true, entry: entryFor(), overwrote: false });
    const rendered = JSON.stringify(screen);

    for (const metric of ["elapsed", "ms", "tokens", "perSecond", "speed"]) {
      expect(rendered).not.toContain(metric);
    }
  });
});

/**
 * ★★ S1 — **읽기와 생성이 같은 동작에 묶이지 않는다** (원칙 I, FR-045).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 기능이 원칙 I을 어기기 가장 쉬운 자리다.** 목록 화면이 생기면서 처음으로
 * 「저장된 일기를 보여주는 화면」이 존재하게 됐다.
 *
 * 「이미 있으면 그것을 보여준다」는 지름길을 만들면 **저장된 것이 생성을 대신하고**,
 * 그 순간 헌법 원칙 I이 깨진다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("★★ 읽기와 생성이 분리되어 있다 (원칙 I, S1)", () => {
  it("저장된 일기가 있어도 쓰기는 writing으로 간다 — detail이 아니다", () => {
    // 오늘 쓰려는 하루의 일기가 이미 있는 상황.
    const target = latestClosedDay(new Date("2026-08-17T12:00:00"));
    const items = [readable(target)];

    // 목록에 그 하루가 있어도 쓰기는 생성으로 간다.
    expect(items.some((item) => item.day === target)).toBe(true);
    expect(toWriting().kind).toBe("writing");
  });

  it("toWriting은 저장 상태를 인자로 받지 않는다", () => {
    // **인자가 없는 것이 방어다.** 저장 여부를 볼 수 없으면 그것으로 갈릴 수 없다.
    expect(toWriting.length).toBe(0);
  });
});

/**
 * 007 — 쓰기 자리 (contracts/screens.md §4, FR-023·024).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **「무슨 일이 일어나는가」를 아는 것과 그것으로 갈리는 것은 다르다.**
 *
 * `writePromptFor()`는 「이미 있다」를 알려 주지만, `toWriting()`은 여전히 인자를
 * 받지 않으므로 **쓰기를 시작하는 함수는 그것을 볼 수 없다**(FR-025, 원칙 I).
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("049 writePromptFor — 고른 날 (contracts/day-picking.md WP)", () => {
  // **표준시 접미사를 붙이지 않는다**(2026-08-21, CI 실패로 확인) — `dayOf()`가 로컬 시각을 본다.
  const morning = new Date("2026-09-24T09:00:00");

  it("★ WP1 — 고른 적이 없으면 오늘이다 — 정오 전에도 (048 D9를 뒤집음, FR-010a)", () => {
    const prompt = writePromptFor([], morning);
    expect(prompt.day).toBe("2026-09-24");
    expect(writePromptFor([], new Date("2026-09-24T00:10:00")).day).toBe("2026-09-24");
  });

  it("★ WP2 — 사흘 밖의 날(30일 전)을 고르면 그대로 그 날이다 — 되돌림 없음", () => {
    const prompt = writePromptFor([], morning, "2026-08-25");
    expect(prompt.day).toBe("2026-08-25");
    expect(prompt).not.toHaveProperty("revertedFrom");
  });

  it("WP3 — 미래를 고르면 오늘로 떨어진다", () => {
    expect(writePromptFor([], morning, "2026-09-25").day).toBe("2026-09-24");
  });

  it("WP5 — overwrites는 고른 날의 일기만 본다", () => {
    const items = [readable("2026-09-20")];
    expect(writePromptFor(items, morning, "2026-09-20").overwrites).toBe(true);
    expect(writePromptFor(items, morning, "2026-09-21").overwrites).toBe(false);
    expect(writePromptFor(items, morning).overwrites).toBe(false);
  });

  it("읽을 수 없는 일기도 그 하루를 차지한다 — 쓰면 덮어쓴다(원칙 V)", () => {
    expect(writePromptFor([unreadable("2026-09-24")], morning).overwrites).toBe(true);
  });

  it("자정을 넘겨도 고른 날은 그대로다 — 기본값만 새 오늘을 따른다 (FR-019)", () => {
    const beforeMidnight = new Date("2026-09-24T23:59:00");
    const afterMidnight = new Date("2026-09-25T00:01:00");
    expect(writePromptFor([], beforeMidnight, "2026-09-24").day).toBe("2026-09-24");
    expect(writePromptFor([], afterMidnight, "2026-09-24").day).toBe("2026-09-24");
    expect(writePromptFor([], afterMidnight).day).toBe("2026-09-25");
  });
});

describe("049 weekCellsFor·swipeWeek — 주간 스트립 (contracts/day-picking.md SW)", () => {
  const now = new Date("2026-09-24T09:00:00"); // 목요일

  it("★ SW1 — 7칸 일~토, selected 정확히 1, 오늘만 isToday", () => {
    const cells = weekCellsFor([], writePromptFor([], now), now);
    expect(cells.map((c) => c.day)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
    expect(cells.filter((c) => c.selected).map((c) => c.day)).toEqual(["2026-09-24"]);
    expect(cells.filter((c) => c.isToday).map((c) => c.day)).toEqual(["2026-09-24"]);
  });

  it("SW1 — 일기가 있는 날만 hasDiary", () => {
    const cells = weekCellsFor([readable("2026-09-21")], writePromptFor([], now), now);
    expect(cells.filter((c) => c.hasDiary).map((c) => c.day)).toEqual(["2026-09-21"]);
  });

  it("★ SW2 — 미래 칸은 누를 수 없고, 몇 주 전 칸은 누를 수 있다", () => {
    const cells = weekCellsFor([], writePromptFor([], now), now);
    expect(cells.filter((c) => !c.selectable).map((c) => c.day)).toEqual([
      "2026-09-25",
      "2026-09-26",
    ]);
    const old = weekCellsFor([], writePromptFor([], now, "2026-08-12"), now);
    expect(old.every((c) => c.selectable)).toBe(true);
    expect(old.some((c) => c.isToday)).toBe(false);
  });

  it("SW3 — 이전 주로 넘기면 같은 요일 (토 26 → 토 19)", () => {
    const sat = new Date("2026-09-26T09:00:00");
    expect(swipeWeek("2026-09-26", "previous", sat)).toBe("2026-09-19");
  });

  it("★ SW4 — 오늘이 든 주로 돌아올 때 유지한 요일이 오늘 이후면 오늘 (clamp)", () => {
    expect(swipeWeek("2026-09-19", "next", now)).toBe("2026-09-24");
    expect(swipeWeek("2026-09-15", "next", now)).toBe("2026-09-22");
  });

  it("★ SW5 — 오늘이 든 주에서는 다음 주가 없다 (튕김)", () => {
    expect(swipeWeek("2026-09-24", "next", now)).toBeNull();
    expect(swipeWeek("2026-09-20", "next", now)).toBeNull();
    expect(canSwipeNext("2026-09-20", now)).toBe(false);
    expect(canSwipeNext("2026-09-19", now)).toBe(true);
  });

  it("S1 — 결과는 언제나 오늘 이하다", () => {
    for (const day of ["2026-09-13", "2026-09-17", "2026-09-19", "2026-09-24"]) {
      const next = swipeWeek(day, "next", now);
      if (next !== null) expect(next <= "2026-09-24").toBe(true);
    }
  });

  it("SW6 — 두 달에 걸친 주는 고른 날이 든 주다 (8/31 → 8/30~9/5)", () => {
    const cells = weekCellsFor([], writePromptFor([], now, "2026-08-31"), now);
    expect(cells[0].day).toBe("2026-08-30");
    expect(cells[6].day).toBe("2026-09-05");
  });

  it("오늘이 일요일이면 여섯 칸이 미래다", () => {
    const sunday = new Date("2026-09-20T09:00:00");
    const cells = weekCellsFor([], writePromptFor([], sunday), sunday);
    expect(cells.filter((c) => !c.selectable)).toHaveLength(6);
    expect(swipeWeek("2026-09-19", "next", sunday)).toBe("2026-09-20");
  });
});

/**
 * 050 — 한 날 칸 판정 `cellFor` (data-model §1, contracts/dialogs.md CAL6).
 *
 * 달력(`2j`)과 스트립이 **같은 판정 하나**를 쓴다(FR-017). 스트립은 7칸, 달력은 한 달이지만 칸 하나의
 * 판정은 이 함수뿐이다.
 */
describe("050 cellFor — 한 날 칸 판정", () => {
  const now = new Date("2026-09-24T09:00:00"); // 목요일

  it("미래는 누를 수 없고 오늘은 isToday, 선택은 selectedDay", () => {
    expect(cellFor("2026-09-25", [], "2026-09-24", now)).toEqual({
      day: "2026-09-25",
      hasDiary: false,
      isToday: false,
      selectable: false,
      selected: false,
    });
    expect(cellFor("2026-09-24", [], "2026-09-24", now)).toMatchObject({
      isToday: true,
      selectable: true,
      selected: true,
    });
  });

  it("몇 년 전 날도 누를 수 있다 (과거 한계 없음 — SC-004a)", () => {
    expect(cellFor("2016-03-15", [], "2026-09-24", now).selectable).toBe(true);
  });

  it("읽을 수 없는 일기도 그 날을 차지한다 (006 FR-017a)", () => {
    expect(cellFor("2026-09-21", [unreadable("2026-09-21")], "2026-09-24", now).hasDiary).toBe(
      true,
    );
  });

  it("★ CAL6 — weekCellsFor 7칸은 같은 날의 cellFor와 같다", () => {
    const items = [readable("2026-09-21"), unreadable("2026-09-22")];
    for (const chosen of ["2026-09-24", "2026-09-22", "2026-08-31"]) {
      const prompt = writePromptFor(items, now, chosen);
      for (const cell of weekCellsFor(items, prompt, now)) {
        expect(cell).toEqual(cellFor(cell.day, items, prompt.day, now));
      }
    }
  });
});

describe("toWriting은 여전히 아무것도 보지 않는다 (FR-025, SC-014)", () => {
  it("인자를 받지 않는다 — 저장 상태로 갈릴 수 없다", () => {
    // 인자가 없으므로 「이미 있으면 그것을 보여준다」를 쓸 수 없다.
    expect(toWriting).toHaveLength(0);
  });

  it("언제 불러도 같은 값이다 — 목록과 무관하다", () => {
    expect(toWriting()).toEqual({ kind: "writing" });
  });

  it("writing 갈래가 kind 하나만으로도 유효하다 — stage·line은 옵셔널이다(015)", () => {
    // toWriting()은 여전히 인자를 받지 않으므로 처음 값은 kind 하나뿐이다.
    // 첫 onProgress 콜백 전에도 화면이 어색하지 않아야 한다(FR-011).
    expect(Object.keys(toWriting())).toEqual(["kind"]);
  });

  /**
   * ★ **타입 선언 자체를 읽어 검사한다**(FR-010a).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **위의 런타임 검사만으로는 부족하다는 것을 실측으로 확인했다**(2026-08-20).
   *
   * `AppScreen`의 writing 갈래에 `stage: string`을 주입해 보니 **jest는 38개 전부
   * 통과했다** — 타입은 지워지므로 `Object.keys()`가 여전히 `["kind"]`였다.
   * 잡은 것은 `tsc`뿐이었고, 그것은 `npm test`가 아니라 `npm run lint`에 있다.
   *
   * 그래서 **선언을 직접 읽는다.**
   *
   * ★ **015가 이 방어를 다시 연다.** `stage`·`line`이 새로 생겼지만 **둘 다
   * 옵셔널이고 타입이 `ProgressStage | undefined`·`string | undefined`로
   * 좁혀져 있다** — 숫자·시간·객체가 들어올 자리는 여전히 없다
   * (data-model.md 「AppScreen 확장」). 그래서 이 테스트는 "필드가 없다"가
   * 아니라 "허용된 두 필드 외에는 없고, 그 타입이 좁다"를 확인한다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  it("★ AppScreen 선언의 writing 갈래가 stage·branch·line 세 옵셔널 필드만 허용한다(016)", () => {
    const source = readFileSync(join(__dirname, "..", "..", "src", "app", "state.ts"), "utf8");
    const writingBranch = source.match(/\|\s*\{\s*kind:\s*"writing"[^}]*\}/);

    expect(writingBranch).not.toBeNull();
    expect(writingBranch?.[0]).toBe(
      '| { kind: "writing"; stage?: ProgressStage; branch?: MonologueBranch; line?: string }',
    );
  });

  it("숫자·Date·객체를 가리키는 타입이 없다 (원칙 IV)", () => {
    const source = readFileSync(join(__dirname, "..", "..", "src", "app", "state.ts"), "utf8");
    const writingBranch = source.match(/\|\s*\{\s*kind:\s*"writing"[^}]*\}/)?.[0] ?? "";

    expect(writingBranch).not.toMatch(/number|Date|percent|elapsed/i);
  });
});

/** 007 FR-005a — 옮겨졌다는 사실이 화면까지 온다 */
describe("옮김 알림이 값으로 전해진다 (FR-005a, SC-003a)", () => {
  it("movedFrom이 있으면 무엇에서 무엇으로 바뀌었는지 안다", () => {
    // 037 — 로스터가 하나여서 "옮겨 갈 다른 캐릭터"가 없다. 옮김 자체는 캐릭터
    // 식별자 둘만 있으면 성립하므로 FUTURE_CHARACTER로 시험한다(FR-014).
    const state = resolveSelection("quiet", [FUTURE_CHARACTER]);

    expect(state).toEqual({
      kind: "selected",
      character: FUTURE_CHARACTER,
      movedFrom: "quiet",
    });
  });

  it("옮기지 않았으면 알릴 것이 없다", () => {
    const state = resolveSelection("quiet", ["quiet"]);

    expect(state).not.toHaveProperty("movedFrom");
  });
});

/**
 * 009 — 타입이 곧 방어다 (data-model.md §2·§5, contracts/write-prompt.md §2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 007의 교훈을 그대로 쓴다.**
 *
 * `AppScreen`에 `stage: string`을 주입했더니 **jest 38개가 전부 통과했다** — 타입은
 * 지워지므로 런타임 검사로는 보이지 않는다. **잡은 것은 `tsc`뿐이었다.**
 *
 * 그래서 `WritePrompt`도 **선언을 직접 읽어** 검사한다. 고를 수 있는 하루가 셋이
 * 되면 「진행률을 여기 담자」·「캐릭터도 싣자」의 유혹이 생기는데, **자리가 없으면
 * 담을 수 없다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("★ 009 I6·I7 — 담을 자리가 없다", () => {
  const stateSource = () =>
    readFileSync(join(__dirname, "..", "..", "src", "app", "state.ts"), "utf8");

  /** 주석을 걷어낸다 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다(008의 교훈) */
  function withoutComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  }

  /** `WritePrompt` 선언의 본문만 잘라낸다 */
  function writePromptBody(): string {
    const source = withoutComments(stateSource());
    const start = source.indexOf("export type WritePrompt");
    expect(start).toBeGreaterThanOrEqual(0);

    const open = source.indexOf("{", start);
    const close = source.indexOf("};", open);
    expect(close).toBeGreaterThan(open);

    return source.slice(open + 1, close);
  }

  /**
   * **I6 — 필드가 정확히 넷이다** (data-model §5).
   *
   * `day`·`overwrites`·`selectable`·`revertedFrom` 뿐이다. 진행률·경과 시간·토큰·
   * 캐릭터·본문이 들어올 자리가 없다(원칙 IV·III·I).
   */
  it("★ I6·WP4 — WritePrompt의 필드가 정확히 둘이다 (049가 selectable·revertedFrom·writableAt·writable을 걷었다)", () => {
    const body = writePromptBody();
    const fields = body
      .split(";")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/[?:]/)[0].trim());

    expect(fields.sort()).toEqual(["day", "overwrites"]);
  });

  it("★ I6 — 진행률·시간·토큰·모델·본문을 담을 자리가 없다 (원칙 IV·III·I)", () => {
    const body = writePromptBody();

    for (const banned of [
      "elapsed",
      "progress",
      "percent",
      "token",
      "stage",
      "character",
      "model",
      "entry",
      "text",
      "preview",
      "photos",
    ]) {
      expect(body.toLowerCase()).not.toContain(banned);
    }
  });

  /**
   * **I7 — 007이 세운 원칙 I의 방어가 유지된다.**
   *
   * 고를 수 있는 하루가 셋이 되면 「이미 있으면 그것을 보여주자」의 유혹도 셋이 된다.
   * `toWriting()`이 저장 상태를 **볼 수 없으므로** 그것으로 갈릴 수 없다(FR-013).
   */
  it("★ I7 — toWriting은 여전히 인자를 받지 않는다 (원칙 I)", () => {
    expect(toWriting.length).toBe(0);
    expect(Object.keys(toWriting())).toEqual(["kind"]);
  });

  it("★ WP4 — SelectableDay 타입이 없다 (049 — 화면은 사흘을 모른다)", () => {
    expect(withoutComments(stateSource())).not.toContain("SelectableDay");
  });
});

/**
 * 012 — 덮어쓰기 확인 전이.
 *
 * 계약: specs/012-today-diary/contracts/overwrite-confirm.md §1 「전이」
 */
describe("012 — confirm-overwrite 전이 (contracts/overwrite-confirm.md §1)", () => {
  const stateSource = () =>
    readFileSync(join(__dirname, "..", "..", "src", "app", "state.ts"), "utf8");

  function withoutComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  }

  const promptFor = (overrides: Partial<WritePrompt> = {}): WritePrompt => ({
    day: DAY,
    overwrites: false,
    ...overrides,
  });

  it("1. 일기 없음 + 누름 → writing(곧바로 생성 시작) (FR-011 부정 조건)", () => {
    const screen = startWriting(promptFor({ overwrites: false }), []);
    expect(screen.kind).toBe("writing");
  });

  it("★ 2. 일기 있음 + 누름 → confirm-overwrite(생성 시작 안 함) (FR-011, 이 계약의 핵심)", () => {
    const items = [readable(DAY)];
    const screen = startWriting(promptFor({ overwrites: true, day: DAY }), items);
    expect(screen.kind).toBe("confirm-overwrite");
    if (screen.kind === "confirm-overwrite") {
      expect(screen.day).toBe(DAY);
      // 050 — 대화상자 뒤에 홈을 그릴 목록 요약을 함께 싣는다(data-model §3).
      expect(screen.items).toEqual(items);
    }
  });

  it("3. confirm-overwrite에서 취소 → list(기존 일기 그대로) (FR-012)", () => {
    const items = [readable(DAY)];
    const screen = cancelOverwrite(items);
    expect(screen.kind).toBe("list");
    if (screen.kind === "list") expect(screen.items).toEqual(items);
  });

  it("4. confirm-overwrite에서 확인 → writing(생성 시작) (FR-011)", () => {
    expect(confirmOverwrite().kind).toBe("writing");
  });

  it("C2 — 확인한 하루와 실제로 쓰는 하루가 어긋나지 않는다", () => {
    // confirm-overwrite.day가 곧 쓰게 될 하루다. confirmOverwrite() 자체는 인자를
    // 받지 않으므로(C3), 호출하는 쪽이 confirm-overwrite.day를 그대로 파이프라인에
    // 넘긴다는 것을 값으로 확인한다.
    const confirmed = startWriting(promptFor({ overwrites: true, day: "2026-08-19" }), []);
    expect(confirmed.kind).toBe("confirm-overwrite");
    if (confirmed.kind === "confirm-overwrite") {
      expect(confirmed.day).toBe("2026-08-19");
    }
  });

  /**
   * **C1 — `confirm-overwrite`의 필드는 정확히 `kind`·`day`·`items` 셋뿐이다.**
   *
   * 050 — `items`(목록 요약)가 더해졌다. 대화상자가 홈 **위에** 뜨므로 뒤에 그릴 목록이 필요하다.
   * 012가 막은 것은 **일기 본문·미리보기**였고(X1) `DiaryListItem`은 목록이 이미 보이는 요약이라
   * 그 방어를 깨지 않는다. `entry`·`text`가 들어오면 여전히 여기서 걸린다.
   *
   * 선언을 `readFileSync`로 직접 읽는다(007에서 배운 것 — `npm test`만으로는
   * 타입 위반을 놓친다).
   */
  it("★ C1 — AppScreen에 confirm-overwrite 갈래가 있고 필드는 kind·day·items 셋뿐이다", () => {
    const source = withoutComments(stateSource());
    const match = source.match(/\{\s*kind:\s*"confirm-overwrite"[^}]*\}/);

    expect(match).not.toBeNull();
    const body = match?.[0] ?? "";
    const fields = body
      .replace(/^\{|\}$/g, "")
      .split(";")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(":")[0].trim());

    expect(fields.sort()).toEqual(["day", "items", "kind"]);
  });

  /**
   * **C3 — `toWriting()`은 여전히 인자를 받지 않는다.** 012가 확인 갈래를 더해도
   * 007의 방어(원칙 I)가 흔들리지 않는다는 것을 다시 못박는다.
   */
  it("★ C3 — toWriting은 012 이후에도 여전히 인자를 받지 않는다", () => {
    expect(toWriting.length).toBe(0);
    expect(Object.keys(toWriting())).toEqual(["kind"]);
  });
});

/**
 * 015 — writing 화면이 진행 신호(stage)와 독백 문구(line)를 담을 수 있다.
 *
 * 계약: specs/015-writing-monologue/data-model.md 「AppScreen 확장」
 */
describe("015 — writing의 stage·line", () => {
  it("stage·line 없이 시작할 수 있다 (초기값)", () => {
    const screen = toWriting();
    expect(screen).toEqual({ kind: "writing" });
  });

  it("stage·line을 가진 writing 값을 만들 수 있다 (타입 확인)", () => {
    const screen: ReturnType<typeof toWriting> = {
      kind: "writing",
      stage: "vision",
      line: "사진을 들여다보는 중…",
    };
    expect(screen.kind).toBe("writing");
    if (screen.kind === "writing") {
      expect(screen.stage).toBe("vision");
      expect(screen.line).toBe("사진을 들여다보는 중…");
    }
  });
});

/**
 * 015 US2 — writing의 stage·line이 다른 화면 갈래로 새지 않는다.
 *
 * 계약: specs/015-writing-monologue/tasks.md T019, FR-009·FR-011
 *
 * `afterGeneration()`이 만드는 `written`·`failed` 갈래에는 애초에 `stage`·
 * `line` 자리가 없다 — 타입 선언을 직접 읽어 그 사실을 못박는다(007 이후
 * 관례). 자리가 없으면 새는 경로 자체가 존재하지 않는다.
 */
describe("015 US2 — stage·line이 written·failed로 새지 않는다", () => {
  const rawSource = readFileSync(join(__dirname, "..", "..", "src", "app", "state.ts"), "utf8");
  const source = rawSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("written 갈래에 stage·line이 없다", () => {
    const match = source.match(/\{\s*kind:\s*"written"[^}]*\}/);
    expect(match).not.toBeNull();
    expect(match?.[0]).not.toMatch(/\bstage\b|\bline\b/);
  });

  it("failed 갈래에 stage·line이 없다", () => {
    const match = source.match(/\{\s*kind:\s*"failed"[^}]*\}/);
    expect(match).not.toBeNull();
    expect(match?.[0]).not.toMatch(/\bstage\b|\bline\b/);
  });

  it("afterGeneration()의 성공 결과에 stage·line 필드가 없다 (런타임 확인)", () => {
    const screen = afterGeneration({
      ok: true,
      entry: entryFor(),
      overwrote: false,
    });
    expect(Object.keys(screen)).not.toContain("stage");
    expect(Object.keys(screen)).not.toContain("line");
  });

  it("afterGeneration()의 실패 결과에 stage·line 필드가 없다 (런타임 확인)", () => {
    const screen = afterGeneration({ ok: false, stage: "generation", reason: "무언가" });
    expect(Object.keys(screen)).not.toContain("stage");
    expect(Object.keys(screen)).not.toContain("line");
  });
});

describe("048 dayParts와 경계", () => {
  it("DP7 — 날짜 조각 (weekday 0 = 일요일)", () => {
    expect(dayParts("2026-09-13")).toEqual({ year: 2026, month: 9, date: 13, weekday: 0 });
    expect(dayParts("2026-09-24")).toEqual({ year: 2026, month: 9, date: 24, weekday: 4 });
  });

  it("★ DP8 — state.ts는 신호 계층을 import하지 않는다 (화면이 이 파일을 거쳐 신호에 닿지 않게)", () => {
    const source = readFileSync(join(__dirname, "..", "..", "src", "app", "state.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*signals\//);
  });
});

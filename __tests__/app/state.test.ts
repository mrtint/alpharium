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
  initialScreen,
  toDetail,
  toList,
  toWriting,
  type DiaryListItem,
} from "../../src/app/state";
import type { PipelineResult } from "../../src/diary/pipeline";
import type { DiaryEntry } from "../../src/diary/types";
import { partiallyUnknownDay } from "../../src/signals/fake";

const DAY = "2026-08-16";

const entryFor = (day = DAY, text = "오늘 주인은 조용했다"): DiaryEntry => ({
  date: day,
  text,
  character: "quiet",
  signalsUsed: partiallyUnknownDay(day),
  createdAt: new Date("2026-08-17T06:00:00"),
});

const readable = (day: string): DiaryListItem => ({ day, readable: true });
const unreadable = (day: string): DiaryListItem => ({ day, readable: false });

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

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 실패 토스트 판정 계약 테스트.
 *
 * 계약: specs/054-in-place-writing/contracts/failure-toast.md T1~T7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **갈래 표는 사람이 못 박은 상수다**(012·021 선례, 원칙 V) — 이 테스트는 파이프라인의 단계·이유 종류를
 * **하나씩 나열해** 어느 갈래로 가는지 확인한다. 새 실패 종류가 생겼는데 표를 안 고치면 폴백(`retry`)으로
 * 떨어지는데, 그것이 조용히 틀린 안내가 되지 않도록 표의 길이를 직접 센다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PipelineStage } from "../../src/diary/pipeline";
import {
  TOAST_SWIPE,
  TOAST_TEXT,
  shouldDismissToast,
  toastKindFor,
  type PipelineFailure,
  type ToastKind,
} from "../../src/app/failure-toast";

function failure(stage: PipelineStage, reason = ""): PipelineFailure {
  return { ok: false, stage, reason } as PipelineFailure;
}

const RETRY_TEXT = "일기를 쓰지 못했어요. 다시 써 볼 수 있어요.";

describe("T1 — 단계 표", () => {
  const STAGES: readonly (readonly [PipelineStage, ToastKind])[] = [
    ["day-not-closed", "retry"],
    ["already-running", "retry"],
    ["signals", "retry"],
    ["request-build", "prepare-character"],
    ["model-not-ready", "prepare-character"],
    ["vision", "retry"], // 이유가 없으면 폴백
    ["generation", "retry"], // 이유가 없으면 폴백
    ["storage", "save"],
  ];

  it("★ 파이프라인 단계 여덟을 전부 나열한다(수를 직접 센다)", () => {
    expect(STAGES).toHaveLength(8);
  });

  it.each(STAGES)("%s → %s", (stage, kind) => {
    expect(toastKindFor(failure(stage))).toBe(kind);
  });
});

describe("T1·T2 — generation·vision의 이유 종류 표", () => {
  const REASONS: readonly (readonly [string, ToastKind])[] = [
    ["not-implemented", "plain"],
    ["backend-unavailable: 네이티브 없음", "plain"],
    ["model-load-failed: not-found", "prepare-character"],
    ["model-load-failed: load-failed", "prepare-character"],
    ["rejected: empty", "retry"],
    ["rejected: echo", "retry"],
    ["timed-out", "retry"],
    ["interrupted", "retry"],
    ["generation-failed: 뭔가", "retry"],
    ["vision-failed: not-ready", "prepare-vision"],
    ["vision-failed: cancelled", "retry"],
    ["vision-failed: failed", "retry"],
  ];

  it("★ 이유 종류 열둘을 전부 나열한다", () => {
    expect(REASONS).toHaveLength(12);
  });

  it.each(REASONS)("generation · %s → %s", (reason, kind) => {
    expect(toastKindFor(failure("generation", reason))).toBe(kind);
  });

  it.each(REASONS.filter(([r]) => r.startsWith("vision-failed")))(
    "vision · %s → %s (같은 통로)",
    (reason, kind) => {
      expect(toastKindFor(failure("vision", reason))).toBe(kind);
    },
  );
});

describe("T3 — 모르는 것은 retry이고 던지지 않는다", () => {
  it("모르는 이유 종류", () => {
    expect(toastKindFor(failure("generation", "something-new: x"))).toBe("retry");
  });
  it("모르는 vision detail", () => {
    expect(toastKindFor(failure("vision", "vision-failed: weird"))).toBe("retry");
  });
  it("모르는 단계", () => {
    expect(() => toastKindFor(failure("brand-new" as PipelineStage))).not.toThrow();
    expect(toastKindFor(failure("brand-new" as PipelineStage))).toBe("retry");
  });
});

describe("T4 — 문구 KO 원문", () => {
  it("retry는 보드 m.failToast와 글자 단위로 같다", () => {
    expect(TOAST_TEXT.retry).toBe(RETRY_TEXT);
  });
  it("나머지 넷(초안)", () => {
    expect(TOAST_TEXT["prepare-character"]).toBe(
      "일기를 쓰지 못했어요. 먼저 캐릭터를 준비해 주세요.",
    );
    expect(TOAST_TEXT["prepare-vision"]).toBe(
      "일기를 쓰지 못했어요. 사진을 보는 데 필요한 것을 먼저 준비해 주세요.",
    );
    expect(TOAST_TEXT.plain).toBe("일기를 쓰지 못했어요.");
    expect(TOAST_TEXT.save).toBe("일기를 저장하지 못했어요.");
  });
  it("갈래가 다섯이다", () => {
    expect(Object.keys(TOAST_TEXT).sort()).toEqual(
      ["plain", "prepare-character", "prepare-vision", "retry", "save"].sort(),
    );
  });
});

describe("T5 — 거짓 안내 금지 (SC-006)", () => {
  it("retry 외 갈래 문구에 「다시 써 볼 수 있어요」가 없다", () => {
    for (const [kind, text] of Object.entries(TOAST_TEXT)) {
      if (kind === "retry") continue;
      expect(text).not.toContain("다시 써 볼 수 있어요");
    }
  });
});

describe("T6 — 이유가 새지 않는다 (SC-005)", () => {
  it("어떤 문구에도 `:`·숫자·모델 이름이 없다", () => {
    for (const text of Object.values(TOAST_TEXT)) {
      expect(text).not.toMatch(/[:\d]/);
      expect(text).not.toMatch(/kanana|exaone|lfm|llama|gguf/i);
    }
  });
});

describe("T2 — 이유 문자열의 문구를 비교하지 않는다 (소스 검사)", () => {
  it("failure-toast.ts가 한국어 문자열로 reason을 includes/비교하지 않는다", () => {
    const src = readFileSync(join(__dirname, "../../src/app/failure-toast.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/reason[^;\n]*(includes|startsWith|indexOf)\([^)]*[가-힣]/);
    expect(src).not.toMatch(/\.test\([^)]*reason/);
    expect(src).not.toMatch(/\/[^/\n]*[가-힣][^/\n]*\/\.test/);
  });
});

describe("T7 — 쓸어 닫기 문턱 (사람이 정한 값)", () => {
  it("문턱이 24·500이다", () => {
    expect(TOAST_SWIPE).toEqual({ distance: 24, velocity: 500 });
  });
  it("거리 경계 23·24", () => {
    expect(shouldDismissToast(23, 0)).toBe(false);
    expect(shouldDismissToast(24, 0)).toBe(true);
  });
  it("속도 경계 499·500", () => {
    expect(shouldDismissToast(0, 499)).toBe(false);
    expect(shouldDismissToast(0, 500)).toBe(true);
  });
  it("위로·제자리는 닫지 않는다", () => {
    expect(shouldDismissToast(-100, 0)).toBe(false);
    expect(shouldDismissToast(0, -1000)).toBe(false);
    expect(shouldDismissToast(0, 0)).toBe(false);
  });
});

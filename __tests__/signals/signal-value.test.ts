/**
 * SignalValue 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/signals.md 「SignalValue 검증 표」
 *
 * **이 파일이 헌법 원칙 V가 걸리는 지점이다.** "없음"과 "알 수 없음"이 다른 값임을
 * 명시적으로 검증한다(FR-002). 둘이 뭉개지면 관측하지 못한 것이 관측한 것으로 둔갑한다.
 */

import type { Photo, SignalValue } from "../../src/signals/types";

describe("SignalValue — 관측한 것과 못 한 것", () => {
  // contracts/signals.md 「검증 표」 4행
  it("사진 3장을 찾음 → known", () => {
    const photos: Photo[] = [
      { id: "a", takenAt: new Date("2026-08-12T09:00:00") },
      { id: "b", takenAt: new Date("2026-08-12T13:00:00") },
      { id: "c", takenAt: new Date("2026-08-12T20:00:00") },
    ];
    const signal: SignalValue<Photo[]> = { kind: "known", value: photos };

    expect(signal.kind).toBe("known");
    if (signal.kind === "known") {
      expect(signal.value).toHaveLength(3);
    }
  });

  it("사진을 찾아봤는데 0장 → none (FR-002)", () => {
    const signal: SignalValue<Photo[]> = { kind: "none" };
    expect(signal.kind).toBe("none");
  });

  it("사진 권한이 없어 못 봄 → unknown, 왜 모르는지를 담는다 (FR-002)", () => {
    const signal: SignalValue<Photo[]> = { kind: "unknown", reason: "사진 접근 권한이 없다" };

    expect(signal.kind).toBe("unknown");
    if (signal.kind === "unknown") {
      expect(signal.reason).toBe("사진 접근 권한이 없다");
    }
  });

  it("걸음 수는 안드로이드에서 unknown이 정상 상태다 (AGENTS.md 실측)", () => {
    // 안드로이드에 기간 걸음 수를 되짚는 통로가 없다. 예외가 아니라 정상이다.
    const steps: SignalValue<number> = {
      kind: "unknown",
      reason: "안드로이드는 기간 걸음 수 조회를 제공하지 않는다",
    };

    expect(steps.kind).toBe("unknown");
  });
});

describe("none과 unknown은 다른 값이다 (FR-002)", () => {
  /**
   * 이 describe가 이 파일의 핵심이다. 둘을 같게 다루는 순간 헌법 원칙 V가 깨진다.
   */
  it("두 값이 서로 같지 않다", () => {
    const none: SignalValue<number> = { kind: "none" };
    const unknown: SignalValue<number> = { kind: "unknown", reason: "권한 없음" };

    expect(none).not.toEqual(unknown);
    expect(none.kind).not.toBe(unknown.kind);
  });

  it("걸음 수 0(관측함)과 걸음 수 모름(관측 못 함)은 다른 사실이다", () => {
    // 걷지 않은 하루 — 관측했고 0이었다
    const walkedNone: SignalValue<number> = { kind: "known", value: 0 };
    // 알 수 없는 하루 — 관측하지 못했다
    const walkedUnknown: SignalValue<number> = { kind: "unknown", reason: "제공되지 않음" };

    expect(walkedNone).not.toEqual(walkedUnknown);
    expect(walkedNone.kind).toBe("known");
    expect(walkedUnknown.kind).toBe("unknown");
  });

  it("세 상태를 모두 분기로 다룰 수 있다 — 뭉개지 않는다", () => {
    const describeSignal = (signal: SignalValue<number>): string => {
      switch (signal.kind) {
        case "known":
          return `관측함: ${signal.value}`;
        case "none":
          return "관측했고 없었다";
        case "unknown":
          return `관측 못 함: ${signal.reason}`;
      }
    };

    expect(describeSignal({ kind: "known", value: 1200 })).toBe("관측함: 1200");
    expect(describeSignal({ kind: "none" })).toBe("관측했고 없었다");
    expect(describeSignal({ kind: "unknown", reason: "권한" })).toBe("관측 못 함: 권한");
  });
});

describe("불변식 — unknown은 값을 갖지 않는다", () => {
  it("unknown 갈래에 value 필드가 없다", () => {
    const signal: SignalValue<number> = { kind: "unknown", reason: "권한 없음" };

    // 타입 수준에서 signal.value 접근이 불가능하다. 런타임에도 없음을 확인한다.
    expect(Object.keys(signal).sort()).toEqual(["kind", "reason"]);
    expect("value" in signal).toBe(false);
  });

  it("none 갈래에 value 필드가 없다", () => {
    const signal: SignalValue<number> = { kind: "none" };

    expect(Object.keys(signal)).toEqual(["kind"]);
    expect("value" in signal).toBe(false);
  });
});

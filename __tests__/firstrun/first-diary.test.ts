/**
 * 111 — 첫 일기 흐름의 단계 전이 (FD1~FD11).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md
 */

import {
  firstDiaryNext,
  INITIAL_FIRST_DIARY,
  type FirstDiaryEvent,
  type FirstDiaryState,
  type FirstDiaryStep,
  type FirstWriteOutcome,
} from "../../src/firstrun/first-diary";

const at = (step: FirstDiaryStep, rolledBack = false): FirstDiaryState => ({ step, rolledBack });
const settled = (outcome: FirstWriteOutcome): FirstDiaryEvent => ({
  kind: "write-settled",
  outcome,
});

describe("단계 전이", () => {
  it("FD11 초기값은 before이고 되돌림을 쓰지 않았다", () => {
    expect(INITIAL_FIRST_DIARY).toEqual(at("before"));
  });

  it("FD1 확인을 통과하면 재료를 읽는다", () => {
    expect(firstDiaryNext(at("before"), { kind: "liveness-passed" })).toEqual(at("reading"));
  });

  it("FD2 확인을 건너뛰면 끝난다", () => {
    expect(firstDiaryNext(at("before"), { kind: "liveness-skipped" })).toEqual(at("done"));
  });

  it("FD3·FD4 재료를 읽으면 물을 수 있을 때만 묻는다", () => {
    expect(firstDiaryNext(at("reading"), { kind: "material-read", canAsk: true })).toEqual(
      at("asking"),
    );
    expect(firstDiaryNext(at("reading"), { kind: "material-read", canAsk: false })).toEqual(
      at("done"),
    );
  });

  it("FD5·FD6 고른 때만 쓰고 나중에는 끝난다", () => {
    expect(firstDiaryNext(at("asking"), { kind: "confirmed" })).toEqual(at("writing"));
    expect(firstDiaryNext(at("asking"), { kind: "later" })).toEqual(at("done"));
  });

  it("FD7 첫 실패는 확인으로 되돌리고 되돌림을 쓴 것으로 적는다", () => {
    expect(firstDiaryNext(at("writing"), settled("failed"))).toEqual(at("before", true));
  });

  it("FD8 되돌린 뒤의 실패는 끝난다", () => {
    expect(firstDiaryNext(at("writing", true), settled("failed"))).toEqual(at("done", true));
  });

  it.each<FirstWriteOutcome>(["saved", "stopped", "interrupted", "busy", "refused"])(
    "FD9 %s는 되돌리지 않고 끝난다",
    (outcome) => {
      expect(firstDiaryNext(at("writing"), settled(outcome))).toEqual(at("done"));
    },
  );

  it("되돌린 뒤에는 다시 확인을 지나 재료를 다시 판정한다", () => {
    const back = firstDiaryNext(at("writing"), settled("failed"));
    expect(firstDiaryNext(back, { kind: "liveness-passed" })).toEqual(at("reading", true));
  });

  it("되돌린 뒤의 확인 실패에서 건너뛰면 끝난다", () => {
    const back = firstDiaryNext(at("writing"), settled("failed"));
    expect(firstDiaryNext(back, { kind: "liveness-skipped" })).toEqual(at("done", true));
  });

  it.each<[FirstDiaryStep, FirstDiaryEvent]>([
    ["before", { kind: "confirmed" }],
    ["before", settled("failed")],
    ["before", { kind: "material-read", canAsk: true }],
    ["reading", { kind: "liveness-passed" }],
    ["reading", { kind: "later" }],
    ["asking", settled("saved")],
    ["asking", { kind: "liveness-skipped" }],
    ["writing", { kind: "confirmed" }],
    ["writing", { kind: "later" }],
    ["done", { kind: "liveness-passed" }],
    ["done", settled("failed")],
  ])("FD10 %s에서 표에 없는 사건은 상태를 바꾸지 않는다", (step, event) => {
    expect(firstDiaryNext(at(step), event)).toEqual(at(step));
  });
});

describe("흐름의 끝 (FR-015, AS5)", () => {
  const paths: readonly (readonly FirstDiaryEvent[])[] = [
    [{ kind: "liveness-skipped" }],
    [{ kind: "liveness-passed" }, { kind: "material-read", canAsk: false }],
    [{ kind: "liveness-passed" }, { kind: "material-read", canAsk: true }, { kind: "later" }],
    ...(["saved", "stopped", "interrupted", "busy", "refused"] as const).map((outcome) => [
      { kind: "liveness-passed" } as const,
      { kind: "material-read", canAsk: true } as const,
      { kind: "confirmed" } as const,
      settled(outcome),
    ]),
    [
      { kind: "liveness-passed" },
      { kind: "material-read", canAsk: true },
      { kind: "confirmed" },
      settled("failed"),
      { kind: "liveness-passed" },
      { kind: "material-read", canAsk: true },
      { kind: "confirmed" },
      settled("failed"),
    ],
  ];

  it.each(paths.map((path, i) => [i, path] as const))("경로 %i는 done에 닿는다", (_i, path) => {
    expect(path.reduce(firstDiaryNext, INITIAL_FIRST_DIARY).step).toBe("done");
  });

  it("쓰는 중은 끝이 아니다", () => {
    const writing = [
      { kind: "liveness-passed" },
      { kind: "material-read", canAsk: true },
      { kind: "confirmed" },
    ] as const;
    expect(writing.reduce(firstDiaryNext, INITIAL_FIRST_DIARY).step).toBe("writing");
  });
});

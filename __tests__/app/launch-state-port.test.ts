/**
 * 090 LS1 — 깨운 순간의 앱 상태 통로. `react-native`를 읽는 함수를 갈아 끼워 두 값·그 밖·예외를 본다.
 */

import { readLaunchState } from "../../src/app/launch-state-port";

describe("LS1 — readLaunchState", () => {
  it.each([
    ["active", "active"],
    ["background", "background"],
    ["inactive", undefined],
    ["unknown", undefined],
    [null, undefined],
  ])("currentState %p → %p", (state, expected) => {
    expect(readLaunchState(() => ({ AppState: { currentState: state } }))).toBe(expected);
  });

  it("react-native를 읽지 못하면 undefined (던지지 않는다)", () => {
    expect(
      readLaunchState(() => {
        throw new Error("no native");
      }),
    ).toBeUndefined();
  });
});

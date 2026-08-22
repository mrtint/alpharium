/**
 * SignalProbe 화면 테스트 — 012 진단 경로는 다섯 축을 전부 보인다.
 *
 * 계약: specs/012-today-diary/contracts/signal-visibility.md §1 「축 제외」 S4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **진단 화면은 `USER_VISIBLE_SIGNAL_AXES`를 보지 않는다**(FR-009). 사용자 화면에서
 * 빠지는 것과 저장소가 값을 잊는 것은 다르다 — 개발자가 실기기에서 걸음·배터리·연결의
 * 실제 값(또는 `unknown` 사유)을 여전히 볼 수 있어야 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, userEvent } from "@testing-library/react-native";

import { SignalProbe } from "../../src/ui/SignalProbe";
import type { PhotoPort } from "../../src/signals/port";

function fakePort(): PhotoPort {
  return {
    photoPermission: async () => "granted",
    locationPermission: async () => "granted",
    requestPhotoPermission: async () => "granted",
    requestLocationPermission: async () => "granted",
    photosBetween: async () => [],
    locationOf: async () => ({ kind: "absent" }),
    filePathOf: async () => null,
  };
}

describe("S4 — SignalProbe가 소스에서 USER_VISIBLE_SIGNAL_AXES를 import하지 않는다", () => {
  // 008의 "주석을 걷어내고 검사한다" 방식 — 우연히 안 부르는 것과 구조로 못 부르는
  // 것은 다르다. 나중에 리팩터링 중에 조용히 새로 import될 수 있다.
  it("소스에 USER_VISIBLE_SIGNAL_AXES 문자열이 없다", () => {
    const source = readFileSync(join(__dirname, "..", "..", "src", "ui", "SignalProbe.tsx"), "utf8");
    expect(source).not.toContain("USER_VISIBLE_SIGNAL_AXES");
  });
});

describe("진단 화면은 다섯 축을 전부 그린다 (FR-009)", () => {
  it("조회 뒤 걸음·배터리·연결이 화면에 보인다", async () => {
    const user = userEvent.setup();
    await render(<SignalProbe port={fakePort()} />);

    await user.press(screen.getByTestId("signal-probe-run"));

    expect(await screen.findByTestId("signal-steps")).toBeTruthy();
    expect(screen.getByTestId("signal-battery")).toBeTruthy();
    expect(screen.getByTestId("signal-connectivity")).toBeTruthy();
    // 사진·자리도 여전히 있다 — 축 다섯 전부다.
    expect(screen.getByTestId("signal-photos")).toBeTruthy();
    expect(screen.getByTestId("signal-places")).toBeTruthy();
  });
});

/**
 * 진단 화면의 권한 자리.
 *
 * 계약: specs/004-photo-signal-collection/contracts/diagnostics.md 「검증 표」 G1~G4
 *
 * **G2가 가장 중요하다** — 화면이 열렸다는 이유로 권한을 요청하면 FR-011 위반이고,
 * 그것은 expo 튜토리얼이 권하는 패턴이라 실수하기 쉽다.
 *
 * **`render()`를 `await` 한다** — `@testing-library/react-native` 14에서 `render`가
 * Promise를 반환하도록 바뀌었다(설치본에서 확인, 2026-08-16: 반환값의 프로토타입이
 * `then`/`catch`/`finally`였다). `await` 없이 쓰면 `screen`이 비어 있고 오류 문구는
 * "`render` function has not been called"라 원인을 가리키지 않는다.
 *
 * **`toHaveTextContent`는 정확히 일치를 본다.** 부분 문자열을 보려면 정규식을 준다 —
 * 문자열로 주면 "거절됨"이 "거절됨 — 다시 요청할 수 있다"와 맞지 않는다.
 */

import { render, screen, userEvent } from "@testing-library/react-native";

import type { PermissionState, PhotoPort } from "../../src/signals/port";
import { PermissionPanel } from "../../src/ui/PermissionPanel";

type Counters = { requestPhoto: number; requestLocation: number };

function stubPort(
  photo: PermissionState,
  location: PermissionState,
): { port: PhotoPort; counters: Counters } {
  const counters: Counters = { requestPhoto: 0, requestLocation: 0 };

  const port: PhotoPort = {
    photoPermission: async () => photo,
    locationPermission: async () => location,
    requestPhotoPermission: async () => {
      counters.requestPhoto += 1;
      return "granted";
    },
    requestLocationPermission: async () => {
      counters.requestLocation += 1;
      return "granted";
    },
    photosBetween: async () => [],
    locationOf: async () => ({ kind: "absent" }),
  };

  return { port, counters };
}

describe("G1 — 두 권한이 각각 보인다 (FR-020)", () => {
  it("사진과 좌표의 상태가 따로 나온다", async () => {
    const { port } = stubPort("granted", "denied");
    await render(<PermissionPanel port={port} />);

    // 합치면 "사진은 되는데 좌표가 안 되는" 상태를 진단할 수 없다.
    expect(await screen.findByTestId("photo-permission-state")).toHaveTextContent(/허용됨/);
    expect(await screen.findByTestId("location-permission-state")).toHaveTextContent(/거절됨/);
  });
});

describe("G2 — 화면이 열려도 요청이 불리지 않는다 (FR-011)", () => {
  it("undetermined여도 요청 창을 띄우지 않는다", async () => {
    const { port, counters } = stubPort("undetermined", "undetermined");
    await render(<PermissionPanel port={port} />);

    await screen.findByTestId("photo-permission-state");

    // **이것이 깨지면 사용자가 맥락 없이 권한 창을 만나고, 대개 거절해 blocked가 된다.**
    expect(counters.requestPhoto).toBe(0);
    expect(counters.requestLocation).toBe(0);
  });
});

describe("G3 — 버튼을 눌러야 요청이 불린다 (FR-021)", () => {
  it("사진 권한 버튼을 누르면 요청된다", async () => {
    const user = userEvent.setup();
    const { port, counters } = stubPort("denied", "denied");
    await render(<PermissionPanel port={port} />);

    await user.press(await screen.findByTestId("photo-permission-request"));

    expect(counters.requestPhoto).toBe(1);
  });

  it("좌표 권한 버튼은 좌표만 요청한다", async () => {
    const user = userEvent.setup();
    const { port, counters } = stubPort("denied", "denied");
    await render(<PermissionPanel port={port} />);

    await user.press(await screen.findByTestId("location-permission-request"));

    expect(counters.requestLocation).toBe(1);
    expect(counters.requestPhoto).toBe(0);
  });
});

describe("G4 — blocked가 denied와 다르게 보인다 (FR-023)", () => {
  it("blocked면 요청 버튼이 없다", async () => {
    const { port } = stubPort("blocked", "denied");
    await render(<PermissionPanel port={port} />);

    await screen.findByTestId("photo-permission-state");

    // 눌러도 창이 뜨지 않으므로 버튼을 두면 사용자가 반복해서 누른다.
    expect(screen.queryByTestId("photo-permission-request")).toBeNull();
  });

  it("blocked면 설정에서 바꿔야 한다고 알린다", async () => {
    const { port } = stubPort("blocked", "denied");
    await render(<PermissionPanel port={port} />);

    expect(await screen.findByTestId("photo-permission-note")).toHaveTextContent(/설정에서/);
  });

  it("denied면 요청 버튼이 있다", async () => {
    const { port } = stubPort("denied", "denied");
    await render(<PermissionPanel port={port} />);

    expect(await screen.findByTestId("photo-permission-request")).toBeTruthy();
  });

  it("두 상태의 문구가 서로 다르다", async () => {
    const { port } = stubPort("blocked", "denied");
    await render(<PermissionPanel port={port} />);

    const blocked = await screen.findByTestId("photo-permission-state");
    const denied = await screen.findByTestId("location-permission-state");

    expect(blocked).toHaveTextContent(/다시 요청해도/);
    expect(denied).toHaveTextContent(/다시 요청할 수 있다/);
  });
});

describe("granted 상태", () => {
  it("허용됐으면 요청할 것이 없다", async () => {
    const { port } = stubPort("granted", "granted");
    await render(<PermissionPanel port={port} />);

    await screen.findByTestId("photo-permission-state");

    expect(screen.queryByTestId("photo-permission-request")).toBeNull();
  });
});

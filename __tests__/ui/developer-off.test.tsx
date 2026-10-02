/**
 * 059 — 켜기 → 열기 → 끄기 → 다시 켜기 한 바퀴 (계약 OF1~OF3, HK2·HK4).
 *
 * `App.tsx` 전체가 아니라 작은 조립 하니스다 — 훅(`useDeveloperMenu`·`useDeveloperTaps`·`useToastLine`)과 두 화면을 부모 상태로 묶어
 * 「설정 → 개발자 → 끄기 → 설정」 흐름의 배선만 본다. 겹의 움직임·뒤로 가기 등록은 `settings-stack`·소스 계약과 실기기가 본다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`·`act`는 Promise다 — await한다.
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import type { DeveloperMenuStorePort } from "../../src/app/developer-menu-store";
import { DeveloperScreen } from "../../src/ui/DeveloperScreen";
import { SettingsScreen } from "../../src/ui/SettingsScreen";
import { useDeveloperMenu } from "../../src/ui/use-developer-menu";
import { useDeveloperTaps } from "../../src/ui/use-developer-taps";
import { useToastLine } from "../../src/ui/use-toast-line";

jest.setTimeout(30000);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function store(initial: string | null = null) {
  let content = initial;
  const port: DeveloperMenuStorePort = {
    read: jest.fn(async () => content),
    write: jest.fn(async (s: string) => {
      content = s;
    }),
    remove: jest.fn(async () => {
      content = null;
    }),
  };
  return port;
}

function Harness({
  devEnvironment,
  port,
  onOpenDiagnostics,
}: {
  devEnvironment: boolean;
  port: DeveloperMenuStorePort;
  onOpenDiagnostics?: () => void;
}) {
  const developer = useDeveloperMenu({ devEnvironment, port });
  const line = useToastLine();
  const { onPressVersion, highlight } = useDeveloperTaps({
    alreadyOn: developer.enabled,
    onEnable: developer.enable,
    showToast: line.show,
  });
  const [route, setRoute] = useState<"settings" | "developer">("settings");
  return route === "developer" && developer.enabled ? (
    <DeveloperScreen
      modules={{ reading: null, writing: null }}
      onDisable={() => {
        developer.disable();
        setRoute("settings");
      }}
      {...(onOpenDiagnostics !== undefined ? { onOpenDiagnostics } : {})}
      showsDiagnostics={devEnvironment}
    />
  ) : (
    <SettingsScreen
      autoWriteEnabled={false}
      characterName="금동이"
      developerEnabled={developer.enabled}
      developerHighlight={highlight}
      moduleSizeText={null}
      onOpenAppSettings={jest.fn()}
      onOpenDeveloper={() => setRoute("developer")}
      onOpenPlaceNames={jest.fn()}
      onOpenRename={jest.fn()}
      onOpenTargetHour={jest.fn()}
      onOpenWipe={jest.fn()}
      onPressVersion={onPressVersion}
      onToggleAutoWrite={jest.fn()}
      permissionTags={{ photos: "allowed", location: "allowed", notifications: "allowed" }}
      placeNamesText="자동"
      targetHourText="오후 10시쯤"
      versionText="1.0.0 (24)"
      wipeEnabled={false}
    />
  );
}

async function sevenTaps() {
  for (let i = 0; i < 7; i += 1) {
    await fireEvent.press(screen.getByTestId("settings-version"));
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
  }
}

describe("OF1·OF2·OF3 — 배포 환경 한 바퀴", () => {
  it("켜고 → 열고 → 끄면 행이 사라지고 파일이 지워지며 → 다시 7번 누르면 켜진다", async () => {
    const port = store();
    await render(<Harness devEnvironment={false} port={port} />);
    expect(screen.queryByTestId("settings-developer")).toBeNull();

    await sevenTaps();
    expect(screen.getByTestId("settings-developer")).toBeTruthy();
    expect(port.write).toHaveBeenCalledWith('{"enabled":true}');

    await fireEvent.press(screen.getByTestId("settings-developer"));
    expect(screen.getByTestId("developer-screen")).toBeTruthy();
    expect(screen.queryByTestId("developer-diagnostics")).toBeNull();

    await fireEvent.press(screen.getByTestId("developer-off"));
    expect(screen.queryByTestId("developer-screen")).toBeNull();
    expect(screen.queryByTestId("settings-developer")).toBeNull();
    expect(port.remove).toHaveBeenCalledTimes(1);

    await sevenTaps();
    expect(screen.getByTestId("settings-developer")).toBeTruthy();
  });
});

describe("OF2 — 개발 환경은 파일을 건드리지 않는다", () => {
  it("처음부터 켜져 있고 끄면 그 실행 동안만 꺼지며 7번 누르면 다시 켜진다", async () => {
    const port = store();
    await render(<Harness devEnvironment port={port} />);
    expect(screen.getByTestId("settings-developer")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("settings-developer"));
    await fireEvent.press(screen.getByTestId("developer-off"));
    expect(screen.queryByTestId("settings-developer")).toBeNull();

    await sevenTaps();
    expect(screen.getByTestId("settings-developer")).toBeTruthy();
    expect(port.read).not.toHaveBeenCalled();
    expect(port.write).not.toHaveBeenCalled();
    expect(port.remove).not.toHaveBeenCalled();
  });
});

describe("DG1 — 개발 환경에서만 진단 진입", () => {
  it("행을 누르면 onOpenDiagnostics 가 불린다", async () => {
    const onOpenDiagnostics = jest.fn();
    await render(<Harness devEnvironment onOpenDiagnostics={onOpenDiagnostics} port={store()} />);
    await fireEvent.press(screen.getByTestId("settings-developer"));
    await fireEvent.press(screen.getByTestId("developer-diagnostics"));
    expect(onOpenDiagnostics).toHaveBeenCalledTimes(1);
  });
});

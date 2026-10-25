/**
 * 068 — 설정 「배터리」 행은 문구를 prop으로 받는다 (contracts/ios-settings.md C2, spec FR-003·FR-007).
 *
 * 화면은 `Platform`으로 문구를 고르지 않는다 — 조립부(`App.tsx`)가 `batteryRowHint(platform)`을 넘긴다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { SettingsScreen, type SettingsScreenProps } from "../../src/ui/SettingsScreen";

jest.setTimeout(30000);

const SCREEN_SRC = readFileSync(join(__dirname, "../../src/ui/SettingsScreen.tsx"), "utf8");
const SCREEN_CODE = SCREEN_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const APP_CODE = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

function props(over: Partial<SettingsScreenProps> = {}): SettingsScreenProps {
  return {
    characterName: "금동이",
    onOpenRename: jest.fn(),
    autoWriteEnabled: true,
    onToggleAutoWrite: jest.fn(),
    permissionTags: {
      photos: "allowed",
      location: "allowed",
      notifications: "allowed",
      battery: "unread",
    },
    onOpenAppSettings: jest.fn(),
    batteryHint: "문구 주입 확인",
    versionText: "1.0.0 (1)",
    targetHourText: "오후 10시쯤",
    onOpenTargetHour: jest.fn(),
    placeNamesText: "자동",
    onOpenPlaceNames: jest.fn(),
    moduleSizeText: "2.0GB",
    wipeEnabled: true,
    onOpenWipe: jest.fn(),
    ...over,
  };
}

describe("068 C2 — 배터리 행", () => {
  it("batteryHint prop 문자열이 행에 그려진다", async () => {
    await render(
      <SettingsScreen
        {...props({ batteryHint: "충전 중이고 저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요" })}
      />,
    );
    expect(
      screen.getByText("충전 중이고 저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요"),
    ).toBeTruthy();
  });

  it("행을 누르면 onOpenAppSettings를 부른다", async () => {
    const onOpenAppSettings = jest.fn();
    await render(<SettingsScreen {...props({ onOpenAppSettings })} />);
    await fireEvent.press(screen.getByTestId("settings-perm-battery"));
    expect(onOpenAppSettings).toHaveBeenCalledTimes(1);
  });
});

describe("104 PT4~PT6 — 배터리 꼬리표", () => {
  const permissionTags = (battery: "allowed" | "denied" | "unread") => ({
    photos: "allowed" as const,
    location: "allowed" as const,
    notifications: "allowed" as const,
    battery,
  });

  it("allowed → 「허용됨」, denied → 「허용 안 함」", async () => {
    const { rerender } = await render(
      <SettingsScreen {...props({ permissionTags: permissionTags("allowed") })} />,
    );
    expect(within(screen.getByTestId("settings-tag-battery")).getByText("허용됨")).toBeTruthy();
    await rerender(<SettingsScreen {...props({ permissionTags: permissionTags("denied") })} />);
    expect(within(screen.getByTestId("settings-tag-battery")).getByText("허용 안 함")).toBeTruthy();
  });

  it("unread(모름·iOS)면 꼬리표 없이 화살표만 — 보조 줄과 누름은 그대로", async () => {
    const onOpenAppSettings = jest.fn();
    await render(
      <SettingsScreen
        {...props({ permissionTags: permissionTags("unread"), onOpenAppSettings })}
      />,
    );
    expect(screen.queryByTestId("settings-tag-battery")).toBeNull();
    expect(
      within(screen.getByTestId("settings-perm-battery")).getByTestId("settings-chevron"),
    ).toBeTruthy();
    expect(screen.getByText("문구 주입 확인")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("settings-perm-battery"));
    expect(onOpenAppSettings).toHaveBeenCalledTimes(1);
  });

  it("꼬리표가 있어도 행을 누르면 앱 설정이 열린다", async () => {
    const onOpenAppSettings = jest.fn();
    await render(
      <SettingsScreen
        {...props({ permissionTags: permissionTags("denied"), onOpenAppSettings })}
      />,
    );
    await fireEvent.press(screen.getByTestId("settings-perm-battery"));
    expect(onOpenAppSettings).toHaveBeenCalledTimes(1);
  });
});

describe("068 FR-007 — 화면은 플랫폼으로 문구를 고르지 않는다 (소스 계약)", () => {
  it("SettingsScreen이 안드로이드 문구(permBatteryHint)를 직접 읽지 않는다", () => {
    expect(SCREEN_CODE).not.toMatch(/permBatteryHint/);
  });

  // 083 — 글꼴 선택(Menlo)이 사라져 `Platform`을 쓸 자리가 없다. 「플랫폼으로 고르지 않는다」가 더 강하게 남는다.
  it("SettingsScreen이 Platform을 쓰지 않는다 (Platform.OS·Platform.select 0회)", () => {
    expect(SCREEN_CODE).not.toMatch(/\bPlatform\b/);
  });

  it("App.tsx가 batteryRowHint로 고른 문구를 SettingsScreen에 넘긴다", () => {
    expect(APP_CODE).toMatch(/batteryHint=\{batteryRowHint\(/);
  });
});

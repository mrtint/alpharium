/**
 * 068 — 설정 「배터리」 행은 문구를 prop으로 받는다 (contracts/ios-settings.md C2, spec FR-003·FR-007).
 *
 * 화면은 `Platform`으로 문구를 고르지 않는다 — 조립부(`App.tsx`)가 `batteryRowHint(platform)`을 넘긴다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";

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
    permissionTags: { photos: "allowed", location: "allowed", notifications: "allowed" },
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
    await render(<SettingsScreen {...props({ batteryHint: "저전력 모드를 끄면 제때 써요" })} />);
    expect(screen.getByText("저전력 모드를 끄면 제때 써요")).toBeTruthy();
  });

  it("행을 누르면 onOpenAppSettings를 부른다", async () => {
    const onOpenAppSettings = jest.fn();
    await render(<SettingsScreen {...props({ onOpenAppSettings })} />);
    await fireEvent.press(screen.getByTestId("settings-perm-battery"));
    expect(onOpenAppSettings).toHaveBeenCalledTimes(1);
  });
});

describe("068 FR-007 — 화면은 플랫폼으로 문구를 고르지 않는다 (소스 계약)", () => {
  it("SettingsScreen이 안드로이드 문구(permBatteryHint)를 직접 읽지 않는다", () => {
    expect(SCREEN_CODE).not.toMatch(/permBatteryHint/);
  });

  it("SettingsScreen의 Platform 사용은 글꼴 선택(Menlo)뿐이고 Platform.OS를 읽지 않는다", () => {
    expect(SCREEN_CODE).not.toMatch(/Platform\.OS/);
    const selects = SCREEN_CODE.match(/Platform\.select\([^)]*\)/g) ?? [];
    for (const s of selects) expect(s).toMatch(/Menlo/);
  });

  it("App.tsx가 batteryRowHint로 고른 문구를 SettingsScreen에 넘긴다", () => {
    expect(APP_CODE).toMatch(/batteryHint=\{batteryRowHint\(/);
  });
});

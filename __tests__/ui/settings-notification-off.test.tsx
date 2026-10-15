/**
 * 085 — 설정 알림 행의 「알림이 꺼져 있어 …」 빨간 보조 줄.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md ST2
 *       spec.md FR-015
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 */

import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { SettingsScreen, type SettingsScreenProps } from "../../src/ui/SettingsScreen";
import { COLORS } from "../../src/ui/theme/tokens";

const LINE = "알림이 꺼져 있어 쓸 차례를 알리지 못해요";

function props(over: Partial<SettingsScreenProps> = {}): SettingsScreenProps {
  return {
    characterName: "금동이",
    onOpenRename: jest.fn(),
    autoWriteEnabled: true,
    onToggleAutoWrite: jest.fn(),
    permissionTags: { photos: "denied", location: "allowed", notifications: "denied" },
    onOpenAppSettings: jest.fn(),
    batteryHint: "제한 없음이면 열지 않아도 먼저 써 둘 때가 있어요",
    versionText: "1.0.0 (9)",
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

describe("ST2", () => {
  it("notificationOffText를 주면 알림 행 안에 빨간 보조 줄로 그린다", async () => {
    await render(<SettingsScreen {...props({ notificationOffText: LINE })} />);
    const row = screen.getByTestId("settings-perm-notifications");
    const line = within(row).getByText(LINE);
    expect((StyleSheet.flatten(line.props.style as never) as { color?: string }).color).toBe(
      COLORS.danger,
    );
  });

  it("주지 않으면 없다", async () => {
    await render(<SettingsScreen {...props()} />);
    expect(screen.queryByText(LINE)).toBeNull();
  });

  it("사진 행의 건너뜀 줄과 섞이지 않는다", async () => {
    await render(
      <SettingsScreen
        {...props({ notificationOffText: LINE, photoSkipText: "어제 자동 쓰기를 건너뛰었어요" })}
      />,
    );
    expect(
      within(screen.getByTestId("settings-perm-photos")).getByText("어제 자동 쓰기를 건너뛰었어요"),
    ).toBeTruthy();
    expect(within(screen.getByTestId("settings-perm-photos")).queryByText(LINE)).toBeNull();
    expect(within(screen.getByTestId("settings-perm-notifications")).getByText(LINE)).toBeTruthy();
  });
});

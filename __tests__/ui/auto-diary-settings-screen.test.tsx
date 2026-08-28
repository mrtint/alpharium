import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react-native";

import { AutoDiarySettingsScreen } from "../../src/ui/AutoDiarySettingsScreen";
import { DEFAULT_AUTO_DIARY_SETTINGS } from "../../src/schedule/settings";

/**
 * 자동 일기 작성 설정 화면 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S6
 *       specs/020-scheduled-diary-notification/contracts/battery-exception.md
 *       E4·E5
 *       spec.md FR-001·FR-002·FR-010·SC-001
 */

describe("AutoDiarySettingsScreen — 존재 (FR-001)", () => {
  it("토글과 시각 선택 UI가 렌더된다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
      />,
    );

    expect(screen.getByTestId("auto-diary-toggle")).toBeTruthy();
    expect(screen.getByTestId("target-hour-7")).toBeTruthy();
    expect(screen.getByTestId("target-hour-0")).toBeTruthy();
    expect(screen.getByTestId("target-hour-23")).toBeTruthy();
  });

  it("토글을 누르면 반대 값으로 onToggleEnabled가 불린다", async () => {
    const onToggleEnabled = jest.fn();
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={onToggleEnabled}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
      />,
    );

    fireEvent.press(screen.getByTestId("auto-diary-toggle"));
    expect(onToggleEnabled).toHaveBeenCalledWith(true);
  });

  it("시각 셀을 누르면 그 시각으로 onChangeTargetHour가 불린다", async () => {
    const onChangeTargetHour = jest.fn();
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={() => {}}
        onChangeTargetHour={onChangeTargetHour}
        onOpenBatterySettings={() => {}}
      />,
    );

    fireEvent.press(screen.getByTestId("target-hour-9"));
    expect(onChangeTargetHour).toHaveBeenCalledWith(9);
  });
});

describe("AutoDiarySettingsScreen — 근사치 안내 (E5, SC-001)", () => {
  it("'무렵' 문구가 보인다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
      />,
    );

    expect(screen.getByText(/무렵/)).toBeTruthy();
  });
});

describe("AutoDiarySettingsScreen — 배터리 상시 링크 (E4, FR-010)", () => {
  it("자동 생성이 꺼져 있어도 배터리 설정 링크가 보인다", async () => {
    const onOpenBatterySettings = jest.fn();
    await render(
      <AutoDiarySettingsScreen
        settings={{ ...DEFAULT_AUTO_DIARY_SETTINGS, enabled: false }}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={onOpenBatterySettings}
      />,
    );

    const link = screen.getByTestId("open-battery-settings");
    expect(link).toBeTruthy();
    fireEvent.press(link);
    expect(onOpenBatterySettings).toHaveBeenCalledTimes(1);
  });

  it("batteryExceptionPrompted가 true여도 링크가 보인다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={{ ...DEFAULT_AUTO_DIARY_SETTINGS, batteryExceptionPrompted: true }}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
      />,
    );

    expect(screen.getByTestId("open-battery-settings")).toBeTruthy();
  });
});

describe("AutoDiarySettingsScreen — N8 알림 권한 거부 안내", () => {
  it("notificationDenied면 안내가 보인다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
        notificationDenied
      />,
    );

    expect(screen.getByText(/알림 권한이 없어/)).toBeTruthy();
  });

  it("notificationDenied가 없으면 안내가 없다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
      />,
    );

    expect(screen.queryByText(/알림 권한이 없어/)).toBeNull();
  });
});

describe("AutoDiarySettingsScreen — 정밀도 암시 문구 없음 (FR-002, E5)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/ui/AutoDiarySettingsScreen.tsx"), "utf8");
  // 주석은 제외한다 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다(008 관례).
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("렌더 문자열에 '정각' / '매일 7시' / '7:00'이 없다", () => {
    expect(CODE).not.toMatch(/정각|매일 (오전 )?7시|7:00/);
  });

  it("모델 이름이 없다 (원칙 III)", () => {
    expect(CODE).not.toMatch(/kanana|exaone|hyperclova|gguf/i);
  });
});

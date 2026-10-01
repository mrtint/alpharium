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

/*
 * ★ 055 — on/off 토글은 설정의 「자동으로 쓰기」 행(`SettingsScreen` — settings-screen.test.tsx C2)으로, 배터리 상시 링크(E4)는
 * 「권한 · 휴대폰 설정으로 이동」의 배터리 행(앱 정보 화면 — C4·C6)으로 옮겨 갔다. 이 화면에는 시각 선택만 남는다(055 FR-019).
 */
describe("AutoDiarySettingsScreen — 시각 선택 (FR-001, 055)", () => {
  it("시각 선택 UI가 렌더되고, 토글·배터리 링크는 여기 없다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onChangeTargetHour={() => {}}
      />,
    );

    expect(screen.getByTestId("target-hour-7")).toBeTruthy();
    expect(screen.getByTestId("target-hour-0")).toBeTruthy();
    expect(screen.getByTestId("target-hour-23")).toBeTruthy();
    expect(screen.queryByTestId("auto-diary-toggle")).toBeNull();
    expect(screen.queryByTestId("open-battery-settings")).toBeNull();
  });

  it("시각 셀을 누르면 그 시각으로 onChangeTargetHour가 불린다", async () => {
    const onChangeTargetHour = jest.fn();
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onChangeTargetHour={onChangeTargetHour}
      />,
    );

    await fireEvent.press(screen.getByTestId("target-hour-9"));
    expect(onChangeTargetHour).toHaveBeenCalledWith(9);
  });

  it("바깥 스크롤을 두지 않는다 — 설정 지면이 스크롤한다", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/AutoDiarySettingsScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/ScrollView/);
  });
});

describe("AutoDiarySettingsScreen — 근사치 안내 (E5, SC-001)", () => {
  it("'무렵' 문구가 보인다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onChangeTargetHour={() => {}}
      />,
    );

    expect(screen.getByText(/무렵/)).toBeTruthy();
  });
});

describe("AutoDiarySettingsScreen — N8 알림 권한 거부 안내", () => {
  it("notificationDenied면 안내가 보인다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onChangeTargetHour={() => {}}
        notificationDenied
      />,
    );

    expect(screen.getByText(/알림 권한이 없어/)).toBeTruthy();
  });

  it("notificationDenied가 없으면 안내가 없다", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onChangeTargetHour={() => {}}
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

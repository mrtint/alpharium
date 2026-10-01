/**
 * 055 — 설정 화면의 내용 (보드 `6c`).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md F3~F5·C1~C8, spec FR-031(문구 원문)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 보드 원문과 인라인 스타일 값을 글자·숫자 단위로 잠근다(C4, 047 교훈). 화면은 판정하지 않으므로 꼬리표는 넘겨받은 값을
 * 그대로 그리는지만 본다 — 판정 표는 `__tests__/app/permission-tags.test.ts`가 잠근다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AppState, StyleSheet, Text, type AppStateStatus } from "react-native";

import type { PermissionFacts } from "../../src/app/permission-tags";
import { SettingsScreen, type SettingsScreenProps } from "../../src/ui/SettingsScreen";
import { SETTINGS_TEXT } from "../../src/ui/settings-text";
import { COLORS, SETTINGS } from "../../src/ui/theme/tokens";
import { usePermissionTags } from "../../src/ui/use-permission-tags";

jest.setTimeout(30000);

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

function props(over: Partial<SettingsScreenProps> = {}): SettingsScreenProps {
  return {
    characterName: "금동이",
    onOpenRename: jest.fn(),
    autoWriteEnabled: true,
    onToggleAutoWrite: jest.fn(),
    permissionTags: { photos: "allowed", location: "denied", notifications: "partial" },
    onOpenAppSettings: jest.fn(),
    versionText: "1.0.0 (9)",
    ...over,
  };
}

describe("055 FR-031 — 보드 KO 원문", () => {
  it("SETTINGS_TEXT는 보드 표 그대로다", () => {
    expect(SETTINGS_TEXT).toMatchObject({
      title: "설정",
      back: "일기",
      groupCharacter: "캐릭터",
      name: "이름",
      groupDiary: "일기",
      autoWrite: "자동으로 쓰기",
      groupPerm: "권한 · 휴대폰 설정으로 이동",
      permPhotos: "사진",
      permLocation: "위치",
      permNotif: "알림",
      permBattery: "배터리",
      permBatteryHint: "배터리 사용 · 제한 없음으로 두면 제때 써요",
      permAllowed: "허용됨",
      permPartial: "일부 허용",
      permDenied: "허용 안 함",
      groupAbout: "정보",
      version: "버전",
      entryLabel: "설정",
      save: "저장",
      backToSettings: "설정",
      redownload: "모듈 다시 받기",
    });
  });

  it("화면에 묶음 머리·행 라벨이 원문 그대로 보인다", async () => {
    await render(<SettingsScreen {...props()} />);
    for (const text of [
      "캐릭터",
      "이름",
      "자동으로 쓰기",
      "권한 · 휴대폰 설정으로 이동",
      "사진",
      "위치",
      "알림",
      "배터리",
      "배터리 사용 · 제한 없음으로 두면 제때 써요",
      "정보",
      "버전",
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    // 「일기」 묶음 머리
    expect(screen.getByTestId("settings-group-diary-label")).toHaveTextContent("일기");
  });

  it("★ S1·SC-006 — 말투·캐릭터 목록·온보딩 다시 하기·이 휴대폰이 없다", async () => {
    await render(<SettingsScreen {...props()} />);
    for (const absent of [/말투/, /온보딩/, /권한 안내/, /이 휴대폰/, /받기/, /일기 모두 지우기/]) {
      expect(screen.queryByText(absent)).toBeNull();
    }
  });
});

describe("055 F3·F5 — 묶음", () => {
  it("F5 — 캐릭터 → 일기 → 권한 → 정보 순서", async () => {
    await render(<SettingsScreen {...props()} />);
    const ids = screen
      .getAllByTestId(/^settings-group-[a-z]+$/)
      .map((n) => n.props.testID as string);
    expect(ids).toEqual([
      "settings-group-character",
      "settings-group-diary",
      "settings-group-perm",
      "settings-group-about",
    ]);
  });

  it("F3 — 묶음 머리 11/600·자간 .1em·대문자·accent, 위 14(첫 묶음 0)·아래 6", async () => {
    await render(<SettingsScreen {...props()} />);
    const first = flat(screen.getByTestId("settings-group-character-label"));
    const next = flat(screen.getByTestId("settings-group-diary-label"));
    for (const style of [first, next]) {
      expect(style.fontSize).toBe(11);
      expect(style.fontWeight).toBe("600");
      expect(style.letterSpacing).toBeCloseTo(1.1, 5);
      expect(style.textTransform).toBe("uppercase");
      expect(style.color).toBe(COLORS.accent);
      expect(style.marginBottom).toBe(6);
    }
    expect(first.marginTop).toBe(0);
    expect(next.marginTop).toBe(14);
  });
});

describe("055 F4·C1 — 행과 이름", () => {
  it("F4 — 행 최소 44(보조 줄 56), 아래 1px 구분선, 간격 12, 줄 바꿈 허용", async () => {
    await render(<SettingsScreen {...props()} />);
    const name = flat(screen.getByTestId("settings-name"));
    expect(name.minHeight).toBe(44);
    expect(name.borderBottomWidth).toBe(1);
    expect(name.borderBottomColor).toBe(COLORS.border);
    expect(name.gap).toBe(12);
    expect(name.flexWrap).toBe("wrap");
    expect(flat(screen.getByTestId("settings-perm-battery")).minHeight).toBe(56);
  });

  it("F4 — 라벨 15/600 본문색, 값 15 보조색 고정폭 숫자, › 18 neutral-500, 보조 줄 12·줄높이 1.35", async () => {
    await render(<SettingsScreen {...props()} />);
    const label = flat(screen.getByText("이름"));
    expect(label).toMatchObject({ fontSize: 15, fontWeight: "600", color: COLORS.text });
    const value = flat(screen.getByText("1.0.0 (9)"));
    expect(value).toMatchObject({ fontSize: 15, color: COLORS.textMuted });
    expect(value.fontVariant).toEqual(["tabular-nums"]);
    const chevron = flat(screen.getAllByTestId("settings-chevron")[0]);
    expect(chevron).toMatchObject({ fontSize: 18, color: SETTINGS.chevron });
    const hint = flat(screen.getByText(SETTINGS_TEXT.permBatteryHint));
    expect(hint.fontSize).toBe(12);
    expect(hint.lineHeight).toBeCloseTo(16.2, 5);
    expect(hint.color).toBe(COLORS.textMuted);
  });

  it("C1 — 이름 행에 지금 이름과 ›, 누르면 onOpenRename", async () => {
    const p = props();
    await render(<SettingsScreen {...p} />);
    const name = screen.getByTestId("settings-name");
    expect(within(name).getByText("금동이")).toBeTruthy();
    expect(within(name).getByText("›")).toBeTruthy();
    await fireEvent.press(name);
    expect(p.onOpenRename).toHaveBeenCalledTimes(1);
  });
});

describe("055 C2·C3 — 자동으로 쓰기", () => {
  it("C2 — 켜짐: 스위치·checked, 44×26·안쪽 3, accent 면 + 오른쪽 20×20 바탕색 손잡이", async () => {
    await render(<SettingsScreen {...props({ autoWriteEnabled: true })} />);
    const toggle = screen.getByTestId("auto-diary-toggle");
    expect(toggle.props.accessibilityRole).toBe("switch");
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
    expect(flat(toggle)).toMatchObject({
      width: 44,
      height: 26,
      padding: 3,
      justifyContent: "flex-end",
      backgroundColor: COLORS.accent,
    });
    expect(flat(screen.getByTestId("auto-diary-toggle-knob"))).toMatchObject({
      width: 20,
      height: 20,
      backgroundColor: COLORS.bg,
    });
  });

  it("C2 — 꺼짐: 회색 면 + 왼쪽 손잡이, 누르면 onToggleAutoWrite(true)", async () => {
    const p = props({ autoWriteEnabled: false });
    await render(<SettingsScreen {...p} />);
    const toggle = screen.getByTestId("auto-diary-toggle");
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    expect(flat(toggle)).toMatchObject({
      justifyContent: "flex-start",
      backgroundColor: SETTINGS.tagFill,
    });
    await fireEvent.press(toggle);
    expect(p.onToggleAutoWrite).toHaveBeenCalledWith(true);
  });

  it("C3 — 토글 아래에 넘겨받은 시각 선택·장소명이 「일기」 묶음 안에 그대로 있다", async () => {
    await render(<SettingsScreen {...props({ diaryExtras: <Text>시각과 장소</Text> })} />);
    expect(
      within(screen.getByTestId("settings-group-diary")).getByText("시각과 장소"),
    ).toBeTruthy();
  });
});

describe("055 C4·C5·C6 — 권한 네 행", () => {
  it("C4·C5 — 허용됨: 회색 면 + 진한 회색 글자, 여백 3·8, 13/600", async () => {
    await render(<SettingsScreen {...props()} />);
    const tag = screen.getByTestId("settings-tag-photos");
    expect(tag).toHaveTextContent("허용됨");
    expect(flat(tag)).toMatchObject({
      backgroundColor: SETTINGS.tagFill,
      paddingVertical: 3,
      paddingHorizontal: 8,
    });
    expect(flat(within(tag).getByText("허용됨"))).toMatchObject({
      fontSize: 13,
      fontWeight: "600",
      color: SETTINGS.tagText,
    });
  });

  it("C5 — 허용 안 함: 1px accent 테두리 + accent-700 글자, 여백 2·7", async () => {
    await render(<SettingsScreen {...props()} />);
    const tag = screen.getByTestId("settings-tag-location");
    expect(tag).toHaveTextContent("허용 안 함");
    expect(flat(tag)).toMatchObject({
      borderWidth: 1,
      borderColor: COLORS.accent,
      paddingVertical: 2,
      paddingHorizontal: 7,
    });
    expect(flat(within(tag).getByText("허용 안 함")).color).toBe(COLORS.danger);
  });

  it("C5 — 일부 허용: 1px 회색 테두리 + 보조색 글자", async () => {
    await render(<SettingsScreen {...props()} />);
    const tag = screen.getByTestId("settings-tag-notifications");
    expect(tag).toHaveTextContent("일부 허용");
    expect(flat(tag)).toMatchObject({ borderWidth: 1, borderColor: COLORS.border });
    expect(flat(within(tag).getByText("일부 허용")).color).toBe(COLORS.textMuted);
  });

  it("★ C4 — 읽지 못한 행(unread)은 꼬리표를 그리지 않는다(원칙 V)", async () => {
    await render(
      <SettingsScreen
        {...props({
          permissionTags: { photos: "unread", location: "unread", notifications: "unread" },
        })}
      />,
    );
    for (const key of ["photos", "location", "notifications"]) {
      expect(screen.queryByTestId(`settings-tag-${key}`)).toBeNull();
    }
    expect(screen.queryByText(/허용/)).toBeNull();
  });

  it("C4 — 배터리는 꼬리표 없이 보조 줄과 › 만", async () => {
    await render(<SettingsScreen {...props()} />);
    const battery = screen.getByTestId("settings-perm-battery");
    expect(within(battery).queryByText(/허용/)).toBeNull();
    expect(within(battery).getByText(SETTINGS_TEXT.permBatteryHint)).toBeTruthy();
    expect(within(battery).getByText("›")).toBeTruthy();
  });

  it("★ C6 — 네 행 어느 것을 눌러도 onOpenAppSettings", async () => {
    const p = props();
    await render(<SettingsScreen {...p} />);
    for (const key of ["photos", "location", "notifications", "battery"]) {
      await fireEvent.press(screen.getByTestId(`settings-perm-${key}`));
    }
    expect(p.onOpenAppSettings).toHaveBeenCalledTimes(4);
  });
});

describe("055 C8 — 버전", () => {
  it("버전 값이 보이고 누름이 없다", async () => {
    await render(<SettingsScreen {...props()} />);
    const version = screen.getByTestId("settings-version");
    expect(within(version).getByText("1.0.0 (9)")).toBeTruthy();
    expect(version.props.accessibilityRole).toBeUndefined();
    expect(version.props.onClick).toBeUndefined();
  });

  it("읽지 못했으면 값이 비어 있다(지어내지 않는다)", async () => {
    await render(<SettingsScreen {...props({ versionText: null })} />);
    expect(screen.queryByText(/\d+\.\d+/)).toBeNull();
  });
});

describe("★ 055 C7 — 권한은 마운트 때와 전경 복귀 때 다시 읽는다", () => {
  function Probe({ read }: { read: () => Promise<PermissionFacts> }) {
    const tags = usePermissionTags(read);
    return <Text testID="probe">{`${tags.photos}/${tags.location}/${tags.notifications}`}</Text>;
  }

  it("마운트 때 1회, active로 돌아올 때 다시", async () => {
    let listener: ((s: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _e: string,
      fn: (s: AppStateStatus) => void,
    ) => {
      listener = fn;
      return { remove: () => {} };
    }) as never);

    const facts: PermissionFacts = {
      photos: "granted",
      photoLocation: "ok",
      location: "denied",
      notifications: "granted",
    };
    const read = jest.fn(async () => facts);
    await render(<Probe read={read} />);
    expect(await screen.findByText("allowed/denied/allowed")).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(1);

    facts.location = "granted";
    await act(async () => listener?.("background"));
    expect(read).toHaveBeenCalledTimes(1);
    await act(async () => listener?.("active"));
    expect(read).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("allowed/allowed/allowed")).toBeTruthy();
  });

  it("읽기 전·읽기 실패는 전부 unread다", async () => {
    await render(<Probe read={() => Promise.reject(new Error("x"))} />);
    expect(await screen.findByText("unread/unread/unread")).toBeTruthy();
  });
});

describe("055 F7 — 설정 화면은 로스터·expo에 닿지 않는다 (소스)", () => {
  it("SettingsScreen·SettingsFrame·StackLayer·RenameScreen에 금지 import가 없다", () => {
    for (const file of ["SettingsScreen.tsx", "SettingsFrame.tsx", "StackLayer.tsx"]) {
      const code = readFileSync(join(__dirname, "../../src/ui", file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(code).not.toMatch(/models\/roster|ModelAsset|ESSENTIAL_ASSET_KEYS|from "expo-/);
    }
  });
});

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
    batteryHint: "배터리 사용 · 제한 없음으로 두면 제때 써요",
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

  it("056 TX1 — 매일 쓰는 시각·장소 이름 문구가 보드 표(지도 고지는 056 FR-026) 그대로다", () => {
    expect(SETTINGS_TEXT).toMatchObject({
      autoWriteTime: "매일 쓰는 시각",
      placeNames: "장소 이름으로 보기",
      timeTitle: "매일 쓰는 시각",
      timeAm: "오전",
      timePm: "오후",
      timeCancel: "취소",
      placeTitle: "장소 이름으로 보기",
      placeAuto: "자동",
      placeAutoDesc: "위치 권한이 있으면 이름으로, 없으면 비워 둬요",
      placeOn: "켬",
      placeOnDesc: "다닌 자리를 숫자 대신 이름으로 보여줘요",
      placeOff: "끔",
      placeOffDesc: "장소 이름을 옮기지 않아요",
      placeCancel: "취소",
      placeNotice: "좌표를 기기의 지도 서비스에 물어봐요.",
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

  // 058 — 「이 휴대폰」(§3.4)이 생겼다. 그 묶음의 자리·내용은 `settings-this-phone.test.tsx`가 잠근다.
  it("★ S1·SC-006 — 말투·캐릭터 목록·온보딩 다시 하기가 없다", async () => {
    await render(<SettingsScreen {...props()} />);
    for (const absent of [/말투/, /온보딩/, /권한 안내/, /받기/]) {
      expect(screen.queryByText(absent)).toBeNull();
    }
  });
});

describe("055 F3·F5 — 묶음", () => {
  it("F5 — 캐릭터 → 일기 → 권한 → 이 휴대폰(058) → 정보 순서", async () => {
    await render(<SettingsScreen {...props()} />);
    const ids = screen
      .getAllByTestId(/^settings-group-[a-z]+$/)
      .map((n) => n.props.testID as string);
    expect(ids).toEqual([
      "settings-group-character",
      "settings-group-diary",
      "settings-group-perm",
      "settings-group-device",
      "settings-group-about",
    ]);
  });

  it("F3 — 묶음 머리 11/600·자간 .1em·대문자·accent, 위 14(첫 묶음 0)·아래 6", async () => {
    await render(<SettingsScreen {...props()} />);
    const first = flat(screen.getByTestId("settings-group-character-head"));
    const next = flat(screen.getByTestId("settings-group-diary-head"));
    for (const id of ["settings-group-character-label", "settings-group-diary-label"]) {
      const style = flat(screen.getByTestId(id));
      expect(style.fontSize).toBe(11);
      expect(style.fontWeight).toBe("600");
      expect(style.letterSpacing).toBeCloseTo(1.1, 5);
      expect(style.textTransform).toBe("uppercase");
      expect(style.color).toBe(COLORS.accent);
    }
    // 묶음 머리 줄이 위·아래 여백을 가진다(오른쪽 `aside`와 한 줄을 이루므로 줄이 갖는다)
    expect(first.marginBottom).toBe(6);
    expect(next.marginBottom).toBe(6);
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

  it("F4 — 줄 바꿈을 허용한 행도 내용이 행 높이의 가운데에 선다(alignContent center, 보드 `align-items:center`)", async () => {
    // 2026-10-06 실기기 — `flexWrap`이 있으면 Yoga가 줄 묶음을 `alignContent`(RN 기본 flex-start)로 놓는다.
    // 그래서 `alignItems: "center"`는 줄 안에서만 가운데이고 줄 자체가 행 위쪽에 붙어 여분이 모두 구분선 위(아래쪽)로 갔다.
    await render(<SettingsScreen {...props()} />);
    for (const id of ["settings-name", "settings-perm-battery"]) {
      const row = flat(screen.getByTestId(id));
      expect(row.alignItems).toBe("center");
      expect(row.alignContent).toBe("center");
    }
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

  it("★ 056 SR6 — 꺼짐 손잡이는 진한 색(knobOff), 켜짐 손잡이는 바탕색 (FR-029)", async () => {
    await render(<SettingsScreen {...props({ autoWriteEnabled: false })} />);
    expect(flat(screen.getByTestId("auto-diary-toggle-knob")).backgroundColor).toBe(
      SETTINGS.toggle.knobOff,
    );
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
});

describe("056 SR — 매일 쓰는 시각·장소 이름 행", () => {
  it("SR1 — 켜짐이면 시각 행이 보이고 값은 넘겨받은 문자열 + ›", async () => {
    await render(<SettingsScreen {...props({ autoWriteEnabled: true })} />);
    const row = screen.getByTestId("settings-target-hour");
    expect(within(row).getByText(SETTINGS_TEXT.autoWriteTime)).toBeTruthy();
    expect(within(row).getByText("오후 10시쯤")).toBeTruthy();
    expect(within(row).getByText("›")).toBeTruthy();
  });

  it("★ SR1 — 꺼짐이면 시각 행이 접혀 누를 수 없고 스크린리더에서 숨는다 (FR-002)", async () => {
    await render(<SettingsScreen {...props({ autoWriteEnabled: false })} />);
    expect(screen.queryByTestId("settings-target-hour")).toBeNull();
    const wrap = screen.getByTestId("settings-target-hour-wrap", { includeHiddenElements: true });
    expect(wrap.props.pointerEvents).toBe("none");
    expect(wrap.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(wrap.props.accessibilityElementsHidden).toBe(true);
  });

  it("SR2 — 끄고 다시 켜도 같은 값이다 (FR-003)", async () => {
    const p = props({ autoWriteEnabled: true, targetHourText: "오전 7시쯤" });
    await render(<SettingsScreen {...p} />);
    await screen.rerender(<SettingsScreen {...p} autoWriteEnabled={false} />);
    await screen.rerender(<SettingsScreen {...p} autoWriteEnabled />);
    expect(within(screen.getByTestId("settings-target-hour")).getByText("오전 7시쯤")).toBeTruthy();
  });

  it.each([true, false])("SR3 — 토글이 %s여도 장소 이름 행이 있다", async (enabled) => {
    await render(
      <SettingsScreen {...props({ autoWriteEnabled: enabled, placeNamesText: "끔" })} />,
    );
    const row = screen.getByTestId("settings-place-names");
    expect(within(row).getByText(SETTINGS_TEXT.placeNames)).toBeTruthy();
    expect(within(row).getByText("끔")).toBeTruthy();
    expect(within(row).getByText("›")).toBeTruthy();
  });

  it("SR4 — 시각 행 → onOpenTargetHour, 장소 행 → onOpenPlaceNames", async () => {
    const p = props();
    await render(<SettingsScreen {...p} />);
    await fireEvent.press(screen.getByTestId("settings-target-hour"));
    expect(p.onOpenTargetHour).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("settings-place-names"));
    expect(p.onOpenPlaceNames).toHaveBeenCalledTimes(1);
  });

  it("SR5 — 「일기」 묶음: 자동으로 쓰기 → 매일 쓰는 시각 → 장소 이름으로 보기", async () => {
    await render(<SettingsScreen {...props()} />);
    const group = screen.getByTestId("settings-group-diary");
    const labels = within(group)
      .getAllByText(
        new RegExp(
          `^(${SETTINGS_TEXT.autoWrite}|${SETTINGS_TEXT.autoWriteTime}|${SETTINGS_TEXT.placeNames})$`,
        ),
      )
      .map((node) => node.props.children);
    expect(labels).toEqual([
      SETTINGS_TEXT.autoWrite,
      SETTINGS_TEXT.autoWriteTime,
      SETTINGS_TEXT.placeNames,
    ]);
  });

  it("SR5 — 임시 자리(diaryExtras)가 없다 (소스)", () => {
    const source = readFileSync(join(__dirname, "../../src/ui/SettingsScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/diaryExtras/);
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

describe("057 SL2·SL4 — 사진 권한 건너뜀 보조 줄 (보드 `6g`)", () => {
  it("SL4 — 문구가 보드 표 원문 그대로다", () => {
    expect(SETTINGS_TEXT).toMatchObject({
      photoSkippedYesterday: "어제 자동 쓰기를 건너뛰었어요",
      photoSkippedOn: "{M}월 {d}일 자동 쓰기를 건너뛰었어요",
    });
  });

  it("SL2 — photoSkipText를 주면 사진 행 라벨 아래에 빨간 보조 줄(12·1.35), 행 56", async () => {
    await render(
      <SettingsScreen
        {...props({
          permissionTags: { photos: "denied", location: "allowed", notifications: "allowed" },
          photoSkipText: "어제 자동 쓰기를 건너뛰었어요",
        })}
      />,
    );
    const photos = screen.getByTestId("settings-perm-photos");
    const line = within(photos).getByText("어제 자동 쓰기를 건너뛰었어요");
    const style = flat(line);
    expect(style.color).toBe(COLORS.danger);
    expect(style.fontSize).toBe(12);
    expect(style.lineHeight).toBeCloseTo(16.2, 5);
    expect(flat(photos).minHeight).toBe(56);
    expect(within(photos).getByTestId("settings-tag-photos")).toBeTruthy();
  });

  it("SL2 — 주지 않으면 055 그대로 (보조 줄 없음, 행 44)", async () => {
    await render(<SettingsScreen {...props()} />);
    const photos = screen.getByTestId("settings-perm-photos");
    expect(within(photos).queryByText(/자동 쓰기를 건너뛰었어요/)).toBeNull();
    expect(flat(photos).minHeight).toBe(44);
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
    // 058 — 「쓰는 모듈」 값(「2.0GB」)도 숫자라 버전 행 안에서만 본다.
    expect(within(screen.getByTestId("settings-version")).queryByText(/\d+\.\d+/)).toBeNull();
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

describe("059 DV1~DV3 — 버전 탭과 「개발자」 행", () => {
  it("DV1 — onPressVersion 이 있으면 버전 행을 누를 수 있다", async () => {
    const onPressVersion = jest.fn();
    await render(<SettingsScreen {...props({ onPressVersion })} />);
    await fireEvent.press(screen.getByTestId("settings-version"));
    expect(onPressVersion).toHaveBeenCalledTimes(1);
  });

  it("DV1 — 꺼져 있으면 「개발자」 행이 없고, 켜져 있으면 「정보」 묶음 맨 아래에 있다", async () => {
    const { rerender } = await render(<SettingsScreen {...props()} />);
    expect(screen.queryByTestId("settings-developer")).toBeNull();
    await rerender(<SettingsScreen {...props({ developerEnabled: true })} />);
    const group = screen.getByTestId("settings-group-about");
    const labels = within(group).getAllByText(/버전|개발자/);
    expect(labels.map((n) => n.props.children)).toEqual(["버전", "개발자"]);
    expect(
      within(screen.getByTestId("settings-developer")).getByTestId("settings-chevron"),
    ).toBeTruthy();
  });

  it("DV2 — developerHighlight 가 참이면 행 바탕이 rowHighlight(보드 accent-100), 아니면 바탕이 없다", async () => {
    const { rerender } = await render(
      <SettingsScreen {...props({ developerEnabled: true, developerHighlight: true })} />,
    );
    expect(flat(screen.getByTestId("settings-developer")).backgroundColor).toBe(
      SETTINGS.rowHighlight,
    );
    await rerender(<SettingsScreen {...props({ developerEnabled: true })} />);
    expect(flat(screen.getByTestId("settings-developer")).backgroundColor).toBeUndefined();
  });

  it("DV3 — 「개발자」 행을 누르면 onOpenDeveloper", async () => {
    const onOpenDeveloper = jest.fn();
    await render(<SettingsScreen {...props({ developerEnabled: true, onOpenDeveloper })} />);
    await fireEvent.press(screen.getByTestId("settings-developer"));
    expect(onOpenDeveloper).toHaveBeenCalledTimes(1);
  });
});

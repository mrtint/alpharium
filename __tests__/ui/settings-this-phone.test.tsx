/**
 * 058 — 설정 「이 휴대폰」 묶음과 일기 모두 지우기 확인 (보드 `6c` ⑥, `2d` 틀).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md TX1~TX3·UI1~UI5·MS3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 보드 원문을 글자 단위로 잠근다(C4, 047 교훈). 화면은 판정하지 않는다 — 편수·용량 문자열·비활성 여부를 넘겨받은 그대로 그리는지만
 * 본다. 판정과 지우기 순서는 `__tests__/app/wipe-diaries.test.ts`·`module-size.test.ts`가 잠근다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { BackHandler, StyleSheet } from "react-native";

import { SettingsScreen, type SettingsScreenProps } from "../../src/ui/SettingsScreen";
import { SETTINGS_TEXT, wipeTitle } from "../../src/ui/settings-text";
import { COLORS } from "../../src/ui/theme/tokens";
import { WipeConfirmDialog } from "../../src/ui/WipeConfirmDialog";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const flat = (node: { props: { style?: unknown } }): Record<string, unknown> =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

function props(over: Partial<SettingsScreenProps> = {}): SettingsScreenProps {
  return {
    characterName: "금동이",
    onOpenRename: jest.fn(),
    autoWriteEnabled: true,
    onToggleAutoWrite: jest.fn(),
    permissionTags: { photos: "allowed", location: "allowed", notifications: "allowed" },
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

type BackListener = () => boolean | null | undefined;

function captureBackHandlers(): BackListener[] {
  const handlers: BackListener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    if (event === "hardwareBackPress") handlers.push(handler as BackListener);
    return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
  });
  return handlers;
}

function pressBack(handlers: BackListener[]): boolean {
  for (const handler of [...handlers].reverse()) {
    if (handler() === true) return true;
  }
  return false;
}

describe("TX — 보드 KO 원문", () => {
  it("TX1 — 묶음·행·대화상자 문구가 보드 표 그대로다", () => {
    expect(SETTINGS_TEXT).toMatchObject({
      groupDevice: "이 휴대폰",
      deviceModules: "쓰는 모듈",
      deviceWipe: "일기 모두 지우기",
      wipeBody: "되돌릴 수 없어요. 이름과 설정은 남아요.",
      wipeConfirm: "지우기",
      wipeCancel: "취소",
    });
  });

  it("TX2 — 보드 밖 문구(잠금에 막힘)는 해요체 한 줄이다", () => {
    expect(SETTINGS_TEXT.wipeBlocked).toBe("지금 자동으로 쓰는 중이라 지우지 못했어요.");
  });

  it("TX3 — 제목은 편수를 그대로 넣는다(천 단위 구분 없음)", () => {
    expect(wipeTitle(41)).toBe("일기 41편을 모두 지울까요?");
    expect(wipeTitle(1)).toBe("일기 1편을 모두 지울까요?");
    expect(wipeTitle(1200)).toBe("일기 1200편을 모두 지울까요?");
  });
});

describe("UI1 — 묶음 자리와 행 순서", () => {
  it("「이 휴대폰」은 「권한」 다음, 「정보」 앞이다", async () => {
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
    expect(screen.getByTestId("settings-group-device-label")).toHaveTextContent("이 휴대폰");
  });

  it("행은 「쓰는 모듈」 → 「일기 모두 지우기」 순서다", async () => {
    await render(<SettingsScreen {...props()} />);
    const group = screen.getByTestId("settings-group-device");
    const ids = within(group)
      .getAllByTestId(/^settings-(device-modules|wipe)$/)
      .map((n) => n.props.testID as string);
    expect(ids).toEqual(["settings-device-modules", "settings-wipe"]);
    expect(within(group).getByText("쓰는 모듈")).toBeTruthy();
    expect(within(group).getByText("일기 모두 지우기")).toBeTruthy();
  });
});

describe("UI2·MS3 — 「쓰는 모듈」", () => {
  it("값은 넘겨받은 문자열이고, 누를 수 없고 ›가 없다", async () => {
    await render(<SettingsScreen {...props({ moduleSizeText: "2.0GB" })} />);
    const row = screen.getByTestId("settings-device-modules");
    expect(within(row).getByText("2.0GB")).toBeTruthy();
    expect(row.props.accessibilityRole).not.toBe("button");
    expect(within(row).queryByTestId("settings-chevron")).toBeNull();
  });

  it("못 읽었으면(null) 값을 비운다 — 0이나 단위를 그리지 않는다", async () => {
    await render(<SettingsScreen {...props({ moduleSizeText: null })} />);
    const row = screen.getByTestId("settings-device-modules");
    expect(within(row).queryByText(/GB|MB|0/)).toBeNull();
  });

  it("MS3 — src/ui/ 어느 파일도 app/module-size를 import하지 않는다", () => {
    const root = join(__dirname, "../../src/ui");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(name)) files.push(p);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(code).not.toMatch(/app\/module-size/);
    }
  });
});

describe("UI3·UI4 — 「일기 모두 지우기」", () => {
  it("켜져 있으면 라벨이 danger이고 누르면 onOpenWipe", async () => {
    const onOpenWipe = jest.fn();
    await render(<SettingsScreen {...props({ wipeEnabled: true, onOpenWipe })} />);
    const label = screen.getByText("일기 모두 지우기");
    expect(flat(label).color).toBe(COLORS.danger);
    await fireEvent.press(screen.getByTestId("settings-wipe"));
    expect(onOpenWipe).toHaveBeenCalledTimes(1);
  });

  it("꺼져 있으면 라벨이 textMuted, disabled로 알리고 눌러도 아무 일 없다", async () => {
    const onOpenWipe = jest.fn();
    await render(<SettingsScreen {...props({ wipeEnabled: false, onOpenWipe })} />);
    const row = screen.getByTestId("settings-wipe");
    expect(flat(screen.getByText("일기 모두 지우기")).color).toBe(COLORS.textMuted);
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(row.props.accessibilityRole).not.toBe("button");
    await fireEvent.press(row);
    expect(onOpenWipe).not.toHaveBeenCalled();
  });

  it("UI4 — 막힘 줄이 있으면 지우기 행 안에 danger로 그린다", async () => {
    await render(<SettingsScreen {...props({ wipeBlockedText: SETTINGS_TEXT.wipeBlocked })} />);
    const row = screen.getByTestId("settings-wipe");
    const line = within(row).getByText("지금 자동으로 쓰는 중이라 지우지 못했어요.");
    expect(flat(line).color).toBe(COLORS.danger);
  });

  it("막힘 줄이 없으면 그리지 않는다", async () => {
    await render(<SettingsScreen {...props()} />);
    expect(screen.queryByText(/지우지 못했어요/)).toBeNull();
  });
});

describe("UI5 — 확인 대화상자", () => {
  it("제목·설명·버튼이 원문이고 「지우기」는 danger 면이다", async () => {
    captureBackHandlers();
    await renderWithPortal(
      <WipeConfirmDialog count={41} onCancel={() => {}} onConfirm={() => {}} />,
    );
    expect(screen.getByText("일기 41편을 모두 지울까요?")).toBeTruthy();
    expect(screen.getByText("되돌릴 수 없어요. 이름과 설정은 남아요.")).toBeTruthy();
    expect(flat(screen.getByTestId("wipe-confirm")).backgroundColor).toBe(COLORS.danger);
    expect(flat(screen.getByText("지우기")).color).toBe(COLORS.dangerForeground);
    expect(screen.getByText("취소")).toBeTruthy();
  });

  it("「지우기」는 onConfirm, 「취소」는 onCancel", async () => {
    captureBackHandlers();
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    await renderWithPortal(
      <WipeConfirmDialog count={3} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    await fireEvent.press(screen.getByTestId("wipe-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("wipe-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("뒤로 가기는 취소이고, 덮개를 눌러도 아무것도 불리지 않는다", async () => {
    const handlers = captureBackHandlers();
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    await renderWithPortal(
      <WipeConfirmDialog count={3} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    await fireEvent.press(screen.getByTestId("wipe-dialog-overlay"));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    let consumed = false;
    await act(async () => {
      consumed = pressBack(handlers);
    });
    expect(consumed).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

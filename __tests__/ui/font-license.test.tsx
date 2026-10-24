/**
 * 083 — 서체 라이선스 행과 화면 (contracts/font-license-screen.md L1~L6).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OFL 1.1은 서체를 배포할 때 저작권 고지와 라이선스 전문을 함께 두라고 요구한다 — 고지를 빠뜨리면 라이선스가 효력을 잃는다.
 * 설정 「정보」 → 「서체 라이선스」 → 전문. `App.tsx`의 겹 배선(L5)은 테스트에서 렌더되지 않으므로 소스를 읽어 잠근다(055·059 선례).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { ko } from "../../src/i18n/catalogs/ko";
import { FontLicenseScreen } from "../../src/ui/FontLicenseScreen";
import { PRETENDARD_LICENSE_NAME, PRETENDARD_LICENSE_TEXT } from "../../src/ui/pretendard-license";
import { SettingsScreen, type SettingsScreenProps } from "../../src/ui/SettingsScreen";
import { FONT } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const ROOT = join(__dirname, "..", "..");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const APP_CODE = stripComments(readFileSync(join(ROOT, "App.tsx"), "utf8"));
const SCREEN_CODE = stripComments(readFileSync(join(ROOT, "src/ui/FontLicenseScreen.tsx"), "utf8"));

function props(over: Partial<SettingsScreenProps> = {}): SettingsScreenProps {
  return {
    characterName: "금동이",
    onOpenRename: jest.fn(),
    autoWriteEnabled: true,
    onToggleAutoWrite: jest.fn(),
    permissionTags: {
      photos: "allowed",
      location: "denied",
      notifications: "partial",
      battery: "unread",
    },
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
    onOpenFontLicense: jest.fn(),
    ...over,
  };
}

describe("L6 — 문구는 카탈로그 fontLicense 영역에서 온다 (FR-014)", () => {
  it("row·title·intro 셋이 있다", () => {
    expect(ko.fontLicense).toEqual({
      row: "서체 라이선스",
      title: "서체 라이선스",
      intro:
        "이 앱의 글자는 Pretendard 서체로 그려요. 아래는 그 서체를 쓰도록 허락하는 라이선스 전문이에요.",
    });
  });
});

describe("L1 — 설정 「정보」 묶음에 「서체 라이선스」 행이 있다 (FR-011)", () => {
  it("「정보」 묶음 안에 있고 라벨·› 가 있다", async () => {
    await render(<SettingsScreen {...props()} />);
    const group = screen.getByTestId("settings-group-about");
    const row = within(group).getByTestId("settings-font-license");
    expect(within(row).getByText("서체 라이선스")).toBeTruthy();
    expect(within(row).getByTestId("settings-chevron")).toBeTruthy();
  });

  it("순서는 버전 → 서체 라이선스 → 개발자이고, 개발자 메뉴가 꺼져 있어도 행이 있다", async () => {
    const { rerender } = await render(<SettingsScreen {...props({ developerEnabled: true })} />);
    const labels = within(screen.getByTestId("settings-group-about")).getAllByText(
      /^(버전|서체 라이선스|개발자)$/,
    );
    expect(labels.map((n) => n.props.children)).toEqual(["버전", "서체 라이선스", "개발자"]);
    await rerender(<SettingsScreen {...props({ developerEnabled: false })} />);
    expect(screen.getByTestId("settings-font-license")).toBeTruthy();
  });
});

describe("L2 — 행을 누르면 여는 콜백이 한 번 불린다 (FR-012)", () => {
  it("onOpenFontLicense 가 한 번", async () => {
    const onOpenFontLicense = jest.fn();
    await render(<SettingsScreen {...props({ onOpenFontLicense })} />);
    await fireEvent.press(screen.getByTestId("settings-font-license"));
    expect(onOpenFontLicense).toHaveBeenCalledTimes(1);
  });

  it("콜백이 없으면 누를 수 없다(onPress 를 넘기지 않는다)", async () => {
    await render(<SettingsScreen {...props({ onOpenFontLicense: undefined })} />);
    expect(screen.getByTestId("settings-font-license").props.onPress).toBeUndefined();
    expect(screen.getByTestId("settings-font-license").props.accessibilityRole).toBeUndefined();
  });
});

describe("L3 — 화면이 서체 이름·라이선스 이름·전문을 그린다 (FR-013)", () => {
  it("intro·Pretendard·SIL Open Font License 1.1·전문", async () => {
    await render(<FontLicenseScreen />);
    expect(screen.getByTestId("font-license-screen")).toBeTruthy();
    expect(screen.getByText(ko.fontLicense.intro)).toBeTruthy();
    expect(screen.getByText(FONT.family)).toBeTruthy();
    expect(screen.getByText(PRETENDARD_LICENSE_NAME)).toBeTruthy();
  });

  it("전문은 font-license-text 한 글자 부품에 통째로 있다 — 자르거나 나누지 않는다", async () => {
    await render(<FontLicenseScreen />);
    const text = screen.getByTestId("font-license-text");
    expect(text.props.children).toBe(PRETENDARD_LICENSE_TEXT);
    expect(text.props.numberOfLines).toBeUndefined();
  });
});

describe("L4 — 지면 안 작은 스크롤 상자가 없다 (FR-015, 060)", () => {
  it("FontLicenseScreen 이 ScrollView·FlatList·numberOfLines 를 쓰지 않는다", () => {
    expect(SCREEN_CODE).not.toMatch(/\bScrollView\b|\bFlatList\b|\bnumberOfLines\b/);
  });
});

describe("L5 — 겹 배선 (FR-012, 055 S6) — App.tsx 소스 계약", () => {
  it("fontLicenseOpen 상태와 그것으로 여는 StackLayer 안의 SettingsFrame + FontLicenseScreen", () => {
    expect(APP_CODE).toMatch(/\[fontLicenseOpen, setFontLicenseOpen\] = useState\(false\)/);
    expect(APP_CODE).toMatch(
      /<StackLayer[^>]*open=\{fontLicenseOpen\}[^>]*>\s*<SettingsFrame[\s\S]*?<FontLicenseScreen \/>\s*<\/SettingsFrame>\s*<\/StackLayer>/,
    );
  });

  it("설정 겹은 서체 라이선스 겹이 열린 동안 뒤로 가기를 등록하지 않는다", () => {
    expect(APP_CODE).toMatch(/active=\{[^}]*!fontLicenseOpen[^}]*route !== "developer"[^}]*\}/);
  });

  it("뒤로 버튼은 「설정」, testID back-from-font-license", () => {
    const layer = APP_CODE.slice(APP_CODE.indexOf("open={fontLicenseOpen}"));
    expect(layer).toMatch(/backLabel=\{SETTINGS_TEXT\.backToSettings\}/);
    expect(layer).toMatch(/backTestID="back-from-font-license"/);
  });

  it("홈으로 갈 때와 알림으로 홈에 갈 때 서체 라이선스 겹도 닫는다", () => {
    const goHome = APP_CODE.slice(APP_CODE.indexOf("const goHome = useCallback"));
    expect(goHome.slice(0, goHome.indexOf("}, []"))).toMatch(/setFontLicenseOpen\(false\)/);
    const notified = APP_CODE.slice(APP_CODE.indexOf("notificationPort.onResponse("));
    expect(notified.slice(0, notified.indexOf("});"))).toMatch(/setFontLicenseOpen\(false\)/);
  });

  it("설정 행이 겹을 연다", () => {
    expect(APP_CODE).toMatch(/onOpenFontLicense=\{\(\) => setFontLicenseOpen\(true\)\}/);
  });
});

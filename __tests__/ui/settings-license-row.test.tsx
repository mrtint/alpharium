/**
 * 101 — 설정 「정보」의 「오픈소스 라이선스」 행 (specs/101-license-notice/contracts/license-row.md LR1~LR6).
 *
 * 고지는 앱 밖 페이지(`site/licenses/`)에 있고 이 행은 기기 브라우저로 그 페이지를 연다(086 방침·지원 행과 같은 방식).
 * 화면은 주소를 모르고 콜백만 받는다 — 주소와 여는 통로는 조립부(`App.tsx`)가 넘기며, 그 배선은 소스를 읽어 잠근다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { ko } from "../../src/i18n/catalogs/ko";
import { SettingsScreen, type SettingsScreenProps } from "../../src/ui/SettingsScreen";

jest.setTimeout(30000);

const ROOT = join(__dirname, "..", "..");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const APP_CODE = stripComments(readFileSync(join(ROOT, "App.tsx"), "utf8"));
const SCREEN_CODE = stripComments(readFileSync(join(ROOT, "src/ui/SettingsScreen.tsx"), "utf8"));
const LINKS_CODE = stripComments(readFileSync(join(ROOT, "src/app/policy-links.ts"), "utf8"));

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
    batteryHint: "배터리 사용 · 제한 없음으로 두면 제때 써요",
    versionText: "1.0.0 (9)",
    targetHourText: "오후 10시쯤",
    onOpenTargetHour: jest.fn(),
    placeNamesText: "자동",
    onOpenPlaceNames: jest.fn(),
    moduleSizeText: "2.0GB",
    wipeEnabled: true,
    onOpenWipe: jest.fn(),
    onOpenFontLicense: jest.fn(),
    onOpenPrivacy: jest.fn(),
    onOpenSupport: jest.fn(),
    onOpenLicenses: jest.fn(),
    ...over,
  };
}

/** 「정보」 묶음 안 행 testID를 그려진 순서대로 */
function aboutRowIds(): string[] {
  const group = screen.getByTestId("settings-group-about");
  return within(group)
    .queryAllByTestId(/^settings-(version|privacy|support|font-license|licenses|developer)$/)
    .map((n) => n.props.testID as string);
}

describe("101 LR — 「오픈소스 라이선스」 행", () => {
  it("LR1 — 순서는 버전 → 방침 → 지원 → 서체 라이선스 → 오픈소스 라이선스 → 개발자", async () => {
    await render(<SettingsScreen {...props({ developerEnabled: true })} />);
    expect(aboutRowIds()).toEqual([
      "settings-version",
      "settings-privacy",
      "settings-support",
      "settings-font-license",
      "settings-licenses",
      "settings-developer",
    ]);
  });

  it("LR1 — 개발자 메뉴가 꺼져 있어도 행은 서체 라이선스 다음에 있다", async () => {
    await render(<SettingsScreen {...props({ developerEnabled: false })} />);
    expect(aboutRowIds()).toEqual([
      "settings-version",
      "settings-privacy",
      "settings-support",
      "settings-font-license",
      "settings-licenses",
    ]);
  });

  it("LR2 — 라벨은 카탈로그 licenseLinks.row에서 오고 › 가 있다", async () => {
    await render(<SettingsScreen {...props()} />);
    const row = screen.getByTestId("settings-licenses");
    expect(ko.licenseLinks.row).toBe("오픈소스 라이선스");
    expect(within(row).getByText(ko.licenseLinks.row)).toBeTruthy();
    expect(within(row).getByTestId("settings-chevron")).toBeTruthy();
  });

  it("LR2 — 누르면 onOpenLicenses가 한 번 불리고, 콜백이 없으면 누를 수 없다", async () => {
    const onOpenLicenses = jest.fn();
    const { rerender } = await render(<SettingsScreen {...props({ onOpenLicenses })} />);
    await fireEvent.press(screen.getByTestId("settings-licenses"));
    expect(onOpenLicenses).toHaveBeenCalledTimes(1);

    const { onOpenLicenses: _omit, ...rest } = props();
    await rerender(<SettingsScreen {...rest} />);
    await fireEvent.press(screen.getByTestId("settings-licenses"));
    expect(onOpenLicenses).toHaveBeenCalledTimes(1);
  });

  it("LR4 — 실패 문구를 주면 그 행 아래 보조 줄로 보이고, 주지 않으면 없다", async () => {
    const failed = ko.policyLinks.openFailed("https://example.test/licenses/");
    const { rerender } = await render(
      <SettingsScreen {...props({ licensesFailedText: failed })} />,
    );
    expect(within(screen.getByTestId("settings-licenses")).getByText(failed)).toBeTruthy();
    expect(within(screen.getByTestId("settings-privacy")).queryByText(/열지 못했어요/)).toBeNull();
    await rerender(<SettingsScreen {...props()} />);
    expect(screen.queryByText(failed)).toBeNull();
  });

  it("LR5 — 기존 행의 문구는 그대로다", async () => {
    await render(<SettingsScreen {...props()} />);
    expect(
      within(screen.getByTestId("settings-privacy")).getByText("개인정보처리방침"),
    ).toBeTruthy();
    expect(within(screen.getByTestId("settings-support")).getByText("도움말·문의")).toBeTruthy();
    expect(
      within(screen.getByTestId("settings-font-license")).getByText("서체 라이선스"),
    ).toBeTruthy();
  });

  it("LR2 — 화면은 URL을 모른다(주소가 없고 policy-links를 import하지 않는다)", () => {
    expect(SCREEN_CODE).not.toMatch(/policy-links/);
    expect(SCREEN_CODE).not.toMatch(/https?:\/\//);
  });
});

describe("101 LR — App.tsx 배선과 주소 (소스 계약)", () => {
  it("LR3 — onOpenLicenses가 openInBrowser(LICENSES_URL) 결과로 실패 상태를 세우고 비운다", () => {
    expect(APP_CODE).toMatch(
      /import \{[^}]*\bLICENSES_URL\b[^}]*\} from "\.\/src\/app\/policy-links"/,
    );
    expect(APP_CODE).toMatch(/openInBrowser\(LICENSES_URL\)/);
    expect(APP_CODE).toMatch(/onOpenLicenses=\{/);
    expect(APP_CODE).toMatch(/setLicensesFailed\(!opened\)/);
    expect(APP_CODE).toMatch(/POLICY_LINKS_TEXT\.openFailed\(LICENSES_URL\)/);
  });

  it("LR3 — 086의 linkFailed 유니온은 그대로다(방침·지원 둘뿐)", () => {
    expect(APP_CODE).toMatch(/useState<"privacy" \| "support" \| null>\(null\)/);
  });

  it("LR6 — LICENSES_URL은 policy-links.ts에서만 정의되고 /로 끝나며 site/licenses/와 짝이다", () => {
    expect(LINKS_CODE).toMatch(
      /export const LICENSES_URL = "https:\/\/mrtint\.github\.io\/alpharium\/licenses\/";/,
    );
    expect(APP_CODE).not.toMatch(/mrtint\.github\.io/);
  });
});

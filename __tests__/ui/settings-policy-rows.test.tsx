/**
 * 086 — 설정 「정보」의 개인정보처리방침·도움말·문의 행 (contracts/settings-rows.md R1~R5, A1·A2, T1).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * App Store 5.1.1(i)은 방침 링크를 앱 안에도 요구한다. 화면은 URL을 모르고 콜백만 받는다 — 주소와 여는 통로는 조립부
 * (`App.tsx`)가 넘긴다. `App.tsx`는 테스트에서 렌더되지 않으므로 그 배선(A1·A2)은 소스를 읽어 잠근다(055·059·083 선례).
 * 브라우저가 실제로 열리는지는 실기기에서 본다(quickstart §3).
 * ─────────────────────────────────────────────────────────────────────────────
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
    ...over,
  };
}

/** 「정보」 묶음 안 행 testID를 그려진 순서대로 */
function aboutRowIds(): string[] {
  const group = screen.getByTestId("settings-group-about");
  return within(group)
    .queryAllByTestId(/^settings-(version|privacy|support|font-license|developer)$/)
    .map((n) => n.props.testID as string);
}

describe("086 T1 — 문구는 카탈로그 policyLinks 영역에서 온다 (FR-016)", () => {
  it("행 이름 둘과 실패 문구", () => {
    expect(ko.policyLinks.privacy).toBe("개인정보처리방침");
    expect(ko.policyLinks.support).toBe("도움말·문의");
    expect(ko.policyLinks.openFailed("https://example.test/x/")).toBe(
      "브라우저를 열지 못했어요 · https://example.test/x/",
    );
  });
});

describe("086 R — 「정보」 묶음의 두 행", () => {
  it("R1 — 순서는 버전 → 개인정보처리방침 → 도움말·문의 → 서체 라이선스 → 개발자", async () => {
    await render(<SettingsScreen {...props({ developerEnabled: true })} />);
    expect(aboutRowIds()).toEqual([
      "settings-version",
      "settings-privacy",
      "settings-support",
      "settings-font-license",
      "settings-developer",
    ]);
  });

  it("R1 — 개발자 메뉴가 꺼져 있어도 두 행은 버전과 서체 라이선스 사이에 있다", async () => {
    await render(<SettingsScreen {...props({ developerEnabled: false })} />);
    expect(aboutRowIds()).toEqual([
      "settings-version",
      "settings-privacy",
      "settings-support",
      "settings-font-license",
    ]);
  });

  it("R2 — 라벨과 › 가 있다", async () => {
    await render(<SettingsScreen {...props()} />);
    const privacy = screen.getByTestId("settings-privacy");
    const support = screen.getByTestId("settings-support");
    expect(within(privacy).getByText("개인정보처리방침")).toBeTruthy();
    expect(within(support).getByText("도움말·문의")).toBeTruthy();
    expect(within(privacy).getByTestId("settings-chevron")).toBeTruthy();
    expect(within(support).getByTestId("settings-chevron")).toBeTruthy();
  });

  it("R3 — 누르면 각 콜백이 한 번 불린다", async () => {
    const onOpenPrivacy = jest.fn();
    const onOpenSupport = jest.fn();
    await render(<SettingsScreen {...props({ onOpenPrivacy, onOpenSupport })} />);
    await fireEvent.press(screen.getByTestId("settings-privacy"));
    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
    expect(onOpenSupport).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("settings-support"));
    expect(onOpenSupport).toHaveBeenCalledTimes(1);
  });

  it("R4 — 실패 문구를 주면 그 행 아래 보조 줄로 보이고, 주지 않으면 없다", async () => {
    const failed = "브라우저를 열지 못했어요 · https://example.test/p/";
    const { rerender } = await render(<SettingsScreen {...props({ privacyFailedText: failed })} />);
    expect(within(screen.getByTestId("settings-privacy")).getByText(failed)).toBeTruthy();
    expect(within(screen.getByTestId("settings-support")).queryByText(/열지 못했어요/)).toBeNull();
    await rerender(<SettingsScreen {...props()} />);
    expect(screen.queryByText(failed)).toBeNull();
  });

  it("R4 — 문의 행도 같은 보조 줄을 받는다", async () => {
    const failed = "브라우저를 열지 못했어요 · https://example.test/s/";
    await render(<SettingsScreen {...props({ supportFailedText: failed })} />);
    expect(within(screen.getByTestId("settings-support")).getByText(failed)).toBeTruthy();
  });

  it("R5 — 화면은 URL을 모른다(policy-links를 import하지 않고 주소가 없다)", () => {
    expect(SCREEN_CODE).not.toMatch(/policy-links/);
    expect(SCREEN_CODE).not.toMatch(/https?:\/\//);
  });
});

describe("086 A — App.tsx 설정 조립부 배선 (소스 계약)", () => {
  it("A1 — 두 행에 openInBrowser(PRIVACY_URL)·openInBrowser(SUPPORT_URL)를 넘긴다", () => {
    expect(APP_CODE).toMatch(
      /import \{[^}]*\bPRIVACY_URL\b[^}]*\} from "\.\/src\/app\/policy-links"/,
    );
    expect(APP_CODE).toMatch(
      /import \{[^}]*\bopenInBrowser\b[^}]*\} from "\.\/src\/app\/browser-port"/,
    );
    // 두 행은 같은 여는 함수(openLink)를 지나 openInBrowser에 그 행의 주소를 넘긴다.
    expect(APP_CODE).toMatch(/onOpenPrivacy=\{\(\) => openLink\("privacy", PRIVACY_URL\)\}/);
    expect(APP_CODE).toMatch(/onOpenSupport=\{\(\) => openLink\("support", SUPPORT_URL\)\}/);
    const body = APP_CODE.slice(APP_CODE.indexOf("const openLink = "));
    expect(body.slice(0, 300)).toMatch(/openInBrowser\(url\)/);
    expect(APP_CODE).toMatch(/onOpenPrivacy=\{/);
    expect(APP_CODE).toMatch(/onOpenSupport=\{/);
  });

  it("A1 — 결과로 실패 줄을 세우고(false) 비운다(true)", () => {
    expect(APP_CODE).toMatch(/useState<"privacy" \| "support" \| null>\(null\)/);
    expect(APP_CODE).toMatch(/setLinkFailed\(opened \? null : (kind|"privacy"|"support")\)/);
  });

  it("A2 — 실패 문구는 카탈로그 policyLinks.openFailed로 만든다", () => {
    expect(APP_CODE).toMatch(/POLICY_LINKS_TEXT\.openFailed\(PRIVACY_URL\)/);
    expect(APP_CODE).toMatch(/POLICY_LINKS_TEXT\.openFailed\(SUPPORT_URL\)/);
  });
});

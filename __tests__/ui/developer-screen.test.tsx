/**
 * 059 — 개발자 화면의 내용 (보드 `6e`·`6j`, 계약 DV4~DV9·DG2·BD1·BD2).
 *
 * 화면은 판정하지 않는다 — 모듈 줄 문자열·환경(`showsDiagnostics`)·핸들러를 넘겨받은 그대로 그린다. 모듈 줄을 만드는 일은
 * `__tests__/app/module-lines.test.ts`, 환경별 머리글은 `developer-build-label.test.ts`가 잠근다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { DeveloperScreen, type DeveloperScreenProps } from "../../src/ui/DeveloperScreen";
import { DEVELOPER_TEXT } from "../../src/ui/developer-text";

jest.setTimeout(30000);

const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

function props(over: Partial<DeveloperScreenProps> = {}): DeveloperScreenProps {
  return {
    modules: { reading: "loaded · 482MB", writing: "loaded · 1.5GB" },
    showsDiagnostics: false,
    onRedownload: jest.fn(),
    onReplayOnboarding: jest.fn(),
    onDisable: jest.fn(),
    onOpenDiagnostics: jest.fn(),
    ...over,
  };
}

describe("DV4 — 구성", () => {
  it("모듈 두 줄·다시 받기·다시 보기·끄기가 있다", async () => {
    await render(<DeveloperScreen {...props()} />);
    expect(screen.getByTestId("developer-screen")).toBeTruthy();
    expect(screen.getByText(DEVELOPER_TEXT.groupModules)).toBeTruthy();
    const reading = screen.getByTestId("developer-module-reading");
    const writing = screen.getByTestId("developer-module-writing");
    expect(within(reading).getByText(DEVELOPER_TEXT.readModule)).toBeTruthy();
    expect(within(reading).getByText("loaded · 482MB")).toBeTruthy();
    expect(within(writing).getByText(DEVELOPER_TEXT.writeModule)).toBeTruthy();
    expect(within(writing).getByText("loaded · 1.5GB")).toBeTruthy();
    expect(
      within(screen.getByTestId("developer-redownload")).getByText("모듈 다시 받기"),
    ).toBeTruthy();
    expect(screen.getByText(DEVELOPER_TEXT.groupReplay)).toBeTruthy();
    expect(
      within(screen.getByTestId("developer-replay-onboarding")).getByText("온보딩부터 다시"),
    ).toBeTruthy();
    expect(within(screen.getByTestId("developer-off")).getByText("개발자 메뉴 끄기")).toBeTruthy();
  });

  it("읽지 못한 모듈 줄은 값이 빈다(지어내지 않는다)", async () => {
    await render(<DeveloperScreen {...props({ modules: { reading: null, writing: null } })} />);
    expect(
      within(screen.getByTestId("developer-module-reading")).queryByText(/loaded|MB|GB/),
    ).toBeNull();
    expect(
      within(screen.getByTestId("developer-module-writing")).queryByText(/loaded|MB|GB/),
    ).toBeNull();
  });
});

describe("DV5 — 진단 그룹은 개발 환경에서만", () => {
  it("배포 환경 props 에는 진단 그룹·행이 없다", async () => {
    await render(<DeveloperScreen {...props({ showsDiagnostics: false })} />);
    expect(screen.queryByTestId("developer-diagnostics")).toBeNull();
    expect(screen.queryByText(DEVELOPER_TEXT.devOnly)).toBeNull();
  });

  it("개발 환경 props 에는 「모듈」과 「다시 보기」 사이에 있고 「개발 빌드만」 표지가 보인다", async () => {
    await render(<DeveloperScreen {...props({ showsDiagnostics: true })} />);
    const row = screen.getByTestId("developer-diagnostics");
    expect(within(row).getByText(DEVELOPER_TEXT.diag)).toBeTruthy();
    // 보드 `6e`: 「개발 빌드만」은 행이 아니라 묶음 머리 오른쪽, 행에는 보조 줄이 있다
    expect(within(row).queryByText(DEVELOPER_TEXT.devOnly)).toBeNull();
    expect(
      within(screen.getByTestId("developer-group-diag")).getByText(DEVELOPER_TEXT.devOnly),
    ).toBeTruthy();
    expect(within(row).getByText(DEVELOPER_TEXT.diagSummary)).toBeTruthy();
    const order = screen
      .getAllByRole("header")
      .map((node) => node.props.children as string)
      .map((text) => text);
    expect(order).toEqual([
      DEVELOPER_TEXT.groupModules,
      DEVELOPER_TEXT.groupDiag,
      DEVELOPER_TEXT.groupReplay,
    ]);
  });
});

describe("DV7 — 핸들러 연결", () => {
  it("행을 누르면 각 핸들러가 불린다", async () => {
    const p = props({ showsDiagnostics: true });
    await render(<DeveloperScreen {...p} />);
    await fireEvent.press(screen.getByTestId("developer-redownload"));
    await fireEvent.press(screen.getByTestId("developer-replay-onboarding"));
    await fireEvent.press(screen.getByTestId("developer-off"));
    await fireEvent.press(screen.getByTestId("developer-diagnostics"));
    expect(p.onRedownload).toHaveBeenCalledTimes(1);
    expect(p.onReplayOnboarding).toHaveBeenCalledTimes(1);
    expect(p.onDisable).toHaveBeenCalledTimes(1);
    expect(p.onOpenDiagnostics).toHaveBeenCalledTimes(1);
  });

  it("핸들러가 없는 행은 누를 수 없다(onPress 도 안 넘긴다)", async () => {
    await render(
      <DeveloperScreen modules={{ reading: null, writing: null }} showsDiagnostics={false} />,
    );
    const row = screen.getByTestId("developer-redownload");
    expect(row.props.accessibilityRole).toBeUndefined();
  });
});

describe("DV9 — 모듈 줄 값은 고정폭 글꼴이다", () => {
  it("값 글자의 fontFamily 가 monospace 계열이다", async () => {
    await render(<DeveloperScreen {...props()} />);
    const value = within(screen.getByTestId("developer-module-reading")).getByText(
      "loaded · 482MB",
    );
    expect(String(flat(value).fontFamily)).toMatch(/mono|Menlo|Courier/i);
  });
});

describe("DG2·BD1·BD2·BD4 — 소스 계약", () => {
  const source = readFileSync(join(__dirname, "../../src/ui/DeveloperScreen.tsx"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("진단 화면·필수 자산 키·로스터·환경 변수를 import·참조하지 않는다", () => {
    expect(code).not.toMatch(/DiagnosticsScreen/);
    expect(code).not.toMatch(/ESSENTIAL_ASSET_KEYS/);
    expect(code).not.toMatch(/models\/roster|ModelAsset/);
    expect(code).not.toMatch(/process\.env|__DEV__/);
  });

  it("한글 문자열 리터럴이 없다 — 문구는 DEVELOPER_TEXT 에서 온다", () => {
    const literals = code.match(/["'`][^"'`\n]*[가-힣][^"'`\n]*["'`]/g) ?? [];
    expect(literals).toEqual([]);
  });
});

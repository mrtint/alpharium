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

/* ═══════════════════ 064 — 상태 흉내 묶음 (DV1·DV2) ═══════════════════ */

describe("064 DV1 — 상태 흉내 묶음", () => {
  const OFF_STATE = { date: null, failToast: false, noMaterial: false, noPhoto: false };
  const sim = (over: Partial<typeof OFF_STATE> = {}) => ({
    state: { ...OFF_STATE, ...over },
    onPressDate: jest.fn(),
    onToggle: jest.fn(),
  });

  it("simulation이 없으면(배포 환경) 묶음이 없다", async () => {
    await render(<DeveloperScreen {...props()} />);
    expect(screen.queryByTestId("developer-group-sim")).toBeNull();
  });

  it("보드 원문 네 행과 「개발 빌드만」, 진단 다음·다시 보기 앞", async () => {
    await render(<DeveloperScreen {...props({ showsDiagnostics: true, simulation: sim() })} />);
    const group = screen.getByTestId("developer-group-sim");
    expect(within(group).getByText("상태 흉내")).toBeTruthy();
    expect(within(group).getByText("개발 빌드만")).toBeTruthy();
    expect(within(screen.getByTestId("sim-date")).getByText("오늘 날짜")).toBeTruthy();
    expect(within(screen.getByTestId("sim-fail")).getByText("실패 토스트 보기")).toBeTruthy();
    expect(within(screen.getByTestId("sim-empty")).getByText("쓸 재료 0으로 보기")).toBeTruthy();
    expect(
      within(screen.getByTestId("sim-nophoto")).getByText("사진 권한 없음으로 보기"),
    ).toBeTruthy();
    // 묶음 머리 등 같은 testID가 여러 노드에 붙을 수 있다 — 처음 나온 순서만 본다
    const order = [
      ...new Set(
        screen
          .getAllByTestId(/^developer-group-(?:modules|diag|sim|replay|off)$/)
          .map((n) => (n.props as { testID: string }).testID),
      ),
    ];
    expect(order.indexOf("developer-group-sim")).toBe(order.indexOf("developer-group-diag") + 1);
    expect(order.indexOf("developer-group-replay")).toBe(order.indexOf("developer-group-sim") + 1);
  });

  it("토글을 누르면 그 키로 onToggle", async () => {
    const s = sim({ noMaterial: true });
    await render(<DeveloperScreen {...props({ simulation: s })} />);
    await fireEvent.press(screen.getByTestId("sim-fail-toggle"));
    await fireEvent.press(screen.getByTestId("sim-empty-toggle"));
    await fireEvent.press(screen.getByTestId("sim-nophoto-toggle"));
    expect(s.onToggle.mock.calls.map((c) => c[0])).toEqual(["failToast", "noMaterial", "noPhoto"]);
    expect(screen.getByTestId("sim-empty-toggle").props.accessibilityState).toEqual({
      checked: true,
    });
    expect(screen.getByTestId("sim-fail-toggle").props.accessibilityState).toEqual({
      checked: false,
    });
  });
});

describe("064 DV2 — 오늘 날짜 행", () => {
  it("켜졌으면 YYYY-MM-DD, 누르면 onPressDate", async () => {
    const onPressDate = jest.fn();
    await render(
      <DeveloperScreen
        {...props({
          simulation: {
            state: { date: "2026-09-13", failToast: false, noMaterial: false, noPhoto: false },
            onPressDate,
            onToggle: jest.fn(),
          },
        })}
      />,
    );
    expect(within(screen.getByTestId("sim-date")).getByText("2026-09-13")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("sim-date"));
    expect(onPressDate).toHaveBeenCalledTimes(1);
  });

  it("꺼졌으면 값이 비어 있다", async () => {
    await render(
      <DeveloperScreen
        {...props({
          simulation: {
            state: { date: null, failToast: false, noMaterial: false, noPhoto: false },
            onPressDate: jest.fn(),
            onToggle: jest.fn(),
          },
        })}
      />,
    );
    expect(within(screen.getByTestId("sim-date")).queryByText(/\d{4}-\d{2}-\d{2}/)).toBeNull();
  });
});

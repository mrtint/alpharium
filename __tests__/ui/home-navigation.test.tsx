/**
 * 화면 이동 구조 — 탭 줄 없이 홈 ↔ 설정 ↔ 개발자 (048 US4).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md H7, M6, N1~N5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `App.tsx`의 `AppFrame`은 첫 실행 게이트·권한·모델 통로를 한꺼번에 조립하므로 여기서 그리기엔
 * 무겁다. 그래서 **조립은 소스를 읽어 잠그고**(007 이후 관례), 하위 화면 껍데기는 직접 렌더한다.
 * 소스는 주석을 걷어낸 뒤 본다 — 주석은 무엇을 왜 금지하는지 적으므로 금지어가 정당하게 나온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler, Text } from "react-native";

import { SubScreenFrame } from "../../src/ui/SubScreenFrame";

jest.setTimeout(30000);

const app = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "")
  .replace(/\{\s*\}/g, "{}");

/** `function Name(` 로 시작하는 본문을 잘라낸다 — 다음 최상위 `function`까지 */
function functionBody(name: string): string {
  const start = app.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, next === -1 ? undefined : next);
}

describe("048 N2·N3 — SubScreenFrame", () => {
  it("N2 — 「← 일기」를 누르면 홈으로 돌아가라고 알린다", async () => {
    const onBack = jest.fn();
    await render(
      <SubScreenFrame onBack={onBack}>
        <Text>설정 내용</Text>
      </SubScreenFrame>,
    );

    expect(screen.getByText("설정 내용")).toBeTruthy();
    expect(screen.getByTestId("back-to-home")).toHaveTextContent("← 일기");
    await fireEvent.press(screen.getByTestId("back-to-home"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("★ N3 — 마운트된 동안만 안드로이드 뒤로 가기를 가로채 홈으로 보낸다", async () => {
    const remove = jest.fn();
    let handler: (() => boolean | null | undefined) | undefined;
    const spy = jest.spyOn(BackHandler, "addEventListener").mockImplementation(((
      event: string,
      fn: () => boolean,
    ) => {
      if (event === "hardwareBackPress") handler = fn;
      return { remove };
    }) as never);

    const onBack = jest.fn();
    const view = await render(
      <SubScreenFrame onBack={onBack}>
        <Text>개발자</Text>
      </SubScreenFrame>,
    );

    expect(handler).toBeDefined();
    expect(handler?.()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);

    await view.unmount();
    expect(remove).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("★ 048 — App.tsx 조립 (소스 검사)", () => {
  it("H7·N1 — 전역 탭 줄이 없고 화면 상태가 셋이다", () => {
    expect(app).toMatch(/useState<"home" \| "settings" \| "developer">/);
    expect(app).not.toContain("setTab(");
    expect(app).not.toContain("styles.tabs");
    expect(app).not.toMatch(/\btabOn\b|\btabOff\b/);
    expect(app).not.toContain('"characters"');
  });

  it("★ M6 — 개발자 메뉴 항목은 showsDiagnostics 조건 안에서만 만들어진다 (FR-003)", () => {
    const frame = functionBody("AppFrame");
    const idx = frame.indexOf('key: "developer"');
    expect(idx).toBeGreaterThanOrEqual(0);
    // 개발자 항목 바로 앞의 조건식이 showsDiagnostics다 — 무조건 넣지 않는다.
    const before = frame.slice(Math.max(0, idx - 120), idx);
    expect(before).toMatch(/showsDiagnostics\s*\?/);
    // 항목은 한 자리에서만 만들어진다.
    expect(frame.match(/key: "developer"/g)).toHaveLength(1);
  });

  it("N4 — 설정으로 가라는 안내와 알림 라우팅이 새 화면 상태를 쓴다", () => {
    expect(app).toMatch(/onGoToSettings=\{\(\) => setRoute\("settings"\)\}/);
    const frame = functionBody("AppFrame");
    const onResponse = frame.slice(frame.indexOf("onResponse("));
    expect(onResponse.slice(0, 400)).toContain('setRoute("home")');
  });

  it("★ N5 — 고른 날은 AppFrame이 들고 홈 화면까지 흘려보낸다 (Q4)", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/const \[chosenDay, setChosenDay\] = useState<DayDate \| null>\(null\)/);
    expect(frame).toMatch(/chosenDay=\{chosenDay\}/);

    const section = functionBody("DiarySection");
    expect(section).toMatch(/chosenDay=\{chosenDay\}/);
    expect(section).toMatch(/onChooseDay=\{onChooseDay\}/);
  });

  it("설정·개발자는 SubScreenFrame으로 감싸 「← 일기」로 돌아온다", () => {
    const frame = functionBody("AppFrame");
    expect(frame.match(/<SubScreenFrame onBack=\{goHome\}>/g)?.length).toBe(2);
  });

  it("신호 미리보기 통로가 홈 화면까지 온다 (US3)", () => {
    const section = functionBody("DiarySection");
    expect(section).toMatch(/previewDay=\{wiring\.ok \? wiring\.previewDay : undefined\}/);
  });
});

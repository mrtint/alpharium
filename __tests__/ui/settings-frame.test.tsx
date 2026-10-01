/**
 * 055 — 하위 화면 틀 `SettingsFrame` (보드 `6c` ①).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md F1·F2
 *
 * 보드 마크업의 인라인 스타일 값을 그대로 잠근다(047 교훈 — 「참조했다」는 「같다」가 아니다).
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { SettingsFrame } from "../../src/ui/SettingsFrame";
import { SETTINGS_TEXT } from "../../src/ui/settings-text";
import { COLORS, WRITTEN_DAY } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

async function renderFrame(onBack = jest.fn()) {
  await render(
    <SettingsFrame backLabel={SETTINGS_TEXT.back} onBack={onBack} title={SETTINGS_TEXT.title}>
      <Text>지면 내용</Text>
    </SettingsFrame>,
  );
  return onBack;
}

describe("055 F1 — 고정 머리", () => {
  it("「‹ 일기」: back-to-home, 최소 높이 44, ‹ 22, 「일기」 15/700", async () => {
    await renderFrame();
    const back = screen.getByTestId("back-to-home");
    expect(flat(back).minHeight).toBe(44);
    expect(screen.getByText("‹")).toBeTruthy();
    expect(flat(screen.getByText("‹")).fontSize).toBe(22);
    const label = flat(screen.getByText("일기"));
    expect(label.fontSize).toBe(15);
    expect(label.fontWeight).toBe("700");
    expect(back.props.accessibilityLabel).toBe("일기");
  });

  it("제목 「설정」: 44/800, 줄높이 44(#98), 자간 -0.04em, 아래 2px 본문색 선", async () => {
    await renderFrame();
    const title = screen.getByTestId("settings-title");
    expect(title).toHaveTextContent("설정");
    const style = flat(title);
    expect(style.fontSize).toBe(44);
    expect(style.fontWeight).toBe("800");
    expect(style.lineHeight).toBe(44);
    expect(style.letterSpacing).toBeCloseTo(-1.76, 5);
    const rule = flat(screen.getByTestId("settings-title-row"));
    expect(rule.borderBottomWidth).toBe(2);
    expect(rule.borderBottomColor).toBe(COLORS.text);
  });

  it("머리는 위 10(보드 56에서 상태 표시줄 46을 뺀 값)·좌우 20이고 지면 스크롤 밖에 있다", async () => {
    await renderFrame();
    const head = screen.getByTestId("settings-head");
    expect(flat(head).paddingTop).toBe(10);
    expect(flat(head).paddingHorizontal).toBe(20);
    const paper = screen.getByTestId("settings-paper");
    // 머리의 제목이 지면 안에 있지 않다
    expect(within(paper).queryByTestId("settings-title")).toBeNull();
    expect(within(screen.getByTestId("settings-head")).getByTestId("settings-title")).toBeTruthy();
  });

  it("「‹ 일기」를 누르면 onBack이 한 번 불린다", async () => {
    const onBack = await renderFrame();
    await fireEvent.press(screen.getByTestId("back-to-home"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("055 F2 — 회색 지면", () => {
  it("지면은 neutral-100이고 여백 14·20·40, 내용을 담는다", async () => {
    await renderFrame();
    const paper = screen.getByTestId("settings-paper");
    expect(flat(paper).backgroundColor).toBe(WRITTEN_DAY.paper);
    const content = StyleSheet.flatten(paper.props.contentContainerStyle) as Record<
      string,
      unknown
    >;
    expect(content.paddingTop).toBe(14);
    expect(content.paddingHorizontal).toBe(20);
    expect(content.paddingBottom).toBe(40);
    expect(screen.getByText("지면 내용")).toBeTruthy();
  });
});

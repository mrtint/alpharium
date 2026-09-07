/**
 * 032 — ListRow 계약 (contracts/ui-components.md UC3).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text, View } from "react-native";

import { ListRow } from "../../src/ui/components/ListRow";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/ListRow.tsx"), "utf8");

describe("UC3 — ListRow", () => {
  it("label·value를 렌더한다", async () => {
    await render(<ListRow label="사진" value="사진 3장" testID="r1" />);
    expect(screen.getByText("사진")).toBeTruthy();
    expect(screen.getByText("사진 3장")).toBeTruthy();
  });

  it("onPress가 있으면 누를 때 불린다", async () => {
    const onPress = jest.fn();
    await render(<ListRow label="설정" onPress={onPress} testID="r2" />);
    fireEvent.press(screen.getByTestId("r2"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("r2").props.accessibilityRole).toBe("button");
  });

  it("★ onPress가 없으면 View로 렌더된다 (button role 없음)", async () => {
    await render(<ListRow label="읽기전용" testID="r3" />);
    expect(screen.getByTestId("r3").props.accessibilityRole).toBeUndefined();
  });

  it("right 노드를 렌더한다", async () => {
    await render(<ListRow label="토글행" right={<Text>[스위치]</Text>} testID="r4" />);
    expect(screen.getByText("[스위치]")).toBeTruthy();
  });

  it("★ disabled면 눌러도 onPress가 불리지 않는다", async () => {
    const onPress = jest.fn();
    await render(<ListRow label="비활성" onPress={onPress} disabled testID="r5" />);
    fireEvent.press(screen.getByTestId("r5"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("chevron이 true면 › 가 보인다", async () => {
    await render(<ListRow label="이동" chevron onPress={() => {}} testID="r6" />);
    expect(screen.getByText("›")).toBeTruthy();
  });

  /*
   * 033 — `label`이 노드도 받는다 (data-model.md §2).
   *
   * `CharacterListScreen`의 행은 좌측이 이름·소개·상태·저장공간으로 세로로
   * 쌓이므로 문자열 하나에 안 담긴다. **위 여섯 케이스는 손대지 않았다** —
   * 순수 확장이라 문자열 경로가 그대로 돌아야 한다(spec SC-002).
   */
  it("★ 033 — label에 노드를 넘기면 그대로 렌더된다", async () => {
    await render(
      <ListRow
        label={
          <View>
            <Text>금동이</Text>
            <Text>조용히 씁니다</Text>
            <Text>쓸 수 있음</Text>
          </View>
        }
        testID="r7"
      />,
    );
    expect(screen.getByText("금동이")).toBeTruthy();
    expect(screen.getByText("조용히 씁니다")).toBeTruthy();
    expect(screen.getByText("쓸 수 있음")).toBeTruthy();
  });

  it("★ 033 — 노드 label에도 value·right가 함께 온다", async () => {
    await render(
      <ListRow
        label={<Text>왼쪽 노드</Text>}
        right={<Text>[버튼]</Text>}
        onPress={() => {}}
        testID="r8"
      />,
    );
    expect(screen.getByText("왼쪽 노드")).toBeTruthy();
    expect(screen.getByText("[버튼]")).toBeTruthy();
  });
});

describe("UC-C1·C3·C4 — 소스 경계", () => {
  it("★ 원시 hex 리터럴이 없다", () => {
    expect(SRC.replace(/\/\/.*$/gm, "")).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });
  it("★ useColorScheme·Appearance를 쓰지 않는다", () => {
    expect(SRC).not.toMatch(/\buseColorScheme\b/);
    expect(SRC).not.toMatch(/\bAppearance\./);
  });
  it("★ 도메인 계층을 import하지 않는다", () => {
    expect(SRC).not.toMatch(/from\s+["'][^"']*(diary|models|inference|signals|vision)\//);
  });
});

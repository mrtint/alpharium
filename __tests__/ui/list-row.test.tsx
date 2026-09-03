/**
 * 032 — ListRow 계약 (contracts/ui-components.md UC3).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";

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

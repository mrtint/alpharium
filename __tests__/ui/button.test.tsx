/**
 * 032 — Button 계약 (contracts/ui-components.md UC1).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react-native";

import { Button } from "../../src/ui/components/Button";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/Button.tsx"), "utf8");

describe("UC1 — Button", () => {
  it("3개 variant가 children을 렌더한다", async () => {
    await render(
      <>
        <Button variant="primary" onPress={() => {}} testID="b-p">
          주요
        </Button>
        <Button variant="secondary" onPress={() => {}} testID="b-s">
          보조
        </Button>
        <Button variant="danger" onPress={() => {}} testID="b-d">
          삭제
        </Button>
      </>,
    );
    expect(screen.getByText("주요")).toBeTruthy();
    expect(screen.getByText("보조")).toBeTruthy();
    expect(screen.getByText("삭제")).toBeTruthy();
  });

  it("variant 없이 쓰면 primary다", async () => {
    await render(
      <Button onPress={() => {}} testID="b-default">
        기본
      </Button>,
    );
    expect(screen.getByTestId("b-default")).toBeTruthy();
  });

  it("누르면 onPress가 불린다", async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} testID="b-press">
        누름
      </Button>,
    );
    fireEvent.press(screen.getByTestId("b-press"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("★ disabled면 눌러도 onPress가 불리지 않는다", async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} disabled testID="b-disabled">
        비활성
      </Button>,
    );
    fireEvent.press(screen.getByTestId("b-disabled"));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId("b-disabled").props.accessibilityState.disabled).toBe(true);
  });

  it("accessibilityRole이 button이다", async () => {
    await render(
      <Button onPress={() => {}} testID="b-role">
        역할
      </Button>,
    );
    expect(screen.getByTestId("b-role").props.accessibilityRole).toBe("button");
  });

  it("★ variant별로 다른 배경색이 style에 실린다", async () => {
    await render(
      <>
        <Button variant="primary" onPress={() => {}} testID="c-p">
          P
        </Button>
        <Button variant="danger" onPress={() => {}} testID="c-d">
          D
        </Button>
      </>,
    );
    const bg = (id: string) =>
      (screen.getByTestId(id).props.style as { backgroundColor?: string }).backgroundColor;
    expect(bg("c-p")).not.toBe(bg("c-d"));
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

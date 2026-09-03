/**
 * 032 — SelectRow 계약 (contracts/ui-components.md UC7).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react-native";

import { SelectRow } from "../../src/ui/components/SelectRow";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/SelectRow.tsx"), "utf8");

const OPTS = [{ label: "자동" }, { label: "켬" }, { label: "끔" }];

describe("UC7 — SelectRow", () => {
  it("label과 옵션들을 렌더한다", async () => {
    await render(
      <SelectRow
        label="장소 이름"
        options={OPTS}
        selectedIndex={0}
        onSelect={() => {}}
        testID="sr"
      />,
    );
    expect(screen.getByText("장소 이름")).toBeTruthy();
    expect(screen.getByTestId("sr-option-0")).toBeTruthy();
    expect(screen.getByTestId("sr-option-1")).toBeTruthy();
    expect(screen.getByTestId("sr-option-2")).toBeTruthy();
  });

  it("★ 선택된 옵션에 표식과 accessibilityState.selected가 있다", async () => {
    await render(
      <SelectRow label="l" options={OPTS} selectedIndex={1} onSelect={() => {}} testID="sr" />,
    );
    expect(screen.getByTestId("sr-option-1").props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId("sr-option-0").props.accessibilityState.selected).toBe(false);
    // 표식 텍스트 + accessibilityLabel 둘 다 (025 교훈)
    expect(screen.getByTestId("sr-option-1").props.accessibilityLabel).toMatch(/선택됨/);
  });

  it("옵션을 누르면 onSelect(index)가 불린다", async () => {
    const onSelect = jest.fn();
    await render(
      <SelectRow label="l" options={OPTS} selectedIndex={0} onSelect={onSelect} testID="sr" />,
    );
    fireEvent.press(screen.getByTestId("sr-option-2"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("★ disabledIndices의 옵션은 눌러도 무효다", async () => {
    const onSelect = jest.fn();
    await render(
      <SelectRow
        label="l"
        options={OPTS}
        selectedIndex={0}
        onSelect={onSelect}
        disabledIndices={[1]}
        testID="sr"
      />,
    );
    fireEvent.press(screen.getByTestId("sr-option-1"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId("sr-option-1").props.accessibilityState.disabled).toBe(true);
  });

  it("옵션 hint를 렌더한다", async () => {
    await render(
      <SelectRow
        label="l"
        options={[{ label: "켬", hint: "이름으로 보여준다" }]}
        selectedIndex={0}
        onSelect={() => {}}
        testID="sr"
      />,
    );
    expect(screen.getByText("이름으로 보여준다")).toBeTruthy();
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

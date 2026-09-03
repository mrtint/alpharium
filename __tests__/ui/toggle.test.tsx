/**
 * 032 — Toggle 계약 (contracts/ui-components.md UC6).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react-native";

import { Toggle } from "../../src/ui/components/Toggle";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/Toggle.tsx"), "utf8");

describe("UC6 — Toggle", () => {
  it("value가 스위치에 반영된다", async () => {
    await render(<Toggle value={true} onValueChange={() => {}} testID="tg1" />);
    expect(screen.getByTestId("tg1").props.value).toBe(true);
  });

  it("★ 토글하면 반대값으로 콜백이 불린다", async () => {
    const onValueChange = jest.fn();
    await render(<Toggle value={false} onValueChange={onValueChange} testID="tg2" />);
    fireEvent(screen.getByTestId("tg2"), "valueChange", true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("★ disabled면 스위치가 비활성이다", async () => {
    await render(<Toggle value={false} onValueChange={() => {}} disabled testID="tg3" />);
    expect(screen.getByTestId("tg3").props.disabled).toBe(true);
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

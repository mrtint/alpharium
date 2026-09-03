/**
 * 032 — SectionHeader 계약 (contracts/ui-components.md UC4).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";

import { SectionHeader } from "../../src/ui/components/SectionHeader";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/SectionHeader.tsx"), "utf8");

describe("UC4 — SectionHeader", () => {
  it("텍스트를 렌더한다", async () => {
    await render(<SectionHeader testID="sh1">일기 작성자</SectionHeader>);
    expect(screen.getByText("일기 작성자")).toBeTruthy();
    expect(screen.getByTestId("sh1")).toBeTruthy();
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

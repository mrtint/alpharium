/**
 * 032 — Card / Section 계약 (contracts/ui-components.md UC2).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { Card, Section } from "../../src/ui/components/Card";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/Card.tsx"), "utf8");

describe("UC2 — Card", () => {
  it("children을 렌더한다", async () => {
    await render(
      <Card testID="c1">
        <Text>안쪽</Text>
      </Card>,
    );
    expect(screen.getByTestId("c1")).toBeTruthy();
    expect(screen.getByText("안쪽")).toBeTruthy();
  });
});

describe("UC2 — Section", () => {
  it("title이 있으면 헤더로 렌더된다", async () => {
    await render(
      <Section title="권한" testID="s1">
        <Text>내용</Text>
      </Section>,
    );
    expect(screen.getByText("권한")).toBeTruthy();
    expect(screen.getByText("내용")).toBeTruthy();
    expect(screen.getByTestId("s1-title")).toBeTruthy();
  });

  it("★ title이 없으면 헤더가 없다", async () => {
    await render(
      <Section testID="s2">
        <Text>내용만</Text>
      </Section>,
    );
    expect(screen.getByText("내용만")).toBeTruthy();
    expect(screen.queryByTestId("s2-title")).toBeNull();
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

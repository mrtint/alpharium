/**
 * 032 — AppText 스타일 세트 계약 (contracts/ui-components.md UC5).
 *
 * ⚠️ RNTL 14 `render`는 Promise를 반환한다 — `await`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";

import { AppText, Title, Body, Caption } from "../../src/ui/components/Text";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/Text.tsx"), "utf8");

describe("UC5 — AppText", () => {
  it("4개 variant가 자식 텍스트를 렌더한다", async () => {
    await render(
      <>
        <AppText variant="title" testID="t-title">
          제목
        </AppText>
        <AppText variant="body" testID="t-body">
          본문
        </AppText>
        <AppText variant="bodyStrong" testID="t-strong">
          강조
        </AppText>
        <AppText variant="caption" testID="t-cap">
          캡션
        </AppText>
      </>,
    );
    expect(screen.getByText("제목")).toBeTruthy();
    expect(screen.getByText("본문")).toBeTruthy();
    expect(screen.getByText("강조")).toBeTruthy();
    expect(screen.getByText("캡션")).toBeTruthy();
  });

  it("variant 없이 쓰면 body로 렌더된다", async () => {
    await render(<AppText testID="t-default">기본</AppText>);
    expect(screen.getByTestId("t-default")).toBeTruthy();
  });

  it("★ 별칭 Title/Body/Caption이 동작한다", async () => {
    await render(
      <>
        <Title testID="a-title">가</Title>
        <Body testID="a-body">나</Body>
        <Caption testID="a-cap">다</Caption>
      </>,
    );
    expect(screen.getByTestId("a-title")).toBeTruthy();
    expect(screen.getByTestId("a-body")).toBeTruthy();
    expect(screen.getByTestId("a-cap")).toBeTruthy();
  });

  it("★ numberOfLines·selectable·accessibilityLabel이 통과한다 (025 호환)", async () => {
    await render(
      <AppText testID="t-props" numberOfLines={2} selectable accessibilityLabel="레이블">
        긴 텍스트
      </AppText>,
    );
    const el = screen.getByTestId("t-props");
    expect(el.props.numberOfLines).toBe(2);
    expect(el.props.selectable).toBe(true);
    expect(el.props.accessibilityLabel).toBe("레이블");
  });

  it("variant별로 다른 fontSize가 style에 실린다", async () => {
    await render(
      <>
        <AppText variant="title" testID="s-title">
          T
        </AppText>
        <AppText variant="caption" testID="s-cap">
          C
        </AppText>
      </>,
    );
    const flat = (s: unknown) =>
      (Array.isArray(s) ? Object.assign({}, ...s.flat(Infinity).filter(Boolean)) : s) as {
        fontSize?: number;
      };
    expect(flat(screen.getByTestId("s-title").props.style).fontSize).toBe(20);
    expect(flat(screen.getByTestId("s-cap").props.style).fontSize).toBe(13);
  });
});

describe("UC-C1·C3·C4 — 소스 경계", () => {
  it("★ 원시 hex 리터럴이 없다", () => {
    expect(SRC.replace(/\/\/.*$/gm, "")).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it("★ useColorScheme·Appearance를 쓰지 않는다 (031)", () => {
    // 주석을 걷어낸다 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다(008 교훈).
    const code = SRC.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(/\buseColorScheme\b/);
    expect(code).not.toMatch(/\bAppearance\./);
  });

  it("★ diary/models/inference/signals/vision를 import하지 않는다", () => {
    expect(SRC).not.toMatch(/from\s+["'][^"']*(diary|models|inference|signals|vision)\//);
  });
});

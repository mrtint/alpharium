/**
 * 032 — NativeWind 트랜스폼 회귀 방어 (contracts/build-config.md BC7, research R8).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 저장소는 jest transform이 조용히 깨지는 것을 007·024·025에서 반복해 당했다.
 * NativeWind 도입은 babel(`jsxImportSource: "nativewind"`) 트랜스폼을 건드리므로,
 * `className`을 준 코어 컴포넌트가 **예외 없이 렌더되는지**를 1급 테스트로 잠근다.
 *
 * **왜 `toHaveStyle`로 tailwind 클래스를 검증하지 않는가** (2026-09-03 실측):
 * NativeWind의 `className` → `style` 변환은 **Metro 번들 시점**에 tailwind CSS를
 * 컴파일해 이뤄진다. jest(jest-expo)에는 그 파이프라인이 없어 `className`은 raw
 * prop으로 남는다. `nativewind/test`를 쓰면 되지만 그 모듈이 `transformIgnorePatterns`
 * 밖이라 `jest-expo`에서 파싱이 깨진다(SyntaxError). 무리하게 배선하는 대신,
 * 이 저장소가 031 `dark-mode-no-scheme.test.ts`에서 이미 쓰는 방식 —
 * **소스 레벨 검사 + 렌더 안전성** — 을 따른다. 실제 스타일 적용은 실기기에서
 * 본다(SC-005, T047/T059).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen } from "@testing-library/react-native";
import { View, Text } from "react-native";

describe("BC7 — NativeWind className 트랜스폼 (렌더 안전성)", () => {
  it("★ className을 준 <View>가 예외 없이 렌더된다", async () => {
    await render(<View testID="nw-box" className="bg-bg p-4" />);
    expect(screen.getByTestId("nw-box")).toBeTruthy();
  });

  it("★ className을 준 <Text>가 예외 없이 렌더되고 자식이 보인다", async () => {
    await render(
      <Text testID="nw-text" className="text-text">
        안녕
      </Text>,
    );
    expect(screen.getByTestId("nw-text")).toBeTruthy();
    expect(screen.getByText("안녕")).toBeTruthy();
  });

  it("★ 여러 className 조합이 렌더를 깨뜨리지 않는다", async () => {
    await render(
      <View testID="nw-multi" className="flex-row items-center justify-between rounded-card border">
        <Text className="text-textMuted">a</Text>
        <Text className="text-accent">b</Text>
      </View>,
    );
    expect(screen.getByTestId("nw-multi")).toBeTruthy();
  });

  it("className과 style를 함께 줘도 렌더된다 (혼재 — 점진 전환 중간 상태)", async () => {
    await render(<View testID="nw-mix" className="p-4" style={{ marginTop: 8 }} />);
    expect(screen.getByTestId("nw-mix")).toBeTruthy();
  });
});

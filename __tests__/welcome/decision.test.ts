import { readFileSync } from "node:fs";
import { join } from "node:path";

import { shouldShowWelcome } from "../../src/welcome/decision";

/**
 * 환영 연출 진입 판정의 계약 테스트.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/welcome-gate.md W2~W4·W6
 *       spec.md FR-002·FR-002a
 *
 * 021의 `shouldShowOnboarding`, 029의 DR1~DR3를 잇는 **게이트의 세 번째 단**이다.
 * 순수 함수이며 `new Date()`를 부르지 않는다(`day-boundary.ts`·
 * `schedule/decision.ts`·`onboarding/decision.ts`와 같은 규칙).
 */

/** 주석을 걷어낸 코드만 검사한다 (011 `vision/engine.test.ts` 관례). */
const SOURCE = readFileSync(join(__dirname, "../../src/welcome/decision.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("W3 — 판정 진리표", () => {
  it("온보딩이 필요하면 false (에셋·플래그와 무관)", () => {
    expect(
      shouldShowWelcome({
        onboardingNeeded: true,
        essentialAssetsReady: true,
        welcomeShown: false,
      }),
    ).toBe(false);
  });

  it("에셋이 준비 안 됐으면 false", () => {
    expect(
      shouldShowWelcome({
        onboardingNeeded: false,
        essentialAssetsReady: false,
        welcomeShown: false,
      }),
    ).toBe(false);
  });

  it("이미 연출을 봤으면 false", () => {
    expect(
      shouldShowWelcome({
        onboardingNeeded: false,
        essentialAssetsReady: true,
        welcomeShown: true,
      }),
    ).toBe(false);
  });

  it("★ 온보딩 끝 + 에셋 준비 + 아직 안 봤으면 true", () => {
    expect(
      shouldShowWelcome({
        onboardingNeeded: false,
        essentialAssetsReady: true,
        welcomeShown: false,
      }),
    ).toBe(true);
  });
});

describe("W2 — onboardingNeeded가 다른 인자를 이긴다 (순서 강제)", () => {
  it("온보딩이 필요하면 나머지 네 조합 전부 false", () => {
    for (const essentialAssetsReady of [true, false]) {
      for (const welcomeShown of [true, false]) {
        expect(
          shouldShowWelcome({ onboardingNeeded: true, essentialAssetsReady, welcomeShown }),
        ).toBe(false);
      }
    }
  });

  it("여덟 조합 중 true는 정확히 하나다", () => {
    const results: boolean[] = [];
    for (const onboardingNeeded of [true, false]) {
      for (const essentialAssetsReady of [true, false]) {
        for (const welcomeShown of [true, false]) {
          results.push(shouldShowWelcome({ onboardingNeeded, essentialAssetsReady, welcomeShown }));
        }
      }
    }
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("W4 — 순수 함수다", () => {
  it("같은 입력에 같은 출력", () => {
    const input = {
      onboardingNeeded: false,
      essentialAssetsReady: true,
      welcomeShown: false,
    };
    expect(shouldShowWelcome(input)).toBe(shouldShowWelcome(input));
  });

  it("new Date()·난수·파일을 읽지 않는다", () => {
    expect(SOURCE).not.toMatch(/new Date\(|Date\.now|Math\.random|readFile|expo-file-system/);
  });
});

describe("W6 — 캐릭터를 받지 않는다 (연출 대상은 기본 캐릭터 하나뿐)", () => {
  it("시그니처에 Character가 없다", () => {
    // 캐릭터를 받으면 「어느 캐릭터의 연출인가」를 정하는 로직이 생기고,
    // 그것이 추가 캐릭터로 확장되는 문턱이 된다(FR-002a).
    expect(SOURCE).not.toMatch(/\bCharacter\b|\bCHARACTERS\b|roster/);
  });

  it("모델·자산을 모른다 (원칙 III)", () => {
    expect(SOURCE).not.toMatch(/models\/roster|ModelAsset|assetFor|\.bin/);
  });
});

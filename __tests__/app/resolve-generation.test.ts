import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  resolveGenerationParams,
  type GeocodingPreference,
  type ResolveInput,
  type VisionPreference,
} from "../../src/app/resolve-generation";
import type { Character } from "../../src/diary/types";

/**
 * 생성 파라미터 자동 판정의 계약 테스트.
 *
 * 계약: specs/029-writing-flow-simplification/contracts/resolve-generation.md
 *       (계약 표 C1~C15, R7 소스 불변식)
 *
 * 007·009·012의 관례대로 소스 선언을 직접 읽어 `new Date()`·신호·로스터 미의존을
 * 잠근다 (jest는 타입을 지우므로 import 문자열 검사가 필요하다).
 */

const DAY = "2026-01-15" as ResolveInput["chosenDay"];

function base(over: Partial<ResolveInput> = {}): ResolveInput {
  return {
    lastCharacter: "quiet",
    onboardingDefault: "quiet",
    readyCharacters: ["quiet"],
    fixedAuthor: null,
    chosenDay: DAY,
    photoSignalPresent: false,
    locationPermission: false,
    visionPreference: "auto",
    geocodingPreference: "auto",
    ...over,
  };
}

/** resolved면 params, 아니면 실패. */
function params(input: ResolveInput) {
  const out = resolveGenerationParams(input);
  if (out.kind !== "resolved") throw new Error(`expected resolved, got ${out.kind}`);
  return out.params;
}

describe("캐릭터 (R1~R3, C1~C6)", () => {
  it("C1 — 마지막 캐릭터가 준비돼 있으면 그대로", () => {
    expect(
      params(base({ lastCharacter: "narrative", readyCharacters: ["narrative", "quiet"] })).character,
    ).toBe("narrative");
  });

  it("C2 — 마지막 캐릭터가 없으면 온보딩 기본(quiet)", () => {
    expect(params(base({ lastCharacter: null })).character).toBe("quiet");
  });

  it("C3 — 고정값이 준비돼 있으면 마지막보다 우선 (R1)", () => {
    const p = params(
      base({
        lastCharacter: "quiet",
        fixedAuthor: "imaginative",
        readyCharacters: ["quiet", "imaginative"],
      }),
    );
    expect(p.character).toBe("imaginative");
    expect(p.movedFrom).toBeUndefined();
  });

  it("C4 — 마지막 캐릭터가 준비를 잃으면 옮기고 movedFrom을 남긴다 (R2)", () => {
    const p = params(base({ lastCharacter: "narrative", readyCharacters: ["quiet"] }));
    expect(p.character).toBe("quiet");
    expect(p.movedFrom).toBe("narrative");
  });

  it("C5 — 준비된 캐릭터가 하나도 없으면 no-ready-character", () => {
    expect(
      resolveGenerationParams(base({ lastCharacter: "narrative", readyCharacters: [] })).kind,
    ).toBe("no-ready-character");
  });

  it("C6 — 고정값이 미준비면 마지막 캐릭터로 폴백 (R3)", () => {
    const p = params(
      base({
        lastCharacter: "quiet",
        fixedAuthor: "imaginative",
        readyCharacters: ["quiet"],
      }),
    );
    expect(p.character).toBe("quiet");
    expect(p.movedFrom).toBeUndefined();
  });

  // analyze U1 — 옮겨진 값이 배선(T028)에서 기록된다. 여기선 movedFrom과 character가
  // 둘 다 나오는 것만 확인한다.
  it("U1 — 옮겨졌을 때 character는 옮겨진 쪽, movedFrom은 원래", () => {
    const p = params(base({ lastCharacter: "narrative", readyCharacters: ["quiet"] }));
    expect(p.character).toBe("quiet");
    expect(p.movedFrom).toBe("narrative");
  });
});

describe("사진 설정 (R5, C7~C10)", () => {
  it("C7 — auto + 사진 있음 → quick", () => {
    expect(params(base({ visionPreference: "auto", photoSignalPresent: true })).vision).toBe("quick");
  });

  it("C8 — auto + 사진 없음 → none", () => {
    expect(params(base({ visionPreference: "auto", photoSignalPresent: false })).vision).toBe("none");
  });

  it("C9 — 고정값이 auto를 덮어쓴다 (사진 있어도 none)", () => {
    expect(params(base({ visionPreference: "none", photoSignalPresent: true })).vision).toBe("none");
  });

  it("C10 — 고정값 detailed", () => {
    expect(params(base({ visionPreference: "detailed", photoSignalPresent: false })).vision).toBe(
      "detailed",
    );
  });

  it("사진 신호는 boolean 하나 — 임계값 없음 (FR-010)", () => {
    // 1장이든 100장이든 photoSignalPresent가 true면 quick.
    expect(params(base({ visionPreference: "auto", photoSignalPresent: true })).vision).toBe("quick");
  });
});

describe("장소명 (R6, C11~C14)", () => {
  it("C11 — auto + 권한 없음 → false", () => {
    expect(
      params(base({ geocodingPreference: "auto", locationPermission: false })).geocodingEnabled,
    ).toBe(false);
  });

  it("C12 — auto + 권한 있음 → true", () => {
    expect(
      params(base({ geocodingPreference: "auto", locationPermission: true })).geocodingEnabled,
    ).toBe(true);
  });

  it("C13 — 고정 on (권한 없어도 true)", () => {
    expect(
      params(base({ geocodingPreference: "on", locationPermission: false })).geocodingEnabled,
    ).toBe(true);
  });

  it("C14 — 고정 off (권한 있어도 false)", () => {
    expect(
      params(base({ geocodingPreference: "off", locationPermission: true })).geocodingEnabled,
    ).toBe(false);
  });
});

describe("하루 (R4, C15)", () => {
  it("C15 — day는 입력 chosenDay 그대로", () => {
    expect(params(base()).day).toBe(DAY);
  });
});

describe("R7 — 소스 불변식", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/app/resolve-generation.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("new Date(를 부르지 않는다", () => {
    expect(CODE).not.toMatch(/new\s+Date\s*\(/);
    expect(CODE).not.toMatch(/Date\.now\s*\(/);
  });

  it("신호 타입을 import하지 않는다 (../signals/)", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*signals\//);
  });

  it("로스터를 import하지 않는다 (../models/)", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*models\//);
    expect(CODE).not.toMatch(/\bassetFor\b/);
  });

  it("프롬프트 조립에 닿지 않는다 (../diary/prompt)", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\/prompt["']/);
  });

  it("캐릭터 폴백은 resolveSelection을 재사용한다 (자체 폴백 규칙 없음)", () => {
    expect(CODE).toContain("resolveSelection");
  });
});

// 타입 존재 확인 (tsc).
const _v: VisionPreference = "auto";
const _g: GeocodingPreference = "auto";
const _c: Character = "quiet";
void _v;
void _g;
void _c;

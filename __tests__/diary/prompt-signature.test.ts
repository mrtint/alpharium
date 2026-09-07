import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ★ 029 SC-006 / T074 — `src/diary/prompt.ts`의 입력 계약이 029 전후로 동일하다.
 *
 * 계약: specs/029-writing-flow-simplification/spec.md FR-013·SC-006
 *
 * 029는 "일기 쓰기" 흐름을 단순화하지만 **프롬프트 조립은 건드리지 않는다** — 자동
 * 판정(`resolve-generation.ts`)이 `character`·`day`·`vision`을 정해 그 앞에서 넘길
 * 뿐이다. `buildPrompt`/`instructionLines`가 `DiaryRequest`(signals·character·vision·
 * dayStillOpen)만 받는 것, `DiaryRequest`가 그 네 필드뿐인 것을 소스에서 잠근다
 * (022 `UI_TOUCHES_PROMPT`와 같은 성격의 방어).
 */

const PROMPT_SRC = readFileSync(join(__dirname, "../../src/diary/prompt.ts"), "utf8");
const TYPES_SRC = readFileSync(join(__dirname, "../../src/diary/types.ts"), "utf8");

describe("prompt.ts 입력 시그니처 불변 (FR-013, SC-006)", () => {
  it("buildPrompt는 (request: DiaryRequest, vision?: PhotoVision)만 받는다", () => {
    expect(PROMPT_SRC).toMatch(
      /export function buildPrompt\(\s*request: DiaryRequest,\s*vision\?: PhotoVision,?\s*\): string/,
    );
  });

  it("instructionLines도 같은 시그니처다 (되뱉기 판정 비교 대상 일치, P7)", () => {
    expect(PROMPT_SRC).toMatch(
      /export function instructionLines\(\s*request: DiaryRequest,\s*vision\?: PhotoVision,?\s*\): string\[\]/,
    );
  });

  it("promptPrefix는 (character, customNames?)만 받는다 (018 KV 캐시 프리필 + 035 이름)", () => {
    // 035 — 사용자 지정 이름이 호칭 줄에 들어가므로 접두사도 이름을 안다.
    // **`customNames`는 기본값이 있는 옵셔널이어야 한다** — 018 시절 호출자가
    // 그대로 동작해야 하고, 안 넘기면 코드 안 기본 이름이 쓰인다.
    expect(PROMPT_SRC).toMatch(
      /export function promptPrefix\(\s*character: Character,\s*customNames: CustomNames = \{\},?\s*\): string/,
    );
  });

  it("★ 035 — 접두사가 이름 말고 다른 것을 더 받지 않는다", () => {
    // 신호·날짜·시각이 인자로 들어오면 접두사가 「고정」이 아니게 되고
    // 018 P10이 무너진다.
    const signature = /export function promptPrefix\(([\s\S]*?)\): string/.exec(PROMPT_SRC)?.[1];
    expect(signature).toBeDefined();
    expect(signature).not.toMatch(/signals|DaySignals|day|now|Date|vision/i);
  });

  it("buildPrompt는 messages 배열·채팅 템플릿을 만들지 않는다 (005 research §4 — 단일 평문)", () => {
    const code = PROMPT_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bmessages\b\s*:/);
    expect(code).not.toMatch(/\bjinja\b/);
  });
});

describe("DiaryRequest 타입 불변 (002·012·035)", () => {
  it("DiaryRequest의 필드가 정확히 여섯이다 (035에서 customNames?가 더해졌다)", () => {
    const match = TYPES_SRC.match(/export type DiaryRequest = \{([\s\S]*?)\n\};/);
    expect(match).not.toBeNull();
    const body = match![1];
    // 최상위 필드 이름만 뽑는다 (주석·중첩 무시하기 위해 "  <name>:" 패턴).
    const fields = [...body.matchAll(/^ {2}([a-zA-Z]+)\??:/gm)].map((m) => m[1]);
    expect(new Set(fields)).toEqual(
      new Set(["signals", "character", "vision", "dayStillOpen", "placeName", "customNames"]),
    );
  });

  it("★ 035 — 요청이 모델 정보·지표를 담지 않는다 (원칙 III·IV)", () => {
    // 필드가 늘 때마다 이 경계를 다시 확인한다 — 002 FR-008이 정한 것이다.
    const match = TYPES_SRC.match(/export type DiaryRequest = \{([\s\S]*?)\n\};/);
    const code = (match?.[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/asset|gguf|quantiz|param|elapsed|token|score/i);
  });
});

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

  it("promptPrefix는 (character: Character)만 받는다 (018 KV 캐시 프리필)", () => {
    expect(PROMPT_SRC).toMatch(/export function promptPrefix\(character: Character\): string/);
  });

  it("buildPrompt는 messages 배열·채팅 템플릿을 만들지 않는다 (005 research §4 — 단일 평문)", () => {
    const code = PROMPT_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bmessages\b\s*:/);
    expect(code).not.toMatch(/\bjinja\b/);
  });
});

describe("DiaryRequest 타입 불변 (002·012)", () => {
  it("DiaryRequest는 029 전과 같은 필드뿐이다 (signals·character·vision·dayStillOpen·placeName?)", () => {
    const match = TYPES_SRC.match(/export type DiaryRequest = \{([\s\S]*?)\n\};/);
    expect(match).not.toBeNull();
    const body = match![1];
    // 최상위 필드 이름만 뽑는다 (주석·중첩 무시하기 위해 "  <name>:" 패턴).
    const fields = [...body.matchAll(/^ {2}([a-zA-Z]+)\??:/gm)].map((m) => m[1]);
    expect(new Set(fields)).toEqual(
      new Set(["signals", "character", "vision", "dayStillOpen", "placeName"]),
    );
  });
});

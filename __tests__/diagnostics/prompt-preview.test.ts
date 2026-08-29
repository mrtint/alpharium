/**
 * 입력 프롬프트 미리보기 (022).
 *
 * 계약: specs/022-prompt-token-diagnostics/contracts/prompt-preview.md
 *
 * **계약 테스트는 소스 선언을 직접 읽는다**(007·009·012 관례) — jest는 타입을 지우므로
 * import 구조 위반은 소스를 `readFileSync`로 읽어 검사한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildPrompt } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import { CHARACTERS } from "../../src/diary/types";
import {
  SIGNAL_PRESETS,
  buildPreview,
  collectPromptPreviews,
} from "../../src/diagnostics/prompt-preview";

const RAW_SOURCE = readFileSync(join(__dirname, "../../src/diagnostics/prompt-preview.ts"), "utf8");

/**
 * 주석을 걷어낸 소스. **주석은 규칙을 설명하는 자리다** — 설명에 `initLlama`·`token`
 * 같은 낱말이 나오는 것은 위반이 아니다(008·010이 검사에서 세운 것과 같은 원칙).
 * 블록 주석(`/* ... *\/`)·`*` 이어진 줄·`//` 줄을 모두 제거한다.
 */
const SOURCE = RAW_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "")
  .split(/\r?\n/)
  .map((line) => line.replace(/\/\/.*$/, ""))
  .filter((line) => !/^\s*\*/.test(line))
  .join("\n");

const PREVIEW_NOW = new Date("2026-06-01T12:00:00");

describe("PP1 — 미리보기 문자열은 buildPrompt()의 출력과 바이트 동일", () => {
  it("모든 캐릭터 × 프리셋에서 직접 조립한 것과 toBe로 같다", () => {
    const previews = collectPromptPreviews();

    for (const character of CHARACTERS) {
      for (const preset of SIGNAL_PRESETS) {
        const request = buildRequest(
          preset.signals,
          character,
          "none",
          preset.signals.date,
          PREVIEW_NOW,
        );
        expect(request.ok).toBe(true);
        if (!request.ok) continue;

        const direct = buildPrompt(request.request);
        const preview = previews[character][preset.id];

        expect(preview.ok).toBe(true);
        if (preview.ok) expect(preview.text).toBe(direct);
      }
    }
  });
});

describe("PP2 — buildPrompt/buildRequest 외의 프롬프트 조립 로직이 없다", () => {
  it("diary/prompt에서 buildPrompt(+promptPrefix)만, diary/request에서 buildRequest만 가져온다", () => {
    const promptImport = SOURCE.match(/import\s+\{([^}]*)\}\s+from\s+["'][^"']*diary\/prompt["']/);
    expect(promptImport).not.toBeNull();
    const promptNames = (promptImport?.[1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of promptNames) {
      expect(["buildPrompt", "promptPrefix"]).toContain(name);
    }

    const requestImport = SOURCE.match(
      /import\s+\{([^}]*)\}\s+from\s+["'][^"']*diary\/request["']/,
    );
    expect(requestImport).not.toBeNull();
    const requestNames = (requestImport?.[1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(requestNames).toEqual(["buildRequest"]);
  });

  it("prompt.ts 내부 심볼을 재정의하지 않는다", () => {
    for (const symbol of ["SPEAKER_RULES", "TITLE_INSTRUCTION", "signalLines", "nameLine"]) {
      expect(SOURCE).not.toContain(symbol);
    }
  });
});

describe("PP3 — SIGNAL_PRESETS는 사람이 정한 상수", () => {
  it("readonly 배열 리터럴로 선언되어 있다", () => {
    expect(SOURCE).toMatch(/export const SIGNAL_PRESETS:\s*readonly SignalPreset\[\]\s*=\s*\[/);
  });

  it("최소 2개이고 id에 empty·photos가 있다", () => {
    expect(SIGNAL_PRESETS.length).toBeGreaterThanOrEqual(2);
    const ids = SIGNAL_PRESETS.map((p) => p.id);
    expect(ids).toContain("empty");
    expect(ids).toContain("photos");
    expect(new Set(ids).size).toBe(ids.length); // 유일성
  });

  it("fake.ts·collect.ts에서 신호를 가져오지 않는다", () => {
    expect(SOURCE).not.toMatch(/from\s+["'][^"']*signals\/(?:fake|collect)["']/);
  });

  it("배열을 신호 값 기반 변형으로 만들지 않는다 (원칙 V)", () => {
    // SIGNAL_PRESETS 선언 블록 안에 .filter( / .map( 이 없다.
    const block = SOURCE.slice(
      SOURCE.indexOf("export const SIGNAL_PRESETS"),
      SOURCE.indexOf("export function buildPreview"),
    );
    expect(block).not.toMatch(/\.\s*filter\s*\(/);
    expect(block).not.toMatch(/\.\s*map\s*\(/);
  });
});

describe("PP4 — 모든 캐릭터 × 모든 프리셋을 덮는다", () => {
  it("collectPromptPreviews가 5캐릭터, 각 캐릭터가 전 프리셋 id", () => {
    const previews = collectPromptPreviews();
    expect(Object.keys(previews).sort()).toEqual([...CHARACTERS].sort());

    const presetIds = SIGNAL_PRESETS.map((p) => p.id).sort();
    for (const character of CHARACTERS) {
      expect(Object.keys(previews[character]).sort()).toEqual(presetIds);
    }
  });
});

describe("PP5 — 네이티브 추론을 부르지 않는다", () => {
  it("initLlama·llama.rn·completion·generate·engine·backend가 소스에 없다", () => {
    for (const token of [
      "initLlama",
      "llama.rn",
      "completion(",
      ".generate(",
      "engine",
      "backend",
    ]) {
      expect(SOURCE).not.toContain(token);
    }
  });
});

describe("PP6 — approxChars는 text.length이고 토큰이라 부르지 않는다", () => {
  it("모든 성공 프리뷰에서 approxChars === text.length", () => {
    const previews = collectPromptPreviews();
    for (const character of CHARACTERS) {
      for (const preset of SIGNAL_PRESETS) {
        const p = previews[character][preset.id];
        expect(p.ok).toBe(true);
        if (p.ok) expect(p.approxChars).toBe(p.text.length);
      }
    }
  });

  it("소스에 token 어휘가 없다 (대소문자 무시)", () => {
    expect(SOURCE.toLowerCase()).not.toContain("token");
  });
});

describe("PP8 — 조립 실패는 값으로 표시되고 빈 문자열이 아니다", () => {
  it("character가 undefined면 { ok: false, reason } — text 필드 없음", () => {
    const result = buildPreview(undefined, SIGNAL_PRESETS[0]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
      expect("text" in result).toBe(false);
    }
  });
});

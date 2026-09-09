/**
 * 로스터 계약 검증 (R1~R8).
 *
 * 계약: specs/003-character-model-files/contracts/roster.md
 *
 * **이 파일이 헌법 원칙 III의 방어선이다.** 이 기능이 처음으로 캐릭터와 모델 파일을
 * 잇고, 그 연결이 화면으로 새는 것이 핵심 위험이다.
 *
 * R6(역방향 함수 없음)과 R7(process.env 없음)은 **소스를 읽어 검사한다** — 타입으로는
 * "없다"를 증명할 수 없기 때문이다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHARACTERS } from "../../src/diary/types";
import { assetFor, displayName } from "../../src/models/roster";

const ROSTER_SOURCE = readFileSync(join(__dirname, "../../src/models/roster.ts"), "utf8");

/**
 * 주석을 걷어낸 소스.
 *
 * 금지 규칙을 **주석에 적는 것**과 **코드로 쓰는 것**은 다르다. 걷어내지 않으면 "왜
 * 금지인지"를 설명하는 주석 자체가 검사에 걸려, 규칙을 문서화할수록 테스트가 실패하는
 * 거꾸로 된 상태가 된다.
 */
const ROSTER_CODE = ROSTER_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("로스터 — 캐릭터와 모델 자산의 매핑", () => {
  // R1
  //
  // **개수를 못 박지 않는다**(037). 로스터 크기는 헌법 「로스터」 절의 확정 값이며
  // 진입 기준(원칙 III, 1.6.0)을 통과한 캐릭터가 들어오면 는다. 여기서 세어야 할
  // 것은 "몇이냐"가 아니라 **"자리마다 자산이 있느냐"**다.
  it("로스터의 캐릭터마다 자산이 있다", () => {
    expect(CHARACTERS.length).toBeGreaterThan(0);
    for (const character of CHARACTERS) {
      expect(assetFor(character)).toBeDefined();
    }
  });

  // R2 — 크기를 모르면 공간 판정도 완료 판정도 불가능하다
  it("자산이 예상 크기를 안다", () => {
    for (const character of CHARACTERS) {
      expect(assetFor(character).expectedBytes).toBeGreaterThan(0);
    }
  });

  /**
   * R3 — 내용 지문.
   *
   * **아직 비어 있고 그것이 의도된 상태다.** 지문은 실제로 받아 본 파일에서 재기로 했고
   * (research.md 「값을 언제 채우는가」), HuggingFace의 ETag는 sha256이라 그대로 쓸 수
   * 없다. 미리 적는 값은 어디서 왔든 짐작이며, 틀리면 정상 파일이 훼손으로 판정된다.
   *
   * 그래서 **"비어 있음"을 실패로 보지 않는다.** 대신 지문이 들어왔다면 **모양이 md5여야
   * 한다**는 것을 지킨다 — 아무 문자열이나 넣어 통과시키는 것을 막는 자리다.
   *
   * 첫 내려받기가 채록한 값을 여기 옮겨 적으면(quickstart F8) 아래 조건이 실제 검사가
   * 되고, 그때부터 검증이 진짜 검증이 된다.
   */
  it("지문이 있다면 md5 모양이어야 한다 (아직 비어 있는 것은 정상)", () => {
    for (const character of CHARACTERS) {
      const md5 = assetFor(character).md5;
      if (md5 === "") continue; // 아직 재지 않았다 — 첫 내려받기에서 채록한다
      expect(md5).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  /**
   * 지금 몇 개가 채워졌는지 드러낸다.
   *
   * **통과·실패를 가르지 않고 사실만 남긴다.** 로스터가 다 차면 위 검사가 자리
   * 전부에 실제로 걸린다.
   */
  it("지문이 몇 개 채워졌는지 드러난다", () => {
    const measured = CHARACTERS.filter((c) => assetFor(c).md5 !== "").length;
    // 0이어도 실패가 아니다. 값이 늘어나는 것을 눈으로 보기 위한 자리다.
    expect(measured).toBeGreaterThanOrEqual(0);
    expect(measured).toBeLessThanOrEqual(CHARACTERS.length);
  });

  // R4 — 파일명이 캐릭터 식별자면 파일 관리자에서 매핑이 드러난다
  it("자산키가 캐릭터 식별자와 다르다", () => {
    for (const character of CHARACTERS) {
      expect(assetFor(character).key).not.toBe(character);
    }
  });

  // R5 — 가정: 자산이 겹치지 않는다 (겹치면 삭제 규칙이 달라진다)
  it("자산키가 서로 겹치지 않는다", () => {
    const keys = CHARACTERS.map((character) => assetFor(character).key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // R6 — 매핑은 한 방향으로만 흐른다 (FR-003)
  it("역방향 함수와 전체 훑기를 내주지 않는다", () => {
    // `allAssets()`가 있으면 "다섯을 다 받자"가 한 줄로 가능해진다 — 헌법 로스터 위반
    expect(ROSTER_CODE).not.toMatch(/export\s+(function|const)\s+allAssets/);
    expect(ROSTER_CODE).not.toMatch(/export\s+(function|const)\s+characterFor/);
  });

  // R7 — 매핑은 코드 안쪽에만 있다 (FR-002)
  it("환경 변수로 매핑을 바꿀 수 없다", () => {
    expect(ROSTER_CODE).not.toContain("process.env");
  });

  // R8 — 표시 이름은 사람이 짓는다 (FR-004a, FR-005c)
  it("자산에 사람이 읽을 표시 이름·설명이 없다", () => {
    for (const character of CHARACTERS) {
      const asset = assetFor(character);
      expect(asset).not.toHaveProperty("displayName");
      expect(asset).not.toHaveProperty("description");
      expect(asset).not.toHaveProperty("label");
    }
  });

  // 원칙 IV — 자산이 측정 장치의 자리가 되지 않는다
  it("자산에 속도·점수 필드가 없다", () => {
    for (const character of CHARACTERS) {
      const asset = assetFor(character);
      expect(asset).not.toHaveProperty("score");
      expect(asset).not.toHaveProperty("tokensPerSecond");
      expect(asset).not.toHaveProperty("quality");
    }
  });

  // FR-032 — "받았으니 돌려보자"를 막는다
  it("자산에 추론 설정이 없다", () => {
    for (const character of CHARACTERS) {
      const asset = assetFor(character);
      expect(asset).not.toHaveProperty("temperature");
      expect(asset).not.toHaveProperty("contextLength");
      expect(asset).not.toHaveProperty("prompt");
    }
  });
});

/**
 * 014 US4 — 진단 전용 모델 표시 이름.
 *
 * **R8과 모순되지 않는다.** R8은 `ModelAsset`(assetFor의 반환값) 자체에
 * displayName 필드가 없다는 것을 검사한다 — `ModelAsset`은 여전히 그렇다.
 * `displayName()`은 별도 함수이며, 헌법 1.1.0이 연 "진단 경로는 모델을 알아도
 * 된다"(원칙 III)를 이용하는 자리다. `src/diagnostics/report.ts`만 이 함수를
 * 부르고, `src/ui/`는 여전히 이 파일 전체를 import할 수 없다(007 헌법 검사).
 */
describe("진단 전용 모델 표시 이름 (014 FR-017)", () => {
  it("로스터의 캐릭터 모두 빈 문자열이 아닌 표시 이름을 준다", () => {
    for (const character of CHARACTERS) {
      const name = displayName(character);
      expect(typeof name).toBe("string");
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });
});

/**
 * 037 — 로스터 진입과 축소의 계약 (C1·C2·C7).
 *
 * 계약: specs/037-roster-verified-only/contracts/roster-entry.md
 *
 * **이 묶음이 잠그는 것은 로스터의 크기가 아니라 무엇이 들어올 수 있는가다.**
 * 크기는 헌법 「로스터」 절의 확정 값이며 기준을 적용한 결과다.
 */
describe("037 — 로스터 진입과 축소", () => {
  /**
   * C1 — 캐릭터에 딸린 레코드들의 키 집합이 서로 같다.
   *
   * `tsc`가 `Record<Character, …>`로 이미 강제하나 **jest는 타입을 지운다**(007).
   * 한 레코드에만 캐릭터를 더하는 위반은 소스를 읽어야 잡힌다.
   */
  it("C1 — 캐릭터 레코드 넷의 키 집합이 같다", () => {
    const keysOf = (source: string, declaration: string): readonly string[] => {
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      const start = code.indexOf(declaration);
      expect(start).toBeGreaterThanOrEqual(0);
      const open = code.indexOf("{", start);
      const close = code.indexOf("\n};", open);
      expect(close).toBeGreaterThan(open);
      const body = code.slice(open, close);
      return [...body.matchAll(/^\s{2}([a-z]+)\s*:/gm)].map((m) => m[1]).sort();
    };

    const read = (path: string): string => readFileSync(join(__dirname, path), "utf8");

    const assets = keysOf(ROSTER_SOURCE, "const ASSETS");
    const displayNames = keysOf(ROSTER_SOURCE, "const DISPLAY_NAMES");
    const personas = keysOf(read("../../src/diary/persona.ts"), "const PERSONAS");
    const language = keysOf(read("../../src/diary/prompt.ts"), "const LANGUAGE");

    const expected = [...CHARACTERS].sort();
    expect(assets).toEqual(expected);
    expect(displayNames).toEqual(expected);
    expect(personas).toEqual(expected);
    expect(language).toEqual(expected);
  });

  /**
   * C2 — 로스터의 캐릭터에 관측 근거가 남아 있다.
   *
   * 헌법 원칙 III(1.6.0)이 "실기기에서 관측되어야 한다(MUST)"와 "근거를 코드나
   * 문서에 남긴다(MUST)"를 요구한다.
   *
   * **근거의 내용을 코드가 판정하지 않는다**(원칙 IV) — "안정적인가"는 사람이
   * 로그를 읽어 정한다. 여기서 세는 것은 **근거가 적혀 있는가**뿐이다.
   */
  it("C2 — 로스터 캐릭터마다 관측 근거 주석이 있다", () => {
    for (const character of CHARACTERS) {
      const key = assetFor(character).key;
      const at = ROSTER_SOURCE.indexOf(`key: "${key}"`);
      expect(at).toBeGreaterThanOrEqual(0);
      // 자산 블록 앞뒤로 실측을 가리키는 주석이 있어야 한다.
      const around = ROSTER_SOURCE.slice(Math.max(0, at - 800), at + 800);
      expect(around).toMatch(/실측|관측/);
    }
  });

  /**
   * C7 — 로스터 밖 자산을 지우는 코드가 없다 (FR-011).
   *
   * 로스터에서 빠진 캐릭터의 모델 파일은 사용자의 저장 공간에 남는다. **앱이
   * 자동으로 지우지 않는다** — "로스터에 없으니 지운다"는 판단을 코드가 하게 된다.
   * 008이 남긴 "받다 만 모델은 앱으로 못 지운다"와 같은 계열의 알려진 빈자리다.
   */
  it("C7 — 로스터가 자산을 지우는 경로를 갖지 않는다", () => {
    expect(ROSTER_CODE).not.toMatch(/delete|remove|unlink|prune/i);
  });
});

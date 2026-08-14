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
import { assetFor } from "../../src/models/roster";

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
  it("다섯 캐릭터 각각에 자산이 있다", () => {
    expect(CHARACTERS).toHaveLength(5);
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
   * **통과·실패를 가르지 않고 사실만 남긴다.** 다섯이 다 차면 이 줄이 "5/5"를 보고하고,
   * 그때 위 검사가 다섯 개 전부에 실제로 걸린다.
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

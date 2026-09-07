import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Ending } from "../../src/inference/engine-port";
import { GENERATION_TIMEOUT_MS } from "../../src/inference/sampling";
import { LIVENESS_INPUT, LIVENESS_TIMEOUT_MS, judgeLiveness } from "../../src/welcome/liveness";

/**
 * 정상 동작 확인의 계약 테스트.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/liveness.md L1~L6·L14
 *       spec.md FR-003·FR-003a·FR-010
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 원칙 IV의 방어선이다.**
 *
 * 이 확인은 「응답이 오는가」만 본다. 길이·품질·유사도·점수를 재는 순간 그것이
 * 채점이고, 원칙 IV가 되돌리기의 이유였던 바로 그것이다. 그래서 이 테스트는
 * **갈래 수를 직접 세고**(L1), **갈래가 값을 갖지 않는지 확인하며**(L2),
 * **길이가 판정을 바꾸지 않는다는 것을 증명한다**(L3).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 주석을 걷어낸 코드만 검사한다 (011 `vision/engine.test.ts` 관례). */
const SOURCE = readFileSync(join(__dirname, "../../src/welcome/liveness.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

const EOS: Ending = { kind: "eos" };

describe("L1 — LivenessOutcome의 갈래가 정확히 둘이다", () => {
  it("소스의 유니온 멤버가 ok·failed 둘뿐이다", () => {
    const union = /export type LivenessOutcome\s*=\s*([^;]+);/.exec(SOURCE);
    expect(union).not.toBeNull();
    const members = [...(union?.[1] ?? "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
    expect(new Set(members)).toEqual(new Set(["ok", "failed"]));
    expect(members).toHaveLength(2);
  });

  it("실제 반환값도 둘뿐이다", () => {
    const outcomes = new Set([
      judgeLiveness({ loaded: true, text: "안녕", ending: EOS }),
      judgeLiveness({ loaded: false, text: "", ending: EOS }),
      judgeLiveness({ loaded: true, text: "", ending: EOS }),
      judgeLiveness({ loaded: true, text: "안녕", ending: { kind: "timeout" } }),
    ]);
    expect(outcomes).toEqual(new Set(["ok", "failed"]));
  });
});

describe("L2 — 갈래가 값을 갖지 않는다 (원칙 IV)", () => {
  it("문자열 리터럴 유니온이다 — 객체가 아니다", () => {
    // 갈래 수만 세면 `{ kind: "ok", elapsedMs }` 같은 변경을 놓친다.
    // 문자열이면 담을 자리가 구조적으로 없다.
    const union = /export type LivenessOutcome\s*=\s*([^;]+);/.exec(SOURCE)?.[1] ?? "";
    expect(union).not.toMatch(/\{|kind:|elapsed|ms|duration|tokens/i);
    expect(typeof judgeLiveness({ loaded: true, text: "안녕", ending: EOS })).toBe("string");
  });

  it("소스에 시간·토큰 지표가 없다", () => {
    expect(SOURCE).not.toMatch(/elapsed|timings|tokens_|predicted|Date\.now|performance\.now/);
  });
});

describe("L3 — 응답의 내용을 보지 않는다, 비었는가만 본다", () => {
  it("모델을 못 열었으면 failed다", () => {
    expect(judgeLiveness({ loaded: false, text: "안녕하세요", ending: EOS })).toBe("failed");
  });

  it("응답이 비었으면 failed다", () => {
    expect(judgeLiveness({ loaded: true, text: "", ending: EOS })).toBe("failed");
  });

  it("공백만이어도 failed다", () => {
    expect(judgeLiveness({ loaded: true, text: "   \n\t ", ending: EOS })).toBe("failed");
  });

  it("시간 한도를 넘었으면 failed다", () => {
    expect(judgeLiveness({ loaded: true, text: "안녕", ending: { kind: "timeout" } })).toBe(
      "failed",
    );
  });

  it("응답이 오면 ok다", () => {
    expect(judgeLiveness({ loaded: true, text: "안녕하세요", ending: EOS })).toBe("ok");
  });

  it("★ 길이가 판정을 바꾸지 않는다 — 임계값이 없다는 증명", () => {
    const oneChar = judgeLiveness({ loaded: true, text: "가", ending: EOS });
    const long = judgeLiveness({ loaded: true, text: "가".repeat(500), ending: EOS });
    expect(oneChar).toBe("ok");
    expect(long).toBe("ok");
    expect(oneChar).toBe(long);
  });

  it("★ 잘린 응답도 「살아 있다」의 증거다 — 일기 판정과 다르다", () => {
    // 005의 judge()는 eos가 아니면 거부하지만, 여기서는 응답이 온 것 자체가
    // 「엔진이 돈다」는 뜻이다. timeout만 예외다.
    for (const kind of ["length", "context", "interrupted"] as const) {
      expect(judgeLiveness({ loaded: true, text: "안녕", ending: { kind } })).toBe("ok");
    }
  });

  it("응답 내용의 언어·품질을 보지 않는다", () => {
    for (const text of ["Hello", "你好", "asdfgh", "?!@#"]) {
      expect(judgeLiveness({ loaded: true, text, ending: EOS })).toBe("ok");
    }
  });
});

describe("L4 — 순수 함수다", () => {
  it("같은 입력에 같은 출력을 준다", () => {
    const input = { loaded: true, text: "안녕", ending: EOS };
    expect(judgeLiveness(input)).toBe(judgeLiveness(input));
  });

  it("시각·난수를 읽지 않는다", () => {
    expect(SOURCE).not.toMatch(/new Date\(|Math\.random|setTimeout|readFile/);
  });
});

describe("L6 — LIVENESS_INPUT은 일기 프롬프트 요소를 담지 않는다", () => {
  it.each(["휴대폰", "기록", "사진", "다닌 자리", "불린다", "써라", "제목", "일기"])(
    "%j 를 담지 않는다",
    (token) => {
      expect(LIVENESS_INPUT).not.toContain(token);
    },
  );

  it("짧다 — 일기 프롬프트가 아니다", () => {
    expect(LIVENESS_INPUT.length).toBeLessThan(20);
  });

  it("소스가 일기 프롬프트 모듈을 부르지 않는다 (L7)", () => {
    expect(SOURCE).not.toMatch(/diary\/prompt|buildPrompt|promptPrefix|fixedHead/);
  });

  it("소스가 일기 판정·저장소를 부르지 않는다 (L5·L11)", () => {
    expect(SOURCE).not.toMatch(/diary\/acceptance|\bjudge\b|diary\/store|DiaryEntry/);
  });
});

describe("L14 — 상한 시간", () => {
  it("60초다 — 사람이 정한 상수", () => {
    expect(LIVENESS_TIMEOUT_MS).toBe(60_000);
  });

  it("일기 생성 한도보다 작다", () => {
    // 「안녕?」 한 마디가 일기 한 편보다 오래 걸릴 이유가 없다.
    expect(LIVENESS_TIMEOUT_MS).toBeLessThan(GENERATION_TIMEOUT_MS);
  });
});

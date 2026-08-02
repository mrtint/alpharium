/**
 * 출력 해석 (004 FR-340·FR-341)
 *
 * - FR-340: 본문을 식별할 수 없거나 비어 있으면 **형식 실패**
 * - FR-341: **본문 외의 내용이 덧붙어 있어도 본문을 식별할 수 있으면 성공**이며
 *   나머지는 버린다
 *
 * 아래 「추론 태그」 항목은 실측(2026-08-02, exaone4:1.2b)에서 21편 중 15편이 생각
 * 과정을 본문에 흘린 것을 보고 추가했다. 추론 태그는 FR-341이 말하는 「버려야 할
 * 나머지」이며, 이것이 본문에 남으면 사용자가 읽는 일기에 모델의 혼잣말이 섞인다.
 */
import { parseDiaryBody } from "../../src/inference/parse";

const BODY = "주인은 오늘 많이 걸었다. 꽤 바빴나 보다.";

describe("본문을 식별할 수 없으면 형식 실패다 (004 FR-340)", () => {
  it.each(["", "   ", "\n\n\t "])("비어 있는 출력은 실패다: %p", (raw) => {
    expect(parseDiaryBody(raw).ok).toBe(false);
  });

  it("문자열이 아니면 실패다", () => {
    expect(parseDiaryBody(null as unknown as string).ok).toBe(false);
  });
});

describe("덧붙은 것이 있어도 본문을 찾으면 성공이다 (004 FR-341)", () => {
  it("본문만 오면 그대로 돌려준다", () => {
    const result = parseDiaryBody(BODY);
    expect(result).toEqual({ ok: true, body: BODY });
  });

  it("앞뒤 공백은 다듬는다", () => {
    expect(parseDiaryBody(`\n\n  ${BODY}  \n`)).toEqual({ ok: true, body: BODY });
  });

  it("코드 울타리는 껍데기만 벗긴다", () => {
    expect(parseDiaryBody("```\n" + BODY + "\n```")).toEqual({ ok: true, body: BODY });
  });

  it("「제목:」 머리말은 떼어 낸다", () => {
    expect(parseDiaryBody(`제목: 오늘의 일기\n${BODY}`)).toEqual({ ok: true, body: BODY });
  });

  it("JSON으로 감싸 오면 본문 자리를 찾는다", () => {
    expect(parseDiaryBody(JSON.stringify({ body: BODY }))).toEqual({ ok: true, body: BODY });
    expect(parseDiaryBody(JSON.stringify({ content: BODY }))).toEqual({ ok: true, body: BODY });
  });
});

describe("추론 태그는 버린다 (004 FR-341) — 2026-08-02 실측에서 드러난 누락", () => {
  it("<think> 블록을 걷어내고 본문만 남긴다", () => {
    const raw = `<think>
음... 사용자가 네모라는 주인 휴대폰 역할을 요청했군. 조건이 복잡하네.
일기 구조를 고민 중이야.
</think>

${BODY}`;
    expect(parseDiaryBody(raw)).toEqual({ ok: true, body: BODY });
  });

  it("여는 태그 없이 닫는 태그만 와도 그 앞을 버린다", () => {
    // 실측에서 모델이 여는 태그를 빼먹고 닫기만 한 경우가 있었다.
    const raw = `음... 사용자가 요청한 조건을 정리해 보자.\n</think>\n\n${BODY}`;
    expect(parseDiaryBody(raw)).toEqual({ ok: true, body: BODY });
  });

  it("닫는 태그가 여러 번 반복돼도 마지막 뒤를 본문으로 본다", () => {
    // 실측 2번 표본이 `</think></think></think>` 형태였다.
    const raw = `생각하는 중이야.\n</think></think></think>\n\n${BODY}`;
    expect(parseDiaryBody(raw)).toEqual({ ok: true, body: BODY });
  });

  it("여는 태그만 있고 닫히지 않으면 본문이 없는 것이다 — 형식 실패", () => {
    const raw = "<think>\n음... 아직 생각 중이고 본문을 쓰지 못했다.";
    expect(parseDiaryBody(raw).ok).toBe(false);
  });

  it("추론 태그 뒤가 비어 있으면 형식 실패다", () => {
    expect(parseDiaryBody("<think>생각만 했다</think>\n\n   ").ok).toBe(false);
  });

  it("본문에 태그가 없으면 아무것도 건드리지 않는다", () => {
    expect(parseDiaryBody(BODY)).toEqual({ ok: true, body: BODY });
  });

  it("걷어낸 뒤에도 「제목:」 머리말 제거가 함께 적용된다", () => {
    const raw = `<think>고민 중</think>\n제목: 오늘의 일기\n${BODY}`;
    expect(parseDiaryBody(raw)).toEqual({ ok: true, body: BODY });
  });

  it("생각 과정이 본문에 남지 않는다 — 실측 1번 표본", () => {
    const raw = `<think>
음... 사용자가 네모라는 주인 휴대폰 역할을 하면서 주인의 하루를 관찰한 기록을
일기 형식으로 창작해 달라 요청했어.
</think>

${BODY}`;
    const result = parseDiaryBody(raw);
    expect(result.ok).toBe(true);
    expect(result.ok && result.body).not.toMatch(/음\.\.\.|사용자가|요청했어/);
  });
});

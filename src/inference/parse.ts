/**
 * T034 — 출력 해석 (004 FR-340·FR-341)
 *
 * **어댑터 밖에 있다** (헌법 원칙 III) — 어댑터가 무엇이든 같은 해석이 적용된다.
 *
 * - 본문을 식별할 수 없거나 비어 있으면 **형식 실패** (004 FR-340)
 * - **본문 외의 내용이 덧붙어 있어도 본문을 식별할 수 있으면 성공**이며 나머지는
 *   버린다 (004 FR-341) — 모델이 제목이나 설명을 붙여도 실패로 다루지 않는다
 */

export interface ParseSuccess {
  readonly ok: true;
  readonly body: string;
}

export interface ParseFailure {
  readonly ok: false;
}

export type ParseResult = ParseSuccess | ParseFailure;

/** 모델이 흔히 덧붙이는 머리말. 본문 앞에 붙으면 떼어 낸다 (004 FR-341). */
const PREAMBLE = /^\s*(?:제목|title)\s*[:：].*$/gim;

/** 코드 울타리. 안에 본문이 들어오면 껍데기만 벗긴다. */
const FENCE = /^\s*```[a-z]*\s*\n([\s\S]*?)\n?\s*```\s*$/i;

/**
 * 추론 태그의 **닫는** 쪽. 이 뒤가 본문이다.
 *
 * 여는 태그를 함께 찾지 않는 이유가 있다 — 실측(2026-08-02, exaone4:1.2b)에서 모델이
 * 여는 태그를 빼먹고 닫기만 하거나(`생각...</think>`) 닫는 태그를 연달아 뱉는
 * (`</think></think></think>`) 경우가 나왔다. **마지막 닫는 태그 뒤**를 본문으로 보면
 * 셋 다 같은 규칙으로 걸린다.
 */
const REASONING_CLOSE = /<\/(?:think|thinking|reasoning)>/gi;

/** 여는 태그. 끝내 닫히지 않았다면 본문이 시작되지 않은 것이다. */
const REASONING_OPEN = /<(?:think|thinking|reasoning)>/i;

/**
 * 생각 과정을 걷어낸다 (004 FR-341 — 「본문 외의 내용은 버린다」).
 *
 * 이것이 본문에 남으면 사용자가 읽는 일기에 모델의 혼잣말이 섞인다.
 */
function stripReasoning(text: string): string | null {
  const matches = [...text.matchAll(REASONING_CLOSE)];

  if (matches.length > 0) {
    // 마지막 닫는 태그 뒤가 본문이다.
    const last = matches[matches.length - 1];
    return text.slice(last.index + last[0].length);
  }

  // 열기만 하고 닫히지 않았다면 아직 본문에 닿지 못한 출력이다 (004 FR-340).
  return REASONING_OPEN.test(text) ? null : text;
}

/**
 * 원시 출력에서 본문을 골라낸다.
 *
 * 본문을 식별할 수 없거나 비어 있으면 형식 실패다. 성공하면 **본문만** 돌려주며,
 * 덧붙은 것은 버린다.
 */
export function parseDiaryBody(rawText: string): ParseResult {
  if (typeof rawText !== "string") return { ok: false };

  // 생각 과정을 먼저 걷어낸다 — 그 안의 내용이 본문 후보로 오해되지 않도록.
  const reasoned = stripReasoning(rawText);
  if (reasoned === null) return { ok: false };

  const unfenced = reasoned.match(FENCE)?.[1] ?? reasoned;

  // JSON으로 감싸 온 경우 본문 자리를 찾는다. 실패하면 원문을 그대로 본다.
  const fromJson = bodyFromJson(unfenced);
  const candidate = fromJson ?? unfenced.replace(PREAMBLE, "");

  const body = candidate.trim();
  if (body.length === 0) return { ok: false };

  return { ok: true, body };
}

function bodyFromJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (typeof parsed !== "object" || parsed === null) return null;

    for (const key of ["body", "content", "본문"]) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
  } catch {
    // 형식이 깨진 JSON은 본문 후보가 아니다. 원문 해석으로 되돌아간다.
    return null;
  }
  return null;
}

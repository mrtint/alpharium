/**
 * T032 — 클라우드 어댑터 (헌법 원칙 I 개발 예외, 원칙 III)
 *
 * **이 파일이 하는 일은 호출뿐이다** (원칙 III MUST). 받는 것은 완성된 프롬프트,
 * 돌려주는 것은 원시 출력이다 — 프롬프트를 조립하지 않고, 출력을 해석하지 않고,
 * 화자를 판정하지 않는다. 그 셋은 `src/inference/prompt.ts`·`parse.ts`와
 * `src/speaker/verify.ts`에 있다.
 *
 * 개발 예외의 세 조건 (헌법 원칙 I):
 * 1. 페이로드는 온디바이스와 **동일한 스키마** — `EngineRequest`가 그 스키마이며
 *    클라우드 전용 필드로 분기하지 않는다
 * 2. **사진 원본을 전송하지 않는다** — 넘어오는 것이 문자열 하나뿐이므로 구조적으로
 *    불가능하다. 집계에 이미 원본이 담기지 않는다 (003)
 * 3. 클라우드 모드임을 UI에 표시한다 — `kind`가 그 근거다 (006 FR-590)
 *
 * **실패는 던진다.** 대체 문장을 돌려주는 경로가 없다 (헌법 원칙 II).
 */
import { EngineCallError, type AIEngine, type EngineRequest, type EngineResponse } from "../engine";

/**
 * 실측으로 고른 모델 (2026-08-03, quickstart 「추론 품질 실측」).
 *
 * exaone4:1.2b는 한국어 문장 자체가 깨져(`비트들아진`, `묻칭구먼`) 부적합했다.
 */
const DEFAULT_MODEL = "qwen3:1.7b";

/**
 * 사고(Thinking)를 끈다 (2026-08-03 실측).
 *
 * 사고하는 모델은 1B급에서 사고에 출력을 다 쓰고 본문에 한 줄만 남기는 일이 잦다 —
 * 끄자 본문 확보가 20/21에서 21/21로, 한 줄짜리 붕괴가 6편에서 2편으로 줄었다.
 *
 * `think: false`와 `chat_template_kwargs.enable_thinking`은 이 서버가 **조용히
 * 무시한다.** 실제로 먹히는 것은 이 필드뿐이다.
 */
const REASONING_EFFORT = "none";

export class CloudEngine implements AIEngine {
  readonly kind = "cloud" as const;

  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env.EXPO_PUBLIC_AI_API_BASE_URL ?? "") {
    if (!baseUrl) {
      throw new EngineCallError("클라우드 어댑터의 주소가 설정되지 않았다");
    }
    this.baseUrl = baseUrl;
  }

  async generate(request: EngineRequest): Promise<EngineResponse> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          reasoning_effort: REASONING_EFFORT,
          // 완성된 프롬프트를 그대로 싣는다. 여기서 조립하지 않는다.
          messages: [{ role: "user", content: request.prompt }],
        }),
      });
    } catch (error) {
      throw new EngineCallError("모델이 응답하지 않았다", { cause: error });
    }

    if (!response.ok) {
      throw new EngineCallError(`모델이 응답하지 않았다: HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const rawText = json.choices?.[0]?.message?.content;

    if (typeof rawText !== "string") {
      throw new EngineCallError("모델 응답에서 출력을 찾을 수 없다");
    }

    // 손대지 않는다 — 다듬기도 해석이다 (원칙 III).
    return { rawText };
  }
}

/**
 * T033 ⚖️ 원칙 IV — `AIEngine` 어댑터
 *
 * 헌법 원칙 IV가 명시한 셋을 모두 검사한다: **정상·실패·형식 불량 응답**.
 *
 * 함께 검사하는 것:
 * - 헌법 원칙 III (MUST): **어댑터의 책임은 호출뿐이다** — 완성된 입력을 주면 원시
 *   출력을 그대로 돌려주고, 프롬프트를 구성하거나 출력을 해석하거나 화자를 판정하지 않는다
 * - 001 FR-013b / 003 FR-282: **추론 축이 입력의 쓸모를 재판정하지 않는다** —
 *   「적음」 집계와 「보통」 집계가 같은 경로로 처리된다
 */
import { CloudEngine } from "../../src/inference/engines/cloud";
import { EngineCallError, type AIEngine } from "../../src/inference/engine";
import { generateDiary } from "../../src/inference/generate";
import { buildPromptInput, composePrompt, DEFAULT_PROMPT_PARAMS } from "../../src/inference/prompt";
import { createDigest } from "../../src/signals/digest";
import { createPersona } from "../../src/persona/persona";
import { TRAIT_CATALOG } from "../../src/persona/catalog";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";
import { EMPTY_MARKERS } from "../../src/speaker/verify";
import { TerminationReason } from "../../src/inference/failure";

const persona = () => createPersona({ name: "네모", traitId: TRAIT_CATALOG[0].id });

const digestWithScale = (scale: ScaleVerdict) =>
  createDigest({
    date: "2026-08-02",
    observedAt: "2026-08-02T18:30:00+09:00",
    steps: observed(4210),
    activePeriods: observed(["저녁"]),
    stays: unobserved(),
    moved: observed(true),
    photos: unobserved(),
    events: unobserved(),
    scale,
  });

const okResponse = (text: string) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: text } }] }),
  }) as unknown as Response;

const withFetch = async (impl: typeof fetch, run: () => Promise<void>) => {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
};

describe("정상 응답 (헌법 원칙 IV)", () => {
  it("완성된 입력을 넘기면 원시 출력을 돌려준다", async () => {
    await withFetch(
      (async () => okResponse("주인은 저녁에 걸었다.")) as typeof fetch,
      async () => {
        const result = await new CloudEngine("https://example.test/v1").generate({
          prompt: "완성된 프롬프트",
        });
        expect(result.rawText).toBe("주인은 저녁에 걸었다.");
      },
    );
  });
});

describe("실패 응답 (헌법 원칙 IV)", () => {
  it("HTTP 오류는 던진다 — 대체 문장으로 메우지 않는다 (헌법 원칙 II)", async () => {
    await withFetch(
      (async () => ({ ok: false, status: 503 }) as Response) as typeof fetch,
      async () => {
        await expect(
          new CloudEngine("https://example.test/v1").generate({ prompt: "p" }),
        ).rejects.toBeInstanceOf(EngineCallError);
      },
    );
  });

  it("네트워크 실패는 던진다", async () => {
    await withFetch(
      (async () => {
        throw new Error("network down");
      }) as typeof fetch,
      async () => {
        await expect(
          new CloudEngine("https://example.test/v1").generate({ prompt: "p" }),
        ).rejects.toBeInstanceOf(EngineCallError);
      },
    );
  });

  it("실패해도 준비된 문구를 돌려주지 않는다", async () => {
    await withFetch(
      (async () => {
        throw new Error("network down");
      }) as typeof fetch,
      async () => {
        const engine = new CloudEngine("https://example.test/v1");
        await expect(engine.generate({ prompt: "p" })).rejects.toThrow();
        // 성공 경로로 새어 나오는 값이 없다.
        await expect(engine.generate({ prompt: "p" })).rejects.not.toHaveProperty("rawText");
      },
    );
  });
});

describe("형식 불량 응답 (헌법 원칙 IV)", () => {
  it("본문을 찾을 수 없는 응답은 던진다", async () => {
    await withFetch(
      (async () => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response) as typeof fetch,
      async () => {
        await expect(
          new CloudEngine("https://example.test/v1").generate({ prompt: "p" }),
        ).rejects.toBeInstanceOf(EngineCallError);
      },
    );
  });

  it("모델이 이상한 문자열을 내놓아도 어댑터는 그대로 돌려준다 — 해석은 밖의 일이다", async () => {
    const junk = "{{{ 형식이 깨진 출력 ]]]";
    await withFetch(
      (async () => okResponse(junk)) as typeof fetch,
      async () => {
        const result = await new CloudEngine("https://example.test/v1").generate({ prompt: "p" });
        expect(result.rawText).toBe(junk);
      },
    );
  });
});

describe("어댑터의 책임은 호출뿐이다 (헌법 원칙 III MUST)", () => {
  it("어댑터가 돌려주는 것은 원시 출력뿐이다 — 해석된 일기가 아니다", async () => {
    await withFetch(
      (async () => okResponse("  주인은 걸었다.  ")) as typeof fetch,
      async () => {
        const result = await new CloudEngine("https://example.test/v1").generate({ prompt: "p" });

        expect(Object.keys(result)).toEqual(["rawText"]);
        // 손대지 않는다 — 다듬기도 해석이다.
        expect(result.rawText).toBe("  주인은 걸었다.  ");
        expect(result).not.toHaveProperty("body");
        expect(result).not.toHaveProperty("diary");
      },
    );
  });

  it("어댑터는 프롬프트를 구성하지 않는다 — 집계도 퍼소나도 받지 않는다", async () => {
    let sentBody: string | undefined;
    await withFetch(
      (async (_url, init) => {
        sentBody = (init as RequestInit).body as string;
        return okResponse("주인은 걸었다.");
      }) as typeof fetch,
      async () => {
        const prompt = "이것이 완성된 프롬프트다";
        await new CloudEngine("https://example.test/v1").generate({ prompt });

        // 넘긴 문자열이 그대로 실린다. 어댑터가 덧붙이거나 조립하지 않는다.
        const parsed = JSON.parse(sentBody!);
        expect(parsed.messages).toEqual([{ role: "user", content: prompt }]);
      },
    );
  });

  it("어댑터는 화자를 판정하지 않는다 — 사용자 화자 본문도 그대로 돌려준다", async () => {
    await withFetch(
      (async () => okResponse("내 다리가 아팠다.")) as typeof fetch,
      async () => {
        const result = await new CloudEngine("https://example.test/v1").generate({ prompt: "p" });
        expect(result.rawText).toBe("내 다리가 아팠다.");
      },
    );
  });

  it("어댑터를 바꿔도 화자 판정 결과가 같다 — 판정이 어댑터 밖에 있다", async () => {
    const body = "내 다리가 아팠다.";
    const markers = { userSpeakerMarkers: ["내 다리가"], phoneSpeakerMarkers: [] };
    const engineOf = (kind: AIEngine["kind"]): AIEngine => ({
      kind,
      generate: async () => ({ rawText: body }),
    });

    const cloud = await generateDiary({
      digest: digestWithScale(ScaleVerdict.Normal),
      persona: persona(),
      engine: engineOf("cloud"),
      markers,
      promptParams: DEFAULT_PROMPT_PARAMS,
    });
    const onDevice = await generateDiary({
      digest: digestWithScale(ScaleVerdict.Normal),
      persona: persona(),
      engine: engineOf("on-device"),
      markers,
      promptParams: DEFAULT_PROMPT_PARAMS,
    });

    expect(cloud.ok).toBe(false);
    expect(onDevice.ok).toBe(false);
    expect(cloud.ok === false && cloud.reason).toBe(TerminationReason.SpeakerViolation);
    expect(onDevice.ok === false && onDevice.reason).toBe(TerminationReason.SpeakerViolation);
  });
});

describe("추론 축이 입력의 쓸모를 재판정하지 않는다 (001 FR-013b, 003 FR-282)", () => {
  it("「적음」과 「보통」이 같은 프롬프트 골격을 만든다", () => {
    const modest = composePrompt(
      buildPromptInput(digestWithScale(ScaleVerdict.Modest), persona(), DEFAULT_PROMPT_PARAMS),
    );
    const normal = composePrompt(
      buildPromptInput(digestWithScale(ScaleVerdict.Normal), persona(), DEFAULT_PROMPT_PARAMS),
    );
    expect(modest).toBe(normal);
  });

  it("프롬프트에 규모 판정이 실리지 않는다 — 모델이 알 수 없다", () => {
    const prompt = composePrompt(
      buildPromptInput(digestWithScale(ScaleVerdict.Modest), persona(), DEFAULT_PROMPT_PARAMS),
    );
    expect(prompt).not.toMatch(/적음|modest|보통|normal|부족|빈약/);
  });

  it("「적음」 집계도 「보통」과 같은 경로로 처리되어 저장 가능한 일기가 나온다", async () => {
    const engine: AIEngine = { kind: "cloud", generate: async () => ({ rawText: "주인은 걸었다." }) };

    for (const scale of [ScaleVerdict.Modest, ScaleVerdict.Normal]) {
      const result = await generateDiary({
        digest: digestWithScale(scale),
        persona: persona(),
        engine,
        markers: EMPTY_MARKERS,
        promptParams: DEFAULT_PROMPT_PARAMS,
      });
      expect(result.ok).toBe(true);
    }
  });

  it("「적음」을 이유로 거부하거나 지연하지 않는다 (001 FR-043a)", async () => {
    let calls = 0;
    const engine: AIEngine = {
      kind: "cloud",
      generate: async () => {
        calls++;
        return { rawText: "주인은 걸었다." };
      },
    };

    await generateDiary({
      digest: digestWithScale(ScaleVerdict.Modest),
      persona: persona(),
      engine,
      markers: EMPTY_MARKERS,
      promptParams: DEFAULT_PROMPT_PARAMS,
    });

    expect(calls).toBe(1);
  });
});

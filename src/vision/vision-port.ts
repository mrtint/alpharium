/**
 * 사진을 보는 엔진.
 *
 * 계약: specs/011-photo-vision-summary/contracts/vision-engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **기기에 닿는 유일한 자리이자 원칙 IV의 두 번째 경계다.**
 *
 * 005의 `llama-port.ts`가 배운 것이 여기서 반복된다: `completion()`이 **요청하지 않은
 * 지표를 결과에 담아 보낸다**(`timings`·`tokens_predicted`·`predicted_per_second`).
 * 멀티모달이라고 다르지 않으며, 오히려 **사진 처리 시간이 더 붙을 수 있다.**
 *
 * 그래서 방어가 「안 쓴다」가 아니라 **「경계에서 버린다」**여야 한다.
 * **`VisionRunResult`에 자리가 하나뿐인 것이 방어 그 자체다 — 자리가 없으면 담을 수 없다.**
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **⚠️ E1을 이 파일이 지키지 않는다.** 「한 번에 하나만 열린다」는 이 엔진과 005의
 * 생성 엔진이 **같은 자원을 다투는** 규칙이라, 두 엔진이 서로를 모르는 채로는 지킬 수
 * 없다. **호출자(`on-device.ts`)가 순서를 지킨다** — 이 엔진을 완전히 닫은 뒤 캐릭터
 * 모델을 연다. 엔진끼리 알게 하면 두 축이 엉킨다.
 */

import { modelFilePath } from "../models/expo-port";
import { visionAssets } from "./roster";
import { CAPTION_SAMPLING } from "./sampling";
import type { VisionDepth } from "./types";

/**
 * 사진 한 장을 얼마나 자세히 볼 것인가 (research.md §4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`llama.rn` 0.12.9의 `initMultimodal`이 받는 값이다.** 설치본 타입의 주석이 뜻을
 * 직접 적었다: "Lower values reduce memory usage and improve speed for high-resolution
 * images. Recommended: 256-512 for faster inference, up to 4096 for maximum detail."
 *
 * **사진 한 장을 몇 개의 토큰으로 볼지**가 곧 「얼마나 자세히 보는가」다.
 *
 * **⚠️ 두 값은 짐작이다**(원칙 V). 주석의 권장 범위 안이라는 것이 유일한 근거이며,
 * **실제로 결과가 다른지는 quickstart D6이 확인한다.** 다르지 않으면 값을 벌린다.
 *
 * **캡션 프롬프트를 바꾸지 않는다.** 「자세히 써라」로 가르면 **모델이 아는 것 이상으로
 * 길게 쓰라는 압력**이 되고, 그것이 005가 관측한 지어내기의 원인이다. 입력 쪽 다이얼을
 * 돌리는 것이 안전하다.
 *
 * **이 수가 밖으로 나가지 않는다**(원칙 III). 화면에 보이면 「빠르게 봄은 256토큰」이
 * 사용자에게 드러나고 그것이 모델 설정 노출이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const IMAGE_TOKENS: Readonly<Record<VisionDepth, number>> = {
  quick: 256,
  detailed: 1024,
};

/**
 * 사진을 보는 데 쓰는 프롬프트.
 *
 * **`src/diary/prompt.ts`와 다른 자리다.** 저것은 원칙 II의 통과 지점(화자가 휴대폰이다)
 * 이고, 이것은 **사진에 무엇이 있는지 묻는 말**이다. 일기의 화자 규칙이 여기 오면 캡션이
 * 일기처럼 쓰이고, 그때 판정을 거치지 않은 글이 재료가 된다.
 *
 * **짧고 사실만 묻는다** — 캡션이 길면 컨텍스트를 먹고(research §5), 해석을 요구하면
 * 모델이 지어낸다.
 */
const CAPTION_PROMPT = "Describe what is visible in this photo in one short sentence.";

/**
 * 캡션 한 번의 결과.
 *
 * **자리가 하나뿐인 것이 계약이다**(V1). `timings`·`tokens_*`를 담을 자리가 없으므로
 * 구현이 그것을 올려보낼 방법이 없다.
 *
 * **⚠️ `ending`을 두지 않는 것이 005와 다르다.** 005는 「글이 끝났는가」가 판정의
 * 근거였다(잘린 일기를 거부해야 한다). **캡션은 다르다** — 잘린 캡션도 「사진에서 본
 * 것」이며, 문장이 완결되지 않았다고 버리면 그것이 품질 판정이고 원칙 IV다.
 *
 * **빈 문자열만 실패로 본다.** 「아무것도 못 읽었다」와 「조금 읽었다」만 가른다.
 */
export type VisionRunResult = {
  text: string;
};

/**
 * 사진 보는 모델을 여는 데 성공했는가.
 *
 * **`no-vision-support`가 별도 갈래인 까닭**(V2): `getMultimodalSupport()`가
 * `{ vision, audio }`를 주므로 **물어볼 수 있다 — 짐작하지 않는다**(원칙 V).
 * `not-found`(파일이 없다)와는 사용자가 할 일이 다르다.
 */
export type VisionLoadResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "load-failed" | "no-vision-support" };

/**
 * 사진 보는 엔진.
 *
 * **불변식**:
 *  1. **E2 — 어떻게 끝나든 정리된다.** 005의 E2보다 결과가 나쁘다: 그때는 다음 요청이
 *     죽었고 여기서는 **같은 요청 안에서** 캐릭터 모델을 열다 죽는다
 *  2. **E3 — 예외를 던지지 않는다.** 실패는 값이어야 파이프라인이 `vision` 단계에서
 *     멈췄다고 말할 수 있다(002 FR-019)
 *  3. **E4 — 한 장의 실패가 나머지를 무너뜨리지 않는다.** 빈 문자열을 돌려주고 다음으로
 *     넘어간다(FR-005a)
 */
export interface VisionEngine {
  /** 본체를 열고 그 위에 mmproj를 붙인다. **둘 다 성공해야 ok다** */
  load(depth: VisionDepth): Promise<VisionLoadResult>;
  /** 사진 한 장을 읽는다. **한 장씩이다**(FR-001a) */
  caption(photoPath: string): Promise<VisionRunResult>;
  /** 읽는 중인 것을 끊는다 */
  stop(): Promise<void>;
  /** mmproj를 떼고 본체를 닫는다 */
  unload(): Promise<void>;
}

/** `llama.rn`의 컨텍스트에서 **우리가 쓰는 부분만**. 전체를 들고 다니지 않는다 */
type VisionContext = {
  initMultimodal(params: {
    path: string;
    image_max_tokens?: number;
  }): Promise<boolean>;
  getMultimodalSupport(): Promise<{ vision: boolean; audio: boolean }>;
  releaseMultimodal(): Promise<void>;
  completion(params: Record<string, unknown>): Promise<NativeResult>;
  stopCompletion(): Promise<void>;
  release(): Promise<void>;
};

/**
 * 네이티브 결과에서 **우리가 보는 부분만**.
 *
 * 나머지 필드(`timings`·`tokens_*`)는 **타입에 적지도 않는다** — 005가 배운 것이며,
 * **이름을 적어 두면 언젠가 누가 쓴다.**
 */
type NativeResult = {
  text?: string;
  /** 걸러낸 본문. 템플릿에 따라 이쪽에만 값이 올 수 있다 */
  content?: string;
};

/** 네이티브 모듈을 여는 함수. 테스트에서 주입한다 */
export type VisionLoader = (modelPath: string) => Promise<VisionContext>;

/**
 * 엔진을 만든다.
 *
 * `loader`를 주입받아 기기 없이도 규칙(E2~E4)을 검증할 수 있게 한다 — 005의
 * `createLlamaEngine`, 003·004의 포트 주입과 같은 구조다.
 */
export function createVisionEngine(
  loader: VisionLoader,
  resolvePath: (key: string) => Promise<string> = modelFilePath,
): VisionEngine {
  /** 지금 열려 있는 것. **하나뿐이다** */
  let context: VisionContext | null = null;

  const engine: VisionEngine = {
    async load(depth: VisionDepth): Promise<VisionLoadResult> {
      // 이미 열려 있으면 먼저 닫는다. 깊이가 바뀌었을 수 있고, 두 컨텍스트가 열려
      // 있으면 안 된다.
      if (context !== null) await engine.unload();

      const assets = visionAssets();

      let basePath: string;
      let projectorPath: string;
      try {
        basePath = await resolvePath(assets.base.key);
        projectorPath = await resolvePath(assets.projector.key);
      } catch {
        return { ok: false, reason: "not-found" };
      }

      let opened: VisionContext;
      try {
        opened = await loader(basePath);
      } catch (error) {
        // **오류 문구를 밖으로 내보내지 않는다** — 경로가 들어 있고, 경로에는 자산키가
        // 들어 있다(원칙 III). 005의 `llama-port.ts`와 같은 판단이다.
        const message = error instanceof Error ? error.message : String(error);
        const missing = /no such file|not found|enoent|does not exist/i.test(message);
        return { ok: false, reason: missing ? "not-found" : "load-failed" };
      }

      try {
        // ★ mmproj를 붙인다. **이것이 없으면 사진을 못 본다.**
        await opened.initMultimodal({
          path: projectorPath,
          image_max_tokens: IMAGE_TOKENS[depth],
        });

        // ★ 물어본다 — 짐작하지 않는다(V2, 원칙 V).
        const support = await opened.getMultimodalSupport();
        if (!support.vision) {
          await opened.release().catch(() => {});
          return { ok: false, reason: "no-vision-support" };
        }
      } catch {
        await opened.release().catch(() => {});
        return { ok: false, reason: "load-failed" };
      }

      context = opened;
      return { ok: true };
    },

    async caption(photoPath: string): Promise<VisionRunResult> {
      // 부르는 쪽이 load()를 건너뛴 것이다. 던지지 않는다(E3).
      if (context === null) return { text: "" };

      try {
        // **토큰 콜백을 넘기지 않는다**(FR-034). 넘기지 않으면 읽는 중인 글이 화면에
        // 닿을 경로가 코드에 존재하지 않는다 — 005 FR-028b와 같은 구조적 방어다.
        //
        // **`messages` + jinja를 쓴다** — 005가 실기기에서 배운 것이다(2026-08-17).
        // 평문 프롬프트로는 instruct 모델이 **빈 글만 낸다.**
        const result = await context.completion({
          messages: [{ role: "user", content: CAPTION_PROMPT }],
          media_paths: [photoPath],
          jinja: true,
          temperature: CAPTION_SAMPLING.temperature,
          n_predict: CAPTION_SAMPLING.n_predict,
        });

        // ★ 여기가 경계다. **`text`/`content`만 꺼내고 나머지를 버린다.**
        //
        // `content`를 먼저 본다 — 005가 실기기에서 배운 것이며, 템플릿에 따라 어느 쪽에
        // 값이 오는지 다르다.
        const text = (result.content ?? result.text ?? "").trim();
        return { text };
      } catch {
        // 한 장의 실패가 나머지를 무너뜨리지 않는다(E4). 빈 문자열이 곧 실패다.
        return { text: "" };
      }
    },

    async stop(): Promise<void> {
      // 이미 끝난 것을 멈추려는 것은 정상이며, 그때의 오류는 알릴 것이 없다.
      await context?.stopCompletion().catch(() => {});
    },

    async unload(): Promise<void> {
      const open = context;
      context = null;
      if (open === null) return;

      // **mmproj를 먼저 뗀다.** 붙인 역순이며, 남기면 다음 적재가 어긋날 수 있다.
      await open.releaseMultimodal().catch(() => {});
      await open.release().catch(() => {});
    },
  };

  return engine;
}

/**
 * 일기 생성 파이프라인.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/pipeline.md
 *
 * 신호 → 요청 → 생성 → 저장을 하나의 진입점으로 잇는다. 이 기능에서는 추론이
 * `not-implemented`를 반환하므로 **항상 `generation`에서 멈추며, 그것이 정상이다.**
 * 파이프라인이 거기까지 도달한다는 것 자체가 검증 대상이다.
 */

import { isDayWritable, type DayDate } from "../config/day-boundary";
import {
  isGenerationFailure,
  type InferenceBackend,
  type MonologueBranch,
  type ProgressStage,
} from "../inference/types";
import type { DaySignals } from "../signals/types";
import { buildRequest } from "./request";
import type { DiaryStore } from "./store";
import { extractTitle } from "./title";
import type { Character, DiaryEntry, VisionSetting } from "./types";

/** 어느 단계에서 멈췄는가. 실패 경로마다 정확히 하나가 붙는다(FR-019). */
export type PipelineStage =
  | "day-not-closed" // 아직 04:00 경계를 지나지 않음 (FR-018c)
  | "already-running" // 같은 하루가 이미 생성 중 (FR-018d)
  | "signals" // 신호를 가져오지 못함
  | "request-build" // 캐릭터가 없어 요청 실패 (FR-007)
  | "model-not-ready" // 고른 캐릭터의 모델이 기기에 없다 (003 FR-008)
  /**
   * 사진을 보지 못했다 (011 FR-021).
   *
   * **`generation`과 따로 두는 까닭**: 사용자가 할 일이 다르다 — 이쪽은 「사진 보는 것을
   * 준비하거나 설정을 바꿔라」이고 저쪽은 「캐릭터를 준비하거나 다시 시도하라」이다.
   * 003이 `model-not-ready`를 따로 둔 것과 같은 판단이며, 뭉개면 002 FR-019(어느
   * 단계에서 멈췄는지 말한다)가 무의미해진다.
   */
  | "vision"
  | "generation" // 추론 실패 또는 not-implemented
  | "storage"; // 저장 실패 (FR-024)

/**
 * 파이프라인 결과.
 *
 * **실패 갈래에 `entry`도 `text`도 없다(FR-012).** 빈 본문이나 플레이스홀더로 일기를
 * 만들지 않는다 — 만드는 순간 가짜 일기와 구분이 사라진다(헌법 원칙 I).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **006이 예외를 하나 열었다: `storage` 실패에는 `entry`가 실린다**(006 FR-012a).
 *
 * 002의 불변식을 깨는 것처럼 보이지만 아니다. 금지된 것은 **지어낸 텍스트가 일기
 * 자리에 들어가는 것**이었고("일기를 생성할 수 없습니다" 같은 플레이스홀더), 여기
 * 실리는 글은 **모델이 실제로 생성하고 판정을 통과한 것**이다. 가짜가 아니다.
 *
 * **왜 `storage`에만 붙는가**: 6단계(저장)에 도달했다는 것 자체가 5단계(생성) 성공을
 * 뜻한다. 생성 전에 멈춘 갈래에는 보여줄 글이 애초에 없으므로 `entry`가 없다 —
 * `pipeline.test.ts`가 그것을 직접 검사한다.
 *
 * **왜 성공으로 돌리지 않는가**: 저장 실패가 성공으로 읽히면 사용자는 일기가 남은 줄
 * 안다(006 SC-008c). 실패는 실패로 두고 글만 함께 보낸다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type PipelineResult =
  /**
   * `overwrote` — **덮어썼다는 사실이 드러나야 한다**(002 FR-023a, 006 FR-034).
   * 조용히 덮어쓰면 사용자는 이전 일기가 사라진 줄도 모르고, 온디바이스 생성은
   * 비용이 커서 사라진 일기를 되돌릴 수 없다.
   */
  | { ok: true; entry: DiaryEntry; overwrote: boolean }
  | { ok: false; stage: PipelineStage; reason: string; entry?: undefined }
  | { ok: false; stage: "storage"; reason: string; entry: DiaryEntry };

export type PipelineInput = {
  day: DayDate;
  /** "지금". 파이프라인이 스스로 읽지 않는다(FR-018a) */
  now: Date;
  character: Character | undefined;
  vision: VisionSetting;
};

/**
 * 파이프라인이 주입받는 것.
 *
 * 각 단계를 독립적으로 테스트하려면(FR-020) 세 가지가 밖에서 들어와야 한다.
 *
 * **추론 어댑터를 파이프라인이 직접 고르지 않는다(FR-017).** 001의 `select.ts`가 고른
 * 결과를 받는다 — 파이프라인이 스스로 고르면 헌법 원칙 I의 방어선이 둘로 갈라진다.
 */
export type PipelineDeps = {
  /** 이 기능에서는 가짜 신호. 다음 기능에서 실제 수집으로 갈아끼운다 */
  loadSignals: (day: DayDate) => Promise<DaySignals | null>;
  /**
   * 이 캐릭터의 모델이 지금 기기에 있는가 (003 FR-008).
   *
   * 003이 붙기 전에는 없었으므로 **선택적이다** — 주지 않으면 이 단계를 건너뛴다.
   * 002의 기존 테스트가 그대로 통과해야 하기 때문이며, 계약을 넓히는 것이지 바꾸는 것이
   * 아니다.
   *
   * **준비되지 않았으면 생성을 시도하지 않는다.** 다른 캐릭터의 모델로 대신하지도 않는다
   * (FR-008a, 헌법 원칙 I) — 조용한 대체는 사용자가 고른 캐릭터를 배신하는 것이다.
   */
  isModelReady?: (character: Character) => Promise<boolean>;
  /** 001의 select.ts가 고른 것 */
  backend: InferenceBackend;
  /** 파일 구현 또는 메모리 대역 */
  store: DiaryStore;
};

export interface Pipeline {
  run(
    input: PipelineInput,
    onProgress?: (stage: ProgressStage, branch?: MonologueBranch) => void,
  ): Promise<PipelineResult>;
}

/** 실패를 만든다. stage 없이 실패하는 경로가 없도록 이 함수만 쓴다. */
function stop(stage: PipelineStage, reason: string): PipelineResult {
  return { ok: false, stage, reason };
}

/**
 * 파이프라인을 만든다.
 *
 * **진행 중 상태를 인스턴스가 들고 있는다.** 저장소에 남기지 않는다 — 남기면 앱이 죽었을
 * 때 "영원히 생성 중"인 하루가 생긴다(contracts/pipeline.md). 앱이 종료되면 이 상태는
 * 사라지고, 다음에 열었을 때 다시 시도할 수 있다. 백그라운드 실행이 불가능해 생성 중
 * 종료가 드물지 않으므로 이 성질이 필요하다.
 */
export function createPipeline(deps: PipelineDeps): Pipeline {
  /** 지금 생성 중인 하루들(FR-018d). 온디바이스 추론은 오래 걸린다 */
  const running = new Set<DayDate>();

  return {
    async run(
      input: PipelineInput,
      onProgress?: (stage: ProgressStage, branch?: MonologueBranch) => void,
    ): Promise<PipelineResult> {
      // 1. 이 하루를 지금 쓸 수 있는가? — 닫혔거나(지난 하루), 오늘이면서
      //    정오를 지났으면 쓸 수 있다(012, 헌법 원칙 II 「하루의 끝」).
      //    ★ isDayClosed()만 보던 이전 게이트는 오늘을 언제나 거부했다
      //    (research.md §9) — isDayWritable()이 그 자리를 대신한다.
      if (!isDayWritable(input.day, input.now)) {
        return stop("day-not-closed", `${input.day}는 아직 닫히지 않았다`);
      }

      // 2. 이미 생성 중인가? — 사용자가 여러 번 눌러도 한 번만 돈다.
      if (running.has(input.day)) {
        return stop("already-running", `${input.day}는 이미 생성 중이다`);
      }

      running.add(input.day);
      try {
        return await runStages(deps, input, onProgress);
      } finally {
        // 성공·실패와 무관하게 빠진다. 빠지지 않으면 실패한 하루를 영영 다시 시도할 수 없다.
        running.delete(input.day);
      }
    },
  };
}

/**
 * 3~6단계.
 *
 * **앞 단계가 실패하면 뒤 단계를 시도하지 않는다.** 특히 5(생성)가 실패했는데 6(저장)이
 * 도는 일이 없어야 한다 — 그래야 기존 일기가 보존된다(FR-023b).
 */
async function runStages(
  deps: PipelineDeps,
  input: PipelineInput,
  onProgress?: (stage: ProgressStage, branch?: MonologueBranch) => void,
): Promise<PipelineResult> {
  // 3. 신호를 가져온다.
  // 015 — 진행 신호. 파이프라인이 보내는 것은 이 한 곳뿐이며, 나머지는 그대로
  // 백엔드까지 중계한다(data-model.md 「Pipeline.run() 확장」).
  onProgress?.("signals");
  const signals = await deps.loadSignals(input.day);
  if (signals === null) {
    return stop("signals", `${input.day}의 신호를 가져오지 못했다`);
  }

  // 4. 요청을 만든다. 신호의 양으로는 거부하지 않는다(FR-005a) — 캐릭터 유무만 본다.
  const request = buildRequest(signals, input.character, input.vision, input.day, input.now);
  if (!request.ok) {
    return stop("request-build", "캐릭터가 정해지지 않아 요청을 만들지 못했다");
  }

  // 4b. 모델이 기기에 있는가 (003 FR-008).
  //
  // **생성을 시도하기 전에 막는다.** 요청이 만들어져야 어느 캐릭터인지 알 수 있으므로
  // request-build 다음이고, 없는 모델로 추론을 시도하면 무너지므로 generation 앞이다.
  if (deps.isModelReady !== undefined) {
    const ready = await deps.isModelReady(request.request.character);
    if (!ready) {
      return stop("model-not-ready", "고른 캐릭터의 모델이 아직 기기에 없다");
    }
  }

  // 5. 생성한다. 이 기능에서는 항상 여기서 멈춘다.
  const generated = await deps.backend.generate(request.request, onProgress);
  if (isGenerationFailure(generated)) {
    const detail = "reason" in generated ? `: ${generated.reason}` : "";

    // 011 — **사진을 못 본 것은 생성 실패가 아니다.** 사용자가 할 일이 다르므로 단계를
    // 가른다(FR-021). 어댑터가 두 단계를 함께 돌지만(E1의 순서 때문이다), **어느
    // 단계에서 멈췄는지는 밖에서 구분되어야 한다**(002 FR-019).
    const stage = generated.kind === "vision-failed" ? "vision" : "generation";
    return stop(stage, `${generated.kind}${detail}`);
  }

  // 6. 저장한다. 생성에 성공한 경우에만 도달한다(FR-023b).
  //
  // 014 — **`judge()`가 이미 통과시킨 전체 텍스트에서 제목을 사후 분리한다.**
  // `extractTitle()`은 판정을 다시 하지 않고, 실패해도 예외를 던지지 않는다
  // (title.ts 계약 P1·P2) — 떼지 못하면 title 없이 전체가 본문이 된다(FR-009).
  const { title, body } = extractTitle(generated.text);
  const entry: DiaryEntry = {
    date: input.day,
    text: body,
    ...(title !== undefined ? { title } : {}),
    character: request.request.character,
    signalsUsed: signals,
    createdAt: input.now,
  };

  const saved = await deps.store.save(entry);
  if (!saved.ok) {
    // **만든 글을 버리지 않는다**(006 FR-012a). 30초를 들인 글이고 다시 생성해도
    // 같은 글이 나오지 않는다. 실패는 실패로 두되 읽을 기회를 빼앗지 않는다.
    return { ok: false, stage: "storage", reason: saved.reason, entry };
  }

  return { ok: true, entry, overwrote: saved.overwrote };
}

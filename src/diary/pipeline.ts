/**
 * 일기 생성 파이프라인.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/pipeline.md
 *
 * 신호 → 요청 → 생성 → 저장을 하나의 진입점으로 잇는다. 이 기능에서는 추론이
 * `not-implemented`를 반환하므로 **항상 `generation`에서 멈추며, 그것이 정상이다.**
 * 파이프라인이 거기까지 도달한다는 것 자체가 검증 대상이다.
 */

import { isDayClosed, type DayDate } from "../config/day-boundary";
import { isGenerationFailure, type InferenceBackend } from "../inference/types";
import type { DaySignals } from "../signals/types";
import { buildRequest } from "./request";
import type { DiaryStore } from "./store";
import type { Character, DiaryEntry, VisionSetting } from "./types";

/** 어느 단계에서 멈췄는가. 실패 경로마다 정확히 하나가 붙는다(FR-019). */
export type PipelineStage =
  | "day-not-closed" // 아직 04:00 경계를 지나지 않음 (FR-018c)
  | "already-running" // 같은 하루가 이미 생성 중 (FR-018d)
  | "signals" // 신호를 가져오지 못함
  | "request-build" // 캐릭터가 없어 요청 실패 (FR-007)
  | "generation" // 추론 실패 또는 not-implemented
  | "storage"; // 저장 실패 (FR-024)

/**
 * 파이프라인 결과.
 *
 * **실패 갈래에 `entry`도 `text`도 없다(FR-012).** 빈 본문이나 플레이스홀더로 일기를
 * 만들지 않는다 — 만드는 순간 가짜 일기와 구분이 사라진다(헌법 원칙 I).
 */
export type PipelineResult =
  | { ok: true; entry: DiaryEntry }
  | { ok: false; stage: PipelineStage; reason: string };

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
  /** 001의 select.ts가 고른 것 */
  backend: InferenceBackend;
  /** 파일 구현 또는 메모리 대역 */
  store: DiaryStore;
};

export interface Pipeline {
  run(input: PipelineInput): Promise<PipelineResult>;
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
    async run(input: PipelineInput): Promise<PipelineResult> {
      // 1. 하루가 닫혔는가? — 끝나지 않은 하루의 일기는 그 하루를 다 보지 못한 것이다.
      if (!isDayClosed(input.day, input.now)) {
        return stop("day-not-closed", `${input.day}는 아직 닫히지 않았다`);
      }

      // 2. 이미 생성 중인가? — 사용자가 여러 번 눌러도 한 번만 돈다.
      if (running.has(input.day)) {
        return stop("already-running", `${input.day}는 이미 생성 중이다`);
      }

      running.add(input.day);
      try {
        return await runStages(deps, input);
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
async function runStages(deps: PipelineDeps, input: PipelineInput): Promise<PipelineResult> {
  // 3. 신호를 가져온다.
  const signals = await deps.loadSignals(input.day);
  if (signals === null) {
    return stop("signals", `${input.day}의 신호를 가져오지 못했다`);
  }

  // 4. 요청을 만든다. 신호의 양으로는 거부하지 않는다(FR-005a) — 캐릭터 유무만 본다.
  const request = buildRequest(signals, input.character, input.vision);
  if (!request.ok) {
    return stop("request-build", "캐릭터가 정해지지 않아 요청을 만들지 못했다");
  }

  // 5. 생성한다. 이 기능에서는 항상 여기서 멈춘다.
  const generated = await deps.backend.generate(request.request);
  if (isGenerationFailure(generated)) {
    const detail = "reason" in generated ? `: ${generated.reason}` : "";
    return stop("generation", `${generated.kind}${detail}`);
  }

  // 6. 저장한다. 생성에 성공한 경우에만 도달한다(FR-023b).
  const entry: DiaryEntry = {
    date: input.day,
    text: generated.text,
    character: request.request.character,
    signalsUsed: signals,
    createdAt: input.now,
  };

  const saved = await deps.store.save(entry);
  if (!saved.ok) {
    return stop("storage", saved.reason);
  }

  return { ok: true, entry };
}

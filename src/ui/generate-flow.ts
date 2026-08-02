/**
 * T043 — 생성 흐름 오케스트레이션 (006 FR-521)
 *
 * [data-model.md](../../specs/001-persona-diary-contracts/data-model.md)의 상태 전이도
 * 그대로다. 요청은 **완료 또는 실패 중 하나의 결말에 도달한다** — 조용히 사라지는
 * 경로가 없다 (006 FR-521·FR-522).
 *
 * 이 파일이 3a·3b·3c를 엮는 자리이며, 각 축의 결정을 **다시 내리지 않는다**:
 * 규모 판정은 수집 축이 이미 붙였고(003 FR-270), 화자 판정은 추론 축이 이미 했다.
 */
import { buildDigest, DigestBuildError, type BuildParams, type SourceReaders } from "../signals/digest-builder";
import { ScaleVerdict } from "../signals/scale";
import type { CollectionWindow } from "../signals/sources/source";
import { generateDiary } from "../inference/generate";
import { TerminationReason } from "../inference/failure";
import type { AIEngine } from "../inference/engine";
import type { PromptParams } from "../inference/prompt";
import type { SpeakerMarkers } from "../speaker/verify";
import { createBundle } from "../storage/bundle";
import { Repository, StorageError } from "../storage/repository";
import type { Persona } from "../persona/persona";
import type { DailyDigest } from "../signals/digest";

/** 흐름이 멈춰 서서 사용자에게 묻는 자리. */
export enum ConfirmKind {
  /** 「적음」 확인 (006 FR-540). **진행이 기본 선택**이다. */
  ModestScale = "modest-scale",
  /** 덮어쓰기 확인 (001 FR-040). 확인 없이 덮어쓰지 않는다. */
  Overwrite = "overwrite",
}

/** 요청이 도달할 수 있는 결말. **완료 아니면 실패다** (006 FR-521). */
export type FlowOutcome =
  | { readonly kind: "completed"; readonly date: string }
  | { readonly kind: "empty-digest"; readonly digest: DailyDigest }
  | { readonly kind: "digest-failed" }
  | { readonly kind: "inference-failed"; readonly reason: TerminationReason }
  | { readonly kind: "storage-failed" }
  | { readonly kind: "cancelled" };

export interface Confirmer {
  /** 진행할 것인지 묻는다. 참이면 진행. 006 FR-542에 따라 **진행이 기본**이다. */
  confirm(kind: ConfirmKind, digest: DailyDigest): Promise<boolean>;
}

export interface FlowDeps {
  readonly window: CollectionWindow;
  readonly readers: SourceReaders;
  readonly buildParams: BuildParams;
  readonly persona: Persona;
  readonly engine: AIEngine;
  readonly markers: SpeakerMarkers;
  readonly promptParams: PromptParams;
  readonly repository: Repository;
  readonly confirmer: Confirmer;
  readonly signal?: AbortSignal;
}

export async function runGenerateFlow(deps: FlowDeps): Promise<FlowOutcome> {
  // 1. 집계 산출 — 요청 시점에 만든다 (003 FR-260).
  let digest: DailyDigest;
  try {
    digest = await buildDigest(deps.window, deps.readers, deps.buildParams);
  } catch (error) {
    // 실패하면 **추론을 시도하지 않는다** (003 FR-265). 삼키지 않는다 (006 FR-528).
    if (error instanceof DigestBuildError) return { kind: "digest-failed" };
    throw error;
  }

  // 2. 규모 판정 — 수집 축이 붙인 것을 그대로 읽는다. 여기서 재판정하지 않는다.
  if (digest.scale === ScaleVerdict.Empty) {
    // 쓸 재료가 없다 — 추론하지 않고 일기도 저장하지 않는다 (001 FR-013).
    return { kind: "empty-digest", digest };
  }

  if (digest.scale === ScaleVerdict.Modest) {
    // 「적음」은 사용자 확인에만 쓰인다 (003 FR-276). 거부·지연이 아니다 (006 FR-546).
    if (!(await deps.confirmer.confirm(ConfirmKind.ModestScale, digest))) {
      return { kind: "cancelled" };
    }
  }

  // 3. 덮어쓰기 확인 — 이미 있으면 묻는다 (001 FR-040).
  if ((await deps.repository.findByDate(digest.date)) !== null) {
    if (!(await deps.confirmer.confirm(ConfirmKind.Overwrite, digest))) {
      return { kind: "cancelled" };
    }
  }

  // 4. 추론 — 형식 검사와 화자 판정을 포함한다 (004 FR-345).
  const result = await generateDiary({
    digest,
    persona: deps.persona,
    engine: deps.engine,
    markers: deps.markers,
    promptParams: deps.promptParams,
    signal: deps.signal,
  });

  if (!result.ok) {
    return result.reason === TerminationReason.Cancelled
      ? { kind: "cancelled" }
      : { kind: "inference-failed", reason: result.reason };
  }

  // 5. 기록 묶음 저장 — 전부 성공하거나 전부 실패 (005 FR-411).
  try {
    await deps.repository.save(createBundle({ diary: result.diary, digest }));
  } catch (error) {
    // 저장 실패도 알린다 — 삼키는 것이 원칙 II의 흔한 빠져나감이다 (006 FR-528).
    if (error instanceof StorageError) return { kind: "storage-failed" };
    throw error;
  }

  return { kind: "completed", date: digest.date };
}

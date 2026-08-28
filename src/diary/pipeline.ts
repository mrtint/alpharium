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
import type { PhotoVision } from "../vision/types";
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
  /**
   * 화면이 미리 읽어 둔 사진 결과 (018,
   * specs/018-prompt-prefix-prewarm/data-model.md §5).
   *
   * **파이프라인은 이 값을 해석하지 않고 그대로 `backend.generate()`에
   * 넘긴다.** `/speckit-analyze` F1이 발견한 문제(화면이 미리 읽은 것이
   * 파이프라인을 거치지 않고는 실제 백엔드에 닿을 수 없다)의 해소다.
   */
  seen?: PhotoVision;
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
  /**
   * 리사이즈 사본을 지운다 (017).
   *
   * `generated.usedPhotos`가 있는데 저장이 실패했을 때만 부른다 — 성공하면
   * `entry.photos`로 그대로 남는다(research.md §1 흐름 4, contracts/
   * photo-preservation.md P4). 주지 않으면 정리를 건너뛴다(옵셔널 확장).
   */
  cleanupResizedPhoto?: (path: string) => Promise<void>;
  /**
   * 좌표를 장소 이름으로 바꾼다 (017, contracts/place-name.md).
   *
   * 설정이 켜져 있고 대표 좌표가 있을 때만 정확히 1회 호출된다. 주지
   * 않으면 지오코딩을 시도하지 않는다(옵셔널 확장).
   */
  geocoding?: {
    reverseGeocode(coordinate: {
      latitude: number;
      longitude: number;
    }): Promise<{ kind: "known"; value: string } | { kind: "unknown" }>;
  };
  /** 장소명 설정이 켜져 있는가 (017, FR-004). 주지 않으면 꺼짐으로 다룬다 */
  geocodingEnabled?: boolean;
  /**
   * 프로세스 경계 경합 잠금 (020, contracts/generation-lock.md L5).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **`running: Set<DayDate>`는 인스턴스 로컬이다.** 화면과 백그라운드
   * 태스크는 각자 `createAppPipeline()`을 불러 다른 파이프라인 인스턴스를
   * 만들므로, 둘이 동시에 살면 `running` 방어가 서로를 못 본다(L1). 이
   * 통로가 주어지면 `run()`이 `day-writable` 판정 다음, instance-local
   * `running` 판정과 함께 파일 잠금 취득을 시도한다. 취득 실패 시
   * `{ ok: false, stage: "already-running" }`로 즉시 반환한다.
   *
   * **옵셔널 확장이다**(003의 `isModelReady?`, 017의 `geocoding?`과 같은
   * 방식) — 주지 않으면 002~019 동작을 그대로 유지한다(회귀 없음).
   *
   * `owner`는 `run()` 호출자가 정하지 않는다 — `wiring.ts`가 화면/태스크
   * 경로별로 owner-bound 클로저를 만들어 주입한다(`PipelineInput`은
   * 화면·태스크가 공유하는 데이터라 owner 개념이 안 어울린다).
   * ─────────────────────────────────────────────────────────────────────────
   */
  acquireLock?: () => Promise<LockHandle | null>;
};

/** 취득한 잠금을 놓는 통로. `run()`이 `finally`에서 부른다. */
export type LockHandle = { release: () => Promise<void> };

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
      //    (instance-local. 프로세스를 가로지르는 경합은 3에서 막는다.)
      if (running.has(input.day)) {
        return stop("already-running", `${input.day}는 이미 생성 중이다`);
      }

      // 3. 프로세스 경계 잠금 (020, L5). 주어졌을 때만 시도한다 — 주지
      //    않으면 002~019 동작 그대로(회귀 없음). 다른 파이프라인
      //    인스턴스(화면 ↔ 백그라운드 태스크)가 이미 잡고 있으면 null.
      let handle: LockHandle | null = null;
      if (deps.acquireLock !== undefined) {
        handle = await deps.acquireLock();
        if (handle === null) {
          return stop("already-running", `${input.day}는 다른 곳에서 생성 중이다`);
        }
      }

      running.add(input.day);
      try {
        return await runStages(deps, input, onProgress);
      } finally {
        // 성공·실패와 무관하게 빠진다. 빠지지 않으면 실패한 하루를 영영 다시 시도할 수 없다.
        running.delete(input.day);
        // 잠금도 반드시 놓는다 — 안 놓으면 다음 실행이 stale 타임아웃(5분)까지 막힌다.
        await handle?.release().catch(() => {});
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

  // 4c. 장소명을 얻는다 (017, contracts/place-name.md).
  //
  // **`buildPrompt()`보다 먼저 일어나야 한다**(L4) — 화면과 프롬프트가 같은
  // 호출 결과를 공유하려면, 그 값이 `request.request`에 실린 채로
  // `backend.generate()`(안에서 buildPrompt를 부른다)에 들어가야 한다.
  // 설정이 꺼져 있거나 대표 좌표가 없으면(L2) 시도하지 않는다.
  let placeName: DiaryEntry["placeName"];
  const representativeCoordinate =
    signals.places.kind === "known"
      ? signals.places.value.trace.representativeCoordinate
      : undefined;
  if (
    deps.geocodingEnabled === true &&
    deps.geocoding !== undefined &&
    representativeCoordinate !== undefined
  ) {
    const geocoded = await deps.geocoding.reverseGeocode(representativeCoordinate);
    placeName = geocoded;
    if (geocoded.kind === "known") {
      request.request = { ...request.request, placeName: geocoded.value };
    }
  }

  // 5. 생성한다. 이 기능에서는 항상 여기서 멈춘다.
  // 018 — 화면이 미리 읽어 둔 것이 있으면 그대로 넘긴다. 파이프라인은
  // 이 값을 해석하지 않는다(data-model.md §5).
  const generated = await deps.backend.generate(request.request, onProgress, input.seen);
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
    ...(generated.usedPhotos !== undefined ? { photos: generated.usedPhotos } : {}),
    ...(generated.timing !== undefined ? { timing: generated.timing } : {}),
    ...(placeName !== undefined ? { placeName } : {}),
  };

  const saved = await deps.store.save(entry);
  if (!saved.ok) {
    // 017 — **저장이 실패하면 usedPhotos의 사본을 정리한다**
    // (contracts/photo-preservation.md P4). 저장이 성공해야만 그 일기가
    // 존재하는 한 사본이 보존된다 — 실패하면 아무도 참조하지 않는다.
    if (generated.usedPhotos !== undefined && deps.cleanupResizedPhoto !== undefined) {
      const cleanup = deps.cleanupResizedPhoto;
      await Promise.all(generated.usedPhotos.map((p) => cleanup(p.resizedPath).catch(() => {})));
    }
    // **만든 글을 버리지 않는다**(006 FR-012a). 30초를 들인 글이고 다시 생성해도
    // 같은 글이 나오지 않는다. 실패는 실패로 두되 읽을 기회를 빼앗지 않는다.
    return { ok: false, stage: "storage", reason: saved.reason, entry };
  }

  return { ok: true, entry, overwrote: saved.overwrote };
}

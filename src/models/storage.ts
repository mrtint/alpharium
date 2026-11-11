/**
 * 모델 파일과 메타데이터의 보관·삭제.
 *
 * 계약: specs/003-character-model-files/contracts/storage.md
 *
 * 헌법 원칙 III의 **"로스터는 켜고 끌 수 있다(MUST)"** 가 여기서 성립한다. 켤 수만 있고
 * 끌 수 없으면 절반이며, 모델이 GB이므로 끄지 못하면 사용자가 저장 공간을 볼모로 잡힌다.
 *
 * **메타데이터를 한 파일에 모은다**(research.md §4). 002의 일기는 항목이 계속 늘어나
 * 날짜별로 쪼갰지만, 여기는 캐릭터 수가 적고 늘 전부를 조회하므로 모으는 쪽이
 * 낫다 — 상태를 물을 때 한 번만 읽으면 되고, 그것이 SC-016에 맞는다.
 */

import type { SegmentedResume } from "./segmented/types";
import type { MetadataPort, ModelFilePort } from "./port";
import type { AssetKey, PausedDownload, VerificationVerdict } from "./types";

/**
 * 기기에 남는 것 전부.
 *
 * **모델 파일 자체는 여기 없다** — 이것은 그 파일들에 대해 아는 것이다.
 *
 * **`segmented`는 026이 더한 자리다** (data-model.md 「ModelState」). 세그먼트 병렬
 * 다운로드가 멈추면 각 구간의 받은 바이트가 여기 남아 재개의 근거가 된다. `paused`
 * (단일 스트림 재개)와 **한 자산당 상호배타** — `withSegmentedResume`가 같은 키를
 * `paused`에서 빼고, `withPaused`가 `segmented`에서 뺀다.
 *
 * **`storage.ts`는 `segmented/plan.ts`를 import하지 않는다** — 타입만 가져온다.
 * 재개 계획 계산은 `acquisition.ts`·`expo-port.ts`가 `plan.ts`를 불러 한다.
 */
export type ModelState = {
  verdicts: VerificationVerdict[];
  paused: PausedDownload[];
  segmented: SegmentedResume[];
};

const EMPTY: ModelState = { verdicts: [], paused: [], segmented: [] };

/**
 * 메타데이터를 읽는다.
 *
 * **읽을 수 없으면 빈 상태로 다룬다.** 깨진 파일을 오류로 만들면 앱이 아예 뜨지 못하고,
 * 그보다는 "검증 기록이 없다"로 다루는 편이 낫다 — 그 경우 준비 상태가 `unusable`이 되어
 * 다시 검증하면 되고, **모델 파일을 다시 받을 필요는 없다**(정리와 재검증은 다른 일이다).
 * 002의 `fileStore.load`가 읽을 수 없는 파일을 null로 다룬 것과 같은 판단이다.
 */
export async function readState(metadata: MetadataPort): Promise<ModelState> {
  const raw = await metadata.read();
  if (raw === null) return EMPTY;

  try {
    const parsed = JSON.parse(raw) as Partial<ModelState>;
    return {
      verdicts: Array.isArray(parsed.verdicts) ? parsed.verdicts : [],
      paused: Array.isArray(parsed.paused) ? parsed.paused : [],
      // **옛 `state.json`에 `segmented` 키가 없어도 안전** — 없거나 깨지면 빈 배열.
      // 003의 다른 필드와 동형이며 마이그레이션이 필요 없다(data-model.md).
      // 113 — 형태가 맞지 않는 항목(옛 `receivedBytes` 형식 포함)은 버린다.
      segmented: Array.isArray(parsed.segmented) ? parsed.segmented.filter(isSegmentedResume) : [],
    };
  } catch {
    return EMPTY;
  }
}

const isPositiveInteger = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0;

/**
 * `segmented` 항목의 **형태**를 본다 (113, data-model.md).
 *
 * `totalBytes`·`segmentCount`는 양의 정수이고 `doneIndices`는 오름차순·중복 없는 정수로
 * 각각 `0 <= i < segmentCount`다. **`planSegments`와 구간 수가 맞는지는 보지 않는다** —
 * 이 파일은 `segmented/plan.ts`를 import하지 않는다(위 머리 주석). 그것은 재개 전에
 * `resume.ts`가 본다.
 */
function isSegmentedResume(value: unknown): value is SegmentedResume {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<SegmentedResume>;
  if (typeof entry.assetKey !== "string") return false;
  if (!isPositiveInteger(entry.totalBytes) || !isPositiveInteger(entry.segmentCount)) return false;
  const { doneIndices, segmentCount } = entry;
  if (!Array.isArray(doneIndices)) return false;
  return doneIndices.every(
    (index, position) =>
      Number.isInteger(index) &&
      index >= 0 &&
      index < segmentCount &&
      (position === 0 || index > doneIndices[position - 1]),
  );
}

/**
 * 메타데이터를 쓴다.
 *
 * **원자적이어야 한다**(contracts/storage.md). 쓰다 죽으면 검증 결과 전체를 잃고, 그러면
 * 모든 캐릭터가 `ready`가 아니게 된다. 실제 원자성은 `port.ts` 구현이 맡는다 — 002의
 * `writeAtomically`와 같은 방식이다.
 */
export async function writeState(metadata: MetadataPort, state: ModelState): Promise<void> {
  await metadata.writeAtomically(JSON.stringify(state));
}

/** `MetadataPort`마다 하나씩 있는 쓰기 줄. 같은 포트로 가는 읽기-바꾸기-쓰기를 한 줄로 세운다. */
const writeQueues = new WeakMap<MetadataPort, Promise<void>>();

/**
 * `state.json`을 **읽고 바꿔 쓴다** — 같은 `MetadataPort`에 대한 호출은 한 줄로 선다 (113, FR-005).
 *
 * 구간 둘이 거의 동시에 끝나면 `readState → 바꾸기 → writeState`가 겹쳐 한쪽 구간 기록이
 * 지워진다. `state.json`을 쓰는 자리는 전부 이 함수를 지난다(받기·검증·사진 모델). 앞 호출이
 * 던져도 줄은 이어진다 — 그 오류는 그 호출자에게만 간다.
 *
 * **같은 파일을 쓰는 `MetadataPort`는 프로세스에 하나여야 한다** — 줄이 포트 객체별이라 통로가 둘이면
 * 보장이 사라진다(`expoMetadataPort()`가 하나를 돌려준다, `resumable-contract.test.ts`가 잠근다).
 */
export function mutateState(
  metadata: MetadataPort,
  change: (state: ModelState) => ModelState,
): Promise<void> {
  const previous = writeQueues.get(metadata) ?? Promise.resolve();
  const run = previous.then(async () => {
    await writeState(metadata, change(await readState(metadata)));
  });
  // 줄에는 성공·실패와 무관하게 「끝남」만 남긴다.
  writeQueues.set(
    metadata,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

/** 이 자산의 검증 결과. 없으면 null */
export function verdictFor(state: ModelState, key: AssetKey): VerificationVerdict | null {
  return state.verdicts.find((verdict) => verdict.assetKey === key) ?? null;
}

/** 이 자산의 중단된 내려받기. 없으면 null */
export function pausedFor(state: ModelState, key: AssetKey): PausedDownload | null {
  return state.paused.find((entry) => entry.assetKey === key) ?? null;
}

/** 이 자산의 세그먼트 재개 상태. 없으면 null (026) */
export function segmentedFor(state: ModelState, key: AssetKey): SegmentedResume | null {
  return state.segmented.find((entry) => entry.assetKey === key) ?? null;
}

/** 검증 결과를 갈아 끼운다. 한 자산에 결과는 하나다. */
export function withVerdict(state: ModelState, verdict: VerificationVerdict): ModelState {
  return {
    ...state,
    verdicts: [...state.verdicts.filter((v) => v.assetKey !== verdict.assetKey), verdict],
  };
}

/**
 * 중단 상태를 갈아 끼운다. 한 자산에 하나다.
 *
 * **같은 자산의 세그먼트 재개 상태를 함께 제거한다** (026, 상호배타) — 한 자산은
 * `paused`나 `segmented` 중 한 곳에만 있는다.
 */
export function withPaused(state: ModelState, entry: PausedDownload): ModelState {
  return {
    ...state,
    paused: [...state.paused.filter((p) => p.assetKey !== entry.assetKey), entry],
    segmented: state.segmented.filter((s) => s.assetKey !== entry.assetKey),
  };
}

/**
 * 세그먼트 재개 상태를 갈아 끼운다. 한 자산에 하나다 (026).
 *
 * **같은 자산의 단일 스트림 중단 상태를 함께 제거한다** (상호배타).
 */
export function withSegmentedResume(state: ModelState, entry: SegmentedResume): ModelState {
  return {
    ...state,
    segmented: [...state.segmented.filter((s) => s.assetKey !== entry.assetKey), entry],
    paused: state.paused.filter((p) => p.assetKey !== entry.assetKey),
  };
}

/** 세그먼트 재개 상태만 걷어낸다 (026). */
export function withoutSegmented(state: ModelState, key: AssetKey): ModelState {
  return {
    ...state,
    segmented: state.segmented.filter((s) => s.assetKey !== key),
  };
}

/**
 * 이 자산에 대해 아는 것을 전부 지운다.
 *
 * 삭제(FR-025)와 재시작(FR-023) 양쪽이 쓴다 — 둘 다 "이 자산에 대한 기록을 없던 것으로"가
 * 필요하다.
 */
export function withoutAsset(state: ModelState, key: AssetKey): ModelState {
  return {
    verdicts: state.verdicts.filter((verdict) => verdict.assetKey !== key),
    paused: state.paused.filter((entry) => entry.assetKey !== key),
    // 026 — 세그먼트 재개 상태도 함께 지운다. 다 받았거나 다시 시작하면 유효하지 않다.
    segmented: state.segmented.filter((entry) => entry.assetKey !== key),
  };
}

/**
 * 캐릭터의 모델을 지운다.
 *
 * **무엇이 사라지는가**: 모델 파일, 부분 파일(FR-029), 검증 결과, 중단 상태.
 * **무엇이 남는가**: 그 캐릭터로 쓴 일기(FR-030), 다른 캐릭터의 무엇이든.
 *
 * **FR-030이 가장 중요하다.** 002의 `diary/`는 이 함수가 건드리지 않는다 — 일기는 되돌릴
 * 수 없는 값이고 모델은 다시 받을 수 있는 값이라 무게가 다르다.
 *
 * **FR-029(부분 파일)를 빠뜨리기 쉽다.** 남으면 공간이 실제로 비지 않고, 사용자는 지웠는데
 * 왜 공간이 그대로인지 알 수 없다(SC-008).
 */
export async function removeAsset(
  files: ModelFilePort,
  metadata: MetadataPort,
  key: AssetKey,
): Promise<void> {
  // 파일을 먼저 지운다. 기록만 지우고 파일이 남으면 "받지 않음"인데 공간을 먹는 상태가
  // 되어, 사용자가 지울 방법을 잃는다.
  await files.remove(key);

  await mutateState(metadata, (state) => withoutAsset(state, key));
}

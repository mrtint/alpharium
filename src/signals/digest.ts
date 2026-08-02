/**
 * T010 — 일별 집계 엔티티 (003 FR-244, data-model.md 엔티티 2)
 *
 * **열 항목이 전부이며 목록 밖의 항목을 추가하지 않는다** (003 FR-244).
 *
 * 미관측 가능 항목은 전부 `Observation`이다 — 「값이 없음」이 아니라 「관측되지
 * 않았음」을 표현할 수 있어야 한다 (001 FR-010).
 */
import {
  isObserved,
  mapObserved,
  observed,
  unobserved,
  type Observation,
} from "./observation";
import { COUNTED_FIELDS, ScaleVerdict } from "./scale";

/** 사진 항목 — 시각대·장소·캡션 **셋뿐**. 각각이 개별적으로 미관측일 수 있다 (003 FR-252). */
export interface PhotoItem {
  readonly period: Observation<string>;
  readonly place: Observation<string>;
  readonly caption: Observation<string>;
}

/** 일정 항목 — 제목·시간대**만** (003 FR-253). */
export interface CalendarItem {
  readonly title: string;
  readonly period: Observation<string>;
}

/** 머문 장소 — 장소 표현 + 시간대의 쌍. 좌표·경로를 담지 않는다 (003 FR-249). */
export interface StayItem {
  readonly place: string;
  readonly period: Observation<string>;
}

export interface DailyDigest {
  /** 집계가 귀속되는 로컬 날짜. 항상 존재한다. */
  readonly date: string;
  /** 이 집계가 만들어진 시각. 항상 존재한다. */
  readonly observedAt: string;
  /** 0시부터 관측 시점까지 누적 (003 FR-247). */
  readonly steps: Observation<number>;
  /** 시간대 목록. 분 단위 로그 금지 (003 FR-248). */
  readonly activePeriods: Observation<readonly string[]>;
  /** 장소 표현 + 시간대의 쌍 (003 FR-249). */
  readonly stays: Observation<readonly StayItem[]>;
  /** 참·거짓. 거리·속도 금지 (003 FR-251). */
  readonly moved: Observation<boolean>;
  readonly photos: Observation<readonly PhotoItem[]>;
  /** 파생 — 사진 목록이 미관측이면 함께 미관측 (003 FR-246a). */
  readonly photoCount: Observation<number>;
  readonly events: Observation<readonly CalendarItem[]>;
  /** 비어 있음 / 적음 / 보통. 항상 존재한다. */
  readonly scale: ScaleVerdict;
}

/** data-model.md 엔티티 2의 항목 목록. **이것이 전부다.** */
export const DIGEST_FIELDS = [
  "date",
  "observedAt",
  "steps",
  "activePeriods",
  "stays",
  "moved",
  "photos",
  "photoCount",
  "events",
  "scale",
] as const;

export type DigestField = (typeof DIGEST_FIELDS)[number];

/** 사진 총 개수를 제외한 입력. 개수는 목록에서 파생하므로 받지 않는다. */
export type DigestInput = Omit<DailyDigest, "photoCount">;

export function createDigest(input: DigestInput): DailyDigest {
  return {
    date: input.date,
    observedAt: input.observedAt,
    steps: input.steps,
    activePeriods: input.activePeriods,
    stays: input.stays,
    moved: input.moved,
    photos: input.photos,
    // 파생 — 목록이 미관측이면 개수도 미관측이다 (003 FR-246a).
    photoCount: mapObserved(input.photos, (list) => list.length),
    events: input.events,
    scale: input.scale,
  };
}

/** 모든 미관측 가능 항목이 미관측인 집계. 전 소스 권한 거부에서도 산출된다 (003 FR-217). */
export function emptyDigestFor(date: string, observedAt: string): DailyDigest {
  return createDigest({
    date,
    observedAt,
    steps: unobserved(),
    activePeriods: unobserved(),
    stays: unobserved(),
    moved: unobserved(),
    photos: unobserved(),
    events: unobserved(),
    scale: ScaleVerdict.Empty,
  });
}

const isObservation = (v: unknown): v is Observation<unknown> =>
  typeof v === "object" &&
  v !== null &&
  ((v as { status?: unknown }).status === "observed" ||
    (v as { status?: unknown }).status === "unobserved");

/** 목록 밖의 항목이 섞이면 집계로 인정하지 않는다 (003 FR-244). */
export function isDigest(value: unknown): value is DailyDigest {
  if (typeof value !== "object" || value === null) return false;

  const keys = Object.keys(value).sort();
  if (keys.length !== DIGEST_FIELDS.length) return false;
  if (keys.join(",") !== [...DIGEST_FIELDS].sort().join(",")) return false;

  const d = value as Record<DigestField, unknown>;
  if (typeof d.date !== "string" || typeof d.observedAt !== "string") return false;
  if (!Object.values(ScaleVerdict).includes(d.scale as ScaleVerdict)) return false;

  return (["steps", "activePeriods", "stays", "moved", "photos", "photoCount", "events"] as const).every(
    (f) => isObservation(d[f]),
  );
}

/**
 * 규모 판정이 세는 여섯 항목 (003 FR-272). 정의는 `scale.ts`에 있고 여기서는 다시
 * 내보내기만 한다 — 집계 항목의 부분집합임을 아래 타입 검사가 보장한다.
 */
export { COUNTED_FIELDS };

// COUNTED_FIELDS의 여섯이 모두 집계 항목이어야 한다 (003 FR-272).
const _countedAreDigestFields: readonly DigestField[] = COUNTED_FIELDS;
void _countedAreDigestFields;

/** 여섯 항목 중 관측된 것의 수. 내용·값의 크기는 관여하지 않는다 (003 FR-271). */
export function countObservedFields(digest: Pick<DailyDigest, (typeof COUNTED_FIELDS)[number]>): number {
  // 항목마다 담는 값의 타입이 다르므로 관측 여부만 본다 — 값에는 손대지 않는다.
  return COUNTED_FIELDS.filter((f) => isObserved<unknown>(digest[f])).length;
}

export { observed, unobserved };

/**
 * T025 — 집계 산출기 (003 FR-257·FR-260·FR-261)
 * T029 — 집계 생성 실패 처리 (003 FR-265)
 *
 * **생성 요청 시점에** 만든다 — 상시 수집하지 않는다 (003 FR-260). 이 함수가 불릴
 * 때에만 소스를 읽으며, 읽은 결과는 집계로 정제된 뒤 버려진다. 중간 결과물을 밖으로
 * 남기지 않는다 (003 FR-255).
 *
 * 소스가 계약 밖의 값(원시 로그·좌표·사진 경로 등)을 흘려보내도 **항목을 하나씩 골라
 * 옮기므로** 집계에 자리를 얻지 못한다. 저장 시점 걸러내기가 아니라 산출 시점의 구조가
 * 보장한다.
 */
import { createDigest, type DailyDigest, type PhotoItem, type StayItem, type CalendarItem } from "./digest";
import { mapObserved, type Observation } from "./observation";
import { judgeScale, ScaleVerdict, type ScaleParams } from "./scale";
import { applyLimit, type DigestParams } from "./digest-params";
import type {
  ActivityReading,
  CalendarReading,
  CollectionWindow,
  LocationReading,
  PhotoReading,
} from "./sources/source";
import { log } from "../logging";

export interface SourceReaders {
  activity(window: CollectionWindow): Promise<ActivityReading>;
  location(window: CollectionWindow): Promise<LocationReading>;
  photo(window: CollectionWindow): Promise<PhotoReading>;
  calendar(window: CollectionWindow): Promise<CalendarReading>;
}

export interface BuildParams {
  readonly digest: DigestParams;
  readonly scale: ScaleParams;
}

/**
 * 집계 생성 실패 (003 FR-265).
 *
 * 실패 시 **추론을 시도하지 않고 부분 집계를 쓰지 않는다** — 이 오류가 던져지면
 * 생성 흐름이 거기서 끝나고 사용자에게 알려진다 (006 FR-528).
 */
export class DigestBuildError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DigestBuildError";
  }
}

/** 항목을 하나씩 골라 옮긴다 — 소스가 덧붙인 값은 여기서 걸러지는 게 아니라 자리가 없다. */
const toStay = (s: StayItem): StayItem => ({ place: s.place, period: s.period });
const toPhoto = (p: PhotoItem): PhotoItem => ({
  period: p.period,
  place: p.place,
  caption: p.caption,
});
const toEvent = (e: CalendarItem): CalendarItem => ({ title: e.title, period: e.period });

const limited = <T>(
  o: Observation<readonly T[]>,
  limit: number | null,
  pick: (item: T) => T,
): Observation<readonly T[]> => mapObserved(o, (list) => applyLimit(list, limit).map(pick));

export async function buildDigest(
  window: CollectionWindow,
  readers: SourceReaders,
  params: BuildParams,
): Promise<DailyDigest> {
  let activity: ActivityReading;
  let location: LocationReading;
  let photo: PhotoReading;
  let calendar: CalendarReading;

  try {
    // 요청 시점에 읽는다. 권한 거부는 소스가 미관측으로 돌려주므로 여기서 갈리지 않는다.
    [activity, location, photo, calendar] = await Promise.all([
      readers.activity(window),
      readers.location(window),
      readers.photo(window),
      readers.calendar(window),
    ]);
  } catch (error) {
    // 부분 집계를 쓰지 않는다 (003 FR-265). 추론은 시도되지 않는다.
    log.error("집계 생성 실패", { date: window.date });
    throw new DigestBuildError("집계를 만들지 못했다", { cause: error });
  }

  const counted = {
    steps: activity.steps,
    activePeriods: limited(activity.activePeriods, params.digest.maxActivePeriods, (p) => p),
    stays: limited(location.stays, params.digest.maxStays, toStay),
    moved: location.moved,
    photos: limited(photo.photos, params.digest.maxPhotos, toPhoto),
    events: limited(calendar.events, params.digest.maxEvents, toEvent),
  };

  return createDigest({
    date: window.date,
    observedAt: window.observedAt.toISOString(),
    ...counted,
    scale: judgeScale(counted, params.scale),
  });
}

export { ScaleVerdict };

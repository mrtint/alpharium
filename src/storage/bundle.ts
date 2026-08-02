/**
 * T012 — 기록 묶음 (005 FR-410·FR-402, 001 FR-030·FR-032·FR-034)
 *
 * 005 FR-410이 조작 단위를 **일기 하나나 집계 하나가 아니라 「기록 묶음」**으로 두었다.
 * 짝의 유지를 경로마다 방어하는 대신 **구조로 보장**한다.
 *
 * **원본 로그를 담을 자리가 존재하지 않는다** (005 FR-402). 저장 시점에 걸러내는 것으로
 * 대신하지 않는다 — 담을 자리 자체를 두지 않는 것이 구조적 보장이다.
 *
 * **가시성 상태를 구조에 포함한다.** 소프트 삭제 동작 자체는 US5 범위 밖이나, 조회가
 * 「보이는 기록」을 전제하고(005 FR-470) 001 FR-030이 숨겨진 기록과 보이는 기록의 같은
 * 날짜 공존을 허용하므로 **자리는 지금 있어야 한다** — 나중에 고칠 수 없는 구조다.
 */
import { isDiaryEntry, type DiaryEntry } from "../inference/diary";
import { isDigest, type DailyDigest } from "../signals/digest";

export enum Visibility {
  Visible = "visible",
  Hidden = "hidden",
}

export interface RecordBundle {
  readonly diary: DiaryEntry;
  readonly digest: DailyDigest;
  readonly visibility: Visibility;
}

/** 묶음의 항목 목록. **이것이 전부다** — 원본 로그의 자리가 없다. */
export const BUNDLE_FIELDS = ["diary", "digest", "visibility"] as const;

export interface BundleInput {
  readonly diary: DiaryEntry;
  readonly digest: DailyDigest;
  readonly visibility?: Visibility;
}

export function createBundle(input: BundleInput): RecordBundle {
  if (input.diary.date !== input.digest.date) {
    throw new Error(
      `일기와 집계의 날짜가 다르면 묶음이 성립하지 않는다: ${input.diary.date} ≠ ${input.digest.date}`,
    );
  }
  // 셋만 옮긴다 — 넘어온 객체를 펼치지 않으므로 계약 밖의 값은 자리를 얻지 못한다.
  return {
    diary: input.diary,
    digest: input.digest,
    visibility: input.visibility ?? Visibility.Visible,
  };
}

export function isBundle(value: unknown): value is RecordBundle {
  if (typeof value !== "object" || value === null) return false;

  const keys = Object.keys(value).sort();
  if (keys.join(",") !== [...BUNDLE_FIELDS].sort().join(",")) return false;

  const b = value as Record<(typeof BUNDLE_FIELDS)[number], unknown>;
  return (
    isDiaryEntry(b.diary) &&
    isDigest(b.digest) &&
    Object.values(Visibility).includes(b.visibility as Visibility)
  );
}

export function isVisible(bundle: RecordBundle): boolean {
  return bundle.visibility === Visibility.Visible;
}

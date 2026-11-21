/**
 * 121 — 하루의 자리 목록을 일기 기록의 장소 항목과 저장할 자리로 옮긴다.
 *
 * 계약: specs/121-richer-day-places/data-model.md 「PromptPlace」·「SavedPlace」, spec FR-005·FR-007
 *
 * **순수 함수만 둔다** — 시각은 자리에 이미 들어 있는 것만 읽는다(`buildPrompt()`가 결정적이어야 하므로, 005 P6).
 */

import type { PlaceCategory } from "../signals/place-index";
import type { PlaceName } from "../signals/place-names";
import type { PlaceVisit } from "../signals/types";

/** 오전·오후·저녁·밤 — 기록이 사진 시각에 쓰는 때 이름 넷과 같은 구간(`prompt.ts` `partOf`, 061) */
export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

/** 장소 항목 하나. `label: null`은 「이름을 모르는 곳」 — 데이터에서 찾았지만 이름 붙은 곳이 없었다 */
export type PromptPlace = { period: DayPeriod; label: string | null };

/** 일기 기록에 싣는 장소 — 시각순 최대 세 항목과 넘친 수 */
export type PromptPlaces = { items: PromptPlace[]; more: number };

/** 저장되는 자리(`DiaryEntry.places`). 좌표는 담지 않는다(research R9) */
export type SavedPlace = {
  label: string | null;
  category: PlaceCategory | null;
  firstSeenAt: string;
  lastSeenAt: string;
  photoCount: number;
};

/** 싣는 항목 수 상한 — 소유자 결정(2026-11-21, 하루 최대 세 곳) */
export const MAX_PROMPT_PLACES = 3;

/**
 * 시(hour) → 때. **구간은 사람이 정한 값이다**(헌법 원칙 V) — 기록의 사진 시각 줄과 같은 넷을 쓴다.
 * 오전 0–11 · 오후 12–17 · 저녁 18–20 · 밤 21–23.
 */
export function dayPeriodOf(at: Date): DayPeriod {
  return dayPeriodOfHour(at.getHours());
}

/** 시(0–23) → 때. 구간 규칙은 여기 하나다 — `prompt.ts`의 사진 시각 줄도 이것을 쓴다(코드 리뷰: 복제 제거) */
export function dayPeriodOfHour(h: number): DayPeriod {
  return h < 12 ? "morning" : h < 18 ? "afternoon" : h < 21 ? "evening" : "night";
}

function labelOf(name: PlaceName | undefined): string | null {
  return name !== undefined && name.kind === "known" ? name.label : null;
}

/**
 * 자리 목록과 그 이름들(같은 순서) → 장소 항목.
 *
 * - 연이은 같은 이름을 하나로 합친다 — 연이은 이름 없는 자리도(FR-007). 항목의 때는 그 묶음 첫 자리의 때다.
 * - 합친 뒤 시각순 첫 세 항목, 나머지는 수만(FR-005).
 * - 이름이 모두 `unknown`이면(데이터를 읽지 못했다) 싣지 않는다 — 「이름을 모르는 곳」은 데이터에서 찾았지만
 *   없다는 뜻이라 섞지 않는다(원칙 V). 자리가 없어도 싣지 않는다.
 */
export function buildPromptPlaces(
  visits: readonly PlaceVisit[],
  names: readonly PlaceName[],
): PromptPlaces | undefined {
  if (visits.length === 0) return undefined;
  if (names.length > 0 && names.every((n) => n.kind === "unknown")) return undefined;

  const merged: PromptPlace[] = [];
  visits.forEach((visit, i) => {
    const label = labelOf(names[i]);
    const last = merged[merged.length - 1];
    if (last !== undefined && last.label === label) return;
    merged.push({ period: dayPeriodOf(visit.firstSeenAt), label });
  });

  return {
    items: merged.slice(0, MAX_PROMPT_PLACES),
    more: Math.max(0, merged.length - MAX_PROMPT_PLACES),
  };
}

/**
 * 저장할 자리 — 합치기 전 자리 전부를 시각순으로. 이름이 없으면(설정 「끔」이라 찾지 않았거나 `none`·`unknown`)
 * 이름 칸은 `null`이다(data-model SavedPlace).
 */
export function savedPlacesOf(
  visits: readonly PlaceVisit[],
  names: readonly PlaceName[] = [],
): SavedPlace[] {
  return visits.map((visit, i) => {
    const name = names[i];
    const isKnown = name !== undefined && name.kind === "known";
    return {
      label: isKnown ? name.label : null,
      category: isKnown ? name.category : null,
      firstSeenAt: visit.firstSeenAt.toISOString(),
      lastSeenAt: visit.lastSeenAt.toISOString(),
      photoCount: visit.photoCount,
    };
  });
}

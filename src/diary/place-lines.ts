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

/**
 * 저장되는 자리(`DiaryEntry.places`).
 *
 * **126부터 좌표를 담는다**(소유자 결정 2026-11-22 — 사진을 지우면 동선 지도가 사라지는 것은 안 된다, 121 R9의 「좌표 저장 안 함」을
 * 뒤집었다). `latE5`·`lonE5`는 그 자리 첫 사진 좌표의 위·경도를 1e-5도(약 1m) 정수로 반올림한 값이며 **함께 있거나 함께 없다**.
 * **옛 일기(126 이전)에는 없다** — 화면은 그때 사진 좌표를 다시 읽는다(`app/day-route.ts`). 일기를 쓸 때만 채우고 열어 보는 동작은
 * 쓰지 않는다. 일기 글·프롬프트에는 좌표가 들어가지 않는다(원칙 II).
 */
export type SavedPlace = {
  label: string | null;
  category: PlaceCategory | null;
  firstSeenAt: string;
  lastSeenAt: string;
  photoCount: number;
  latE5?: number;
  lonE5?: number;
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
 * 이름 칸은 `null`이다(data-model SavedPlace). 좌표는 이름 설정과 무관하게 담는다(126).
 */
export function savedPlacesOf(
  visits: readonly PlaceVisit[],
  names: readonly PlaceName[] = [],
): SavedPlace[] {
  return visits.map((visit, i) => {
    const name = names[i];
    const isKnown = name !== undefined && name.kind === "known";
    const { latitude, longitude } = visit.coordinate;
    // 유한하지 않은 좌표는 두 필드를 모두 담지 않는다 — NaN을 저장하지 않는다(원칙 V, 126 DM20)
    const coordinate =
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latE5: Math.round(latitude * 1e5), lonE5: Math.round(longitude * 1e5) }
        : {};
    return {
      label: isKnown ? name.label : null,
      category: isKnown ? name.category : null,
      firstSeenAt: visit.firstSeenAt.toISOString(),
      lastSeenAt: visit.lastSeenAt.toISOString(),
      photoCount: visit.photoCount,
      ...coordinate,
    };
  });
}

/**
 * 135 — 사진 하나가 속한 자리의 순번(0부터, `savedPlacesOf`가 만드는 `entry.places`와 같은 순서). 어느 자리에도 묶이지 않았으면
 * (좌표가 없던 사진) `null`이다 — 시각으로 짐작하지 않는다(원칙 V).
 */
export function placeIndexOf(visits: readonly PlaceVisit[], photoId: string): number | null {
  const i = visits.findIndex((v) => v.photoIds.includes(photoId));
  return i === -1 ? null : i;
}

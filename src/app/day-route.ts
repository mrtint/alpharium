/**
 * 쓴 날 일기 화면의 동선 도식 모델 (125).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DR1~DR9, data-model.md
 *
 * ───────────────────────────────────────────────
 * **이 변환이 좌표가 화면으로 가는 유일한 길이다**(FR-004, `day-preview.ts` DP6의 같은 경계). 자리의 절대
 * 좌표(위도·경도)는 여기서 0~1 **상대 위치**로 바뀌고, 반환 모양에는 남지 않는다. 화면은 점과 선을 그릴
 * 뿐이며 어디였는지는 모른다.
 *
 * **저장하지 않는다**(FR-007). 쓴 날 지면을 열 때 그 날의 사진 좌표를 다시 읽고(`wiring.routeDay`), 저장된
 * `entry.places`(이름·때, 좌표 없음)와 합친다. 121 코드 리뷰(R9)가 하루 동선 좌표를 백업되는 일기 파일에
 * 늘리지 않기로 했다.
 *
 * **모르는 것을 채우지 않는다**(원칙 V, FR-012). 다시 읽지 못했거나(`null`) 자리 수가 저장된 자리와 다르면
 * (사진을 지웠거나 더했다) 도식을 만들지 않고 저장된 이름·때 목록만 낸다 — 어긋난 채 합치면 이름과 위치가
 * 엉킨다. 모든 점이 100m 안에 겹치면(퇴화) 번호 점이 한 곳에 쌓여 아무것도 말하지 않으므로 역시 목록만 낸다.
 *
 * **이 파일은 순수하다** — 시각·파일·기기·네트워크를 읽지 않는다(`dayPeriodOf`는 주어진 시각만 읽는다).
 * ───────────────────────────────────────────────
 */

import { dayPeriodOf, type DayPeriod, type SavedPlace } from "../diary/place-lines";
import { distanceMeters, SAME_PLACE_METERS } from "../signals/places";
import type { PlaceVisit } from "../signals/types";

/**
 * 도식과 목록에 싣는 자리 수의 상한. **사람이 정한 값이다**(헌법 원칙 V, 측정이 아니다) — 신호 수집에는 사진
 * 상한이 없어(012) 자리가 수십 곳일 수 있고, 번호·범례가 읽히는 한도로 잡았다. 넘으면 `more`가 말한다.
 */
export const MAX_ROUTE_ITEMS = 12;

/**
 * 도식 상자의 세로/가로 비율. **사람이 정한 값이다**(보드 밖 초안) — 투영(여기)과 그림(`DayRouteSection`)이 **같은 값**을
 * 써야 가로세로 비율이 유지된다(DR7). 그림 쪽은 이 상수를 가져다 쓴다 — 정본은 여기 하나다. 위치 `x`는 폭 기준, `y`는 높이
 * (`폭 × ROUTE_ASPECT`) 기준 0~1이다.
 */
export const ROUTE_ASPECT = 0.62;

/**
 * 도식 안쪽 여백(0~1 상자의 한 변 비율). **사람이 정한 값이다**(보드 밖 초안) — 점이 상자 가장자리에 붙어
 * 잘려 보이지 않게 한다.
 */
export const ROUTE_MARGIN = 0.1;

/** 범례·점 한 항목. 절대 좌표는 없다. `x`·`y`는 도식일 때만 있다(0~1, 북쪽이 위라 `y`가 작을수록 북쪽) */
export type RouteItem = {
  /** 시간순 번호(1부터) */
  n: number;
  /** 저장된 `firstSeenAt`을 일기 글과 같은 때 이름으로 옮긴 것 */
  period: DayPeriod;
  /** 저장된 이름. `null`이면 이름을 모르는 곳이다 — 화면이 「이름을 모르는 곳」으로 적고 지어내지 않는다 */
  label: string | null;
  x?: number;
  y?: number;
};

/** 칸 하나. `diagram`이 `true`이면 모든 항목에 `x`·`y`가 있고 점·선을 그린다. `false`면 범례 목록만이다 */
export type DayRoute = {
  /** 시간순 앞 `MAX_ROUTE_ITEMS`곳까지 */
  items: RouteItem[];
  /** 상한 밖의 자리 수 — 0이면 「외 N곳」 줄이 없다 */
  more: number;
  diagram: boolean;
};

/**
 * 저장된 자리와 다시 읽은 자리로 칸을 만든다. 칸이 없으면(`null`) 지면에 「하루 동선」이 없다.
 *
 * @param visits 쓴 날 지면을 열 때 다시 읽은 자리 목록(시각순). 읽지 못했으면 `null`
 * @param saved 일기에 저장된 자리(`entry.places`, 시각순). 없으면 `undefined`
 */
export function buildDayRoute(
  visits: readonly PlaceVisit[] | null,
  saved: readonly SavedPlace[] | undefined,
): DayRoute | null {
  if (saved === undefined || saved.length === 0) return null;

  const shownSaved = saved.slice(0, MAX_ROUTE_ITEMS);
  const more = saved.length - shownSaved.length;
  const listItems: RouteItem[] = shownSaved.map((place, i) => ({
    n: i + 1,
    period: dayPeriodOf(new Date(place.firstSeenAt)),
    label: place.label,
  }));
  const list: DayRoute = { items: listItems, more, diagram: false };

  // 한 곳은 이을 선이 없다. 읽지 못했거나 어긋나면 합치지 않는다 — 수 검사는 자르기 전 전체 수다.
  if (saved.length < 2 || visits === null || !sameVisits(visits, saved)) return list;

  const shownVisits = visits.slice(0, MAX_ROUTE_ITEMS);
  const positions = project(shownVisits.map((visit) => visit.coordinate));
  if (positions === null) return list;

  return {
    items: listItems.map((item, i) => ({ ...item, x: positions[i]!.x, y: positions[i]!.y })),
    more,
    diagram: true,
  };
}

/**
 * 다시 읽은 자리와 저장된 자리가 **같은 자리들인가**(원칙 V). 수가 같고, 자리마다 처음 시각과 사진 수가 같아야 한다.
 * 수만 보면 사진을 지우고 다른 사진이 더해져 수는 그대로인데 자리가 달라진 경우를 못 거른다 — 그때 합치면 이름과 위치가
 * 엉킨다. 두 값은 저장된 자리에 이미 있다(`savedPlacesOf`). 시각이 깨져 있으면(`NaN`) 같지 않다.
 * **보수적으로 거른다**: 쓴 뒤 같은 자리에 사진을 더해도 사진 수가 달라져 도식 대신 저장된 목록만 남는다 — 의도다(모르면 그리지 않는다).
 */
function sameVisits(visits: readonly PlaceVisit[], saved: readonly SavedPlace[]): boolean {
  return (
    visits.length === saved.length &&
    visits.every(
      (visit, i) =>
        visit.firstSeenAt.getTime() === new Date(saved[i]!.firstSeenAt).getTime() &&
        visit.photoCount === saved[i]!.photoCount,
    )
  );
}

type Position = { x: number; y: number };
type Point = { latitude: number; longitude: number };

/**
 * 좌표를 도식 상자(폭 1 × 높이 `ROUTE_ASPECT`)의 0~1 위치로 옮긴다. 퇴화(모든 점이 100m 안에 겹침)면 `null`.
 *
 * 위도 중간값의 `cos`로 경도 차를 줄인 등각 평면을 쓴다 — 한국 일상 범위(수 m~수십 km)에서 충분하고 외부
 * 투영 라이브러리가 필요 없다(경도 평균 방식이라 안티메리디안·극지방에서는 맞지 않는다 — 이 앱의 범위 밖이다).
 * **가로세로 비율을 유지한다**: 한 축 한 칸의 화면 길이가 같도록 가로·세로에 같은 배율을 쓰고, 상자가 가로로 긴 만큼
 * (`ROUTE_ASPECT`) 세로 칸을 좁게 계산한다 — 그렇지 않고 정사각 상자에서 맞춘 값을 가로로 긴 상자에 그리면 세로가
 * 눌린다. 배율은 두 변 모두 안쪽 여백(`ROUTE_MARGIN`) 안에 들어가는 쪽으로 정하고 남는 변은 가운데에 놓는다. 북쪽이 위라
 * `y`는 위도가 클수록 작다. **보이는 앞 12곳만** 본다 — 그 밖은 그리지 않으므로 퇴화 검사·배율에도 넣지 않는다.
 */
function project(points: readonly Point[]): Position[] | null {
  if (points.length < 2) return null;
  if (maxPairDistance(points) <= SAME_PLACE_METERS) return null;

  const meanLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const cosLat = Math.cos((meanLat * Math.PI) / 180);
  const xs = points.map((p) => p.longitude * cosLat);
  const ys = points.map((p) => p.latitude);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  if (!(span > 0)) return null;

  // 폭 단위 배율 `scale`: 가로는 폭 `1 − 2m`, 세로는 높이 `ROUTE_ASPECT × (1 − 2m)` 안에 든다
  const room = 1 - 2 * ROUTE_MARGIN;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = Math.min(
    spanX > 0 ? room / spanX : Infinity,
    spanY > 0 ? (room * ROUTE_ASPECT) / spanY : Infinity,
  );
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return points.map((_, i) => ({
    x: clamp01(0.5 + (xs[i]! - midX) * scale),
    y: clamp01(0.5 - ((ys[i]! - midY) * scale) / ROUTE_ASPECT),
  }));
}

/** 가장 먼 두 점의 거리(m). 점은 최대 `MAX_ROUTE_ITEMS`개라 모든 쌍을 본다 */
function maxPairDistance(points: readonly Point[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, distanceMeters(points[i]!, points[j]!));
    }
  }
  return max;
}

/** 부동소수 오차가 `[0,1]`을 아주 조금 넘지 않게 한다 */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

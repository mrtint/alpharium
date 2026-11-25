/**
 * 쓴 날 일기 화면의 동선 도식 모델 (125·126).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DR1~DR9(126이 DR2·DR4·DR6을 대체한다),
 *       specs/126-route-map-illustration/contracts/day-map.md DM1~DM7, DM16, data-model.md
 *
 * ───────────────────────────────────────────────
 * **이 변환이 좌표가 화면으로 가는 유일한 길이다**(FR-004, `day-preview.ts` DP6의 같은 경계). 자리의 절대
 * 좌표(위도·경도)는 여기서 0~1 **상대 위치**로 바뀌고, 지도 선·면도 같은 상자의 정수 경로 문자열로 바뀐다(`src/map/render.ts`).
 * 반환 모양에는 위경도가 남지 않는다. 화면은 점·선·지도를 그릴 뿐 어디였는지는 모른다.
 *
 * **자리 좌표의 출처**(126, 소유자 결정 2026-11-22 — 사진을 지워도 지도가 남아야 한다):
 *  - (a) 저장된 `entry.places`의 모든 자리에 `latE5`·`lonE5`가 있으면 그것을 쓴다. 사진·사진 권한을 읽지 않는다.
 *  - (b) 옛 일기(126 이전)는 좌표가 없다. 쓴 날 지면을 열 때 다시 읽은 사진 좌표(`visits`)가 저장된 자리와 같은 자리들일 때만
 *    쓴다(125 그대로). 열 때 일기 파일을 고쳐 쓰는 이행은 하지 않는다.
 *
 * **모르는 것을 채우지 않는다**(원칙 V, FR-012). (a)도 (b)도 아니면(`visits`가 `null`이거나 수·시각·사진 수가 저장된 자리와
 * 다르다 — 사진을 지웠거나 더했다) 도식을 만들지 않고 저장된 이름·때 목록만 낸다 — 어긋난 채 합치면 이름과 위치가 엉킨다.
 * 자리가 1곳이거나 모두 가까이 몰려도(125는 목록만 냈다) 도식·지도를 그린다 — 상자 폭이 최소 `MIN_FRAME_METERS`이기 때문이다.
 *
 * **이 파일은 순수하다** — 시각·파일·기기·네트워크를 읽지 않는다(`dayPeriodOf`는 주어진 시각만 읽는다, 지도 파일은 이미 읽은
 * `MapIndex`로 받는다).
 * ───────────────────────────────────────────────
 */

import { dayPeriodOf, type DayPeriod, type SavedPlace } from "../diary/place-lines";
import type { MapIndex } from "../map/map-file";
import type { PlaceVisit } from "../signals/types";
import { renderRouteMap } from "./day-map";
import type { RouteMap } from "./day-map";

/** 화면이 `RouteMap` 타입을 `src/map/`이 아니라 여기서 가져온다(`src/ui/`는 `src/map/`을 import하지 못한다, DM16) */
export type { RouteMap };

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

/**
 * 도식 상자의 최소 폭(미터, 126 DM2). **사람이 정한 값이다**(헌법 원칙 V, 측정이 아니다) — 자리가 1곳이거나 100m 안에 몰려도
 * 점이 한 곳에 쌓이지 않고 주변 길이 보이는 폭이다(모형 2026-11-22). 자리들이 여백 안에 들어가는 폭이 이보다 넓으면 영향이 없다.
 */
export const MIN_FRAME_METERS = 600;

/** 지도 경로의 좌표 상자. 폭 1000 × 높이 `1000 × ROUTE_ASPECT`(`RouteMap.box`) */
const MAP_BOX = { w: 1000, h: Math.round(1000 * ROUTE_ASPECT) };

/** 1도 = 111.32km(위도 37.5 부근 경도는 cos(위도)로 줄인다) — 상자 폭(미터)과 최소 폭 환산에 쓴다 */
const METERS_PER_DEGREE = 111_320;

/** 범례·점 한 항목. 절대 좌표는 없다. `x`·`y`는 도식일 때만 있다(0~1, 북쪽이 위라 `y`가 작을수록 북쪽) */
export type RouteItem = {
  /** 시간순 번호(1부터) */
  n: number;
  /** 저장된 `firstSeenAt`을 일기 글과 같은 때 이름으로 옮긴 것 */
  period: DayPeriod;
  /** 저장된 이름. `null`이면 이름을 모르는 곳이다 — 화면이 이름 칸을 비운다(126 FR-015) */
  label: string | null;
  /** 그 자리의 사진 수 — 저장된 `photoCount`(133, 접힌 목록의 대표 자리를 고른다) */
  photos: number;
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
  /** 도식 뒤에 까는 지도(126). `diagram`일 때만 있고, 지도를 못 읽었거나 그릴 것이 없으면 없다(125 모양 그대로) */
  map?: RouteMap;
};

/**
 * 접힌 목록의 대표 자리와 숨는 자리 수. 대표는 **이름 있는 자리** 중 사진이 가장 많은 곳(같으면 번호가 작은 곳)이다 —
 * 이름만 보이므로 이름 없는 자리는 대표가 되지 못한다. 숨는 수는 상한(12곳) 밖까지 센다.
 */
export function legendSummary(route: DayRoute): { lead: string | null; hidden: number } {
  let best: RouteItem | undefined;
  for (const it of route.items) {
    if (it.label !== null && (best === undefined || it.photos > best.photos)) best = it;
  }
  const total = route.items.length + route.more;
  return best === undefined
    ? { lead: null, hidden: total }
    : { lead: best.label, hidden: total - 1 };
}

type Point = { latitude: number; longitude: number };

/**
 * 저장된 자리와 좌표 출처로 칸을 만든다. 칸이 없으면(`null`) 지면에 「하루 동선」이 없다.
 *
 * @param visits 쓴 날 지면을 열 때 다시 읽은 자리 목록(시각순). 읽지 못했거나 읽지 않았으면 `null`
 * @param saved 일기에 저장된 자리(`entry.places`, 시각순). 없으면 `undefined`
 * @param map 이미 읽은 지도 파일의 해석 결과. 못 읽었으면 `null`(지도 없이 125 모양)
 */
export function buildDayRoute(
  visits: readonly PlaceVisit[] | null,
  saved: readonly SavedPlace[] | undefined,
  map: MapIndex | null = null,
): DayRoute | null {
  if (saved === undefined || saved.length === 0) return null;

  const shownSaved = saved.slice(0, MAX_ROUTE_ITEMS);
  const more = saved.length - shownSaved.length;
  const listItems: RouteItem[] = shownSaved.map((place, i) => ({
    n: i + 1,
    period: dayPeriodOf(new Date(place.firstSeenAt)),
    label: place.label,
    photos: place.photoCount,
  }));
  const list: DayRoute = { items: listItems, more, diagram: false };

  const coordinates = coordinatesOf(visits, saved);
  if (coordinates === null) return list;

  const frame = projectFrame(coordinates.slice(0, MAX_ROUTE_ITEMS));
  const route: DayRoute = {
    items: listItems.map((item, i) => ({
      ...item,
      x: frame.positions[i]!.x,
      y: frame.positions[i]!.y,
    })),
    more,
    diagram: true,
  };
  if (map !== null) {
    const rendered = renderRouteMap(map, frame.renderFrame, frame.widthMeters, MAP_BOX);
    if (rendered !== null) route.map = rendered;
  }
  return route;
}

/**
 * 도식을 그릴 자리 좌표(시간순, 저장된 자리 수만큼). 출처는 (a) 저장된 좌표, (b) 다시 읽은 좌표 — 없으면 `null`.
 */
function coordinatesOf(
  visits: readonly PlaceVisit[] | null,
  saved: readonly SavedPlace[],
): Point[] | null {
  if (saved.every(hasStoredCoordinate)) {
    return saved.map((place) => ({ latitude: place.latE5! / 1e5, longitude: place.lonE5! / 1e5 }));
  }
  if (visits !== null && sameVisits(visits, saved)) return visits.map((visit) => visit.coordinate);
  return null;
}

/** 저장된 자리에 두 좌표 필드가 모두 있고 유한한 수인가(한쪽만 있으면 좌표 없음으로 본다) */
function hasStoredCoordinate(place: SavedPlace): boolean {
  return Number.isFinite(place.latE5) && Number.isFinite(place.lonE5);
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

type Frame = {
  positions: Position[];
  /** 상자의 가로 폭(미터, 동서) */
  widthMeters: number;
  /** 지도 렌더에 넘기는 프레임 — 위경도 범위와 투영(위경도 → 상자 0~1). **이 안에서만 쓰이고 반환 모양에 남지 않는다** */
  renderFrame: {
    minLonE5: number;
    minLatE5: number;
    maxLonE5: number;
    maxLatE5: number;
    project: (latDeg: number, lonDeg: number) => Position;
  };
};

/**
 * 좌표를 도식 상자(폭 1 × 높이 `ROUTE_ASPECT`)의 0~1 위치로 옮기고, 그 상자가 땅 위에서 덮는 범위를 함께 돌려준다.
 *
 * 위도 중간값의 `cos`로 경도 차를 줄인 등각 평면을 쓴다 — 한국 일상 범위(수 m~수십 km)에서 충분하고 외부
 * 투영 라이브러리가 필요 없다(경도 평균 방식이라 안티메리디안·극지방에서는 맞지 않는다 — 이 앱의 범위 밖이다).
 * **가로세로 비율을 유지한다**: 한 축 한 칸의 화면 길이가 같도록 가로·세로에 같은 배율을 쓰고, 상자가 가로로 긴 만큼
 * (`ROUTE_ASPECT`) 세로 칸을 좁게 계산한다. 배율은 두 변 모두 안쪽 여백(`ROUTE_MARGIN`) 안에 들어가는 쪽으로 정하되
 * **상자 폭이 `MIN_FRAME_METERS` 아래로 내려가지 않게 상한을 둔다**(126) — 한 곳·몰린 자리는 점이 가운데 근처에 놓인다.
 * 남는 변은 가운데에 놓는다. 북쪽이 위라 `y`는 위도가 클수록 작다. **보이는 앞 12곳만** 본다 — 그 밖은 그리지 않으므로 배율에도 넣지 않는다.
 */
function projectFrame(points: readonly Point[]): Frame {
  const meanLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const cosLat = Math.cos((meanLat * Math.PI) / 180);
  const xs = points.map((p) => p.longitude * cosLat);
  const ys = points.map((p) => p.latitude);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // 폭 단위 배율 `scale`: 가로는 폭 `1 − 2m`, 세로는 높이 `ROUTE_ASPECT × (1 − 2m)` 안에 든다
  const room = 1 - 2 * ROUTE_MARGIN;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const fit = Math.min(
    spanX > 0 ? room / spanX : Infinity,
    spanY > 0 ? (room * ROUTE_ASPECT) / spanY : Infinity,
  );
  // 프레임 폭(경도×cos 환산 도) = 1 / scale — 폭이 `MIN_FRAME_METERS` 아래로 내려가지 않게 배율 상한을 둔다
  const scale = Math.min(fit, METERS_PER_DEGREE / MIN_FRAME_METERS);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const toPosition = (latDeg: number, lonDeg: number): Position => ({
    x: clamp01(0.5 + (lonDeg * cosLat - midX) * scale),
    y: clamp01(0.5 - ((latDeg - midY) * scale) / ROUTE_ASPECT),
  });

  // 상자 네 모서리가 땅 위에서 닿는 범위(1e-5도) — 지도 칸을 고르는 데 쓴다
  const west = (midX - 0.5 / scale) / cosLat;
  const east = (midX + 0.5 / scale) / cosLat;
  const south = midY - (0.5 * ROUTE_ASPECT) / scale;
  const north = midY + (0.5 * ROUTE_ASPECT) / scale;

  return {
    positions: points.map((p) => toPosition(p.latitude, p.longitude)),
    widthMeters: METERS_PER_DEGREE / scale,
    renderFrame: {
      minLonE5: Math.floor(west * 1e5),
      minLatE5: Math.floor(south * 1e5),
      maxLonE5: Math.ceil(east * 1e5),
      maxLatE5: Math.ceil(north * 1e5),
      // 지도 렌더는 클램프하지 않은 위치를 받는다(상자 밖 도형을 상자 가장자리로 끌어오지 않는다)
      project: (latDeg, lonDeg) => ({
        x: 0.5 + (lonDeg * cosLat - midX) * scale,
        y: 0.5 - ((latDeg - midY) * scale) / ROUTE_ASPECT,
      }),
    },
  };
}

/** 부동소수 오차가 `[0,1]`을 아주 조금 넘지 않게 한다 */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

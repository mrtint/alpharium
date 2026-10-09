/**
 * 쓴 날 사진 확대 화면의 판정 (067).
 *
 * 계약: specs/067-photo-zoom-viewer/contracts/photo-viewer.md ZV1~ZV11, data-model.md §5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면은 판정하지 않는다.** 핀치를 얼마나 허용할지·어디서 닫을지·얼마나 움직일 수 있는지는 여기 순수 함수가
 * 정하고, `src/ui/PhotoViewer.tsx`·`ZoomablePhoto.tsx`는 제스처 값을 넘겨 결과를 그린다. 이 모듈은 `src/ui/`와
 * `react-native`를 import하지 않는다(056 `target-hour.ts`와 같은 자리).
 *
 * **수치는 사람이 정한 값이다**(FR-015) — 앞 넷(`ZOOM_MAX`·`ZOOM_DOUBLE_TAP`·`DISMISS_DISTANCE`·`DISMISS_VELOCITY`)은
 * 설계 결정(Z1·Z5), 나머지는 계획(research R8)에서 정했다. 코드가 분포를 보고 정하지 않는다. 실기기에서 손에
 * 맞지 않으면 여기만 고친다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 최대 배율 */
export const ZOOM_MAX = 4;
/** 배율 1에서 두 번 탭했을 때의 배율 */
export const ZOOM_DOUBLE_TAP = 2;
/** 핀치 중 1 아래로 내려갈 수 있는 하한 — 놓으면 1로 돌아온다 */
export const ZOOM_MIN_LIVE = 0.6;
/** 배율 1에서 아래로 이만큼 끌고 놓으면 닫는다 */
export const DISMISS_DISTANCE = 120;
/** 배율 1에서 아래 방향으로 이만큼 빠르게 튕기면 닫는다 */
export const DISMISS_VELOCITY = 800;
/** 아래로 이만큼 끌면 배경이 가장 옅어진다 */
export const DISMISS_FADE_DISTANCE = 300;
/** 끄는 동안 배경의 가장 옅은 불투명도 */
export const BACKDROP_MIN_OPACITY = 0.2;

/**
 * 지면 사진의 누름으로 치는 손가락 이동 한계 — 사람이 정한 값(캐러셀 팬이 서는 10과 같다). 067 실기기: 사진이 한 장이면
 * 누름을 가로챌 캐러셀 팬이 없어, 사진 위에서 가로로 쓸고 뗀 손가락이 그대로 누름이 되어 확대 화면이 열렸다.
 */
export const TAP_SLOP = 10;

/** 배율 1과 구별하는 여유 — 핀치를 놓은 뒤 1.0001 같은 값이 「확대됨」으로 읽히지 않게 */
const ZOOM_EPSILON = 0.01;

export type Size = { width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** 핀치 중 배율 — `ZOOM_MIN_LIVE`~`ZOOM_MAX` */
export function pinchScale(raw: number): number {
  return clamp(raw, ZOOM_MIN_LIVE, ZOOM_MAX);
}

/** 확대됐는가 (1보다 큰가, 여유 `ZOOM_EPSILON`) */
export function isZoomed(scale: number): boolean {
  return scale > 1 + ZOOM_EPSILON;
}

/**
 * 손을 뗐을 때의 배율 — 1 미만이면 1, `ZOOM_MAX` 초과면 `ZOOM_MAX`. 「확대됨」이 아닌 값(1.005 등)도 정확히 1로 둔다 —
 * 그래야 넘김이 다시 켜진 장이 늘 배율 1·위치 0이다(FR-012, 확대 중엔 넘김이 꺼져 있다).
 */
export function settleScale(scale: number): number {
  return isZoomed(scale) ? Math.min(scale, ZOOM_MAX) : 1;
}

/** 두 번 탭 — 확대됐으면 1, 아니면 `ZOOM_DOUBLE_TAP` */
export function doubleTapScale(scale: number): number {
  return isZoomed(scale) ? 1 : ZOOM_DOUBLE_TAP;
}

/** 배율 1에서 아래로 끌다 놓았을 때 닫는가 — 아래로 끈 상태에서 멀리 끌었거나 빠르게 튕겼으면 */
export function shouldDismiss(translationY: number, velocityY: number): boolean {
  if (translationY <= 0) return false;
  return translationY >= DISMISS_DISTANCE || velocityY >= DISMISS_VELOCITY;
}

/** 아래로 끈 거리 → 배경 불투명도 (1에서 `BACKDROP_MIN_OPACITY`까지 선형) */
export function backdropOpacity(translationY: number): number {
  const t = clamp(translationY / DISMISS_FADE_DISTANCE, 0, 1);
  return 1 - t * (1 - BACKDROP_MIN_OPACITY);
}

/** 사진을 상자에 원래 비율로 맞춘(contain) 크기. 어느 쪽 크기든 0 이하면 `undefined` */
export function fittedSize(image: Size, box: Size): Size | undefined {
  if (image.width <= 0 || image.height <= 0 || box.width <= 0 || box.height <= 0) return undefined;
  const ratio = Math.min(box.width / image.width, box.height / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

/** 확대된 사진을 움직일 수 있는 한계 — 축마다 상자를 넘친 만큼의 절반. 맞춤 크기를 모르면 0 */
export function panLimit(
  fitted: Size | undefined,
  box: Size,
  scale: number,
): { x: number; y: number } {
  if (fitted === undefined) return { x: 0, y: 0 };
  return {
    x: Math.max(0, (fitted.width * scale - box.width) / 2),
    y: Math.max(0, (fitted.height * scale - box.height) / 2),
  };
}

/** 위치를 `[-limit, limit]`로 자른다 */
export function clampOffset(value: number, limit: number): number {
  return clamp(value, -limit, limit);
}

/**
 * 캐러셀의 위치(장 단위, 순환이면 범위 밖·음수도 온다) → 지금 가장 가까운 장의 순번(0부터). 051 지면 캐러셀에서
 * 옮겨 왔다 — 지면과 확대 화면이 같은 규칙으로 순번을 센다(`PhotoCarousel`이 다시 내보낸다).
 * 같은 장에 머무는 동안은 같은 값이라 `setIndex`가 다시 그리지 않는다.
 */
export function indexAtProgress(progress: number, count: number): number {
  if (!Number.isFinite(progress) || count <= 0) return 0;
  const nearest = Math.round(progress) % count;
  return nearest < 0 ? nearest + count : nearest;
}

export type Point = { x: number; y: number };

/** 누른 자리와 뗀 자리가 축마다 `TAP_SLOP` 안인가. 누른 자리·뗀 자리를 못 받았으면(값 없음) 막지 않는다(누름을 잃지 않는 쪽) */
export function isTap(start: Point | undefined, end: Point): boolean {
  if (start === undefined) return true;
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return true;
  return Math.abs(end.x - start.x) <= TAP_SLOP && Math.abs(end.y - start.y) <= TAP_SLOP;
}

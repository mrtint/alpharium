/**
 * 135 — 지도 면 첫 진입 애니메이션의 시간표 (소유자 결정 2026-11-26).
 *
 * 순수 함수다. 장소 시간순으로: 도착(점이 나타남) → 그 자리의 폴라로이드 카드(번호를 눌렀을 때와 같은 모양)에 사진이 1·2·3장으로
 * 쌓임(최대 3장) → 빨간 점이 경로를 따라 다음 장소로 이동 → 도착 …. 마지막 장면 뒤 잠깐 머물고 카드가 사라진 뒤 지도가 원래 크기로 돌아간다. 장소가 많아도
 * 전체가 `maxMs`를 넘지 않게 모든 간격(이동 포함)을 같은 비율로 줄인다. 모든 값은 **사람이 정한 값이다**(원칙 V — 잰 값이 아니다).
 */

export const INTRO = {
  /** 도착한 뒤 첫 사진까지 */
  dotMs: 260,
  /** 사진 한 장 간격 */
  photoMs: 320,
  /** 사진을 다 쌓고 떠나기 전 머무는 시간 */
  gapMs: 260,
  /** 빨간 점이 다음 장소로 이동하는 시간 */
  moveMs: 520,
  /** 마지막 장면 뒤 머무는 시간 */
  holdMs: 600,
  /** 카드가 사라지는 시간 */
  fadeMs: 300,
  /** 전체 상한(사라짐 포함) */
  maxMs: 4500,
  /** 한 장소에서 쌓는 사진 수 상한 */
  stack: 3,
} as const;

/**
 * 한 장면. `stay`면 `step`번째 장소(목록 순번, 1부터)에 머물며 카드에 사진 `shown`장이 쌓여 있다. `move`면 `step`번째 장소에서
 * 다음 장소로 이동 중이다(카드 없음, 다음 장소의 점은 아직 없다).
 */
export type IntroFrame = { at: number; phase: "stay" | "move"; step: number; shown: number };

export function introTimeline(photoCounts: readonly number[]): {
  frames: IntroFrame[];
  /** 줄인 뒤의 이동 시간 */
  moveMs: number;
  /** 카드가 사라지기 시작 */
  fadeAt: number;
  /** 카드가 다 사라진 뒤 지도가 원래 크기로 돌아가기 시작 — 카드가 장소에서 떨어져 떠 있지 않게(코드 리뷰) */
  returnAt: number;
  doneAt: number;
} {
  const raw: { phase: "stay" | "move"; step: number; shown: number; dt: number }[] = [];
  photoCounts.forEach((count, i) => {
    const step = i + 1;
    if (i > 0) {
      const before = Math.min(photoCounts[i - 1]!, INTRO.stack) > 0 ? INTRO.gapMs : INTRO.dotMs;
      raw.push({ phase: "move", step: i, shown: 0, dt: before });
      raw.push({ phase: "stay", step, shown: 0, dt: INTRO.moveMs });
    } else {
      raw.push({ phase: "stay", step, shown: 0, dt: 0 });
    }
    const n = Math.min(count, INTRO.stack);
    for (let k = 1; k <= n; k += 1) {
      raw.push({ phase: "stay", step, shown: k, dt: k === 1 ? INTRO.dotMs : INTRO.photoMs });
    }
  });
  const tail =
    (raw.length > 0 && raw[raw.length - 1]!.shown === 0 ? INTRO.dotMs : 0) + INTRO.holdMs;
  const natural = raw.reduce((sum, f) => sum + f.dt, 0) + tail;
  const scale = Math.min(1, (INTRO.maxMs - INTRO.fadeMs * 2) / Math.max(natural, 1));
  let at = 0;
  const frames = raw.map((f) => {
    at += f.dt * scale;
    return { at: Math.round(at), phase: f.phase, step: f.step, shown: f.shown };
  });
  const fadeAt = Math.round(at + tail * scale);
  return {
    frames,
    moveMs: Math.round(INTRO.moveMs * scale),
    fadeAt,
    returnAt: fadeAt + INTRO.fadeMs,
    doneAt: fadeAt + INTRO.fadeMs * 2,
  };
}

/**
 * 지도 상자(면 가운데에 놓인다)를 상자 중심 기준으로 `zoom`배 키운 뒤, 상자 안의 점 `p`가 면 가운데에 오게 하는 이동량.
 * React Native의 `[translate, scale]` 변환은 뷰 중심 기준이라 화면 위치 = 중심 + t + zoom·(p − 중심)이고, 그것이 중심이 되려면
 * t = −zoom·(p − 중심)이다.
 */
export function cameraFor(
  p: { x: number; y: number },
  box: { width: number; height: number },
  zoom: number,
): { x: number; y: number } {
  const x = -zoom * (p.x - box.width / 2);
  const y = -zoom * (p.y - box.height / 2);
  // −0을 0으로 — 같은 자리(가운데)는 이동이 없다
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };
}

/**
 * 135 — 지도 면 첫 진입 애니메이션의 시간표 (소유자 결정 2026-11-26).
 *
 * 순수 함수다. 장소 시간순으로: 점이 나타나고 → 그 장소 사진이 찰칵 찍히듯 한 장씩 쌓이고(최대 3장) → 다음 장소로. 마지막 장면 뒤
 * 잠깐 머물고 사진 더미가 사라진다. 장소가 많아도 전체가 `maxMs`를 넘지 않게 모든 간격을 같은 비율로 줄인다.
 * 모든 값은 **사람이 정한 값이다**(원칙 V — 잰 값이 아니다).
 */

export const INTRO = {
  /** 점이 나타난 뒤 첫 사진까지 */
  dotMs: 260,
  /** 사진 한 장 간격 */
  photoMs: 300,
  /** 한 장소를 마치고 다음 점까지 */
  gapMs: 220,
  /** 마지막 장면 뒤 머무는 시간 */
  holdMs: 500,
  /** 사진 더미가 사라지는 시간 */
  fadeMs: 300,
  /** 전체 상한(사라짐 포함) */
  maxMs: 4000,
  /** 한 장소에서 쌓는 사진 수 상한 */
  stack: 3,
} as const;

/** 한 장면 — `step`번 장소까지 점이 보이고, 그 장소에는 사진 `shown`장이 쌓여 있다(앞 장소들은 다 쌓였다) */
export type IntroFrame = { at: number; step: number; shown: number };

export function introTimeline(photoCounts: readonly number[]): {
  frames: IntroFrame[];
  fadeAt: number;
  doneAt: number;
} {
  const raw: { step: number; shown: number; dt: number }[] = [];
  photoCounts.forEach((count, i) => {
    const n = Math.min(count, INTRO.stack);
    raw.push({ step: i + 1, shown: 0, dt: i === 0 ? 0 : INTRO.gapMs });
    for (let k = 1; k <= n; k += 1) {
      raw.push({ step: i + 1, shown: k, dt: k === 1 ? INTRO.dotMs : INTRO.photoMs });
    }
  });
  const lastDwell = raw.length > 0 && raw[raw.length - 1]!.shown === 0 ? INTRO.dotMs : 0;
  const natural = raw.reduce((sum, f) => sum + f.dt, 0) + lastDwell + INTRO.holdMs;
  const scale = Math.min(1, (INTRO.maxMs - INTRO.fadeMs) / Math.max(natural, 1));
  let at = 0;
  const frames = raw.map((f) => {
    at += f.dt * scale;
    return { at: Math.round(at), step: f.step, shown: f.shown };
  });
  const fadeAt = Math.round(at + (lastDwell + INTRO.holdMs) * scale);
  return { frames, fadeAt, doneAt: fadeAt + INTRO.fadeMs };
}

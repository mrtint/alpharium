/**
 * 091 — 느린 쓰기의 쉼. 모델 호출 하나가 끝날 때마다 그 호출의 벽시계 시간 × 비율만큼 쉰다.
 *
 * 계약: specs/091-ios-bg-battery/contracts/ios-bg-battery.md PC2
 *
 * iOS 배터리 요청은 CPU 감시(60초 동안 CPU 48초) 아래에서 돈다. 스레드 1이면 CPU 시간 ≈ 벽시계라, 호출 시간 `t` 뒤 `t × r`을 쉬면 평균이
 * `1/(1+r)`이 된다. 값은 `assembly.ts`의 `Pacing`이 정한다. 시계·잠자기는 주입한다(테스트가 갈아 끼운다).
 *
 * 앱 동작의 속도 조절이지 측정이 아니다(원칙 IV) — 잰 시간은 쉼 길이를 정하는 데만 쓰고 밖으로 내보내지 않는다.
 */

export type Clock = () => number;
export type Sleep = (ms: number) => Promise<void>;

export const systemClock: Clock = () => Date.now();
export const systemSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 호출이 `elapsedMs` 걸렸을 때 쉴 시간. 음수·NaN 없이 0 이상 */
export function pauseAfter(elapsedMs: number, pauseRatio: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.round(elapsedMs * Math.max(0, pauseRatio));
}

/** 092 — 쉼을 이 길이의 토막으로 나눠 잔다. 토막마다 멈춤을 본다(사람이 정한 값) */
export const PAUSE_SLICE_MS = 500;

/**
 * 092 CW8 — `ms`만큼 쉬되 토막(`PAUSE_SLICE_MS`)마다 멈춤을 본다. 멈춤이 서면 남은 쉼을 버린다 — 091은 쉼 하나를 통째로 자서 그만두기가
 * 그 쉼(최대 호출 시간 × 비율)만큼 붙잡혔다(091 리뷰).
 */
export async function rest(
  ms: number,
  stopped: () => boolean,
  sleep: Sleep = systemSleep,
): Promise<void> {
  let left = ms;
  while (left > 0 && !stopped()) {
    const slice = Math.min(PAUSE_SLICE_MS, left);
    await sleep(slice);
    left -= slice;
  }
}

/**
 * `call`을 돌리고, 끝나면 그 시간에 비례해 쉰다. 멈춤 신호(`stopped()`)가 서 있으면 쉬지 않는다 — 그만두기·끊김이 쉼에 붙잡히지 않게.
 * 쉼 도중 멈춤이 서도 곧 끝난다(`rest`). `call`이 던지면 쉬지 않고 그대로 던진다.
 *
 * 사진 캡션이 쓴다 — 마지막 장 뒤의 쉼도 남긴다: 곧이어 본문 모델을 여는 무거운 적재가 오므로 그 앞에서 CPU 창을 비워 두는 편이 낫다(짐작).
 */
export async function paced<T>(
  call: () => Promise<T>,
  pauseRatio: number,
  stopped: () => boolean,
  clock: Clock = systemClock,
  sleep: Sleep = systemSleep,
): Promise<T> {
  const start = clock();
  const result = await call();
  if (!stopped()) await rest(pauseAfter(clock() - start, pauseRatio), stopped, sleep);
  return result;
}

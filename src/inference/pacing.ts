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

/**
 * `call`을 돌리고, 끝나면 그 시간에 비례해 쉰다. 멈춤 신호(`stopped()`)가 서 있으면 쉬지 않는다 — 그만두기·끊김이 쉼에 붙잡히지 않게.
 * `call`이 던지면 쉬지 않고 그대로 던진다.
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
  if (!stopped()) {
    const pause = pauseAfter(clock() - start, pauseRatio);
    if (pause > 0) await sleep(pause);
  }
  return result;
}

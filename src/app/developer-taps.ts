/**
 * 설정 「버전」 행의 연속 탭 판정 (059, 보드 `6c` ⑤).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md TP1~TP7, research R12
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **「지금」을 인자로 받는다**(`day-boundary.ts` 관례) — `new Date()`를 안에서 부르면 1초 경계를 기기 없이 못 잰다. 간격이 `TAP_WINDOW_MS`
 * **이하**이면 이어 세고 넘으면 그 탭이 1번째다. 7번째 탭에서 켜고(이미 켜져 있으면 「이미 켜져 있어요」), 4번째 탭부터 남은 횟수를 알린다.
 *
 * 값 셋은 사람이 정한 것이다(보드 「7번 연속 탭(각 탭 사이 1초 이내)」·「4번째부터」) — 코드가 사용자의 탭 습관을 보고 고치지 않는다(원칙 V).
 * 상태는 저장하지 않는다 — 설정 겹이 열려 있는 동안만 산다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 탭 사이 간격의 상한(ms, 이 값 포함) */
export const TAP_WINDOW_MS = 1000;
/** 개발자 메뉴가 켜지는 연속 탭 수 */
export const TAPS_TO_ENABLE = 7;
/** 이 탭 수부터 남은 횟수를 알린다 */
export const TAPS_LEFT_FROM = 4;

export type TapState = { count: number; lastAt: number | null };

export const INITIAL_TAP_STATE: TapState = { count: 0, lastAt: null };

export type TapEffect =
  { kind: "none" } | { kind: "tapsLeft"; n: number } | { kind: "enabled" } | { kind: "already-on" };

export function registerTap(
  state: TapState,
  nowMs: number,
  alreadyOn: boolean,
): { state: TapState; effect: TapEffect } {
  const continues = state.lastAt !== null && nowMs - state.lastAt <= TAP_WINDOW_MS;
  const count = continues ? state.count + 1 : 1;

  if (count >= TAPS_TO_ENABLE) {
    return {
      state: { count: 0, lastAt: nowMs },
      effect: alreadyOn ? { kind: "already-on" } : { kind: "enabled" },
    };
  }
  const next: TapState = { count, lastAt: nowMs };
  if (count >= TAPS_LEFT_FROM && !alreadyOn) {
    return { state: next, effect: { kind: "tapsLeft", n: TAPS_TO_ENABLE - count } };
  }
  return { state: next, effect: { kind: "none" } };
}

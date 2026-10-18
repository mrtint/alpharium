/**
 * 090 — 백그라운드·수동 실행이 시작되는 순간 앱이 앞에 있었는가를 읽는 통로.
 *
 * 계약: specs/090-ios-bg-auto-write/contracts/ios-bg-auto-write.md LS1·LS2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 시도 기록(078)에 싣는 **기록 값**이다 — 판정 입력이 아니다(`src/schedule/`은 앱 상태를 판정에 쓰지 않는다, 024). lldb 강제 깨우기·
 * 진단의 수동 실행은 앞(`active`), OS가 깨운 백그라운드 실행은 뒤(`background`)로 남아 둘을 기록으로 가른다.
 *
 * `react-native`는 호출 시점 `require`로 읽는다 — `await import`는 iOS 배포 빌드에서 앱을 죽인다(066). 두 값 밖(`inactive`·`unknown`)과
 * 예외는 `undefined`다(모르는 것을 채우지 않는다, 원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { LaunchState } from "./auto-write-attempts";

export function readLaunchState(
  // 테스트가 갈아 끼운다 — 기본은 호출 시점 `require`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loadReactNative: () => unknown = () => require("react-native"),
): LaunchState | undefined {
  try {
    const { AppState } = loadReactNative() as { AppState: { currentState: unknown } };
    const state = AppState.currentState;
    return state === "active" || state === "background" ? state : undefined;
  } catch {
    return undefined;
  }
}

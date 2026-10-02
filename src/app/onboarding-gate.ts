/**
 * 온보딩 진입 게이트 판정 (059, research R7 — 「온보딩부터 다시」가 죽어 있던 원인).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md OB1·OB2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 옛 식은 `permissionStepsDecided = 이번 세션에 끝냄 || completed === true`였다. `completed`인 기기에서는 이것이 늘 참이라
 * `onboardingGateNeeded = (completed !== true || force) && !decided`가 **`force`를 켜도 늘 거짓**이었다 — 오류 없이 아무 일도 안 일어나는 조용한 결함이다
 * (jest가 `App.tsx`를 못 건드려 못 잡았다). 고침: 「이미 완료함」은 **`force`가 켜진 동안은 결정으로 세지 않는다.** 순수 함수로 떼어 갈래를 기기 없이 잠근다.
 *
 * 쓰는 곳: `App.tsx`의 `AppFrame`. `force`는 개발자 화면의 「온보딩부터 다시」가 켜고 권한 단계가 모두 끝나면(`onAllPermissionStepsDecided`) 끈다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 권한 단계가 결정됐는가 — 이번 세션에 끝냈거나, 이미 완료했고 다시 보기를 요청하지 않았다 */
export function permissionStepsDecided({
  decidedThisSession,
  completed,
  force,
}: {
  decidedThisSession: boolean;
  completed: boolean;
  force: boolean;
}): boolean {
  return decidedThisSession || (completed && !force);
}

/** 온보딩(권한 단계) 화면이 필요한가 */
export function onboardingGateNeeded({
  completed,
  force,
  decidedThisSession,
}: {
  completed: boolean;
  force: boolean;
  decidedThisSession: boolean;
}): boolean {
  return (!completed || force) && !decidedThisSession;
}

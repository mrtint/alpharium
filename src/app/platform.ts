/**
 * 앱이 도는 플랫폼 (068, FR-007).
 *
 * `Platform.OS` 문자열을 이 앱이 가르는 두 갈래로 옮기는 한 곳이다 — 온보딩 판정(`planOnboardingSteps`)과 설정 문구가 같은 값을 본다.
 * 「ios가 아니면 android」다(웹·기타는 이 앱이 지원하지 않아 안드로이드 갈래를 탄다, 기존 `App.tsx` 식과 같다).
 */

export type AppPlatform = "android" | "ios";

export function appPlatform(os: string): AppPlatform {
  return os === "ios" ? "ios" : "android";
}

/**
 * 090 — iOS 백그라운드 실행의 시간 예산 만료를 듣는 통로.
 *
 * 계약: specs/090-ios-bg-auto-write/contracts/ios-bg-auto-write.md EX1~EX4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-background-task`는 만료 때 `onTasksExpired` 알림을 게시하지만 자기 모듈의 관찰자가 `userInfo["url"]` 가드로 버려 JS에 오지
 * 않는다(`node_modules/expo-background-task/ios/BackgroundTaskModule.swift`). 그래서 만료가 시도 기록에 「시작한 뒤 끝나지 않음」으로만
 * 남아 「멈췄다·죽었다·만료됐다」를 가르지 못했다. 로컬 모듈 `modules/pocketlog-bg-expiry`(iOS)가 같은 알림을 직접 받아 이벤트로 넘긴다.
 *
 * 모듈이 없으면(안드로이드·jest) 구독은 아무것도 하지 않는다 — 던지지 않는다. 앱 동작 기록이다(원칙 IV의 측정이 아니다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Swift `Name(...)`과 같아야 한다 — `__tests__/config/bg-expiry-module.test.ts`가 대조한다 */
export const BG_EXPIRY_MODULE_NAME = "PocketlogBgExpiry";
/** Swift `Events(...)`와 같아야 한다 */
export const BG_EXPIRY_EVENT = "onExpired";

type ExpiryModule = {
  addListener(event: string, listener: (payload: unknown) => void): { remove(): void };
};

/**
 * 네이티브가 만료 순간에 잰 시각(밀리초 epoch)을 읽는다. JS는 앱이 다시 깨어날 때에야 이 이벤트를 처리할 수 있어 그때의 `new Date()`는
 * 만료 시각이 아니다. 값이 없거나 깨졌으면 받은 순간이다(늦을 수 있다).
 */
export function expiryTimeOf(payload: unknown, received: Date): Date {
  const at = (payload as { at?: unknown } | null | undefined)?.at;
  if (typeof at !== "number" || !Number.isFinite(at)) return received;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? received : date;
}

/** 만료를 듣는다(만료 시각을 넘긴다). 돌려주는 함수로 푼다. 모듈이 없거나 실패하면 아무것도 하지 않는 해제 함수를 준다. */
export function subscribeBackgroundExpiry(listener: (at: Date) => void): () => void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require("expo-modules-core") as {
      requireOptionalNativeModule<T>(name: string): T | null;
    };
    const native = requireOptionalNativeModule<ExpiryModule>(BG_EXPIRY_MODULE_NAME);
    if (native === null) return () => {};
    const subscription = native.addListener(BG_EXPIRY_EVENT, (payload) =>
      listener(expiryTimeOf(payload, new Date())),
    );
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

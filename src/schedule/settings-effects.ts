/**
 * 자동 생성 설정 변경의 부수 효과 순서 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S6
 *       specs/020-scheduled-diary-notification/contracts/battery-exception.md
 *       E3
 *       spec.md FR-010
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`saveAutoDiarySettings`는 파일만 쓴다**(S6) — 등록·알림 권한·배터리
 * 인텐트 같은 부수 효과는 호출부가 한다(007의 `saveSelection`이 파일만
 * 쓰고 화면이 나머지를 하는 것과 같다).
 *
 * 그 "나머지"의 **순서**를 화면 밖 순수 조합 함수로 뗀다 — `App.tsx`의
 * `useCallback` 안에 두면 순서(권한 → save → register)가 기기 없이 검증되지
 * 않는다. 여기 두면 mock 통로로 검증된다.
 *
 * **배터리 예외 요청은 021이 여기서 걷어냈다** — 배터리 예외 안내의 주체가
 * 통합 온보딩 흐름(`src/onboarding/`)과 설정 "권한" 섹션으로 옮겨졌다(021 FR-010).
 * 자동 생성 토글은 더 이상 배터리 인텐트를 띄우지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { BackgroundSchedulePort } from "./background-port";
import type { NotificationPort } from "./notification-port";
import {
  saveAutoDiarySettings,
  type AutoDiarySettings,
  type AutoDiarySettingsPort,
} from "./settings";

export type SettingsEffectDeps = {
  settingsPort: AutoDiarySettingsPort;
  backgroundPort: BackgroundSchedulePort;
  notificationPort: NotificationPort;
};

/** 토글을 켠 결과. `settings`는 저장까지 마친 새 값, `notificationDenied`는 화면 안내용. */
export type ToggleOnResult = {
  settings: AutoDiarySettings;
  notificationDenied: boolean;
};

/**
 * 자동 생성을 **켠다** (S6 순서).
 *
 *   1. 알림 권한 요청 → denied면 그대로 진행(생성은 알림과 무관하게 완주, N8).
 *   2. `saveAutoDiarySettings`.
 *   3. `backgroundPort.register()`.
 *
 * 배터리 예외 요청은 하지 않는다 — 021이 통합 온보딩·설정 "권한" 섹션으로 옮겼다.
 */
export async function applyToggleOn(
  current: AutoDiarySettings,
  deps: SettingsEffectDeps,
): Promise<ToggleOnResult> {
  const permission = await deps.notificationPort.requestPermission().catch(() => "denied" as const);

  const next: AutoDiarySettings = { ...current, enabled: true };

  await saveAutoDiarySettings(deps.settingsPort, next).catch(() => {});
  await deps.backgroundPort.register().catch(() => {});

  return { settings: next, notificationDenied: permission === "denied" };
}

/**
 * 자동 생성을 **끈다** (S6 순서).
 *
 *   1. `saveAutoDiarySettings({ ...settings, enabled: false })`.
 *   2. `backgroundPort.unregister()`.
 */
export async function applyToggleOff(
  current: AutoDiarySettings,
  deps: SettingsEffectDeps,
): Promise<AutoDiarySettings> {
  const next: AutoDiarySettings = { ...current, enabled: false };
  await saveAutoDiarySettings(deps.settingsPort, next).catch(() => {});
  await deps.backgroundPort.unregister().catch(() => {});
  return next;
}

/**
 * 목표 시각을 **바꾼다** (S6 순서).
 *
 *   1. `saveAutoDiarySettings({ ...settings, targetHour })`.
 *   2. `enabled`면 `backgroundPort.reschedule()` (주기 타이머 리셋). 꺼져
 *      있으면 등록 자체가 없으므로 아무것도 안 한다.
 */
export async function applyTargetHour(
  current: AutoDiarySettings,
  hour: number,
  deps: SettingsEffectDeps,
): Promise<AutoDiarySettings> {
  const next: AutoDiarySettings = { ...current, targetHour: hour };
  await saveAutoDiarySettings(deps.settingsPort, next).catch(() => {});
  if (next.enabled) await deps.backgroundPort.reschedule().catch(() => {});
  return next;
}

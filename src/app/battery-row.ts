/**
 * 설정 「배터리」 행의 보조 줄 (068, FR-003).
 *
 * 계약: specs/068-ios-settings-reverify/contracts/ios-settings.md C1
 *
 * iOS에는 배터리 최적화 예외가 없다 — 「제한 없음으로 두면」은 안드로이드의 설명이다. iOS는 저전력 모드를 말한다. 두 플랫폼 모두 행을 누르면
 * 이 앱의 설정 화면이 열린다(행 이름·동작은 같고 보조 줄만 다르다). 플랫폼 값은 조립부가 넘기고 이 함수는 입력만으로 정해진다.
 */

import { lazyText } from "../i18n/current";

import type { AppPlatform } from "./platform";

/** `src/app/`은 `src/ui/`를 import하지 않는다(`target-hour.ts`의 선례) — 문구는 카탈로그에서 직접 읽는다 */
const SETTINGS = lazyText((c) => c.settings);
const PLATFORM_TEXT = lazyText((c) => c.settingsPlatform);

export function batteryRowHint(platform: AppPlatform): string {
  return platform === "ios" ? PLATFORM_TEXT.permBatteryHintIos : SETTINGS.permBatteryHint;
}

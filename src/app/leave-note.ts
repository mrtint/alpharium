/**
 * 쓰는 중 화면의 상시 안내 한 줄 (093).
 *
 * iOS는 홈이 시작한 쓰기가 앱을 나가도 끝까지 간다(092) — 그 사실을 말해 앱을 붙들지 않게 한다. 안드로이드는 앞을 벗어나면 쓰기가 멈추므로(005 FR-014b)
 * 이 사실에 맞는 문구를 새로 넣어야 하는데 이 과제 범위 밖이라 `undefined`(줄 없음)다. 플랫폼 값은 조립부가 넘긴다.
 */

import { lazyText } from "../i18n/current";

import type { AppPlatform } from "./platform";

const PLATFORM_TEXT = lazyText((c) => c.settingsPlatform);

export function writingLeaveNote(platform: AppPlatform): string | undefined {
  return platform === "ios" ? PLATFORM_TEXT.writingLeaveNoteIos : undefined;
}

/**
 * 쓰는 중 화면의 상시 안내 한 줄 (093).
 *
 * iOS는 홈이 시작한 쓰기가 앱을 나가도 끝까지 간다(092) — 그 사실을 말해 앱을 붙들지 않게 한다. 안드로이드는 앞을 벗어나면 쓰기가 멈추므로(005 FR-014b)
 * 이 사실에 맞는 문구를 새로 넣어야 하는데 이 과제 범위 밖이라 `undefined`(줄 없음)다. 플랫폼 값은 조립부가 넘긴다.
 *
 * 132(K11·R7) — 이어 하기는 iOS 26 이상에서만 신청된다(`PocketlogContinuedWriteModule.swift` `#available(iOS 26)`). 앱 최소 iOS는 16.4라
 * 가능 여부를 함께 받아 **가능할 때만** 줄을 낸다. 모르면 말하지 않는다(원칙 V). 시스템이 신청을 거절하는 경우(`.fail`)는 가리지 못한다.
 */

import { lazyText } from "../i18n/current";

import type { AppPlatform } from "./platform";

const PLATFORM_TEXT = lazyText((c) => c.settingsPlatform);

/** 이어 하기(iOS 26 `BGContinuedProcessingTask`)를 쓸 수 있는가. 버전을 못 읽으면 `undefined` */
export function continuedAvailableFor(
  platform: AppPlatform,
  version: string | number | undefined,
): boolean | undefined {
  if (platform !== "ios") return false;
  const major = typeof version === "number" ? Math.trunc(version) : parseInt(version ?? "", 10);
  if (!Number.isFinite(major)) return undefined;
  return major >= 26;
}

export function writingLeaveNote(
  platform: AppPlatform,
  continuedAvailable: boolean | undefined,
): string | undefined {
  return platform === "ios" && continuedAvailable === true
    ? PLATFORM_TEXT.writingLeaveNoteIos
    : undefined;
}

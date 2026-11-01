/**
 * 홈 제약 띠가 무엇을 보일지 정한다 (108, 계약 constraint-band.md CB1~CB5) — 순수 함수.
 *
 * 「제약」은 일기를 쓰기 전에 막힌 조건이다 — 사진 권한 거부(`photos`)와 안드로이드 배터리 제한(`battery`). 띠는 닫을 수 없고, 조건이
 * 풀리면 사라진다(그래서 닫은 시각 같은 기록이 없다). **모르는 것은 보이지 않는다**(원칙 V) — 읽지 못했거나 `unknown`이면 해당 띠가 없다.
 *
 * 둘이 함께 걸리면 사진 권한이 먼저다(일기를 못 쓰게 막는 쪽). 한 번에 하나만 보인다. 시각·파일·기기를 읽지 않는다 —
 * 읽는 일은 `App.tsx`(사진 권한)와 `use-constraint-band.ts`(배터리)가 한다.
 */

import type { BatteryExceptionStatus } from "../schedule/battery-exception-port";

import type { AppPlatform } from "./platform";

export type ConstraintKind = "photos" | "battery";

export type ConstraintBandInput = {
  /** 사진 권한이 `denied`·`blocked`인가. 아직 못 읽었으면 `undefined` */
  photoDenied: boolean | undefined;
  platform: AppPlatform;
  /** 자동 쓰기가 켜져 있는가. 설정을 아직 못 읽었으면 `undefined` */
  autoWriteEnabled: boolean | undefined;
  battery: BatteryExceptionStatus;
};

export function constraintBandFor(input: ConstraintBandInput): ConstraintKind | null {
  if (input.photoDenied === true) return "photos";
  if (
    input.platform === "android" &&
    input.autoWriteEnabled === true &&
    input.battery === "restricted"
  )
    return "battery";
  return null;
}

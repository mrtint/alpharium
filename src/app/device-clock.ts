/**
 * 기기 시계 읽기 — 시간 형식(12/24)·시간대 식별자·시차 (056).
 *
 * 계약: specs/056-settings-time-place/contracts/settings-time-place.md DC1·DC2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **새 네이티브 모듈 없이 읽는다**(056 Clarification Q3, FR-036) — Hermes `Intl`(안드로이드에서 `timeZone` 기본값과
 * `hourCycle`을 지원한다, ctx7 `/discord/hermes` `doc/IntlAPIs.md`)과 엔진 기본 `getTimezoneOffset`뿐이다.
 * 기기 설정의 「24시간 형식」 스위치는 이 통로로 보이지 않는다(research R1).
 *
 * **던지지 않는다**(DC1) — `Intl`이 없거나 던지면 형식은 12시간, 시간대 식별자는 `null`(시간대 줄을 그리지 않는다).
 * 판정(표기·도시 표)은 `target-hour.ts`가 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { hourFormatFrom, type HourFormat } from "./target-hour";

export type DeviceClock = {
  format: HourFormat;
  /** IANA 시간대 식별자(예: `Asia/Seoul`). 못 읽었으면 `null` */
  timeZoneId: string | null;
  /** 동쪽으로 몇 분(서울 +540) — `getTimezoneOffset`의 부호를 뒤집은 값 */
  offsetMinutes: number;
};

function readFormat(): HourFormat {
  try {
    return hourFormatFrom(
      new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions(),
    );
  } catch {
    return "h12";
  }
}

function readTimeZoneId(): string | null {
  try {
    const id = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof id === "string" && id !== "" ? id : null;
  } catch {
    return null;
  }
}

/** 지금 기기의 시계. `now`는 시차(서머타임)를 정할 때만 쓴다 */
export function readDeviceClock(now: Date): DeviceClock {
  return {
    format: readFormat(),
    timeZoneId: readTimeZoneId(),
    offsetMinutes: -now.getTimezoneOffset(),
  };
}

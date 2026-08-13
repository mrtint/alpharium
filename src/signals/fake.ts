/**
 * 가짜 하루치 신호.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/signals.md 「가짜 신호」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이것은 제품 경로가 아니다.**
 *
 * 용도는 테스트와 개발뿐이다. 실제 수집이 붙기 전에 파이프라인을 기기 없이 돌리기 위한
 * 것이며, **가짜 신호로 만든 일기가 사용자에게 보이는 경로를 만들지 않는다(MUST NOT).**
 *
 * 이 파일이 헌법 원칙 I의 "미리 만들어 둔 응답"으로 자라지 않게 한다. 원칙 I이 금지한 것은
 * 미리 준비된 값을 사용자에게 결과로 내미는 경로다. 여기의 값들은 테스트가 보는 입력이지
 * 사용자가 보는 출력이 아니며, 그 경계가 무너지는 순간 이 파일은 위반이 된다.
 *
 * 경계를 지키는 방법: **이 모듈을 src/ui/에서 import 하지 않는다.** 파이프라인에는
 * 주입으로만 들어간다(contracts/pipeline.md 「주입받는 것」).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 실제 수집(권한 요청·사진 접근·GPS)은 다음 기능이다. 여기에 넣지 않는다.
 */

import type { DayDate } from "../config/day-boundary";
import type { DaySignals } from "./types";

/**
 * 안드로이드가 기간 걸음 수를 주지 않는다는 실측 사실(AGENTS.md).
 *
 * 가짜 신호에서도 이 제약을 지운 하루를 만들지 않는다. 지우면 테스트가 현실과 어긋나고,
 * 걸음 수를 늘 아는 것처럼 짠 코드가 실기기에서 무너진다.
 */
const STEPS_UNAVAILABLE = "안드로이드는 기간 걸음 수 조회를 제공하지 않는다";

/**
 * 신호가 여럿 관측된 하루.
 *
 * 걸음 수만 `unknown`이다 — 위의 실측 제약 때문이며, 이것이 안드로이드의 정상 상태다.
 */
export function richDay(date: DayDate): DaySignals {
  return {
    date,
    photos: {
      kind: "known",
      value: [
        { id: "fake-photo-1", takenAt: new Date(`${date}T09:12:00`) },
        { id: "fake-photo-2", takenAt: new Date(`${date}T13:40:00`) },
        { id: "fake-photo-3", takenAt: new Date(`${date}T19:05:00`) },
      ],
    },
    places: { kind: "known", value: { visitCount: 4, approximateDistanceMeters: 8300 } },
    steps: { kind: "unknown", reason: STEPS_UNAVAILABLE },
    battery: { kind: "known", value: { startLevel: 0.98, endLevel: 0.21, charged: true } },
    connectivity: {
      kind: "known",
      value: { wifiMinutes: 420, cellularMinutes: 540, wentOffline: false },
    },
  };
}

/**
 * 아무것도 관측되지 않은 하루 — **관측은 했고 없었다**.
 *
 * 집에만 있었고 사진도 찍지 않은 하루다. 오류가 아니라 일기의 내용이 된다(FR-005b).
 */
export function emptyDay(date: DayDate): DaySignals {
  return {
    date,
    photos: { kind: "none" },
    places: { kind: "none" },
    steps: { kind: "none" },
    battery: { kind: "none" },
    connectivity: { kind: "none" },
  };
}

/**
 * 아무것도 알지 못하는 하루 — **관측 자체를 못 했다**.
 *
 * emptyDay와 다르다. 이쪽은 권한이 없거나 기기가 알려주지 않아 볼 수 없었던 하루다.
 * 둘의 차이가 헌법 원칙 V이며, 두 함수를 모두 두는 이유가 그것이다.
 */
export function unknownDay(date: DayDate): DaySignals {
  return {
    date,
    photos: { kind: "unknown", reason: "사진 접근 권한이 없다" },
    places: { kind: "unknown", reason: "위치 권한이 없다" },
    steps: { kind: "unknown", reason: STEPS_UNAVAILABLE },
    battery: { kind: "unknown", reason: "배터리 기록을 되짚지 못했다" },
    connectivity: { kind: "unknown", reason: "연결 기록을 되짚지 못했다" },
  };
}

/**
 * 일부만 관측된 하루 — 실제로 가장 흔할 모양.
 *
 * 사진은 봤지만 위치 권한은 없고, 걸음 수는 안드로이드가 주지 않는 하루다.
 */
export function partiallyUnknownDay(date: DayDate): DaySignals {
  return {
    date,
    photos: { kind: "known", value: [{ id: "fake-photo-1", takenAt: new Date(`${date}T18:20:00`) }] },
    places: { kind: "unknown", reason: "위치 권한이 없다" },
    steps: { kind: "unknown", reason: STEPS_UNAVAILABLE },
    battery: { kind: "known", value: { startLevel: 0.74, endLevel: 0.33, charged: false } },
    connectivity: { kind: "none" },
  };
}

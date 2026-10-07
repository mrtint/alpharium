/**
 * 상태 흉내의 순수 판정 (064, 보드 `6e` ③·`6i`).
 *
 * 계약: specs/064-state-simulation/contracts/simulation.md SM1~SM6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **흉내 값은 홈 표시에만 닿는다**(설계 B5, FR-015). 이 파일이 만드는 「지금」(`simulatedNow`)과 미리보기(`simulatedPreviewDay`)는 조립부가
 * **홈에만** 넘긴다 — 파이프라인·자동 쓰기 판정·신호 수집에는 「쓰기를 막는가」(`simulationBlocksWriting`) 하나만 닿는다. 그래서 이 파일은
 * `diary/pipeline`·`schedule/`·`signals/`를 import하지 않는다(헌법 검사 `SIMULATION_LEAKS` LK1). 신호를 지어내지 않고 화면이 받는
 * `DayPreview` 모양만 만든다 — `signals/fake.ts`를 쓰지 않는다(원칙 I).
 *
 * **모르면 꺼짐이다**(FR-016). 깨진 기록·모양이 다른 값은 켜짐으로 채우지 않는다(원칙 V). 기록에는 켠 것만 담고 시각·횟수를 담지 않는다(D3).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayBounds, dayOf, type DayDate } from "../config/day-boundary";
import type { DayPreview } from "./state";

/** 흉내 상태 — 날짜 하나(없으면 `null`)와 토글 셋 */
export type SimulationState = {
  date: DayDate | null;
  failToast: boolean;
  noMaterial: boolean;
  noPhoto: boolean;
};

/** 모두 꺼짐 */
export const OFF: SimulationState = {
  date: null,
  failToast: false,
  noMaterial: false,
  noPhoto: false,
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 형식이 맞고 실제 달력 날인가(2월 30일 같은 날은 `dayBounds`가 다음 달로 넘겨 버린다) */
function isRealDay(value: unknown): value is DayDate {
  return (
    typeof value === "string" &&
    DAY_PATTERN.test(value) &&
    dayOf(new Date(dayBounds(value).startMs)) === value
  );
}

/** 기록 → 상태. 없음·깨짐·모양 다름은 꺼짐이다(SM1) */
export function parseSimulation(raw: string | null): SimulationState {
  if (raw === null) return OFF;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return OFF;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return OFF;
  const record = parsed as Record<string, unknown>;
  return {
    date: isRealDay(record.date) ? record.date : null,
    failToast: record.failToast === true,
    noMaterial: record.noMaterial === true,
    noPhoto: record.noPhoto === true,
  };
}

/** 상태 → 기록. 모두 꺼졌으면 `null`(파일을 지운다). 켠 것만 담는다(SM6) */
export function serializeSimulation(state: SimulationState): string | null {
  if (!simulationBlocksWriting(state)) return null;
  const record: Record<string, string | boolean> = {};
  if (state.date !== null) record.date = state.date;
  if (state.failToast) record.failToast = true;
  if (state.noMaterial) record.noMaterial = true;
  if (state.noPhoto) record.noPhoto = true;
  return JSON.stringify(record);
}

/** 개발 환경에서만 효력이 있다(SM2, S7·D2 — 환경은 호출부가 `showsOnScreen`으로 판정해 넘긴다) */
export function effectiveSimulation(
  state: SimulationState,
  devEnvironment: boolean,
): SimulationState {
  return devEnvironment ? state : OFF;
}

/** 하나라도 켜져 있으면 일기를 새로 쓰지 않는다(SM3, S8). 쓰기 진입점들이 이것만 본다 */
export function simulationBlocksWriting(state: SimulationState): boolean {
  return state.date !== null || state.failToast || state.noMaterial || state.noPhoto;
}

/**
 * 홈이 쓰는 「지금」(SM4). 날짜 흉내가 있으면 그 날의 **실제 시각**이다 — 그 날 시작 + 실제 오늘 시작 이후 경과.
 * 하루 경계는 `day-boundary.ts`만 계산한다(049 DB11 — 시각을 더하고 빼서 하루 기준을 옮기지 않는다).
 */
export function simulatedNow(date: DayDate | null, real: Date): Date {
  if (date === null) return real;
  const elapsed = real.getTime() - dayBounds(dayOf(real)).startMs;
  return new Date(dayBounds(date).startMs + elapsed);
}

/**
 * 홈이 받는 미리보기 통로를 갈아 끼운다(SM5). 흉내가 없으면 `undefined` — 조립부가 실제 통로를 쓴다.
 * 권한 없음이 재료 0을 이긴다(B7 — 권한이 없으면 0인지 셀 수 없다, 053 `unseen`을 `zero`로 세지 않는다).
 */
export function simulatedPreviewDay(
  state: SimulationState,
): ((day: DayDate) => Promise<DayPreview>) | undefined {
  if (state.noPhoto) {
    return async (day) => ({
      day,
      photos: { kind: "unknown" },
      places: { kind: "unknown" },
      photoAccess: "denied",
    });
  }
  if (state.noMaterial) {
    return async (day) => ({
      day,
      photos: { kind: "none" },
      places: { kind: "none" },
      photoAccess: "ok",
    });
  }
  return undefined;
}

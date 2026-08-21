/**
 * 「무엇을 심을까」를 정한다 — 기기에 닿기 전에.
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md 「0단계」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **여기가 FR-005a의 방어선이다 — 범위 밖 하루를 심기 전에 거부한다.**
 *
 * 왜 경고가 아니라 거부인가: 쓸 수 없는 하루를 심는 것은 언제나 실수다. 경고로 두면
 * 에이전트가 성공으로 읽고 다음 단계로 가며, 그러면 **사진은 기기에 들어갔는데 앱에서는
 * 그 하루가 보이지 않는** 상태로 검증이 헛돈다.
 *
 * **고를 수 있는 하루를 도구가 세지 않는다**(FR-005b). `selectableDays()`를 그대로
 * 부른다 — 04:00과 「셋」은 `src/config/day-boundary.ts` 한 자리에만 있고, 도구가
 * 다시 세면 두 곳이 생겨 한쪽만 고쳐지는 날이 온다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **순수 함수다.** 기기에 닿지 않으므로 기기 없이 검증된다.
 */

import { selectableDays, type DayDate } from "../../src/config/day-boundary.ts";
import { shapeNamed, shapeNames, type PlannedPhoto } from "./shapes.ts";

/** 어느 하루에 무엇을 심을지의 명세 */
export type SyntheticDay = {
  day: DayDate;
  shape: string;
  photos: PlannedPhoto[];
};

/**
 * 실패의 갈래.
 *
 * **`index-failed`와 `verify-mismatch`가 이 기능의 존재 이유에 가깝다** — 둘 다
 * 「파일은 있는데 앱은 못 본다」이며, 확인하지 않으면 성공으로 보인다(research.md §1).
 */
export type FailureReason =
  | "no-device"
  | "day-out-of-range"
  | "unknown-shape"
  | "push-failed"
  | "index-failed"
  | "verify-mismatch"
  | "cleanup-failed";

export type PlanResult =
  { ok: true; day: SyntheticDay } | { ok: false; reason: FailureReason; detail: string };

/**
 * 심을 것을 정한다.
 *
 * **"지금"을 인자로 받는다** — 안에서 `new Date()`를 부르면 04:00 경계를 테스트할 수
 * 없다. `day-boundary.ts`가 같은 이유로 같은 모양이다.
 */
export function planSeeding(shapeName: string, day: DayDate, now: Date): PlanResult {
  const shape = shapeNamed(shapeName);
  if (shape === null) {
    return {
      ok: false,
      reason: "unknown-shape",
      detail: `쓸 수 있는 모양: ${shapeNames().join(", ")}`,
    };
  }

  const usable = selectableDays(now);
  if (!usable.includes(day)) {
    // **까닭이 에이전트가 다음을 정할 수 있을 만큼 구체적이어야 한다**(FR-019).
    // 「범위 밖」만 말하면 에이전트가 다시 물어야 한다.
    return {
      ok: false,
      reason: "day-out-of-range",
      detail: `고를 수 있는 하루: ${usable.join(", ")}`,
    };
  }

  return { ok: true, day: { day, shape: shapeName, photos: shape.build(day) } };
}

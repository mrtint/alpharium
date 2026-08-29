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
import { composeDay, shapeNamed, shapeNames, type BurstSpec, type PlannedPhoto } from "./shapes.ts";

/** 어느 하루에 무엇을 심을지의 명세 */
export type SyntheticDay = {
  day: DayDate;
  shape: string;
  photos: PlannedPhoto[];
};

/**
 * 023 Phase 8 — `seed-day.mts`의 argv를 해석한다. **순수 함수다.**
 *
 * `--bursts <json> <날짜>`면 조합 직접 지정, 없으면 `<모양> <날짜>`.
 * `--bursts`가 인자 위치를 밀므로 이 시프트 로직을 한 자리에 두고 테스트한다
 * (인라인이면 CLI 전체 실행으로만 도달 가능).
 *
 * **검증하지 않는다** — 값이 유효한지(모양이 있는지, 날짜가 범위 안인지)는
 * `planSeeding`/`planFromBursts`의 몫이다. 여기서는 인자를 자리별로 뽑기만 한다.
 */
export type ParsedArgs =
  | { ok: true; usingBursts: false; shapeName: string; day: string }
  | { ok: true; usingBursts: true; burstsJson: string; day: string }
  | { ok: false };

export function parseSeedArgs(argv: readonly string[]): ParsedArgs {
  const burstsIdx = argv.indexOf("--bursts");

  if (burstsIdx !== -1) {
    const burstsJson = argv[burstsIdx + 1];
    const day = argv[burstsIdx + 2];
    if (!burstsJson || !day) return { ok: false };
    return { ok: true, usingBursts: true, burstsJson, day };
  }

  const [shapeName, day] = argv;
  if (!shapeName || !day) return { ok: false };
  return { ok: true, usingBursts: false, shapeName, day };
}

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

/**
 * 023 Phase 8 — 정해 둔 이름표 대신 burst 조합을 직접 받아 심을 것을 정한다.
 *
 * `SHAPES`에 없는 상황을 에이전트가 그때그때 만든다. 010의 원칙
 * V("코드가 값을 보고 조합을 만들지 않는다")는 **정해 둔 이름표**에만 적용되고,
 * 여기서는 사람(에이전트)이 명시적으로 조합을 지정하는 것이라 위반이 아니다.
 *
 * **잘못된 JSON은 되묻지 않고 `unknown-shape`로 거부한다**(FR-018).
 */
export function planFromBursts(burstsJson: string, day: DayDate, now: Date): PlanResult {
  let specs: BurstSpec[];
  try {
    const parsed = JSON.parse(burstsJson);
    if (!Array.isArray(parsed)) throw new Error("배열이 아니다");
    specs = parsed as BurstSpec[];
  } catch (error) {
    return {
      ok: false,
      reason: "unknown-shape",
      detail: `--bursts는 BurstSpec 배열 JSON이어야 한다: ${String(error)}`,
    };
  }

  const usable = selectableDays(now);
  if (!usable.includes(day)) {
    return {
      ok: false,
      reason: "day-out-of-range",
      detail: `고를 수 있는 하루: ${usable.join(", ")}`,
    };
  }

  return { ok: true, day: { day, shape: "adhoc-bursts", photos: composeDay(day, specs) } };
}

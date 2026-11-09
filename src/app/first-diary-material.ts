/**
 * 첫 일기 흐름의 재료 읽기와 쓰기 결과 갈래 (111).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md FO1~FO7, FM1~FM4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 재료 판정은 053 `decideMaterial` 하나를 쓴다 — 「쓸 재료가 있다」의 뜻이 홈의 「일기 쓰기」와 갈라지지 않게. 다만 `confirm`(없음·볼 수
 * 없음)에서 홈은 한 번 더 묻고 쓰지만, 첫 일기는 **묻지 않고 쓰지 않는다**(규칙 문서 D1). 못 읽은 날도 있다고 말할 근거가 없어 같다(원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, type DayDate } from "../config/day-boundary";
import { decideMaterial, fromCountHint } from "./material";
import type { DayPreview } from "./state";
import { writeFailureReasonFor, type WriteResult } from "./write-failures";
import type { FirstWriteOutcome } from "../firstrun/first-diary";

/** 재료를 읽는 한도. **사람이 정한 값이다**(측정이 아니다) — 넘으면 못 읽은 것으로 보고 묻지 않는다 */
export const FIRST_DIARY_READ_LIMIT_MS = 10_000;

export type FirstDiaryMaterial = { day: DayDate; canAsk: boolean };

/** 홈이 첫 일기 쓰기 요청의 끝을 알리는 값 */
export type FirstWriteSettled =
  | { kind: "refused" }
  | { kind: "stopped" }
  | { kind: "threw" }
  | { kind: "finished"; result: WriteResult };

export function firstWriteOutcome(settled: FirstWriteSettled): FirstWriteOutcome {
  switch (settled.kind) {
    case "refused":
      return "refused";
    case "stopped":
      return "stopped";
    case "threw":
      return "failed";
    case "finished": {
      const { result } = settled;
      if (result.ok) return "saved";
      if (result.cancelled === true) return "stopped";
      if (result.stage === "already-running") return "busy";
      return writeFailureReasonFor(result) === "interrupted" ? "interrupted" : "failed";
    }
  }
}

export async function readFirstDiaryMaterial(deps: {
  now: Date;
  hasDiary: (day: DayDate) => Promise<boolean>;
  previewDay: ((day: DayDate) => Promise<DayPreview>) | undefined;
}): Promise<FirstDiaryMaterial> {
  const day = dayOf(deps.now);
  const { previewDay } = deps;
  if (previewDay === undefined) return { day, canAsk: false };

  const read = async () => {
    if (await deps.hasDiary(day)) return false;
    const preview = await previewDay(day);
    return (
      decideMaterial(fromCountHint(preview.photos), fromCountHint(preview.places)).kind === "write"
    );
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), FIRST_DIARY_READ_LIMIT_MS);
  });
  try {
    return { day, canAsk: await Promise.race([read(), limit]) };
  } catch {
    return { day, canAsk: false };
  } finally {
    clearTimeout(timer);
  }
}

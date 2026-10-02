/**
 * 자동 쓰기 판정 — 「이 날을 자동으로 써도 되는가」 (057, 보드 `6c` ③·`6g`).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md AW1~AW7
 *       spec.md FR-001~FR-009·FR-014·FR-021, research.md R1·R2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **두 경로가 이 판정 하나를 쓴다** — 백그라운드 자동 쓰기(`task.ts`)와 앱을 열 때의 자동 쓰기(`App.tsx`). 둘이
 * 따로 판정하면 「백그라운드는 안 쓴 날을 앱 열기는 쓴다」가 생긴다.
 *
 * **020 판정(`decideSchedule`)은 그대로다.** 그것이 「언제·어느 날」(켜짐·시도 창·사흘 중 안 쓴 날)을 정하고, 이
 * 판정은 그 날의 신호를 보고 「쓸 재료가 있는가」만 더한다. 날이 정해져야 그 날의 신호를 읽을 수 있으므로 두 축이다.
 *
 * **판정 순서가 계약이다**(FR-003):
 *  1. 020이 돌 일 없음 → `idle`. 신호를 읽지 않는다(매 15분 콜백이 사진을 훑지 않게).
 *  2. 사진 권한이 없음(`denied`·`blocked` — 053이 「아직 묻지 않음」도 `denied`로 옮긴다) → 「사진 권한 없음」 건너뜀.
 *     이것만 기록된다(설정의 사진 행에 보인다, 보드 `6g`).
 *  3. 053 재료 판정이 「바로 쓴다」(사진이나 장소가 하나라도 있음) → 쓴다. 위치 권한만 없고 사진이 있으면 쓴다.
 *  4. 그 외(관측된 0 또는 셀 수 없음뿐) → 「재료 없음」 건너뜀. 지어 쓰기는 사용자가 홈에서 확인할 때만이다(053 `2f`).
 *
 * **053 판정을 다시 쓰지 않는다** — `decideMaterial`·`fromCountHint`를 그대로 부른다. 그래서 「확인이 뜬 하루」와
 * 「자동으로 안 쓴 하루」가 같은 규칙이다. 사진이 관측된 0이면 장소도 0으로 올리는 승격은 미리보기(`toDayPreview`)가 이미 한다.
 *
 * **계층**: `src/schedule/` → `src/app/material.ts`(순수)·`src/app/state.ts`(타입). `task.ts`가 이미 `app/wiring`을 부르는 방향과
 * 같다(research R1). 앱 전경 상태(`AppState`)를 보지 않는다 — 「앱이 앞으로 왔다」는 다시 판정할 때일 뿐 입력이 아니다(AGENTS).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { selectableDays, type DayDate } from "../config/day-boundary";
import { decideMaterial, fromCountHint } from "../app/material";
import type { DayPreview } from "../app/state";
import { decideSchedule, type ScheduleDecision } from "./decision";
import type { AutoDiarySettings } from "./settings";
import { saveSkippedDay, type SkipStorePort } from "./skip-store";

export type AutoWriteDecision =
  | { kind: "idle"; reason: Extract<ScheduleDecision, { act: false }>["reason"] }
  | { kind: "write"; day: DayDate }
  | { kind: "skip"; day: DayDate; because: "no-photo-access" | "no-material" };

/** 020 판정 결과와 그 날의 미리보기로 정한다 (순수). */
export function decideAutoWrite(input: {
  schedule: ScheduleDecision;
  preview: DayPreview;
}): AutoWriteDecision {
  const { schedule, preview } = input;
  if (!schedule.act) return { kind: "idle", reason: schedule.reason };

  const day = schedule.day;
  if (preview.photoAccess === "denied" || preview.photoAccess === "blocked") {
    return { kind: "skip", day, because: "no-photo-access" };
  }

  const material = decideMaterial(fromCountHint(preview.photos), fromCountHint(preview.places));
  if (material.kind === "write") return { kind: "write", day };
  return { kind: "skip", day, because: "no-material" };
}

/**
 * 두 경로가 함께 부르는 조합 — 020 판정 → (돌 일이 있을 때만) 그 날의 미리보기 → 판정 → 사진 권한 건너뜀 기록.
 *
 * 기기 통로는 전부 주입받는다. 기록이 실패해도 결정은 바뀌지 않는다(쓰지 않는다는 사실이 먼저다).
 */
export async function resolveAutoWrite(deps: {
  settings: AutoDiarySettings;
  now: Date;
  listDiaryDays: () => Promise<readonly DayDate[]>;
  previewDay: (day: DayDate) => Promise<DayPreview>;
  skipPort: SkipStorePort;
}): Promise<AutoWriteDecision> {
  const schedule = decideSchedule({
    settings: deps.settings,
    now: deps.now,
    selectableDays: selectableDays(deps.now),
    existingDiaryDays: await deps.listDiaryDays(),
  });
  if (!schedule.act) return { kind: "idle", reason: schedule.reason };

  const decision = decideAutoWrite({ schedule, preview: await deps.previewDay(schedule.day) });
  if (decision.kind === "skip" && decision.because === "no-photo-access") {
    await saveSkippedDay(deps.skipPort, decision.day).catch(() => {});
  }
  return decision;
}

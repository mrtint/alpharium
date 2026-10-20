/**
 * 092 FR-008 — iPhone 이어 쓰기가 저장됐을 때의 완성 알림.
 *
 * 계약: specs/092-ios-continued-write/contracts/continued-write.md CW5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 홈이 시작한 쓰기는 앞에서 끝나므로 알리지 않았다(057 OP6). 이어 하기를 받은 쓰기는 사용자가 앱을 나가 있는 동안 끝날 수 있다 — 그때만
 * 「다 썼어요」를 띄운다(소유자 결정 2026-10-20). **앱이 뒤에 있을 때만**이다: 앞이거나 모르면(`inactive`·읽기 실패 → `undefined`) 띄우지
 * 않는다(원칙 V — 모르는 것을 「뒤」로 채우지 않는다). 순서는 백그라운드 자동 쓰기와 같다 — 쓸 차례 알림을 맞춰 그 날의 「쓸 차례」를 거둔
 * 뒤(085 FR-011) 같은 완성 알림 함수(`task.ts`, 057 문구·`diary-completed` 채널·확인 기록)를 부른다. 던지지 않는다 — 저장은 이미 끝났다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import type { Character, CustomNames } from "../diary/types";
import type { LaunchState } from "./auto-write-attempts";

export type ContinuedSavedDeps = {
  launchState: () => LaunchState | undefined;
  /** 쓸 차례 알림 맞추기(085) */
  reconcile: (names: CustomNames | undefined) => Promise<void>;
  /** 완성 알림(057, `task.ts`의 `sendCompletionNotification`) */
  notify: (day: DayDate, character: Character, names: CustomNames | undefined) => Promise<void>;
};

export async function notifyContinuedSaved(
  day: DayDate,
  character: Character,
  names: CustomNames | undefined,
  deps: ContinuedSavedDeps,
): Promise<void> {
  try {
    if (deps.launchState() !== "background") return;
  } catch {
    return;
  }
  await deps.reconcile(names).catch(() => {});
  await deps.notify(day, character, names).catch(() => {});
}

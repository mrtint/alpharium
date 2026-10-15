/**
 * 앱의 쓸 차례 알림 맞추기 배선 (085).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md SY1~SY5
 *       spec.md FR-009, research R7·R19
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `AppFrame`이 한 번 쓴다. 맞추기를 부르는 때:
 *  - 마운트·자동 쓰기 설정(참조)·이름이 바뀔 때(effect A),
 *  - 앱이 앞으로 돌아올 때(`AppState` → `active`), 그리고 **등록부의 칸이 빌 때**(effect B) — 이 프로세스의 모든 쓰기와 지우기
 *    (홈의 쓰기·057·진단·080 합류가 보는 남의 쓰기·첫 실행 자동 첫 일기·058 지우기)가 칸 하나를 지나므로, 성공 경로마다 콜백을
 *    달지 않아도 끝날 때 한 번 맞춘다(research R7). 칸이 찰 때는 부르지 않는다.
 *
 * 이름은 화면이 넘긴다 — 이름 바꾸기가 파일 쓰기를 기다리지 않으므로 파일을 먼저 읽으면 옛 이름이 걸린다(R19). 이름 파일을 아직
 * 읽지 않았으면 `undefined`를 넘겨 파일을 읽게 한다. `AppState`는 여기 둔다 — `src/schedule/`은 그것을 모른다(OP7).
 * 맞추기는 던지지 않지만 혹시 모를 거부도 삼킨다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import type { LiveWrites } from "../diary/live-write";
import type { CustomNames } from "../diary/types";
import { expoReminderDeps } from "../schedule/reminder-deps";
import { reconcileReminders } from "../schedule/reminders";
import type { AutoDiarySettings } from "../schedule/settings";

export type ReminderReconcile = (names: CustomNames | undefined) => Promise<void>;

const reconcileWithExpo: ReminderReconcile = (names) =>
  reconcileReminders(expoReminderDeps({ names }));

export function useReminderSync({
  liveWrites,
  settings,
  names,
  reconcile = reconcileWithExpo,
}: {
  liveWrites: LiveWrites;
  /** 자동 쓰기 설정 — 값은 맞추기가 파일에서 다시 읽는다. 여기서는 「바뀌었다」의 계기다 */
  settings: AutoDiarySettings | null;
  /** 화면이 들고 있는 이름. 아직 읽지 않았으면 `undefined` */
  names: CustomNames | undefined;
  reconcile?: ReminderReconcile;
}): void {
  const latestNames = useRef(names);
  useEffect(() => {
    latestNames.current = names;
  }, [names]);

  // A — 마운트, 설정·이름이 바뀔 때
  useEffect(() => {
    void reconcile(names).catch(() => {});
  }, [settings, names, reconcile]);

  // B — 앞으로 돌아올 때, 등록부의 칸이 빌 때(마운트 때는 부르지 않는다)
  useEffect(() => {
    const run = () => void reconcile(latestNames.current).catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    const off = liveWrites.onChange(() => {
      if (liveWrites.current() === null) run();
    });
    return () => {
      subscription.remove();
      off();
    };
  }, [liveWrites, reconcile]);
}

/**
 * 058 — 일기 모두 지우기 (설정 「이 휴대폰」, 보드 `6c` ⑥).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md WP1~WP8, research R2·R3·R6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순서를 지키는 조합 하나다.** 통로는 모두 주입받는다 — 기기 없이 순서를 검증한다(057 `resolveAutoWrite`와 같은 이유).
 *
 * 1. 쓰기 잠금(020)을 `"screen"`으로 얻는다. 못 얻으면(백그라운드가 쓰는 중) **아무것도 건드리지 않고** `busy`다(FR-016a).
 *    얻으면 끝날 때까지 쥔다 — 지우는 도중 새 쓰기가 끼어들지 못한다(FR-016). 화면 자신의 쓰기는 부르는 쪽이 먼저 멈췄다(FR-014).
 * 2. 알림 확인 기록을 읽어 둔다(트레이에서 거둘 id).
 * 3. 일기 파일을 지운다. **사진 사본보다 먼저다** — 사본을 먼저 지우고 일기 지우기가 실패하면 남은 일기가 「이 사진은 이제 없다」를
 *    보이는 반쪽 상태가 된다.
 * 4. 사진 리사이즈 사본 자리를 비운다.
 * 5. 알림 확인 기록을 비운다 — 남기면 지운 날을 다시 썼을 때 「이미 확인한 날」로 보여 완성 알림이 빠진다(020 `notify.ts`).
 * 6. 2의 알림을 거둔다. 부수 효과라 실패해도 결과를 바꾸지 않는다.
 * 7. 잠금을 놓는다(`finally`).
 *
 * 3~5 중 하나가 던져도 나머지를 끝까지 시도하고 결과는 `failed`다 — 지운 척하지 않는다(FR-018).
 *
 * **남는 것은 통로조차 받지 않는다**(FR-012a·FR-013) — 건너뜀 기록·자동 쓰기 설정·장소 이름·첫 실행 기록·이름·모듈.
 * **시각·편수를 어디에도 쓰지 않는다**(FR-017, 원칙 IV). `nowMs`는 잠금 stale 판정에만 쓰인다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DiaryStore } from "../diary/store";
import { acquireLock, releaseLock, type LockPort } from "../schedule/lock";
import {
  loadNotifiedState,
  saveNotifiedState,
  type NotifiedStorePort,
} from "../schedule/notified-store";

export type WipeOutcome = { kind: "wiped" } | { kind: "busy" } | { kind: "failed"; reason: string };

export type WipeDeps = {
  store: Pick<DiaryStore, "removeAll">;
  /** 사진 리사이즈 사본 자리(`vision-cache`)의 파일을 모두 지운다 */
  clearPhotoCopies: () => Promise<void>;
  notifiedPort: NotifiedStorePort;
  /** 트레이의 알림 하나를 거둔다 */
  dismiss: (notificationId: string) => Promise<void>;
  lockPort: LockPort;
  /** 잠금 stale 판정용 지금(벽시계 ms) — 이 함수는 시각을 스스로 읽지 않는다 */
  nowMs: number;
};

export async function wipeDiaries(deps: WipeDeps): Promise<WipeOutcome> {
  const lock = await acquireLock(deps.lockPort, "screen", deps.nowMs);
  if (lock === null) return { kind: "busy" };

  try {
    const notified = await loadNotifiedState(deps.notifiedPort);
    const errors: string[] = [];
    const attempt = async (step: () => Promise<void>) => {
      try {
        await step();
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    };

    await attempt(() => deps.store.removeAll());
    await attempt(() => deps.clearPhotoCopies());
    await attempt(() => saveNotifiedState(deps.notifiedPort, {}));

    for (const entry of Object.values(notified)) {
      await deps.dismiss(entry.notificationId).catch(() => {});
    }

    return errors.length === 0 ? { kind: "wiped" } : { kind: "failed", reason: errors[0] };
  } finally {
    await releaseLock(deps.lockPort, lock).catch(() => {});
  }
}

/**
 * 백그라운드 태스크 등록/취소 통로 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/background-generation.md
 *       B4·B5
 *       spec.md FR-003·FR-003a
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **019의 `registerBackgroundDiaryTask()`를 제품 코드로 옮긴 것이다.**
 * 019 하네스는 진단 패널이 등록했지만, 020은 자동 생성 설정(`settings.ts`)의
 * on/off·목표 시각 변경이 이것을 부른다(S6).
 *
 * **`minimumInterval`은 15분으로 고정한다** — WorkManager 최솟값이며(019
 * research.md §7), 24시간 안 시도 횟수를 늘려 SC-002/SC-003의 "1회 이상
 * 시도"를 만족할 확률을 높인다. 이 값은 하한선이지 보장이 아니다 —
 * 실제 실행 시점은 OS가 배터리 소모를 최소화하도록 스스로 고른다.
 *
 * **`register()`는 목표 시각을 파라미터로 넣지 않는다**(B4) — 콜백(`task.ts`)이
 * 매번 설정 파일에서 읽어 판정하므로, 재등록의 실질적 효과는 "주기 타이머
 * 리셋"이다(research.md §3).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AUTO_DIARY_TASK_NAME } from "./task";

/**
 * 등록 시 쓰는 최소 반복 간격(분). WorkManager가 허용하는 최솟값이다
 * (`node_modules/expo-background-task`의 `BackgroundTaskOptions.minimumInterval`
 * 타입 정의로 단위가 분임을 확인).
 *
 * **이 값은 이 파일에만 있다.** 019가 `MINIMUM_INTERVAL_MINUTES`를 하네스에
 * 둔 것과 같은 자리.
 */
const MINIMUM_INTERVAL_MINUTES = 15;

export interface BackgroundSchedulePort {
  /** minimumInterval: 15로 등록. 이미 등록돼 있으면 갱신(idempotent). */
  register(): Promise<void>;
  /** 등록 취소. 등록 안 돼 있어도 예외를 던지지 않는다. */
  unregister(): Promise<void>;
  /** unregister → register 순서. 목표 시각 변경·재적용에 쓴다(FR-003a). */
  reschedule(): Promise<void>;
}

/**
 * 기기의 백그라운드 스케줄 통로.
 *
 * 지연 import: `expo-background-task`를 메서드 안에서 `await import`한다.
 * 모듈을 읽는 것만으로 해석되면 웹·테스트 환경에서 무너진다(007
 * `expo-port.ts` 패턴).
 */
export function expoBackgroundSchedulePort(): BackgroundSchedulePort {
  const register = async () => {
    const BackgroundTask = await import("expo-background-task");
    await BackgroundTask.registerTaskAsync(AUTO_DIARY_TASK_NAME, {
      minimumInterval: MINIMUM_INTERVAL_MINUTES,
    });
  };

  const unregister = async () => {
    const BackgroundTask = await import("expo-background-task");
    try {
      await BackgroundTask.unregisterTaskAsync(AUTO_DIARY_TASK_NAME);
    } catch {
      // 등록 안 돼 있어도 예외를 던지지 않는다(B4).
    }
  };

  return {
    register,
    unregister,
    async reschedule() {
      await unregister();
      await register();
    },
  };
}

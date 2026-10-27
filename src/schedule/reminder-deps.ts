/**
 * 쓸 차례 알림 맞추기의 기본 조립 (085).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RD1~RD4
 *       research R17~R19
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 앱의 훅(`src/app/use-reminder-sync.ts`)과 헤드리스 태스크(`task.ts`)가 같은 조립을 쓴다. 통로는 덮을 수 있다(테스트).
 *
 * - **설정은 「읽지 못함」과 「없음」을 가른다**(R18) — 통로가 던지거나 깨졌으면 던지고(맞추기가 아무것도 바꾸지 않는다),
 *   파일이 없으면 기본값(꺼짐)이다. `loadAutoDiarySettings`는 둘 다 기본값으로 삼키므로 쓰지 않는다.
 * - **이름은 화면이 넘길 수 있다**(R19) — 이름 바꾸기는 파일 쓰기를 기다리지 않으므로, 화면이 들고 있는 값이 있으면 그것을 쓴다.
 *   `undefined`면 파일을 읽는다.
 * - **캐릭터는 홈과 같은 규칙으로 고른다** — 저장된 선택(007)이 없으면 첫 실행 기본 캐릭터다. 홈의 쓰기(`resolveGenerationParams`)가
 *   그렇게 쓰므로, 첫 실행 자동 첫 일기만 있고 선택 파일이 아직 없는 사용자도 열면 쓴다 — 그 사용자에게도 쓸 차례를 알린다(085 실기기
 *   2026-10-15: 선택 파일이 없어 예약이 하나도 걸리지 않았다). 백그라운드 태스크는 여전히 선택 없이는 쓰지 않는다(`no-character`).
 * - `task.ts`처럼 `../app/selection-store`를 읽는다(`src/schedule/` → `src/app/` 방향은 이미 있다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { loadSelection, expoSelectionPort, type SelectionPort } from "../app/selection-store";
import { displayNameOf } from "../diary/character-name";
import { ONBOARDING_DEFAULT_CHARACTER } from "../onboarding/essential-assets";
import { expoFileSystemPort, fileStore, type DiaryStore } from "../diary/store";
import type { CustomNames } from "../diary/types";
import {
  expoCharacterNamesPort,
  loadCustomNames,
  type CharacterNamesPort,
} from "../welcome/names-port";
import { expoBatteryExceptionPort, type BatteryExceptionPort } from "./battery-exception-port";
import { currentEnvironment } from "../config/environment";
import type { FastCyclePort } from "./fast-cycle-store";
import { expoNotificationPort, type NotificationPort } from "./notification-port";
import { expoReminderPort, type ReminderPort } from "./reminder-port";
import { allowsFastCycle, loadScheduleTiming } from "./timing-source";
import type { ReminderDeps } from "./reminders";
import {
  DEFAULT_AUTO_DIARY_SETTINGS,
  expoAutoDiarySettingsPort,
  parseAutoDiarySettings,
  type AutoDiarySettingsPort,
} from "./settings";

export type ReminderDepsOverrides = {
  /** 화면이 들고 있는 이름. `undefined`면 파일을 읽는다 */
  names?: CustomNames;
  reminderPort?: ReminderPort;
  settingsPort?: Pick<AutoDiarySettingsPort, "read">;
  store?: Pick<DiaryStore, "listDays">;
  selectionPort?: SelectionPort;
  namesPort?: CharacterNamesPort;
  notificationPort?: Pick<NotificationPort, "ensureChannel">;
  /** 104 — 배터리 예외 상태 통로. 안 주면 기기 통로 */
  batteryPort?: Pick<BatteryExceptionPort, "readStatus">;
  /** 106 — 빠른 주기 기록 통로. 안 주면 기기 통로(개발 환경에서만 읽는다) */
  fastCyclePort?: FastCyclePort;
};

export function expoReminderDeps(overrides: ReminderDepsOverrides = {}): ReminderDeps {
  return {
    port: overrides.reminderPort ?? expoReminderPort(),
    now: () => new Date(),
    prepare: () => (overrides.notificationPort ?? expoNotificationPort()).ensureChannel(),
    async loadSettings() {
      const raw = await (overrides.settingsPort ?? expoAutoDiarySettingsPort()).read();
      return raw === null ? { ...DEFAULT_AUTO_DIARY_SETTINGS } : parseAutoDiarySettings(raw);
    },
    listDiaryDays: () => (overrides.store ?? fileStore(expoFileSystemPort("diary"))).listDays(),
    loadBatteryStatus: () => (overrides.batteryPort ?? expoBatteryExceptionPort()).readStatus(),
    // 106 — 개발 환경에서만 빠른 주기를 읽는다(판정에 성공한 local·dev). 환경 판정은 config/environment.ts의 진입점이 한다.
    loadTiming: async (settings) =>
      (
        await loadScheduleTiming({
          settings,
          devEnvironment: allowsFastCycle(currentEnvironment()),
          port: overrides.fastCyclePort,
        })
      ).timing,
    async loadName() {
      const character =
        (await loadSelection(overrides.selectionPort ?? expoSelectionPort())) ??
        ONBOARDING_DEFAULT_CHARACTER;
      const names =
        overrides.names ??
        (await loadCustomNames(overrides.namesPort ?? expoCharacterNamesPort()).catch(
          (): CustomNames => ({}),
        ));
      return displayNameOf(character, names);
    },
  };
}

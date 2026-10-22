/**
 * 099 — 모델 디렉터리를 OS 백업에서 빼는 통로 (iOS).
 *
 * 계약: specs/099-backup-and-loss-notice/contracts/backup-exclusion.md BX1~BX3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-file-system` 57에는 백업 제외 API가 없어 로컬 모듈 `modules/pocketlog-backup-exclusion`(iOS)이 `isExcludedFromBackup`을
 * 건다. 안드로이드는 이 통로가 아니라 빌드 시점 규칙(`plugins/with-backup-rules.js`)이 뺀다 — 안드로이드·jest에서는 모듈이
 * 없어 `unsupported`다.
 *
 * **던지지 않는다.** 제외가 실패해도 모델 받기·검증은 계속돼야 한다. 실패는 화면에 드러내지 않고, 실기기에서 제외 속성을 읽어
 * 확인한다(quickstart). 이 포트는 모델 디렉터리 하나만 받는다 — 일기·설정·사진 사본 경로를 넘기지 않는다(D4).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Swift `Name(...)`·`Function(...)`과 같아야 한다 — `__tests__/config/backup-exclusion-module.test.ts`가 대조한다 */
export const BACKUP_EXCLUSION_MODULE_NAME = "PocketlogBackupExclusion";
export const BACKUP_EXCLUSION_SET_FUNCTION = "setExcludedFromBackup";
export const BACKUP_EXCLUSION_IS_EXCLUDED_FUNCTION = "isExcludedFromBackup";

export type BackupExclusionOutcome = "excluded" | "unsupported" | "failed";

type ExclusionModule = {
  setExcludedFromBackup(path: string): unknown;
};

function nativeModule(): ExclusionModule | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireOptionalNativeModule } = require("expo-modules-core") as {
    requireOptionalNativeModule<T>(name: string): T | null;
  };
  return requireOptionalNativeModule<ExclusionModule>(BACKUP_EXCLUSION_MODULE_NAME);
}

/**
 * 프로세스당 한 번만 모듈을 부르는 제외 함수를 만든다. `excluded`·`unsupported`는 기억하고 `failed`는 다음 호출에서 다시 시도한다.
 * 모듈을 읽는 쪽을 주입할 수 있어 jest가 네이티브 없이 돈다.
 */
export function createBackupExclusion(
  load: () => ExclusionModule | null = nativeModule,
): (directoryPath: string) => BackupExclusionOutcome {
  let settled: BackupExclusionOutcome | null = null;
  return (directoryPath) => {
    if (settled !== null) return settled;
    try {
      const mod = load();
      if (mod === null) return (settled = "unsupported");
      if (mod.setExcludedFromBackup(directoryPath) === true) return (settled = "excluded");
      return "failed";
    } catch {
      return "failed";
    }
  };
}

/** 모델 디렉터리(`file://` 또는 순수 경로)를 백업에서 뺀다. 던지지 않는다. */
export const excludeModelsFromBackup = createBackupExclusion();

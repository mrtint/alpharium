# Contract: 백업 제외 (099)

## BX1 — 네이티브 모듈 (iOS)

- 모듈 이름 `PocketlogBackupExclusion`. Swift `Name(...)`과 JS 상수가 같아야 한다(`__tests__/config/backup-exclusion-module.test.ts`가 대조).
- `setExcludedFromBackup(path: String) -> Bool` — `file://` 접두사 유무와 무관하게 받아 URL로 바꾸고 `isExcludedFromBackup = true`를 건다. 성공이면 true, 경로가 없거나 실패하면 false(던지지 않는다).
- `isExcludedFromBackup(path: String) -> Bool?` — 읽기. 읽지 못하면 nil.
- 안드로이드·jest·웹에는 모듈이 없다.

## BX2 — JS 포트 `src/models/backup-exclusion-port.ts`

- `excludeModelsFromBackup(directoryPath)` — 모듈이 없거나 호출이 던져도 **절대 던지지 않는다**. 결과는 `"excluded" | "unsupported" | "failed"`.
- 대상은 호출자가 넘긴 모델 디렉터리 하나. 이 포트가 다른 디렉터리 이름을 알지 못한다.

## BX3 — 호출 지점

- `src/models/expo-port.ts`의 `openDirectory()`가 디렉터리 존재를 보장한 직후 한 번(프로세스당 메모) 부른다. 실패는 흐름을 막지 않는다.

## BX4 — 안드로이드 규칙 산출물

- `res/xml/pocketlog_backup_rules.xml`: `<full-backup-content><exclude domain="file" path="models/"/></full-backup-content>`
- `res/xml/pocketlog_data_extraction_rules.xml`: `<data-extraction-rules><cloud-backup><exclude .../></cloud-backup><device-transfer><exclude .../></device-transfer></data-extraction-rules>` (같은 exclude)
- `<application>`에 `android:fullBackupContent="@xml/pocketlog_backup_rules"`, `android:dataExtractionRules="@xml/pocketlog_data_extraction_rules"`. `android:allowBackup`은 건드리지 않는다.
- 플러그인은 여러 번 돌려도 같은 결과(멱등).

## BX5 — 유실 안내

- 키 `lossNote`(카탈로그 `settings.ts`), `SettingsScreen`이 `groupDevice` 안 wipe 행 아래에 `testID="settings-loss-note"` 보조 줄로 그린다. 눌리지 않는다. 기존 행·키는 바뀌지 않는다.

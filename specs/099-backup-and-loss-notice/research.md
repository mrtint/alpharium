# Research: 일기·모델 백업과 유실 안내 (099)

[실측]은 이 저장소·기기에서 본 것, [문서]는 플랫폼 문서, [미확인]은 이 과제의 실측(quickstart)으로 확인할 것이다(원칙 V).

## R1. iOS 백업 제외 통로 (C3)

- **Decision**: 로컬 Expo 모듈 `modules/pocketlog-backup-exclusion`(iOS 전용 Swift). 함수 둘: `setExcludedFromBackup(path)`·`isExcludedFromBackup(path)`. `URL.setResourceValues(isExcludedFromBackup = true)`.
- **Rationale**: [실측] `expo-file-system` 57에 제외 API 없음. 저장소에 같은 꼴의 로컬 모듈 둘이 있다(`pocketlog-bg-expiry`, `pocketlog-continued-write`: `expo-module.config.json` apple·podspec·Swift 한 파일·`package.json`). 같은 모양을 따르면 prebuild·autolinking 경로가 이미 검증돼 있다. JS 쪽은 `src/app/bg-expiry-port.ts`처럼 `requireOptionalNativeModule`로 읽어, 모듈이 없으면(안드로이드·jest) 조용히 건너뛴다.
- **Alternatives**: AppDelegate를 설정 플러그인으로 고쳐 시작 때 한 번 설정 — 모델 디렉터리가 첫 실행 뒤에 만들어져 걸리지 않음. 모델 경로를 `Application Support`·`Caches`로 이동 — 이미 받은 TestFlight 사용자의 2GB 재다운로드.
- **디렉터리 단위**: 속성은 `models` 디렉터리에 건다. [문서] 디렉터리에 건 `isExcludedFromBackup`은 안의 파일에 적용된다. [미확인] 디렉터리 속성이 새로 생긴 `.part`·`.seg*` 파일에도 적용되는지는 quickstart에서 파일 단위로 읽어 확인한다 — 안 되면 파일 단위로도 건다(plan 폴백 T-FALLBACK).

## R2. 호출 시점

- **Decision**: `src/models/expo-port.ts`의 `openDirectory()`가 디렉터리를 만들거나 확인한 직후 제외를 건다(프로세스당 한 번 메모, 실패해도 던지지 않음).
- **Rationale**: 모델 상태를 읽는 모든 경로(`facts`·받기·검증·지우기)가 `openDirectory()`를 지나므로 첫 실행·기존 설치 업데이트·디렉터리 재생성을 한 자리가 덮는다. 앱은 시작 때 모델 상태를 읽는다(필수 모듈 판정). 따로 `App.tsx` 시작 훅을 두지 않는다.
- **Alternatives**: `App.tsx` 시작 훅 — 모델 디렉터리가 아직 없으면 헛돈다.
- 실패 관측: 제외 호출이 실패하면 앱은 막지 않고, 개발자·진단에서 읽을 수 있게 `isExcludedFromBackup` 결과를 진단 정보 줄 하나로 노출할지는 plan 범위 밖(진단 화면은 건드리지 않는다) — 확인은 lldb 식으로 한다(097 방식).

## R3. 안드로이드 규칙 (C4)

- **Decision**: 설정 플러그인 `plugins/with-backup-rules.js`. (1) `withDangerousMod`로 `res/xml/pocketlog_backup_rules.xml`(`<full-backup-content>`)과 `res/xml/pocketlog_data_extraction_rules.xml`(`<data-extraction-rules>`)을 쓴다. (2) `withAndroidManifest`로 `<application>`에 `android:fullBackupContent="@xml/pocketlog_backup_rules"`와 `android:dataExtractionRules="@xml/pocketlog_data_extraction_rules"`를 건다.
- 규칙 내용: `<exclude domain="file" path="models/"/>` 하나 — 클라우드 백업·기기 간 이전 두 섹션과 full-backup-content 모두에서. `<include>`는 쓰지 않는다 — 「나머지는 기본대로」가 결정 A이고 include를 쓰면 나머지가 빠지는 사고가 난다.
- **Rationale**: [실측] 현재 생성 매니페스트는 `android:allowBackup="true"`만 있고 규칙이 없다(`expo-secure-store`도 없어 충돌하는 규칙 파일이 없다). [문서] API 31+는 `dataExtractionRules`를, 30 이하는 `fullBackupContent`를 읽는다. [가정→실측] `Paths.document`는 앱의 `files/`(도메인 `file`) — quickstart에서 백업 산출물 경로로 확인한다.
- **Alternatives**: `allowBackup="false"` — 일기까지 빠져 결정 A 위반. `<include>` 목록 — 위 이유로 기각. 파일 이름에 `secure_store_*`를 쓰지 않는다(다른 라이브러리와의 충돌 방지, 접두사 `pocketlog_`).

## R4. 안드로이드 실측 방법 (M5)

- **Decision**: `adb shell bmgr` 계열. 규칙 없는 빌드(현 main)로 `bmgr backupnow com.a810labs.pocketlog` + logcat(`BackupManagerService`·`FullBackup`)과 `dumpsys backup`으로 전송 크기·대상 파일을 본다 → 규칙 있는 빌드로 같은 것을 한다. 로컬 전송(`bmgr transport`) 상태와 SM-S901N에서 Google 백업 전송이 가능한지는 첫 시도에서 확인한다.
- **[미확인]** `bmgr backupnow`가 이 기기에서 클라우드 전송 없이 어디까지 보이는가. 보이지 않으면 `adb shell bu`(`bu backup`)처럼 도메인 규칙을 통과시키는 대체 경로를 쓰고, 그 한계를 방침에 쓰지 않고 결과 기록에 남긴다. 25MB 초과 시 동작은 일기 데이터를 한도 이상으로 만든 상태(저장된 사진 사본)에서 일부러 시험한다.
- 데이터 안전: `pm clear`·재설치 금지(모델 2GB 보존). dev 빌드는 Metro 번들만 올리거나 같은 서명 덮어쓰기(`adb install -r`)만 쓴다. 매니페스트가 바뀌므로 네이티브 빌드가 필요한데, 같은 서명 `-r` 설치는 앱 데이터를 보존한다(설치 전 `run-as` 로 `files/models` 존재 확인).

## R5. iOS 실측 방법

- **Decision**: 097의 lldb 식(`dlsym` 식 `NSURLIsExcludedFromBackupKey`)으로 앱 안에서 `models`·`preferences`·`vision-cache`·`diary` 디렉터리의 속성을 읽는다. 이어 모듈이 그 값을 JS로도 돌려주므로(`isExcludedFromBackup`) 같은 값을 교차 확인한다. 기존 설치 보정(SC-003)은 모델을 받은 TestFlight/prod 빌드 위에 새 빌드를 덮어 설치해 `Documents/models` 파일이 유지되고 속성만 붙는 것으로 본다.
- 안전: `devicectl --remove-existing-content` 금지, 파일은 하나씩. lldb·`ios:seed`는 Xcode를 끈다.
- **[미확인]** iCloud 백업 실제 크기(설정 > iCloud > 저장 공간 관리)는 보조 증거로만 쓴다.

## R6. 유실 안내 자리 (Clarifications)

- **Decision**: `SettingsScreen.tsx`의 `groupDevice` 안, 「일기 모두 지우기」 행 바로 아래에 누를 수 없는 보조 줄 하나. 기존 `Row`(wipe)는 건드리지 않는다. 문구는 `settings.ts`의 새 키 `lossNote`, 소유자 확정 뒤 확정.
- **Rationale**: 기존 wipe 행의 `hint`는 지금 쓰기 중에만 나오는 danger 힌트다 — 같은 `hint`를 쓰면 의미가 섞인다. 별도 줄이 기존 문구·동작을 바꾸지 않는다(FR-009).
- 글꼴 크기: 줄이 길어지므로 `useFontScale()`/줄바꿈을 허용하고 2.0배에서 잘리지 않게 한다(SC-006).

## R7. 방침·지원 문구와 잠금 테스트

- **Decision**: 실측 뒤 `site/privacy/index.html` `retention`과 `site/support/index.html` `uninstall` 답을 같은 문장으로 고치고, `__tests__/privacy/site-pages.test.ts`의 S10 두 테스트(현재 「포함될 수 있습니다」·「포함될 수 있지만」을 요구)를 새 문장에 맞게 바꾼다. 문장은 실측 결과 3칸(모델/일기/설정 × 백업 포함 여부)을 그대로 옮긴다.
- 지원은 그 한 군데만 고친다(098과 파일 겹침: 098은 FAQ 끝에 항목을 추가).

## R8. 복원된 새 기기에서 모델이 없을 때

- **Decision**: 새 코드 없음. 앱의 기존 모델 판정(필수 모듈 없음 → 받기 안내)이 이미 그 상태를 다룬다. 실기기에서 모델 디렉터리를 비운 상태로 앱을 열어 받기 안내가 뜨는 것을 보는 것으로 SC/US1을 닫는다(데이터 안전: 모델 삭제는 앱 안 lldb로, 모델은 다시 받아야 하므로 전용 기기·시간 확보 후에만).

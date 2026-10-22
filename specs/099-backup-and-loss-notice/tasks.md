# Tasks: 일기·모델 백업과 유실 안내

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/backup-exclusion.md](contracts/backup-exclusion.md), [quickstart.md](quickstart.md)

**Tests**: 이 저장소는 계약·테스트 먼저(헌법 「개발 방식」)다 — 테스트 태스크를 구현보다 앞에 둔다. 실측은 quickstart의 「실측 기록」에 값 그대로 적는다.

**기기 안전**: `pm clear`·재설치 금지, `devicectl --remove-existing-content` 금지, 파일 삭제는 앱 안 lldb로만(AGENTS).

## Phase 1: Setup

- [x] T001 모듈 골격 생성: `modules/pocketlog-backup-exclusion/package.json`(`pocketlog-bg-expiry`와 같은 모양, name `pocketlog-backup-exclusion`), `modules/pocketlog-backup-exclusion/expo-module.config.json`(`{"platforms":["apple"],"apple":{"modules":["PocketlogBackupExclusionModule"]}}`), `modules/pocketlog-backup-exclusion/ios/PocketlogBackupExclusion.podspec`(bg-expiry podspec 복제, name `PocketlogBackupExclusion`)

## Phase 2: Foundational (US1·US2 공통 — 규칙 정본)

- [x] T002 [P] 안드로이드 플러그인 계약 테스트 먼저 작성 `__tests__/config/backup-rules-plugin.test.ts`: 플러그인이 만드는 두 XML과 매니페스트 속성을 검사한다 — `res/xml/pocketlog_backup_rules.xml`은 `<exclude domain="file" path="models/"/>` 하나, `pocketlog_data_extraction_rules.xml`은 `cloud-backup`·`device-transfer` 양쪽에 같은 exclude 하나, `<include>` 없음, `preferences`·`vision-cache` 문자열 없음, 매니페스트 `android:fullBackupContent`·`android:dataExtractionRules` 값, `allowBackup` 불변, 두 번 적용해도 같은 결과(멱등). (BX4)
- [x] T003 `plugins/with-backup-rules.js` 구현(T002를 통과시킨다): `withDangerousMod`로 두 XML을 쓰고 `withAndroidManifest`로 `<application>`에 두 속성을 건다. 문서 주석에 R3 근거. `app.json` `plugins`에 `"./plugins/with-backup-rules"`를 `with-force-light-theme` 뒤에 추가하고 `plugins/README.md`에 한 줄 추가.

## Phase 3: User Story 1 — 모델이 백업에 실리지 않는다 (P1) 🎯 MVP

**Independent Test**: iPhone 모델 디렉터리 제외 속성 참, 안드로이드 백업 산출물에 모델 없음, 위반 주입 시 테스트 실패.

- [x] T004 [P] [US1] 모듈 계약 테스트 먼저 작성 `__tests__/config/backup-exclusion-module.test.ts`: Swift `Name("PocketlogBackupExclusion")`·함수 이름 `setExcludedFromBackup`·`isExcludedFromBackup`이 JS 포트 상수와 같고, `expo-module.config.json`·podspec이 `bg-expiry` 모듈과 같은 모양이며 `platforms`가 `apple`뿐임을 대조한다(주석 제거 뒤 소스 읽기, `bg-expiry-module.test.ts` 선례). (BX1)
- [x] T005 [P] [US1] 포트·호출 지점 테스트 먼저 작성 `__tests__/models/backup-exclusion.test.ts`: (a) 모듈이 없으면 `"unsupported"`, 모듈이 던지면 `"failed"`, 성공하면 `"excluded"`이며 어느 경우도 던지지 않는다 (b) 소스 계약: `src/models/expo-port.ts`의 `openDirectory()`가 디렉터리 확인 직후 `excludeModelsFromBackup`을 부르고, `src/` 어디에도 `preferences`·`vision-cache`·일기 디렉터리 이름을 이 포트에 넘기는 호출이 없다 (c) 프로세스당 한 번만 모듈을 부른다(메모) (d) 모델 디렉터리가 아직 없는 첫 실행에서 `openDirectory()`가 디렉터리를 만든 뒤 오류 없이 지나간다. (BX2·BX3)
- [x] T006 [US1] `modules/pocketlog-backup-exclusion/ios/PocketlogBackupExclusionModule.swift` 구현: `Name("PocketlogBackupExclusion")`, `Function("setExcludedFromBackup")`(경로 → `URL(fileURLWithPath:)`, `file://` 접두사 제거 처리, `var values = URLResourceValues(); values.isExcludedFromBackup = true; try url.setResourceValues`, 실패는 false), `Function("isExcludedFromBackup")`(읽기, 못 읽으면 nil). 던지지 않는다.
- [x] T007 [US1] `src/models/backup-exclusion-port.ts` 구현(T005 통과): `requireOptionalNativeModule("PocketlogBackupExclusion")`(호출 시점 `require`, `src/app/bg-expiry-port.ts` 선례), `excludeModelsFromBackup(directoryPath): "excluded"|"unsupported"|"failed"`, 프로세스당 한 번 메모.
- [x] T008 [US1] `src/models/expo-port.ts`의 `openDirectory()`에서 `dir.exists` 보장 직후 `excludeModelsFromBackup(dir.uri)`를 부른다(결과는 버리고 흐름을 막지 않는다).
- [x] T009 [US1] 위반 주입 검증(코드 변경 없음, 결과는 quickstart 기록에): 플러그인 exclude 경로를 `vision-cache/`로 바꾸기 / `preferences/` 추가 / `models/` 삭제 / `openDirectory()`의 호출 삭제 — 각각 T002·T005가 실패하는 것을 보고 되돌린다.
- [x] T010 [US1] 안드로이드 실측 S-A0·S-A1(규칙 없는 main 빌드, 25MB 초과 상태 포함): quickstart B 1~2, `bmgr backupnow` + logcat/`dumpsys backup` 값을 「실측 기록」에 적는다.
- [x] T011 [US1] 안드로이드 `npx expo prebuild --platform android --clean` 후 `res/xml/pocketlog_*.xml`·`dumpsys package` 확인, 같은 서명 덮어쓰기로 설치(`files/models` 유지 확인), S-A2: 모델 부재, `preferences/`·`vision-cache/`·일기 존재를 기록(US2도 함께 닫힘).
- [x] T012 [US1] iPhone 실측 S-I1·S-I2: 모델이 이미 있는 설치 위에 새 빌드를 덮어 설치, 재다운로드 0바이트, 앱 안 `NSURLIsExcludedFromBackupKey`(lldb `dlsym` 식)로 `models` 참·`preferences`·`vision-cache`·`diary` 디렉터리 거짓, 모듈 `isExcludedFromBackup` 교차 확인, `.part`/`.seg*` 파일 상속 시험. 결과를 기록.
- [x] T013 [US1] (조건부 T-FALLBACK — 만들지 않음: 디렉터리 제외는 하위에 적용되는 Apple 문서의 방식이고 파일마다 읽은 값 0은 정상이다. quickstart S-I2) T012에서 디렉터리 속성이 새 파일에 상속되지 않으면 `openDirectory()` 호출에 더해 파일을 만드는 자리(`expo-port.ts`의 `.part`·`.seg*` 생성 직후)에서도 제외를 건다. 상속되면 이 태스크는 「필요 없음, 근거: S-I1」로 닫는다.
- [x] T013a [US1] 「모델이 없는 채로 일기가 돌아온 기기」 상태가 기존 모델 판정으로 다뤄지는지 확인한다: 모델 상태 판정 테스트(`__tests__/models/`·`__tests__/firstrun/`)가 「모델 없음 → 받기 안내」를 이미 단언하는지 읽어 그 테스트 이름을 quickstart 기록에 적고, 없으면 그 단언을 한 개 추가한다(판정 코드는 바꾸지 않는다).

## Phase 4: User Story 2 — 일기·설정은 백업에서 빠지지 않는다 (P1)

**Independent Test**: 같은 실측에서 일기·설정·사진 사본이 남는다.

- [x] T014 [US2] T011·T012의 기록에서 일기·설정·사진 사본 항목(S-A2의 `preferences/`·`vision-cache/`·일기, S-I2의 거짓 속성)을 US2 근거로 표시해 `quickstart.md` 「실측 기록」에 요약 표(플랫폼 × 모델/일기/설정/사진 사본 × 백업 포함 여부 × [실측]/[미확인])를 만든다. 25MB 초과 시 동작(S-A1)도 한 줄로 쓴다.
- [x] T015 [P] [US2] `__tests__/config/backup-rules-plugin.test.ts`에 일기·설정 보존 단언을 이름 붙여 한 묶음으로 둔다(「일기·설정·사진 사본이 제외되지 않는다」) — T002에 이미 있으면 이 태스크는 describe 이름만 정리해 spec US2와 대응시킨다.

## Phase 5: User Story 3 — 앱 안 유실 안내 한 줄 (P2)

**Independent Test**: 설정 「이 휴대폰」에 보조 줄이 보이고 기존 문구는 그대로, 글꼴 2.0배에서 안 잘림.

- [x] T016 [US3] 소유자에게 유실 안내 문구 확정받기(차단 지점): 실측(T014) 뒤 사실에 맞는 후보 2~3안을 제시하고 하나를 확정받는다. 확정 전에는 T017~T019를 시작하지 않는다.
- [x] T017 [US3] 테스트 먼저 `__tests__/ui/settings-screen.test.tsx`에: 「이 휴대폰」 묶음에 `testID="settings-loss-note"` 줄이 wipe 행 뒤에 있고 눌리지 않으며, wipe 행의 라벨·hint 동작이 변하지 않고, 폰트 배율 2.0에서 `numberOfLines` 제한이 없다. `__tests__/i18n/ko-golden.test.ts`는 `ADDED_AFTER_GOLDEN`에 새 문구 한 줄만 덧붙인다(기존 항목 불변).
- [x] T018 [US3] `src/i18n/catalogs/ko/settings.ts`에 키 `lossNote`(확정 문구) 추가, `src/ui/SettingsScreen.tsx`의 `groupDevice` 안 wipe `Row` 뒤에 `testID="settings-loss-note"` 보조 줄을 그린다(`AppText`, 기존 행·키 불변, `text()`는 최상단 평가 금지).
- [x] T019 [US3] SM-S901N에서 글꼴 2.0배 표시 확인(잘림 없음)과 일기 모두 지우기 행·대화상자 동작 불변을 실기기로 확인해 기록.

## Phase 6: User Story 4 — 방침·지원이 같은 말을 한다 (P2)

**Independent Test**: 두 페이지의 문장이 같은 사실을 말하고 잠금 테스트 통과.

- [x] T020 [US4] 테스트 먼저 `__tests__/privacy/site-pages.test.ts`의 S10 두 테스트를 실측 문장 기준으로 바꾼다(현재 「포함될 수 있습니다」·「포함될 수 있지만」을 요구 — 새 문장에 맞춰 모델은 포함되지 않음·일기/설정은 실측대로를 요구하고, 단정 금지 대상은 미실측 항목으로 좁힌다). 두 페이지가 같은 핵심 문장을 갖는지 대조하는 단언 추가.
- [x] T021 [US4] `site/privacy/index.html` 「보존과 삭제」(`id="retention"`)와 `site/support/index.html` 「앱을 지우면」(`data-faq="uninstall"`) 한 군데만 같은 문장으로 고친다. 근거 주석을 「설계 §1.3 [미확인]」에서 이 과제의 실측 기록(spec 099 quickstart)으로 바꾼다. 미실측(제조사 이전 도구·iOS 직접 이전)은 「확인하지 않았다」로 남긴다. `docs/store/privacy-declarations.md`에 백업 관련 문장이 있으면 같은 말로 맞춘다.

## Phase 7: Polish

- [x] T022 `npm test` · `npm run lint` 통과 확인(전체), 실패하면 원인 수정.
- [x] T023 `AGENTS.md`의 실측 규칙 안드로이드·iOS·Expo·네이티브 주제에 백업 사실 한 항목(모델만 제외·일기·설정은 OS 기본·iOS 제외 속성은 `openDirectory()`에서 건다·안드로이드는 `with-backup-rules`)을 추가한다. 앞 서술을 덧대지 않는다.
- [ ] T024 `git fetch origin && git merge origin/main`으로 충돌(특히 `ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`, `site/support/index.html`)을 풀고 양쪽 항목을 모두 남긴다.

## Dependencies

- T010(규칙 없는 빌드의 S-A0·S-A1)은 구현과 무관하며 반드시 T011(규칙 있는 빌드) **앞에** 한다. T001 → T006. T002 → T003. T004·T005 → T006~T008. T008 → T009~T012 (실측은 구현 뒤).
- US1(T004~T013a) → US2(T014는 T011·T012 결과 필요) → US3(T016은 T014 뒤) → US4(T020·T021은 T014 뒤).
- US3와 US4는 서로 독립(둘 다 T014 뒤).

## Parallel

- T002 ∥ T004 ∥ T005 (다른 파일). T015 ∥ T017 준비. US3 ∥ US4 (T014 이후).

## Implementation strategy

MVP = US1(모델 제외 + 실측). 그 뒤 US2 확인, 문구는 실측이 끝나야 쓸 수 있으므로 US3·US4가 마지막이다. T016은 소유자 응답에 막히면 US3만 보류하고 나머지를 먼저 끝낸다.

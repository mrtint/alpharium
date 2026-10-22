# 일기·모델 백업과 유실 안내 — 설계

로드맵 「일기·모델 백업과 유실 안내」(C3·C4·C9, M5, D4)의 설계. 2026-10-22 brainstorming에서 소유자가 확정했다.

## 1. 목표와 확정한 결정

- 모델(약 2GB)이 OS 백업(iCloud·Google 자동 백업·기기 간 이전)에 실리지 않게 한다.
- **D4 = 안내 문구만**: 일기·설정의 백업 동작은 OS 기본 그대로 둔다(결정 A, 소유자 2026-10-22). 백업 복원을 약속하지 않고, 실측한 사실만 방침에 쓴다.
- 앱을 지우거나 기기를 바꾸면 일기가 사라진다는 안내 한 줄을 앱 안에 둔다(C9, 문구는 소유자 확정).
- 방침 「보존과 삭제」와 지원 「앱을 지우면」 답은 실측 결과로 같은 말로 고친다.

## 2. 사실 (근거)

- 모델: `Paths.document/models/`(`src/models/expo-port.ts`). iOS는 `Documents`라 iCloud 백업 대상, 안드로이드는 `files/models/`.
- 설정·상태: `Paths.document/preferences/*.json`.
- **`Paths.document/vision-cache/`는 일기의 일부다.** 일기에 저장된 리사이즈 사진 사본이고 캐러셀이 읽는다(`src/diary/photo-path.ts`, 013 FR-007). 백업에서 빼면 복원된 일기의 사진이 사라진다 — 제외 대상이 아니다.
- 안드로이드는 `allowBackup` 기본값, 백업 규칙 없음. Auto Backup 한도는 앱당 25MB이며, 사진 사본이 쌓이면 일기 쪽도 넘을 수 있다(넘었을 때의 동작은 미확인 → M5 실측).
- `expo-file-system` 57에는 백업 제외 API가 없다. 로컬 Expo 모듈 선례: `modules/pocketlog-bg-expiry`, `modules/pocketlog-continued-write`.

## 3. 설계

### 3.1 iOS — 제외 통로 (C3)

접근 비교: (1) 로컬 iOS Expo 모듈, (2) 설정 플러그인으로 AppDelegate 수정, (3) 모델 경로 이동.

**채택: (1).** (2)는 모델 디렉터리가 첫 실행 뒤 만들어지면 걸리지 않는다. (3)은 기존 TestFlight 사용자가 2GB를 다시 받는다.

- 새 모듈 `modules/pocketlog-backup-exclusion/`(iOS 전용). Swift 함수 `setExcludedFromBackup(path: String, excluded: Bool)`가 `URLResourceValues.isExcludedFromBackup`을 설정하고, 읽기 함수 `isExcludedFromBackup(path)`를 함께 둔다(확인용).
- 대상은 `models` 디렉터리 하나. 디렉터리에 건 속성은 안의 파일에 적용된다. 경로는 옮기지 않는다.
- 호출 지점: 모델 디렉터리를 만드는 자리(`src/models/expo-port.ts`)와 앱 시작(이미 받은 설치를 따라잡는다). 멱등이다. 디렉터리가 지워졌다 다시 만들어져도 다시 붙는다.
- 안드로이드·테스트·웹에서는 아무 일도 하지 않는 포트 뒤에 둔다(호출 시점 `require`, 모듈 해석 실패가 앱을 죽이지 않게).

### 3.2 안드로이드 — 백업 규칙 (C4)

- 새 설정 플러그인 `plugins/with-backup-rules.js`가 생성물 `res/xml/`에 규칙 파일 둘을 쓰고 매니페스트에 `android:fullBackupContent`(API ≤30)와 `android:dataExtractionRules`(API 31+)를 건다.
- 규칙: 클라우드 백업과 기기 간 이전 두 섹션 모두에서 도메인 `file`의 `models/`만 제외한다. 일기·설정·`vision-cache`는 건드리지 않는다(A).
- `app.json` `plugins`에 등록하고 `plugins/README.md`에 한 줄 추가한다.

### 3.3 실측 (원칙 V)

- **안드로이드(SM-S901N, dev 빌드)**: 규칙 전·후로 `adb shell bmgr backupnow`와 logcat(`BackupManagerService`·`KeyValueBackup`/`FullBackup`)을 비교한다. 확인할 것: (a) 규칙 전 무엇이 어떤 크기로 실리는가, 25MB 초과 시 일기 쪽이 어떻게 되는가(M5), (b) 규칙 뒤 `models/`는 빠지고 `preferences/`·`vision-cache/`는 남는가. `prebuild --clean` 뒤 `dumpsys package`로 규칙 적용을 확인한다. 기기 상태(잠금 해제 `svc power stayon true`)와 모델 보존(`pm clear`·재설치 금지)을 지킨다.
- **iOS(iPhone 14, prod 환경 빌드)**: 앱 안에서 `NSURLIsExcludedFromBackupKey`를 읽어 `models`는 true, `preferences`·`vision-cache`는 false인지 확인한다. `devicectl --remove-existing-content`는 쓰지 않는다.
- 일기가 백업에 남는 것도 같은 방식으로 확인한다(위험: 규칙 오작성으로 일기가 빠지는 것).

### 3.4 문구

- 앱 안 한 줄(C9): 새 i18n 키 하나. 기존 키·문구는 고치지 않는다. 골든은 `ADDED_AFTER_GOLDEN`에만 덧붙인다(문구 세션과 같은 배열이므로 충돌 시 양쪽 항목 유지). 문구는 소유자에게 확정받고, 놓을 자리(설정 「이 휴대폰」 근처의 보조 줄 유력)는 plan에서 정한다. 설정의 기존 행·홈 문구는 건드리지 않는다.
- 방침 「보존과 삭제」(`site/privacy/index.html`)와 지원 「앱을 지우면」 답(`site/support/index.html`)은 실측 뒤 같은 말로 고친다. 근거 주석은 실측 결과로 바꾼다. 지원은 그 한 군데만 고친다.
- 방침 잠금 테스트(`__tests__/privacy/`)가 새 문장을 요구하면 함께 갱신한다.

## 4. 테스트와 위반 주입

- 플러그인 산출물 계약: `models/` 제외가 두 규칙 파일에 있고 `preferences`·`vision-cache`는 제외에 없다. 매니페스트 속성 둘이 걸린다.
- iOS 호출 소스 계약(주석 제거 후): 제외 호출이 모델 디렉터리 생성 자리와 앱 시작에 있다.
- 위반 주입: 제외 경로를 `vision-cache`로 바꾸기, `preferences` 추가, 호출 지점 삭제 — 각각 테스트가 잡는지 본다.
- 방침·지원의 같은 말: 두 페이지 문장이 같은 사실을 말하는지 잠금 테스트에 넣는다.

## 5. 범위 밖

- 일기·설정의 백업 복원 보장·내보내기·클라우드 동기화(D4).
- 모델 경로 이동.
- 문구 세션 영역(`src/i18n/catalogs/ko/` 기존 문구) 수정.

## 6. 남은 위험

- 25MB 초과 시 일기 쪽 동작은 실측 전까지 모른다 — 방침 문구는 실측으로만 쓴다.
- 안드로이드 제조사(삼성)가 기기 간 이전(Smart Switch)에서 규칙을 다르게 다룰 수 있다. 실측 범위는 SM-S901N의 `bmgr`이다.
- iOS 제외 속성은 iCloud 백업 기준이며, 사용자가 기기 이전(직접 전송)을 하면 반영 여부가 다를 수 있다 — 미확인으로 남긴다.

# Research: iOS 클라우드 릴리스

NEEDS CLARIFICATION은 없다. 아래는 결정과 **첫 실행에서 재야 하는 미실측**을 가른 것이다(원칙 V).

## 결정

### D1 — 빌드 머신: GitHub Actions `macos-latest`
- **Decision**: 사용한다. 저장소가 퍼블릭이라 분 제한이 없다(소유자 확인 2026-10-08).
- **Rationale**: 072가 같은 러너에서 prebuild·pod install·xcodebuild를 이미 통과시켰다(Xcode 26.6, 시뮬레이터 Debug 9~13분).
- **Alternatives**: Xcode Cloud(개인 계정 Admin 가능 여부·회사 맥 1회 방문 불확실), Codemagic·EAS(무료 한도가 자주 바뀐다), fastlane(의존성·인증서 저장소가 늘어 수동 서명 구조에 과하다).

### D2 — 서명: 066 수동 서명을 임시 키체인으로 재현
- **Decision**: 비밀의 p12·프로파일을 잡 안에서 풀어 임시 키체인에 import하고 `xcodebuild archive`에 066과 같은 `CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=PGNGG84B39 PROVISIONING_PROFILE_SPECIFIER="Pocketlog App Store" CODE_SIGN_IDENTITY="Apple Distribution"`을 준다. 내보내기는 `scripts/ios/ExportOptions.plist` 그대로(`destination: export`).
- **Rationale**: 새 서명 방식을 도입하지 않아 066에서 실측된 entitlements 정합(`with-no-push-entitlement.js`, `increased-memory-limit`만)이 그대로 성립한다.
- **프로파일 자리**: `~/Library/Developer/Xcode/UserData/Provisioning Profiles/<UUID>.mobileprovision`(066이 옛 `~/Library/MobileDevice/...`는 못 쓴다고 실측 — 이 맥의 MDM 때문이라 러너에서는 어느 쪽이든 될 수 있으나 066과 같은 새 자리를 쓴다). UUID는 프로파일 안의 `UUID` 키에서 읽는다.
- **Alternatives**: Xcode 자동 서명(개인 계정이라 팀원이 못 쓴다, 066), match(저장소 추가).

### D3 — 업로드: `xcrun altool --upload-app` + App Store Connect API 키
- **Decision**: `-f <ipa> -t ios --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>`. altool은 `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`를 찾으므로 그 자리에 `ASC_API_KEY_P8`을 써 두고 정리 단계에서 지운다. 앱 암호는 쓰지 않는다(clarify 확정).
- **Rationale**: 066이 같은 도구로 검증·업로드했다(`--validate-app` 포함). 사람 상호작용(키체인 창)이 없다.
- **Alternatives**: Transporter·`xcrun notarytool`(용도 아님), Xcode 내보내기 `destination: upload`(IPA를 눈으로 확인할 수 없고 실패 구분이 어렵다 — 066이 `export`로 둔 이유와 같다).
- **미실측**: Xcode 26.6 altool의 API 키 플래그 철자·키 탐색 경로는 첫 실행에서 확인한다(알려진 형태이나 이 저장소에서 쓴 적 없다 — 066은 앱 암호였다).

### D4 — 퍼블릭 저장소 비밀 방어
- **Decision**: 트리거는 `workflow_dispatch`뿐, 잡에 `environment: ios-release`, 권한 `contents: read`뿐, 비밀은 단계 `env`로만. Environment 보호 규칙(필수 리뷰어 = 소유자, 배포 브랜치 = `main`)은 저장소 설정이라 코드가 강제하지 못하므로 quickstart에 설정 절차와 눈으로 확인하는 단계를 둔다.
- **Rationale**: 포크 PR은 보호 환경 비밀에 닿지 못한다. 아티팩트는 퍼블릭 저장소에서 누구나 받으므로 금지.
- **Alternatives**: 태그 트리거(태그를 만들 권한이 있는 사람이 늘면 위험이 커진다), `pull_request_target`(비밀 노출의 전형적 경로).

### D5 — 메모리 부족 대응: 첫 실행에서 재고, 죽으면 `-jobs` 하향
- **Decision**: 처음에는 `xcodebuild` 기본 병렬도로 돈다. OOM이면 `-jobs`(또는 `-IDEBuildOperationMaxNumberOfConcurrentCompileTasks`)를 낮춰 재시도하고 낮춘 값·시간을 quickstart에 실측과 함께 적는다(FR-015).
- **Rationale**: 안 잰 값을 미리 넣지 않는다(원칙 V). 072의 안드로이드 쪽 OOM은 로컬에서 네 ABI 때문이었지 이 러너와 무관했다 — iOS Release 아카이브의 메모리는 미지수.

### D6 — 캐시 없음
- **Decision**: `actions/cache`를 쓰지 않는다. **Rationale**: 072 실측에서 Pods·DerivedData 캐시는 효과가 없었고 저장·복원에 30~40초가 들었다.

### D7 — 사전 점검의 범위
- **Decision**: 비밀 이름이 비었는지와 `buildNumber`가 정수인지만 본다. 같은 번호의 중복은 이 사전 점검이 아니라 별도 단계 「번호 점검」이 스토어의 마지막 번호를 읽어 본다(096).
- **Rationale**: 업로드된 번호를 로컬에서 알 수 없다. API로 조회하려면 추가 코드·권한이 필요해 YAGNI.

## 미실측 (첫 실행에서 재서 quickstart에 기록)

| 항목 | 왜 모르는가 |
| --- | --- |
| Release 아카이브 시간·최대 메모리 | 072는 시뮬레이터 Debug만 쟀다 |
| 러너 이미지에 Apple WWDR G3 중간 인증서가 있는가 | 없으면 066의 URL에서 받아 넣어야 한다 |
| altool API 키 플래그·키 탐색 경로 | 066은 앱 암호를 썼다 |
| 러너의 `~/Library/Developer/Xcode/UserData/Provisioning Profiles` 자리가 쓰이는가 | 066은 이 맥 MDM 때문에 자리를 옮겼다 |

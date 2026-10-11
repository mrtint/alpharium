# Quickstart: 안드로이드 클라우드 릴리스 검증 가이드

이 문서는 검증 절차다. 구현 코드는 `tasks.md`와 구현 단계에 있다. 계약은 [contracts/workflow-contract.md](contracts/workflow-contract.md)·[contracts/scripts-contract.md](contracts/scripts-contract.md), 비밀 목록은 [data-model.md](data-model.md).

## 1. 기기 없이 (항상 돈다)

```bash
npx jest __tests__/ci/android-release-workflow.test.ts __tests__/scripts/play-upload.test.ts __tests__/scripts/verify-signature.test.ts
npm test && npm run lint
```

통과 기준: 전부 초록. 워크플로 계약의 위반 주입 표 각 줄이 해당 규칙을 실패로 뒤집는다.

## 2. 소유자가 한 번 준비한다 (에이전트는 키를 열지 않는다)

1. **보호 환경**: GitHub > Settings > Environments > New environment **`android-release`**. Required reviewers = 소유자. Deployment branches = Selected branches → `main`만.
2. **Play 서비스 계정**: Google Cloud에서 서비스 계정을 만들고 JSON 키를 발급한다. Play Console > Users and permissions에서 그 계정의 이메일을 초대하고 앱 `com.a810labs.pocketlog`에 **내부 테스트 트랙 릴리스** 권한만 준다(프로덕션·다른 앱 권한 없음). 권한 반영에 시간이 걸릴 수 있다.
3. **기대 지문**: 로컬 키에서 SHA-256을 뽑아 저장소에 커밋한다(공개 값).
   ```bash
   keytool -list -v -keystore ~/.pocketlog-signing/pocketlog.jks -alias pocketlog | grep "SHA256:"
   ```
   `SHA256:` 뒤의 `AA:BB:…` 값 한 줄을 `scripts/android-release/upload-key.sha256`에 적는다(`#` 주석 줄 허용). 비밀번호 입력은 소유자가 한다.
4. **Environment secrets**([data-model.md](data-model.md)의 넷). 값 하나당 한 명령, 표준 입력으로 넘긴다(여러 줄·긴 값이 안전하다):
   ```bash
   base64 -w0 ~/.pocketlog-signing/pocketlog.jks | gh secret set ANDROID_KEYSTORE_BASE64 --env android-release -R mrtint/alpharium
   gh secret set ANDROID_KEYSTORE_PASSWORD --env android-release -R mrtint/alpharium       # 프롬프트에 붙여넣기
   gh secret set ANDROID_KEY_PASSWORD --env android-release -R mrtint/alpharium
   gh secret set PLAY_SERVICE_ACCOUNT_JSON --env android-release -R mrtint/alpharium < 서비스계정키.json
   ```
   Git Bash의 `base64 -w0`가 없으면 `base64 | tr -d '\n'`. 비밀을 만든 파일(서비스 계정 JSON 등)은 등록 뒤 지운다.
5. **눈으로 확인**(저장소 설정은 코드로 강제할 수 없다): 필수 리뷰어, 배포 브랜치 `main`. **이 설정이 키를 지키는 유일한 방어다** — 워크플로가 도는 동안 `npm ci`의 스크립트와 gradle이 열린 키스토어 옆에서 실행된다.

## 3. 실제 실행 (원칙 V — 건너뛰면 통과가 아니다)

0. **구현 PR(워크플로 포함)이 먼저 `main`에 머지되어 있어야 한다** — 워크플로가 기본 브랜치에 있어야 Run workflow가 보이고 보호 환경이 `main`만 허용한다.
1. `app.json`의 `android.versionCode`를 올려 커밋하고 `main`에 머지한다(Play에 이미 있는 번호는 거부된다).
2. Actions > 「Pocketlog Android Release」 > Run workflow (`main`) → 소유자가 승인한다.
3. 실행 요약에서 단계별 시간·러너 사양·최대 메모리·서명 소유자와 지문을 읽어 아래 「실측 기록」에 옮긴다. **첫 실행은 실패할 수 있다고 가정한다** — 결과를 직접 보기 전에 성공이라고 말하지 않는다.
4. **서명**: 요약의 지문이 `upload-key.sha256`과 같고 소유자가 `CN=Android Debug`가 아니다(워크플로가 이미 강제하지만 눈으로도 본다).
5. **Play 반영**: Play Console > 내부 테스트에서 새 `versionCode`의 릴리스를 확인한다.
6. **전용 기기**(모델·일기가 사라져도 되는 기기): 내부 테스트 링크로 Play에서 받아 설치하고 Metro 없이 홈이 뜨는지, 모델 내려받기와 일기 쓰기까지 한 번 본다. Play가 다시 서명한 앱이다.

## 4. 위반 주입 (실행)

- 비밀 하나를 비우고 시작 → 사전 점검에서 그 이름을 밝히며 빌드 전에 실패(1분 안).
- 기대 지문 불일치는 실행으로 만들지 않는다(`main`에 틀린 값을 커밋해야 한다). 대신 단위 테스트(V6)와 로컬 실물 확인(tasks T006: 일회용 키로 일치/불일치 종료 코드)이 잠근다.
- `main`이 아닌 브랜치에서 시작 → 보호 환경이 거부.
- 실패한 실행의 로그에서 정리 단계가 키스토어를 지웠음을 본다(SC-006).

## 5. 키·계정 교체

- 업로드 키 유출이 의심되면: Play Console에서 업로드 키 재설정을 요청하고(며칠), 새 키로 `ANDROID_KEYSTORE_*`와 `upload-key.sha256`을 함께 바꾼다.
- 서비스 계정 키는 Google Cloud에서 폐기하고 새로 발급해 `PLAY_SERVICE_ACCOUNT_JSON`을 갱신한다.

## 실측 기록

(첫 실행 뒤 채운다 — 단계별 시간, 최대 메모리, AAB 크기, 환경변수 속성이 서명에 닿았는지, 서비스 계정 권한·`completed` 수락 여부, 필요했다면 낮춘 gradle 설정과 근거.)

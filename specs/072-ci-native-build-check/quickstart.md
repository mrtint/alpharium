# Quickstart: CI 네이티브 빌드 확인 검증

앱 코드가 바뀌지 않으므로 **실기기 검증은 해당 없음**이다. 검증은 기기 없는 테스트와 GitHub 러너에서의 실행이다.

## 1. 기기 없는 테스트

```bash
npx jest __tests__/ci/native-build-workflow.test.ts
npm test
npm run lint
```

통과 기준: 모두 통과. 위반 주입(아래 §3)에서는 각각 실패해야 한다.

## 2. 러너 실행

`workflow_dispatch`만 있는 워크플로는 `main`에 파일이 있어야 Actions에서 수동 실행할 수 있다. **머지 전에는** 일회용 브랜치로 확인한다.

1. `git switch -c 072-measure` 후 이 브랜치에서만 `native-build.yml`의 `on.push.branches`에 `072-measure`를 더하고 push한다 — push가 실행을 시작한다.
2. 실행 요약(Summary)에서 러너 사양·단계별 시간·안드로이드 최대 메모리를 읽는다.
3. 빈 커밋을 push해 캐시 적중 시간을 읽는다. 앞선 실행이 도는 중에 push하면 취소되는지도 본다.
4. 머지 뒤에는 Actions → 「Pocketlog Native Build」 → Run workflow로 수동 실행이 되는지 한 번 확인한다.
5. 끝나면 `072-measure`를 지운다.

통과 기준: 두 잡이 초록. 요약에 값이 있다.

## 3. 위반 주입

### 러너 (SC-001)
- `072-measure`에서 `app.json`의 `plugins`에 없는 이름(`"./plugins/does-not-exist"`)을 넣고 push → 안드로이드·iOS 두 잡이 빨갛게 된다.
- 되돌리고 push → 둘 다 초록.

### 소스 계약 (SC-004) — 치환이 실제로 적용됐는지 먼저 단언한다
| 주입 | 기대 |
| --- | --- |
| 트리거에 `pull_request:` 추가 | 테스트 실패 |
| 어느 단계에 `continue-on-error: true` | 테스트 실패 |
| 안드로이드 명령에서 `-PreactNativeArchitectures=arm64-v8a` 제거 또는 다른 ABI 추가 | 테스트 실패 |
| `secrets.X` 참조 또는 `actions/upload-artifact` 추가 | 테스트 실패 |
| 한 잡에 `needs:` 추가 | 테스트 실패 |
| `cancel-in-progress` 제거 | 테스트 실패 |

## 4. 확인 사항

- 브랜치 보호의 필수 체크에 이 잡이 들어 있지 않다(FR-013). 저장소 설정이라 소유자가 확인한다.

## 5. 실측 기록 (구현 뒤 채움)

| 항목 | 첫 실행(캐시 없음) | 둘째 실행(캐시 적중) |
| --- | --- | --- |
| 러너 사양 (ubuntu / macos) | | |
| 안드로이드 prebuild | | |
| 안드로이드 gradle 빌드 | | |
| 안드로이드 최대 메모리 | | |
| iOS prebuild | | |
| iOS pod install | | |
| iOS xcodebuild | | |
| 전체 걸린 시간 (잡별) | | |

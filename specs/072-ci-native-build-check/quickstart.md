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

`pull_request`는 PR 브랜치의 워크플로 파일을 쓰므로 파일이 아직 `main`에 없어도 PR에서 곧바로 돈다.

1. 피처 브랜치를 push하고 PR(초안)을 연다 — 워크플로 파일 자신이 경로 필터에 들어 있어 실행이 시작된다.
2. 실행 요약(Summary)에서 러너 사양·단계별 시간·안드로이드 최대 메모리를 읽는다.
3. `gh run rerun <id>`로 같은 ref에서 한 번 더 돌려 캐시 적중 시간을 읽는다. 러너 수정 push가 진행 중이던 앞선 실행을 취소하는지도 관찰한다.
4. 머지 뒤에는 `main` push 실행이 도는지, Actions → 「Pocketlog Native Build」 → Run workflow로 수동 실행이 되는지 한 번씩 확인한다.

통과 기준: 두 잡이 초록. 요약에 값이 있다.

## 3. 위반 주입

### 러너 (SC-001, 경로 필터 음성)
- 피처 브랜치에서 `072-inject`를 따고 `app.json`의 `plugins`에 없는 이름(`"./plugins/does-not-exist"`)을 넣은 뒤, **피처 브랜치를 base로** 초안 PR을 연다(diff가 `app.json`뿐이라 경로 필터에 걸린다) → 안드로이드·iOS 두 잡이 빨갛게 된다. 되돌려 push → 둘 다 초록.
- 피처 브랜치에서 `072-docs-only`를 따고 문서 파일 하나만 바꿔 피처 브랜치를 base로 PR을 연다 → 이 확인이 **시작되지 않는다**(`ci.yml`만 돈다).
- 확인이 끝나면 두 PR을 닫고 두 브랜치를 지운다.

### 소스 계약 (SC-004) — 치환이 실제로 적용됐는지 먼저 단언한다
| 주입 | 기대 |
| --- | --- |
| `pull_request`의 `paths` 항목 하나 제거·추가, 또는 `paths` 전체 제거 | 테스트 실패 |
| `pull_request_target:` 추가 | 테스트 실패 |
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

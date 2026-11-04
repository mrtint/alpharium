# Research: 첫 일기 분기

결정과 근거는 설계문서와 spec Clarifications에 있다. 여기는 소스를 읽어 확인한 사실과 고른 구조만 적는다.

## R1. 쓰기 경로
- **Decision**: 060 `writeRequest`에 첫 일기 갈래(`firstDiary`)를 더한다.
- **Rationale**: 홈이 이미 번호표·시작 조건·거절을 처리한다. 다른 점은 이어 하기 신청과 결과 콜백뿐이다.
- **Alternatives**: 파이프라인 직접 호출 유지(쓰는 중·그만두기 없음), 홈이 흐름 전체를 소유(되돌림은 홈을 내리는 일이라 불가).

## R2. 조용한 실패
- **Decision**: 요청에 `silencesFailure(result)`를 실어 홈이 토스트 전에 묻는다.
- **Rationale**: 되돌림이 홈을 내리는 것과 토스트가 같은 틱에 묶이면(React 배치) 안 보일 수 있지만, 묵시적이고 조립 없이는 시험할 수 없다(AGENTS 「스쳐 지나가는 토스트」). `quietFailure` 불리언은 끊김까지 토스트를 없앤다 — 끊김은 토스트가 있어야 한다.

## R3. 재료 읽기 자리
- **Decision**: `AppFrame`이 `createAppPipeline(environment)`의 `previewDay`·`store`로 읽고, 그동안 `WelcomeScreen` `checking`을 유지한다.
- **Rationale**: 정상 동작 확인 effect와 같은 조립 통로. 미리보기는 새 수집 경로가 아니다(PV4).

## R4. 스테이지 판정
- **Decision**: `resolveFirstRunStage`를 바꾸지 않는다. 렌더 게이트에서 `firstDiary.step === "reading"`만 더 본다.
- **Rationale**: 첫 일기는 `done` 이후의 일이고 `consent-gate-source.test.ts`가 입력 일곱을 잠근다.

## R5. 되돌림 갈래
- **Decision**: `write-failures.ts`의 사유 분류로 `interrupted`를 가른다. 파이프라인 `cancelled`(칸에 그만둠이 선 끝남)는 `stopped`, `already-running`은 `busy`.
- **Rationale**: 같은 분류표가 진단 「최근 실패」를 만든다. 문구 비교를 새로 두지 않는다.

## R6. e2e 사실(소스 읽기)
- 안드로이드 표본(`manifest.ts`)은 1~30일 전뿐이라 **전용 기기의 오늘은 재료가 없다**. 재료 없음 흐름은 그대로 서고, 재료 있음 흐름만 오늘 사진을 심어야 한다.
- `seed:day`의 템플릿 사진은 VLM이 자주 실패하므로(AGENTS) 표본 사진을 `s30-` 접두로 심어 표본 정리 명령이 함께 지우게 한다.
- iOS 층 2는 `ios:seed`로 사진을 심어 전제를 맞추므로 첫 일기 흐름을 `seedsPhotos: true`로 바꾼다. iOS 재료 없음은 시뮬레이터 확인으로 본다.
- 「온보딩부터 다시」는 `welcomeShown`·`namingDoneThisSession`을 되돌리지 않아 이 흐름에 닿지 않는다. 재현은 `onboarding.json`을 고쳐 앱을 다시 띄운다.

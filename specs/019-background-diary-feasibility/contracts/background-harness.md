# Contract: 백그라운드 검증 하네스

이 문서는 `src/spike/` 아래 하네스 코드가 지켜야 할 불변식을 정한다.
018의 `contracts/prewarm-engine.md`와 같은 형식(불변식을 E-번호로
붙이고, 위반 주입으로 검증 계획을 남긴다)을 따른다.

## 불변식

**H1 — 제품 계층을 수정하지 않는다.**
`src/spike/`의 어떤 파일도 `src/app/`·`src/diary/`·`src/inference/`·
`src/models/`·`src/signals/`·`src/vision/` 안의 파일을 **수정**하지
않는다(가져다 **쓰는 것**은 된다). 유일한 예외는
`src/ui/DiagnosticsScreen.tsx`에 진입점 한 줄을 추가하는 것이다.

- 위반 주입: `src/spike/` 파일이 `src/diary/prompt.ts`를 수정한다고
  가정하면, 헌법 검사(`scripts/check-constitution.mts`)에 추가할
  규칙(tasks 단계에서 결정)이 이를 잡아야 한다. 그런 규칙이 없다면
  최소한 PR 리뷰에서 diff로 드러난다 — plan.md의 "제품 파일 0개 수정"
  주장이 이 계약의 검증 대상이다.

**H2 — 하네스는 판정 로직을 우회하지 않는다.**
백그라운드 콜백은 `wiring.ts`의 `createAppPipeline()`이 돌려준
`pipeline.run()`을 그대로 부른다. `acceptance.ts`의 4갈래 판정,
`prompt.ts`의 프롬프트 조립을 재구현하거나 건너뛰지 않는다.

- 위반 주입: 콜백이 `pipeline.run()` 대신 `backend.generate()`를 직접
  불러 판정을 건너뛰면, 생성된 텍스트가 거부 갈래(empty/echo/language/
  unfinished)에 해당해도 저장되는 사고가 난다 — 이것이 H2가 막는 것이다.
  단위 테스트가 하네스 콜백 안에 `acceptance`나 `backend.generate`에
  대한 직접 참조가 없는지 소스 문자열 검사로 확인한다(007·009 관례 —
  jest가 아니라 소스를 직접 읽는 계약 테스트).

**H3 — 로그 기록은 실행 결과에 영향을 주지 않는다.**
`appendVerificationEvent()`가 실패(디스크 오류 등)해도 `pipeline.run()`의
결과나 `BackgroundTaskResult` 반환값에는 영향을 주지 않는다 — 로그는
관측이지 실행의 일부가 아니다.

- 위반 주입: 로그 쓰기 실패 시 예외가 콜백 밖으로 전파되면 태스크
  전체가 `Failed`로 잘못 기록되어(진짜 원인은 파이프라인이 아니라
  로그 I/O), FR-004가 요구하는 "원인 구분"이 오히려 왜곡된다. 로그
  기록 지점을 개별 `try/catch`로 감싸는 것으로 방지한다.

**H4 — E1 경합은 관측되지만 은폐되지 않는다.**
화면의 생성 흐름과 백그라운드 태스크가 동시에 실행되어 충돌이
발생하면, 그 충돌 자체가 `task-completed`의 `outcome: "threw"`나
별도 이벤트로 로그에 남아야 한다 — 조용히 삼켜 로그에 아무것도
안 남기지 않는다.

- 위반 주입: 콜백의 최상위 `try/catch`가 있는데 `catch` 블록이 아무
  로그도 남기지 않으면, 경합이 실제로 일어났는지 findings.md 작성
  시점에 판단할 수 없다 — H4는 최상위 `catch`가 반드시
  `appendVerificationEvent({ kind: "task-completed", outcome: "threw",
  reason: ... })`를 부르도록 강제한다.

**H5 — 하네스는 헌법 원칙 IV가 금지하는 것을 로그에 담지 않는다.**
`VerificationEvent`의 어떤 필드에도 모델 식별자, 토큰 수, 네이티브
`timings`, 생성된 일기 본문이 담기지 않는다(data-model.md 「이 모델이
의도적으로 갖지 않는 것」).

- 위반 주입: `task-completed` 이벤트에 `reason`으로 예외 메시지를
  담을 때, 그 메시지가 우연히 모델 파일 경로나 프롬프트 내용을
  포함하면 안 된다 — reason은 파이프라인 단계 이름과 짧은 실패
  카테고리로 제한한다(자유 형식 문자열을 그대로 담지 않는다).

## 이 계약이 다루지 않는 것

- WorkManager 자체의 정확성(예: 정말 15분 이상 간격을 지키는가)은
  Expo/안드로이드의 계약이며 이 저장소가 검증할 대상이 아니다 —
  이 계약은 "우리 코드가 그 위에서 올바르게 행동하는가"만 다룬다.
- 하네스의 성능(로그 쓰기 속도 등)은 다루지 않는다 — 이 검증에서
  중요한 것은 정확한 관측이지 효율이 아니다.

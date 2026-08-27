# Phase 1 Data Model: 백그라운드 자동 일기 생성 기술 검증

이 검증은 새로운 영속 제품 엔티티를 도입하지 않는다(spec.md 「Key
Entities」). 여기서 정의하는 것은 검증 전용 관측 기록의 모양뿐이며,
`src/spike/verification-log.ts`에만 존재한다.

## VerificationEvent

한 번의 백그라운드 실행 시도에서 남는 이벤트 로그의 한 줄. 파일에는 이
타입의 값이 JSON Lines(줄마다 JSON 객체 하나)로 누적된다.

```ts
type VerificationEvent =
  | {
      kind: "task-entered";
      at: string; // ISO 8601, Date.toISOString() — 벽시계 기준
      day: string; // DayDate — 이 실행이 대상으로 삼은 하루
      appState: "active" | "background" | "inactive" | "unknown";
      // RN 코어 AppState.currentState를 콜백 진입 시점에 읽은 값
      // (research.md §6a). "active"면 앱 UI가 그 순간 전면에 있었다는
      // 뜻이며, FR-003이 배제하려는 "약한 백그라운드"일 가능성을
      // 시사한다. 정확한 화면-꺼짐·잠금 여부는 알 수 없다는 한계를
      // findings.md에서 명시한다 — 이 필드는 근사치이지 완전한 판정이
      // 아니다.
    }
  | {
      kind: "permission-checked";
      at: string;
      axis: "photos" | "location";
      valid: boolean; // getLocation() 등 실제 호출 성공 여부 (§3 research.md)
    }
  | {
      kind: "pipeline-stage";
      at: string;
      stage: PipelineStage; // pipeline.ts가 이미 정의한 갈래 재사용, 새로 만들지 않음
    }
  | {
      kind: "task-completed";
      at: string;
      outcome: "ok" | "pipeline-failed" | "threw";
      // "ok" — PipelineResult.ok === true
      // "pipeline-failed" — PipelineResult.ok === false (stage 필드로 어느 단계인지 앞선
      //   pipeline-stage 이벤트와 대조)
      // "threw" — pipeline.run() 자체가 예외를 던짐 (버그거나 OS가 강제 종료 신호를 줌)
      reason?: string; // PipelineResult.reason 또는 catch된 예외의 message
    }
  | {
      kind: "task-result";
      at: string;
      result: "Success" | "Failed"; // BackgroundTask.BackgroundTaskResult로 반환한 값
    };
```

**필드 설계 근거**:

- `at`은 벽시계 기준 문자열이다 — 헌법 원칙 IV가 금지하는 것은 "네이티브
  추론 지표"(토큰 수, 내부 타이밍)이지, 이 이벤트가 언제 일어났는지를
  사람이 읽을 시각으로 남기는 것이 아니다. 018이 이미 "완료 후 1회성
  사후 기록"으로 이 경계를 확정했다(헌법 1.2.0).
- `task-entered`와 `task-result`(또는 `task-completed`)를 별개의
  이벤트로 둔 것은 research.md §2의 핵심 결정이다 — 두 이벤트의 유무
  조합만으로 FR-004가 요구하는 3단계(시도 없음/시도했으나 중단/완주)를
  가른다:
  - 둘 다 없음 → OS가 실행 기회 자체를 주지 않음
  - `task-entered`만 있고 `task-completed`/`task-result`가 없음 → 실행은
    됐으나 중간에 죽음(OOM kill, 시간 제한 등) — 마지막으로 기록된
    `pipeline-stage`가 어느 단계에서 죽었는지 알려준다
  - 둘 다 있음 → 완주(성공/실패는 `outcome`이 가른다)
- `permission-checked`는 `pipeline-stage`와 분리된 이벤트다 — FR-010이
  요구하는 "권한 상실은 실행 실패와 구분되는 별도 실패 양상"이라는
  요건을 로그 구조 자체로 강제한다. 파이프라인이 성공(`outcome: "ok"`)
  했더라도 `permission-checked`에 `valid: false`가 있으면 "사진 없이
  생성된 일기"라는 것이 로그만으로 드러난다.

## 저장 위치와 형식

- 파일: 기기 로컬, `expo-file-system`의 문서 디렉터리 아래
  `verification-log.jsonl`(정확한 경로는 tasks 단계에서 확정 —
  제품 `DiaryStore`의 저장 경로와 겹치지 않는 별도 파일이어야 한다는
  제약만 지금 고정한다).
- 형식: JSON Lines. 한 줄이 깨져도(예: 앱이 쓰는 도중 죽음) 다른 줄에
  영향이 없어야 하기 때문이다 — 배열 하나로 감싸면 마지막 원소를 쓰다
  실패했을 때 파일 전체가 파싱 불가능해진다.
- 기록 함수(`appendVerificationEvent(event: VerificationEvent): Promise<void>`)는
  실패해도 예외를 상위로 던지지 않는다(로그 실패가 검증 실행 자체를
  막으면 안 된다) — 다만 로그 실패 자체도 최선을 다해 `console.error`로
  남긴다.

## 읽기 계약

진단 패널(`DiagnosticsBackgroundPanel.tsx`)이 쓰는 읽기 함수
`readVerificationLog(): Promise<VerificationEvent[]>`는 파일이 없으면
빈 배열을 돌려준다(예외를 던지지 않는다) — 검증 시작 전 상태를 정상
상태로 다룬다.

## 이 모델이 의도적으로 갖지 않는 것

- **재시도 횟수·평균 시간·성공률 같은 집계 필드가 없다.** 원 이벤트를
  그대로 남기고, 집계·해석은 findings.md를 사람이 쓸 때 한다 — 집계
  필드를 코드에 두면 그것이 헌법 원칙 IV가 금지하는 "자동 채점"에
  가까워진다.
- **모델 식별자·프롬프트 내용·생성된 일기 본문을 담지 않는다.** 이
  로그는 "OS가 실행을 완주시켰는가"만 답하면 된다(FR-006 — 판정
  갈래·내용 자체는 기존 4갈래 판정과 `DiaryEntry` 저장을 그대로
  신뢰한다).

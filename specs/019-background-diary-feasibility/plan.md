# Implementation Plan: 백그라운드 자동 일기 생성 기술 검증

**Branch**: `019-background-diary-feasibility` | **Date**: 2026-08-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-background-diary-feasibility/spec.md`

## Summary

이것은 기능 구현 계획이 아니라 **기술 검증(스파이크) 계획**이다 — spec.md
「이 스펙의 성격」 참고. 만들 산출물은 동작하는 자동 생성 기능이 아니라, "OS
표준 주기적 작업 예약(안드로이드 WorkManager류) 경로에서 화면 없이 매일
자동으로 일기가 완주하는가"라는 질문에 대한 **YES/NO/조건부 결론과 실측
근거**다.

다만 그 결론을 실기기에서 관측하려면 최소한의 계측 코드는 있어야 한다 —
관측 자체가 불가능하면 결론을 낼 수 없다. 그래서 이 계획은:

1. `expo-background-task`(Expo 관리 패키지, 안드로이드에서 WorkManager로
   구현됨, 최소 간격 15분)로 기존 파이프라인(`wiring.ts`의
   `createAppPipeline()`)을 화면 없이 트리거하는 **최소한의 관측 하네스**를
   만든다.
2. 그 하네스는 제품 코드 경로(`wiring.ts`, `pipeline.ts`, `on-device.ts`)를
   **하나도 바꾸지 않고** 그 위에 얇게 얹는다 — 헌법이 이미 정한 경계(원칙
   IV: 측정 장치를 제품에 들이지 않는다)를 검증 목적으로도 우회하지 않는다는
   FR-005를 지키는 유일한 방법이다.
3. 실행 시도·완주·중단 지점·권한 유효성을 **파일 로그**(원칙 IV가 이미
   금지한 "네이티브 지표 노출"과 무관한, 벽시계 기준 이벤트 기록)로 남긴다.
4. 최소 1회의 24시간+ 실기기 관측 후, 그 로그를 근거로 결론 문서
   (`findings.md`, 이 스펙의 최종 산출물)를 작성한다.

이 하네스는 **검증이 끝나면 남기지 않는다**(Assumptions 참고) — 병합되어
제품에 남는 것은 결론 문서뿐이다. 결론이 "가능"이거나 "조건부 가능"이라
실제 기능으로 만들 가치가 있다고 판단되면, 그 구현은 **별도 스펙**(020+)의
일이다.

## Technical Context

**Language/Version**: TypeScript (React Native 0.86, Expo 57)

**Primary Dependencies**: `expo-background-task`(신규 — 안드로이드에서
WorkManager로 구현되는 Expo 관리 패키지, 최소 반복 간격 15분, development
build 필요·Expo Go 불가), `expo-task-manager`(신규 — `expo-background-task`의
필수 짝, 태스크를 전역 스코프에 등록), 기존 `src/app/wiring.ts`·
`src/diary/pipeline.ts`·`src/inference/select.ts` 그대로 재사용(수정 없음).

**Storage**: 검증 실행 기록은 `expo-file-system`으로 기기 로컬 파일 하나에
줄 단위 JSON으로 남긴다(제품 `DiaryStore`와 무관한 별도 파일 — spec.md
「Key Entities」의 "검증 실행 기록"). 일기 자체는 기존 `fileStore` 경로를
그대로 통과하므로 검증 성공 시 실제 `DiaryEntry`로 남는다(FR-006).

**Testing**: 이 검증 하네스 자체는 기기 없는 로직 테스트를 하나만 둔다 —
로그 기록 함수의 입출력 계약(어떤 이벤트가 어떤 필드로 남는지)만
`npm run test:logic`으로 검증한다. **검증의 본체는 테스트가 아니라 실기기
관측이다** — 이 스펙의 성격 자체가 "코드가 하는 일을 자동 테스트로
증명"이 아니라 "OS가 실제로 무엇을 하는지 실측"이기 때문이다(spec.md
FR-001, 헌법 원칙 V).

**Target Platform**: Android 실기기(dev 빌드, WorkManager 지원 필요 —
Expo Go·시뮬레이터 불가). 저장소가 이미 실기기 검증에 써 온 기기 중
하나(AGENTS.md, 예: SM-G986N)로 충분하다(spec.md Assumptions).

**Project Type**: 모바일 앱(단일 프로젝트, Expo/React Native) — 이 검증은
새 화면을 추가하지 않는다. 개발자 진단 화면에 최소한의 상태 표시(등록
여부·마지막 실행 로그 열람)만 얹어 기기에서 손으로 확인할 수 있게 한다
(원칙 III "진단 경로는 사용자 화면이 아니다"의 기존 경계 재사용).

**Performance Goals**: 해당 없음 — 이 검증은 속도를 개선하는 기능이
아니다. "완주하는가/안 하는가"가 유일한 판정 축이다.

**Constraints**:
- 헌법 원칙 IV — 이 검증은 모델 출력을 채점·비교하지 않는다. 로그가 담는
  것은 "실행 시도 시각·완주 여부·중단 단계·권한 유효성"뿐이며, 생성된
  일기 내용이나 소요 시간을 여러 번 비교하지 않는다(spec.md FR-005·FR-006).
- 헌법 원칙 II·V — 프롬프트·판정 로직(`prompt.ts`, `acceptance.ts`)은
  전혀 건드리지 않는다. 백그라운드에서 생성된 일기도 4갈래 판정을 그대로
  거친다(FR-006).
- E1(한 번에 하나의 추론 엔진만 연다) — 백그라운드 태스크가 트리거된
  시점에 화면이 동시에 열려 있고 사용자가 그 화면에서도 생성을 시작하면
  두 실행이 겹칠 수 있다. 이 스파이크는 그 경합을 막는 잠금 장치를 만들지
  않고, **경합이 실측되면 그 자체를 결과로 기록한다**(FR-004 — 어느
  단계에서 무슨 신호로 충돌했는지가 유효한 관측이다). 제품화 여부를 결정할
  020+ 스펙이 이 문제의 실제 해법(예: 화면과 태스크가 같은 잠금을 공유)을
  설계한다.
- WorkManager 최소 간격 15분, "매일" 반복은 OS 표준 주기적 작업 예약만
  시도(spec.md Clarifications) — 정확 시각 alarm 계열은 쓰지 않는다.
- 권한(사진·위치)이 이미 부여된 기기에서만 검증한다(FR-010) — 권한 요청
  흐름 자체는 이 검증의 대상이 아니다.

**Scale/Scope**: 신규 파일 최소 3개(백그라운드 태스크 정의, 검증 로그
기록기, 진단 화면에 붙이는 최소 위젯) + 기존 진단 화면 1개 파일에 소량
추가. 제품 파이프라인 파일은 **0개 수정**(위 Constraints 참고) — 이것이
FR-005를 만족시키는 구조적 근거다.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 검증이 지키는 방식 | 게이트 |
|---|---|---|
| **I. 온디바이스가 제품이다** | 백그라운드 태스크는 기존 `wiring.ts`의 `createAppPipeline()`(내부적으로 `selectBackend()`·`createPipeline()`을 부름)을 그대로 호출한다. 새 추론 경로를 만들지 않는다. | PASS |
| **II. 화자는 휴대폰이고 시야는 좁다** | `prompt.ts`를 건드리지 않는다. 백그라운드 트리거라는 사실이 프롬프트 내용에 스며들지 않는다. | PASS |
| **III. 모델은 캐릭터다** | 검증용 진단 위젯은 기존 진단 경로(배포 빌드에서 닿지 않음이 보장된 자리)에만 추가한다. 사용자 화면에는 아무것도 노출하지 않는다. | PASS |
| **IV. 측정 장치를 제품에 들이지 않는다** | 로그는 "실행 시도/완주/중단 지점/권한 유효성"이라는 OS 수준 사실만 담는다 — 모델 출력 점수화·비교·채점이 아니다(spec.md 「이 스펙의 성격」이 이미 이 경계를 명시). 하네스 자체가 검증 종료 후 제거 대상이라 제품에 영구히 남지 않는다. | PASS |
| **V. 관측된 사실과 추측을 구분한다** | 실측(이 기기·이 OS 버전에서 관측된 것)과 그 밖으로 일반화할 수 없는 것을 findings.md에서 명시적으로 가른다(spec.md SC-002·User Story 3). | PASS |
| **E1 (한 번에 하나)** | 이 스파이크는 잠금 장치를 새로 만들지 않고 경합 가능성을 열어 둔 채 관측한다(위 Constraints) — 이는 완화가 아니라 "지금 경합하면 무슨 일이 나는가"도 이 검증이 답해야 할 질문이기 때문이다. 실제 해법은 020+ 스펙으로 넘긴다. | PASS (조건부 관측 대상으로 명시) |

**초기 게이트 통과 — 위반 없음. Complexity Tracking 불필요.**

**Phase 1 설계 후 재확인**: data-model.md·contracts/background-
harness.md·quickstart.md 어디에도 제품 계층 수정이나 새 측정 로직이
추가되지 않았다 — data-model.md는 `src/spike/` 전용 로그 모양만
정의하고(제품 엔티티 없음), contract는 하네스가 제품 경계를 넘지
않도록 강제하는 불변식만 추가한다(H1~H5). 게이트는 그대로 PASS다.

## Project Structure

### Documentation (this feature)

```text
specs/019-background-diary-feasibility/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물
├── data-model.md         # Phase 1 산출물
├── quickstart.md         # Phase 1 산출물
├── contracts/            # Phase 1 산출물
│   └── background-harness.md  # 하네스가 지켜야 할 계약(로그 모양, 원칙 IV 경계)
├── findings.md           # 실기기 관측 종료 후 작성 — 이 검증의 최종 산출물(YES/NO/조건부)
└── tasks.md               # Phase 2 산출물 (/speckit-tasks, 이 명령 아님)
```

### Source Code (repository root)

이 저장소는 이미 확립된 단일 구조를 쓴다(AGENTS.md 「코드를 어디에
두는가」). 검증 하네스는 기존 계층 경계를 존중하는 새 디렉터리
`src/spike/`(가칭, 실제 명명은 tasks 단계에서 확정) 하나에 모아, **검증이
끝나면 이 디렉터리 하나만 지우면 제품 코드에 흔적이 남지 않게** 한다.

```text
src/
├── spike/
│   ├── background-diary-task.ts   # [신규] TaskManager.defineTask + wiring.ts 호출
│   ├── verification-log.ts        # [신규] 실행 기록을 파일에 남기는 순수 함수 + I/O 경계
│   └── DiagnosticsBackgroundPanel.tsx  # [신규] 진단 화면에 붙이는 등록/로그 열람 위젯
└── ui/
    └── DiagnosticsScreen.tsx      # [수정] 위 패널을 조건부(local·dev 전용, 기존 showsOnScreen()) 삽입

__tests__/
└── spike/
    └── verification-log.test.ts   # [신규] 로그 기록 함수의 입출력 계약만 검증(기기 불필요)
```

**Structure Decision**: 새 디렉터리 `src/spike/`를 만든다 — 이것이
"검증 코드와 제품 코드를 뒤섞지 않는다"(헌법 원칙 IV가 2026-08-12 되돌리기의
근거였던 바로 그 문제)를 구조적으로 보장하는 유일한 방법이다. 기존
`src/ui/DiagnosticsScreen.tsx` 한 파일만 진입점으로 최소 수정하고,
나머지 제품 계층(`src/app/`, `src/diary/`, `src/inference/`)은 이 계획
전체에서 **한 줄도 수정하지 않는다**. 헌법 검사(`scripts/check-
constitution.mts`)에 `src/spike/`가 `diary/store`·`models/roster` 등
민감한 경계에 닿는지 감시하는 규칙을 하나 추가할지는 tasks 단계에서
결정한다(003·010·011이 신규 디렉터리를 만들 때마다 해온 패턴).

## 검증 종료 후 하네스의 운명

원 제안(사용자 대화)은 이것을 "매일 자동으로 일기를 쓰는 기능"으로
읽을 수 있었지만, 이 스펙은 **기술 검증**으로 범위를 좁혔다(spec.md
Clarifications 이전, `/speckit-specify` 대화에서 확정). 그 결과:

- `src/spike/`는 findings.md 작성 후 **별도 커밋으로 제거**하거나, 결론이
  "조건부 가능"이라 020+ 스펙이 바로 이어질 예정이면 그 스펙의 출발점
  코드로 남겨둘지 사용자와 상의한다 — 이 결정은 이 계획의 범위 밖이다
  (spec.md Assumptions 마지막 항목과 동일한 이유: "만들지 여부는 이
  스펙이 정하지 않는다").
- `npm run lint`의 헌법 검사가 `src/spike/`를 예외로 허용해야 하는지
  (측정 코드를 제품 코드와 다른 규칙으로 볼지)는 tasks 단계에서 실제
  파일을 쓰며 판단한다 — 지금은 "제품 계층에 닿지 않는 격리된 디렉터리"
  라는 설계만 고정한다.

## Complexity Tracking

*게이트 위반 없음 — 이 절은 비워 둔다. E1 관련 조건부 관측은 완화가
아니라 이 검증이 명시적으로 답하려는 질문이므로 Complexity Tracking
대상이 아니다(위 Constitution Check 표 참고).*

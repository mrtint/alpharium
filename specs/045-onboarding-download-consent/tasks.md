# Tasks: 필수 자산 다운로드 동의 안내와 진행 슬라이드

**Input**: Design documents from `specs/045-onboarding-download-consent/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/,
quickstart.md

**Tests**: 이 저장소는 계약을 먼저 정하고 테스트를 먼저 쓰는 관례
(AGENTS.md "개발 방식")를 따른다. `contracts/download-consent-gate.md`의
C1~C9 각각에 대응하는 계약 테스트를 순수 로직에 먼저 쓰고, 화면은 기존
계약 테스트 패턴(007 이후 관례, `readFileSync` 소스 검사 + RNTL 렌더
검사)을 따른다.

**Organization**: User Story 1(동의 Dialog)과 User Story 3(작명 게이트
순서)는 같은 `resolveFirstRunStage` 확장을 공유하므로 Foundational
단계에서 함께 판정 로직을 만들고, 화면은 스토리별로 나눠 만든다. User
Story 2(슬라이드 화면)는 독립된 새 컴포넌트라 병렬 가능하다.

## Phase 1: Setup

*(해당 없음 — 새 의존성 추가 없음, 043·044가 이미 토큰·컴포넌트 관례를
세워 두었다.)*

## Phase 2: Foundational

**Purpose**: 모든 User Story가 의존하는 판정 계층(`OnboardingFlag` 확장,
`resolveFirstRunStage` 확장, `resolveSlideStage` 신규)을 먼저 만든다 —
화면은 이 판정 결과를 받기만 한다.

- [ ] T001 `src/onboarding/flag.ts`의 `OnboardingFlag`에
      `downloadConsented: boolean` 필드를 추가하고, `DEFAULT_ONBOARDING_FLAG`·
      `loadOnboardingFlag()`·`saveOnboardingFlag()`가 이 필드를 읽고
      쓰도록 확장한다(data-model.md "OnboardingFlag 확장", R1). 옛 파일
      (키 없음)은 `false`로 읽는다(`welcomeShown` 추가 시 패턴 재사용).
- [ ] T002 [P] `__tests__/onboarding/flag.test.ts`(기존 파일)에
      `downloadConsented` 관련 케이스를 추가한다 — 기본값 `false`, 저장·
      로드 왕복, 옛 파일 호환(키 없음 → `false`), `true`가 된 뒤 다른
      필드 갱신에도 유지됨(C5, "되돌리는 코드 경로 없음"은 코드에 그런
      경로를 추가하지 않는 것으로 자연히 성립 — 이 테스트는 왕복만
      검증).
- [ ] T003 `src/firstrun/progress.ts`의 `FirstRunStage` 유니온에
      `"download-consent"`·`"downloading"`을 추가하고 `"waiting-for-download"`를
      제거한다. `resolveFirstRunStage()` 시그니처에 `downloadConsented:
      boolean`을 추가하고 우선순위를 data-model.md "FirstRunStage 확장"
      순서로 재작성한다(C2·C3·C4).
- [ ] T004 [P] `src/firstrun/consent.ts` 신규 파일에 `SlideStage` 타입과
      `resolveSlideStage()` 순수 함수를 작성한다(data-model.md
      "SlideStage", C6·C7 — `elapsedMs`를 4000으로 나눠 `min(3, ...)`
      클램프, `downloadReady === true`면 무조건 `{ kind: "complete" }`).
- [ ] T005 [P] `__tests__/firstrun/progress.test.ts`(기존 파일 확장)에
      C2·C3·C4 각각의 계약 테스트를 추가한다 — C2: `downloadConsented:
      false, downloadReady: false, namingDone: false` →
      `"download-consent"`(`"naming"`이 아님을 명시 확인). C3:
      `downloadReady: true`이면 `downloadConsented` 무관하게
      `"download-consent"`/`"downloading"`이 나오지 않음(속성 기반 확인,
      예: fast-check 없이 대표 케이스 3~4개로 커버). C4:
      `namingDone: true`가 되는 시점엔 항상 `downloadReady: true`임을
      전제로 liveness 판정이 기존과 동일하게 동작함을 확인. 위반 주입
      1건(C2 우선순위를 되돌려 실패하는지) 수행 후 원복.
- [ ] T006 [P] `__tests__/firstrun/consent.test.ts` 신규 파일에 C6·C7
      계약 테스트를 작성한다 — `resolveSlideStage`가 진행률 인자를 받지
      않음(시그니처 검사, 예: 함수의 `.length`가 1인 객체 인자 하나뿐임을
      확인하거나 TS 타입 자체로 방어되므로 대표 입력 케이스로 커버),
      `elapsedMs`가 아무리 커도 `index`가 3을 넘지 않음, `downloadReady:
      true`면 `elapsedMs` 무관하게 `complete`. 위반 주입 1건(`min(3,
      ...)` 클램프 제거) 수행 후 원복.
- [ ] T007 `scripts/constitution-rules.ts`에 새 화면(`DownloadConsentDialog`·
      `DownloadProgressScreen`)이 `essential-assets.ts`의
      `ESSENTIAL_ASSET_KEYS`를 import하거나 사용하는지 잡는 검사가 기존
      `UI_TOUCHES_MODEL`/`ONBOARDING_TOUCHES_PRODUCT_LAYER` 규칙으로 이미
      커버되는지 확인한다(C9) — 커버되지 않으면 검사 패턴을 추가한다.
      `__tests__/scripts/check-constitution.test.ts`에 위반 주입 테스트를
      추가해 실제로 잡히는지 확인한다.

**Checkpoint**: 판정 계층(플래그·게이트·슬라이드 단계)이 전부 순수 함수로
존재하고 계약 테스트로 잠겨 있다 — 이제 화면을 만들 수 있다.

---

## Phase 3: User Story 1 - 무엇을 왜 받는지 알고 동의한다 (Priority: P1)

**Goal**: 권한 확인 직후 다운로드 시작 전에 동의 Dialog가 뜨고, [확인/시작]
전에는 다운로드가 시작되지 않는다.

**Independent Test**: 권한 스텝 완료 → 동의 Dialog 노출 확인 → 확인 전
다운로드 미시작 확인(quickstart.md D1).

### Tests for User Story 1

- [ ] T008 [P] [US1] `__tests__/ui/download-consent-dialog.test.tsx` 신규
      파일 — `DownloadConsentDialog`가 [확인/시작] 버튼 하나만 렌더하고
      (FR-002a), 모델 식별자·바이트·GB 텍스트가 소스에 없음을
      `readFileSync` 검사로 확인하며(FR-003, C9), 버튼을 누르면
      `onConfirm` 콜백이 정확히 1회 호출됨을 확인한다.

### Implementation for User Story 1

- [ ] T009 [US1] `src/ui/DownloadConsentDialog.tsx` 신규 — RN 코어
      `Modal`(`transparent` + 중앙 카드) + NativeWind `className`으로
      구현(research.md R5). props는 `{ visible: boolean; onConfirm: () =>
      void }`뿐 — 거부·건너뛰기 콜백을 두지 않는다(FR-002a). 문구는
      "일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 내려받아야
      해요" 계열 고정 상수(FR-003).
- [ ] T010 [US1] `App.tsx`에서 `firstRunStage === "download-consent"`일
      때 `DownloadConsentDialog`를 렌더하고, `onConfirm`에서
      `saveOnboardingFlag`로 `downloadConsented: true`를 저장한 뒤
      다운로드를 시작하도록 배선한다(T001·T003 연동). 확인 전에는 041의
      다운로드 트리거 함수가 호출되지 않는지 확인한다(FR-002).

**Checkpoint**: 동의 Dialog가 단독으로 동작 — 확인 없이는 다운로드가
시작되지 않는다.

---

## Phase 4: User Story 2 - 다운로드가 진행되는 동안 이야기를 본다 (Priority: P1)

**Goal**: 다운로드 중 4장 슬라이드 + 완료 화면이 리뷰 보드 `1o`~`1q`
레이아웃으로 보인다.

**Independent Test**: 동의 확인 후 슬라이드 1~4 자동 전환 관찰, 다운로드
완료 시 완료 화면 전환 확인(quickstart.md D2).

### Tests for User Story 2

- [ ] T011 [P] [US2] `__tests__/ui/download-progress-screen.test.tsx` 신규
      파일 — `resolveSlideStage`(T004) 기반으로 슬라이드 인덱스별
      헤드라인·본문이 올바르게 렌더되는지, 바이트·퍼센트·속도 텍스트가
      소스에 없는지(FR-006, C9), `complete` 단계에서 "시작할게요" 버튼과
      `onProceed` 콜백이 존재하는지 확인한다.

### Implementation for User Story 2

- [ ] T012 [P] [US2] `src/ui/DownloadProgressScreen.tsx` 신규 — 리뷰 보드
      `1o`~`1s` 대응 4장 슬라이드(진행 인디케이터 "0N/04", 사람이 쓴
      헤드라인·본문 고정 상수, `COLORS.surface` 배경의 빈 그림 자리
      — research.md R6, 4칸 진행 표시)와 `1q` 대응 완료 뷰("시작할게요"
      버튼)를 하나의 컴포넌트로 구현한다. 내부적으로 4초 타이머로
      `elapsedMs`를 추적해 T004의 `resolveSlideStage`에 넘긴다. props는
      `{ downloadReady: boolean; onProceed: () => void }`뿐.
- [ ] T013 [US2] `src/ui/WaitingForDownloadScreen.tsx`와
      `__tests__/ui/waiting-for-download-screen.test.tsx`를 삭제한다
      (research.md R4 — `DownloadProgressScreen`이 완전히 대체, 죽은
      코드를 남기지 않는다).
- [ ] T014 [US2] `App.tsx`에서 `firstRunStage === "downloading"`일 때
      `DownloadProgressScreen`을 렌더하고, `essentialsReady`를
      `downloadReady`로 전달하며, `onProceed`(완료 화면의 "시작할게요")를
      눌렀을 때 다음 렌더에서 `firstRunStage`가 `"naming"`(또는
      `"liveness"`/`"done"`)으로 넘어가도록 배선한다. 옛
      `WaitingForDownloadScreen` 렌더 분기(040이 만든 `"waiting-for-
      download"` 케이스)를 제거한다.

**Checkpoint**: 다운로드 진행 화면이 단독으로 동작 — 슬라이드가 정확히
전환되고 완료 시 다음 단계 버튼이 보인다.

---

## Phase 5: User Story 3 - 다운로드가 끝나야 작명으로 넘어간다 (Priority: P2)

**Goal**: 040의 "작명이 다운로드보다 먼저" 병렬 배치가 제거되고, 다운로드
완료 전에는 작명 화면에 도달할 수 없다.

**Independent Test**: 다운로드 미완료 상태에서 작명 화면 미도달 확인,
완료 직후 작명 화면 도달 확인(quickstart.md D3).

### Tests for User Story 3

- [ ] T015 [US3] `__tests__/firstrun/progress.test.ts`에 SC-003을 직접
      겨냥한 케이스를 추가한다 — `downloadReady: false, namingDone: true`
      (다운로드 미완료인데 작명은 이미 끝난 모순 입력)에서도 `"naming"`이
      아니라 `"downloading"`이 반환됨을 확인한다(우선순위가 여전히
      다운로드 우선임을 T005·C2와 다른 입력 조합으로 재확인). 이 저장소는
      `App.tsx` 전체를 RNTL로 렌더하는 기존 패턴이 없으므로(040·035가
      순수 판정 계층에서 게이트를 검증한 관례를 따름) 별도 화면 통합
      테스트는 만들지 않는다.

### Implementation for User Story 3

- [ ] T016 [US3] T003에서 이미 반영된 우선순위 재작성이 `App.tsx`의 렌더
      분기(T010·T014에서 배선)에도 정확히 반영됐는지 코드 리뷰로
      확인한다 — 기존 040 주석("작명이 다운로드를 기다리지 않는다")을
      이 스펙의 새 순서로 갱신하고, `welcomeNeeded`(035 게이트 호출)
      관련 주석도 새 우선순위에 맞게 정리한다.

**Checkpoint**: 세 User Story가 순서대로 이어져 "권한 → 동의 → 다운로드
슬라이드 → 작명"이 실제로 동작한다.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T017 [P] `npm run lint`(eslint + tsc + 헌법 검사 + prettier)와
      `npm test`(전체 스위트)를 돌려 회귀가 없는지 확인한다.
- [ ] T018 [P] `.maestro/download-consent-flow.yml` 신규 작성 —
      quickstart.md D1~D3 시나리오를 자동화하고
      `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(AGENTS.md "새
      Maestro 흐름은 등록해야 돈다").
- [ ] T019 `.maestro/welcome-naming.yml`·
      `.maestro/unified-permission-onboarding.yml`을 재실행해 이 스펙이
      바꾼 화면 순서 때문에 깨지지 않는지 회귀 확인한다(quickstart.md
      "Maestro 회귀"). 필요하면 두 흐름의 진입 경로를 갱신한다.
- [ ] T020 실기기 dev 빌드 1회 확인(AGENTS.md "그 한 번은 dev(debug)
      빌드다") — quickstart.md D1~D5 전부 수행. 새 네이티브 의존성이
      없으므로(research.md R5) release 재확인은 하지 않는다. **D5(041
      재개 상호작용)와 다운로드 실패 재시도(FR-011)는 자동화 테스트가
      없으므로 이 실기기 확인이 유일한 검증 지점이다** — 041이 이미
      만든 재개·재시도 로직을 그대로 신뢰하되, 화면 전환(동의 Dialog
      재노출 안 됨, 슬라이드 1번부터 재시작)이 실제로 그 로직과 맞물려
      동작하는지는 여기서만 확인된다.
- [ ] T021 AGENTS.md에 045 절을 추가해 이번 스펙의 핵심 결론(순서 정정
      경위, 동의 Dialog가 리뷰 보드에 없던 신규 요소라는 점, 실기기 관측
      결과)을 기록한다(007 이후 전 스펙의 관례).

## Dependencies & Execution Order

- **Phase 2(Foundational)는 모든 User Story의 선행 조건이다** — T001~T007이
  끝나야 T008 이후를 시작할 수 있다.
- **User Story 1(Phase 3)과 User Story 2(Phase 4)는 서로 독립적으로 병렬
  가능하다** — 둘 다 Phase 2 산출물만 소비하고 서로의 화면을 참조하지
  않는다.
- **User Story 3(Phase 5)은 User Story 1·2가 만든 화면이 `App.tsx`에
  배선된 뒤에만 의미가 있다** — T010·T014 완료가 전제.
- **Phase 6(Polish)은 전체 완료 후**.

## Parallel Example: Foundational

```text
T002 [P] flag.test.ts 확장       (T001 완료 후 즉시 병렬 가능)
T004 [P] consent.ts 신규 작성     (T003과 독립된 새 파일)
T005 [P] progress.test.ts 확장    (T003 완료 후)
T006 [P] consent.test.ts 신규     (T004 완료 후, T005와 병렬)
```

## Parallel Example: User Story 1 & 2

```text
# Foundational 완료 후 두 스토리를 서로 다른 개발자/세션이 병렬 진행 가능
Story 1: T008 → T009 → T010
Story 2: T011 → T012 → T013 → T014
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 2(Foundational) 완료
2. Phase 3(User Story 1 — 동의 Dialog) 완료
3. **검증**: 동의 없이 다운로드가 시작되지 않는 것만으로도 독립적 가치가
   있다(사용자 동의 없는 대용량 다운로드 방지, spec Why this priority).
4. 이 시점에서 다운로드 진행 화면은 여전히 옛 `WaitingForDownloadScreen`
   (Phase 4 이전)일 수 있음 — 배포 전 반드시 Phase 4까지 완료.

### Incremental Delivery

1. Foundational → 판정 계층 준비 완료
2. User Story 1 추가 → 동의 게이트 단독 검증
3. User Story 2 추가 → 슬라이드 화면 단독 검증
4. User Story 3 추가(주로 배선 확인) → 전체 순서 검증
5. Polish → 실기기 확인, Maestro 회귀, 문서화

## Notes

- [P] tasks = 서로 다른 파일, 완료된 의존성 없음
- [Story] 라벨은 spec.md의 User Story 번호에 대응
- 커밋은 각 Phase의 Checkpoint 단위로 묶는다(AGENTS.md "main에서 직접
  작업하지 않는다" — 이 브랜치(`045-onboarding-download-consent`)에서
  작업 후 PR).
- `WaitingForDownloadScreen` 삭제(T013)는 044 세션에서 겪은
  `CharacterPicker.tsx` 죽은 코드 문제를 반복하지 않기 위한 것이다.

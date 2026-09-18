# Tasks: Modernist 디자인 시스템 적용 1차 — 스플래시·권한 요청 흐름

**Input**: Design documents from `specs/043-modernist-splash-permissions/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md

**Tests**: 이 저장소는 계약 테스트를 먼저 쓰는 관례(AGENTS.md "개발 방식")를
따른다 — 기존 계약 테스트(`onboarding-screen.test.tsx` 등)가 이번 스펙이
바꾸는 UI(설명 카드 제거)를 전제로 짜여 있어 **먼저 깨질 것이 예상되고
수정 대상**이다. 아래 테스트 태스크들은 새 동작에 맞춘 재작성이다.

**Organization**: User Story 1(스플래시) → User Story 2(권한 흐름) 순서.
두 스토리 모두 P1이지만 스플래시가 권한 흐름의 배경이므로 먼저 완성한다.

## Phase 1: Setup

- [ ] T001 `node -e`로 `contrastRatio()` 로직을 재현해 최종 COLORS 후보
      값(bg/surface/border/text/textMuted/accent/accentForeground/danger/
      dangerForeground)의 DT4 대상 6개 쌍 대비를 재확인하고 research.md R2
      표와 실제 일치하는지 확정한다(계산 스크립트는
      quickstart.md의 예시를 확장해 사용, 파일 생성 없음).

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: 두 User Story 모두 이 토큰 교체 위에서 동작한다 — 먼저 끝나야
화면 재작성이 올바른 색으로 렌더된다.

- [ ] T002 `src/ui/theme/tokens.ts`의 `COLORS` 값을 data-model.md 표대로
      전면 교체한다(키 9개 이름 불변, 값만 교체: bg=#f3f2f2,
      surface=#eae9e9, border=rgba(32,30,29,0.4), text=#201e1d,
      textMuted=#6b6767, accent=#ec3013, accentForeground=#201e1d,
      danger=#ae1800, dangerForeground=#f3f2f2). 상단 주석("032 —
      알파리움 디자인 토큰")도 043 Modernist 팔레트로 갱신한다.
- [ ] T003 같은 파일의 `RADIUS`를 `{ card: 0, pill: 0 }`으로 교체한다.
- [ ] T004 [P] `src/ui/components/Button.tsx`의 `BG.primary`를
      `COLORS.accent`에서 `COLORS.danger`로 변경한다(research R2 — accent
      배경 위 흰 글자가 구조적으로 WCAG AA 미달이라 강조 버튼은 danger
      배경을 쓴다). `CLASS.primary`의 tailwind 클래스(`bg-accent`)도
      `bg-danger`로 맞춘다.
- [ ] T005 `npm run test:logic`을 돌려 `__tests__/theme-tokens.test.ts`의
      DT1~DT7이 전부 통과하는지 확인한다(DT4 6개 쌍 특히 확인). 미달이면
      T002 값을 재조정한다.
- [ ] T006 `src/onboarding/requirements.ts`의 `battery-exception` 항목
      `platforms` 필드를 `["android", "ios"]`에서 `["android"]`로
      수정한다(FR-017, 이번 스펙의 유일한 로직 계층 변경). 항목 옆 주석에
      "iOS는 expo-intent-launcher 미지원(공식 README)"이라는 근거를
      한 줄 남긴다.
- [ ] T007 `npm run test:logic`으로 `requirements.ts` 관련 계약 테스트
      (있다면)가 T006 이후에도 통과하는지 확인한다.

**Checkpoint**: 토큰·색·배터리 platforms 수정이 끝났다 — 이제 화면
재작성을 시작할 수 있다.

---

## Phase 3: User Story 1 - 앱 최초 진입 시 브랜드 스플래시를 본다 (Priority: P1)

**Goal**: 온보딩이 필요한 상태로 앱을 실행하면 1k 마크업과 동일한 레이아웃의
스플래시 화면이 뜨고, 정해진 시간 후 자동으로 다음 단계로 전환된다.

**Independent Test**: 온보딩 필요 상태로 앱 실행 → 스플래시 레이아웃 육안
확인 → 자동 전환 관찰(quickstart.md D1).

### Tests for User Story 1

- [ ] T008 [P] [US1] `__tests__/ui/logo-screen.test.tsx` 신규 작성 —
      `LogoScreen`이 `testID="first-run-logo"`를 렌더하고, 로고 마크
      (`testID="splash-logo-mark"` 등 신규 testID)가 72×72 크기와 accent
      배경을 갖는지, "Alpharium" 타이틀 텍스트가 존재하는지, 하단 안내
      문구("휴대폰 안에서만")와 로딩 점 3개(신규 testID
      `splash-loading-dot-0/1/2`)가 렌더되는지, `LOGO_DISPLAY_MS` 경과 후
      `onDone`이 호출되는지(`jest.useFakeTimers()`, 기존 관례 재사용)를
      검증한다. 모델명·진행률 숫자·퍼센트 텍스트가 없는지도 소스 검사로
      확인한다(원칙 IV, 007 이후 관례).

### Implementation for User Story 1

- [ ] T009 [US1] `src/ui/LogoScreen.tsx`를 1k 마크업 구조로 재작성한다 —
      배경 `COLORS.bg`, 패딩(70/20/44 근사), 세로 flex-column, 상단
      영역(flex:1, 세로 중앙 정렬, 좌측 정렬, gap 20): 72×72 accent 정사각
      로고 마크(`RADIUS.card`=0 사용) + "Alpharium" 타이틀(font-size 30,
      font-weight 800, letter-spacing -0.03em, line-height 1, color
      `COLORS.text`). 하단 영역(구분선 위, flex-row, space-between,
      align-items center): 좌측 "휴대폰 안에서만"(11px, letter-spacing
      0.1em, uppercase, `COLORS.textMuted`, font-weight 600) + 우측 점
      3개(6×6 정사각형, radius 0 — 1번째 `COLORS.accent`, 2번째 accent
      50% opacity, 3번째 `COLORS.border` 계열 아닌 별도 neutral 값 —
      마크업의 neutral-300 근사는 textMuted보다 밝은 값이 필요하므로
      `COLORS.border`를 배경 불투명 버전으로 근사하거나 인라인 rgba
      사용). 구분선(`borderTopWidth: 2, borderTopColor: COLORS.border`,
      `paddingTop: 12`). `LOGO_DISPLAY_MS` 타이머 로직(`useEffect` +
      `setTimeout`)은 그대로 유지한다(FR-006).
- [ ] T010 [US1] T009에서 새로 필요해진 testID(`splash-logo-mark`,
      `splash-loading-dot-0`~`2` 등)를 T008 테스트와 일치시킨다.
- [ ] T011 [US1] `npm run test:ui`로 T008 테스트가 통과하는지 확인한다.

**Checkpoint**: 스플래시 화면이 완성됐다 — User Story 1은 독립적으로
검증 가능하다(quickstart D1).

---

## Phase 4: User Story 2 - 필요한 권한을 순서대로 요청받는다 (Priority: P1)

**Goal**: 스플래시 이후 사진·위치·알림 세 단계는 설명 카드 없이 OS
다이얼로그가 연속 자동 호출되고, 배터리 최적화 예외 단계는 기존 021
방식(안내+버튼)을 Modernist 스타일로 유지한다.

**Independent Test**: quickstart.md D2(연속 자동 호출)·D3(배터리 단계)·
D4("다시 묻지 않음")·D5(게이트 무변경).

### Tests for User Story 2

- [ ] T012 [P] [US2] `__tests__/ui/onboarding-screen.test.tsx`를 새 동작에
      맞춰 재작성한다 — 기존 "S1" describe들이 전제하는 `onboarding-allow`/
      `onboarding-skip`이 사진·위치·알림 단계에서는 더 이상 렌더되지
      않으므로:
      - 사진·위치·알림 각 단계 진입 시 설명 카드 텍스트
        (`current.requirement.rationale`/`ifDenied`)가 렌더되지 **않는지**
        확인하는 테스트로 교체.
      - "스텝 진입 즉시(또는 매우 짧은 지연 후) 요청 함수가 자동 호출된다"는
        기존 040 fake-timer 테스트(`ONBOARDING_STEP_AUTO_ADVANCE_MS`)를
        유지하되, 사진·위치·알림 단계에는 [허용] 버튼이 없다는 점을
        추가로 검증(`queryByTestId("onboarding-allow")` → null, 배터리
        단계 제외).
      - `onboarding-skip`은 배터리 단계에서만 렌더됨을 확인하는 테스트
        추가(FR-008 — 사진·위치·알림은 거부가 곧 건너뛰기이므로 버튼
        자체가 없다).
      - `blocked`(다시 묻지 않음) 상태에서는 사진·위치·알림 단계에도
        `onboarding-open-settings`가 여전히 뜨는지 확인(FR-008a, 기존
        S1.1 테스트 유지).
      - 배터리 단계의 안내+버튼 구조(`onboarding-open-settings`,
        `onboarding-skip`)는 기존 그대로 유지되는지 확인(FR-007c, 기존
        회귀 유지).
      - S5(소스 검사 — `expo-*` 미직접 import, 모델 식별자 없음)는
        그대로 유지.
- [ ] T013 [P] [US2] `__tests__/ui/onboarding-all-steps-decided.test.tsx`를
      새 동작(설명 카드 없이 `onboarding-skip` 대신 무엇으로 스킵을
      트리거하는지)에 맞춰 갱신한다 — 사진·위치·알림 단계는 스킵 버튼이
      없으므로 "건너뛰어 다음으로" 대신 "거부 콜백이 오면 자동으로
      다음"으로 시나리오를 바꾸거나, fake timer로 자동 호출을 진행시켜
      `onAllStepsDecided`가 여전히 정확히 1회 불리는지 확인한다.

### Implementation for User Story 2

- [ ] T014 [US2] `src/ui/OnboardingScreen.tsx`를 재작성한다:
      - 사진·위치·알림(`battery-exception`이 아닌 모든 단계) 진입 시
        설명 카드 JSX(`rationale`/`ifDenied`/`허용`/`건너뛰기` 버튼)를
        렌더하지 않는다 — 대신 스플래시와 동일한 Modernist 배경(빈 화면
        또는 최소한의 로딩 표시)만 유지한다.
      - 기존 `useEffect`(`ONBOARDING_STEP_AUTO_ADVANCE_MS` 타이머)는
        그대로 두되, 배터리가 아닌 단계에서는 설명을 보여준 뒤 지연되는
        것이 아니라 스텝 진입과 동시에(설명 렌더 자체가 없으므로) 짧은
        지연 후 `allow()`가 호출되는 구조가 된다 — 값 자체는 화면 계층
        상수이므로 research.md R5에 따라 그대로 두거나 필요시 더 짧게
        조정 가능(예: 0 근접). `busy` 플래그로 중복 호출 방지는 그대로
        유지한다.
      - `blocked` 상태(`current.status === "blocked"`)는 사진·위치·알림
        단계에서도 [설정 열기] 버튼을 계속 렌더한다(FR-008a — 이 갈래는
        예외적으로 화면 버튼이 필요하다, OS가 다이얼로그를 더 이상 안
        띄우므로).
      - `battery-exception` 단계는 기존 JSX 구조(안내 문구 + `ifDenied`
        + [설정 열기]/[건너뛰기])를 그대로 유지하되 스타일만 Modernist
        토큰(T002~T004 반영 후 자동 상속)으로 바뀐다 — 이 분기의 코드
        구조 자체는 손대지 않는다(FR-007c).
      - `current === null`(모든 단계 결정됨) 이후의 "필수 에셋 다운로드"
        단계(029, `showAssetsStep`)와 "[시작하기]" 버튼은 이번 스펙
        범위 밖이므로 기존 로직·문구를 그대로 유지한다(스타일만 토큰
        자동 상속).
- [ ] T015 [US2] T014에서 사진·위치·알림 단계에 남는 배경 뷰에 필요한
      testID(`onboarding-step-<key>`는 컨테이너 식별용으로 유지 — 기존
      Maestro 흐름이 이 접두사로 조회하므로 삭제하지 않는다)를 확인한다.
- [ ] T016 [US2] `npm run test:ui`로 T012·T013 테스트가 통과하는지
      확인한다.

**Checkpoint**: 권한 요청 흐름이 완성됐다 — User Story 2는 독립적으로
검증 가능하다(quickstart D2~D5).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T017 [P] `.maestro/unified-permission-onboarding.yml`을 새 동작에
      맞춰 수정한다 — 현재 M3("권한 단계에 [건너뛰기]가 있다")과 반복
      스킵 루프(`while: visible: id: onboarding-skip`)가 사진·위치·알림
      단계에서는 더 이상 성립하지 않는다(그 버튼이 배터리 단계에만
      남는다). OS 다이얼로그는 Maestro가 직접 tap할 수 없으므로(안드로이드
      시스템 다이얼로그는 별도 `tapOn: text` 조회가 필요할 수 있음),
      기존 M1(온보딩 화면이 먼저 뜬다)·M2(모델 정보 없음)·M4(에셋
      단계)·M5(재실행 시 재노출)는 유지하되, M3와 스킵 루프 블록을
      "배터리 단계까지 자동 진행을 기다린 뒤 그 단계에서만 스킵"하는
      구조로 바꾼다. 정확한 조회 방식은 실기기에서 확인 후 확정한다
      (실기기 세션에서 조정 예상).
- [ ] T018 소스 주석에서 040/021 관련 설명 중 "목적 설명 카드" 언급이
      사진·위치·알림 단계에도 여전히 적용되는 것처럼 읽히는 부분을
      정정한다(`OnboardingScreen.tsx` 파일 상단 doc 주석, T014에서 함께
      처리 가능하면 그때 반영).
- [ ] T019 `npm test`(전체) + `npm run lint`를 돌려 전 스위트 통과를
      확인한다(SC-004).
- [ ] T020 `npm run test:device`(Maestro, 기기 연결 시)로
      `unified-permission-onboarding.yml` 회귀를 확인한다.
- [ ] T021 실기기(dev/debug, SM-S901N 등) 최소 1회 검증 —
      quickstart.md D1~D5를 순서대로 수행하고 결과를 spec.md 또는
      AGENTS.md에 실측 기록으로 남긴다(원칙 V, "건너뛴 실기기 테스트는
      통과가 아니다").

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002~T007)**: 토큰·platforms 수정이
  먼저 끝나야 화면 재작성이 올바른 색으로 렌더된다.
- **User Story 1 (T008~T011)**과 **User Story 2 (T012~T016)**는 서로
  다른 파일(`LogoScreen.tsx` vs `OnboardingScreen.tsx`)이라 병렬 가능하나,
  둘 다 Foundational 완료를 전제한다.
- **Polish (T017~T021)**은 두 User Story 완료 후 진행한다 — 특히 T017
  (Maestro)은 두 화면이 이어지는 전체 흐름을 검증하므로 마지막이다.

## Parallel Example

```
# Foundational 내 병렬 가능:
T004 (Button.tsx) — T002·T003(tokens.ts)과 파일이 달라 병렬 가능하나
같은 색 값에 의존하므로 T002 완료 후 시작 권장.

# User Story 1 vs User Story 2 (Foundational 완료 후):
T008~T011 (LogoScreen)  ∥  T012~T016 (OnboardingScreen)
```

## Implementation Strategy

**MVP**: User Story 1(스플래시)만 완성해도 독립적으로 시연 가능하다 —
Foundational + Phase 3까지가 최소 증분이다. Phase 4(권한 흐름)를 이어
붙이면 스펙 전체 완료 기준을 만족한다.

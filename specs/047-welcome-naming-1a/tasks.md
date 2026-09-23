# Tasks: 작명 화면을 디자인 보드 1a와 일치시키기

**Input**: `specs/047-welcome-naming-1a/` (plan.md, spec.md, research.md, data-model.md, contracts/welcome-1a.md, quickstart.md)

**Tests**: 헌법 「개발 방식」(계약을 먼저 정하고 테스트를 먼저 쓴다)에 따라 계약 테스트를 먼저 쓴다.

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `047-welcome-naming-1a`인지 확인하고 `npm run test:ui -- welcome-screen`으로 현재 기준선(전부 통과)을 기록한다 — `__tests__/ui/welcome-screen.test.tsx`

## Phase 2: Foundational

- [X] T002 기존 계약 테스트 중 welcome 단계에서 `welcome-character-name`을 찾는 두 테스트(L16 "캐릭터 이름만 보간된다", 025 "이름 표시에 accessibilityLabel이 있다")를 `phase: "failed"`로 옮긴다(research R5, 계약 A7) — `__tests__/ui/welcome-screen.test.tsx`

## Phase 3: User Story 1 — 첫 만남 화면이 디자인대로 보인다 (P1)

**Goal**: welcome 단계가 `1a`의 구성·문구·위계로 보인다.
**Independent Test**: 렌더 테스트 A1·A2·A3·A7·A8·A9·A11 통과 + 실기기 스크린샷을 `1a`와 대조(SC-001).

- [X] T003 [US1] 계약 테스트 A1(표지 `welcome-kicker` = `ALPHARIUM`), A2(`welcome-face` = `🤖`, 하나뿐), A3(제목·본문·프롬프트·힌트·두 버튼 라벨이 data-model 표와 글자 단위 일치), A7(welcome에 `welcome-character-name` 없음 / failed에 있음), A8(확정 버튼 라벨에 `→`), A9(welcome이 `ScrollView` 안, 가운데 묶음 스타일에 `justifyContent: "center"`), A11(소스에 `#rrggbb` 리터럴 없음)을 `describe("047 — 1a 일치")`로 추가하고 실패를 확인한다 — `__tests__/ui/welcome-screen.test.tsx`
- [X] T004 [US1] `TEXT`에 `kicker: "ALPHARIUM"`·`face: "🤖"`를 추가하고 `welcomeTitle`을 "깨어났어요. 처음 뵙겠습니다.", `welcomeBody`를 "이제부터 제가 주인님의 하루를 사진과 다닌 자리로 읽고, 일기로 적을게요. 모든 일은 이 휴대폰 안에서만 일어나요."로 바꾼다(data-model) — `src/ui/WelcomeScreen.tsx`
- [X] T005 [US1] welcome 단계를 `WELCOME_CONTAINER`(padding 좌우 20·위 20·아래 24, checking/failed의 `CONTAINER`는 무변경) + `ScrollView`(`contentContainerStyle` `flexGrow: 1`, `keyboardShouldPersistTaps="handled"` 유지) 안의 세 구획 [표지] → [가운데 묶음 `flex: 1, justifyContent: "center", gap: 18`: 얼굴 타일 → 제목 → 본문 → 구분선 → 프롬프트 → 입력줄 → 힌트] → [버튼 줄 오른쪽 정렬 gap 8]으로 재배치한다. 치수·타이포는 research R7, 색은 `COLORS.*`만 — `src/ui/WelcomeScreen.tsx`
- [X] T006 [US1] 확정 버튼 라벨을 `{TEXT.submit}` + 화살표 `→`로 렌더한다(research R3). `Button` `primary`(accent + accentForeground) 유지(R1) — `src/ui/WelcomeScreen.tsx`
- [X] T007 [US1] 하단 `welcome-character-name`을 `phase === "failed"`일 때만 그린다(research R5, FR-011·FR-016) — `src/ui/WelcomeScreen.tsx`
- [X] T008 [US1] 파일 머리 주석과 스타일 상수 주석을 047 기준(1a 원본 대조, R1·R4·R7)으로 갱신하고 T003이 통과하는지 확인한다 — `src/ui/WelcomeScreen.tsx`

## Phase 4: User Story 2 — 이름을 입력하며 남은 글자를 안다 (P2)

**Goal**: 입력줄 오른쪽 "n/12" 카운터, 12자 상한, 빈 입력 확정 불가(흐려지지 않음).
**Independent Test**: A4·A5·A6 통과.

- [X] T009 [US2] 계약 테스트 A4(카운터 `welcome-name-counter`가 0→`0/12`, "금동"→`2/12`, 12자→`12/12`), A5(카운터 분모·힌트의 "12"·`maxLength`가 `NAME_MAX_LENGTH`와 같음), A6(빈/공백 입력에서 `press`해도 `onSubmitName` 미호출, `accessibilityState.disabled === true`, 소스에서 확정 `Button`에 `disabled=` prop이 없음)을 추가하고 실패를 확인한다. 기존 FR-012 세 테스트(잠김·공백·풀림)는 그대로 통과해야 한다 — `__tests__/ui/welcome-screen.test.tsx`
- [X] T010 [US2] 입력줄을 `View`(`flexDirection: "row"`, 밑줄 2px `COLORS.text`) 안에 `TextInput`(28px/800, `flex: 1`) + 카운터 `AppText`(`testID="welcome-name-counter"`, 12px `textMuted`, 문자열 `` `${draft.length}/${NAME_INPUT_MAX_LENGTH}` ``, `accessibilityLabel` 동일)로 바꾼다. 기존 `welcome-name-input` testID·`accessibilityLabel`·`maxLength` 유지(FR-017) — `src/ui/WelcomeScreen.tsx`
- [X] T011 [US2] 힌트를 `` `${NAME_INPUT_MAX_LENGTH}자까지. 나중에 설정에서 바꿀 수 있어요.` ``로 만든다(FR-008, A5) — `src/ui/WelcomeScreen.tsx`
- [X] T012 [US2] 확정 `Button`에서 `disabled` prop을 빼고 `onPress={() => { if (canSubmit) onSubmitName(draft); }}` + `accessibilityState={{ disabled: !canSubmit }}`로 바꾼다(research R2, Clarification Q1). T009 통과 확인 — `src/ui/WelcomeScreen.tsx`

## Phase 5: User Story 3 — 기존 길이 그대로 이어진다 (P3)

**Goal**: 확정·건너뛰기·키보드 스크롤·checking/failed 회귀 없음.
**Independent Test**: 기존 `welcome-screen.test.tsx` 전부 통과 + Maestro `welcome-naming.yml` PASS.

- [X] T013 [US3] 044 계약 테스트 중 047 레이아웃과 충돌하는 소스 검사(예: 제목 스타일·`WELCOME_SECTION` 이름 의존)를 새 상수명에 맞게 고치되 **검사 의도(좌측 정렬, ScrollView, 구분선 `COLORS.border`, 버튼 가로 배치, checking/failed 중앙 정렬)는 유지**한다 — `__tests__/ui/welcome-screen.test.tsx`
- [X] T014 [US3] Maestro 흐름에 작명 단계 통과 블록을 추가한다: `download-progress-proceed` 다음에 `runFlow: when visible id "welcome-greeting"` → `tapOn id "welcome-name-skip"` (지금은 작명 화면을 지나는 단계가 없어 `assertVisible: "일기"`에 도달하지 못한다) — `.maestro/welcome-naming.yml`

## Phase 6: Polish & Cross-Cutting

- [X] T015 `npm run lint`(eslint·tsc·헌법 검사·prettier)와 `npm test` 전부 통과 — 저장소 전체
- [X] T016 위반 주입 2종으로 방어 확인 후 되돌린다: (a) 확정 `Button`에 `disabled={!canSubmit}`를 되살리면 A6이 잡는다, (b) 힌트의 "12"를 하드코딩 "10"으로 바꾸면 A5가 잡는다 — `src/ui/WelcomeScreen.tsx`
- [X] T017 실기기 dev 검증(quickstart.md 1~6): `1a` 대조 9/9(SC-001), 빈 입력 버튼 모양·무반응, 카운터 0·2·12, 키보드 스크롤, 시스템 글꼴 크게 설정 시 잘림 없이 스크롤 가능(Edge Case), 확정→liveness→일기 탭, Maestro `welcome-naming.yml` PASS. 결과를 이 태스크 아래에 기록한다 — 실기기 SM-S901N
  - **결과(2026-09-23, SM-S901N, dev debug, Metro 리로드)**: `1a` 대조 9/9 해소(표지·🤖 타일·제목 "깨어났어요. / 처음 뵙겠습니다."는 어절 경계에서 줄바꿈·본문·세로 중앙·카운터·힌트·화살표·하단 이름 제거). 빈 입력에서 확정 버튼은 진한 빨강 그대로이고 눌러도 화면 불변. 카운터 `0/12`→`2/12`, 13자 입력 시 `12/12`에서 멈춤. 이름 확정 → 일기 탭 도달.
  - **★ 실기기에서만 드러난 결함 — 고쳤다**: 세로 중앙 배치 후 키보드가 입력줄을 가려 치는 글자가 안 보였다(`adjustResize`가 edge-to-edge에서 레이아웃을 줄이지 않음). `KeyboardAvoidingView` + `keyboardVerticalOffset={48}`로 해소 — 키보드를 연 채 입력줄·두 버튼이 모두 보인다(research R9, 계약 A12). 044는 입력줄이 화면 위쪽이라 드러나지 않았다.
  - **Maestro `welcome-naming.yml`**: 작명 화면 블록은 이 기기가 이미 작명을 마쳐 `SKIPPED`(조건부 블록, 수동 확인으로 대체). 이후 `author-rename-input-0` 단계에서 FAILED — AGENTS.md 035의 "Maestro가 `author-rename-0` 좌표를 잘못 본다" 알려진 결함과 같은 자리이며 047은 설정 탭을 건드리지 않았다(회귀 아님).
  - **미확인**: 시스템 글꼴 크게 설정(작명을 마친 기기라 작명 화면에 다시 들어가려면 `pm clear`로 모델 2GB를 지워야 함), 제스처 내비게이션 기기·다른 키보드 앱에서의 키보드 여백.
- [X] T018 AGENTS.md에 047 절(핵심 결론·실기기 관측)을 추가하고 로드맵 28번(재작업) 행을 완료로 표시한다 — `AGENTS.md`, `docs/roadmap/README.md`

## Dependencies

- T001 → T002 → US1(T003→T004~T008) → US2(T009→T010~T012) → US3(T013~T014) → Polish(T015→T016→T017→T018)
- 모두 같은 두 파일을 만지므로 병렬 없음(US3의 T014만 다른 파일).

## Implementation Strategy

MVP = US1(모양·문구). US2가 카운터·버튼 동작, US3가 회귀를 닫는다. 새 네이티브 모듈이 없어 APK 재빌드 없이 Metro 리로드로 실기기 확인한다.

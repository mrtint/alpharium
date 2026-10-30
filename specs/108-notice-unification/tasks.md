# Tasks: 안내·알림 방식 일원화 — 제약 띠

**Input**: [spec.md](spec.md) · [plan.md](plan.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/constraint-band.md](contracts/constraint-band.md) · [quickstart.md](quickstart.md)
**Tests**: 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」) — 테스트가 실패하는 것을 확인한 뒤 구현한다. 작업 디렉터리는 저장소 루트(`/Users/mrtint/projects/alpharium/.claude/worktrees/notice-unification`)이고 `node_modules`는 메인 저장소 링크다.

## Phase 1: Setup

- [x] T001 기준선: `npx jest __tests__/ui/diary-list.test.tsx __tests__/ui/denied-guidance.test.tsx __tests__/ui/use-battery-notice.test.tsx __tests__/app --selectProjects logic ui`가 통과하는지 확인한다(바꾸기 전 상태)

## Phase 2: 기반 — 판정 함수와 부품 (모든 이야기가 쓴다)

- [x] T002 [P] CB1~CB5 실패 테스트를 `__tests__/app/constraint-band.test.ts`에 쓴다(`constraintBandFor` 전수 표: `photoDenied` true/false/undefined × 플랫폼 android/ios × `autoWriteEnabled` true/false/undefined × `battery` restricted/exempt/unknown 중 대표 조합, 사진 권한 우선, 모름은 `null`)
- [x] T003 `src/app/constraint-band.ts`에 `ConstraintKind`(`"photos" | "battery"`)와 순수 함수 `constraintBandFor`를 구현한다(시각·파일·기기를 읽지 않는다 — data-model.md의 판정 출력 표 그대로)
- [x] T004 [P] CP1~CP4 실패 테스트를 `__tests__/ui/constraint-band.test.tsx`에 쓴다(`testID` `constraint-band`·`constraint-band-action`, 글자 `numberOfLines=1`·배율 상한 1.2, 버튼 최소 높이 44, 접근성 읽기 순서 글자 → 버튼(FR-012), `hidden`이면 opacity 0·`no-hide-descendants`·`pointerEvents none`, 닫기 프롭 없음)
- [x] T005 `src/ui/components/ConstraintBand.tsx`를 구현한다(`surface` 면, 왼쪽 `AppText` 한 줄 말줄임, 오른쪽 `Button`류 채워진 버튼 `flexShrink 0`; 색·간격은 `COLORS`·`TYPE`·`RADIUS.control`, 하드코딩 금지; props `{ text, action, onAction, hidden? }`)
- [x] T006 문구 초안(보드 밖, 소유자 확인 필요)을 `src/i18n/catalogs/ko/home.ts`에 `constraintBand: { photos: { text, action }, battery: { text, action } }`로 더한다(한 줄에 들어가는 짧은 문장, 모델 식별자·내부 용어 금지). `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 올리고 `ko-literals.golden.json` 규칙을 따른다(골든은 다시 쓰지 않는다). 문구는 보드 밖 초안이므로 소유자 확인 항목으로 최종 보고에 올린다

## Phase 3: 사용자 이야기 1 — 사진 권한 띠 (P1)

**독립 테스트**: `DiaryListScreen`에 `constraint={{kind:"photos", …}}`를 주면 쓰기 바 위에 띠가 한 줄로 보이고 스트립 아래에는 안내가 없다.

- [x] T007 [US1] HP1~HP3·HP5(photos) 실패 테스트를 `__tests__/ui/diary-list.test.tsx`에 쓴다(띠 `constraint-band` 존재·`home-battery-notice`/`denied-notices` 부재, 쓰는 중에는 없음, 쓴 날은 바가 내려가면 숨김, `toast`가 있으면 `hidden`, 버튼 누름이 `onAction` 호출, SC-001: 띠가 있을 때와 없을 때 헤더·스트립·캐러셀 영역의 `onLayout` 위치가 같음 — 띠는 헤더 밖 절대 배치). `denied-guidance.test.tsx`·`reading-scroll.test.tsx`의 `denied-notices` 단언을 띠 단언으로 고친다
- [x] T008 [US1] `src/ui/DiaryListScreen.tsx`: `constraint?: { text; action; onAction }` prop과 `bandNode`(바닥에서 `barHeight`만큼 위, 절대 배치, 쓰는 중 제외, 쓴 날은 `atEnd`를 따름, `toast !== undefined`면 `hidden`)를 더하고, 잰 띠 높이만큼 안 쓴 날 지면 아래 여백(120)과 쓴 날 본문 아래 여백(104)을 늘린다. `deniedNotices` prop과 `Notices`의 거부 줄을 삭제한다(`movedNotice` 줄은 US3까지 남김)
- [x] T009 [US1] `App.tsx`: `deniedNotices` 상태를 `photoDenied: boolean | undefined`로 바꾼다(`denied`·`blocked`만 참, 읽기 실패·`limited`는 거짓/모름, 앞 복귀 재읽기 유지). `DiarySection`·`DiaryHomeScreen`의 `deniedNotices` prop을 `photoDenied`로 바꾸고, `DiaryHomeScreen`은 `constraintKind?: ConstraintKind | null`과 `onOpenBatteryConstraint?: () => void` prop을 받아 `"photos"`면 `requestPhoto()`를, `"battery"`면 `onOpenBatteryConstraint`를 누름 동작으로 하는 `constraint`(문구는 `home.constraintBand[kind]`)를 `DiaryListScreen`에 넘긴다. 종류는 `App.tsx`가 `constraintBandFor({ photoDenied, platform, autoWriteEnabled: undefined, battery: "unknown" })`로 계산해 넘긴다(배터리 입력은 T014가 훅으로 바꾼다)(research R1·R2)
- [x] T010 [US1] 조립 테스트: `__tests__/ui/home-constraint-band.test.tsx`에서 진짜 `DiaryHomeScreen` + 사진 권한 대역으로 거부 → 띠 → 버튼이 `photoAccessPort.request`(막힘이면 설정 안내 대화상자)를 부르고, 허용 후 앞 복귀 신호로 띠가 사라지는 것을 확인한다

## Phase 4: 사용자 이야기 2 — 배터리 띠 (P2)

**독립 테스트**: 안드로이드 + 자동 쓰기 켬 + `restricted`에서 띠가 뜨고, 사진 권한 거부와 겹치면 사진 권한 띠 하나뿐이다.

- [x] T011 [P] [US2] UB1~UB4 실패 테스트를 `__tests__/app/use-constraint-band.test.tsx`에 쓴다(마운트 읽기, 던지면 `unknown`, iOS는 읽지 않음, `AppState` active 재읽기, 재읽기 실패 시 마지막 값 유지, `onOpenBattery`는 던지지 않음, 닫기·기록 저장 없음)
- [x] T012 [US2] `src/app/use-constraint-band.ts`를 구현한다(`battery-exception-port`의 `readStatus`·`openSettingsList`만 쓴다 — FX1; 입력 `{ platform, port, photoDenied, autoWriteEnabled }` → `{ kind: ConstraintKind | null, onOpenBattery }`)
- [x] T013 [US2] HP5(battery)·CB4 조립 테스트를 `__tests__/ui/home-constraint-band.test.tsx`에 더한다(배터리 띠 버튼 → `openSettingsList`, 사진 권한 우선, 자동 쓰기 꺼짐/iOS/`exempt`는 띠 없음)
- [x] T014 [US2] `App.tsx`·`DiaryHomeScreen.tsx`: `useBatteryNotice`·`batteryNoticeStore`·`batteryNotice`·`onAutoWriteSaved`(prop·호출) 배선을 `useConstraintBand`로 바꾼다(`autoDiarySettings?.enabled`를 `autoWriteEnabled`로). `DiaryListScreen`의 `BatteryNoticeLine`·`NOTICE_FONT_CAP`·`batteryNotice` prop을 삭제한다(배율 상한은 `ConstraintBand`로 옮겼다)
- [x] T015 [US2] 옛 배터리 안내를 걷는다: 삭제 `src/app/battery-notice.ts`·`battery-notice-store.ts`·`use-battery-notice.ts`와 테스트 `__tests__/app/battery-notice*.test.ts`·`__tests__/ui/use-battery-notice.test.tsx`; `diary-list.test.tsx`의 `home-battery-notice*` 단언 제거; `home.ts`의 `batteryNotice` 문구 삭제(골든 쪽 처리 — 삭제는 `ko-golden.test.ts`의 기대 목록과 `ko-literals.golden.json`을 규칙대로 맞춘다); `scripts/layer1/baseline.ts`의 `battery-notice-dismissed.json` 삭제 항목과 `__tests__/e2e/baseline.test.ts`·`__tests__/i18n/boundaries.test.ts`의 파일 목록을 맞춘다. `batteryNoticeShown`(온보딩 플래그)은 건드리지 않는다
- [x] T016 [US2] `home-auto-write.test.tsx` 등 `onAutoWriteSaved`를 쓰던 테스트를 새 prop 구성에 맞게 고친다(자동 쓰기 저장이 안내를 띄우던 단언은 삭제 — 시점 판정 폐지, FR-010)

## Phase 5: 사용자 이야기 3 — 캐릭터 대체 안내를 토스트로 (P3)

**독립 테스트**: 미래 캐릭터 대역으로 옮겨 쓰기가 일어나면 스트립 아래가 아니라 토스트로 문구가 나온다.

- [x] T017 [US3] HP6 실패 테스트를 `__tests__/ui/diary-list.test.tsx`(`movedNotice` 단언 이동)와 `__tests__/ui/home-constraint-band.test.tsx`에 쓴다(`__tests__/future-character.ts`의 `FUTURE_CHARACTER`로 옮겨진 쓰기 → 토스트 문구 = `home.movedNotice(from,to)`, 스트립 아래 줄 없음, 띠가 있으면 토스트 동안 `hidden`, 실패 토스트와 겹치면 나중 것이 앞의 것을 바꿔 낌)
- [x] T018 [US3] `src/ui/DiaryHomeScreen.tsx`: 토스트 상태를 `{id, kind}`에서 `{id, text}`로 바꾸고(`TOAST_TEXT[kind]` 또는 `movedNotice` 문장을 만드는 쪽이 정한다), `movedNotice` 상태·`setMovedNotice`·prop 전달을 삭제한다. `src/ui/DiaryListScreen.tsx`에서 `Notices`와 `movedNotice` prop을 삭제한다(R6)

## Phase 6: 사용자 이야기 4 — 규칙의 기록과 잠금 (P3)

**독립 테스트**: 소스 계약 테스트가 위반 주입에서 실패한다.

- [x] T019 [US4] RL1·RL2 소스 계약 테스트를 (앞 단계가 이미 식별자를 걷어 통과 상태에서 시작한다 — 실패는 T021 위반 주입으로 확인한다)  `__tests__/config/notice-rules.test.ts`에 쓴다(주석을 걷어낸 소스에서 `DiaryListScreen.tsx`·`DiaryHomeScreen.tsx`에 `deniedNotices`·`movedNotice`·`batteryNotice`·`Notices(`·`BatteryNoticeLine` 식별자 없음, `ConstraintBand.tsx`에 `dismiss`·`onDismiss` 없음, `DESIGN.md`에 「안내·알림 방식」 절과 분류 A~E·「하지 않는 것」 두 줄)
- [x] T020 [US4] `design/DESIGN.md`에 「안내·알림 방식」 절을 더한다(다섯 분류 표 A~E, 분류별 자리, 하지 않는 것: 스트립 아래에 안내를 쌓지 않는다·닫기 있는 글자 링크를 쓰지 않는다; 공용 부품 표에 `ConstraintBand` 행). `__tests__/design/design-doc.test.ts`가 문서가 적은 이름의 실재를 보므로 통과시킨다

## Phase 7: Polish

- [x] T021 위반 주입(적용 확인 → 실패 확인 → 되돌림): ① `DiaryListScreen`에 `Notices` 식별자 되살림 → T019 실패 ② `ConstraintBand`에 `onDismiss` 프롭 추가 → T019/T004 실패 ③ `constraintBandFor`에서 사진 권한 우선을 뒤집음 → T002 실패 ④ 쓰는 중에도 띠를 그리게 함 → T007 실패
- [x] T022 AGENTS.md를 현행화한다: 「배터리 예외 인지(104)」의 홈 안내(닫기 7일·`battery-notice-dismissed.json`·저장된 뒤)를 제약 띠(닫기 없음·항상·사진 권한 우선)로 고치고, 「저장소의 현재 상태」 홈 항목에 한 줄을 더한다(앞의 서술을 주석으로 덧대지 않고 고친다)
- [x] T023 `npm test`·`npm run lint`를 실제로 돌려 통과를 확인한다(출력 확인). `git status`에 의도하지 않은 변경이 없다. 층 1 영향 확인: 기준 상태(`scripts/layer1/baseline.ts`)는 자동 쓰기 꺼짐이라 배터리 띠가 없고 사진 권한은 허용이라 띠가 없다는 것을 소스로 확인하고, 기능→흐름 대응표(`docs/e2e/feature-flow-map.md`)에 배터리 안내 행이 없음을 확인한다(없으면 등록할 것도 없다)
- [ ] T024 **미확인 — 실기기에 닿지 않았다**(Galaxy가 연결돼 있고 8081 Metro를 다른 작업이 쓰는 중이라 기기 상태·번들을 건드리지 않았다). 실기기·시뮬레이터 확인은 quickstart.md의 1~7을 SM-S901N dev(Metro 번들)와 iOS 시뮬레이터에서 한다. 못 하는 것은 「미확인」으로 기록한다(건너뛴 실기기 테스트는 통과가 아니다)

## Dependencies

T001 → T002·T004 → T003·T005 → T006 → Phase 3(T007→T008→T009→T010) → Phase 4(T011→T012→T013→T014→T015→T016) → Phase 5(T017→T018) → Phase 6(T019→T020) → Phase 7. MVP = Phase 2 + Phase 3(T002~T010).
병렬: T002‖T004, T011은 Phase 3와 독립이라 T002~T006 뒤 어느 때나 가능.

## Phase 8: Convergence

- [x] T025 `docs/background-write-conditions.md` 57행의 「홈 배터리 안내」를 「홈 제약 띠(배터리)」로 고쳐 108 용어와 맞춘다(문구가 표와 같은 말을 해야 한다는 요구는 그대로) per FR-010 (partial)

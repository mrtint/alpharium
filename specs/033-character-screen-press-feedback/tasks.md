# Tasks: 캐릭터 화면 이관 + 눌림 피드백

**Feature**: 033-character-screen-press-feedback | **Date**: 2026-09-07

**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**테스트 포함**: 이 저장소는 "계약을 먼저 정하고 테스트를 먼저 쓴다"가 헌법 「개발
방식」이다(AGENTS.md). 계약 테스트를 구현보다 먼저 쓴다.

**★ 이 스펙의 최대 위험**: 기기 없는 테스트가 전부 초록이어도 눌림 반응이 실기기에서
**조용히 안 돌 수 있다**(research R1·R2). T001이 최우선이고, Phase 6 실기기가 유일한
최종 확인이다.

---

## Phase 1: Setup — 빌드·테스트 파이프라인 (★ 최우선)

**목표**: reanimated가 **실제로 컴파일되고** jest에서 **돌 수 있는** 상태를 만든다.
이것이 안 되면 이후 전부가 무의미하다.

- [X] T001 `babel.config.js`의 `plugins`에 `react-native-worklets/plugin`을 추가하고, "이 플러그인이 설치돼 있지 않다 / FR-005가 배제"라고 적힌 **스테일 주석을 실측 결과로 교체**한다 per research R1 — 플러그인은 `node_modules/react-native-worklets/plugin/`에 실제로 있고, 032 FR-005는 reanimated를 명시적으로 예외 허용했다. 플러그인은 **plugins 배열의 마지막**에 온다(reanimated 요구사항).

- [X] T002 `jest/setup-ui.ts`에 `react-native-reanimated` 모듈 목을 추가한다 per research R2 — `default`(View·`createAnimatedComponent`), `useSharedValue`→`{value}`, `useAnimatedStyle`→`{}`, `withTiming`→항등. **`react-native-reanimated/mock`을 쓰지 않는다**(그것이 실제 index를 다시 import해 `loadUnpackers` 오류로 죽는 것을 2026-09-07 실측했다). 목이 필요한 이유와 "이 목 때문에 기기 없는 테스트는 배선만 검증한다"를 주석으로 남긴다.

- [X] T003 Metro 캐시를 비우고(`npx expo start --clear`) `npm test` 두 프로젝트가 전부 GREEN인지 확인한다 per quickstart Q0 — T001·T002가 기존 2004개 테스트를 깨뜨리지 않았음을 확인하는 게이트. 깨지면 **여기서 멈추고 원인을 찾는다**.

**체크포인트**: `npm test` GREEN + `npm run lint` 클린. 이후 단계가 열린다.

---

## Phase 2: Foundational — 눌림 상수 (모든 스토리의 선행)

**목표**: `PRESS` 상수를 단일 출처에 세운다. US1과 US2가 둘 다 이것 위에 선다.

- [X] T004 `__tests__/ui/press-feedback.test.tsx`를 만들고 PF1·PF2 계약을 먼저 쓴다 per contracts/press-feedback.md — (a) `tokens.ts`가 `PRESS`를 export하고 `scale`·`durationMs`를 갖는다, (b) 소스를 `readFileSync`로 읽어 `as const`이고 조건 분기·`Math.*` 유도가 없다(원칙 V), (c) `src/` 전체에서 `PRESS`를 참조하는 파일이 `Button.tsx`·`ListRow.tsx` **둘뿐**이다, (d) `src/ui/components/`의 파일 수가 **7개**다(PF2). **이 시점에 RED여야 한다.**

- [X] T005 `src/ui/theme/tokens.ts`에 `PRESS = { scale: 0.97, durationMs: 120 } as const`를 추가한다 per data-model.md §1 / research R4 — 값이 **사람이 정한 상수**이고 측정에 근거하지 않는다는 것, 어색하면 이 한 줄만 고친다는 것을 기존 토큰 주석 문체로 남긴다. T004가 GREEN이 된다.

**체크포인트**: T004 GREEN. `PRESS`가 단일 출처에 있다.

---

## Phase 3: User Story 2 — 눌림 피드백 (P2, 그러나 먼저 한다)

**목표**: `Button`·`ListRow`가 눌림 반응을 갖는다.

**왜 P2를 먼저 하는가**: US1(화면 이관)이 `ListRow`·`Button`을 **소비**하므로,
컴포넌트가 먼저 완성돼야 이관이 한 번에 끝난다. 스토리 우선순위(가치)와 구현
순서(의존성)가 다른 경우다 — US2만 완료해도 앱 전체의 버튼이 반응하므로
**독립적으로 출하 가능**하다.

**독립 테스트 기준**: `Button`을 쓰는 아무 화면(설정·목록·온보딩)에서 버튼을 눌러
반응을 확인한다. `CharacterListScreen` 이관과 무관하게 가치가 성립한다.

### 계약 테스트 먼저

- [X] T006 [P] [US2] `__tests__/ui/press-feedback.test.tsx`에 PF3·PF5·PF6 계약을 더한다 per contracts/press-feedback.md — `Button`이 `onPressIn`/`onPressOut`을 갖는다(PF3), `onPress` 호출 조건·횟수가 안 바뀐다(PF5), `disabled`면 눌림 반응이 없다(PF6). **RED 확인.**

- [X] T007 [P] [US2] 같은 파일에 PF4·PF8 계약을 더한다 per contracts/press-feedback.md — 애니메이션 대상이 **transform뿐**이고 `width`·`height`·`margin`·`padding`·`flex`가 아니다(PF4, 소스 검사), 소스에 성능 측정 어휘(`fps`·`frame`·`elapsed`)와 새 수치 표시가 없다(PF8). **RED 확인.**

### 구현

- [X] T008 [US2] `src/ui/components/Button.tsx`에 눌림 반응을 넣는다 per PF3·PF4·PF6 — `useSharedValue`+`useAnimatedStyle`+`withTiming`으로 `onPressIn`→`PRESS.scale`, `onPressOut`→`1`, `PRESS.durationMs`. `Animated.View`로 감싸되 **`testID`·`accessibilityRole`·`accessibilityState`는 `Pressable`에 그대로 둔다**(Maestro 조회 경로 보존). `disabled`면 반응 없음. 기존 `className`+토큰 `style` 병행 패턴 유지.

- [X] T009 [US2] `src/ui/components/ListRow.tsx`의 `onPress` 갈래에 같은 눌림 반응을 넣는다 per PF3·PF6 — `onPress`가 **없는** 갈래(`View`)는 그대로 둔다(누를 수 없으므로 반응 대상이 아니다).

- [X] T010 [US2] `npm run test:ui`로 T004·T006·T007이 GREEN이고 **`__tests__/ui/button.test.tsx`·`list-row.test.tsx`가 무수정 GREEN**인지 확인한다 per spec SC-002 — 기존 테스트가 깨지면 PF5(탭 결과 불변)를 어긴 것이다.

**체크포인트**: 앱의 모든 공용 버튼이 눌림 반응을 갖는다. US2 독립 출하 가능.

---

## Phase 4: User Story 1 — 캐릭터 화면 이관 (P1)

**목표**: `CharacterListScreen`이 토큰·공용 컴포넌트 위로 옮겨간다.

**독립 테스트 기준**: 설정 탭 하단의 캐릭터 목록이 나머지와 같은 톤이고,
`character-list.test.tsx`가 **무수정 GREEN**이며, Maestro 흐름 셋이 갱신 없이 PASS.

### 선행: ListRow 확장

- [X] T011 [US1] `__tests__/ui/list-row.test.tsx`에 **새 케이스만 추가**한다(기존 6개는 손대지 않는다) per data-model.md §2 / research R3 — `label`에 ReactNode(여러 `Text`가 든 `View`)를 넘기면 그대로 렌더된다. **RED 확인.**

- [X] T012 [US1] `src/ui/components/ListRow.tsx`의 `label` 타입을 `string | React.ReactNode`로 넓힌다 per data-model.md §2 — `typeof label === "string"`이면 지금처럼 `AppText variant="body"`로 감싸고, 아니면 그대로 그린다. **다른 prop은 하나도 안 바꾼다.** T011 GREEN + 기존 6개 무수정 GREEN.

### 계약 테스트 먼저

- [X] T013 [P] [US1] `__tests__/ui/character-list-migration.test.tsx`를 만들고 CS1·CS2를 쓴다 per contracts/character-screen-migration.md — 소스를 `readFileSync`로 읽어 문안 리터럴 전체(제목·상태 5종·동작 6종·진행 2종·사진 모델 줄·거부 안내)가 **바이트 단위로 존재**하고, 순수 함수 넷(`statusText`·`actionLabel`·`progressText`·`formatBytes`)이 여전히 선언돼 있음을 확인한다. **이관 전이므로 이 시점에 GREEN이고, 이관 후에도 GREEN이어야 한다**(회귀 감지용).

- [X] T014 [P] [US1] 같은 파일에 CS6·CS8·CS9를 더한다 per contracts — 소스에 `models/roster|assets|expo-port|storage` import와 `ModelAsset`·`assetFor`·`allAssets` 식별자가 없다(CS6), 크기·양자화·파라미터 어휘가 없다(CS8), `#rrggbb` 리터럴이 **0개**다(CS9 — **이관 전이므로 RED**, 이관 후 GREEN).

### 이관

- [X] T015 [US1] `src/ui/CharacterListScreen.tsx`의 캐릭터 행 다섯을 `ListRow`로 이관한다 per CS4·CS5 / data-model.md §5 — `label`에 이름(`AppText body`)+소개(`caption`)+상태(`caption`)+조건부 저장공간(`caption`)이 든 노드를 넘기고, `right`에 동작 버튼을 넣는다. **행의 `testID`는 `ListRow`에(`character-row-<c>`), 버튼의 `testID`는 그 안의 `Button`에**(`action-<c>`/`pause-<c>`) 각각 준다 — 008 실측(Maestro가 버튼을 행의 자식으로 안 봄) 때문이다.

- [X] T016 [US1] 동작 버튼을 공용 `Button`으로 교체한다 per spec FR-009a / Clarifications — 지우기(`readiness.kind === "ready"`)만 `variant="danger"`, 나머지(준비하기·이어받기·다시 받기·멈추기)는 `variant="secondary"`. **문안·`onPress`·`testID`는 그대로 넘긴다.**

- [X] T017 [US1] 사진 모델 줄(`vision-row`)을 같은 방식으로 이관한다 per CS5·CS8 — 캐릭터 다섯 **아래에 별도로** 유지, `visionReadiness === undefined`면 줄 자체가 없음, `formatBytes`가 합산값 하나를 줌(파일이 둘이라는 것이 안 드러남).

- [X] T018 [US1] 거부 안내(`DownloadNotice`)를 토큰으로 이관한다 per CS1·CS9 — 배경색을 토큰으로, 문장은 `AppText`, 닫기는 `Button`(`variant="secondary"`). `download-notice`·`dismiss-notice` `testID` 유지. **문장은 한 글자도 안 바꾼다.**

- [X] T019 [US1] 화면 제목·루트 컨테이너를 이관하고 `StyleSheet.create` 블록을 **삭제**한다 per data-model.md §5 — 제목은 `AppText variant="title"`, 루트는 className+토큰 style 병행. 원시 hex 6개가 이때 전부 사라진다.

- [X] T020 [US1] **행 높이를 현행(`paddingVertical: 12`)에 맞춘다** per CS10 / research R7 — `ListRow`의 기본값은 14다. 화면이 `ListRow`에 `style`로 세로 여백을 넘겨 맞춘다. **`ListRow`의 기본값은 안 고친다**(공용 컴포넌트를 이 화면 하나 때문에 바꾸지 않는다). 이것이 Maestro `scrollUntilVisible` 도달 지점을 보존한다.

- [X] T021 [US1] `npm run test:ui`로 **`__tests__/ui/character-list.test.tsx`가 무수정 GREEN**이고 T013·T014가 GREEN인지 확인한다 per spec SC-002 — 깨지면 "표현만 바꾼다"를 어긴 것이므로 **테스트가 아니라 구현을 고친다**.

- [X] T022 [US1] `npx tsc --noEmit`으로 `CharacterListProps`가 불변이고 `App.tsx` 호출부가 안 깨졌는지 확인한다 per CS3 — 007·009·014에서 반복 확인된 대로 jest는 타입을 지우므로 `tsc`가 이 갈래의 유일한 방어다.

**체크포인트**: 캐릭터 화면이 이관됐고 기존 테스트가 전부 무수정 GREEN.

---

## Phase 5: 기기 없는 전체 검증 + 위반 주입

- [X] T023 `npm test` 전체(2004+개)와 `npm run lint`(eslint·tsc·헌법 검사·prettier)를 돌려 전부 클린인지 확인한다 per quickstart Q1 — 헌법 검사 위반 **0**, `jest-projects.test.ts` 파일 수 가드 GREEN.

- [X] T024 [P] quickstart Q1의 기계 검사 넷을 돌린다 — `CharacterListScreen.tsx`에 `#rrggbb` 리터럴이 **빈 결과**(SC-001), `PRESS` 참조 파일이 **둘**(SC-008), `src/ui/components/` 파일 수가 **7**(PF2), 새 Maestro 흐름 파일 **0개**(FR-021).

- [X] T025 위반 주입 6종을 각각 넣고 잡히는지 확인한 뒤 **되돌린다** per quickstart Q2 — (1) 화면에 `assetFor` import→헌법 검사, (2) 상태 문안 변경→기존 테스트+CS1, (3) `Button`의 `onPressOut` 제거→PF3, (4) `disabled`도 반응→PF6, (5) 화면이 `PRESS` import→PF1, (6) `label` 타입 되돌림→`tsc`. **잡히지 않는 것이 있으면 그 계약이 실효 없으므로 테스트를 먼저 고친다.**

**체크포인트**: 기기 없는 방어가 전부 실제로 작동함이 확인됐다.

---

## Phase 6: ★ 실기기 검증 (필수 — 이것 없이는 통과가 아니다)

**기기**: SM-S901N (Galaxy S22, One UI 7 / Android 16), dev debug.
**원칙 V**: 건너뛴 실기기 테스트는 통과가 아니다.

- [X] T026 실기기 환경을 준비한다 per quickstart Q3-0 — `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`(★ `babel.config.js`를 고쳤으므로 `--clear` 필수), `adb reverse tcp:8081 tcp:8081`, `adb shell dumpsys trust`로 `deviceLocked=0` 확인. Metro는 gradle 빌드가 끝난 뒤에 띄운다.

- [X] T027 [US1] 화면 이관을 육안 확인한다 per quickstart Q3-1 — **가는 길: 설정 탭 → 아래로 스크롤 → `VisionPicker`·`GeocodingSettingToggle` 아래**(029 SS4, "캐릭터" 탭은 없다). 아이보리 톤 일치(SC-003), 다섯 캐릭터 이름·소개·상태, 문안 불변, 지우기만 위험색, 사진 모델 줄이 아래에 별도로, 모델 정보·추천 표시 **0건**.

- [X] T028 [US2] **눌림 반응을 육안 확인한다** per quickstart Q3-2 — 이 스펙의 존재 이유다. 누르면 작아지고 떼면 돌아온다, 밖으로 끌고 나가 떼면 아무 일 없음, 주변이 안 밀림, 비활성은 무반응, 탭 결과 불변. **반응이 전혀 없으면 T001의 worklets 플러그인을 의심한다**(조용한 실패 — research R1).

- [X] T029 원칙 IV를 확인한다 per quickstart Q3-3 / spec SC-006 — 일기 탭 → 일기 쓰기 → 생성 중 화면에 진행률 숫자·경과 시간·생성 중인 글이 **여전히 0개**이고 회전 표시와 그만두기 버튼뿐.

- [X] T030 Maestro 흐름 **셋**을 갱신 없이 돌린다 per quickstart Q3-4 / CS10 — `download-conflict.yml`·`parallel-model-download.yml`·`photo-vision.yml`. **⚠️ `diary-character-select.yml`은 이 화면과 무관하다**(research R7 — `AuthorPicker`용). 깨지면 가장 유력한 원인은 **행 높이 변화로 인한 스크롤 도달 어긋남**(T020) — 흐름이 아니라 구현을 고친다. 그래도 안 되면 흐름을 조정하되 SC-004가 깨진 것이므로 **명시적으로 보고**한다.

**체크포인트**: 실기기에서 실제로 동작함이 확인됐다.

---

## Phase 7: Polish & 기록

- [X] T031 [P] `specs/032-nativewind-ui-system/tasks.md`의 T059 잔여 (2)(release 빌드 1회) 항목에 **"눌림 반응(reanimated worklet)이 배포 빌드에서 동작하는가"를 확인 항목으로 추가**한다 per spec FR-023 / research R6 — 이 스펙이 worklets babel 플러그인을 처음 활성화했으므로, 그 잔여를 닫을 때 함께 보면 비용 없이 닫힌다. **T063(CharacterListScreen 이관)은 이 스펙에서 완료됐음을 표시**한다.

- [X] T032 [P] `docs/roadmap/README.md` §21을 갱신한다 — 이 스펙(033)에서 구현됐음과, 구현 범위(눌림 피드백만 / `ListRow`만 적용 / 032 이월 잔여는 별도 유지)를 기록한다. 로드맵이 물었던 다섯 질문의 답을 남긴다.

- [X] T033 [P] `AGENTS.md`에 이 스펙의 실측 결론을 더한다 — (a) **`babel.config.js`의 worklets 플러그인 없이는 reanimated가 조용히 안 돈다**, (b) **reanimated는 jest에서 손으로 쓴 목이 필요하다**(공식 `mock.js`가 안 통함), (c) **`CharacterListScreen`은 설정 탭 하단에 있고 관련 Maestro 흐름은 셋**(`diary-character-select.yml` 아님). 기존 "지금도 유효한 실측 규칙" 절의 문체를 따른다.

- [ ] T034 `git status`로 위반 주입 잔재가 없는지 확인하고, 한국어 커밋 메시지로 커밋한 뒤 PR을 만든다 per AGENTS.md 작업 습관 — **`main` 직접 커밋 금지**(`.githooks/pre-commit`이 막는다). `git branch --show-current`로 `033-character-screen-press-feedback`인지 눈으로 확인한다.

---

## 의존 관계

```text
Phase 1 (T001~T003)  ★ 최우선 — 빌드 파이프라인
        ↓
Phase 2 (T004~T005)  PRESS 상수
        ↓
Phase 3 (T006~T010)  US2 눌림 피드백 — Button·ListRow
        ↓
Phase 4 (T011~T022)  US1 화면 이관 — Phase 3의 컴포넌트를 소비
        ↓
Phase 5 (T023~T025)  기기 없는 전체 검증 + 위반 주입
        ↓
Phase 6 (T026~T030)  ★ 실기기 — 유일한 최종 확인
        ↓
Phase 7 (T031~T034)  기록 + PR
```

**핵심 의존**:

- **T001이 모든 것의 전제** — 이것이 없으면 T028이 반드시 실패한다.
- **T002가 없으면 T006 이후 모든 `.tsx` 테스트가 죽는다**(`loadUnpackers` 오류).
- **T012(label 확장) → T015(행 이관)** — 타입이 안 넓어지면 노드를 못 넘긴다.
- **T008·T009(컴포넌트) → T015~T018(화면)** — 화면이 컴포넌트를 소비한다.
- **T020(행 높이) → T030(Maestro)** — 높이가 안 맞으면 스크롤 도달이 어긋난다.

## 병렬 기회

| 묶음 | 태스크 | 왜 안전한가 |
|---|---|---|
| 계약 테스트 (US2) | T006, T007 | 같은 파일의 다른 `describe` |
| 계약 테스트 (US1) | T013, T014 | 같은 파일의 다른 `describe` |
| 검증 | T024 | T023과 독립(기계 검사) |
| 기록 | T031, T032, T033 | 서로 다른 파일(032 tasks / roadmap / AGENTS) |

**병렬 기회가 적은 것이 정상이다** — 이 스펙은 파일 5개를 순차로 고치는 작업이고,
억지로 쪼개면 T003·T010·T021 같은 게이트가 무의미해진다.

## MVP 범위

**US2(Phase 1~3, T001~T010)만으로도 출하 가능하다** — 앱의 모든 공용 버튼이 눌림
반응을 갖고, 032가 치른 reanimated 비용이 처음으로 쓰인다. 다만 **스토리 우선순위상
US1(P1)이 사용자 가치가 더 크므로**, 실제 권장 MVP는 **Phase 1~4 전체**다.

**Phase 6(실기기)은 어느 범위를 고르든 필수다**(원칙 V).

## 완료 판정

quickstart Q5와 동일:

- [ ] T023·T024 전부 GREEN — 원시 hex 0, `PRESS` 참조 2파일, 컴포넌트 7개
- [ ] T025 위반 주입 6종이 **전부 잡힌다**
- [ ] T027 화면 이관 육안 통과
- [ ] T028 **눌림 반응이 실기기에서 실제로 보인다** ← 이 스펙의 존재 이유
- [ ] T029 생성 중 화면 미노출 유지
- [ ] T030 Maestro 흐름 셋 **갱신 없이** PASS
- [ ] T031 032 이월 잔여에 눌림 반응 확인 항목 추가
- [ ] T034 브랜치 → PR (`main` 직접 커밋 없음)

---

## ✅ 실기기 검증 결과 (2026-09-07, SM-S901N / Galaxy S22, One UI 7 / Android 16, dev debug)

### ★ T028 — 눌림 반응이 실제로 동작한다 (이 스펙의 존재 이유)

**jest가 구조적으로 못 잡던 항목**(목이 진짜 reanimated를 대신하므로 — PF7).
접근성 트리의 bounds를 평상시/누른 채로 재어 실측했다:

| | 평상시 | 누른 채 | 비율 |
|---|---|---|---|
| 버튼 내부 노드 | 117 × 66 | **113 × 64** | **0.966 / 0.970** |
| 바깥 버튼(`action-quiet`) | 201 × 129 | **201 × 129 (불변)** | — |

- `PRESS.scale = 0.97`과 실측이 일치한다.
- **바깥 bounds가 안 변한 것이 PF4의 증거** — transform만 바뀌어 주변이 밀려나지
  않는다. 뗀 뒤 높이가 66으로 복귀하는 것도 확인.
- **즉 T001(`babel.config.js`의 worklets 플러그인)이 유효했다.** logcat에
  `libworklets.so`·`libreanimated.so` 적재가 찍혔고, 이 실패는 조용해서
  (오류 없이 애니메이션만 안 돎) 이것 말고는 드러날 통로가 없었다.
- **PF5 확인**: 버튼을 누른 채 밖으로 끌고 나가 떼니 다운로드가 시작되지 않았다
  (`action-narrative` 그대로) — 눌림 반응이 `onPress`를 가로채지 않는다.

### T027 — 화면 이관 육안

설정 탭 하단(029 SS4)에서 확인: 아이보리 톤 일치, 다섯 캐릭터 이름·소개·상태,
「지우기」만 테라코타 위험색 `Button`, 나머지 보조색, 「사진을 보는 데 필요한 것」이
캐릭터 아래 별도 행, `460MB` 합산 표시. **문안 전부 이관 전과 동일.**
모델 식별자·추천 표시 0건.

- **CS4 실측**: `character-row-quiet`·`action-quiet`(content-desc "지우기")·
  `pause-narrative` 등이 접근성 트리에 살아 있고, **버튼이
  `android.widget.Button`으로 자기 이름을 갖는다**(008 실측 요구 충족).
- **CS10 실측**: 행 높이 255~265px로 이관 전 구조 유지.
- **008 FR-011 회귀 없음**: 다운로드 중 그 행만 「멈추기」로 바뀌고 멈추면 복귀.

### T029 — 원칙 IV 유지 (SC-006)

생성 중 화면의 **모든 텍스트가 5개**뿐이다: 탭 3개(일기·설정·개발자) + 독백 문구
(「오늘 일상이 어땠는지 들여다보는 중…」) + 「그만두기」. 금지어 7종
(`%`·`초`·`토큰`·`ms`·`남음`·`경과`·`/s`) **전부 0건**. 회전 표시만 있고 진행률
숫자·경과 시간·생성 중인 글이 없다.

### T030 — Maestro 흐름 셋

| 흐름 | 결과 |
|---|---|
| `photo-vision.yml` | ✅ **갱신 없이 전체 PASS** — `scrollUntilVisible`로 `vision-row`를 찾는 것까지 통과. **CS10(행 높이 보존)이 유효했다.** |
| `parallel-model-download.yml` | ✅ **PASS** (아래 stale 수정 후) |
| `download-conflict.yml` | ⚠️ **026 이후 검증 대상 소멸** — 아래 참조 |

**⚠️ 발견한 stale 결함 셋 — 전부 033 회귀가 아니다** (023·025·020과 같은 계열):

1. **`scrollUntilVisible: "모카"`가 엉뚱한 곳에서 멈춘다** (두 흐름 공통).
   029가 설정 탭에 `AuthorPicker`를 넣으면서 **「모카」·「샤오바이」가 두 곳에
   생겼다** — 위쪽 `AuthorPicker`의 그것에서 스크롤이 멈춰 아래 `ModelSection`의
   캐릭터 행까지 못 간다. `testID`(`character-row-english`/`-chinese`)로 짚도록
   고쳤다(023 선례).
2. **`scrollUntilVisible` 직후 곧바로 탭하면 다운로드가 시작되지 않는다.**
   탭이 COMPLETED로 보고되고도 파일이 안 생긴다 — 스크롤 관성 중에 들어가는
   것으로 보인다. **손으로 같은 자리를 누르면 정상 동작**함을 확인해 제품 결함이
   아님을 가렸다. `extendedWaitUntil`로 탭 전후에 멈춤을 줘 해소.
3. **탭 왕복 뒤 이미 보이는 요소를 `scrollUntilVisible`이 못 찾는다**(025 계열).
   `runFlow: when: notVisible`로 감싸 보이지 않을 때만 스크롤하게 했다.

**⚠️ `download-conflict.yml`은 026 이후 PASS할 수 없다 — 로드맵으로 미룬다**
(2026-09-07 사용자 결정). 이 흐름의 핵심은 008 FR-001~003의 거부 안내
(`download-notice`)인데, **026이 003 FR-020의 「한 번에 하나」 제약을 명시적으로
풀었다**("누른 만큼 전부 동시에, 무제한"). 그래서 두 캐릭터를 눌러도 거부가
일어나지 않고 `pause-english`·`pause-chinese`가 동시에 존재한다 — **제품이 옳게
동작하기 때문에 assert가 실패한다.** 026이 이 흐름을 회귀 대상으로 적어만 두고
(`tasks.md` T042 Q6) 갱신하지 않았다. 흐름 상단에 이 사실을 못박아 뒀다.

### 세션 중 사용자 지적으로 함께 고친 것

- **설정 탭 좌우 여백**(커밋 `b72db2a`): 「일기 작성자」·「사진을 어떻게 볼까」·
  「장소 이름으로 보기」 셋이 화면 끝에 붙어 있었다(실측 0~1080, 캐릭터 행은
  72~1008). `App.tsx`의 `settingsSection`(20)으로 감싸고 `CharacterListScreen`도
  24→20으로 맞췄다. **실기기 재확인: 세 섹션 전부 60~1020으로 통일.**
- **`DayPicker` 토큰 이관**: 원시 hex(`#ccc`·`#333`)가 남은 마지막 살아있는
  엔드유저 화면이었다. 고른 날짜 테두리가 검정 → 강조색으로 바뀌었다.
  `day-picker.test.tsx` 무수정 GREEN. **엔드유저 화면 전체의 className 병행
  이관은 로드맵 22번으로 분리**(사용자 결정).

### 검증 중 있었던 조작 실수 (코드 결함 아님)

눌림 반응을 재려고 `action-quiet`(지우기)를 길게 눌렀는데 그것이 실제 탭으로
처리돼 **금동이 모델이 지워졌다.** 측정 자체는 성공했으나 검증용 모델을 잃어
온보딩 다운로드 게이트가 열렸고, 다시 받아 복구했다(`a1`·`a4`·`a5`·`v1`·`v2`
전부 `passed: true`). **이 과정에서 029 온보딩·에셋 다운로드 단계가 정상
동작하는 것을 덤으로 확인했다.**

### 미확인으로 남는 것

- **release 빌드에서의 눌림 반응** — 032 이월 잔여 (2)와 함께(spec FR-023, T031).
  이 스펙이 worklets 플러그인을 처음 활성화했으므로 그 잔여에 확인 항목을 더해 뒀다.
- **One UI 8.5(SM-S928N) 육안** — 032 이월 잔여 (1).

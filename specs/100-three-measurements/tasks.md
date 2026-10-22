# Tasks: 실측 세 가지 — 제목 구간·동작 줄이기·작은 화면의 쓴 날

**Input**: `specs/100-three-measurements/` (spec.md, plan.md, research.md, data-model.md, contracts/measurement-contract.md, quickstart.md)

**표기**: `[조건부]` 태스크는 해당 판정이 「후속 변경」(또는 소유자 확인)일 때만 한다. 판정이 「닫음」이면 「해당 없음 — 판정 근거」로 체크하고 넘어간다. 측정값은 모두 `quickstart.md` 「결과」에 원값과 출처(`실측`/`소스 읽기`)를 적는다(M2).

## Phase 1: Setup (환경·기록)

- [ ] T001 `git branch --show-current`=`100-three-measurements`와 워크트리 위치 확인, 기기 설정 시작 값(`transition_animation_scale`·`animator_duration_scale`·`window_animation_scale`·`font_scale`·`stayon`)을 `specs/100-three-measurements/quickstart.md` 「결과」의 기기 설정 대조 표에 기록
- [ ] T002 `adb shell svc power stayon true`, 내 Metro를 8082에 띄우고(`EXPO_PUBLIC_APP_ENV=dev`가 번들에 반영됐는지 확인) `adb reverse tcp:8081 tcp:8082`로 SM-S901N debug 앱이 붙는지 확인(재설치·`pm clear` 금지)
- [ ] T003 [P] iOS 시뮬레이터 준비: 부팅된 기기에 앱 설치 상태 확인, iPhone SE 3rd gen(667pt) 시뮬레이터 생성 가능 여부 확인(`xcrun simctl list devicetypes`), 불가하면 대체 환경과 사유를 `specs/100-three-measurements/quickstart.md`에 적는다

## Phase 2: Foundational

- [ ] T004 제목 구간 신호원 확인: SM-S901N에서 시험 쓰기 1회를 `adb logcat`으로 보고 두 번째 모델 호출의 시작·끝을 가를 수 있는 줄이 있는지 기록(research R1). 없으면 녹화 상한 방식으로 정하고 `specs/100-three-measurements/research.md` R1에 실측 결과를 덧붙인다

## Phase 3: User Story 1 — 제목 구간 (P1)

**독립 검증**: 네 회차 원값·날 종류별 중앙값·판정이 quickstart에 있다.

- [ ] T005 [US1] 사진 있는 날 유효 회차 2개를 `specs/100-three-measurements/quickstart.md` 제목 구간 표에 기록(실패·시간 초과 회차는 따로 적고 중앙값에서 빼며, 유효 2개가 될 때까지 보충 쓰기 최대 2회)
- [ ] T006 [US1] 사진 없는 날 유효 회차 2개를 같은 규칙으로 기록
- [ ] T007 [US1] 날 종류별 중앙값을 구해 FR-003(둘 중 하나라도 ≥4.0초면 후속 변경)로 판정을 `specs/100-three-measurements/quickstart.md`에 기록
- [ ] T008 [US1] [조건부: 후속 변경] 테스트 먼저: `__tests__/inference/types.test.ts`(단계 수)·`__tests__/diary/monologue.test.ts`(갈래 수·숫자 없음)·`pipeline.live-write.test.ts` P4 순서·`__tests__/i18n/ko-golden.test.ts` `ADDED_AFTER_GOLDEN`을 `title` 단계 하나·풀 하나 기준으로 갱신해 실패를 확인
- [ ] T009 [US1] [조건부: 후속 변경] `src/inference/types.ts`에 `title` 단계 추가, `src/inference/on-device.ts` 제목 질문 앞에서 단계 전환 보고(저장 단계는 넣지 않는다), `src/ui/DiaryHomeScreen.tsx`의 단계→풀 선택(혼잣말 교체, `WRITING.rotateMs`=4000)과 `ProgressStage`를 쓰는 모든 곳(`tsc` 0 확인), `src/diary/monologue.ts`·`src/i18n/catalogs/ko/monologue.ts`에 사람이 쓴 열 문장 풀(숫자·시간·글 조각 없음) 추가, T008 테스트 통과
- [ ] T010 [US1] [조건부: 후속 변경] SM-S901N에서 쓰는 중 화면이 제목 구간에 풀이 바뀌는 프레임을 `screenrecord`로 확인해 기록(FR-012)

## Phase 4: User Story 2 — 동작 줄이기 (P1)

**독립 검증**: 장면 7×플랫폼 2 결과표, 기기 설정 원복 대조가 있다.

- [ ] T011 [US2] SM-S901N 「애니메이션 제거」를 켜고 설정 값 세 개를 `adb shell settings get`으로 기록(FR-006), 설정 겹 열기·닫기 / 날짜 넘김 / 실패 토스트 / 스트립 튕김 / 달력 / 사진 확대 여섯 장면을 켠 상태로 `screenrecord` 후 `specs/100-three-measurements/captures/`에 저장, 결과표에 `따름`/`따르지 않음`과 근거 기록
- [ ] T012 [US2] SM-S901N에서 074 절차(`run-as`로 `files/models`→`files/models.074bak`, `onboarding.json` 조정)로 내려받기 화면을 켠 상태로 녹화해 슬라이드 자동 넘김 여부 기록, 끝나면 모델 폴더·`onboarding.json` 원복과 파일 목록 대조(M6)
- [ ] T013 [P] [US2] iOS 시뮬레이터 「동작 줄이기」를 켜고 같은 일곱 장면을 `xcrun simctl io recordVideo`로 녹화해 결과표에 기록. 내려받기 화면은 시뮬레이터 앱 컨테이너의 모델 폴더를 옮겨(복원 가능하게) 첫 실행 상태를 만들어 보며, 도달할 수 없으면 `해당 없음`과 사유를 적는다. 끝나면 모델 폴더 원복과 목록 대조
- [ ] T014 [US2] 판정: 자동 넘김 외 `따르지 않음`은 `specs/100-three-measurements/quickstart.md`에 기록하고 로드맵 후속 과제 문안을 만든다(clarify 결정), 자동 넘김이 계속 넘어가면 소유자 확인을 요청한다
- [ ] T015 [US2] [조건부: 자동 넘김이 멈추지 않고 소유자 승인] 테스트 먼저: `__tests__/ui/download-progress-screen.test.tsx`에 `AccessibilityInfo.isReduceMotionEnabled()` 값이 참이면 자동 넘김이 꺼지는 단언과 기존 `autoplay` 소스 정규식 유지 단언
- [ ] T016 [US2] [조건부: T015와 같은 조건] `src/ui/DownloadProgressScreen.tsx` `CarouselSlides`의 `autoplay`를 동작 줄이기 상태에서 끄고(`autoplay` 낱말·`autoplayInterval` 유지, 손으로 넘기기·046 나머지 동작 불변) T015 통과, 실기기에서 「애니메이션 제거」 켠 채 멈춤을 `screenrecord`로 확인(FR-012)
- [ ] T017 [US2] 동작 줄이기 켠 설정을 시작 값으로 되돌리고 기기 설정 대조 표를 채운다

## Phase 5: User Story 3 — 작은 화면의 쓴 날 (P2)

**독립 검증**: 환경×배율 줄 수 표와 판정이 있다.

- [ ] T018 [US3] 083(2026-10-15) 이후 쓴 날 레이아웃이 바뀌었는지 `git log --since=2026-10-15 -- src/ui/DiaryHomeScreen.tsx src/ui/theme/tokens.ts src/ui/components`와 diff로 확인해 `specs/100-three-measurements/quickstart.md`에 적는다. 바뀌었으면 083 캡처를 증거로 쓰지 않고 안드로이드·iOS 1.0·약 2.0배를 새로 찍는다(T019에 합친다)
- [ ] T018a [US3] `specs/083-pretendard-font/captures/after/font-scale-2/{android,ios}/shot-01-home-written.png`를 읽어 쓴 날 첫 화면 본문 노출 줄 수를 센다(플랫폼 열 분리)
- [ ] T019 [US3] (T018에서 변경이 확인되면 안드로이드·iOS 실기기/시뮬레이터 1.0·2.0배도 새로 찍는다) T003 환경(iPhone SE 3rd gen 시뮬레이터 667pt 또는 대체)에 쓴 날 표본을 준비해 글꼴 1.0·약 2.0배로 쓴 날 첫 화면을 `specs/100-three-measurements/captures/`에 캡처하고 줄 수를 센다
- [ ] T020 [US3] FR-010 판정(1.0배에서 ≥2줄 닫음 / ≤1줄 소유자 보고)을 기록하고, ≤1줄이면 「30dp를 줄여도 글꼴 2.0배에서는 한 줄(약 49.5dp)도 못 번다」 계산을 함께 적어 소유자에게 올린다(캐러셀 높이는 불변)
- [ ] T021 [US3] 결과에 시뮬레이터 하나의 한계와 SE급 지원 여부(M1) 미확인을 적는다

## Phase 6: Polish & 정리

- [ ] T022 `adb reverse tcp:8081 tcp:8081` 원복, 내 Metro(8082) 종료, 기기 설정 대조 표 전부 일치 확인
- [ ] T023 AGENTS.md 「지금도 유효한 실측 규칙」에 판정 한 줄씩(제목·동작 줄이기·쓴 날) 추가 — 값과 출처, 닫음/후속 변경 표시(M8)
- [ ] T024 로드맵 후속 과제(자동 넘김 외 `따르지 않음` 장면, 보드 2c 이탈 등 해당 시)를 `docs/roadmap/README.md`에 올린다 — 해당 없으면 사유를 한 줄로 quickstart에
- [ ] T025 `git status`/`git diff --stat`로 측정 도구가 저장소에 없음을 확인하고, 후속 변경이 없으면 `src/` 변경 0줄을 quickstart에 보인다(M7), `npm test`·`npm run lint` 통과
- [ ] T026 반영하지 않기로 한 지적이나 소유자 보류 항목이 있으면 사유와 함께 이 파일 맨 아래 「보류」에 기록

## 의존성

- T018 → T018a·T019.
- Phase 1 → Phase 2(T004) → US1(T005~T007)은 T004 뒤. US2·US3는 Phase 1 뒤 US1과 독립(기기를 같이 쓰므로 안드로이드 작업은 직렬).
- 조건부 T008~T010은 T007, T015~T016은 T014 뒤. T017은 T011~T012와 (해당 시) T016 뒤 — T016이 같은 설정을 켠 채 확인하기 때문. Phase 6은 모두 뒤.

## 병렬 기회

- T003 · T013(iOS 시뮬레이터) · T018a(문서 판독)는 안드로이드 기기 작업과 병렬 가능.

## 구현 전략

MVP는 US1(제목 구간 판정). 이어 US2·US3. 후속 변경은 판정 뒤에만 열고, 닫음이면 제품 코드는 0줄이다.

## 보류

(없음)

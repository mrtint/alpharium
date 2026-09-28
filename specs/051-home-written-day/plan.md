# Implementation Plan: 쓴 날 읽기 — 홈이 곧 상세

**Branch**: `051-home-written-day` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/051-home-written-day/spec.md`

## Summary

홈에서 일기가 있는 날을 고르면 화면을 바꾸지 않고 그 자리에서 읽는다(보드 `2c`·`2k`·`2g`). 헤더 상태 줄 자리에 제목, 스트립 아래 연회색
지면에 흑백 순환 캐러셀(이미 설치된 `react-native-reanimated-carousel`, 2장 이상일 때만)과 본문, 하단 바에 연회색 「다시 쓰기」(오늘의 일기면
상대 작성 시각)를 둔다. 지면 판정은 순수 함수 `paperFor()`(`src/app/written-day.ts`), 문구·상대 시각은 `home-text.ts`, 오늘 판정은 `cellFor()`.
「최근」 목록·`DiaryDetailScreen`(025 갤러리·017 「이 일기가 본 것」·038 타자기 포함)을 지우고, `AppScreen`에서 `detail`·`unreadable`·`written`을
걷어내 저장 실패만 임시 결과 화면(`unsaved`)으로 남긴다. 알림은 홈이 그 날을 고르게 하고, 확인 기록은 읽을 수 있는 일기가 보였을 때 남긴다.
새 의존성·새 네이티브 모듈·저장 형식 변경이 없다.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), React 19.2, React Native 0.86.2(새 아키텍처), Expo SDK 57

**Primary Dependencies**: 기존만 — `react-native-reanimated-carousel` 5.1.1(046, 순수 JS — research R1), reanimated 4.5.1, gesture-handler 2.32,
NativeWind 4.2, safe-area-context, `@rn-primitives/*`(050 대화상자). **새 의존성 0.**

**Storage**: 없음 — 저장 형식 무변경(data-model §1). 지면·캐러셀 상태는 화면 로컬, 고른 날은 `AppFrame`(048 Q4)

**Testing**: jest 29 두 프로젝트(`logic` `.ts` / `ui` `.tsx`), RNTL 14(`render`·`fireEvent` await), 캐러셀 목 확장(host에 props 전달), Maestro(실기기)

**Target Platform**: Android(SM-S901N, Android 16), dev(debug) 빌드

**Project Type**: mobile-app (Expo, 단일 저장소)

**Performance Goals**: 날을 바꾸면 지면이 눈에 띄는 지연 없이 바뀐다(일기 파일 하나 읽기). 수치 목표 없음 — 측정 코드를 두지 않는다(원칙 IV)

**Constraints**: 새 의존성 0(C1·C2), 색 단일 출처(C5), 하루 경계는 `day-boundary.ts`만(049 DB11), 오늘 판정은 `cellFor`만(FR-019a),
문구는 보드 KO 원문·`home-text.ts`(C4), 다른 조각 영역을 만들지 않는다(C7), 실기기는 `pm clear` 없이·Maestro 직접 실행

**Scale/Scope**: 새 파일 약 4개(`written-day.ts`·`PhotoCarousel.tsx`·`WrittenDayPaper.tsx`·Maestro 흐름 1), 삭제 1(`DiaryDetailScreen.tsx`) +
테스트 3, 고치는 파일 약 8개(+ Maestro 흐름 약 12)

## Constitution Check

*GATE: Phase 0 전 통과 — Phase 1 뒤 재확인.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론·저장 경로 무변경. 쓰기를 시작하는 함수는 여전히 저장 상태를 못 본다(ST5). 저장 실패 글은 읽게 두되 「남지 않는다」를 말한다(GEN3, 006 FR-012a). 옛 일기에 닿는 길이 스트립·달력으로 남는다(REACH — 저장된 것을 볼 수 없게 되지 않는다) |
| II. 화자는 휴대폰 | 통과 | 프롬프트 무변경. 장소 이름은 화면에서만 빠지고 프롬프트 줄은 그대로다 |
| III. 캐릭터는 모델 위에 | 통과 | 지면·배지·바에 모델 식별자 없음(FR-034). 작성자 이름 문장이 사라져 037 로스터 밖 방어가 필요한 자리도 줄었다 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 배지는 순번, 작성 시각은 사후 사실. 소요 시간 문장은 오히려 화면에서 빠진다. 채점·비교 없음 |
| V. 관측과 추측 구분 | 통과 | 캐러셀 네이티브 0·흑백 지원은 설치본·문서로 확인(R1·R2), 흑백의 실제 모습은 실기기 D3 전까지 미확인으로 적는다. 없음/모름(0장 vs 사본 사라짐 vs 읽을 수 없음)을 다른 모양으로 보인다. 실기기 dev 1회 |
| 개발 방식 | 통과 | 계약(contracts/written-day.md) → 테스트 먼저. 한국어 커밋. `051-home-written-day` 브랜치 |

**Phase 1 뒤 재확인**: 통과. `unsaved`가 `DiaryEntry`를 싣는 것은 012 X1(확인 대화상자에 본문 금지)과 다른 자리다 — 쓰기 **뒤** 결과이고
그 글을 읽게 하는 것이 목적이다(research R3). 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/051-home-written-day/
├── plan.md
├── research.md             # R1~R10
├── data-model.md
├── quickstart.md
├── contracts/written-day.md # PAP·ST·HOME·CAR·BAR·TIME·GEN·NR·REACH·TXT·DEL
├── checklists/requirements.md
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
App.tsx                                   # pendingRoute를 onInitialDayApplied에서 비움 (NR5)
jest/setup-ui.ts                          # 캐러셀 목: loop·onSnapToItem·onConfigurePanGesture·data를 host props로 전달

src/app/written-day.ts                    # 새 — paperFor() (순수)
src/app/state.ts                          # AppScreen에서 detail·unreadable·written 제거, unsaved 추가,
                                          #   toDetail 제거, initialScreen 단순화, afterGeneration → AfterGeneration
src/ui/theme/tokens.ts                    # WRITTEN_DAY (paper·rewriteBar·indicatorIdle·치수)
src/ui/home-text.ts                       # WRITTEN_DAY_TEXT(다시 쓰기·손상 두 줄·사진 없음·저장 실패·← 일기), writtenAtText()
src/ui/PhotoCarousel.tsx                  # 새 — 0/1/≥2 갈래, 배지·인디케이터, 흑백·cover, 사본 실패 대체(DiaryPhoto 이관)
src/ui/WrittenDayPaper.tsx                # 새 — 지면(readable: 캐러셀+본문 / unreadable: 두 줄 / loading: 빈 지면)
src/ui/DiaryListScreen.tsx                # 목록·카드 제거, 쓴 날이면 제목·지면·RewriteBar(write-button), 신호 줄은 안 쓴 날만
src/ui/DiaryHomeScreen.tsx                # 날마다 store.load + paperFor, 작성 시각 1분 인터벌, 알림 initialDay 적용·확인,
                                          #   afterGeneration 반영(home → refresh), unsaved 화면, Frame 「← 일기」
src/ui/DiaryDetailScreen.tsx              # 삭제

__tests__/app/written-day.test.ts         # PAP1~6
__tests__/app/state.test.ts               # ST1~6 (detail·written 갈래 테스트 교체)
__tests__/ui/home-text.test.ts            # TIME1~4, TXT1~3 (확장)
__tests__/ui/photo-carousel.test.tsx      # CAR1~11
__tests__/ui/written-day-home.test.tsx    # HOME1~11, BAR1~7, GEN1~6
__tests__/ui/diary-home-notification.test.tsx # NR1~4 (상세 → 홈 지면으로 재작성)
__tests__/ui/written-day-reach.test.ts    # NR5, REACH1~3, DEL1~4, TXT3 (소스·순수)
__tests__/theme-tokens.test.ts            # WRITTEN_DAY 대비(research R7)
__tests__/ui/diary-detail.test.tsx        # 삭제
__tests__/ui/photo-gallery.test.tsx       # 삭제
__tests__/ui/diary-reveal.test.tsx        # 삭제
__tests__/ui/diary-list.test.tsx          # 목록 카드 갈래 삭제
__tests__/ui/diary-home.test.tsx          # 상세 전이 기대 → 홈 지면
__tests__/ui/character-name-flow.test.ts  # DiaryDetailScreen 검사 걷어냄(사유 주석)
__tests__/ui/press-feedback.test.tsx      # 주석 참조 정리
__tests__/scripts/check-constitution.test.ts # 「정당한 사용」 예시 파일을 실재 파일로

.maestro/written-day-reading.yml          # 새 (FLOWS 등록) — 제목·캐러셀·순환·다시 쓰기 → 취소
.maestro/diary-body-screen.yml            # 홈 지면 검증으로
.maestro/diary-photo-gallery.yml          # 삭제 — written-day-reading이 캐러셀을 대체 (FLOWS에서 제거, 사유는 새 흐름 머리 주석)
.maestro/{past-day-diary,photo-selection-over-limit,today-diary}.yml   # 「← 목록」 블록 → 홈 지면 확인
.maestro/{dialog-foundation,diary-character-select,diary-user-path,generate-diary,
          writing-flow-simplified,writing-monologue,writing-monologue-expansion}.yml  # 「일기 쓰기」 글자 → id: write-button (R9)
scripts/run-device-tests.mjs              # FLOWS: written-day-reading 추가, diary-photo-gallery 제거
```

**Structure Decision**: 기존 구조를 따른다. 순수 판정은 `src/app/`(049 `weekCellsFor`, 050 `calendar.ts` 자리), 문구는 `home-text.ts`(048 FR-037),
색·치수는 `tokens.ts`. 화면 컴포넌트는 지면(`WrittenDayPaper`)과 캐러셀(`PhotoCarousel`)을 떼어 `DiaryListScreen`이 더 커지지 않게 한다 —
「읽기 스크롤」이 지면에 스크롤 판정을 더할 때 한 파일만 보면 된다. `DiaryListScreen` 이름은 그대로 둔다(이름 바꾸기는 이 조각의 가치가
아니고 050 계약·테스트 파일명을 함께 흔든다).

## 설계 결정 요약 (research 참조)

1. **캐러셀은 설치된 라이브러리, 2장 이상일 때만**(R1) — 순환 때문. 1장은 사진 하나. 날마다 `key`로 새로 마운트.
2. **흑백은 `filter: [{ grayscale: 1 }]`**(R2) — 새 아키텍처 안드로이드에 제약 없음(문서). 실기기 D3 전까지 모습은 미확인.
3. **화면 상태에서 상세를 없앤다**(R3) — 쓴 날은 홈의 지면 상태(`paperFor`, R4). 저장 실패만 `unsaved`.
4. **상대 시각은 `home-text.ts`의 순수 함수**(R5), 오늘 판정은 `cellFor`, 오늘을 볼 때만 60초 인터벌.
5. **알림은 「적용」과 「확인」을 가른다**(R6) — `onInitialDayApplied`로 `pendingRoute`를 비우고, 확인은 readable이 보였을 때.
6. **토큰은 `WRITTEN_DAY` 묶음**(R7) — `COLORS` 아홉 역할 불변.
7. **Maestro는 `write-button` id로 누른다**(R9) — 쓴 날에도 같은 testID.

## 위험

| 위험 | 대응 |
| --- | --- |
| 캐러셀 가로 제스처가 049 스트립 팬·세로 `ScrollView`와 겹친다 | 캐러셀은 스트립 아래 지면 안에만 있어 스트립 팬과 영역이 다르다. 세로와는 `activeOffsetX([-10, 10])`(R1). 실기기 D4 |
| `onConfigurePanGesture` 콜백이 워크릿 문맥인지(설계 §1 표의 `'worklet'`) 문서가 말하지 않는다 | 구현 때 설치본의 호출부를 읽어 결정한다(짐작 금지). 틀리면 dev에서 즉시 빨간 화면으로 드러난다 |
| 캐러셀 폭 계산(스트립 폭 = 창 폭 − 40)이 회전·글꼴 크기에서 어긋난다 | 앱은 세로 고정(025 관측). `onLayout`으로 지면 폭을 재서 넘긴다 — 창 폭 가정을 두지 않는다 |
| `filter`가 `Image`의 `onError` 대체 뷰나 배지까지 흑백으로 만든다 | 흑백 `View`는 사진 면만 감싸고, 배지·인디케이터는 그 밖에 둔다(CAR6·CAR7) |
| 날마다 `store.load`가 목록을 만들 때 이미 읽은 파일을 한 번 더 읽는다 | 일기 하나(수 KB)라 무시한다. 캐시를 두지 않는다(048 FR-022와 같은 판단) |
| 확인 기록이 날을 고를 때마다 파일을 쓴다 | `acknowledgeNotified`는 알림 기록이 없거나 이미 확인이면 쓰지 않는다(멱등). 화면도 같은 날에 한 번만 부른다(NR4) |
| 기존 Maestro 흐름이 「일기 쓰기」 글자에 기대어 쓴 날에서 깨진다 | R9 — `write-button` id로 바꾸는 태스크를 둔다 |
| `DiaryDetailScreen` 삭제로 헌법 검사 테스트의 예시 파일이 사라진다 | `check-constitution.test.ts`의 예시를 실재 파일(`SignalProbe.tsx` 등)로 바꾼다 |

## Complexity Tracking

(위반 없음)

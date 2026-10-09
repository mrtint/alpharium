# Implementation Plan: 쓴 날 사진 확대 화면

**Branch**: `067-photo-zoom-viewer` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/067-photo-zoom-viewer/spec.md`

## Summary

쓴 날 지면의 사진(051 캐러셀·사진 하나)을 누르면 전체 화면 확대 화면이 열린다. 확대 화면은 RN 코어 `Modal` 안에서 같은 순환 캐러셀로
넘기고(배율 1), 사진마다 gesture-handler의 핀치·팬·두 번 탭으로 확대·이동하며, 배율 1에서 아래로 끌거나 ✕·뒤로 가기로 닫는다. 닫으면
지면 캐러셀이 마지막으로 본 사진으로 옮겨진다. 판정(배율 한계·끌어 닫기 문턱·이동 한계)은 `src/app/photo-viewer.ts`의 순수 함수가
하고, 새 의존성은 없다(설계 Z3).

## Technical Context

**Language/Version**: TypeScript 5 (React 19 · React Native 0.86 · Expo SDK 57, React Compiler 켜짐)

**Primary Dependencies**: 설치된 것만 — `react-native-gesture-handler` ~2.32(`Gesture.Pinch`·`Pan`·`Tap`·`Simultaneous`, `GestureHandlerRootView`), `react-native-reanimated` 4.5(공유값·`useAnimatedStyle`·`withTiming`), `react-native-reanimated-carousel` 5.1.1(`defaultIndex`·`scrollEnabled`·`CarouselRef.scrollTo`)

**Storage**: 없음 — 화면 로컬 상태뿐

**Testing**: jest 두 프로젝트 — 순수 판정 `.ts`(logic), 화면 `.tsx`(ui, `jest/setup-ui.ts`의 reanimated·carousel 목 + gesture-handler `jestSetup`). 실기기 dev 빌드(quickstart)

**Target Platform**: Android(dev 실기기 SM-G986N로 완료 판정). iOS는 같은 코드가 돌지만 실기기 미확인으로 남긴다

**Project Type**: mobile-app (Expo bare)

**Performance Goals**: 확대·이동·끌기가 손을 따라온다(실기기 녹화에서 끊김이 눈에 띄지 않음). JS 스레드 제스처(049 선례)가 끊기면 그 제스처만 worklet으로 옮긴다(research R3)

**Constraints**: 새 의존성 0(FR-016). 화면 문구는 카탈로그(062). 홈의 겹·뒤로 가기 구조(055)를 건드리지 않는다. 지면 캐러셀의 팬 설정(051 CAR3)은 그대로

**Scale/Scope**: 새 파일 셋(판정·확대 화면·사진 한 장) + 지면 캐러셀 수정 + 카탈로그 한 영역

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론·저장 경로를 건드리지 않는다. 보이는 사진은 그 일기가 본 사본 그대로 |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·일기 본문을 바꾸지 않는다 |
| III. 캐릭터는 모델 위에 | 해당 없음 | 모델·로스터·페르소나와 무관 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 출력 채점·비교 코드 없음. 「n / N」은 순번이지 지표가 아니다(051과 같다) |
| V. 관측과 추측을 구분 | 통과 | research의 짐작(R3 JS 스레드 핀치·R4 edge-to-edge·R5 뒤로 가기)을 실기기 quickstart에서 확인한다. 수치는 사람이 정한 값으로 표기(R8) |
| 사진과 시각 처리 | 해당 없음 | VLM 경로와 무관 |
| 개발 방식 | 통과 | 계약(contracts) → 테스트 먼저. 한국어 커밋. 기능 브랜치 `067-photo-zoom-viewer` |

Phase 1 뒤 재검사: 설계가 새 저장·새 의존성·새 네이티브 코드를 들이지 않음을 확인 — 통과.

## Project Structure

### Documentation (this feature)

```text
specs/067-photo-zoom-viewer/
├── spec.md
├── plan.md              # 이 파일
├── research.md          # R1~R8
├── data-model.md        # 화면 로컬 상태·판정 함수
├── quickstart.md        # 실기기 시나리오 Q1~Q13
├── contracts/
│   └── photo-viewer.md  # ZV·ZC·ZP·ZB
├── checklists/
│   └── requirements.md
└── tasks.md             # speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   └── photo-viewer.ts            # 새 — 판정 순수 함수·수치 상수 (src/ui/ 를 import하지 않는다)
├── i18n/catalogs/ko/
│   ├── photo-viewer.ts            # 새 — 「닫기」·「사진 크게 보기」
│   └── index.ts                   # photoViewer 등록
└── ui/
    ├── PhotoCarousel.tsx          # 수정 — 사진 누름·확대 화면 열기·닫힌 뒤 scrollTo (051 CAR9 뒤집음)
    ├── PhotoViewer.tsx            # 새 — Modal·GestureHandlerRootView·캐러셀·배지·✕·끌어 닫기
    ├── ZoomablePhoto.tsx          # 새 — 사진 한 장의 핀치·이동·두 번 탭
    └── home-text.ts               # PHOTO_VIEWER_TEXT = lazyText((c) => c.photoViewer)

__tests__/
├── app/photo-viewer.test.ts       # 새 — ZV1~ZV11
├── ui/photo-viewer.test.tsx       # 새 — ZP1~ZP10
├── ui/photo-carousel.test.tsx     # 수정 — CAR9 → ZC1~ZC7
└── i18n/ko-golden.test.ts         # ADDED_AFTER_GOLDEN에 두 문구
```

**Structure Decision**: 기존 단일 Expo 앱 구조를 따른다. 판정은 `src/app/`(056 `target-hour.ts`처럼 `src/ui/`를 import하지 않는 순수 모듈), 화면은 `src/ui/`. 확대 화면은 `PhotoCarousel`이 소유한다 — 지면(`WrittenDayPaper`)·홈(`DiaryListScreen`·`App.tsx`)은 바꾸지 않는다. 그래서 홈의 겹(055)·뒤로 가기·접힘(052)과 결합이 생기지 않는다. 확대 화면을 연 채 자정이 지나도 그대로인 것(spec Edge Cases)은 이 구조에서 나온다 — 자정에 고른 날은 바뀌지 않고(049, 밑줄·흐림만 옮긴다) 지면 캐러셀의 `key`는 그 날짜이므로(051 CAR10) `PhotoCarousel`이 다시 마운트되지 않아 그것이 들고 있는 확대 화면도 닫히지 않는다.

## 구현 순서 (요지 — 세부는 tasks.md)

1. 판정: `photo-viewer.ts` 테스트(ZV) → 구현.
2. 문구: 카탈로그 영역 + 골든 허용 + `home-text.ts` 진입점.
3. 확대 화면: 테스트(ZP) → `ZoomablePhoto` → `PhotoViewer`.
4. 지면 캐러셀: 051 CAR9 테스트를 ZC로 바꾸고 → `PhotoCarousel` 수정. 머리 주석의 「사진을 누르지 않는다」를 고친다.
5. `npm test`·`npm run lint`, 위반 주입(contracts 「위반 주입」 칸), 실기기 quickstart Q1~Q13.

## Complexity Tracking

위반 없음.

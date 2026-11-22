# Implementation Plan: 쓴 날 일기 화면의 동선 도식

**Branch**: `125-day-route-diagram` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: `specs/125-day-route-diagram/spec.md` (설계: `docs/superpowers/specs/2026-11-22-day-route-diagram-design.md`)

## Summary

쓴 날 지면 맨 끝에 「하루 동선」 칸을 더한다. 저장된 값은 늘리지 않는다 — 지면이 열릴 때 그 날의 사진 좌표를 다시 읽어(기존 `loadSignals`) 자리 목록을 얻고, 저장된 `entry.places`(이름·때)와 자리 수가 같을 때만 번호 점·직선 도식을 그린다. 좌표는 `app/`의 순수 변환(`day-route.ts`)이 0~1 상대 위치로 바꾼 뒤에만 화면에 닿고, 도식은 `View`(점 정사각·선 회전 `View`)로 그려 새 네이티브 의존성이 없다. 읽기·늦은 응답 폐기·캐시 없음은 `previewDay`(053·054)와 같은 방식이다.

## Technical Context

**Language/Version**: TypeScript(strict), React Native 0.86.3 + Expo SDK 57, Hermes

**Primary Dependencies**: 새 의존성 없음. 기존 `loadSignals`(사진 좌표), `react-native`의 `View`·`Text`, `AppText`

**Storage**: 없음 — **새로 저장하는 값이 없다**(FR-007). 일기 파일 읽기 전용

**Testing**: jest 두 프로젝트 — 순수 투영·모델은 `logic`(`.ts`), 화면은 `ui`(`.tsx`, RNTL 14), 소스 계약은 `__tests__/config/`

**Target Platform**: iOS(iPhone)·Android. 실기기 확인은 SM-S901N(dev)·iPhone 14

**Project Type**: mobile-app (Expo/React Native)

**Performance Goals**: 쓴 날 지면은 읽기를 기다리지 않는다(FR-009). 읽기 한 번에 하루 사진 EXIF 조회(기존 미리보기와 같은 비용)

**Constraints**: 외부 요청 0·새 권한 0·좌표가 `app/` 밖으로 나가지 않음·글꼴 2.0배에서 첫 화면 본문 노출 불변·디자인 토큰만(색)

**Scale/Scope**: 자리 최대 12곳 표시(넘으면 「외 N곳」). 새 파일 7개(소스 2 — `day-route.ts`·`DayRouteSection.tsx`, 테스트 5), 고치는 소스 8개(`wiring.ts`·`DiaryHomeScreen.tsx`·`DiaryListScreen.tsx`·`WrittenDayPaper.tsx`·`ko/home.ts`·`home-text.ts`·`places.ts`·`App.tsx`)와 기존 테스트 3개(아래 「Source Code」 목록)·문서(`AGENTS.md`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 위치는 기기 안 사진 EXIF에서만 읽는다. 외부 요청·지도 타일 없음 |
| II 화자의 좁은 시야 | 통과 | 도식은 일기 글을 만들지 않는다. 읽는 쪽 화면이다 |
| III 내부 사양 비노출 | 통과 | 도식·목록에 모델·경로 정보 없음 |
| IV 측정 장치 금지 | 통과 | 점수·비교 코드 없음. 진행 표시도 없다 |
| V 관측과 추측 | **핵심** | 선은 「사진이 찍힌 자리를 시간순으로 이은 거예요」라고 화면이 말한다(FR-002). 읽지 못한 날·자리 수 어긋남·옛 일기는 채우지 않는다(FR-006·012) |
| 경계 | 통과 | 화면은 신호·좌표를 모른다(DP6). 새 `app/day-route.ts`가 좌표를 상대 위치로 바꾼다 |
| 화면 한글 | 통과 | `src/i18n/catalogs/ko/home.ts`에만 둔다 |

Phase 1 설계 뒤 다시 확인: 변화 없음(통과).

## Project Structure

### Documentation (this feature)

```text
specs/125-day-route-diagram/
├── plan.md              # 이 파일
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 — 실기기 확인 절차
├── contracts/
│   └── day-route.md     # 순수 변환·화면·경계 계약 (DR1~)
└── tasks.md             # /speckit-tasks 산출 (이 단계에서는 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── day-route.ts            # 새 — 순수. 자리·저장 자리 → DayRoute (좌표는 여기서 멈춘다)
│   └── wiring.ts               # routeDay 추가(previewDay 옆) — loadSignals → buildDayRoute
├── signals/
│   └── places.ts               # `distanceMeters`를 내보냄 — 도식의 겹침 판정이 tracePlaces와 같은 하버사인을 재사용해 거리 계산이 두 벌이 되지 않게 한다(다른 변경 없음)
├── ui/
│   ├── DayRouteSection.tsx     # 새 — DayRoute만 받아 그린다(점·선·범례·설명 한 줄)
│   ├── WrittenDayPaper.tsx     # 본문 View 안 문단 뒤에 칸을 붙인다 (route prop)
│   ├── DiaryListScreen.tsx     # route prop을 지면에 전달
│   └── DiaryHomeScreen.tsx     # routeDay 호출·늦은 응답 폐기·route 계산
└── (루트) App.tsx              # wiring.routeDay를 홈에 넘긴다(previewDay 옆). 상태 흉내(064)가 켜져 있으면 넘기지 않는다 — 흉내 날과 실제 사진이 어긋난다(소스 계약 DB6)
├── ui/home-text.ts             # ROUTE_TEXT 래퍼(다른 홈 문구와 같은 lazyText 방식)
└── i18n/catalogs/ko/home.ts    # 도식 이름·설명 한 줄·화면 낭독·범례 문구

__tests__/
├── app/day-route.test.ts                 # logic — 투영·자리 수 일치·12 상한·단일/공선/가까운 점
├── ui/day-route-section.test.tsx         # ui — 점·선·번호·범례·「외 N곳」·화면 낭독
├── ui/diary-home-day-route.test.tsx      # ui — 쓴 날에만·쓰는 중 아님·늦은 응답 폐기
├── ui/written-day-route-reach.test.tsx   # ui — 칸이 늦게 더해져 높이가 늘 때 끝 판정(FR-016, DF6)
└── config/day-route-rules.test.ts        # 소스 계약 — 지도·네트워크 없음, ui가 신호·좌표에 안 닿음, 저장 쓰기 없음
```

고치는 기존 테스트(새 갈래만 더하고 기존 단언은 그대로): `__tests__/app/wiring.test.ts`(`routeDay` 갈래·저장소 불변), `__tests__/i18n/ko-golden.test.ts`(`ADDED_AFTER_GOLDEN`에 새 문구).

**Structure Decision**: 경계는 `previewDay`와 같다 — `wiring.ts`(신호 접근) → `app/`(좌표 변환) → `ui/`(모델만). 새 화면 부품은 하나이고 지면 끝에 붙는다.

## Complexity Tracking

위반 없음.

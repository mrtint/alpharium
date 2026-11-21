# Implementation Plan: 일기가 하루의 장소를 더 풍부하게 말한다

**Branch**: `121-richer-day-places` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/121-richer-day-places/spec.md`

## Summary

사진 좌표로 묶은 자리 목록(`visits`)을 신호에 더하고, 앱에 넣은 OpenStreetMap 한국 장소 데이터에서 자리마다 장소명을 기기 안에서 고른다. 일기 기록에는 이름이 다른 자리 최대 세 곳을 때와 함께 「~근처에서 찍혔어요」로 싣고, 저장 일기에 자리 목록을 남긴다. OS 역지오코딩·`expo-location`·위치 권한을 걷고, 설정을 켬/끔으로 줄이며, 방침·지원·스토어 선언·라이선스를 고친다.

## Technical Context

**Language/Version**: TypeScript 5 (Expo SDK 57, RN 0.86, Hermes)

**Primary Dependencies**: `expo-asset`(직접 의존성으로 올림, 이미 링크됨), `expo-file-system`(동기 읽기). 제거: `expo-location`. 데이터 만들기: 저장소 밖 `osmium-tool`(Homebrew).

**Storage**: 번들 자산 `assets/places/kr-places.bin`(읽기 전용), 일기 JSON에 `places` 옵셔널 필드, 장소 이름 설정 파일(기존 `geocoding-setting-store.ts`의 경로 그대로).

**Testing**: jest `logic`(`.ts`)·`ui`(`.tsx`), 소스 계약 테스트, 실기기 dev 빌드.

**Target Platform**: Android(SM-S901N)·iOS(iPhone 14, iOS 27).

**Project Type**: mobile-app

**Performance Goals**: 한 일기의 이름 찾기 전체(첫 읽기·색인 포함) < 1초(SC-007).

**Constraints**: 오프라인 동작, 좌표 바깥 전송 0, 데이터 ≤ 10MB, `File` 비동기 호출 금지.

**Scale/Scope**: 장소 약 22만 곳, 하루 자리 수는 사진 상한(8장 캡션, 좌표는 그날 본 사진 전부)에 묶인다.

## Constitution Check

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 통과 — 이름 찾기도 기기 안. 원격 호출을 오히려 걷는다 |
| II 화자·시야 | 통과 — 「사진이 ~근처에서 찍혔다」까지만 사실, 「근처」 짐작, 이름 없으면 「이름을 모르는 곳」 |
| III 캐릭터 | 무관 — 모델·로스터 불변 |
| IV 측정 장치 | 통과 — 대조표는 결정적 조회 시험이지 모델 출력 채점이 아니다 |
| V 사실/추측 | 통과 — 거리·때 구간은 사람이 정한 값으로 표시, 데이터 실패는 `unknown`, 새 문장은 v5 미측정 표시, 실기기 확인 필수 |
| 사진과 시각 처리 | 무관 |
| 개발 방식 | TDD·한국어 커밋·기능 브랜치 |

재확인(Phase 1 후): 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/121-richer-day-places/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── place-index.md
│   └── diary-places.md
└── tasks.md
```

### Source Code (repository root)

```text
scripts/places/
├── build-place-index.mts     # osmium 출력 → kr-places.bin·meta.json
├── categorize.ts             # 태그 → 범주 (순수)
├── simplify.ts               # Douglas–Peucker (순수)
└── pack.ts                   # 이진 묶기 (순수)
assets/places/
├── kr-places.bin
└── kr-places.meta.json
src/signals/
├── types.ts                  # PlaceVisit, PhotoPlaces.visits
├── places.ts                 # tracePlaces가 visits를 낸다
├── place-index.ts            # 이진 파싱·격자 색인 (순수)
├── place-names.ts            # choosePlaceName·placeNamer (순수 + 포트 주입)
├── place-index-port.ts       # expo-asset + File.bytesSync (기기)
└── geocoding-port.ts         # 삭제
src/diary/
├── place-lines.ts            # NamedVisit[] → PromptPlaces·SavedPlace[] (순수)
├── pipeline.ts               # 4c 교체
├── prompt.ts                 # 장소 줄 교체
└── types.ts                  # DiaryRequest.places, DiaryEntry.places
src/app/ geocoding-setting-store.ts · resolve-generation.ts · wiring.ts · permission-tags.ts
src/onboarding/ requirements.ts · location-permission-port.ts(삭제)
src/ui/ PlaceNameDialog.tsx · OnboardingScreen.tsx · SettingsScreen.tsx · use-permission-tags.ts
src/i18n/catalogs/ko/settings.ts (+ 골든 표)
App.tsx · app.json · package.json · metro.config.js
site/privacy · site/support · site/licenses · docs/store/privacy-declarations.md · __tests__/privacy/outbound.ts
```

**Structure Decision**: 기존 `signals/`(기기에 닿는 포트·순수 계산)과 `diary/`(프롬프트·저장) 경계를 따른다. 데이터 만들기는 `scripts/places/`, 결과는 `assets/places/`.

## Complexity Tracking

없음.

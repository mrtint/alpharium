# Implementation Plan: 쓴 날의 두 뷰 — 사진 자리에서 지도로 뒤집기

**Branch**: `135-diary-route-views` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

## Summary

쓴 날 캐러셀 사진 위 우측 하단에 지도 아이콘을 두고, 누르면 같은 자리(폭 그대로·높이 210)가 126 지도 면으로 바뀐다. 지도 면 우측 하단 갤러리 아이콘이 사진 면으로 되돌린다. 지도 점을 누르면 지도 안에 폴라로이드 카드(그 자리 사진 최대 3장 겹침·「번호 · 이름 · 때」)가 뜨고, 카드를 누르면 기존 `PhotoViewer`가 그 사진만으로 열린다. 자리↔사진 연결은 쓸 때 `entry.photos[j].placeIndex`(자리 순번 또는 `null`)로 저장한다 — 자리 묶기(`tracePlaces`)가 자리마다 묶인 사진 식별자를 내게 한다.

## Technical Context

**Language/Version**: TypeScript 5 · React Native 0.86 · Expo SDK 57
**Primary Dependencies**: react-native-reanimated(크로스페이드), react-native-reanimated-carousel(기존), react-native-svg(126 지도, 기존). 새 의존성 없음.
**Storage**: 일기 JSON 파일(`diary/store.ts`) — `photos[]` 항목에 선택 필드 하나.
**Testing**: jest `logic`(.ts)·`ui`(.tsx, RNTL 14), 헌법 검사, iOS 시뮬레이터(모양)·실기기 dev 빌드(동작).
**Target Platform**: iOS 27·Android 16 실기기
**Project Type**: mobile app (단일 프로젝트)
**Performance Goals**: 전환 한 번 누름에 다음 프레임 반응(새 측정 장치 없음 — 원칙 IV)
**Constraints**: 새 권한·네트워크 없음. 위경도는 `app/day-route.ts` 밖으로 나가지 않는다(126 MP·DU 규칙). `src/ui/`는 `src/map/`·`signals`·`models/roster`를 import하지 않는다.
**Scale/Scope**: 하루 사진 최대 8장·자리 최대 12곳 표시.

## Constitution Check

- **I 온디바이스**: 추론·네트워크 변화 없음. ✅
- **II 화자·프롬프트**: 프롬프트·일기 글 변화 없음 — `placeIndex`는 프롬프트에 들어가지 않는다. ✅
- **III 캐릭터·로스터**: 무관. ✅
- **IV 측정 장치 금지**: 소요 시간·통계 없음. 카드의 「+N」은 사진 수 표시이지 지표가 아니다. ✅
- **V 관측과 추측**: 옛 일기는 `placeIndex`가 없어 짐작해 붙이지 않고 「남아 있지 않아요」를 보인다. 좌표 없는 사진은 `null`(관측된 「자리 없음」)과 `undefined`(옛 일기, 모름)를 가른다. ✅

게이트 통과. 설계 후 재확인: 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/135-diary-route-views/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/written-route.md
└── tasks.md
```

### Source Code (repository root)

```text
src/signals/places.ts        TimedCoordinate.photoId, PlaceVisit.photoIds (묶은 사진 식별자)
src/signals/types.ts         PlaceVisit 타입에 photoIds
src/signals/collect.ts       points에 photo.id 싣기
src/diary/types.ts           photos[] 항목 placeIndex?: number | null
src/diary/place-lines.ts     placeIndexOf(visits, photoId) — 순수
src/diary/pipeline.ts        저장 직전 usedPhotos에 placeIndex 붙이기
src/app/route-photos.ts      (새) 점 번호들 → 카드 내용(photos / none / unlinked) — 순수
src/ui/RouteCanvas.tsx       (새) DayRouteSection의 지도·선·점·라벨 그리기를 떼어 냄 + 점 누름·강조
src/ui/DayRouteSection.tsx   RouteCanvas를 쓴다(겉모양 그대로)
src/ui/RouteFace.tsx         (새) 지도 면: RouteCanvas + 폴라로이드 카드 + 갤러리 아이콘 + 확대 뷰어
src/ui/PhotoCarousel.tsx     onShowMap? → 우측 하단 지도 아이콘
src/ui/WrittenDayPaper.tsx   면 상태(사진/지도, 날짜 키), 크로스페이드, 지도 면 날에는 DayRouteSection 숨김
src/i18n/catalogs/ko/…       새 문구(아이콘 라벨·카드·빈 카드)
__tests__/…                  logic·ui 테스트, 문구 골든 ADDED_AFTER_GOLDEN
```

**Structure Decision**: 기존 단일 앱 구조. 판정은 `src/app/`(순수), 그리기는 `src/ui/`.

## Complexity Tracking

없음.

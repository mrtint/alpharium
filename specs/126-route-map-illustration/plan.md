# Implementation Plan: 하루 동선 도식의 일러스트풍 지도

**Branch**: `126-route-map-illustration` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: `specs/126-route-map-illustration/spec.md` (설계: `docs/superpowers/specs/2026-11-22-route-map-illustration-design.md`)

## Summary

**일기를 쓸 때 자리마다 좌표(1e-5도 정수)를 일기에 저장하고(스냅샷, 소유자 결정 2026-11-22)** 한국 OSM에서 뽑은 도로·철도·강·물·공원 윤곽을 격자 칸으로 나눠 담은 번들 파일 `assets/map/kr-map.bin`(약 9MB)을 새로 싣고, 쓴 날 지면의 「하루 동선」 도식 뒤에 `react-native-svg`로 일러스트풍 색 면·선으로 깐다. 좌표 경계는 그대로다 — `app/day-route.ts`가 저장된 좌표(옛 일기는 다시 읽은 사진 좌표)로 상자를 정하고(최소 폭 600m로 한 곳·몰린 날도 포함), 순수 모듈 `src/map/`이 그 상자가 닿는 칸만 읽어 0~1000 상자의 **상대 경로 문자열**로 바꿔 화면에 준다. 화면은 위경도를 모른다. 지도를 못 읽으면 125의 도식 그대로다. 외부 요청·새 권한 없음. 새 저장 값은 `entry.places`의 좌표 둘뿐이다.

## Technical Context

**Language/Version**: TypeScript(strict), React Native 0.86.3 + Expo SDK 57, Hermes. 빌드 스크립트는 Node(`.mts`)

**Primary Dependencies**: **새로 `react-native-svg` 15.15.4**(Expo SDK 57의 `bundledNativeModules.json` 값, `npx expo install`) — 네이티브 모듈이라 prebuild·개발 빌드 재설치가 든다. 그 밖에는 기존 `expo-asset`·`expo-file-system`(`File.bytesSync`), 빌드 스크립트는 `osmium`(이미 설치)

**Storage**: 번들 자산 `assets/map/kr-map.bin`(읽기 전용)과 기록 `kr-map.meta.json`. **일기 파일의 `entry.places` 각 자리에 `latE5`·`lonE5`(정수)를 더한다**(FR-008, 옛 일기에는 없다). 지도 결과는 저장하지 않는다

**Testing**: jest 두 프로젝트(`logic` `.ts`·`ui` `.tsx`), 소스 계약 `__tests__/config/`, 번들 자산 계약 `__tests__/map/`. 실기기는 SM-S901N(dev)·iPhone 14

**Target Platform**: iOS(iPhone)·Android

**Project Type**: mobile-app (Expo/React Native)

**Performance Goals**: 쓴 날 지면은 지도를 기다리지 않는다(FR-009). 칸 해석은 상자가 닿는 칸 + 상세 정도에 필요한 층만 한다. 목표값은 **측정으로 정한다** — research R3의 측정 항목

**Constraints**: 외부 요청 0·새 권한 0·화면이 위경도를 받지 못함·번들 `kr-map.bin` ≤ 상한(plan 측정 뒤 `MAP_MAX_BYTES`, 목표 약 9MB)·글꼴 2.0배에서 첫 화면 본문 노출 불변·색은 토큰만

**Scale/Scope**: 새 소스 파일 약 8개(`src/map/map-file.ts`·`render.ts`·`src/app/day-map.ts`·`src/map/map-port.ts`·`src/ui/RouteMapLayer.tsx`·`scripts/map/build-map.mts`·`pack.ts`·`simplify.ts`), 고치는 소스 약 11개(`src/diary/types.ts`·`place-lines.ts`·`site/privacy/index.html`·`day-route.ts`·`DayRouteSection.tsx`·`wiring.ts`·`App.tsx`·`ko/home.ts`·`design/tokens.json`+생성물·`package.json`·`scripts/constitution-rules.ts`), 새 테스트 약 8개, 문서(`AGENTS.md`·방침 근거 확인·라이선스 문구 확인)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 지도는 번들 자산이다. 외부 요청·타일 0건. 소스 계약이 `fetch`·지도 라이브러리를 막는다. 좌표는 기기 안 일기에 저장되고 OS 백업에 포함될 수 있다 — 방침 보강(FR-018) |
| II 화자의 좁은 시야 | 통과 | 지도는 일기 글을 만들지 않고 프롬프트에 닿지 않는다 |
| III 내부 사양 비노출 | 통과 | 화면에 모델·파일 이름이 없다 |
| IV 측정 장치 금지 | 통과 | 용량·해석 시간 측정은 plan/quickstart의 일회성 확인이고 제품 코드에 측정·채점이 없다 |
| V 관측과 추측 | **핵심** | 지도는 사실(OSM)만 그린다. 저장되는 좌표는 사진 EXIF에서 **읽은 값**이고 못 읽은 날은 필드가 없다(채우지 않는다). 옛 일기 좌표를 열 때 고쳐 쓰지 않는다. 읽지 못했거나 그릴 것이 없거나 한국 밖이면 지도를 채우지 않고 125 도식으로 물러난다(FR-007). 상세 정도 문턱·최소 폭·선 굵기는 「사람이 정한 값」이라고 코드와 문서에 적는다 |
| 경계 | 통과 | 화면은 신호·좌표를 모른다(DB2). `src/map/`은 순수(기기·파일 없음), 기기에 닿는 건 `map-port.ts` 하나. `src/ui/`는 `src/map/`에 닿지 못한다(헌법 검사 규칙 추가) |
| 화면 한글 | 통과 | 새 한글은 `src/i18n/catalogs/ko/home.ts`에만 |
| 기기 불필요 테스트 | 통과 | 지도 파일은 실제 자산으로 계약 테스트(10MB 규칙과 같은 방식) |

Phase 1 설계 뒤 다시 확인: 변화 없음(통과). 새 네이티브 의존성은 헌법 위반이 아니나 **개발 빌드 재설치가 든다**(「작업 습관」: 개발 빌드에서 확인하기 전에는 릴리스 금지).

## Project Structure

### Documentation (this feature)

```text
specs/126-route-map-illustration/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 형식·칸 크기·측정 항목·라이브러리·색
├── data-model.md        # Phase 1 — MapIndex·RouteMap·DayRoute 확장
├── quickstart.md        # Phase 1 — 빌드·검증·실기기 절차
├── contracts/
│   ├── map-file.md      # kr-map.bin 형식·빌드 계약 (MP1~)
│   └── day-map.md       # 상자·투영·화면·경계 계약 (DM1~), 125 계약과의 대체 목록
└── tasks.md             # /speckit-tasks 산출 (이 단계에서는 만들지 않는다)
```

### Source Code (repository root)

```text
assets/map/
├── kr-map.bin                 # 새 — 번들 지도 (≤ MAP_MAX_BYTES)
└── kr-map.meta.json           # 새 — 원본·크기·sha256·층별 크기·단순화 값

scripts/map/
├── build-map.mts              # 새 — osmium → 단순화 → 칸 나눔 → 팩 (유일한 만드는 길)
├── simplify.ts                # 새 — Douglas-Peucker·칸 경계 자르기(순수, 테스트됨)
└── pack.ts                    # 새 — 형식 상수는 src/map/map-file.ts에서 가져온다

src/map/                       # 새 폴더 — 순수(기기·파일·화면 없음)
├── map-file.ts                # 새 — 형식 상수·헤더·칸 목록·`parseMapFile(bytes)`·`readCell`
├── render.ts                  # 새 — 상자(위경도 범위)·상세 정도 → 상대 경로 문자열(`MapLayers`)
└── map-port.ts                # 새 — 번들 자산 바이트를 얻는 기기 통로(expo-asset·File.bytesSync, 이 파일만 기기를 안다)

src/app/
├── day-route.ts               # 고침(저장된 좌표 우선, 옛 일기는 다시 읽기 폴백) — 최소 폭·한 곳/몰린 날 허용·`buildDayRoute(visits, saved, map)`·상자→칸 위임
├── day-map.ts                 # 새 — `RouteMap` 모양·상세 정도 문턱·선 굵기 단계(사람이 정한 값)
└── wiring.ts                  # 고침 — `routeDay`가 지도 포트를 준비·읽고 `DayRoute.map`을 채운다

src/ui/
├── label-placement.ts         # 새 — `labelPlacement` 순수 함수(R7)
├── DayRouteSection.tsx        # 고침 — `RouteMapLayer`를 도식 뒤에 깔고 라벨 배치·이름 없는 줄 처리
├── RouteMapLayer.tsx          # 새 — `react-native-svg`로 `RouteMap` 경로를 그린다(위경도 모름)
└── theme/tokens.ts            # 생성 — 지도 전용 색 5개

src/diary/
├── types.ts                   # 고침 — `SavedPlace`에 `latE5`·`lonE5`(옵셔널, 옛 일기는 없음)
└── place-lines.ts             # 고침 — `savedPlacesOf`가 방문 좌표를 1e-5도 정수로 담는다
site/privacy/index.html        # 고침 — 일기에 방문 위치가 담기고 백업에 포함될 수 있다는 서술
src/i18n/catalogs/ko/home.ts   # 고침 — 「이름을 모르는 곳」 제거, 낭독 문구
design/tokens.json             # 고침 — 지도 색 5개 + 대비 쌍
scripts/constitution-rules.ts  # 고침 — `src/ui`→`src/map` 금지·`src/map` 순수·`fetch` 금지 규칙
package.json / app.json        # 고침 — react-native-svg 의존성(플러그인 추가 없음)

__tests__/map/                 # 새 — 파일 계약·형식 왕복·칸 읽기·렌더·빌드 순수 부분
__tests__/app/day-route.test.ts · day-map.test.ts          # 고침/새 — 최소 폭·한 곳·몰림·지도 위임
__tests__/ui/day-route-section.test.tsx · route-map-layer.test.tsx   # 고침/새
__tests__/config/day-map-rules.test.ts · __tests__/design/*(토큰 동기·대비)
```

**Structure Decision**: 125의 `app/day-route.ts`(투영)·`ui/DayRouteSection.tsx`(그림) 분할을 유지하고, 지도 읽기·해석은 새 순수 폴더 `src/map/`로 둔다(`src/signals/place-index.ts`의 「순수 파일 + 기기 포트」 선례). 화면은 상대 경로 문자열과 굵기·색 단계만 받는다.

## Complexity Tracking

| 항목 | 이유 | 더 단순한 안을 안 쓴 까닭 |
| --- | --- | --- |
| 일기에 좌표 저장(스냅샷) | 사진을 지워도 지도가 남아야 한다(소유자 결정) | 다시 읽기는 사진 삭제·권한에 지도가 묶인다. 대가: 121 R9의 저장 금지를 뒤집고 백업에 좌표가 들어가 방침을 보강한다 |
| 새 네이티브 의존성 `react-native-svg` | 수천 개 선·면을 그려야 한다 | View 선은 요소 수천 개라 지면이 멈춘다(125가 View로 그린 까닭은 선이 몇 개뿐이어서였다) |
| 격자 칸 + 층별 블록 | 600m 상자는 칸 하나·골목까지, 37km 상자는 칸 여럿·주요 도로만 필요 — 9MB를 전부 해석하면 느리다 | 통짜 기하(파일 전체 해석)는 상세 정도를 가를 수 없다 |
| 칸 경계에서 선·면 자르기 | 칸을 겹쳐 읽지 않기 위해 | 겹침 허용은 인접 칸 조회·중복 그림이 든다 |

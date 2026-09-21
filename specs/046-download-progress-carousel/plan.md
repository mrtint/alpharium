# Implementation Plan: 다운로드 진행 화면(캐러셀 + 프로그레스 바) 완성

**Branch**: `046-download-progress-carousel` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/046-download-progress-carousel/spec.md`

## Summary

045가 만든 `DownloadProgressScreen`(온보딩 다운로드 동의 이후 화면)은 계약
(`resolveSlideStage`, `essentialDownloadFraction`)만 갖춰져 있고 실제 화면은
미완성이다 — 카드 전환이 4초 자동 타이머뿐이라 스와이프가 안 되고, 4분할
프로그레스 바가 실제 진행률과 무관하게 정적이며, 실패 시 전체 화면이 별도의
막다른 실패 화면으로 바뀐다. 이번 작업은 `react-native-reanimated-carousel`
(loop + autoPlay)을 도입해 무한 순환 캐러셀을 완성하고, 기존
`essentialDownloadFraction()` 값을 4분할 애니메이션 프로그레스 바로 반영하며,
실패를 별도 화면 전환 없이 같은 레이아웃 위 안내 문구 교체 + 자동 재시도로
처리한다. 동의 다이얼로그·다운로드 트리거 배선·단계 전이 판정은 무변경.

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict), React 19.2, React Native
0.86.2, Expo SDK ~57

**Primary Dependencies** (신규):
- `react-native-reanimated-carousel`(v5, `loop`+`autoPlay`+`autoPlayInterval`+
  `onSnapToItem` API로 무한 순환·자동 전환·현재 인덱스 추적)
- `react-native-gesture-handler`(위 라이브러리의 필수 peer dependency, 이
  프로젝트에 처음 도입되는 네이티브 링크 모듈)

**Primary Dependencies** (기존, 재사용): `react-native-reanimated`(4.5.1,
032에서 peer dep으로 이미 들어와 있으나 실사용 0건 — 이 작업이 첫 실사용),
`nativewind`(^4.2.6)

**Storage**: N/A — 진행률은 기존 029/041 다운로드 경로가 파일 기반으로 이미
관리, 화면은 콜백으로 받은 fraction만 소비(신규 저장 없음)

**Testing**: `npm run test:ui`(jest-expo, `.tsx` 화면), `npm run test:logic`
(순수 함수), `npm run lint`(eslint+tsc+헌법 검사+prettier), 최소 1회 dev
debug 실기기 검증(신규 네이티브 링크 모듈 도입이므로 AGENTS.md 기준 필수)

**Target Platform**: Android 실기기(dev debug 빌드), Expo SDK 57 + RN 0.86

**Project Type**: Mobile app(Expo/React Native, 단일 프로젝트 구조)

**Performance Goals**: 특정 수치 목표 없음 — 캐러셀 전환·프로그레스 바
애니메이션이 60fps 대에서 끊김 없이 보이면 충분(reanimated UI 스레드 애니메이션
표준 기대치)

**Constraints**: 헌법 원칙 IV 경계(모델 식별자·바이트·전송 속도·정밀 시간
미노출, fraction 비율만 노출) 준수. `essentialDownloadFraction()`(029)·
`resolveFirstRunStage()`(045) 시그니처·우선순위 불변. `downloadProceedConfirmed`
게이트(045) 유지.

**Scale/Scope**: 화면 1개(`DownloadProgressScreen.tsx`) 재작성 + 순수 판정
모듈(`src/firstrun/consent.ts`) 확장 + `App.tsx`의 실패/재시도 배선 소폭 수정.
새 화면·새 저장 계층 없음.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 I(온디바이스가 제품이다)**: 해당 없음 — 이 기능은 추론 경로를
  건드리지 않는다. **PASS**.
- **원칙 II(화자는 휴대폰이고 시야는 좁다)**: 해당 없음 — 프롬프트·일기
  생성과 무관. **PASS**.
- **원칙 III(캐릭터는 모델 위에 선다)**: 다운로드 대상(VLM v1/v2, 캐릭터
  모델 a1)의 식별자·용량은 화면에 노출하지 않는다(기존 029/045 계약 유지,
  변경 없음). **PASS**.
- **원칙 IV(측정 장치를 제품에 들이지 않는다)**: 2.0.0 개정으로 "사용자의
  기다림을 덜고 상황을 친절히 안내하기 위한 진행 인디케이터·다운로드 상태
  표시"는 명시적으로 금지 대상이 아니다. 이번 기능은 정확히 그 경계 안에
  있다 — 노출하는 것은 fraction(0~1) 하나의 시각적 표현(4분할 채움
  애니메이션)뿐이고, 모델 식별자·바이트·전송 속도·정밀 잔여 시간은 여전히
  화면에 없다(FR-014). **PASS**.
- **원칙 V(관측된 사실과 추측을 구분해 기록한다)**: 해당 없음 — 신호 수집과
  무관. **PASS**.
- **로스터/사진과 시각 처리**: 해당 없음.
- **개발 방식**: 계약(스펙) 먼저 정함(본 스펙), 커밋 한국어, `main` 직접
  작업 금지 — `046-download-progress-carousel` 브랜치에서 작업 중. **PASS**.

**Initial Gate Result**: PASS. 위반 없음, Complexity Tracking 불필요.

**Post-Design Gate Result** (Phase 1 완료 후 재평가): PASS, 변경 없음.
`research.md`·`data-model.md`·`contracts/download-progress-carousel.md`
전부 fraction(0~1) 하나만 다루고 모델 식별자·바이트·속도를 어디서도
새로 노출하지 않는다(D1~D9 계약이 이를 명시적으로 잠근다). 신규 의존성
(`react-native-reanimated-carousel`, `react-native-gesture-handler`)은
UI 라이브러리일 뿐 원칙 I(온디바이스 추론)·원칙 III(캐릭터 로스터)와
무관하다.

## Project Structure

### Documentation (this feature)

```text
specs/046-download-progress-carousel/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── firstrun/
│   └── consent.ts           # 기존 파일 확장 — 슬라이드 인덱스 판정에
│                             # 캐러셀 현재 인덱스(사용자 스와이프 반영)를
│                             # 함께 다루도록. 4분할 fraction 매핑 순수 함수
│                             # 신규 추가(progressSegments() 등, 파일명은
│                             # Phase 1에서 확정).
├── ui/
│   └── DownloadProgressScreen.tsx  # 전면 재작성 — Carousel 통합, 4분할
│                             # 애니메이션 프로그레스 바, 실패 문구를 진행
│                             # 바 하단에 배치. 기존 download-progress-failed
│                             # 전용 뷰·onRetry prop 제거.
App.tsx                      # 다운로드 실패 처리 배선 재검토 — 사용자 재시도
                              # 콜백 대신 자동 재시도 루프(10초 간격)로 교체.
                              # GestureHandlerRootView 배선 필요 여부 확인.

__tests__/
├── firstrun/
│   └── consent.test.ts      # 4분할 매핑·캐러셀 인덱스 순수 함수 테스트 확장
└── ui/
    └── download-progress-screen.test.tsx  # 화면 재작성에 맞춰 갱신(실패
                              # 뷰 관련 기존 케이스 제거/교체)
```

**Structure Decision**: 기존 저장소 구조(`src/firstrun/`=순수 판정,
`src/ui/`=화면, `App.tsx`=조립)를 그대로 따른다. 새 디렉터리·새 저장 계층을
만들지 않는다. 신규 의존성(`react-native-reanimated-carousel`,
`react-native-gesture-handler`)은 `package.json`에 추가하고 `npx expo
prebuild --platform android --clean`으로 반영한다.

## Complexity Tracking

*No violations — table omitted.*

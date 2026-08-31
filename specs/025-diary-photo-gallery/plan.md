# Implementation Plan: 일기 본문 사진 슬라이드 및 갤러리 뷰

**Branch**: `025-diary-photo-gallery` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/025-diary-photo-gallery/spec.md`

## Summary

017이 일기 상세 화면 본문에 그린 정적 96×96 썸네일 격자(`flexWrap`)를 **가로
페이징 슬라이더 + 풀스크린 갤러리 모달**로 교체한다. 저장된
`DiaryEntry.photos[]`(017의 `{ photoId, takenAt, resizedPath }`)를 읽기 전용으로
소비하며 새 신호·새 저장 필드·새 네이티브 모듈을 만들지 않는다.

기술 접근(research.md): React Native 코어 `ScrollView`(`horizontal` +
`pagingEnabled` + `disableIntervalMomentum`)로 슬라이더를, 코어 `Modal`
(`onRequestClose`로 안드로이드 뒤로 가기)로 풀스크린 갤러리를 만든다. 갤러리
표시 상태(`{ open, index }`)는 `DiaryDetailScreen`의 `useState` — 같은 Activity
안 회전·백그라운드에서 React state가 유지되므로 Clarifications Q5가 추가 코드
없이 성립한다. 새 의존성이 없으므로 release 재확인 불필요(012 기준), debug
실기기 1회로 검증한다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19.2.3, React Native 0.86.2 (Expo SDK ~57)

**Primary Dependencies**: `react-native` 코어만 — `ScrollView`, `Modal`,
`Image`, `Pressable`, `Text`, `View`, `useWindowDimensions`(또는 `onLayout`).
**새 의존성 추가 없음**(research.md 결정 1·2).

**Storage**: N/A — 저장된 `DiaryEntry.photos[]`를 읽기만 한다. 갤러리 표시
상태는 화면 로컬(파일에 안 남김).

**Testing**: Jest (`test:ui` 프로젝트, `jest-expo` preset) + `@testing-library/
react-native` for 화면 테스트; Maestro(`.maestro/`, `run-device-tests.mjs`
`FLOWS` 등록)로 실기기 검증. `test:logic`은 이 기능에 해당 없음(순수 UI).

**Target Platform**: Android (실기기 SM-S901N 기준), dev·prod 빌드 공통.

**Project Type**: 모바일 앱 (단일 Expo 프로젝트, `src/ui/` 화면 계층).

**Performance Goals**: 슬라이더 스와이프가 한 장씩 스냅되고 위치 표시가
`onMomentumScrollEnd` 시점에 정확히 갱신된다. 프레임률 목표를 수치로 세우지
않는다 — ≤8장(023 `VISION_PHOTO_LIMIT`) 규모라 코어 페이징으로 충분(research.md
결정 1).

**Constraints**:
- 새 네이티브 모듈·빌드 설정을 건드리지 않는다(→ release 재확인 불필요, 012).
- `src/ui/` 밖(`diary/`·`vision/`·`signals/`·`models/`·`inference/`)을 수정하지
  않는다.
- 생성 진행 중 화면(`screen.kind === "writing"`)에 이 기능의 어떤 요소도
  닿지 않는다(FR-017, 원칙 I).
- 모델 식별자·속도·토큰 미노출(FR-018, 원칙 III·IV) — 새로 들어오는 것은 사진
  이미지와 `"N / M"` 순번뿐.

**Scale/Scope**: 화면 1개 수정(`DiaryDetailScreen.tsx`), 새 컴포넌트 1~2개
(`PhotoSlider`, `PhotoGalleryModal` — 같은 파일 또는 인접 파일), 화면 테스트
1개 파일 확장(`__tests__/ui/diary-detail.test.tsx` 또는 신규
`photo-gallery.test.tsx`), Maestro 흐름 1개 신규.

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 이후 재확인.*

| 원칙 | 관련성 | 통과 근거 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | 낮음 | 추론 경로를 건드리지 않는다. 생성 중 화면 미노출 방어(FR-017)는 이 기능이 `detail`/`written` 상태에만 렌더되므로 성립 |
| **II. 화자는 휴대폰, 시야는 좁다** | 없음 | 프롬프트·일기 텍스트를 건드리지 않는다. `src/diary/prompt.ts` 무수정 |
| **III. 모델은 캐릭터다** | 중간 | 이 화면에 모델 식별자·파라미터가 새로 등장하지 않는다(FR-018). `"2 / 3"`은 사진 순번이지 지표가 아니다. 017 S4 경계 유지 |
| **IV. 측정 장치를 들이지 않는다** | 중간 | 점수·비교·채점 코드 없음. 생성 속도·토큰 미노출(FR-018). `llama-port.ts` 경계 무관(이 기능이 안 건드림) |
| **V. 관측과 추측을 구분** | 없음 | 신호 값을 건드리지 않는다. `signalsUsed` 렌더는 017 그대로 |
| **로스터** | 없음 | 캐릭터→모델 매핑 무관 |
| **사진과 시각 처리** | 낮음 | 시각 설정(`none`/`quick`/`detailed`)을 건드리지 않는다. 사진 **표시** 방식만 바꾼다 |
| **개발 방식** | 해당 | 계약 먼저·테스트 먼저(아래 Phase 1 contracts), 커밋 메시지 한국어, `main` 직접 작업 금지(브랜치 `025-diary-photo-gallery` 확인). 한 축 과도 파고들기 경계 — 이 기능은 `src/ui/` 하나에 국한 |

**게이트 결과**: 위반 없음. `src/ui/` 안에서 완결되는 순수 표시 기능이며 017이
세운 경계를 잇는다. 새 헌법 검사 규칙이 필요하지 않다(research.md 결정 5).

**Complexity Tracking**: 해당 없음 (위반 없음).

## Project Structure

### Documentation (this feature)

```text
specs/025-diary-photo-gallery/
├── plan.md              # 이 파일
├── spec.md              # 완료 (/speckit-specify, /speckit-clarify)
├── research.md          # 완료 (Phase 0)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── photo-gallery.md  # Phase 1 — 화면 UI 계약
├── checklists/
│   └── requirements.md  # 완료 (/speckit-specify)
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/ui/
├── DiaryDetailScreen.tsx      # 수정 — 격자 렌더(217-223, styles.photos/photo)를
│                              #   PhotoSlider로 교체. 갤러리 open/index useState 추가.
│                              #   photos.length > 0 && vision != none 조건은 017 그대로 유지
├── PhotoSlider.tsx            # 신규(또는 DiaryDetailScreen 내부 컴포넌트) —
│                              #   horizontal ScrollView + pagingEnabled, "N / M" 표시,
│                              #   각 장 Pressable(탭 → onOpen(index)), 사본 실패 시
│                              #   "이 사진은 이제 없다"(017 DiaryPhoto 재사용/이관)
└── PhotoGalleryModal.tsx      # 신규 — Modal(onRequestClose) + 같은 ScrollView 페이저,
                               #   초기 스크롤 위치 = 탭한 index, "N / M" 표시,
                               #   닫기 버튼, 끝에서 멈춤(순환 없음)

__tests__/ui/
└── photo-gallery.test.tsx     # 신규 — 슬라이더/갤러리 화면 테스트
                               #   (또는 diary-detail.test.tsx의 017 describe 확장)

.maestro/
└── diary-photo-gallery.yml    # 신규 — 실기기 흐름. run-device-tests.mjs FLOWS에 등록

scripts/run-device-tests.mjs   # 수정 — FLOWS 배열에 diary-photo-gallery 추가
```

**Structure Decision**: 단일 Expo 프로젝트. 이 기능은 `src/ui/` 화면 계층
안에서 완결된다. `DiaryDetailScreen.tsx`의 사진 렌더 블록을 교체하고, 페이징
로직을 `PhotoSlider`/`PhotoGalleryModal` 컴포넌트로 분리한다(같은 페이저 로직을
두 곳이 공유하므로 작은 헬퍼로 뽑을 수 있으나, 인라인 중복이 더 읽기 쉬우면
그대로 둔다 — 규모가 작다). 017의 `DiaryPhoto`(사본 실패 → "이제 없다") 로직은
슬라이더·갤러리 양쪽이 재사용한다.

## Phase 0: Outline & Research

**완료** — [research.md](./research.md).

결정 요약:
1. 가로 페이징 = 코어 `ScrollView` `pagingEnabled` (+ `disableIntervalMomentum`). 새 의존성 없음.
2. 풀스크린 = 코어 `Modal` (`onRequestClose`로 안드로이드 뒤로 가기). 상세 화면은 언마운트 안 됨 → 스크롤 위치 자동 보존.
3. 위치 표시 = `"N / M"` 텍스트 (Maestro 문자열 검증 가능, FR-018 준수).
4. 데이터 = `DiaryEntry.photos[]` 읽기 전용 소비. 갤러리 상태는 화면 로컬 `useState`.
5. 헌법 경계 = `src/ui/` 안에서 완결. 새 검사 규칙 불필요.

NEEDS CLARIFICATION 잔여: 없음.

## Phase 1: Design & Contracts

**산출물**: data-model.md, contracts/photo-gallery.md, quickstart.md

1. **data-model.md** — `DiaryEntry.photos[]`(기존, 017) 소비 구조 + 화면 로컬
   `GalleryState`(`{ open: boolean; index: number }`, 저장 안 함) 명세.
2. **contracts/photo-gallery.md** — 화면 UI 계약 (C1~C29 + C18a):
   - `PhotoSlider` props: `photos`, `onOpen(index)` / 렌더 규칙(1장 폭, 페이징,
     `"N / M"`, `resizeMode="contain"`, 사본 실패 대체, 0장·옛 일기 시 미렌더)
   - `PhotoGalleryModal` props: `photos`, `initialIndex`, `visible`, `onClose` /
     동작 규칙(초기 위치 = `initialIndex`, `layoutWidth > 0`일 때만 `scrollTo`,
     끝에서 멈춤, `"N / M"` 갱신, `onRequestClose`·닫기 버튼, 사본 실패 대체,
     부모 리렌더 시 상태 유지 — C18a, FR-015a)
   - `DiaryDetailScreen` 변경 계약: 격자 → 슬라이더 교체, 갤러리 `useState`
     (US1에서 배선), `detail`/`written` 상태에서만 렌더(FR-017), `testID` 목록
   - 회귀 불변식(017): 0장 "사진: 없었다" / 옛 일기 미렌더 / 사본 실패 "이제
     없다" — 이 기능이 깨지 않는다
3. **quickstart.md** — 검증 시나리오(기기 없는 테스트 + Maestro 실기기).

Phase 1 이후 Constitution Check 재확인: 아래.

### Post-Design Constitution Re-Check

Phase 1 설계는 Phase 0 결정을 그대로 구체화하며 새 위반을 만들지 않는다:
- 컴포넌트 3개 모두 `src/ui/` 안. `diary/`·`vision/` import 없음.
- `PhotoGalleryModal`의 `"N / M"` 표시는 FR-018 확인 완료(순번, 지표 아님).
- `Modal`은 RN 코어 — 네이티브 추가 없음, release 재확인 불필요(012).
- 갤러리 `useState`는 파일 저장 안 함 — 009 선례(UI 상태 미보존)와 일치.

**재확인 결과**: 통과. Complexity Tracking 항목 없음.

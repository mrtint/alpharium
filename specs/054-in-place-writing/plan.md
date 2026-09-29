# Implementation Plan: 제자리 쓰기 — 쓰는 동안 홈을 떠나지 않는다

**Branch**: `054-in-place-writing` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/054-in-place-writing/spec.md`

## Summary

지금 별도 전체 화면인 쓰는 중(`AppScreen`의 `writing`)을 보드 `2b`대로 **홈 안의 상태**로 바꾼다. `DiaryListScreen`이 「쓰는 중」
모드를 받아 헤더 상태 줄을 빨간 「쓰는 중」으로, 스트립을 35% 불투명도·누름 없음으로, 지면 자리를 혼잣말 영역으로, 하단 바를 검정
「그만두기」로 그린다. 그만두기·실패는 모두 쓰기 전 상태의 홈(`list`)으로 돌아가고, 실패는 하단 바 위 12에서 올라오는 **토스트 한 줄**로
알린다(보드 `2i`). 임시 결과 화면(`unsaved`)은 없어지고 저장 실패도 토스트다(clarify Q3).

세 갈래로 나눠 만든다.

1. **판정(순수, `src/app`)** — 실패 하나를 토스트 갈래(다시 쓰면 풀림 / 캐릭터 준비 / 사진 준비 / 일반 / 저장 실패)로 옮기는 표
   (`failure-toast.ts`)와, 「스와이프로 닫는가」 문턱 판정. 문구·갈래는 사람이 못 박은 상수이며 코드가 이유 문자열을 재서 정하지 않는다.
2. **부품(`src/ui`)** — `WritingPaper`(혼잣말 페이드 교체 + 안내 줄), `StopBar`, `FailureToast`(슬라이드·쓸어 닫기·3초), 공용 `FadeLayer`(049에서
   `DiaryListScreen` 안에 있던 것을 꺼낸다).
3. **조립(`DiaryHomeScreen`)** — 쓰기를 시작할 때 들고 있던 목록 요약을 화면 로컬 state로 들고(`AppScreen`의 `writing`은 그대로), 끝나면 `list`로 돌아가며, 토스트 상태와 혼잣말 간격 타이머를 화면 로컬로 든다.

생성 파이프라인·프롬프트·판정 갈래·저장 시점은 무변경이다(FR-023). 새 의존성·새 네이티브 모듈 없음.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), React 19.2, React Native 0.86.2(새 아키텍처), Expo SDK 57

**Primary Dependencies**: 기존만 — `react-native-reanimated` 4.x(페이드·슬라이드), `react-native-gesture-handler` v2.29(토스트 쓸어 닫기, 049 `DayPicker`와
같은 `Gesture.Pan().runOnJS(true)`). **새 의존성 0.**

**Storage**: 없음. 쓰는 중·토스트 상태는 화면 로컬이며 파일에 남기지 않는다(FR-012).

**Testing**: jest 29 두 프로젝트(`logic` `.ts` — 판정 / `ui` `.tsx` — 배선·KO 원문), RNTL 14(`render`·`fireEvent` await), Maestro(실기기).
**jest는 움직임(페이드·슬라이드·쓸어 닫기)을 못 잡는다** — reanimated 목이 값을 계산하지 않고 RNGH 핸들러 태그가 테스트 사이에서 섞인다(033·049). 그래서
배선 검증과 실기기 육안 검증을 나눈다(quickstart §1·§2).

**Target Platform**: Android(SM-S901N, Android 16), dev(debug) 빌드, `pm clear` 없음

**Project Type**: mobile-app (Expo, 단일 저장소)

**Performance Goals**: 없음. 혼잣말 교체 간격(4초)·토스트 수명(3초)은 사람이 정한 상수이지 측정값이 아니다.

**Constraints**: 새 의존성 0, 색은 `COLORS.*` 단일 출처(C5), 문구는 `home-text.ts`·`failure-toast.ts`(C4), 진행률·경과·글 조각 노출 0(FR-007), 이유·모델·
오류 코드 노출 0(FR-016·019), `pipeline.ts`·`prompt.ts` 무변경, 화면은 신호를 모른다

**Scale/Scope**: 새 파일 5(`src/app/failure-toast.ts`, `src/ui/WritingPaper.tsx`, `src/ui/FailureToast.tsx`, `src/ui/components/FadeLayer.tsx`,
`.maestro/in-place-writing.yml`) + 고치는 파일(`state.ts`·`DiaryHomeScreen.tsx`·`DiaryListScreen.tsx`·`home-text.ts`·`tokens.ts`·`monologue.ts` 호출부 무변경) +
Maestro 흐름 일곱 수리 + `run-device-tests.mjs` 등록. 정리: `TypewriterText`·`grapheme-slice`·`REVEAL`이 쓰는 곳 0이 되면 함께 지운다(044의 죽은 코드 교훈).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* (헌법 2.0.0)

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 생성 경로 무변경. 그만두기·실패 뒤 저장된 일기는 그대로(저장은 끝에만, `pipeline.ts`) — 거부된 글이 저장을 덮지 않는다. 토스트는 글을 싣지 않는다 |
| II 화자·시야 | 통과(무관) | 프롬프트·판정 무변경 |
| III 캐릭터·모델 | 통과 | 토스트·안내 줄에 모델 식별자·오류 코드 없음. 이름은 035 `displayNameOf` 결과만 받는다 |
| IV 측정 장치 | 통과 | 진행률 숫자·퍼센트·경과 시간 없음(FR-007). 혼잣말 간격·토스트 수명은 표시 상수이지 측정이 아니다. 사용자 UX 안내(진행 표시 유형)는 2.0.0이 허용하나 이 조각은 그것도 두지 않는다(보드) |
| V 관측/추측 구분 | 통과 | 실패 갈래 표는 **사람이 못 박은 상수**(012·021 선례)이고 코드가 문구를 보고 판정하지 않는다. 실기기 검증 필수(quickstart §2) — 건너뛴 것은 통과가 아니다 |

**게이트 결과**: 위반 없음. 헌법 개정 불필요. → Phase 0 진행.

## Project Structure

### Documentation (this feature)

```text
specs/054-in-place-writing/
├── plan.md              # This file
├── research.md          # Phase 0 — 결정 R1~R9
├── data-model.md        # Phase 1 — 화면 상태·토스트 상태
├── quickstart.md        # Phase 1 — jest / 실기기 / Maestro 검증
├── contracts/
│   ├── writing-in-place.md   # 쓰는 중 상태의 화면 계약(W1~)
│   └── failure-toast.md      # 토스트 갈래 표·문구·수명·제스처 계약(T1~)
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── state.ts            # unsaved 제거 · afterGeneration → 토스트 갈래 (writing·toWriting은 무변경 — S1 방어 유지)
│   └── failure-toast.ts    # (신규) PipelineResult → ToastKind, ToastKind → 문구, 쓸어 닫기 문턱 판정
├── ui/
│   ├── DiaryHomeScreen.tsx # writing 전체 화면 제거 · 토스트 상태 · 혼잣말 간격 타이머 · 그만두기
│   ├── DiaryListScreen.tsx # `writing` 모드(헤더·잠긴 스트립·WritingPaper·StopBar) · 토스트 자리
│   ├── WritingPaper.tsx    # (신규) 머리말·혼잣말(페이드 교체)·안내 줄
│   ├── FailureToast.tsx    # (신규) 슬라이드 인 · 3초 · 쓸어 닫기
│   ├── components/FadeLayer.tsx # (신규) DiaryListScreen에서 꺼낸 마운트 페이드 (049)
│   ├── home-text.ts        # WRITING_TEXT (보드 KO 원문)
│   └── theme/tokens.ts     # WRITING · TOAST 치수
__tests__/
├── app/failure-toast.test.ts
├── ui/writing-in-place.test.tsx · failure-toast.test.tsx
└── (수리) diary-home · writing-monologue* · unsaved 관련
.maestro/in-place-writing.yml + 일곱 흐름 수리
```

**Structure Decision**: 단일 모바일 앱. 판정은 `src/app`(순수), 부품은 `src/ui`, 조립은 `DiaryHomeScreen` — 048~053과 같은 자리 나눔.

## 핵심 설계 결정 (상세는 research.md)

- **R1**: `AppScreen`의 `writing`은 **무변경**(`toWriting()`은 여전히 인자가 없고 `{ kind: "writing" }`이 전부 — 007 S1·009 I7·012 C3가 잠근 원칙 I 방어). 쓰는 중에도 헤더·스트립을 그려야 하므로 화면이 생성 시작 때 들고 있던 `items`를 별도 state(`writingItems`)로 든다.
- **R2**: 쓰는 중 레이아웃은 쓴 날 여부와 무관하게 **안 쓴 날 레이아웃(헤더 안에 스트립)** 을 쓴다 — 접힘·지면 스크롤·「다시 쓰기」 바가 필요 없다. 052 접힘·끝 판정 상태는 쓰는 중 들어갈 때 비운다.
- **R3**: 그만두기·실패 복귀는 `toList(await refresh())` — 그만두기 우선(007 FR-014a)과 「끝난 뒤 저장이 이미 됐을 수 있는」 경계에서 화면이 저장된 사실과 어긋나지 않게 다시 읽는다.
- **R4**: 혼잣말은 4초 간격 + **단계 전환 즉시** 교체(문안이 지금 하는 일에 근거, 039). 페이드는 049의 겹마다-마운트 방식.
- **R5**: 실패 갈래는 `failure-toast.ts` 표 하나. `no-ready-character`(쓰기 전)는 범위 밖이라 `failed` 화면과 설정 버튼을 그대로 둔다(FR-024).
- **R6**: 토스트는 `DiaryListScreen`의 ROOT 안 절대 배치, 바닥 = **하단 바의 잰 높이 + 12**(바가 내려가 있어도 자리 기준).

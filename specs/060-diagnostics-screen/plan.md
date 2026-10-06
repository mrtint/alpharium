# Implementation Plan: 진단 화면 개편 — 보드 6h의 일곱 묶음

**Branch**: `060-diagnostics-screen` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/060-diagnostics-screen/spec.md`

## Summary

`DiagnosticsScreen`을 055 설정 틀 부품(`Group`·`Row`·`Value`)으로 보드 `6h`의 일곱 묶음(환경 / 저장 점검 / 사진 권한 / 신호 프로브 · 오늘 / 입력 프롬프트 미리보기 / 생성 / 최근 실패)으로
다시 그린다. 옛 `PermissionPanel`·`SignalProbe`·`PromptPreviewPanel`·`GenerationProbe`·`AutoDiaryTriggerButton`은 새 모양의 부품으로 교체한다. 화면은 값과 핸들러를 주입받고
`expo-*`·파이프라인을 직접 부르지 않는다(R1).

새로 생기는 동작 셋: (1) **쓰기 실패 기록** — `preferences/write-failures.json`에 이유 갈래(다섯)와 시각만, 최근 10건. 파이프라인 결과를 소비하는 세 곳(홈 `generate`·`runAutoDiaryTask`·
첫 실행 자동 첫 일기)이 한 함수 `recordWriteFailure`를 부른다(R2·R3). (2) **지금 한 번 써 보기** — 홈에 쓰기 요청(`writeRequest`)을 넘기고 설정·개발자·진단을 닫는다. 홈이 054 제자리 쓰기로
시작한다(R4). (3) **자동 쓰기 지금 실행** — `runAutoDiaryTask`에 `manual` 옵션을 더해 시도 창과 토글만 무시한다(R5). 저장 점검은 일기를 다시 읽어 편수를 센다(R6). `collectReport`는 화면이
안 쓰는 필드(캐릭터별 모델·모듈 상태·옛 저장 점검·수집 실패)를 걷어 가볍게 한다(R7). 새 네이티브 모듈 0.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, React Native 0.86, React Compiler)

**Primary Dependencies**: 기존 것만. `react-native`의 `Platform`으로 안드로이드 버전을 읽는다(R8). 새 의존성 0, 새 네이티브 모듈 0.

**Storage**: 새 파일 하나 — `preferences/write-failures.json`(`{"items":[{"reason","at"}…]}`, 최신이 앞, 최대 10). data-model §1.

**Testing**: jest 두 프로젝트(`logic` `.ts` / `ui` `.tsx`), 소스 계약 테스트, 헌법 검사(`npm run lint`), dev 실기기(quickstart — 백업 → 확인 → 복원), Maestro `prompt-preview.yml` 수선(FLOWS 등록 확인)

**Target Platform**: Android 실기기(SM-S901N, Android 16) — dev(debug) 빌드

**Project Type**: mobile-app

**Performance Goals**: 해당 없음(개발자 화면). 저장 점검은 일기 N편을 한 번씩 읽는다(누를 때만).

**Constraints**: 원칙 III(모델 이름 없음 — 캐릭터별 모델 줄 삭제), 원칙 IV(기록에 시간·토큰·측정 필드 없음, 쓰기 로그 없음), 원칙 V(`unknown`을 0으로 채우지 않음, CPU 표기는 고정 사실에 근거),
D3(실패 기록은 별도 파일·이유와 시각·10건), 022 PP1·PP6·`UI_TOUCHES_PROMPT`, `DIAGNOSTICS_HIDES_AXES`, 059 DG2(개발자 화면이 진단을 import하지 않음), 054 `AppScreen` 불변, 055 겹 규칙,
AGENTS 기기 안전 규칙(`pm clear`·`am force-stop` 금지, 파일은 백업 후)

**Scale/Scope**: 새 소스 4(`src/app/write-failures.ts`·`src/app/diary-inspect.ts`·`src/app/diagnostics-view.ts`·`src/app/diagnostics-text.ts`) + 새 화면 부품 파일 1(`src/ui/DiagnosticsParts.tsx`) + 테스트,
고침 약 10(`DiagnosticsScreen.tsx`·`DiaryHomeScreen.tsx`·`App.tsx`·`task.ts`·`wiring.ts`·`diagnostics/report.ts`·`diagnostics/types.ts`·`scripts/constitution-rules.ts`·`.maestro/prompt-preview.yml`),
삭제 5 화면(`GenerationProbe`·`AutoDiaryTriggerButton`·`PermissionPanel`·`SignalProbe`·`PromptPreviewPanel`)과 자기 테스트

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 「지금 한 번 써 보기」는 홈의 제품 경로를 그대로 부른다(Mock·서버 경로 없음). 진단 전용 파이프라인 인스턴스를 없앤다(옛 `GenerationProbe`의 `createAppPipeline` 호출 삭제). |
| II 화자·좁은 시야 | 해당 없음 | 프롬프트·생성 무변경. 프롬프트 미리보기는 기존 `buildPrompt()` 출력을 보일 뿐이다. |
| III 캐릭터 | 통과 | 캐릭터별 모델 줄·모델 이름·파라미터를 지운다(FR-004). 화면은 로스터·모델 키에 닿지 않는다(`UI_TOUCHES_ASSET`). |
| IV 측정 장치 금지 | 통과 | 실패 기록은 이유 갈래와 시각뿐(WF3 소스 검사), 걸린 시간·토큰·속도 어휘 없음(FR-021). 쓰기 로그를 두지 않는다(S9). 「최근 실패」는 상태 기록이지 채점·비교가 아니다. |
| V 관측과 추측 | 통과 | 걸음·배터리·연결은 「모름」(수집 통로 없음), 사진 권한 없음의 사진·장소도 「모름」. CPU 표기는 `n_gpu_layers` 0 고정이라는 코드 사실에 근거(R8). 기록을 못 읽으면 빈 상태, 지어내지 않는다. 실기기 dev에서 한 번 완주(quickstart). |
| 개발 방식 | 통과 | 계약(contracts/diagnostics.md) → 테스트 먼저. 한국어 커밋, 기능 브랜치(`060-diagnostics-screen`). |

Phase 1 뒤 재확인: 위반 없음. Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/060-diagnostics-screen/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/diagnostics.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/
├── write-failures.ts     # 신규 — 갈래 판정(순수)·기록 읽기/더하기(통로 주입)·expo 통로 (R2·R3)
├── diary-inspect.ts      # 신규 — 일기를 다시 읽어 {편수, 읽기 실패} (R6)
├── diagnostics-text.ts   # 신규 — §3.6 KO 문구표 정본 (글자 단위 계약). `src/app/`이 `src/ui/`를 import하지 않는 선례(`target-hour.ts`)를 따라 app에 둔다
├── diagnostics-view.ts   # 신규 — 환경 줄·사진 권한 줄·신호 칸·실패 줄 → 화면 문자열 (순수, R8·R9)
└── wiring.ts             # 고침 — triggerFirstRunAutoDiary가 실패를 기록 (R3)
src/schedule/task.ts      # 고침 — manual 옵션 (R5), 실패 기록 (R3)
src/diagnostics/
├── report.ts · types.ts  # 고침 — 화면이 안 쓰는 필드 삭제 (R7)
└── prompt-preview.ts     # 무변경 — PRESET_LABELS·SIGNAL_PRESETS 그대로
src/ui/
├── DiagnosticsScreen.tsx # 다시 씀 — 일곱 묶음 (조립은 App.tsx가 값·핸들러 주입)
├── DiagnosticsParts.tsx  # 신규 — 신호 칸·프리셋 전환·미리보기 상자 같은 진단 전용 부품
├── DiaryHomeScreen.tsx   # 고침 — writeRequest 받기, 실패 기록 호출 (R3·R4)
└── (삭제) GenerationProbe · AutoDiaryTriggerButton · PermissionPanel · SignalProbe · PromptPreviewPanel
App.tsx                   # 고침 — `DiagnosticsLayer`(진단 겹에 값·핸들러 주입), writeRequest 상태, 진단 토스트, 홈에 recordFailure 연결 (R2·R4)
scripts/constitution-rules.ts  # 고침 — 규칙의 파일 이름을 새 부품으로 (R10)
__tests__/                # 새 계약 테스트 + 옛 컴포넌트 테스트 삭제·이관
.maestro/prompt-preview.yml    # 고침 — 새 화면의 id·문구
```

**Structure Decision**: 화면은 값과 핸들러만 받는다(059 `DeveloperScreen`과 같은 방식). 판정·문자열 조립은 `src/app/`의 순수 함수에 두고, 기기 통로(파일·권한·신호)는 `App.tsx` 조립부가
주입한다. 실패 기록의 쓰는 자리는 파이프라인 결과를 소비하는 세 곳이다 — 파이프라인 안에 두지 않는다(그만두기·건너뜀을 구별하는 것은 소비하는 쪽이 안다, R2).

## Complexity Tracking

없음.

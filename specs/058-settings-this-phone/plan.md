# Implementation Plan: 이 휴대폰 — 받은 모듈 용량과 일기 모두 지우기

**Branch**: `058-settings-this-phone` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/058-settings-this-phone/spec.md`

## Summary

설정에 「이 휴대폰」 묶음(「쓰는 모듈」 용량 — 1000 기준, 「일기 모두 지우기」)을 둔다. 지우기는 050 확인 대화상자(빨간 「지우기」)를 거쳐, 홈이 쓰는 중이면 054 그만두기로
멈추고 그 생성이 끝나기를 기다린 뒤(R1), 쓰기 잠금을 쥔 채 일기 파일·사진 사본·알림 확인 기록을 지우고 트레이 알림을 거둔다(R2). 잠금을 못 얻으면 지우지 않고
한 줄로 알린다(R10). 지운 뒤 설정을 닫고 홈을 다시 마운트해 오늘을 보인다(R11).

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, React Native 0.86, React Compiler)

**Primary Dependencies**: 기존 것만 — `expo-file-system`(지우기), `expo-notifications`(거두기, 020 `dismiss`), 050 RNR 대화상자. 새 의존성·네이티브 모듈 0.

**Storage**: 새 파일 없음. 지우는 자리는 data-model §1.

**Testing**: jest 두 프로젝트(`logic` `.ts` / `ui` `.tsx`), 소스 계약 테스트, 헌법 검사(`npm run lint`), dev 실기기 수동(quickstart — 백업·복원 포함)

**Target Platform**: Android 실기기(SM-S901N, Android 16) — dev(debug) 빌드

**Project Type**: mobile-app

**Performance Goals**: 지우기는 로컬 파일 지우기라 진행 표시 없이 끝난다(spec Assumptions). 쓰는 중이면 멈춤(`stop()` → `interrupted` resolve)을 기다린다.

**Constraints**: 원칙 IV(지우기 이력 금지), D3, `UI_TOUCHES_ASSET`(화면은 모듈 키에 닿지 않는다), 054 `AppScreen` 선언 불변(`toWriting()` 인자 없음), 055 겹 구조(홈 언마운트 금지 —
지운 뒤 재마운트는 `key`로만), AGENTS — RN `Pressable`의 `disabled={false}` 덮어쓰기 함정

**Scale/Scope**: 새 소스 4(`src/app/wipe-diaries.ts`·`src/app/module-size.ts`·`src/app/wipe-port.ts`·`src/ui/WipeConfirmDialog.tsx`) + 테스트, 고침 7(`store.ts`·`on-device.ts`(상수 export)·
`Dialog.tsx`·`SettingsScreen.tsx`·`settings-text.ts`·`DiaryHomeScreen.tsx`·`App.tsx`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 일기를 만들지 않는다. 지우기 뒤 쓰는 일기는 그대로 `pipeline.run()`. 멈춘 쓰기는 저장되지 않는다(FR-014). |
| II 화자·좁은 시야 | 해당 없음 | 프롬프트·생성 무변경. |
| III 캐릭터 | 통과 | 「쓰는 모듈」은 합계 문자열뿐 — 모델 이름·사양·키가 화면에 가지 않는다(MS3, `UI_TOUCHES_ASSET`). 모듈 파일을 지우지 않는다. |
| IV 측정 장치 금지 | 통과 | 지운 시각·편수를 기록하지 않는다(WP7). 용량은 사용자가 보는 저장 공간 안내(UX) — 모델 비교·채점이 아니다. |
| V 관측과 추측 | 통과 | 용량·편수를 못 읽으면 비우거나 누를 수 없게 한다 — 0으로 채우지 않는다(FR-005·FR-008). 지우기가 일부 실패하면 남은 것을 그대로 보인다(FR-018). dev 실기기 1회(quickstart). |
| 개발 방식 | 통과 | 계약(contracts/this-phone.md) → 테스트 먼저. 한국어 커밋, 기능 브랜치(`058-settings-this-phone`). |

Phase 1 뒤 재확인: 위반 없음. Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/058-settings-this-phone/
├── plan.md
├── research.md          # R1~R12
├── data-model.md        # 지우는 것/남기는 것·결과·요청·화면 값
├── quickstart.md        # 기기 없이 + dev 실기기(백업 → 확인 → 복원)
├── contracts/this-phone.md   # ST·WP·MS·HS·AF·UI·TX
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/diary/
└── store.ts                 # 고침 — DiaryStore.removeAll, FileSystemPort.remove, 파일·메모리·expo 구현
src/inference/
└── on-device.ts             # 고침 — VISION_CACHE_DIRECTORY export(값 하나)
src/app/
├── wipe-diaries.ts          # 새 — wipeDiaries(deps): WipeOutcome (순수 조합, 통로 주입)
├── wipe-port.ts             # 새 — clearPhotoCopies(expo-file-system, vision-cache 비우기)
└── module-size.ts           # 새 — formatModuleBytes(순수) + readModuleBytes(ESSENTIAL_ASSET_KEYS 합)
src/ui/
├── WipeConfirmDialog.tsx    # 새 — ConfirmDialog + 빨간 지우기
├── components/Dialog.tsx    # 고침 — DialogActionButton tone
├── SettingsScreen.tsx       # 고침 — 「이 휴대폰」 묶음, Row labelTone·disabled
├── settings-text.ts         # 고침 — 문구 일곱 + 보드 밖 하나
└── DiaryHomeScreen.tsx      # 고침 — wipeRequest·onWipeReady, inFlight ref
App.tsx                      # 고침 — AppFrame requestWipe·diaryKey / DiarySection 전달·조립 실패 응답 / SettingsSection 편수·용량·대화상자
__tests__/diary/             # store-remove-all(ST)
__tests__/app/               # wipe-diaries(WP), module-size(MS), app-wipe-source(AF·HS6 — logic 소스 계약)
__tests__/ui/                # settings-this-phone(UI·TX), home-wipe(HS1~HS5), dialog(UI6 갱신)
```

**Structure Decision**: 기존 계층을 따른다 — 저장은 `src/diary/store.ts`(002의 자리), 지우기 조합·용량은 `src/app/`(`ESSENTIAL_ASSET_KEYS`를 쓸 수 있는 조립 계층, `essential-assets-port.ts`와 같은 자리),
그리기는 `src/ui/`, 조립은 `App.tsx`.

## 구현 순서 (태스크의 뼈대)

1. 계약 테스트 먼저: ST·WP·MS·TX(logic) → `store.ts`·`wipe-diaries.ts`·`module-size.ts`·`settings-text.ts`.
2. 화면: `Dialog.tsx` tone(UI6) → `WipeConfirmDialog`(UI5) → `SettingsScreen` 묶음(UI1~UI4).
3. 홈 응답: `DiaryHomeScreen`(HS1~HS5).
4. 조립: `wipe-port.ts`, `App.tsx`(AF1~AF3, HS6).
5. `npm test`·`npm run lint` → 위반 주입 넷 → dev 실기기(quickstart 0~4) → AGENTS에 058 절.

## Complexity Tracking

없음.

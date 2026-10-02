# Implementation Plan: 개발자 메뉴 — 버전 7번 탭, 모듈 상태·다시 받기·온보딩 다시·끄기

**Branch**: `059-developer-menu` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/059-developer-menu/spec.md`

## Summary

설정 「정보」의 버전을 1초 이내 간격으로 7번 누르면(순수 판정 `developer-taps.ts`) 개발자 메뉴가 켜진다 — 켜짐은 `preferences/developer-menu.json`(별도 파일)에 저장하고, 개발 환경은
환경이 이긴다(R1·R2). 「개발자」 행은 설정 「정보」 맨 아래에서 오른쪽에서 밀려 들어오는 개발자 겹(055가 이미 둔 `route: "developer"`)을 연다. 개발자 화면은 모듈 줄(읽는·쓰는, 상태·크기),
모듈 다시 받기, 온보딩부터 다시, 끄기, 개발 환경의 진단 진입을 담는다(R4). **모듈 다시 받기**는 빠진·잘린 것만 받는다(파일을 지우지 않는다) — `expo-network`로 연결 종류를 읽어 모바일일 때만
용량을 확인 문구에 보이고(R5), 받을 것이 없으면 대화상자 대신 토스트(R3), 받을 때는 쓰는 중인 홈을 먼저 멈춘다(R6). **온보딩부터 다시**는 지금 죽어 있는 `forceOnboarding` 경로를 고쳐
되살리고 쓰는 중인 홈을 먼저 멈춘다(R7). 055가 걷은 옛 화면·테스트를 정리하고 Maestro 흐름 열한 개를 하나씩 되살리거나 폐기한다(R9·R10).

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, React Native 0.86, React Compiler)

**Primary Dependencies**: 기존 것 + **`expo-network`(새 네이티브 모듈 하나, Clarification Q2)** — `getNetworkStateAsync()`로 연결 종류만 읽는다(ctx7 `/websites/expo_dev_versions_unversioned`로 확인, 2026-10-02).
`ACCESS_NETWORK_STATE`·`ACCESS_WIFI_STATE`는 일반 권한이라 설치 시 자동 부여되고 온보딩의 권한 목록(`PERMISSION_REQUIREMENTS`)에 오르지 않는다. 그 밖의 새 의존성 0.
dev 빌드를 `expo prebuild` 뒤 다시 만들어야 한다(AGENTS — 새 네이티브 모듈).

**Storage**: 새 파일 하나 — `preferences/developer-menu.json`(`{"enabled": true}` — 켜짐일 때만 존재). data-model §1.

**Testing**: jest 두 프로젝트(`logic` `.ts` / `ui` `.tsx`), 소스 계약 테스트, 헌법 검사(`npm run lint`), dev 실기기(quickstart — 백업 → 확인 → 복원, 새 모듈이라 prebuild·재설치 포함)

**Target Platform**: Android 실기기(SM-S901N, Android 16) — dev(debug) 빌드

**Project Type**: mobile-app

**Performance Goals**: 해당 없음(설정 화면). 모듈 크기 읽기는 파일 크기 조회 셋 — 겹이 열릴 때 한 번.

**Constraints**: 원칙 III(모델 이름·사양 없음 — 합계·키 판정은 `src/app/`), 원칙 V(읽지 못한 것을 비운다·연결 종류를 모르면 모바일 문구 없음), D3(켜짐은 별도 파일·값 하나), `UI_TOUCHES_ASSET`,
055 겹 규칙(홈 언마운트 금지·`active`/`covered`), 054 `AppScreen` 불변, `showsOnScreen` 경유(S7), 037(파일을 지우지 않는다), AGENTS — `pm clear` 금지·`am force-stop` 금지·모듈 지우는 경로 먼저 코드로 확인

**Scale/Scope**: 새 소스 12(`src/app/developer-taps.ts`·`developer-menu-store.ts`·`developer-build-label.ts`·`module-lines.ts`·`redownload-plan.ts`·`network-port.ts`·`onboarding-gate.ts`, `src/ui/DeveloperScreen.tsx`·`DeveloperToast.tsx`·`developer-text.ts`·`use-developer-menu.ts`·`use-developer-taps.ts`)
+ 테스트, 고침 8(`App.tsx`·`SettingsScreen.tsx`·`SettingsFrame.tsx`·`settings-text.ts`·`tokens.ts`·`essential-assets-port.ts`·`module-size.ts`·`package.json`) + 삭제(옛 화면 셋 + 딸린 것, R9) + Maestro 흐름 정리(R10)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 일기를 만들지 않는다. 다시 받기는 같은 모듈 파일(같은 GGUF)을 받는다. 진단 진입은 개발 환경에서만 — 배포에는 Mock·서버 경로 없음. |
| II 화자·좁은 시야 | 해당 없음 | 프롬프트·생성 무변경. |
| III 캐릭터 | 통과 | 모듈 줄은 「읽는/쓰는」과 상태·크기 문자열뿐 — 모델 이름·파라미터·양자화·키가 화면에 가지 않는다(MD3·BD1, `UI_TOUCHES_ASSET`). 로스터에 닿지 않는다. 사용자가 고르지 않은 모델을 받지 않는다 — 다시 받는 것은 이미 필수인 셋뿐. |
| IV 측정 장치 금지 | 통과 | 탭 횟수·켠 시각·다시 받은 횟수를 저장하지 않는다(DS1). 용량·연결 종류는 사용자가 보는 안내(UX)이고 모델 비교·채점이 아니다. |
| V 관측과 추측 | 통과 | 읽지 못한 크기·상태·연결 종류는 비우거나 문구를 빼고 지어내지 않는다(MD4·RD3). 새 네이티브 모듈은 dev 실기기에서 prebuild 뒤 확인(quickstart). 켜짐 파일이 깨지면 꺼짐(DS3). |
| 개발 방식 | 통과 | 계약(contracts/developer-menu.md) → 테스트 먼저. 한국어 커밋, 기능 브랜치(`059-developer-menu`). |

Phase 1 뒤 재확인: 위반 없음. Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/059-developer-menu/
├── plan.md
├── research.md          # R1~R12
├── data-model.md        # 켜짐 파일·연속 탭·모듈 줄·다시 받기 계획·화면 값
├── quickstart.md        # 기기 없이 + dev 실기기(prebuild → 백업 → 확인 → 복원)
├── contracts/developer-menu.md   # TP·DS·HK·DV·MD·RD·OB·OF·DG·CL·FL·TX·BD
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/
├── developer-taps.ts          # 새 — registerTap(state, nowMs, alreadyOn): { state, effect } (순수)
├── developer-menu-store.ts    # 새 — 켜짐 파일 통로(load/save/clear) + expo 구현
├── developer-build-label.ts   # 새 — buildLabelFor(devEnvironment, versionText): 머리글 오른쪽 글자 (순수)
├── onboarding-gate.ts         # 새 — permissionStepsDecided·onboardingGateNeeded (R7, 순수)
├── module-lines.ts            # 새 — readModuleLines(...): 읽는/쓰는 모듈의 상태·크기 문자열 (키 판정은 여기)
├── redownload-plan.ts         # 새 — planRedownload(...): nothing | confirm(cellularSize|null) (순수 조합)
├── network-port.ts            # 새 — readConnection(): "wifi" | "cellular" | "other" | "unknown" (expo-network 지연 import)
├── essential-assets-port.ts   # 고침 — 받을 양 읽기(remainingBytes) 추가
└── module-size.ts             # 고침 — 읽는/쓰는 크기를 나눠 읽는 함수
src/ui/
├── DeveloperScreen.tsx        # 새 — 개발자 화면 내용(보드 6e/6j): 그룹·행·확인 대화상자·토스트 자리
├── DeveloperToast.tsx         # 새 — 2초 토스트(제목 + 선택적 보조 줄)
├── developer-text.ts          # 새 — `dev.*` 보드 KO 원문 + 보드 밖 문구(표시)
├── use-developer-menu.ts      # 새 — 켜짐 상태 훅(환경 + 파일 + 세션 꺼짐)
├── use-developer-taps.ts      # 새 — 버전 탭·토스트·1.5초 강조 훅(`registerTap` 위, 가짜 타이머로 검증)
├── SettingsScreen.tsx         # 고침 — 버전 행 탭, 「개발자」 행(강조)
├── SettingsFrame.tsx          # 고침 — 머리글 오른쪽 `titleAside`
├── settings-text.ts           # 고침 — `about.developer` 「개발자」
└── theme/tokens.ts            # 고침 — `SETTINGS.rowHighlight` (#fff2ef, 보드 accent-100)
App.tsx                         # 고침 — 개발자 겹 조립, 진단 겹, 다시 받기·온보딩 다시·끄기, `forceOnboarding` 복구, `stopHome` 추출
package.json / android/         # 고침 — expo-network (expo install)
```

삭제(R9): `src/ui/CharacterListScreen.tsx`·`PermissionsSection.tsx`·`AuthorPicker.tsx`(+ 쓰는 곳이 사라지는 `CharacterPicker.tsx`·`components/ListRow.tsx`·`components/SelectRow.tsx` — 확인 뒤)와 자기 테스트.
Maestro(R10): `.maestro/` 흐름 열한 개 — 되살림 넷, 폐기 일곱(구현 때 흐름을 읽어 확정).

## Complexity Tracking

(위반 없음)

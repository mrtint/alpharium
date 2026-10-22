# Implementation Plan: 일기·모델 백업과 유실 안내

**Branch**: `099-backup-and-loss-notice` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), 설계 `docs/superpowers/specs/2026-10-22-backup-and-loss-notice-design.md`

## Summary

모델 디렉터리(`models`)를 두 플랫폼의 OS 백업에서 뺀다. iOS는 로컬 Expo 모듈이 `isExcludedFromBackup`을 건다(경로 불변), 안드로이드는 설정 플러그인이 `models/` 제외 규칙 둘을 쓴다. 일기·설정·사진 사본은 건드리지 않는다(D4=A). 실기기로 모델 제외와 일기 잔존을 확인하고, 그 결과로 방침·지원 문구를 같은 말로 고치며, 설정 「이 휴대폰」에 유실 안내 보조 줄 하나를 더한다.

## Technical Context

**Language/Version**: TypeScript(Expo SDK 57, RN 0.86), Swift(iOS 16.4+ 로컬 Expo 모듈), Node(Expo 설정 플러그인 CJS)

**Primary Dependencies**: `expo-modules-core`(`requireOptionalNativeModule`), `@expo/config-plugins`, `expo-file-system` 57(경로만). 새 패키지 없음.

**Storage**: 앱 데이터 `Paths.document`(`models/`·`preferences/`·`vision-cache/`·일기 디렉터리). 저장 형식·경로 불변.

**Testing**: jest(logic `.ts`·ui `.tsx`), 소스 계약 테스트(주석 제거 뒤 읽기), 플러그인 산출물 계약 테스트, 실기기 실측(SM-S901N `bmgr`·iPhone 14 lldb).

**Target Platform**: Android(API 30 이하·31+ 규칙 둘), iOS 16.4+

**Project Type**: mobile-app (Expo + 로컬 네이티브 모듈 + 설정 플러그인)

**Performance Goals**: 제외 호출은 프로세스당 한 번, 사용자 체감 지연 0(메모).

**Constraints**: 모델 경로 불변(재다운로드 0바이트). 제외 실패가 앱을 막지 않음. 일기·설정·사진 사본은 어떤 규칙에도 제외로 잡히지 않음. `android/`·`ios/`는 gitignore 생성물 → 플러그인으로만 선언.

**Scale/Scope**: 새 파일 약 8개(모듈 3, 플러그인 1, 포트 1, 테스트 3~4), 수정 약 6개(`app.json`, `expo-port.ts`, `SettingsScreen.tsx`, `settings.ts`, 방침·지원 HTML, `site-pages.test.ts`, 골든, `plugins/README.md`).

## Constitution Check

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 추론 경로 변경 없음. 통과. |
| II 화자 | 일기 생성 변경 없음. 유실 안내는 앱 문구이지 일기 글이 아님. 통과. |
| III 캐릭터는 모델 위에 | `src/ui/`는 `models/roster`에 닿지 않는다. 제외 호출은 `src/models/` 안(`expo-port.ts`)에 둔다. 안내 줄은 UI가 `settings.ts` 카탈로그만 읽는다. 통과. |
| IV 측정 장치 없음 | 제품 코드에 측정·채점 없음. 실측은 터미널·lldb 개발 절차뿐. 통과. |
| V 사실/추측 구분, 실기기 | 모든 백업 사실은 실측 뒤에만 방침에 쓴다. [미확인]은 research에 표시. 두 플랫폼 실기기 확인이 완료 조건. 통과. |

AGENTS 경계: `process.env` 미사용, 하루 경계·프롬프트·판정 갈래 변경 없음, 화면 한글은 `src/i18n/catalogs/ko/`에만, `text()`는 모듈 최상단에서 평가하지 않음.

## Project Structure

### Documentation (this feature)

```text
specs/099-backup-and-loss-notice/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/backup-exclusion.md
├── checklists/requirements.md
└── tasks.md   # /speckit-tasks
```

### Source Code

```text
modules/pocketlog-backup-exclusion/        # 신규, iOS 전용 로컬 Expo 모듈 (bg-expiry와 같은 모양)
├── package.json
├── expo-module.config.json                # apple: PocketlogBackupExclusionModule
└── ios/
    ├── PocketlogBackupExclusion.podspec
    └── PocketlogBackupExclusionModule.swift

plugins/with-backup-rules.js               # 신규, 안드로이드 규칙 파일 2 + 매니페스트 속성 2
plugins/README.md                          # 한 줄 추가
AGENTS.md                                  # 실측 규칙 한 항목 (T023)
app.json                                   # plugins에 ./plugins/with-backup-rules

src/models/backup-exclusion-port.ts        # 신규, 모듈 포트(없으면 no-op, 던지지 않음)
src/models/expo-port.ts                    # openDirectory()가 제외 호출
src/ui/SettingsScreen.tsx                  # wipe 행 아래 보조 줄(lossNote), 기존 행 불변
src/i18n/catalogs/ko/settings.ts           # 새 키 lossNote (소유자 확정 문구)

site/privacy/index.html, site/support/index.html   # 실측 뒤 같은 문장

__tests__/config/backup-rules-plugin.test.ts       # 플러그인 산출물 계약 + 위반 주입
__tests__/config/backup-exclusion-module.test.ts   # 모듈 이름·함수 Swift↔JS 대조 + podspec
__tests__/models/backup-exclusion.test.ts          # 포트 동작·호출 지점 소스 계약
__tests__/privacy/site-pages.test.ts               # S10 두 테스트를 실측 문장으로 갱신
__tests__/i18n/ko-golden.test.ts                   # ADDED_AFTER_GOLDEN에 lossNote만 덧붙임
```

**Structure Decision**: 기존 로컬 모듈 선례(`pocketlog-bg-expiry`)와 설정 플러그인 선례(`with-battery-exception.js`)를 그대로 따른다. 제외 호출은 모델 파일 통로(`expo-port.ts`)가 모든 경로의 합류점이라 거기 한 자리에 둔다.

## Complexity Tracking

위반 없음.

## 남은 결정 (소유자)

- 유실 안내 문구(FR-008). 초안 후보는 tasks에서 제시하고 소유자 확정 전에는 키만 두지 않는다 — 문구 확정이 막히면 US3만 보류하고 US1·2·4를 먼저 끝낸다.

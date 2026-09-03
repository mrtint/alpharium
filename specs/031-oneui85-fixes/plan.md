# Implementation Plan: One UI 8.5+ 다크 모드 dimmed + 온보딩 photo-location 무반응 수정

**Branch**: `031-oneui85-darkmode-photolocation` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/031-oneui85-fixes/spec.md`

## Summary

두 결함을 One UI 8.5+에서만 드러나는 원인까지 짚어 고친다.

- **① 다크 모드 dimmed** — `app.json`의 `userInterfaceStyle: "light"`가 `expo-system-ui` 미설치로 무시되고, 설치해도 `setDefaultNightMode(MODE_NIGHT_NO)`가 **리소스 해석 계층만** 라이트로 되돌린다. `styles.xml`의 `AppTheme` 부모가 `Theme.AppCompat.DayNight.NoActionBar`(**DayNight**)라, 시스템 night 모드에서 **윈도우 데코 배경**이 만들어질 때 night 리소스(`#303030` = `background_material_dark`)로 칠해지고 `android:configChanges`의 `uiMode` 때문에 Activity 재생성이 없어 잔존한다. **초안의 "force-dark 반전" 진단은 실기기(SM-S928N, 2026-09-03)에서 틀린 것으로 확인** — `forceDarkAllowed=false`를 양쪽 테마 + `-v29`에 넣어도 배경 `#303030` 유지, force-dark였다면 글자·이미지까지 반전됐을 것. **수정: `expo-system-ui` 설치**(→ RN 뷰 레벨 라이트) **+ config plugin으로 `AppTheme` 부모를 `Theme.AppCompat.Light.NoActionBar`로 교체**(→ 윈도우 배경이 night 모드를 안 따라감). `Theme.App.SplashScreen`은 `AppTheme` 상속이라 자동으로 따라온다. `forceDarkAllowed=false`는 제조사 force-dark 대비 방어로 양쪽 테마에 유지. research.md R1a 상세.
- **② 온보딩 photo-location 무반응** — `ACCESS_MEDIA_LOCATION`은 `expo-media-library 57`에 요청·조회 API가 없어(021 확인), `locationPermission()`이 사진 granted면 늘 `"undetermined"` → `decision.ts`가 `"actionable"` → `nextStep`이 이 단계를 영원히 반환 → 무한 루프. **수정: `PERMISSION_REQUIREMENTS`에서 `photo-location` 항목 제거 + `order` 재배치(사진1·위치2·알림3·배터리4) + `PermissionKey` 타입에서 제거 + 그에 딸린 온보딩·설정·`App.tsx`·계약 테스트의 `photo-location` 분기 제거.** 매니페스트 `ACCESS_MEDIA_LOCATION` 선언과 `expo-media-library` 플러그인 설정(`isAccessMediaLocationEnabled: true`)은 유지 — 신호 수집(`collect.ts`)이 실제 좌표를 읽어 처리하는 경로(021 FR-013a)는 무변경.

## Technical Context

**Language/Version**: TypeScript, React Native 0.86.2, Expo SDK ~57.0.14

**Primary Dependencies**: `expo-system-ui`(신규, `expo install`로 버전 해석 — `npm view` 금지, AGENTS.md), `@expo/config-plugins`(이미 있음 — `withAndroidStyles` 사용), `expo-media-library ~57.0.4`(무변경)

**Storage**: N/A (새 저장 계층 없음). `onboarding.json`·`preferences/` 스키마 무변경.

**Testing**: jest (`test:logic` `.ts` / `test:ui` `.tsx`), 소스를 `readFileSync`로 읽는 계약 테스트 관례(021), Maestro 실기기 흐름

**Target Platform**: Android (dev + release 빌드). 실기기 검증: One UI 8.5 (SM-S928N/S24 Ultra) 필수 + One UI 8 이하 회귀(SM-S901N/S22). Expo Go 불가(`llama.rn`).

**Project Type**: 모바일 단일 앱 (Expo prebuild, `src/` + `App.tsx` + `plugins/` + `android/`(gitignore))

**Performance Goals**: N/A (버그 수정 — 성능 목표 없음)

**Constraints**:
- `android/`는 `.gitignore` — 매니페스트·테마 직접 수정 금지, config plugin으로만(선례: `with-battery-exception.js`).
- `src/onboarding/`는 `checkOnboardingFile` 경계 — `models/roster` 등 직접 import 금지(이번 수정은 상수 항목 제거라 이 경계를 새로 건드리지 않음).
- 판정 갈래 안 늘림(원칙 IV) — `REJECT_REASONS` 4개, `StepStatus` 4개 그대로.
- `prompt.ts`·`acceptance.ts`·파이프라인 무변경.
- release 재확인 1회 필요(`expo-system-ui` 새 네이티브 모듈, 012 기준).

**Scale/Scope**: 수정 파일 약 8개 + 신규 plugin 1개 + 계약 테스트 갱신. 새 화면·새 기능 0.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 관련성 | 통과 여부 |
|---|---|---|
| **I. 온디바이스가 제품이다** | 추론 경로 무관 — 화면 외형·온보딩 단계만 건드림 | ✅ 해당 없음 |
| **II. 화자는 휴대폰, 시야는 좁다** | `prompt.ts` 무변경. 온보딩 문안은 남는 4개 단계 그대로 | ✅ 위반 없음 |
| **III. 모델은 캐릭터다** | 화면·온보딩에 모델 식별자 노출 없음. `photo-location` 제거는 모델과 무관 | ✅ 위반 없음 |
| **IV. 측정 장치를 제품에 안 들인다** | 채점·비교 코드 없음. `forceDarkAllowed`·`expo-system-ui`는 외형 설정 | ✅ 위반 없음 |
| **V. 관측된 사실과 추측을 구분** | **`PERMISSION_REQUIREMENTS`는 "사람이 못 박은 상수"**(021, 012 `USER_VISIBLE_SIGNAL_AXES` 선례). 코드가 항목을 빼는 게 아니라 **사람이** 스펙 결정으로 상수에서 뺀다. `photo-location`은 "관측 통로가 아예 없는 축"(조회 API 부재)이므로 화면에서 빼는 것이 원칙 V 「관측 통로가 없는 축」 조항에 부합 — 진단 경로엔 남길 것이 없다(애초에 판정값이 없음). | ✅ 부합 |
| **개발 방식** | 계약 먼저·테스트 먼저. 커밋 한국어. "한 축 깊게 파기" 아님 — 두 개의 좁은 버그 수정 | ✅ |
| **Governance** | 헌법 개정 불필요 — 어느 MUST/MUST NOT도 완화하지 않음. `photo-location` 제거는 원칙 V가 이미 허용한 「통로 없는 축을 화면에서 뺀다(MAY)」 | ✅ 개정 불요 |

**결론: 헌법 위반 없음, 개정 불필요.** `PERMISSION_REQUIREMENTS` 항목 제거가 원칙 V와 부딪히지 않는 근거를 research.md R2에 상세히 남겼다(「관측 통로가 없는 축」 조항 인용 + 위반 주입 검증).

### Phase 1 재점검 (design 후)

- **research.md R2**: `photo-location` 제거의 원칙 V 부합을 논증 완료 — 조회 통로 부재 → 화면에서 뺌은 MAY, 빼는 주체는 사람(스펙 결정), 진단에 남길 판정값이 애초에 없음, 통로 생기면 상수에 재추가.
- **data-model.md**: 새 엔티티 0. 타입 축소(`PermissionKey` 5→4)와 상수 축소(`PERMISSION_REQUIREMENTS` 5→4 항목)만. 저장 스키마·`StepStatus` 4갈래 무변경.
- **contracts/dark-mode.md**: 라이트 고정 3중 보장(app.json + expo-system-ui + forceDarkAllowed plugin)의 계약 테스트 DM1a~g. `src/ui/`에 다크 분기 신규 금지(DM2).
- **contracts/onboarding-steps.md**: OB1~OB8 — 상수·`decision.ts`(무변경)·두 화면·`App.tsx`·매니페스트(무변경)·신호 수집(무변경)·Maestro. 판정 갈래 안 늘림 재확인.
- **원칙 IV 재확인**: `forceDarkAllowed`·`expo-system-ui`는 채점·비교 코드가 아니라 외형 설정. 위반 없음.
- **개발 방식 재확인**: 계약(contracts/) 먼저 정하고 테스트 갱신을 tasks에서 먼저. 두 개의 좁은 버그 — "한 축 깊게 파기" 아님.

**Post-Design Constitution Check: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/031-oneui85-fixes/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 두 원인의 근거, expo-system-ui vs forceDarkAllowed 역할 분리, 원칙 V 부합 논증
├── data-model.md        # Phase 1 — (해당 없음, 스켈레톤만: 새 엔티티 없음 명시)
├── quickstart.md        # Phase 1 — 실기기 검증 시나리오 (다크 모드 6화면 + 새 설치 온보딩 4단계 + S22 회귀 + release 재확인)
├── contracts/
│   ├── dark-mode.md         # ① 계약: 라이트 고정이 무엇으로 보장되는가 (app.json + plugin + expo-system-ui 3중 확인점)
│   └── onboarding-steps.md  # ② 계약: PERMISSION_REQUIREMENTS 4항목·order·타입, decision.ts 무한루프 부재, 설정·App.tsx 일관성
└── tasks.md             # /speckit-tasks 출력 (이 명령이 만들지 않음)
```

### Source Code (repository root)

```text
app.json                              # ① userInterfaceStyle: "light" 유지 (이미 있음), plugins 배열에 신규 plugin 추가
plugins/
├── with-battery-exception.js         # (선례 — withAndroidManifest 패턴)
├── with-release-signing.js           # (선례)
└── with-force-light-theme.js         # ★ 신규 — withAndroidStyles로 AppTheme에 android:forceDarkAllowed=false 주입
package.json                          # ① expo-system-ui 의존성 추가 (expo install)

src/onboarding/
├── requirements.ts                   # ② PermissionKey에서 "photo-location" 제거, PERMISSION_REQUIREMENTS에서 항목 제거, order 1..4 재배치, 주석 갱신
└── decision.ts                       # ② photo-location 관련 없음(키만 참조) — 변경 불필요 확인. statusOf/planOnboardingSteps 무변경

src/ui/
├── OnboardingScreen.tsx              # ② readStates()에서 photoLocation 조회·"photo-location" 키 제거, allow() switch에서 case 제거, OnboardingPorts 타입의 requestLocationPermission 제거 검토
└── PermissionsSection.tsx            # ② readStates()·describe()·requestFor() switch에서 photo-location 제거

App.tsx                               # ② deniedNotices 계산에서 req("photo-location") 제거 (line ~340), photoLoc 조회 정리

__tests__/onboarding/
├── requirements.test.ts             # ② order [1,2,3,4], 키 목록 4개, byOrder 배열, android 포함 목록에서 photo-location 제거
└── decision.test.ts                 # ② photo-location을 쓰던 케이스(line 175·186·199·215) 재작성 — location/notifications로 대체

__tests__/ui/
├── onboarding-screen.test.tsx       # ② onboarding-step-photo-location 단언(line 138·150) 제거/재작성, photoLocation prop 제거
└── denied-guidance.test.tsx         # ② photo-location ifDenied 단언(line 54) 제거

__tests__/plugins/
└── force-light-theme.test.ts        # ★ 신규 — with-force-light-theme.js의 순수 함수가 AppTheme에 forceDarkAllowed=false를 더하는지 (with-battery-exception 테스트 패턴)

.maestro/
└── unified-permission-onboarding.yml # ② photo-location 단계를 밟던 스텝 제거, 4단계 흐름으로 갱신 (FLOWS 이미 등록됨)

android/app/src/main/res/values/styles.xml  # (직접 수정 안 함 — plugin이 prebuild 때 생성)
```

**Structure Decision**: 기존 모바일 단일 앱 구조를 그대로 쓴다. 새 디렉터리 없음. `plugins/`에 config plugin 하나(`with-force-light-theme.js`) 추가 — `with-battery-exception.js`가 확립한 "매니페스트/테마는 plugin으로만, 순수 함수를 함께 export해 기기 없이 테스트" 패턴을 따른다. `src/`·`App.tsx`·`__tests__/`에서 `photo-location` 흔적을 제거하는 것이 ②의 전부이고, `app.json` + `package.json` + 신규 plugin이 ①의 전부다.

## Complexity Tracking

> 헌법 위반 없음 — 이 표는 비워 둔다.

해당 없음.

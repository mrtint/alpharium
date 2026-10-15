# Implementation Plan: 두 플랫폼 모두 Pretendard로

**Branch**: `083-pretendard-font` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/083-pretendard-font/spec.md`

## Summary

Pretendard v1.3.9 정적 OTF 다섯(400·500·600·700·800)을 `assets/fonts/pretendard/`에 바이트 그대로 두고 expo-font config plugin으로 두 플랫폼 빌드에 넣는다(안드로이드 XML 서체 묶음 `Pretendard`, iOS `UIAppFonts`). 서체 이름과 공통 글자 스타일은 `tokens.ts` 한 곳(`FONT`·`TEXT_FONT`)에 두고 RN 글자 부품을 직접 쓰는 세 자리(`AppText`·`rnr/text.tsx`·`NameField`)가 그것을 쓴다. 고정폭 6곳은 Pretendard + `tabular-nums`로 바꾼다. 설정 「정보」에 「서체 라이선스」 행과 겹 화면(`FontLicenseScreen`)을 더해 v1.3.9 `LICENSE.txt` 전문을 보인다. 서체 규칙 다섯을 소스·파일 계약 테스트로 잠근다. 안드로이드 `includeFontPadding`은 두 벌을 재어 정한다(research R6). 확인은 고치기 전과 같은 상태·같은 화면을 두 플랫폼에서 다시 찍어 나란히 두고 글자 폭을 잰다.

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 57, React Native 0.86.2, New Architecture)

**Primary Dependencies**: `expo-font` 57.0.1(이미 `expo`의 의존성 — `package.json`에 직접 올리지 않는다, research R3). 새 네이티브 의존성 0. 네이티브 **설정**은 바뀐다(서체 리소스·`UIAppFonts`·`MainApplication`의 `ReactFontManager.addCustomFont`) → `prebuild --clean`

**Storage**: 없음 — 앱 데이터 형식 그대로. 저장소에 서체 파일 약 7.9MB가 더해진다

**Testing**: jest `logic`(소스·파일 계약 — `.ts`)과 `ui`(설정 행·라이선스 화면 — `.tsx`, RNTL 14). 실기기: 안드로이드 SM-S901N dev(맥에서 빌드한 debug APK — 재설치 필요, quickstart §2), iOS iPhone 17 시뮬레이터 dev. Maestro로 화면 캡처, 층 1 전체

**Target Platform**: Android(minSdk 24)·iOS 공통. 플랫폼 분기는 없다 — `includeFontPadding`은 안드로이드 전용 속성이라 iOS가 무시한다

**Project Type**: mobile-app (단일 저장소)

**Performance Goals**: 첫 렌더부터 서체(앱에 포함 — 런타임 적재 없음)

**Constraints**: 배포처 파일 바이트 그대로(OFL 예약 서체명) · 서체는 tokens 한 곳 · 화면의 굵기 값 불변 · 라이선스 전문은 원문 그대로 · 계약 먼저·테스트 먼저 · release 빌드를 만들지 않는다 · 재는 스크립트(글자 폭)는 제품 코드에 두지 않는다(스펙 디렉터리, 원칙 IV)

**Scale/Scope**: 새 파일 — 서체 5 + `LICENSE.txt` + `source.json`, `src/ui/FontLicenseScreen.tsx`, `src/ui/pretendard-license.ts`, `src/i18n/catalogs/ko/font-license.ts`, 계약 테스트 2~3개. 수정 — `app.json`, `tokens.ts`, `components/Text.tsx`, `rnr/text.tsx`, `components/NameField.tsx`, 고정폭 4개 파일, `SettingsScreen.tsx`, `App.tsx`, 카탈로그 index·골든 허용 목록, Maestro `settings-developer-sweep.yml`, `docs/e2e/feature-flow-map.md`, `AGENTS.md`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스 | 해당 없음 | 추론 경로를 건드리지 않는다 |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·일기 내용 불변 |
| III. 캐릭터는 모델 위 | 통과 | 라이선스 화면은 서체 정보만 — 모델 식별자·사양을 노출하지 않는다 |
| IV. 측정 장치 금지 | 통과 | 글자 폭·여백을 재는 스크립트는 화면 확인 도구로 `specs/083-*/captures/tools/`에 둔다 — 모델 출력을 채점하지 않고 제품 코드(`src/`)에 들어가지 않는다 |
| V. 관측과 추측 구분 | 통과 | 안드로이드 굵기 선택·`includeFontPadding`은 기기에서 재고 실측으로 기록한다. iOS 실기기·release·Android 7.x는 미확인으로 남긴다. dev 실기기 확인이 완료 조건 |
| 개발 방식 | 통과 | 계약 테스트를 먼저 쓴다(실패 확인) · 한국어 커밋 · `083-pretendard-font` 브랜치 |

위반 없음 — Complexity Tracking 비움.

**Phase 1 뒤 재확인**: 통과. 새 계약(`contracts/font-rules.md`·`contracts/font-license-screen.md`)은 소스·파일을 읽는 계약이고 화면 판정·모델 출력과 무관하다.

## Project Structure

### Documentation (this feature)

```text
specs/083-pretendard-font/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── font-rules.md            # F1~F5 — 서체 규칙 다섯(계약 테스트)
│   └── font-license-screen.md   # L1~L6 — 행·겹·전문
├── captures/
│   ├── before/{android,ios,side-by-side}/
│   ├── after/                   # 구현 뒤(R6 두 벌 포함)
│   ├── spike-ios-variable-vs-static.png
│   └── tools/                   # 캡처 흐름·같은 상태 깔기·나란히 붙이기·글자 폭 재기(제품 밖)
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
assets/fonts/pretendard/
├── Pretendard-{Regular,Medium,SemiBold,Bold,ExtraBold}.otf   # v1.3.9 바이트 그대로
├── LICENSE.txt                                              # v1.3.9 릴리스 그대로
└── source.json                                              # 출처 기록(research R2)

app.json                          # plugins: expo-font (android fontFamily "Pretendard" + 굵기 다섯, ios 파일 다섯)

src/ui/theme/tokens.ts            # FONT(이름·굵기 다섯), TEXT_FONT(공통 글자 스타일) — 032 FR-019a 뒤집음 주석
src/ui/components/Text.tsx        # AppText — TEXT_FONT
src/ui/rnr/text.tsx               # 대화상자 Text — TEXT_FONT
src/ui/components/NameField.tsx   # TextInput — TEXT_FONT
src/ui/DiagnosticsParts.tsx       # 고정폭 → tabular-nums
src/ui/SettingsScreen.tsx         # 고정폭 → tabular-nums, 「서체 라이선스」 행
src/ui/SettingsFrame.tsx          # 고정폭 → tabular-nums
src/ui/DiaryListScreen.tsx        # DEV 꼬리표 고정폭 → tabular-nums
src/ui/FontLicenseScreen.tsx      # 새 — 서체 이름·라이선스 이름·전문
src/ui/pretendard-license.ts      # 새 — LICENSE.txt 전문(라틴 문자뿐, 062 B1 밖)
src/i18n/catalogs/ko/font-license.ts  # 새 영역 fontLicense(행·제목·안내)
src/i18n/catalogs/ko/index.ts     # 영역 등록
App.tsx                           # 라이선스 겹(설정 겹 안, 이름 바꾸기와 같은 방식)

__tests__/config/font-rules.test.ts     # F1~F5 (logic — 소스·파일)
__tests__/ui/font-license.test.tsx      # L1~L6 (ui)
__tests__/i18n/ko-golden.test.ts        # ADDED_AFTER_GOLDEN에 새 문구
.maestro/settings-developer-sweep.yml   # 서체 라이선스 열고 닫기
docs/e2e/feature-flow-map.md            # 「설정 — 서체 라이선스」 행
```

**Structure Decision**: 기존 구조를 따른다. 화면 문구는 카탈로그(062), 겹은 `StackLayer`(055), 화면 틀은 `SettingsFrame`(055·059). 라이선스 전문은 화면 문구가 아니라 바꿀 수 없는 문서라 카탈로그 밖 모듈 하나에 두고 `LICENSE.txt`와 바이트 대조한다(research R5).

## Complexity Tracking

없음.

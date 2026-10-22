# Implementation Plan: 모델·오픈소스 라이선스 고지

**Branch**: `101-license-notice` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: `specs/101-license-notice/spec.md`, 설계 `docs/superpowers/specs/2026-10-22-license-notice-design.md`

## Summary

고지는 앱 밖 정적 페이지 `site/licenses/index.html`에 둔다(D6). 앱은 설정 「정보」에 새 행 「오픈소스 라이선스」 하나를 더해 086 방침·지원 행과 같은 방식으로 기기 브라우저에서 연다(D7). 헌법은 고치지 않는다. 라이선스 전문은 `curl`로 받은 원문 파일(`sources/`)과 글자까지 같게 싣고, 계약 테스트가 그 일치를 잠근다. 새 문구는 새 카탈로그 영역(`ko/license-links.ts`) 한 줄뿐이며 모델 식별자 비노출을 테스트로 막는다.

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo SDK 57), 정적 HTML/CSS(사이트)

**Primary Dependencies**: 기존 것만 — `expo-linking`/`openInBrowser`(086), `react-native` 설정 화면. 새 의존성 없음

**Storage**: 해당 없음

**Testing**: jest 두 프로젝트(`logic`=`.ts`, `ui`=`.tsx`). 사이트 계약은 `__tests__/privacy/`와 같은 방식(정규식으로 HTML을 읽음)

**Target Platform**: Android(SM-S901N) / iOS. 사이트는 GitHub Pages(`pages.yml`, `site/**` 푸시 시 배포)

**Project Type**: 모바일 앱 + 정적 사이트

**Performance Goals**: 해당 없음(정적 문서)

**Constraints**: 외부 자원 0·스크립트 0(086 S3). 사이트 HTML은 prettier 대상이 아니다. 자리표시자(`{…}`) 금지(`pages.yml`). 문구 골든은 `ADDED_AFTER_GOLDEN`에만 덧붙인다

**Scale/Scope**: 페이지 1, 앱 행 1, 문구 1, 테스트 파일 약 4

## Constitution Check

| 원칙 | 판정 | 근거 |
|------|------|------|
| I 온디바이스 | 해당 없음 | 추론 경로 무변경 |
| II 화자 | 해당 없음 | 일기 문구 무변경 |
| III 모델 식별자 비노출 | **통과** | 모델 이름은 앱 밖 페이지에만 나온다. 앱 문구(`licenseLinks`)에는 식별자가 없고 테스트(LK2)가 막는다. `src/ui/`는 `models/roster`에 닿지 않는다 |
| IV 측정 장치 | 해당 없음 | 평가 코드 없음 |
| V 사실/추측 구분 | **통과** | 전문은 원문 파일 해시로 잠그고, 법적 해석(H1~H4)은 추측으로 단정하지 않고 소유자 확인 항목으로 올린다. 실기기 1회 확인이 완료 조건 |
| 개발 방식 | 통과 | 계약 먼저·테스트 먼저, 한국어 커밋, 기능 브랜치 |
| 거버넌스 | 통과 | 헌법 무개정, `SCREEN_TEXT_ALLOWLIST` 무변경 |

설계 후 재평가: 통과(변경 없음).

## Project Structure

### Documentation

```text
specs/101-license-notice/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/license-page.md       # 사이트 페이지 계약 LP1~LP10
├── contracts/license-row.md        # 앱 행·주소·문구 계약 LR1~LR6, LK1~LK3
├── sources/*.txt                   # curl로 받은 원문(정본)
└── checklists/requirements.md
```

### Source Code

```text
site/licenses/index.html            # 새 고지 페이지 (lang ko, 토큰·서체·site.css 재사용)
site/index.html                     # 목록에 링크 한 줄 추가
src/app/policy-links.ts             # LICENSES_URL 한 줄
src/i18n/catalogs/ko/license-links.ts   # 새 영역 { row }
src/i18n/catalogs/ko/index.ts       # 영역 등록
src/ui/settings-text.ts             # LICENSE_LINKS_TEXT
src/ui/SettingsScreen.tsx           # onOpenLicenses·licensesFailedText 속성, 행 testID settings-licenses
App.tsx                             # 배선 (linkFailed 유니온에 "licenses")
__tests__/privacy/license-page.test.ts          # LP1~LP10
__tests__/privacy/policy-links.test.ts          # LICENSES_URL을 L1·L2에 포함 (추가만)
__tests__/privacy/site-pages.test.ts            # PAGES에 licenses/index.html 추가
__tests__/ui/settings-license-row.test.tsx      # LR1~LR6
__tests__/i18n/license-links.test.ts            # LK1~LK3 (식별자 비노출·영역 격리)
__tests__/i18n/ko-golden.test.ts                # ADDED_AFTER_GOLDEN에 "오픈소스 라이선스" 한 줄
specs/101-license-notice/sources/    # 원문 정본(curl) — prettier 대상 아님
docs/roadmap/README.md              # 스펙 101 표시(이미) → 완료 시 이력으로 이동
```

**Structure Decision**: 086(방침·지원)의 구조를 그대로 따른다 — 주소는 `policy-links.ts` 한 곳, 화면은 콜백만 받고 조립부(`App.tsx`)가 주소와 여는 통로를 넘기며, `App.tsx` 배선은 소스를 읽어 잠근다(055·059·083·086 선례).

## Complexity Tracking

위반 없음.

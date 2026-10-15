# Implementation Plan: 개인정보처리방침·지원 페이지와 데이터 선언

**Branch**: `086-privacy-policy` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/086-privacy-policy/spec.md`, 설계 `docs/superpowers/specs/2026-10-15-privacy-policy-design.md`

## Summary

두 스토어에 낼 개인정보처리방침·지원 페이지를 저장소의 `site/`에 한국어 정적 HTML로 쓰고, GitHub 공식 Pages 워크플로로 게시한다(자리표시자가 남으면 게시 실패). 설정 「정보」 묶음에 두 행을 더해 OS 브라우저로 연다. iOS 위치 권한 문구에 좌표 전송 사실을 더하고, Play 데이터 보안·App Privacy 답변 초안을 쓴다. 방침이 기대는 코드의 사실(분석 SDK 없음·외부 주소·지오코딩 통로)과 방침의 외부 전송 항목을 기기 없는 테스트가 한 표로 대조한다.

## Technical Context

**Language/Version**: TypeScript(앱·테스트), HTML/CSS(사이트), GitHub Actions YAML

**Primary Dependencies**: 기존 것만 — React Native `Linking`, jest·RNTL. 새 의존성 0. 워크플로는 GitHub 공식 Action 넷(research R1)

**Storage**: 없음(설정 겹의 지역 상태 하나)

**Testing**: jest `logic`(사이트·사실·링크·워크플로·문구·통로), jest `ui`(설정 행), 위반 주입, 실기기 dev 1회

**Target Platform**: 앱 — 안드로이드·iOS(설정 행), iOS(위치 문구). 사이트 — 공개 웹(GitHub Pages)

**Project Type**: 모바일 앱 + 정적 사이트 + CI 워크플로

**Performance Goals**: 해당 없음

**Constraints**: 퍼블릭 저장소(워크플로에 비밀 0), 사이트는 외부 자원 0, 원칙 V(근거 없는 단정 0), 다른 세션과 겹치는 파일(`SettingsScreen.tsx`·`settings.ts`·`ko-golden.test.ts`·`App.tsx`·`AGENTS.md`·로드맵)은 「정보」 묶음과 꼭 필요한 줄만 고친다

**Known limit**: CI(`ci.yml`)는 `docs/**`만 바뀐 커밋에서 돌지 않는다 — 선언 초안만 고친 커밋은 L4·D 규칙이 다음 코드 변경 때까지 검사되지 않는다. 선언 초안을 고치면 `npm test`를 로컬에서 돌린다(AGENTS 086 절에 남긴다).

**Scale/Scope**: 페이지 셋, 설정 행 둘, 문구 셋, 워크플로 하나, 테스트 파일 여섯 안팎

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론 경로를 건드리지 않는다. 방침이 「일기는 기기에서 쓴다」를 말할 뿐 |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·일기 무변경 |
| III. 캐릭터는 모델 위에 | 통과 | 방침·지원 페이지에 모델 이름·파라미터를 쓰지 않는다(「모듈」로 부른다). Hugging Face는 내려받는 곳으로만 이름을 쓴다 — 모델 식별자가 아니다 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 사실 잠금 테스트는 소스 선언을 읽을 뿐 모델 출력을 재지 않는다 |
| V. 관측과 추측을 구분 | 통과(핵심) | 방침 문장마다 근거 주석, 미실측은 「수 있다」·「대개」, 선언 초안에 표식 열. 실기기 확인을 건너뛰지 않는다 |
| 개발 방식 | 통과 | 계약(contracts/) → 테스트 먼저, 한국어 커밋, 기능 브랜치 |

Phase 1 뒤 재확인: 변화 없음(통과).

## Project Structure

### Documentation (this feature)

```text
specs/086-privacy-policy/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── site-pages.md
│   ├── policy-facts.md
│   ├── pages-workflow.md
│   ├── settings-rows.md
│   └── declarations.md
└── tasks.md            # speckit-tasks
```

### Source Code (repository root)

```text
site/                                   # 새로 — 게시되는 것은 이 폴더뿐
├── .nojekyll
├── index.html
├── privacy/index.html
└── support/index.html

.github/workflows/pages.yml             # 새로

src/app/policy-links.ts                 # 새로 — 두 URL의 유일한 자리
src/app/browser-port.ts                 # 새로 — Linking.openURL 통로(호출 시점 require)
src/ui/SettingsScreen.tsx               # 「정보」 묶음에 두 행
src/i18n/catalogs/ko/settings.ts        # 문구 셋
App.tsx                                 # 설정 조립부: 여는 동작·실패 줄 상태
app.json                                # iOS 위치 문구

docs/store/privacy-declarations.md      # 새로 — 선언 초안

__tests__/privacy/outbound.ts           # 새로 — 외부 전송 목록·허용 호스트·금지 SDK·빼는 파일
__tests__/privacy/read-site.ts          # 새로 — 사이트 읽기·표식·자리표시자 헬퍼(테스트 공용)
__tests__/privacy/site-pages.test.ts    # 새로 — S1~S10
__tests__/privacy/policy-facts.test.ts  # 새로 — F1~F6
__tests__/privacy/policy-links.test.ts  # 새로 — L1~L5
__tests__/privacy/declarations.test.ts  # 새로 — D1~D6
__tests__/ci/pages-workflow.test.ts     # 새로 — P1~P8
__tests__/app/browser-port.test.ts      # 새로 — B1·B3
__tests__/ui/settings-policy-rows.test.tsx  # 새로 — R1~R5, A1·A2(App.tsx 소스)
__tests__/config/ios-permissions.test.ts    # T3
__tests__/i18n/ko-golden.test.ts            # T2 — ADDED_AFTER_GOLDEN
__tests__/onboarding/no-react-native-dynamic-import.test.ts  # B2 — 대상 목록에 browser-port
```

**Structure Decision**: 사이트는 앱 번들 밖(`site/`)이라 062 화면 문구 검사·prettier 대상이 아니다. 검증용 표는 `__tests__/privacy/`에 둔다(research R4).

## 순서와 의존

1. 계약 테스트를 먼저 쓴다(실패 확인) — 사실(F)·링크(L)·워크플로(P)·사이트(S)·선언(D)·화면(R)·통로(B)·문구(T).
2. `outbound.ts` 표 → `policy-links.ts` → `browser-port.ts`.
3. 사이트 원문 셋(근거 주석 포함) → 선언 초안.
4. `pages.yml`.
5. 카탈로그 → `SettingsScreen` → `App.tsx` 조립 → 골든·동적 import 대상 목록.
6. `app.json` 문구.
7. `npm test`·`npm run lint`·위반 주입 → 실기기(소유자에게 먼저 묻기) → 게시(소유자) → 실기기 재확인.
8. AGENTS에 086 절, 로드맵 갱신(완료 처리 커밋에서).

## Complexity Tracking

없음. 새 의존성·새 네이티브 코드·새 저장 파일 0.

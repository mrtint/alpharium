# Implementation Plan: 디자인 시스템 기반과 웹 재디자인

**Branch**: `089-design-system-web` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/089-design-system-web/spec.md`, 설계 `docs/superpowers/specs/2026-10-17-design-system-design.md`

## Summary

`design/tokens.json`을 토큰의 정본으로 세우고, 작은 생성 스크립트(결정적, prettier를 부르지 않고 같은 모양으로 직접 씀)가 (1) `src/ui/theme/tokens.ts` 안의 생성 영역(`COLORS`·`RADIUS`·`TYPE`·`FONT`)과 (2) `site/assets/tokens.css`를 다시 쓴다. 웹 서체는 Pretendard 공식 분할 배포본(npm `pretendard@1.3.9`의 `woff2-dynamic-subset`, 굵기 400·600·700)을 `site/assets/fonts/`에 바이트 그대로 둔다. `site/` 세 페이지는 `tokens.css`·`fonts.css`·`site.css`만 링크하고 페이지별 스타일을 갖지 않는다. 규칙 문서 `design/DESIGN.md`를 쓰고 AGENTS.md·CLAUDE.md가 가리킨다. 정본↔생성물 동기, 앱 값 불변, 대비, 사이트 하드코딩 금지, 서체 파일·용량, 문서 이름 실재를 기기 없는 테스트가 잠근다. 앱 화면 코드는 바뀌지 않는다.

## Technical Context

**Language/Version**: TypeScript(생성 코어·테스트), `.mts` CLI(Node 24, 기존 `scripts/*.mts` 방식), CSS3·HTML(사이트)

**Primary Dependencies**: 기존 것만 — jest(생성 영역이 prettier 기준을 지키는지는 테스트가 `prettier --check` CLI로 본다). 새 의존성 0. 서체 가져오기는 npm 레지스트리 tarball을 Node `fetch`로 받는다(저장소 의존성에 올리지 않는다)

**Storage**: 파일(`design/tokens.json`, 생성물, `site/assets/**`)

**Testing**: jest `logic`(`__tests__/design/` 새 폴더), 기존 `theme-tokens`·`font-rules`·`privacy/*`·`ci/pages-workflow` 유지, 위반 주입, 헤드리스 크롬 캡처, dev 빌드 1회(앱 색 불변)

**Target Platform**: 사이트 — 공개 웹(GitHub Pages, 모바일·데스크톱 브라우저, 라이트·다크). 앱 — 값 불변(안드로이드·iOS)

**Project Type**: 모바일 앱 + 정적 사이트 + 개발 스크립트

**Performance Goals**: 페이지당 첫 로딩 글꼴 합계 1,000,000바이트 이하(FR-010a) — 방침 페이지 실측 세 굵기 합계 약 59만(research R2)

**Constraints**: 퍼블릭 저장소, 사이트 외부 자원 0(글꼴·스타일 포함), 서체 파일 수정 금지(OFL), 앱 번들·tailwind·앱 토큰 테스트 무변경, 다른 세션과 겹치는 파일(`AGENTS.md`·`CLAUDE.md`·로드맵·`tokens.ts`)은 필요한 줄만 고친다

**Scale/Scope**: 토큰 항목 수십 개, 사이트 페이지 3, 서체 파일 276(굵기 셋 × 92)과 CSS, 새 테스트 파일 아홉

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 해당 없음 | 추론 경로 무변경 |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·일기 무변경 |
| III. 캐릭터는 모델 위에 | 해당 없음 | 모델·캐릭터를 건드리지 않는다 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 대비 검증은 사람이 정한 쌍 표를 계산하는 정적 검사이고 모델 출력을 재지 않는다. 글꼴 용량 검사는 파일 크기 합산이다 |
| V. 관측과 추측을 구분 | 통과(핵심) | 토큰 값은 사람이 정한 상수 — 스크립트는 옮기기만 한다(계산·파생 금지, FR-002). 대비는 계산값, 용량은 실측, 미실측(캐시·실제 브라우저)은 quickstart에 「미확인」으로 적는다. 앱 번들이 바뀌므로 dev 빌드로 색 불변을 한 번 본다 |
| 개발 방식 | 통과 | contracts 먼저, 테스트 먼저, 한국어 커밋, 기능 브랜치(워크트리) |

Phase 1 뒤 재확인: 변화 없음(통과).

## Project Structure

### Documentation (this feature)

```text
specs/089-design-system-web/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── tokens-json.md        정본 모양·규칙
│   ├── generated-outputs.md  생성 영역·tokens.css 모양, 생성기 계약
│   ├── site-style.md         사이트 링크·공용 클래스·하드코딩 금지
│   └── guards.md             테스트 열 가지(G1~G10)와 위반 주입 목록
├── checklists/requirements.md
└── tasks.md                  (speckit-tasks)
```

### Source Code (repository root)

```text
design/
├── tokens.json                       정본(신규)
└── DESIGN.md                         규칙 문서(신규)

scripts/design/
├── tokens-build.ts                   결정적 코어: 정본 → {tokensTsRegion, tokensCss} (jest와 CLI가 함께 import)
├── build-tokens.mts                  CLI: 생성 영역과 tokens.css를 다시 쓴다 / --check
└── import-pretendard-web.mts         CLI: npm tarball → site/assets/fonts (무결성 검증, 바이트 복사, fonts.css·source.json 생성)

src/ui/theme/tokens.ts                생성 영역 표식 안의 COLORS·RADIUS·TYPE·FONT가 바뀐다(값·모양 동일)

site/
├── index.html · privacy/index.html · support/index.html   <style> 제거, 링크 셋 추가(구조·문장 무변경)
└── assets/
    ├── tokens.css                    생성
    ├── fonts.css                     import 스크립트가 생성(@font-face만)
    ├── site.css                      공용 스타일(수기, 변수만 참조)
    └── fonts/ (woff2 276개, LICENSE.txt, source.json)

__tests__/design/                     G1~G10 (+ fixtures/app-tokens-before.json)
__tests__/privacy/site-pages.test.ts  S3 한 단언만 좁힌다(FR-012)
AGENTS.md · CLAUDE.md                 디자인 규칙 문서 안내 한 줄씩, AGENTS에 089 결론 절은 구현 뒤에
docs/roadmap/README.md                이 과제 항목과 후속 둘(이미 올림)
```

**Structure Decision**: 앱 토큰은 별도 생성 파일이 아니라 `tokens.ts` 안의 생성 영역으로 둔다(research R4) — 앱 토큰 테스트들이 `tokens.ts` 소스를 직접 읽어 `const`·리터럴·키 수·서체 규칙을 단언하고 있어 파일을 나누면 그 테스트를 고쳐야 하기 때문이다. 생성 코어는 `.ts`로 두어 jest와 `.mts` CLI가 함께 쓴다.

## Complexity Tracking

위반 없음.

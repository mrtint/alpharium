# Implementation Plan: 앱 아이콘을 노을 「P.」로 바꾼다

**Branch**: `117-sunset-p-icon` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: `specs/117-sunset-p-icon/spec.md`, 설계 `docs/superpowers/specs/2026-11-12-sunset-p-icon-design.md`

## Summary

아이콘 정본을 「토큰 색 + 기하 도형」(`design/icon.json`, 102)에서 「그림 SVG 한 개 + 배치 값」으로 바꾼다. `design/icon-art.svg`(후보 원본에서 마침표 원만 `(508, 875)`로 옮긴 것)가 그림·색의 유일한 정본이고, `design/icon.json`(v2)은 그림 중심·출력별 배율·안전 영역만 가진다. 생성기(`scripts/design/icon-build.ts`)는 출력마다 SVG 문자열을 조립해(배경 사각형 + `translate·scale·translate` 래퍼 안의 그림) `@resvg/resvg-js`로 래스터화한다 — 기하 도형·3×3 슈퍼샘플링 코드는 걷는다. 출력 목록(PNG 7 + 미리보기 SVG 1)은 102 그대로다. 계약 테스트는 새 정본에 맞춰 고치고, 문서(DESIGN.md·AGENTS.md)·로드맵·`app.json` adaptive 배경색을 정리한다.

## Technical Context

**Language/Version**: TypeScript(스크립트는 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON … .mts`, Node 24), Expo SDK 57

**Primary Dependencies**: 새 devDependency `@resvg/resvg-js@2.6.2`(정확한 버전, 플랫폼 바이너리 optionalDependencies). 기존 `pngjs`는 PNG 인코딩·읽기에 계속 쓴다. 앱 번들에는 들어가지 않는다(스크립트·테스트 전용).

**Storage**: N/A(파일 생성물)

**Testing**: jest `logic`(`__tests__/design/icons.test.ts`), `build:icons --check`, 갤럭시 SM-S901N 런처(`expo prebuild --clean` 뒤), iPhone 14(소유자가 봄)

**Target Platform**: 개발자 기계(macOS)의 생성기 + iOS·Android 런처

**Project Type**: mobile-app(디자인 자산 파이프라인 변경)

**Performance Goals**: 없음(생성기는 몇 초)

**Constraints**: PNG 손제작 금지, 숫자(배율·중심)는 사람이 정한 값으로 적는다(원칙 V), 화면 한글은 `src/i18n`만(이 과제는 `src/` 변경 없음), 16진수 색은 `design/icon-art.svg`에만

**Scale/Scope**: 파일 — 새 `design/icon-art.svg`·`design/icon.json` 개정·`scripts/design/icon-build.ts`·`scripts/design/build-icons.mts`(옛 `Rgb`·토큰 의존 정리)·`package.json`/lock·`app.json`·생성물 PNG 7·`design/icon.svg`·`__tests__/design/icons.test.ts`·`DESIGN.md`·`AGENTS.md`·로드맵·후보 폴더 삭제

## Constitution Check

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 해당 없음 |
| II 프롬프트 | 해당 없음 |
| III 캐릭터는 모델 위에 | 해당 없음 |
| IV 측정 장치 없음 | 측정·채점 코드를 두지 않는다(감싸는 원 계산은 계약 테스트의 검사). 통과 |
| V 관측과 추측 | 배율 0.784·1.0·0.5와 중심은 사람이 정한 값(중심은 후보 README의 Chromium 실측)으로 정본에 적고, 런처에서 못 본 것은 못 봤다고 적는다. iPhone 홈 화면은 소유자가 본 결과를 받기 전에 「확인했다」고 쓰지 않는다. 합성 데이터로 모델 품질을 평가하지 않는다. 통과 |
| 개발 방식 | 계약(contracts/icon-source.md)을 먼저 정하고 테스트를 먼저 쓴다. 한국어 커밋. 브랜치 `117-sunset-p-icon`. 통과 |

사후 재평가(Phase 1 뒤): 새 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/117-sunset-p-icon/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/icon-source.md
├── checklists/requirements.md
└── tasks.md          # /speckit-tasks
```

### Source Code (repository root)

```text
design/
├── icon-art.svg          # 새 — 그림 정본(후보 source.svg + 마침표 이동)
├── icon.json             # 개정 v2 — 배치 값
├── icon.svg              # 생성물(iOS 합성 SVG)
└── icon-candidates/      # 삭제
scripts/design/
├── icon-build.ts         # 개정 — SVG 조립 + resvg 래스터화
└── build-icons.mts       # 개정 — 읽는 입력(그림 파일 추가, 토큰 읽기 제거)
assets/                   # 생성물 5
store/ko/                 # 생성물 2
app.json                  # adaptive backgroundColor
__tests__/design/icons.test.ts
design/DESIGN.md, AGENTS.md, docs/roadmap/README.md
```

**Structure Decision**: 래스터화는 `icon-build.ts` 한 곳, 입력은 그림 파일 + 배치 값 둘뿐이다(토큰 색은 더 읽지 않는다). 같은 규칙의 복제를 막으려고 16진수 가둠 검사는 테스트 한 곳에 둔다.

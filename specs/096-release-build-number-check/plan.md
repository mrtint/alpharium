# Implementation Plan: 릴리스 빌드 번호 사전 점검

**Branch**: `096-release-build-number-check` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: `specs/096-release-build-number-check/spec.md`. 설계 원본: `docs/superpowers/specs/2026-10-22-release-build-number-check-design.md`.

## Summary

안드로이드(076)·iOS(075) 릴리스 워크플로에 같은 모양의 단계 「번호 점검」을 넣는다. 단계는 `npm ci`·prebuild 앞에서 저장소 스크립트 하나(`.mts`)를 불러 스토어의 마지막 번호를 읽고(Play: 편집을 열어 번들 목록을 읽은 뒤 버림 / ASC: 이 앱·이 버전의 빌드 목록), 순수 판정 함수로 이번 번호와 견준다. 같거나 작으면 이미 있는 번호와 올릴 값을 `::error::`로 밝히고 실패한다. 읽지 못해도 실패한다. 앱 코드(`src/`) 변경은 0줄, 새 의존성 0이다.

## Technical Context

**Language/Version**: GitHub Actions YAML + bash, Node 24 타입 스트리핑 TypeScript(`scripts/`의 기존 방식, `.ts` import·`.mts` 진입점). 테스트는 jest TypeScript.

**Primary Dependencies**: Node 내장 `fetch`·`crypto`만. 기존 `play-upload.ts`·`testflight-notes.ts`의 인증·호출 도우미를 재사용(복제 금지).

**Storage**: N/A.

**Testing**: `__tests__/scripts/version-check.test.ts`·`build-number-check.test.ts`(순수 판정), `play-upload.test.ts`·`testflight-notes.test.ts`에 조회 함수 시험 추가(대역 fetch), `__tests__/ci/*-release-workflow.test.ts` 계약 추가·수정, `android-release-sources.test.ts` 류의 소스 계약(비밀 출력·외부 import 금지)에 새 스크립트 포함.

**Target Platform**: ubuntu / macOS GitHub 러너(단계 자체는 Node만 쓴다).

**Project Type**: mobile-app 저장소의 CI 설정(앱 소스 무변경).

**Performance Goals**: 번호 점검은 호출 3~5회, 10초 안쪽(미실측 — 처음 돌릴 때 본다).

**Constraints**: 퍼블릭 저장소 — 076·075 비밀 방어 계약 불변. 읽기 전용(Play 편집은 커밋하지 않고 버림). 새 단계는 필요한 비밀만 단계 `env`로 받는다.

**Scale/Scope**: 신규 — 스크립트 `.ts` 2 + `.mts` 2, 테스트 2 + 기존 테스트 확장 4. 수정 — 두 워크플로, `play-upload.ts`·`testflight-notes.ts`(도우미 추출·조회 함수 추가), AGENTS.md, 로드맵.

## Constitution Check

| 원칙          | 판정      | 근거                                                                                                                                                                                |
| ------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I·II·III      | 해당 없음 | 앱·추론·로스터 무변경                                                                                                                                                               |
| IV 측정 장치  | 통과      | 평가·채점 코드 없음. 번호 비교는 배포 점검이다                                                                                                                                      |
| V 사실과 추측 | **적용**  | Play `bundles.list`·ASC `builds` 실응답, 서비스 계정·키의 읽기 권한은 대역으로만 시험했다. 소유자 요청 실행 전까지 「못 본 것」으로 문서에 남긴다. 못 읽으면 건너뛰지 않고 실패한다 |
| 개발 방식     | 통과      | 계약 먼저·테스트 먼저, 한국어 커밋, 기능 브랜치(워크트리)                                                                                                                           |

게이트 위반 없음. Post-design 재평가: 변동 없음.

## Project Structure

```text
specs/096-release-build-number-check/
├── plan.md  research.md  data-model.md  quickstart.md  tasks.md
├── contracts/ scripts-contract.md  workflow-contract.md
└── checklists/requirements.md

scripts/android-release/  version-check.ts (순수) · version-check.mts (진입점) · play-upload.ts (+listBundleVersionCodes)
scripts/ios-release/      build-number-check.ts (순수) · build-number-check.mts (진입점) · testflight-notes.ts (+listBuildNumbers)
.github/workflows/        android-release.yml · ios-release.yml (「번호 점검」 단계)
__tests__/scripts/ · __tests__/ci/
```

**Structure Decision**: 판정(순수)·조회(주입된 fetch)·진입점(환경변수·파일·종료 코드)을 076·075처럼 나눈다. 인증(JWT)·호출 도우미는 기존 파일에서 export한다.

# Implementation Plan: 표본 사진의 정체를 원본으로 — 썸네일 변형에 층 1이 멈추지 않게

**Branch**: `084-sample-photo-identity` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/084-sample-photo-identity/spec.md`

## Summary

같은 Commons 썸네일 URL이 데이터센터마다 다른 바이트를 줘(codfw = 목록, eqiad = 다름 — 실측) 맥에서 표본 내려받기가 멈추고 층 1이 앞단에서 중단된다.
사진 목록 항목에 **원본 sha1**(사진의 정체)을 두고 썸네일 해시를 **받아들인 해시 목록**으로 바꾼다. 내려받기는 처음 보는 썸네일 바이트를 만나면
Commons API로 원본 sha1·크기를 읽어 (1) 원본이 같고 (2) 바이트가 그 원본의 썸네일 모양(JPEG, 폭 = `widthPx`, 높이 = 원본 비율 ±1px)일 때만 받아들여
목록에 덧붙인다. 표식 지문은 원본 sha1을 쓴다. 표본 보장·층 1 실행기·앱 코드(`src/`)는 바꾸지 않는다.

## Technical Context

**Language/Version**: TypeScript(Node 22+, `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON`로 `.mts`/`.ts`를 직접 실행 — 070과 같다)

**Primary Dependencies**: Node 전역 `fetch`·`node:crypto`·`node:fs`. 새 의존성 없음.

**Storage**: `scripts/e2e-sample/photos.json`(저장소, 목록), `scripts/e2e-sample/.cache/`(gitignore, 사진)

**Testing**: jest `logic` 프로젝트(`__tests__/e2e-sample/*.test.ts`, 네트워크는 주입 대역) + 맥·SM-S901N 실측

**Target Platform**: 개발 기계(맥 — TLS 가로채는 네트워크, `NODE_EXTRA_CA_CERTS`) + 안드로이드 전용 테스트 기기

**Project Type**: 개발 도구(e2e 표본 스크립트) — 제품 코드 아님

**Performance Goals**: 원본 조회는 처음 보는 해시·빈 원본 sha1일 때만. 최초 채우기 210회 × 간격 1.1초 ≈ 4분(한 번).

**Constraints**: Wikimedia 정책 — 식별 가능한 UA, 요청 간격 ≥ 1초, 429 백오프. 목록 파일은 성공한 실행에서만 쓴다.

**Scale/Scope**: 사진 210장, 바뀌는 파일 7개 안팎(`catalog.ts`·`fetch.ts`·새 `commons.ts`·`plan.ts`·`sample-fetch.mts`·`photos.json`·테스트 넷) + 문서.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 해당 없음·통과 | 앱 추론 경로를 건드리지 않는다. Commons API는 개발 도구의 사진 내려받기 확인용이지 추론이 아니다. |
| II 화자 | 해당 없음 | 프롬프트·일기 무변경. |
| III 캐릭터 | 해당 없음 | 모델·로스터 무변경. |
| IV 측정 장치 | 통과 | 제품 코드(`src/`)에 아무것도 더하지 않는다(070 K-1 소스 계약이 그대로 잠근다). 표본은 모델 품질을 재지 않는다. |
| V 관측과 추측 | 통과 | 원인(데이터센터별 바이트)은 엣지별 실측으로 확인했고 문서에 실측으로 적는다. 확인하지 못한 바이트는 받아들이지 않는다(모르는 것을 같다고 채우지 않는다). 완료는 맥 + SM-S901N 실측으로 판정한다. |
| 개발 방식 | 통과 | 계약(contracts/) 먼저, 테스트 먼저. 기능 브랜치. 한국어 커밋. |

Post-design re-check(Phase 1 뒤): 위 판정 그대로 — 설계가 `src/`에 닿는 곳이 없고, 새 외부 호출은 주입 통로 하나(`lookupJson`)뿐이다.

## Project Structure

### Documentation (this feature)

```text
specs/084-sample-photo-identity/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── photo-identity.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
scripts/
├── sample-fetch.mts            # 바뀜: 목록이 바뀐 성공 실행에서만 photos.json 쓰기, 받아들인 변형 출력
└── e2e-sample/
    ├── catalog.ts              # 바뀜: sha256 → string[], originalSha1 필드, 검사
    ├── commons.ts              # 새 파일: Commons 원본 조회(제목 뽑기·API 응답 해석·실제 통로)·JPEG 크기 읽기·모양 판정(순수)
    ├── fetch.ts                # 바뀜: 처음 보는 해시 → 원본 확인 → 덧붙이기, 기록 모드 확장
    ├── plan.ts                 # 바뀜: fingerprint가 originalSha1을 쓴다
    └── photos.json             # 바뀜: 210개 이전(배열 해시 + originalSha1), 15장에 eqiad 변형 덧붙임

__tests__/e2e-sample/
├── catalog.test.ts             # 바뀜
├── commons.test.ts             # 새 파일
├── fetch.test.ts               # 바뀜
├── sample-fetch-entry.test.ts  # 새 파일(진입점 소스 계약 — W-1)
├── plan.test.ts                # 바뀜(지문)
└── ensure.test.ts              # 바뀜(픽스처 모양만)

specs/070-e2e-sample-seed/contracts/{sample-manifest,sample-seeding}.md, specs/070-e2e-sample-seed/data-model.md, AGENTS.md  # 문서
```

**Structure Decision**: 070의 `scripts/e2e-sample/` 안에서 고친다. Commons API 해석은 내려받기 순서 제어(`fetch.ts`)와 떼어 `commons.ts` 한 곳에 둔다 —
URL 만들기·응답 해석·JPEG 크기 읽기는 순수 함수로 테스트하고, `fetch.ts`는 주입된 `lookupJson`(원본 조회 응답 JSON)만 받고 해석은 `commons.ts`에 맡긴다.

## Complexity Tracking

위반 없음.

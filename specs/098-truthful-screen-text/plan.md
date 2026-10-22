# Implementation Plan: 화면 문구를 사실대로

**Branch**: `098-truthful-screen-text` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: `specs/098-truthful-screen-text/spec.md`. 설계 원본: `docs/superpowers/specs/2026-10-22-truthful-screen-text-design.md`.

## Summary

카탈로그(`src/i18n/catalogs/ko/{download,settings,home}.ts`)의 문자열 여덟 개(슬라이드 제목·본문, 장소 보조 줄 둘, 다시 쓰기·지우기 본문, 해라체 둘)를 확정 문장으로 바꾸고, 홈 재료 칸 장소 값 줄에 접근성 라벨을 달며(`MaterialGrid.tsx`, 문구는 `home.material.placesA11y`), 지원 페이지 FAQ 끝에 항목 하나를 더한다. 동작·데이터는 바뀌지 않는다. 062 문구 골든은 다시 쓰지 않고 `CHANGED_AFTER_GOLDEN`·`ADDED_AFTER_GOLDEN`에 올린다.

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo SDK 57), 정적 HTML(`site/`).

**Primary Dependencies**: 신규 없음.

**Storage**: N/A.

**Testing**: jest — 카탈로그 값은 `logic`(`.ts`), 화면 렌더는 `ui`(`.tsx`). 실기기는 SM-S901N dev.

**Target Platform**: Android·iOS(문장은 플랫폼 공통).

**Project Type**: mobile-app.

**Constraints**: 화면 한글은 카탈로그에만(062). 진행 문구에 바이트·퍼센트·시간 없음(045). 짐작 상수(100m)를 화면·FAQ에 적지 않는다. 지원 페이지는 FAQ 끝 항목만 추가(백업 과제와 같은 파일).

**Scale/Scope**: 수정 — 카탈로그 3, `MaterialGrid.tsx`, `site/support/index.html`, 주석 3곳, `.maestro/writing-monologue.yml` 한 줄, 테스트 단언 약 10파일, 골든 테스트 표.

## Constitution Check

| 원칙 | 판정 | 근거 |
| ---- | ---- | ---- |
| I·II·III | 해당 없음 | 추론·프롬프트·로스터 무변경 |
| IV 측정 장치 | 통과 | 측정·채점 코드 없음 |
| V 사실과 추측 | **적용** | 문구가 실제 동작과 같아지는 과제다. 0곳 라벨은 관측된 0에만, 모름·권한 없음에는 달지 않는다. 장소 묶는 거리(짐작)는 쓰지 않는다 |
| 062 | 적용 | 새 접근성 문구는 카탈로그 새 항목. 골든 비재작성 |

게이트 위반 없음. Post-design 재평가: 변동 없음.

## Project Structure

```text
specs/098-truthful-screen-text/
├── plan.md  research.md  data-model.md  quickstart.md  tasks.md
├── contracts/copy-contract.md
└── checklists/requirements.md

src/i18n/catalogs/ko/  download.ts · settings.ts · home.ts (+material.placesA11y)
src/ui/MaterialGrid.tsx (값 줄에 접근성 라벨)
site/support/index.html (FAQ 끝 항목)
__tests__/i18n/ko-golden.test.ts (표) · __tests__/ui/* · __tests__/privacy/site-pages.test.ts
.maestro/writing-monologue.yml (notVisible 문자열)
```

**Structure Decision**: 새 파일 없이 기존 카탈로그·테스트를 고친다. 접근성 라벨 문구는 `home.material`의 함수 항목(`placesA11y(n)`)으로 두고 `MATERIAL_TEXT`로 읽는다.

# Implementation Plan: 기능→흐름 대응표와 안드로이드 층 1 화면 흐름 e2e

**Branch**: `069-e2e-layer1-screen-flows` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: `specs/069-e2e-layer1-screen-flows/spec.md`, 설계 `docs/superpowers/specs/2026-10-10-e2e-layer1-design.md`

## Summary

새 앱 코드는 없다. 만드는 것은 (1) 대응표 문서, (2) 실행기의 층 1 모드(`--layer1`)와 그 순수 로직, (3) 쓴 날 픽스처, (4) 새 Maestro 흐름 셋과 층 1 목록이다.
접근: 실행기 확장은 `scripts/layer1/*.ts`의 **순수 함수**(기준값·픽스처 생성·대응표 검사)와 **기기 통로**(`adb`·`run-as`)로 나누고,
순수 함수와 정합성(흐름 파일 ↔ 대응표 ↔ `FLOWS`, 픽스처 ↔ 실제 `deserializeEntry`, 설정 파일 ↔ 앱이 읽는 `preferences/*.json`)은 기기 없는 jest 계약 테스트가 지킨다.
기기에서만 보이는 것(재시작 반복, 쓸기, 행 훑기)은 Maestro 흐름이 지킨다.

## Technical Context

**Language/Version**: TypeScript(`scripts/*.ts`, node 24 타입 제거로 직접 실행 — 기존 `scripts/seed-day.mts` 관례: 확장자를 적은 import), 실행기 `scripts/run-device-tests.mjs`(ESM), Maestro YAML

**Primary Dependencies**: 추가 없음. `adb`(`run-as`·`push`·`am force-stop`), Maestro(기존), jest(기존)

**Storage**: 기기의 앱 전용 `files/preferences/*.json`·`files/diary/*.json`·`files/vision-cache/*`(debug 빌드의 `run-as`로만 닿는다)

**Testing**: jest `logic` 프로젝트(`__tests__/e2e/*.test.ts`: 순수 로직·정합성), Maestro 층 1 흐름(실기기), 위반 주입

**Target Platform**: 안드로이드 dev(debug) 빌드, 전용 테스트 기기. iOS·release는 범위 밖

**Project Type**: mobile-app 저장소의 개발 도구(제품 코드 변경 없음)

**Performance Goals**: 층 1 전체가 기기 준비 포함 수 분 안(모델 내려받기 0, `pm clear` 0). 수치 목표는 두지 않고 실측으로 기록한다(원칙 V)

**Constraints**: 가짜 추론 금지(042), 본문 단언 금지(원칙 IV), `FLOWS` 등록, 기존 `FLOWS` 실행(`pm clear` 포함) 불변, 일기 폴더는 백업 없이 덮어쓴다(전용 기기)

**Scale/Scope**: 흐름 파일 23(+`.maestro/ios/` 4) 분류, 새 흐름 3, 픽스처 일기 3편(사진 1·3·1장), 설정 파일 약 10개

## Constitution Check

*GATE: Phase 0 전·Phase 1 후 확인. 둘 다 통과.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스가 제품 | 통과 | 픽스처는 `scripts/`의 개발 도구이고 앱 번들에 들지 않는다. 제품에 미리 만든 응답을 보여 주는 경로가 생기지 않는다. 층 1은 추론을 돌리지 않으며 가짜 추론으로 초록을 만들지 않는다. |
| II 화자는 휴대폰 | 해당 없음 | 프롬프트·본문 생성에 닿지 않는다. 픽스처 본문은 사람이 쓴 글이며 내용 단언이 없다(FR-023). |
| III 캐릭터는 모델 위 | 해당 없음 | 로스터·화면 노출 변경 없음. 픽스처의 `character`는 로스터의 `quiet`다. |
| IV 측정 장치를 제품에 들이지 않는다 | 통과 | 본문 채점·모델 비교 없음. 픽스처와 도구는 `scripts/`·`__tests__/`에만 있다. `src/`는 한 줄도 바꾸지 않는다. |
| V 관측과 추측 구분 | 통과 | 기준 상태는 앱이 실제로 읽는 파일 목록에서 확정하고(드리프트 가드 테스트), 층 1은 실기기에서 한 번 돈 뒤에만 완료로 쓴다. 기기가 없으면 「건너뜀」. 합성 데이터로 모델 품질을 평가하지 않는다. |
| 개발 방식 | 통과 | 계약(`contracts/`)을 먼저 정하고 테스트를 먼저 쓴다. 한국어 커밋. 기능 브랜치. |

위반 없음 — Complexity Tracking은 비운다.

## Project Structure

### Documentation (this feature)

```text
specs/069-e2e-layer1-screen-flows/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── layer1-runner.md      # --layer1 CLI 계약(종료 코드·보고·순서)
│   ├── baseline-state.md     # 기준 상태가 되돌리는 파일과 값
│   └── flow-map.md           # 대응표 문서의 형식과 기계가 검사하는 불변식
└── tasks.md                  # /speckit-tasks
```

### Source Code (repository root)

```text
docs/e2e/feature-flow-map.md            # 대응표 정본 (FR-001)
package.json                            # "test:layer1" 스크립트 한 줄
scripts/
├── run-device-tests.mjs                # --layer1 분기 + LAYER1_FLOWS 배열 + 대응표 경로 주석
├── layer1/
│   ├── baseline.ts                     # 기준값 표(순수): 파일 → 쓸 내용 | 삭제
│   ├── fixtures.ts                     # 날짜 치환·픽스처 일기 생성(순수)
│   ├── flow-map.ts                     # 대응표 파싱·흐름 파일 대조(순수)
│   ├── device.ts                       # adb/run-as 통로(push, force-stop, 사전 점검)
│   └── runner.ts                       # 사전 점검 → 기준 상태 → Maestro 실행 조립
└── e2e-fixtures/
    ├── diary/{today,yesterday,day-before}.json.tmpl   # 날짜 자리표시자가 든 일기 틀
    └── photos/*.jpg                    # 사진 사본(앱 vision-cache 이름 규칙)
.maestro/
├── restart-persistence.yml             # 새 (FR-019)
├── single-photo-swipe.yml              # 새 (FR-020)
└── settings-developer-sweep.yml        # 새 (FR-021·021a·021b)
__tests__/e2e/
├── baseline.test.ts                    # 드리프트 가드 + 값 계약
├── fixtures.test.ts                    # 실제 deserializeEntry 왕복 + 날짜 치환
├── flow-map.test.ts                    # 모든 흐름 파일이 대응표에, LAYER1_FLOWS ⊆ FLOWS
├── layer1-runner.test.ts               # 보고·중단 갈래(기기 대역 주입)
└── layer1-source-contract.test.ts      # 실행기 소스 계약(pm clear 불변, 모델 불가침)
```

**Structure Decision**: 제품 코드(`src/`)는 건드리지 않는다. 기기에 닿는 코드는 `device.ts` 한 곳, 나머지는 순수 함수로 두어 기기 없이 테스트한다(`scripts/seed/`의 관례). 실행기 `.mjs`는 `--layer1`일 때 `scripts/layer1/runner.ts`를 동적 import한다.

## Phase 0 / Phase 1 산출물

- [research.md](research.md) — 결정과 근거(미지수 해소)
- [data-model.md](data-model.md) — 기준 상태·픽스처·대응표 행
- [contracts/](contracts/) — 실행기·기준 상태·대응표 계약
- [quickstart.md](quickstart.md) — 검증 시나리오

## Complexity Tracking

위반 없음.

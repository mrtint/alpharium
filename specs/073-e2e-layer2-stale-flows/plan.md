# Implementation Plan: e2e 마무리 — 낡은 흐름 정리와 층 2(실제 생성 스모크)

**Branch**: `073-e2e-layer2-stale-flows` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: `specs/073-e2e-layer2-stale-flows/spec.md`, 설계 `docs/superpowers/specs/2026-10-10-e2e-layer2-stale-flows-design.md`

## Summary

두 조각이다. (A) `FLOWS`의 낡은 흐름 셋(`skeleton`·`prompt-preview`·`today-diary`)을 실기기에서 원인별로 가려 고치거나 지운다. (B) 층 1 실행기(069·070)와 같은 구조의 **층 2 실행기**를 만든다 —
`--layer2`가 흐름마다 기준 상태를 다시 만들고(설정 파일·일기 픽스처, 모델 보존, `pm clear` 없음) 흐름 하나씩 `maestro test`로 돌리며, 실제 모델로 쓰는 흐름 넷이 상태 전이까지 확인된다. 끝나면 저장된
일기를 개발 기계로 가져와 경로를 출력한다(채점 없음). 체크리스트 문서·대응표·정합 테스트를 같이 갱신한다. 앱 코드는 건드리지 않는다.

## Technical Context

**Language/Version**: TypeScript(Node `--experimental-strip-types`로 도는 `scripts/**/*.ts`; 069 선례), Maestro YAML, 실행기 `scripts/run-device-tests.mjs`

**Primary Dependencies**: 신규 없음. 기존 `adb`·`maestro`·`run-as`, 069 `scripts/layer1/*`, 070 `scripts/e2e-sample/*`

**Storage**: 기기 `files/preferences/*.json`·`files/diary/*.json`(run-as로 쓰기), 개발 기계 `.cache/layer2/`(gitignore됨) 아래 가져온 일기

**Testing**: jest `logic` 프로젝트(`.ts`) — 실행기 조립(`Layer2Device` 주입), 대응표 정합, 소스 계약; 실기기 dev(SM-G986N) 1회 완주

**Target Platform**: 안드로이드 dev 실기기(전용 테스트 기기). iOS 범위 밖.

**Project Type**: 개발 도구(스크립트·e2e 흐름·문서). 제품 코드 변경 없음.

**Performance Goals**: 층 2 전체 약 10~20분(쓰기 1~4분 × 4 + Maestro 기동 약 35초 × 4 + 기준 상태 재생성). 한도 안에 못 끝나면 실패.

**Constraints**: 가짜 추론 금지(원칙 I·042 교훈), 본문 단언·채점 금지(원칙 IV), 건너뜀·중단은 통과가 아님(원칙 V), `pm clear`·`install` 금지(모델 보존, 069 I-1)

**Scale/Scope**: 흐름 파일 4개 신규(+3 수리/삭제), 실행기 모듈 약 3개, 문서 2개, 테스트 약 4개

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스가 제품 | 통과 | 층 2는 실제 모델·실기기에서 쓴다. 가짜 응답·데스크톱 서버 없음(FR-015) |
| II 화자는 휴대폰 | 해당 없음 | 프롬프트·출력 규칙을 건드리지 않는다 |
| III 캐릭터는 모델 위 | 통과 | 모델 식별자를 단언하지 않는다(기존 흐름의 `assertNotVisible` 검사는 유지만) |
| IV 측정 장치 없음 | 통과 | 흐름은 상태 전이만 단언한다. 일기를 가져오는 것은 사람이 읽기 위한 출력이고 점수·비교·품질 코드가 없다(FR-013·FR-018). 소스 계약으로 `judge`·점수 어휘 부재를 잠근다 |
| V 관측/추측 구분 | 통과 | 건너뜀·중단을 통과로 보고하지 않고, 낡은 흐름 원인은 실기기에서 관측한 뒤에 판정하며, 못 돈 것은 「미확인」으로 적는다 |
| 개발 방식 | 통과 | 계약·테스트 먼저, 한국어 커밋, 브랜치 `073-…` |

위반 없음 → Complexity Tracking 비어 있음. 설계(Phase 1) 뒤 재점검: 같음.

## Project Structure

### Documentation (this feature)

```text
specs/073-e2e-layer2-stale-flows/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── layer2-runner.md      # 실행기 계약 (L2-1~)
│   ├── layer2-flows.md      # 흐름 넷의 전제·단언·상태 전이
│   └── stale-flows.md       # 낡은 흐름 판정 절차와 결과 기록
└── tasks.md
```

### Source Code (repository root)

```text
scripts/
├── run-device-tests.mjs                 # --layer2 분기, LAYER2_FLOWS·FLOWS 등록, 낡은 흐름 정리 주석
├── layer1/
│   ├── runner.ts                        # 기준 상태 단계를 prepareBaseline()으로 뽑는다(층 1 동작 불변)
│   └── device.ts                        # adbDevice()에 pullFile 구현 추가 (Layer1Device 인터페이스는 그대로, 층 2가 Layer2Device = Layer1Device & {pullFile}로 요구)
└── layer2/
    ├── flows.ts                         # 층 2 흐름 표(파일·전제 상태·완료 한도) — 순수
    ├── runner.ts                        # runLayer2(): 흐름마다 기준 상태 → maestro 1개 → 일기 가져오기
    └── with-sample.ts                   # 표본 보장 앞단 + YESTERDAY 값(층 1 with-sample과 같은 모양)

.maestro/
├── layer2-write-and-read.yml            # 흐름 1
├── layer2-open-app-writes.yml           # 흐름 2
├── layer2-diagnostics-try-write.yml     # 흐름 3
├── layer2-first-run-auto-diary.yml      # 흐름 4
├── skeleton.yml · prompt-preview.yml · today-diary.yml   # 고치거나 삭제 (스펙 073 A)

docs/e2e/
├── feature-flow-map.md                  # 층 2 열·인벤토리·낡은 흐름 갱신
└── layer2-release-checklist.md          # 신규

AGENTS.md                                # release·iOS 절에서 체크리스트 링크, 낡은 흐름 서술 현행화
package.json                             # test:layer2

__tests__/e2e/
├── layer2-runner.test.ts                # 조립(주입된 기기)
├── layer2-source-contract.test.ts       # pm clear/install 없음, 채점 어휘 없음, 본문 단언 없음
├── layer2-checklist.test.ts             # 체크리스트 문서·AGENTS 링크
└── flow-map.test.ts                     # 층 2 목록·등록 정합으로 확장
```

**Structure Decision**: 069의 모양을 따른다 — 순수 조립(`runner.ts`)과 기기 접근(`device.ts`)을 나누고 기기를 주입한다. 층 2는 층 1 `device.ts`를 재사용하되 층 1 소스 계약(`pm clear` 없음)을
그대로 지키므로 새 기기 모듈을 만들지 않고 `pullFile` 하나만 더한다.

## Complexity Tracking

(없음)

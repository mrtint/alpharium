# Implementation Plan: e2e 표본 — 30일치 가상의 하루를 심고 시작한다

**Branch**: `070-e2e-sample-seed` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: `specs/070-e2e-sample-seed/spec.md`, 설계 `docs/superpowers/specs/2026-10-10-e2e-sample-seed-design.md`

## Summary

앱 코드(`src/`)는 한 줄도 바꾸지 않는다. 만드는 것은 (1) 사람이 읽는 표본 표(`manifest.ts`)와 사진 목록(`photos.json`), (2) 받은 JPEG의 EXIF를 걷고 시각·GPS를 새로 쓰는 순수 함수, (3) 내려받기·심기 스크립트와 층 1 실행기 앞단의 「표본 보장」, (4) 새 흐름 `sample-days`와 대응표·표본 표 문서다.

접근은 069와 같다: 판정·계획·EXIF는 **순수 함수**, 기기에 닿는 일은 주입되는 **통로(`SampleDevice`)** 하나, 정합성(표↔문서↔흐름 env, 사진 목록 스키마·라이선스, EXIF 왕복)은 기기 없는 jest 계약 테스트가 지킨다.
기기에서만 보이는 것(사진 칸·장소 칸이 날마다 맞게 보이는가)은 Maestro 흐름이 지킨다.

- **구현 중 정한 것**: 날별 기대값(날짜·사진 수·장소 수)은 흐름에 복제하지 않고 **표(`manifest.ts`)가 유일한 출처**이며 층 1 실행기가 `maestro test -e P0_DATE=… P0_PHOTOS=…`로 흐름에 넘긴다(spec FR-024를 이에 맞춰 고쳤다). 표를 틀리게 고치면 곧바로 흐름이 실패하므로 위반 주입이 쉽다.

## Technical Context

**Language/Version**: TypeScript(`scripts/*.ts`·`*.mts`, node 24 타입 제거로 직접 실행 — 기존 관례: 확장자를 적은 import), Maestro YAML

**Primary Dependencies**: 추가 없음. `adb`(`push`·`shell`·`content`), Node `crypto`·`https`(fetch), Maestro·jest(기존). EXIF 작성은 직접 쓴 최소 APP1 빌더(새 의존성 없음)

**Storage**: 기기 `/sdcard/Pictures/PocketlogSeed/{Camera,Screenshots,Download}/s30-*.jpg` + 표식 `s30-marker.txt`. 개발 기계: gitignore된 사진 캐시 `scripts/e2e-sample/.cache/`

**Testing**: jest `logic`(`__tests__/e2e-sample/*.test.ts`), Maestro 층 1 흐름(실기기), 위반 주입

**Target Platform**: 안드로이드 dev 빌드 전용 테스트 기기(SM-G986N, Android 13에서 실측). iOS는 범위 밖

**Project Type**: 모바일 앱 저장소의 개발 도구(제품 코드 변경 없음)

**Performance Goals**: 표본이 맞는 기기에서 보장 단계 10초 이내(건너뜀), 처음 심기 5분 이내. 실측해 기록한다(원칙 V)

**Constraints**: 가짜 추론 금지, 본문 단언 금지(원칙 IV), 앱 코드 무변경(010), 사진 비커밋, `s30-` 접두 밖 삭제 금지, 외부 다운로드 전 소유자 승인(FR-010)

**Scale/Scope**: 30일(오프셋 1~30), 약 120장(상한 150), 서로 다른 원본 200장 이상(소유자 지시 2026-10-10 — 같은 사진이 되풀이되지 않게), 군집 4곳, 대표 날 8곳(흐름)

## Constitution Check

*GATE: Phase 0 전·Phase 1 후 확인. 둘 다 통과.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스가 제품 | 통과 | 심는 것은 입력(사진)이고 `scripts/`의 도구다. 앱 번들에 들지 않으며 미리 만든 일기 응답을 보이는 경로가 생기지 않는다. 추론은 돌리지 않는다. |
| II 화자는 휴대폰 | 해당 없음 | 프롬프트·본문에 닿지 않는다. |
| III 캐릭터는 모델 위 | 해당 없음 | 로스터 무변경. |
| IV 측정 장치를 제품에 들이지 않는다 | 통과 | 일기 출력 채점·모델 비교 없음. `src/` 무변경이고 소스 계약 테스트가 잠근다. 표본 기대값은 사람이 적은 표이며 코드가 앱 동작을 재현 계산해 대신 판정하지 않는다(FR-004). |
| V 관측과 추측 구분 | 통과 | 「스캐너가 시각·좌표를 받아들이는가」는 첫 과제에서 실기기 한 장으로 먼저 본다(FR-014). 합성 데이터로 모델 품질을 평가하지 않는다. 실기기에서 한 번 통과해야 완료. |
| 개발 방식 | 통과 | 계약(`contracts/`)을 먼저 정하고 테스트를 먼저 쓴다. 한국어 커밋. 기능 브랜치. |

위반 없음 — Complexity Tracking은 비운다.

## Project Structure

### Documentation (this feature)

```text
specs/070-e2e-sample-seed/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── photo-candidates.md  # 소유자 승인 경위(37장 승인 → 풀 200장 이상 지시)와 최종 사진 목록 기록 (FR-010)
├── contracts/
│   ├── sample-manifest.md   # 표본 표·사진 목록의 모양과 불변식
│   ├── sample-seeding.md    # fetch·seed·보장(표식·판정·되읽기) 계약
│   └── sample-days-flow.md  # 흐름 env·단언·등록 계약
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
scripts/e2e-sample/
├── manifest.ts        # 표본 표(정본): 군집, 상황, 30일(오프셋 1~30), 대표 날(probes)
├── photos.json        # 사진 목록(파일명·URL·sha256·라이선스·출처 페이지·확인 일자·태그)
├── plan.ts            # 순수: manifest+catalog+now → 심을 항목들, 지문, 대표 날 env
├── exif-write.ts      # 순수: JPEG에서 EXIF 걷기 + 새 APP1(시각·GPS) 쓰기
├── catalog.ts         # photos.json 읽기·검증(스키마·라이선스 허용 목록)
├── fetch.ts           # 내려받기(순차·간격·UA)·sha256 대조·캐시
├── ensure.ts          # 표본 보장: 되읽기 판정·재심기 조립(SampleDevice 주입)
├── device.ts          # adb 통로(push 폴더·scan_volume·query·표식 읽기/쓰기·s30- 삭제)
├── fs-port.ts         # SampleFs의 실제 구현(OS 임시 폴더에 쓰고 .cache에서 읽는다)
├── layer1-step.ts     # 층 1 실행기가 부르는 실제 SampleStep(보장 + 대표 날 env)
├── doc.ts · doc-util.ts  # docs/e2e/sample-table.md를 표·목록에서 그린다(순수)
└── .cache/            # (gitignore) 받은 사진
scripts/sample-fetch.mts, scripts/sample-seed.mts   # CLI: npm run sample:fetch / sample:seed
scripts/sample-doc.mts                              # docs/e2e/sample-table.md 다시 쓰기
scripts/layer1/with-sample.ts       # 래퍼: 기기·Maestro 확인 뒤 「표본 보장」 → runLayer1(env 전달) (069 runLayer1은 동기라 건드리지 않고 감쌌다)
scripts/layer1/runner.ts            # Layer1Options.env를 runMaestro에 넘긴다
scripts/layer1/device.ts            # runMaestro가 env 인자를 받는다
scripts/run-device-tests.mjs        # LAYER1_FLOWS·NEEDS_LAYER1_BASELINE·FLOWS에 sample-days 등록
.maestro/sample-days.yml            # 새 흐름
.maestro/_sample-probe.yml          # 보조 흐름(대표 날 하나로 이동·단언)
docs/e2e/sample-table.md            # 사람이 읽는 표본 표 문서
docs/e2e/feature-flow-map.md        # 기능 행·인벤토리 갱신
.gitignore                          # scripts/e2e-sample/.cache/
package.json                        # sample:fetch, sample:seed
__tests__/e2e-sample/*.test.ts      # manifest, catalog, exif-write, plan, ensure, source-contract, doc/flow 일치
```

**Structure Decision**: 069의 `scripts/layer1/`와 010의 `scripts/seed/` 관례를 따른다 — 기기에 닿는 코드는 `device.ts` 한 곳, 나머지는 순수 함수. 010의 `seed/`는 바꾸지 않는다(`seed:clear`가 폴더 통째로 지우는 성질만 이어받는다).

## Phase 0 / Phase 1 산출물

- [research.md](research.md) — 결정과 근거, 실측
- [data-model.md](data-model.md) — 군집·날·사진 항목·표식·지문
- [contracts/](contracts/) — 표/목록·심기/보장·흐름 계약
- [quickstart.md](quickstart.md) — 검증 시나리오

## Complexity Tracking

위반 없음.

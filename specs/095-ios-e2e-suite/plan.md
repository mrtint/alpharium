# Implementation Plan: iOS e2e 세트 — 안드로이드와 같은 층 1·층 2를 iOS에 갖춘다

**Branch**: `095-ios-e2e-suite` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/095-ios-e2e-suite/spec.md`. 설계: `docs/superpowers/specs/2026-10-22-ios-e2e-suite-design.md`.

## Summary

안드로이드 층 1·층 2가 쓰는 **기기 접촉 포트**(`Layer1Device`/`Layer2Device`, `SampleDevice`)를 iOS 구현체로 한 겹 더 만든다. 실행기(`runLayer1`·`prepareBaseline`·`runLayer2`)와 기준 상태 표(`BASELINE`)·픽스처는 플랫폼 중립이라 그대로 쓴다.

- **층 1 (시뮬레이터)**: `simctl`이 컨테이너 `Documents/`를 직접 보여 주므로(`get_app_container … data`) 파일 읽기·쓰기가 호스트 파일 복사다. 사진은 `simctl addmedia`, 권한은 `simctl privacy`. Maestro는 `--device <UDID>`로 시뮬레이터를 구동한다. 안드로이드 전용 `- back`은 화면의 뒤로 가기 id로 바꾸거나 플랫폼 분기한다.
- **층 2 (iPhone 14)**: Maestro 없음. 새 실행기가 `devicectl device copy`로 기준 상태를 컨테이너 `Documents/`에 쓰고, `ios:seed`로 사진을 심고, `devicectl device process launch`로 앱을 띄운 뒤 사람에게 조작을 안내하고 컨테이너를 폴링해 단언한다. 기준 상태 준비는 `prepareBaseline`을 그대로 재사용한다(`Layer2Device` 모양의 iOS 구현체).
- 명령은 iOS 전용 둘(`test:layer1:ios`, `test:layer2:ios`)이다. 기존 안드로이드 명령은 바이트 그대로다(clarify).
- 제품 코드(`src/`)는 바꾸지 않는다.

## Technical Context

**Language/Version**: TypeScript(Node 22+, `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON`로 `.ts` 직접 실행 — 069·073과 같다). Maestro YAML.

**Primary Dependencies**: 새 의존성 없음. `xcrun simctl`, `xcrun devicectl`(Xcode 27.1), Maestro 2.11.0(시뮬레이터 전용), `npm run ios:seed`(087), `sqlite3`(시뮬레이터 사진 DB 되읽기, macOS 기본).

**Storage**: 앱 컨테이너의 `Documents/{preferences,diary,models,vision-cache}` — 안드로이드 `files/`와 같은 배치(실측: iPhone 컨테이너 `Documents/diary·models·preferences` 확인).

**Testing**: jest `logic`(`__tests__/e2e/*.test.ts` — 포트를 대역으로 주입한 조립 테스트와 소스 계약), 시뮬레이터·iPhone 실측.

**Target Platform**: 개발 기계(macOS, Xcode 27.1) + iOS 시뮬레이터 + iPhone 14(iOS 27.0.1, 개발 서명 빌드).

**Project Type**: 개발 도구(e2e 실행기·흐름) — 제품 코드 아님.

**Performance Goals**: 층 1 소요 시간은 목표를 두지 않고 실측해 기록한다(SC-006, 원칙 V). 층 2 흐름당 조작 대기(Enter) 5분, 생성 대기 10분.

**Constraints**: 앱 삭제·재설치·모델 삭제 금지(I-1과 동일). 시뮬레이터는 모델 파일이 있어야 기준 상태를 만든다(L3). 시뮬레이터 사진 보관함에는 단건 삭제 통로가 없다(research R4).

**Scale/Scope**: 새 파일 대략 8개(`scripts/layer1/ios-simulator-device.ts`, `scripts/e2e-sample/ios-device.ts`, `scripts/layer2-ios/{device,flows,runner,run}.ts`, 테스트), 바뀌는 파일 `scripts/run-device-tests.mjs`·`package.json`·`.maestro/*.yml` 일부·문서.

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 추론 경로를 건드리지 않는다. 층 2는 실기기 온디바이스 추론을 그대로 쓴다. 층 1 시뮬레이터는 dev 환경(온디바이스)으로 띄우는 것을 전제한다(quickstart). |
| II 화자는 휴대폰 | 해당 없음 | 본문은 채점하지 않고 사람이 읽는다. |
| III 캐릭터는 모델 위에 | 해당 없음 | `src/models/roster.ts`·`src/ui`를 건드리지 않는다. |
| IV 측정 장치를 제품에 들이지 않는다 | 통과 | 도구는 `scripts/`에만 있다. 단언은 파일 존재·형식·실패 기록 부재까지이고 본문을 점수화하거나 비교하지 않는다(FR-012). 제품에 테스트 전용 진입점을 넣지 않는다(FR-008). |
| V 관측된 것과 아닌 것을 구분 | 통과 | 건너뜀·중단·조작 대기 초과·생성 초과를 통과와 구분해 보고한다(FR-007, FR-010). 시뮬레이터 통과가 실제 iPhone을 말하지 않는다는 점을 보고에 드러낸다. 실측 전 값(소요 시간 등)을 장담하지 않는다. |

개발 방식: 계약(`contracts/`)을 먼저 정하고 테스트를 먼저 쓴다. 새 규칙은 위반 주입으로 검증한다.

**Post-design 재검토**: 통과. 새 위험 없음(research R7: 층 2 폴링은 읽기만, 쓰기는 기준 상태 단계에 한정).

## Project Structure

### Documentation (this feature)

```text
specs/095-ios-e2e-suite/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ios-layer1-runner.md
│   ├── ios-layer2-runner.md
│   └── ios-flow-map.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
scripts/
├── layer1/
│   ├── device.ts                    # (기존) 인터페이스. 플랫폼 문구 필드 추가
│   ├── runner.ts                    # (기존) 문구를 장치에서 받도록 수정
│   └── ios-simulator-device.ts      # 신규 — simctl 기반 Layer1Device
├── e2e-sample/
│   └── ios-device.ts                # 신규 — simctl addmedia 기반 SampleDevice
├── layer2-ios/
│   ├── device.ts                    # 신규 — devicectl 기반 Layer2Device + 앱 실행·폴링 포트
│   ├── flows.ts                     # 신규 — iOS 층 2 흐름 표(안내문·대기 한도)
│   ├── runner.ts                    # 신규 — 흐름 조립(기준 상태 → 안내 → 폴링 → 단언)
│   └── run.ts                       # 신규 — 실제 포트로 부르는 진입점
├── run-device-tests.mjs             # --ios-layer1 / --ios-layer2 모드 추가
.maestro/
├── _back.yml                        # 신규 — 플랫폼 분기 보조(필요하면)
└── *.yml                            # 층 1 흐름의 `- back`을 iOS에서도 도는 모양으로
docs/e2e/
├── feature-flow-map.md              # iOS 열
└── layer2-release-checklist.md      # iOS 절
__tests__/e2e/                       # 신규 테스트들 + flow-map.test.ts 확장
```

**Structure Decision**: 기존 `scripts/layer1`·`scripts/e2e-sample`에 iOS 구현체를 나란히 두고, 층 2의 사람 개입 실행기는 Maestro와 무관하므로 `scripts/layer2-ios/`로 분리한다. 안드로이드 층 2 실행기(`runLayer2`)는 `runMaestro`에 묶여 있어 억지로 일반화하지 않는다(research R6).

## Complexity Tracking

위반 없음.

# Implementation Plan: 무료 빌드 머신으로 iOS 빌드·업로드

**Branch**: `075-ios-cloud-release` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/075-ios-cloud-release/spec.md`. 설계 원본: `docs/superpowers/specs/2026-10-11-ios-cloud-build-upload-design.md`.

## Summary

GitHub Actions `macos-latest` 러너에서 수동 시작·소유자 승인으로 「prebuild → pod install → 임시 키체인 서명 → archive → exportArchive → altool(API 키) 업로드」를 한 잡으로 돈다. 앱 코드 변경은 0줄이고 산출물은 워크플로 파일 하나, 그 파일을 읽는 계약 테스트 하나, 문서(AGENTS.md·quickstart)다. 비밀은 Environment `ios-release`의 것만 쓴다. 066의 수동 서명 절차(`scripts/ios/ExportOptions.plist` 재사용)를 CI로 옮긴 것이며 새 서명 방식은 도입하지 않는다.

## Technical Context

**Language/Version**: GitHub Actions YAML + bash(macOS 러너). 테스트는 TypeScript(jest, 소스를 읽는 계약 테스트).

**Primary Dependencies**: `actions/checkout@v5`·`actions/setup-node@v5`(072와 같은 버전), Xcode 26.6(`xcodebuild`·`altool`), 러너 기본 CocoaPods. 새 npm 의존성 0.

**Storage**: N/A. 비밀은 GitHub Environment secrets, 임시 파일은 `$RUNNER_TEMP`·임시 키체인(잡 종료 시 삭제).

**Testing**: `__tests__/ci/ios-release-workflow.test.ts`(주석을 걷고 파일 텍스트를 센다 — 072 `native-build-workflow.test.ts`의 `read/section/listItems` 방식). 위반 주입으로 각 규칙을 뒤집는다. 최종 확인은 실제 1회 실행 + App Store Connect·iPhone(원칙 V).

**Target Platform**: macOS 26 러너(3코어·7GB), 산출 대상 iOS(arm64 기기, TestFlight).

**Project Type**: mobile-app 저장소의 CI/배포 설정(앱 소스 무변경).

**Performance Goals**: 한 번 실행이 90분 안(타임아웃). Release 아카이브 시간은 미실측 — 첫 실행에서 단계별로 잰다(FR-011).

**Constraints**: 퍼블릭 저장소(비밀 노출 방어가 최우선), 러너 메모리 7GB(OOM 시 `-jobs` 하향, FR-015), 캐시 없음, 아티팩트 없음.

**Scale/Scope**: 저장소 파일 신규 2(워크플로·계약 테스트), 수정 2(AGENTS.md·로드맵). 스펙 문서는 `specs/075-ios-cloud-release/` 안에 둔다.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 해당 없음 | 추론·앱 코드에 닿지 않는다 |
| II 화자/시야 | 해당 없음 | 프롬프트 무변경 |
| III 캐릭터 | 해당 없음 | 로스터·모델 무변경 |
| IV 측정 장치 | 통과 | 평가·채점 코드 없음. 단계별 시간 기록은 CI 요약이지 제품 코드가 아니다 |
| V 사실과 추측 | **적용** | 아카이브 시간·메모리·WWDR 유무는 **재서 적는다**(짐작 금지). 완료는 실기기(TestFlight iPhone) 확인 — 기기 없는 테스트로 갈음 금지(FR-014) |
| 개발 방식 | 통과 | 계약(워크플로 계약 문서) 먼저, 테스트 먼저, 한국어 커밋, 기능 브랜치 |

게이트 위반 없음. 정당화 필요한 복잡도 없음(Complexity Tracking 생략).

## Project Structure

### Documentation (this feature)

```text
specs/075-ios-cloud-release/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── workflow-contract.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/workflows/ios-release.yml          # 신규 — 릴리스 워크플로(수동·승인·서명·업로드)
__tests__/ci/ios-release-workflow.test.ts  # 신규 — 워크플로 계약(소스를 읽는다)
AGENTS.md                                  # 수정 — 「iOS 빌드·서명·TestFlight」 절을 CI 기본으로
docs/roadmap/README.md                     # 수정 — 완료 처리 때 이력으로 이동
scripts/ios/ExportOptions.plist            # 무변경 재사용(066)
```

**Structure Decision**: 앱 코드(`src/`)는 건드리지 않는다. 072의 `native-build.yml`과 그 테스트도 건드리지 않는다 — 그 테스트가 `secrets.`·`upload-artifact`·`needs:`를 금지하므로 새 워크플로는 별도 파일·별도 테스트로 둔다(FR-012). 헌법 검사(`scripts/constitution-rules.ts`)에 닿는 `src/` 변경이 없어 규칙 추가는 필요 없다.

## Complexity Tracking

해당 없음.

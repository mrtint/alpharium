# Implementation Plan: 안드로이드 release 빌드·서명·Play 업로드를 CI로

**Branch**: `076-android-release-ci` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/076-android-release-ci/spec.md`. 설계 원본: `docs/superpowers/specs/2026-10-11-android-release-ci-design.md`.

## Summary

GitHub Actions `ubuntu-latest` 러너에서 수동 시작·소유자 승인으로 「사전 점검 → prebuild → 키스토어 복원 → `bundleRelease`(arm64, `NODE_ENV=production`) → 서명 확인(debug 키·기대 지문) → Play 내부 테스트 업로드 → 정리」를 한 잡으로 돈다.
앱 코드(`src/`) 변경은 0줄이다. 산출물은 워크플로 파일 하나, 직접 쓴 Node 스크립트 둘(서명 확인·Play 업로드), 그 둘과 워크플로를 읽는/돌리는 테스트, 기대 지문 파일(소유자가 커밋), 문서(AGENTS.md·quickstart)다.
비밀은 Environment `android-release`의 넷뿐이다. 서명 설정은 기존 `plugins/with-release-signing.js` 선언을 그대로 쓴다 — 비밀번호만 gradle 환경변수 속성(`ORG_GRADLE_PROJECT_POCKETLOG_*`)으로 준다.
075의 보안 틀(수동 시작, 보호 환경, `contents: read`, 비밀은 단계 `env`로만, 아티팩트·캐시·명령 추적 없음, `if: always()` 정리)을 옮긴 것이다.

## Technical Context

**Language/Version**: GitHub Actions YAML + bash(ubuntu 러너), Node 24 타입 스트리핑으로 도는 TypeScript 스크립트(`scripts/`의 기존 방식 — `.ts` 확장자 import, `.mts` 진입점). 테스트는 TypeScript(jest).

**Primary Dependencies**: `actions/checkout@v5`·`actions/setup-node@v5`·`actions/setup-java@v5`(072와 같은 버전, temurin 17), 러너 기본 Android SDK·`keytool`. Play 호출은 Node 내장 `fetch`·`crypto`. 새 npm 의존성 0, 서드파티 Action 0.

**Storage**: N/A. 비밀은 GitHub Environment secrets, 임시 파일은 `$RUNNER_TEMP`와 `android/app/pocketlog.jks`(정리 단계가 삭제). 저장소에는 공개 값인 기대 지문 파일 하나가 늘어난다.

**Testing**: `__tests__/ci/android-release-workflow.test.ts`(주석을 걷고 텍스트를 센다 — 075 방식, 위반 주입), `__tests__/scripts/play-upload.test.ts`(fetch 대역·임시 RSA 키), `__tests__/scripts/verify-signature.test.ts`(keytool 출력 고정 문자열), `__tests__/scripts/android-release-sources.test.ts`(소스를 읽어 비밀 출력·외부 import 금지). 최종 확인은 실제 1회 실행 + Play Console + 전용 기기(원칙 V).

**Target Platform**: ubuntu 러너(`ubuntu-latest`, 4코어 16GB — 072 실측), 산출 대상 안드로이드 arm64 AAB.

**Project Type**: mobile-app 저장소의 CI/배포 설정(앱 소스 무변경).

**Performance Goals**: 한 번 실행이 90분 안(타임아웃). release 컴파일 시간·최대 메모리는 미실측 — 첫 실행에서 단계별로 잰다(FR-011).

**Constraints**: 퍼블릭 저장소(비밀 노출 방어가 최우선), 러너 메모리 16GB(OOM 시 gradle 병렬도·워커 하향, FR-015), 캐시 없음, 아티팩트 없음, 새 의존성 없음.

**Scale/Scope**: 신규 파일 — 워크플로 1, 스크립트 4(`.ts` 2 + `.mts` 2), 테스트 4, 기대 지문 파일 1(소유자 커밋), 스펙 문서. 수정 — AGENTS.md·로드맵. `native-build.yml`은 건드리지 않는다(고치면 그 파일이 경로 필터에 있어 10분짜리 빌드가 PR에서 돈다).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 해당 없음 | 추론·앱 코드에 닿지 않는다 |
| II 화자/시야 | 해당 없음 | 프롬프트 무변경 |
| III 캐릭터 | 해당 없음 | 로스터·모델 무변경 |
| IV 측정 장치 | 통과 | 평가·채점 코드 없음. 단계별 시간·메모리 기록은 CI 요약이지 제품 코드가 아니다 |
| V 사실과 추측 | **적용** | release 컴파일 시간·메모리·서비스 계정 권한·`completed` 수락 여부는 **재서 적는다**(짐작 금지). 완료는 Play에서 받은 앱을 전용 기기에서 여는 것까지(FR-015) |
| 개발 방식 | 통과 | 계약(contracts/) 먼저, 테스트 먼저, 한국어 커밋, 기능 브랜치 |

게이트 위반 없음. 정당화 필요한 복잡도 없음. `scripts/`는 헌법 검사 대상 규칙(`seed*` 등)과 이름이 겹치지 않는다. Post-design 재평가: 변동 없음.

## Project Structure

### Documentation (this feature)

```text
specs/076-android-release-ci/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── workflow-contract.md
│   └── scripts-contract.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/workflows/android-release.yml           # 신규 — 릴리스 워크플로(수동·승인·서명·업로드)
scripts/android-release/
├── verify-signature.ts / .mts                  # 신규 — keytool 출력 판정(순수) / 진입점(keytool 실행)
├── play-upload.ts / .mts                       # 신규 — Play edits API 흐름(fetch 주입) / 진입점(env·파일 읽기)
└── upload-key.sha256                           # 소유자가 커밋 — 기대 SHA-256 지문(공개 값)
__tests__/ci/android-release-workflow.test.ts   # 신규 — 워크플로 계약(소스를 읽는다)
__tests__/scripts/play-upload.test.ts           # 신규
__tests__/scripts/verify-signature.test.ts      # 신규
__tests__/scripts/android-release-sources.test.ts # 신규 — 스크립트 소스 계약(출력·import 금지)
AGENTS.md                                       # 수정 — 「release 빌드·서명·Google Play」 절을 CI 기본으로
docs/roadmap/README.md                          # 수정 — 완료 처리 때 이력으로 이동
plugins/with-release-signing.js, app.json       # 무변경 재사용
```

**Structure Decision**: 앱 코드는 건드리지 않는다. 072 `native-build.yml`과 그 테스트도 동작을 건드리지 않는다 — 그 테스트가 `secrets.`·`upload-artifact`를 금지하므로 새 워크플로는 별도 파일·별도 테스트로 둔다(FR-013).
스크립트는 판정(순수)과 부수 효과(진입점)로 나눠 판정만 jest에서 돌린다. 기대 지문 파일은 이 스크립트의 인접 자리에 둔다 — 키를 바꾸는 결정이 눈에 띄는 diff가 되도록.

## Complexity Tracking

해당 없음.

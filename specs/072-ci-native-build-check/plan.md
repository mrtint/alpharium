# Implementation Plan: CI에 네이티브 빌드 확인 추가

**Branch**: `072-ci-native-build-check` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/072-ci-native-build-check/spec.md`

## Summary

네이티브 입력(`package.json`·`package-lock.json`·`app.json`·`plugins/**`)이 바뀐 PR과 `main` push·수동 실행에서 도는 새 GitHub Actions 워크플로 `.github/workflows/native-build.yml`을 더한다. 잡은 둘이고 서로 의존하지 않는다 —
안드로이드(`ubuntu-latest`, `prebuild --clean` → arm64 하나 `assembleDebug`)와 iOS(`macos-latest`, `prebuild` → `pod install` → 서명 없는 시뮬레이터 `xcodebuild`).
실패하면 빨간불이고 `continue-on-error`가 없다. 결과물 업로드·서명·비밀값은 없다. 걸린 시간과 안드로이드 최대 메모리는 실행 요약에 남기고, 같은 값을
`quickstart.md`에 옮긴다. 워크플로 파일은 기기 없는 계약 테스트가 소스를 읽어 잠근다. 앱 코드는 바뀌지 않는다.

## Technical Context

**Language/Version**: GitHub Actions YAML · bash 단계 · TypeScript(계약 테스트, 기존 jest `logic` 프로젝트)

**Primary Dependencies**: `actions/checkout@v5`·`actions/setup-node@v5`(`ci.yml`과 같다), `actions/setup-java`(JDK 17), `actions/cache`. 새 npm 의존성 0.

**Storage**: N/A (캐시는 Actions 캐시, 결과물 없음)

**Testing**: `__tests__/ci/native-build-workflow.test.ts` — 워크플로 텍스트를 읽고 주석을 걷어낸 뒤 정규식으로 단언한다(YAML 파서를 직접 의존성으로 들이지 않는다). 위반 주입으로 각 단언이 실제로 잡는지 확인. 러너 검증은 피처 브랜치의 PR 실행(첫·둘째 실행 실측), 피처 브랜치를 base로 하는 일회용 PR 둘(`072-inject` 위반 주입, `072-docs-only` 경로 필터 음성 확인)로 한다.

**Target Platform**: GitHub 호스티드 러너 — `ubuntu-latest`, `macos-latest`(arm64)

**Project Type**: 모바일 앱 저장소의 CI 설정

**Performance Goals**: 없음(목표치를 정하지 않고 **먼저 재서** 기록한다 — 원칙 V). 로컬 참고: 안드로이드 arm64 release 13분 39초, iOS 서명 없는 Release 아카이브 약 10분.

**Constraints**: 서명·비밀값·결과물 없음 · `continue-on-error` 없음 · `pull_request`는 네이티브 입력 경로 필터가 있을 때만 · `pull_request_target` 없음 · 안드로이드는 arm64 하나 · 기존 `ci.yml` 무변경.

**Scale/Scope**: 파일 1(워크플로) + 테스트 1 + 스펙 산출물 + 로드맵 갱신.

## Constitution Check

*GATE: Phase 0 전 통과, Phase 1 뒤 재확인.*

| 원칙 | 판정 |
| --- | --- |
| I. 온디바이스가 제품 | 해당 없음 — 추론·앱 코드 변경 없음 |
| II. 주인의 휴대폰이 화자 | 해당 없음 — 프롬프트·일기 변경 없음 |
| III. 캐릭터는 모델 위에 | 해당 없음 |
| IV. 측정 장치를 제품에 섞지 않는다 | **통과** — 메모리·시간 측정은 CI 워크플로 안에만 있고 `src/`에 한 줄도 들어가지 않는다. 모델 출력을 재지 않는다 |
| V. 관측과 추측을 구분해 기록 | **통과** — 시간·메모리는 러너에서 재서 쓰고 로컬 값은 「로컬 참고」로만 둔다. 앱 코드가 없어 실기기 검증은 해당 없음이며 완료 보고에 그 사실을 적는다. release 최적화 단계의 OOM은 이 debug 확인이 재현하지 못할 수 있음을 스펙에 적었다 |
| 개발 방식 | 계약(스펙)을 먼저, 테스트를 먼저 쓴다. 커밋 메시지 한국어. `main` 직접 작업 없음(브랜치 `072-…`) |

위반 없음 → Complexity Tracking 비움. Phase 1 뒤 재확인: 설계가 `src/`를 건드리지 않으므로 같다.

## Project Structure

### Documentation (this feature)

```text
specs/072-ci-native-build-check/
├── plan.md
├── research.md
├── quickstart.md        # 검증 절차 + 실측 기록 표(구현 뒤 채움)
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

`data-model.md`·`contracts/`는 만들지 않는다 — 저장되는 데이터도 외부에 노출하는 인터페이스도 없다.

### Source Code (repository root)

```text
.github/workflows/
├── ci.yml                         # 무변경
└── native-build.yml               # 신규 — android·ios 두 잡

__tests__/ci/
└── native-build-workflow.test.ts  # 신규 — 트리거·실패 처리·ABI·비밀값·업로드 잠금

docs/roadmap/README.md             # 별도 과제 추가분(커밋 안 된 수정) + 이 과제의 트리거 서술 갱신
```

**Structure Decision**: 기존 `ci.yml`에 잡을 더하지 않고 새 파일로 둔다 — 트리거(경로 필터가 걸린 `pull_request`, `ci.yml`은 경로 필터 없음)가 달라 한 워크플로에 섞을 수 없다 — 경로 필터는 워크플로 단위다.

## 설계 결정

1. **트리거**: `on: pull_request: paths: [package.json, package-lock.json, app.json, "plugins/**", .github/workflows/native-build.yml]` + `push: branches: [main]`(경로 필터 없음) + `workflow_dispatch`(FR-001·001b·002·003). 필수 체크로 올리지 않는다(경로 필터로 건너뛴 필수 체크는 「대기 중」에 머문다).
2. **동시성**: `concurrency: { group: native-build-${{ github.ref }}, cancel-in-progress: true }`(FR-001a). 같은 ref(PR이면 PR ref)의 새 실행이 앞선 실행을 취소한다 — PR에서 특히 자연스럽다.
3. **안드로이드 잡**: JDK 17 → `npm ci` → `npx expo prebuild --platform android --clean` → 메모리 기록 시작 → `cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a` → 기록 종료·요약.
4. **iOS 잡**: `npm ci` → `npx expo prebuild --platform ios --clean --no-install` → `cd ios && pod install` → `xcodebuild -workspace ios/Pocketlog.xcworkspace -scheme Pocketlog -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath $RUNNER_TEMP/dd CODE_SIGNING_ALLOWED=NO build`.
   안드로이드와 같은 debug 구성으로 맞춘다. Release 시뮬레이터 빌드는 약 10분 걸렸고 JS 번들 단계를 더 지나지만 그 검증은 release 과제의 몫이다.
5. **캐시**: 안드로이드는 `~/.gradle` 캐시(`actions/cache`, 키 = `package-lock.json`·`app.json` 해시). iOS는 `~/Library/Caches/CocoaPods`와 DerivedData(러너 임시 경로). 둘 다 캐시가 없어도 결과가 같다(FR-010). **ccache는 첫 구현에서 넣지 않는다** — llama.rn의 CMake에 컴파일러 런처를 넘기는 길이 불확실하고, 실측 없이 최적화부터 하지 않는다. 첫 실측이 시간 문제를 보이면 후속으로 넣는다.
6. **시간·메모리 기록**: 단계별로 `date +%s`로 시작·끝을 재서 요약에 쓴다. 안드로이드 메모리는 빌드 직전 백그라운드에서 5초마다 `/proc/meminfo`(`MemTotal - MemAvailable`)를 파일에 적고, 빌드 뒤 최대값을 요약에 쓴다. 두 기록 단계는 `if: always()`라 실패·타임아웃에도 남는다.
7. **타임아웃**: 실측 전에는 `timeout-minutes: 60`(러너 기본 360분보다 낮은 안전망)으로 두고 실측 뒤 확정한다.
8. **취소 표시**: 취소된 실행은 GitHub가 「취소됨」으로 표시한다(실패 아님, FR-001a).
9. **테스트가 잠그는 것**(FR-012, SC-004): (a) `pull_request`에 `paths`가 정확히 위 다섯 항목, `pull_request_target`·`schedule` 없음, `push.branches`가 `main`뿐이고 push에는 `paths` 없음, `workflow_dispatch` 있음 (b) `continue-on-error` 없음 (c) 안드로이드 명령에 `-PreactNativeArchitectures=arm64-v8a`가 있고 다른 ABI 문자열이 없음 (d) `secrets.`·`upload-artifact`·`signing`·`.jks` 없음 (e) 두 잡에 `needs:` 없음 (f) `concurrency`에 `cancel-in-progress: true` (g) 안드로이드는 `assembleDebug`, iOS는 `CODE_SIGNING_ALLOWED=NO`. 소스를 읽을 때 주석을 먼저 걷어낸다.

## Complexity Tracking

위반 없음.

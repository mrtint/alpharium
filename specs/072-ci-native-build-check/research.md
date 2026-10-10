# Research: CI에 네이티브 빌드 확인 추가

Technical Context에 `NEEDS CLARIFICATION`은 없다. 아래는 plan에서 고른 방법의 근거와 대안, 그리고 **실측 전이라 확정하지 못한 것**이다.

## 결정

### R1 — 새 워크플로 파일
- **결정**: `native-build.yml`을 새로 만든다.
- **근거**: `paths`·`on` 트리거는 워크플로 단위다. `pull_request` 없이 `main` push만 받는 트리거는 `ci.yml`(PR·push 모두)과 한 파일에 섞을 수 없다.
- **대안**: `ci.yml`에 잡을 더하고 `if: github.event_name == 'push'`로 거른다 → PR마다 빈 잡이 생기고 `needs` 의존이 얽힌다. 기각.

### R2 — 안드로이드는 `assembleDebug` arm64
- **결정**: debug 변형, `-PreactNativeArchitectures=arm64-v8a`.
- **근거**: `plugins/with-release-signing.js`가 release에 키스토어(`pocketlog.jks`)를 요구해 서명 없는 release는 못 돈다. 네 ABI를 다 빌드하면 `llama.rn`의 CPU 갈래 10여 벌을 동시에 컴파일하다 로컬에서 clang OOM(AGENTS 「빌드」).
- **한계**: debug는 최적화 수준이 달라 release 단계의 메모리 부족을 재현하지 못할 수 있다. 그 몫은 「안드로이드 release 빌드·서명·보관을 CI로」 과제다.
- **대안**: 러너에서 만든 일회용 키스토어로 `assembleRelease` → 서명 없음이라는 결정과 어긋나고 시간이 길다. 소유자가 후속 과제로 미뤘다.

### R3 — iOS는 Debug 시뮬레이터 빌드
- **결정**: `-configuration Debug -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO`, DerivedData는 러너 임시 경로.
- **근거**: 안드로이드 debug와 구성을 맞추고, `ios/`가 `prebuild --clean`에서 지워지므로 산출물을 `ios/` 밖에 둔다. Release 서명 없는 아카이브(약 10분)가 JS 번들 단계까지 지나 더 길다.
- **대안**: Release 시뮬레이터 빌드(AGENTS 「확인」 표의 방식) → 번들 오류를 더 일찍 잡지만 시간이 늘고, 그 검증은 iOS 업로드 과제의 몫.

### R4 — `pod install`을 prebuild와 따로
- **결정**: `expo prebuild --no-install` 뒤 `pod install`을 별도 단계로.
- **근거**: 두 단계의 시간을 따로 요약에 남기고 CocoaPods 캐시 효과를 보기 위해서다. `prebuild`가 기본으로 `pod install`까지 하므로 `--no-install`을 주지 않으면 두 번 도는 일이 생긴다.

### R5 — 캐시 범위와 ccache 보류
- **결정**: gradle(`~/.gradle`)·CocoaPods·DerivedData만 캐시한다. ccache는 첫 구현에서 넣지 않는다.
- **근거**: `android/`·`ios/`는 `prebuild --clean`에서 지워지는 생성물이라 그 안을 캐시할 수 없다. llama.rn 네이티브 컴파일에 ccache를 걸려면 CMake 런처를 gradle 인자로 넘겨야 하는데 길이 불확실하다. **재지 않은 최적화는 하지 않는다**(원칙 V) — 첫 실측에서 안드로이드가 지나치게 길면 후속으로 넣는다.

### R6 — 메모리 기록 방식
- **결정**: `/proc/meminfo`의 `MemTotal - MemAvailable`을 5초마다 파일에 적고 최대값을 요약에 쓴다.
- **근거**: 추가 도구 없이 러너 기본으로 된다. gradle 데몬·컴파일러 프로세스를 다 포함한 머신 전체 사용량이라 OOM 여유를 직접 보여 준다.
- **한계**: 5초 간격이라 짧은 스파이크를 놓친다. 정확한 상한이 아니라 경향을 본다고 적는다.

### R7 — 동시성
- **결정**: `group: native-build-${{ github.ref }}`, `cancel-in-progress: true`(스펙 Clarification).
- **근거**: 소유자 결정. 같은 브랜치 수동 실행끼리도 취소되는 부작용은 받아들인다.

### R8 — 테스트는 소스 텍스트로
- **결정**: YAML 파서 없이 텍스트에서 주석을 걷고 정규식으로 단언한다.
- **근거**: 이 저장소의 계약 테스트 방식(AGENTS 「테스트 작성의 함정」)과 같고, `yaml`·`js-yaml`이 `node_modules`에는 있지만 직접 의존성이 아니라 올림에 깨질 수 있다.

## 실측 전이라 확정하지 않는 것 (구현의 첫 단계에서 재서 기록)

| 값 | 지금 |
| --- | --- |
| 러너 사양(ubuntu-latest·macos-latest 코어·메모리) | 퍼블릭 저장소 기준 ubuntu 4 vCPU/16GB, macos arm64 3 vCPU/7GB로 알려져 있으나 **러너에서 확인하지 않았다** — 요약에 `nproc`·`free`·`sw_vers`를 찍어 확인 |
| 안드로이드 arm64 debug 걸린 시간·최대 메모리 | 미측정 (로컬 release 13분 39초는 참고) |
| iOS Debug 시뮬레이터 걸린 시간 | 미측정 (로컬 Release 아카이브 약 10분은 참고) |
| `timeout-minutes` | 실측 뒤 확정 (잠정 60) |
| ubuntu 이미지에 NDK·CMake가 이미 있고 RN 0.86이 요구하는 버전과 맞는지 | 미확인 — 안 맞으면 `sdkmanager` 단계를 더한다 |
| `macos-latest`의 Xcode 버전이 SDK 57/RN 0.86 요구를 만족하는지 | 미확인 — 로컬은 Xcode 26.6. 안 맞으면 `xcode-select`로 고른다 |

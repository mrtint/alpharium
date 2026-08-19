# Implementation Plan: 손에 쥐는 첫 빌드

**Branch**: `006-first-diary-app` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-first-diary-app/spec.md`

## Summary

**케이블을 뽑아도 도는 release APK를 만들고, 그것으로 쓴 일기가 내일도 남게 한다.**

축이 셋이고 서로 독립적이다.

1. **배포물** — 서명 키를 만들고, release 빌드를 뽑고, 최적화가 켜진 채로 도는 것을
   실기기에서 확인한다.
2. **영속** — 지금 끊겨 있는 「생성 → 저장」 배선을 잇는다. 저장 계층은 002가 이미
   만들었고 기기 왕복까지 확인됐으므로 **새로 설계하지 않는다.**
3. **사용자 경로** — 목록·상세·쓰기 화면을 만들어 진단 화면 없이 일기에 닿게 한다.

여기에 프롬프트 교정(P2)이 얹힌다.

**기술적 접근의 핵심은 하나다: `android/`가 gitignore 되어 있다.** 그래서 서명을
`build.gradle` 직접 편집으로 해결할 수 없다 — Expo config plugin으로 선언해야
`prebuild --clean` 뒤에도 살아남는다. 이것이 이 기능에서 가장 먼저 정해져야 할
설계 결정이며, 틀리면 004의 매니페스트 사고를 서명에서 반복한다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19.2.3

**Primary Dependencies**: Expo SDK ~57.0.13, React Native 0.86.2, `llama.rn` ^0.12.8
(설치본 0.12.9), `expo-file-system` 57, `expo-media-library` ~57.0.4,
`@expo/config-plugins` 57.0.8 (전이 의존, 서명 플러그인에 쓴다)

**Storage**: `expo-file-system` 57 — `Paths.document/diary/` 아래 날짜별 JSON 파일.
002의 `fileStore`/`expoFileSystemPort`가 이미 있고 2026-08-13에 실기기 왕복 확인됨.
**이 기능은 저장 방식을 바꾸지 않고 부르는 자리를 잇는다.**

**Testing**: Jest (`jest-expo` ~57.0.4) + `@testing-library/react-native` 14 —
기기 불필요 갈래. Maestro — 실기기 흐름(`scripts/run-device-tests.mjs`의 `FLOWS`에
등록해야 돈다)

**Target Platform**: Android (arm64-v8a 실검증: SM-G986N / Android 13).
iOS는 이 기능 범위 밖(Assumptions)

**Project Type**: Mobile app (Expo development build / release APK). 서버 없음

**Performance Goals**: 없음 — **생성 시간·속도·토큰 수를 재거나 표시하지 않는다**
(헌법 원칙 IV). 005의 실측 「적재 2.1초 / 생성 30초」는 배경 사실이지 목표가 아니다

**Constraints**:
- 완전 오프라인 동작 (모델 내려받기 제외). 원격 API 추론 금지(원칙 I)
- 앱이 앞에 있는 동안만 생성(005 FR-014b)
- 화면은 읽히고 눌리면 충분 — 디자인 다듬기 없음(FR-008·FR-027)
- 네비게이션 라이브러리 도입하지 않음 (화면 셋, 상태로 가름)

**Scale/Scope**: 화면 3개(목록·상세·쓰는 중) + 캐릭터 목록(003 재사용). 일기는 하루
하나, 날짜별 파일. 사용자 1명(기기 소유자), 계정·동기화 없음

### 해소된 불확실성

**모두 코드·설치본을 직접 열어 확인했다. 짐작이 아니다.**

| 항목 | 확인한 것 |
| --- | --- |
| `android/` 추적 여부 | **gitignore 되어 있고 `git ls-files android/`가 비었다.** 직접 편집은 `prebuild --clean`에 지워진다 |
| 서명 선언 통로 | `@expo/config-plugins` 57.0.8이 `withAppBuildGradle`·`withGradleProperties`를 export 한다 |
| `*.jks` | **이미 gitignore 되어 있다**(24행). FR-004가 절반 충족 상태 |
| env 파일 해석 | `@expo/env`가 **`NODE_ENV`로 고른다** — `EXPO_PUBLIC_APP_ENV`가 아니다 |
| `.env.production` | 있고 커밋됨. `NODE_ENV=production`일 때 로드된다 |
| `.env.dev` | **어떤 모드에도 매칭되지 않아 자동 로드되지 않는다** — 죽은 파일 |
| 환경 판정 실패 경로 | `selectBackend()`가 이미 `environment-unresolved`를 반환한다. FR-035에 그대로 쓴다 |
| 파이프라인 계약 | `createPipeline({loadSignals, isModelReady?, backend, store})`. `run()`이 `PipelineResult` |
| 저장 실패 갈래 | `PipelineStage`에 `storage`가 이미 있다 |

**NEEDS CLARIFICATION: 없음.**

## Constitution Check

*GATE: Phase 0 전에 통과해야 한다. Phase 1 설계 뒤 재확인.*

### 원칙 I — 온디바이스가 제품이다

| 게이트 | 판정 | 근거 |
| --- | --- | --- |
| 엔드유저가 읽는 일기가 기기에서 생성되는가 | ✅ | release/prod는 `policy.ts`가 온디바이스만 허용 |
| 미리 만든 응답 경로를 만드는가 | ✅ 안 만든다 | FR-047. `fake.ts`는 테스트 전용이며 `src/ui/`에서 import 금지 유지 |
| 추론 위치를 `select.ts`로만 고르는가 | ✅ | FR-026, SC-024. **사용자 경로에서 `onDeviceBackend()` 직접 호출 금지** |
| 저장된 일기를 생성 대신 보여주는가 | ✅ 아니다 | FR-045. 목록·상세는 「이미 생성된 것을 읽는 자리」, 「일기 쓰기」는 언제나 실제 생성 |

**⚠️ 이 기능이 원칙 I을 어기기 가장 쉬운 자리**: 목록 화면이 생기면서 처음으로
「저장된 일기를 보여주는 화면」이 존재하게 된다. **읽기와 생성이 같은 버튼에 묶이지
않아야 한다** — 묶이면 「저장된 것이 있으면 그것을 보여준다」가 되고 그것이 위반이다.

### 원칙 II — 화자는 휴대폰이고 시야는 좁다

| 게이트 | 판정 | 근거 |
| --- | --- | --- |
| 화자 규칙이 한 자리인가 | ✅ | FR-038, SC-022 — `prompt.ts`만 |
| 교정이 판정 쪽으로 새는가 | ✅ 아니다 | FR-039 — 갈래 넷 유지, 테스트가 수를 센다 |
| 짐작을 막는가 | ✅ 아니다 | FR-037 |

### 원칙 III — 모델은 캐릭터다

| 게이트 | 판정 | 근거 |
| --- | --- | --- |
| 모델 식별자·파라미터·양자화·파일명 노출 | ✅ 없다 | FR-043, SC-019 |
| 실패 문구가 모델 실패 양상을 드러내는가 | ✅ 아니다 | FR-029 — `describeFailure()`가 이미 「할 수 있는 것」으로 옮긴다 |
| 캐릭터 설명 문안을 지어내는가 | ✅ 아니다 | 관측 근거 없으므로 여전히 짓지 않는다 |

### 원칙 IV — 측정 장치를 제품에 들이지 않는다

| 게이트 | 판정 | 근거 |
| --- | --- | --- |
| 생성 시간·속도·토큰 수 필드 | ✅ 0개 | FR-044, SC-020. `llama-port.ts`의 `{text, ending}` 경계 유지 |
| 「쓰고 있다」에 진행률이 붙는가 | ✅ 아니다 | FR-021 — 불리언 하나 |
| 판정에 임계값·점수가 들어가는가 | ✅ 아니다 | FR-039 |

**⚠️ 이 기능에서 원칙 IV가 새기 쉬운 새 자리**: release 빌드를 처음 돌리며 「debug보다
느린가」를 재고 싶어진다. **재지 않는다** — 도는지 안 도는지만 본다.

### 원칙 V — 관측된 사실과 추측을 구분한다

| 게이트 | 판정 | 근거 |
| --- | --- | --- |
| `unknown`/`none` 구분이 화면까지 가는가 | ✅ | FR-032, SC-016 |
| 저장 왕복에서 `unknown`이 살아남는가 | ✅ | FR-013, SC-008d |
| 「읽을 수 없다」와 「없다」를 가르는가 | ✅ | FR-017a, SC-012a |
| 환경 판정 실패를 기본값으로 덮는가 | ✅ 아니다 | FR-035 — `prod`로 간주하지 않는다 |
| release가 도는 것을 실기기로 확인하는가 | ✅ | FR-007, SC-001·003 |

**⚠️ 이 기능의 원칙 V 핵심**: **debug에서 돌았다는 것은 release에서 돈다는 뜻이
아니다.** 005까지의 모든 실기기 확인이 debug였다. release는 처음이다.

### 「한 축을 깊게 파지 않는다」

| 유혹 | 막는 것 |
| --- | --- |
| 화면을 예쁘게 | FR-027, Out of Scope — 읽히고 눌리면 끝 |
| 스토어 등록까지 | Out of Scope — 손으로 설치까지 |
| 네비게이션 라이브러리 | Assumptions — 화면 셋, 상태로 가름 |
| release 성능 튜닝 | 원칙 IV — 도는지만 본다 |
| EAS Build·CI | Out of Scope — 로컬 gradle |

**게이트 결과: 통과. 위반 없음. Complexity Tracking 비움.**

## Project Structure

### Documentation (this feature)

```text
specs/006-first-diary-app/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 결정과 근거
├── data-model.md        # Phase 1 — 화면 상태와 목록 항목
├── quickstart.md        # Phase 1 — 검증 절차 (release 빌드 포함)
├── contracts/
│   ├── release-build.md #   서명·빌드·환경 주입 계약
│   ├── persistence.md   #   생성 → 저장 배선 계약
│   └── screens.md       #   화면 상태 전이 계약
├── checklists/
│   └── requirements.md  # 이미 있음
└── tasks.md             # /speckit-tasks 산출물 (여기서 만들지 않음)
```

### Source Code (repository root)

```text
plugins/                      # 신설 — Expo config plugin
└── with-release-signing.js   #   서명 설정을 선언으로 넣는다 (android/가 gitignore이므로)

src/
├── config/                   # 손대지 않음 (environment·policy·day-boundary)
├── inference/                # 손대지 않음 (select·llama-port·sampling)
├── signals/                  # 손대지 않음
├── models/                   # 손대지 않음 (roster·readiness·storage)
├── diary/
│   ├── prompt.ts             # 고침 — 화자 규칙 문안 교정 (P2)
│   ├── pipeline.ts           # 고침 — storage 실패에 entry를 실어 보낸다 (계약 확장)
│   └── store.ts              # 손대지 않음 — fileStore 그대로
├── app/                      # 신설 — 사용자 경로의 조립
│   ├── wiring.ts             #   select.ts + fileStore + pipeline 조립 (유일한 자리)
│   └── state.ts              #   화면 상태 전이 (순수 함수)
└── ui/
    ├── DiaryListScreen.tsx   # 신설 — 목록 (빈 상태 포함)
    ├── DiaryDetailScreen.tsx # 신설 — 전문 읽기
    ├── DiaryHomeScreen.tsx   # 신설 — 위 둘 + 쓰기를 잇는 화면
    ├── BuildErrorScreen.tsx  # 신설 — 환경 판정 실패 (FR-035b)
    ├── GenerationProbe.tsx   # 고침 — 파이프라인 경유로 (FR-010a)
    ├── DiagnosticsScreen.tsx # 고침 — probe에 파이프라인 주입
    └── CharacterListScreen.tsx # 손대지 않음 (003 재사용)

App.tsx                       # 고침 — 환경 판정 → 사용자 경로 / 빌드 오류 갈림

__tests__/
├── app/
│   ├── state.test.ts         # 신설 — 화면 상태 전이 전 갈래
│   └── wiring.test.ts        # 신설 — 조립이 select.ts·pipeline을 거치는가
├── ui/
│   ├── diary-list.test.tsx   # 신설 — 빈 상태·목록·읽을 수 없음
│   └── diary-detail.test.tsx # 신설
└── diary/prompt.test.ts      # 고침 — 교정된 문안 검사

.maestro/
└── diary-user-path.yml       # 신설 — 진단 없이 목록→쓰기→읽기
                              # ⚠️ run-device-tests.mjs의 FLOWS에 등록해야 돈다
```

**Structure Decision**:

**`src/app/`을 새로 연다.** 이유는 조립할 자리가 없어서다 — 지금 `App.tsx`가 003의
모델 상태를 직접 조립하고 있고, 여기에 파이프라인·저장소·어댑터 조립이 더해지면
컴포넌트가 배선 코드로 덮인다. `wiring.ts`를 한 자리로 두면 **「사용자 경로가
`select.ts`와 파이프라인을 거치는가」를 기기 없이 테스트할 수 있다**(SC-008b, SC-024).
001의 `policy.ts`, 003의 `roster.ts`, 005의 `prompt.ts`가 각 원칙의 방어선을 한 곳에
모은 것과 같은 구조다.

**`plugins/`를 새로 연다.** `android/`가 gitignore이므로 서명 설정이 저장소에 남으려면
config plugin이어야 한다. 이것이 이 기능 유일의 새 최상위 디렉터리다.

**`store.ts`는 손대지 않는다.** 저장 방식은 002에서 확정됐고 기기 왕복까지 확인됐다.
이 기능의 몫은 **부르는 자리를 잇는 것**이다.

**`pipeline.ts`는 한 곳만 넓힌다.** 지금 저장 실패 시 만들어 둔 `entry`를 버리는데
(163~166행), FR-012a가 그 글을 보여주라 한다. **002의 불변식을 깨지 않는 확장**이며
근거는 [contracts/persistence.md §4](contracts/persistence.md)에 있다 — 다른 실패
갈래에는 여전히 `entry`가 없고, `storage` 단계에 도달했다는 것 자체가 생성 성공을
뜻하기 때문에 그 갈래에만 붙는다. 003이 `isModelReady`를 선택적으로 더한 것과 같은
방식이다.

## Phase 0: Research

→ [research.md](research.md)

여섯 가지를 정했다. 전부 코드·설치본 확인에 근거하며 짐작이 아니다.

1. **서명을 config plugin으로 선언한다** — `android/`가 gitignore이므로
2. **키와 비밀번호는 `.env.secret`에 두고 gradle이 읽는다** — 이미 gitignore됨
3. **`NODE_ENV=production`으로 빌드한다** — `.env.production`이 그때 로드된다
4. **`.env.dev`를 `.env.development`와 함께 정리한다** — 죽은 파일이 오해를 만든다
5. **화면 전환은 상태 하나로 가른다** — 라이브러리 없이
6. **`GenerationProbe`에 파이프라인을 주입한다** — 컴포넌트를 지우지 않고 계약만 바꾼다

## Phase 1: Design & Contracts

→ [data-model.md](data-model.md) · [contracts/](contracts/) · [quickstart.md](quickstart.md)

- **data-model.md** — 화면 상태(`AppScreen`), 목록 항목(`DiaryListItem`, 읽을 수 있음/
  없음), 저장 실패를 동반한 성공(`GeneratedButUnsaved`)
- **contracts/release-build.md** — 서명·환경 주입·재현 절차. **불변식: release가 debug
  키로 서명되지 않는다, 키가 저장소에 없다, 같은 키로 덮어 설치된다**
- **contracts/persistence.md** — 생성 경로가 파이프라인을 거치는 계약. **불변식:
  어댑터 직접 호출 0개, 저장 실패가 드러난다, `unknown`이 왕복에서 산다.**
  §4가 「저장 실패인데 글은 있다」를 002의 불변식을 깨지 않고 푸는 방법을 정한다
- **contracts/screens.md** — 상태 전이. **불변식: 읽기와 생성이 같은 버튼에 묶이지
  않는다, 거부된 글이 화면에 오르지 않는다, 「읽을 수 없다」가 「없다」와 구분된다**

### Phase 1 이후 Constitution 재확인

| 원칙 | 설계가 새로 만든 위험 | 방어 |
| --- | --- | --- |
| I | 목록 화면이 「저장된 것을 보여주는」 첫 자리 | `screens.md`가 읽기와 생성을 분리된 동작으로 못 박음. `wiring.ts`가 `select.ts` 경유를 강제 |
| III | `BuildErrorScreen`이 개발자용 문구를 노출할 위험 | 「이 빌드가 잘못 만들어졌다」까지만. 환경 변수 이름·값을 화면에 쓰지 않음 |
| IV | release 첫 실행에서 속도를 재고 싶어짐 | `quickstart.md`가 「도는지만 본다」로 못 박음. 측정 항목 없음 |
| V | release 검증을 debug로 대신할 위험 | `quickstart.md`가 release APK를 명시. Maestro 흐름 등록 누락 경고 포함 |

**재확인 결과: 통과. 새 위반 없음.**

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비운다.

# Implementation Plan: 작명·온보딩·쓰기·그만두기 빠른 반복 부작용 확인

**Branch**: `071-rapid-repeat-side-effects` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/071-rapid-repeat-side-effects/spec.md`

## Summary

쓰기·그만두기를 여섯 간격으로 빠르게 되풀이할 때 생기는 부작용을 **실기기에서 관측해 목록으로 남기고**, 코드 결함은 TDD로 고친다. 이 과제의 앞 절반은 코드 변경 없는 관측이다 —
`adb shell input`/`uiautomator dump`/`logcat`/`run-as`로 반복을 재현하고(저장소 밖 스크립트, 원칙 IV), 같은 점검 항목을 매번 읽는다.
뒷 절반은 관측이 가리킨 결함의 수정이다. **수정 대상은 관측 전에는 정해지지 않는다** — 다만 코드를 읽어 세운 가설 넷(research.md R2)이 어디를 먼저 볼지 알려 준다.
가설은 관측으로 확인될 때까지 증상이 아니다(원칙 V).

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, React Native 0.86), Hermes

**Primary Dependencies**: 기존 것만 — `llama.rn`(추론), `expo-file-system`(잠금·일기 파일), `react-native-reanimated`(홈 애니메이션). 새 의존성 0.

**Storage**: 파일 — `files/locks/diary-generation.lock`, `files/diary/YYYY-MM-DD.json`(+ `.json.writing`), `files/preferences/write-failures.json`, `files/preferences/onboarding.json`

**Testing**: jest(`npm test`, 순수 로직 `.ts` + 화면 `.tsx`) · 소스 계약 테스트 · 실기기 dev 관측(`adb`)

**Target Platform**: Android dev 빌드, 전용 기기 SM-G986N(`R3CN60JVNCE`). iOS는 범위 밖.

**Project Type**: mobile-app

**Performance Goals**: 해당 없음(성능 목표 없음). 쓰기 시간이 길어(50~240초) 대부분의 반복은 중단으로 끝난다.

**Constraints**: 앱 코드에 계측·측정 코드를 넣지 않는다(원칙 IV). release 빌드를 만들지 않는다(AGENTS 「테스트」). `pm clear`는 모델 약 2GB·일기를 지운다(소유자 동의 2026-10-10).

**Scale/Scope**: 여섯 간격 × 시나리오 다섯 갈래(R1, S-E는 작명·온보딩 반복) + 결함 수정. 수정 규모는 관측 뒤에 정해진다.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 관측은 실제 온디바이스 생성에서만 한다. 가짜 추론으로 반복을 빠르게 만들지 않는다(042 교훈). |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·일기 내용에 닿지 않는다. |
| III. 캐릭터는 모델 위에 선다 | 해당 없음 | 로스터·페르소나를 건드리지 않는다. |
| IV. 측정 장치를 제품에 들이지 않는다 | 통과 | 반복·계측 스크립트는 저장소 밖(scratchpad)에 두고 절차만 문서에 남긴다(FR-010). 앱에 로그·타이머·카운터를 심지 않는다 — 결함 수정에 필요한 코드만 들어간다. 관측이 모델 출력 품질을 채점하지 않는다. |
| V. 관측된 사실과 추측을 구분 | 통과 | 가설(R2)은 「가설」로 표시하고, 관측된 것만 부작용 목록에 올린다(FR-004). 실기기 dev에서 한 번 확인한다(SC-006). |
| 개발 방식 | 통과 | 계약(contracts/)을 먼저 정하고 결함 수정은 테스트를 먼저 쓴다. 커밋 한국어, 기능 브랜치. |

**Post-design 재평가**: 통과. 설계 산출물(data-model·contract·quickstart)은 문서뿐이고 앱 코드·의존성·권한 변경이 없다.

## Project Structure

### Documentation (this feature)

```text
specs/071-rapid-repeat-side-effects/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 코드 경로 지도, 가설, 조작·관측 방식 결정
├── data-model.md        # Phase 1 — 반복 시나리오·점검 결과·부작용 레코드
├── quickstart.md        # Phase 1 — 재현 절차(기기 준비 → 반복 → 점검). 끝에 관측 결과를 쌓는다
├── contracts/
│   └── side-effect-list.md   # 점검 항목·부작용 목록 줄의 형식
└── tasks.md             # Phase 2 — /speckit-tasks
```

### Source Code (repository root)

관측 단계는 소스를 바꾸지 않는다. 결함이 관측되면 다음 후보 위치에서 고친다(관측이 가리킨 곳만 — 아래는 후보이지 확정이 아니다):

```text
src/
├── ui/DiaryHomeScreen.tsx      # generate()/cancel(): cancelled·running·inFlight 한 벌 (R2 H1·H2)
├── diary/pipeline.ts           # run(): 잠금 취득·해제, 저장 (R2 H2·H3)
├── diary/store.ts              # save(): .writing + move (R2 H5 — .json.writing 찌꺼기가 관측될 때만)
├── inference/on-device.ts      # stop(): 비전·본문 엔진 중단 (R2 H4)
└── schedule/lock.ts, lock-port.ts

__tests__/
├── ui/                         # 화면 레이스 테스트(.tsx), 소스 계약
└── diary/, inference/          # 파이프라인·저장 순수 로직(.ts)
```

**Structure Decision**: 기존 구조를 그대로 쓴다. 새 디렉터리·모듈 없음. 결함 수정은 해당 파일의 최소 변경 + 기존 계약 테스트 옆에 테스트를 더한다(예: 054의 「`toWriting()` 키가 `["kind"]`뿐」 같은 기존 계약을 먼저 읽고 어기지 않는다).

## Complexity Tracking

위반 없음 — 비워 둔다.

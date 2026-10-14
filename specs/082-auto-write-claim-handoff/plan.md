# Implementation Plan: 앱 열기 자동 쓰기의 「한 번」과 넘겨 둔 날 바로잡기

**Branch**: `082-auto-write-claim-handoff` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/082-auto-write-claim-handoff/spec.md`

## Summary

앱 열기 자동 쓰기(057)의 두 결함을 고친다(둘 다 2026-10-14 실기기에서 재현 — research R1·R2).

1. **넘겨 둔 날(결함 A)** — `DiarySection`의 판정 effect를 `src/app/use-auto-write-handoff.ts`로 옮기고, 넘겨 둔 날을 「판정 결과 + 그 판정을 낳은 설정」의 짝으로 든다. 판정이 「쓴다」가 아니면 비우고, 지금 설정과 다른 설정의 결과는 렌더에서 걸러 낸다.
2. **한 번(결함 B)** — `AppFrame`의 `autoWriteClaimed`·`claimAutoWrite`를 `src/app/use-auto-write-claim.ts`로 옮기고 `spendAutoWrite()`를 더한다. `requestWipe`가 홈을 다시 마운트하기 전에 부른다.

판정 규칙·백그라운드·홈 화면·저장 파일·문구는 바뀌지 않는다.

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 57, React Native 0.86)

**Primary Dependencies**: 없음 — 새 의존성 0, 네이티브 변경 0

**Storage**: 없음 — 두 상태 모두 메모리(프로세스가 사는 동안)다. `preferences/*.json`은 형식·내용 모두 그대로

**Testing**: jest `ui` 프로젝트(`.tsx` — 훅 단위 둘, 조립 하나; RNTL 14는 `render`·`renderHook`·`rerender`가 Promise)와 `logic` 프로젝트(소스 계약). 실기기는 dev 빌드(SM-S901N, 기기의 debug APK + 맥의 Metro)

**Target Platform**: Android·iOS 공통(플랫폼 분기 없음)

**Project Type**: mobile-app (단일 저장소)

**Performance Goals**: 없음

**Constraints**: `src/schedule/`의 판정을 바꾸지 않는다 · `DiaryHomeScreen`의 제품 코드를 바꾸지 않는다 · 재는 코드를 넣지 않는다(원칙 IV) · 057·064 소스 계약을 옮기되 약하게 하지 않는다 · 계약 먼저·테스트 먼저 · release 빌드·`pm clear`·`npm run test:layer1`을 하지 않는다

**Scale/Scope**: 새 소스 2개(`use-auto-write-handoff.ts`·`use-auto-write-claim.ts`), 수정 소스 1개(`App.tsx`). 새 테스트 3개(훅 단위 둘·조립 하나), 수정 테스트 2~3개(소스 계약). 문서: `AGENTS.md`·로드맵

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론 위치·모델·파이프라인을 건드리지 않는다 |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·판정(글)을 건드리지 않는다 |
| III. 캐릭터는 모델 위에 | 해당 없음 | 로스터·페르소나를 건드리지 않는다 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 새 기록·새 로그가 없다. 판정 순서를 가르는 번호(HO7)는 「어느 판정이 최신인가」를 가르는 값이지 세는 지표가 아니다 — 화면·기록에 나가지 않는다. 실기기 확인은 기존 시도 기록(078)과 `adb`로 읽는다 |
| V. 실측과 추측의 구분 | 통과 | 두 결함을 고치기 전에 실기기에서 재현했다(research R1·R2). 고친 뒤 같은 절차로 dev 실기기에서 본다. iOS·release·백그라운드가 지운 날을 다시 쓰는 것은 미확인으로 적는다 |
| 개발 방식 | 통과 | 계약 먼저(`contracts/auto-write-open.md`) → 테스트 먼저 → 구현. 기능 브랜치·한국어 커밋 |

**Post-design re-check (Phase 1 뒤)**: 위와 같다. 두 훅은 `src/app/`에 있고 `src/schedule/auto-write`(판정)·`src/app/auto-write-attempts`(기록)·타입만 import한다 — `src/app/` → `src/schedule/` 방향은 이미 있다(`wipe-diaries.ts`). `scripts/constitution-rules.ts`에 새 예외가 필요 없을 것으로 본다(구현 때 `npm run lint`로 확인 — 필요하면 그 사실을 여기 적는다).

## Project Structure

### Documentation (this feature)

```text
specs/082-auto-write-claim-handoff/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auto-write-open.md   # 넘겨 둔 날(HO)·한 번(CL)·조립(WP)·조립 테스트(AS)·불변(X)·위반 주입
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks가 만든다
```

### Source Code (repository root)

```text
src/app/
├── use-auto-write-handoff.ts   # 새 파일 — DiarySection의 판정 effect + 넘겨 둔 날(HO1~HO12)
└── use-auto-write-claim.ts     # 새 파일 — claimAutoWrite + spendAutoWrite(CL1~CL7)

App.tsx                         # AppFrame: useAutoWriteClaim, requestWipe가 spendAutoWrite() → setDiaryKey
                                # DiarySection: useAutoWriteHandoff, autoWriteDay state·effect 삭제

AGENTS.md · docs/roadmap/README.md

__tests__/
├── app/
│   ├── use-auto-write-handoff.test.tsx   # 새 파일 — HO
│   ├── use-auto-write-claim.test.tsx     # 새 파일 — CL
│   ├── app-auto-write-source.test.ts     # OP1을 새 파일로 다시 겨눈다 + WP1~WP6
│   ├── simulation-wiring.test.ts         # AF3(claim)·AF4(판정의 미리보기)를 새 파일로 다시 겨눈다
│   └── auto-write-attempts-wiring.test.ts # 「앱 열기」 기록의 소스 단언이 App.tsx를 읽으면 훅으로 다시 겨눈다
└── ui/
    └── auto-write-open-assembly.test.tsx # 새 파일 — AS1~AS11
```

**Structure Decision**: 조립부(`App.tsx`)에 있던 두 상태를 `src/app/`의 훅으로 뗀다 — 074 `use-consent-gate.ts`와 같은 배치다(소유자 승인, 설계문서 §5). `DiaryHomeScreen`은 props가 그대로라 손대지 않는다.

## 구현 순서 (테스트 먼저)

1. **기존 계약 읽기** — `app-auto-write-source.test.ts`·`simulation-wiring.test.ts`·`auto-write-attempts-wiring.test.ts`·`home-auto-write.test.tsx`·`home-simulation.test.tsx`·`home-join.test.tsx`·`home-wipe.test.tsx`가 `autoWriteDay`·`claimAutoWrite`·`resolveAutoWrite`의 어느 자리를 잠그는지 표로 적는다(결과는 research R8로 덧붙인다).
2. **동작을 그대로 둔 채 옮긴다** — 두 훅을 **지금 동작 그대로**(비우지 않음·`spendAutoWrite` 없음) 떼어 낸다. 훅 단위 테스트는 바뀌지 않는 계약(HO1~HO3·HO6·HO8~HO12, CL1~CL4·CL6·CL7)부터 쓴다. `App.tsx`가 훅을 쓰게 고치고 057·064 소스 계약을 새 파일로 다시 겨눈다(WP4~WP6). 이 시점의 동작은 `main`과 같다.
3. **넘겨 둔 날(US1)** — 훅 단위 HO4·HO5·HO7과 조립 AS1·AS2·AS3·AS11을 쓴다 → 옮겨 온 옛 동작에서 HO4·HO5·HO7·AS1·AS2·AS11이 **실패하는 것을 본다**(결함 A의 기기 없는 재현) → 훅을 고친다.
4. **한 번(US2)** — 훅 단위 CL5, 소스 계약 WP1~WP3, 조립 AS4·AS5·AS6·AS8·AS9를 쓴다 → AS4·AS5·AS6이 소모 없이 **실패하는 것을 본다**(결함 B의 재현; 하니스가 `spendAutoWrite`를 부르기 전 모양으로 먼저 돌린다) → `spendAutoWrite`와 `requestWipe`를 고친다.
5. **회귀(US3)** — 조립 AS7·AS10, 기존 홈 테스트 넷을 수정 없이 통과.
6. **전체** — `npm test`·`npm run lint`, 위반 주입 표 전부, dev 실기기(quickstart §2), `AGENTS.md`(082 절 + 078 「남은 위험」·080 「곁에서 본 것」의 해당 줄을 고친다).

## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 넘겨 둔 날을 비우다 080 「합류 실패 뒤 이어 쓰기」가 깨진다 | 쓰는 중인 날은 목록에 없어 재판정도 같은 날을 준다(research R5). `home-join.test.tsx`를 수정 없이 통과시키는 것이 조건 |
| 설정 참조가 무관한 변경에도 새 객체가 되어 넘겨 둔 날이 깜빡인다 | 틀리지 않다(그 사이 `null`, 새 판정이 다시 세운다). 구현 때 `settingsValues.autoDiary`의 참조가 언제 바뀌는지 읽어 research R3에 적는다 |
| 소스 계약을 옮기다 단언이 약해진다 | 옮기기 전후의 `expect` 수를 세고, 옮긴 단언마다 위반 주입을 한 번 한다(CL4·WP1 포함) |
| 조립 테스트의 하니스가 `App.tsx`와 다르게 묶는다 | 하니스가 흉내 내는 두 줄(소모 → key, 훅의 값 → `autoWriteDay`)을 WP1·WP4가 소스로 잠근다 |
| 훅으로 옮기다 `react-hooks`·React Compiler 규칙에 걸린다(ref를 렌더에서 읽기, effect 안 setState) | 넘겨 둔 날은 렌더에서 비교만 하고(ref 아님 — state), 소모는 콜백에서만 ref를 쓴다. `npm run lint`가 완료 조건 |
| 지운 실행에서 「한 번」이 사라져 080 이어 쓰기·iOS 긴 프로세스의 자동 쓰기가 없다 | 받아들였다(spec Edge Cases·Assumptions). `AGENTS.md` 082 절에 적는다 |

## Complexity Tracking

위반 없음 — 채울 것이 없다.

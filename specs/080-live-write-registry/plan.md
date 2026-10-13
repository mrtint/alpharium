# Implementation Plan: 살아 있는 쓰기를 등록부 하나로 — 잠금 파일·낡음 시간 걷기와 홈의 합류

**Branch**: `080-live-write-registry` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/080-live-write-registry/spec.md`

## Summary

쓰기 잠금(020)은 파일의 나이로 살았는지 죽었는지를 판정해, 오래 도는 쓰기 위에 두 번째 쓰기가 서고(모델 둘) 죽은 쓰기가 10분 동안 쓰기를 막았다. 앱 프로세스는 하나이고 런타임도 한 번에 하나이므로(research R1) 판정을 메모리의 등록부 하나로 옮긴다. 다섯 가지를 한다:

1. **등록부** — `src/diary/live-write.ts`(새 파일, 순수). 칸 하나에 쓰기 또는 지우기가 든다. 차지는 동기 한 번, 나이·파일·타이머가 없다.
2. **파이프라인·배선** — 020의 `acquireLock?`을 `beginWrite?`로 바꾼다. 진행 신호를 칸에 싣고, 그만둠을 결과에 값으로 싣는다(`cancelled`).
3. **태스크·기록** — 그만둔 쓰기는 실패 기록·알림 없이 시도 기록 `cancelled`(열넷째 갈래).
4. **홈의 합류** — 남의 쓰기가 살아 있으면 그 날의 「쓰는 중」이 된다. 앞을 벗어나도 끊지 않고, 그만두기는 끊고, 실패로 끝나면 057 판정이 이어서 쓴다. 남의 쓰기 중에는 미리 준비를 하지 않는다.
5. **지우기** — 남의 쓰기를 끊고 끝난 뒤에 지운다.

그리고 `src/schedule/lock.ts`·`lock-port.ts`·`STALE_LOCK_MS`·`clearStaleLocksOnStart`를 지운다.

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 57, React Native 0.86)

**Primary Dependencies**: 없음 — 새 의존성 0, 네이티브 변경 0

**Storage**: 줄어든다 — `locks/diary-generation.lock`을 더는 쓰지도 읽지도 않는다(기기에 남은 파일은 두고 무시한다). `preferences/auto-write-attempts.json`의 갈래에 값 하나가 더해진다(형식 그대로)

**Testing**: jest 두 프로젝트 — `logic`(등록부·파이프라인·태스크·지우기·배선·기록)과 `ui`(홈 합류, RNTL 14). 실기기는 dev 빌드(SM-S901N, 기기의 debug APK + 맥의 Metro)와 iOS 시뮬레이터

**Target Platform**: Android·iOS 공통(플랫폼 분기 없음)

**Project Type**: mobile-app (단일 저장소)

**Performance Goals**: 없음 — 속도를 바꾸지 않는다. 죽은 쓰기 뒤의 기다림이 최대 10분에서 0이 된다

**Constraints**: 측정 코드를 제품에 넣지 않는다(원칙 IV) · 계약을 먼저 쓰고 테스트를 먼저 쓴다 · `PipelineStage`·`AppScreen`을 넓히지 않는다(071·054의 계약 테스트) · 홈이 시작한 쓰기의 동작을 바꾸지 않는다(FR-013) · release 빌드는 만들지 않는다 · `npm run test:layer1`을 돌리지 않는다(기기의 일기를 지운다)

**Scale/Scope**: 새 소스 1개, 수정 소스 약 10개, 삭제 소스 2개. 새 테스트 파일 3개(`live-write.test.ts`·`home-join.test.tsx`·`pipeline.live-write.test.ts` — 셋째는 `pipeline.lock.test.ts`를 대체), 삭제 테스트 파일 2개(`lock.test.ts`·`pipeline.lock.test.ts`), 수정 약 9개. 계약 문서 새 1개 + 대체 표기 2개, `AGENTS.md`·로드맵

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론 위치·GGUF·프롬프트·샘플링을 건드리지 않는다. 미리 만든 응답 경로 없음 |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·판정을 건드리지 않는다 |
| III. 캐릭터는 모델 위에 | 통과 | 등록부가 화면에 주는 것은 날·단계·끝·끊기뿐이다 — 모델 식별자가 실리지 않는다(FR-019) |
| IV. 측정 장치를 들이지 않는다 | 통과 | 등록부에 시각·경과 시간·횟수가 없다(R9). 시도 기록의 새 갈래는 「무슨 일이 있었는가」이지 채점이 아니다. 확인은 라이브러리 로그·기존 기록으로 한다(FR-020) |
| V. 실측과 추측의 구분 | 통과 | 전제(런타임 하나)를 「소스 읽기, 실측 아님」으로 적고 실기기 D1이 안드로이드에서 본다. iOS는 미확인으로 남긴다. 완료 전에 dev 실기기에서 본다 |
| 개발 방식 | 통과 | 계약 먼저(`contracts/live-write.md`) → 테스트 먼저 → 구현. 기능 브랜치·한국어 커밋 |

**Post-design re-check (Phase 1 뒤)**: 위와 같다. `src/diary/live-write.ts`는 순수 모듈이고 `src/ui/`는 그 타입만 쓴다(값은 `App.tsx`가 prop으로 넘긴다) — `scripts/constitution-rules.ts`에 새 예외가 필요 없다. `src/app/wipe-diaries.ts`의 import가 `schedule/lock`에서 `diary/live-write`로 바뀐다(`src/app/` → `src/diary/`는 `wiring.ts`가 이미 가는 방향).

## Project Structure

### Documentation (this feature)

```text
specs/080-live-write-registry/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── live-write.md      # 등록부(R)·파이프라인·배선(P)·태스크(T)·홈(H)·지우기(W)
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks가 만든다
```

### Source Code (repository root)

```text
src/
├── diary/
│   ├── live-write.ts      # 새 파일 — createLiveWrites(), liveWrites, LiveWrite·WriteHandle 타입
│   └── pipeline.ts        # acquireLock? → beginWrite?, 진행 신호 publish, 결과의 cancelled
├── app/
│   ├── wiring.ts          # beginWrite를 주체·stop과 묶는다. lockPort → liveWrites
│   ├── wipe-diaries.ts    # 남의 쓰기를 끊고 기다린 뒤 beginWipe. lockPort·nowMs 제거
│   ├── write-failures.ts  # isRecordable이 cancelled를 거른다
│   ├── auto-write-attempts.ts  # AttemptOutcome에 "cancelled"
│   └── diagnostics-view.ts     # 새 갈래의 문구 연결
├── schedule/
│   ├── task.ts            # cancelled → skipped("cancelled"), 주석 정리
│   ├── lock.ts            # 삭제
│   └── lock-port.ts       # 삭제
├── i18n/catalogs/ko/attempts.ts   # cancelled: "사용자가 그만둠"
├── inference/assembly.ts          # 주석만(잠금 주체 → 조립 주체)
├── inference/on-device.ts         # 주석만
└── ui/
    ├── DiaryHomeScreen.tsx        # liveWrites prop, 합류 effect, 그만두기 갈래, H8·H9·H12
    └── SettingsScreen.tsx         # 주석만(「잠금에 막혀」)

App.tsx                    # clearStaleLocksOnStart 제거, liveWrites를 홈·지우기에 넘긴다

specs/020-scheduled-diary-notification/contracts/generation-lock.md   # 머리에 「080으로 대체됨」
specs/079-bg-auto-write-threads/contracts/assembly.md                 # L절 머리에 같은 표기
AGENTS.md · docs/roadmap/README.md

__tests__/
├── diary/
│   ├── live-write.test.ts            # 새 파일 — R1~R10, P8 소스 계약, 100회 시뮬레이션
│   ├── pipeline.live-write.test.ts   # pipeline.lock.test.ts를 대체 — P1~P6
│   └── pipeline.lock.test.ts         # 삭제
├── schedule/
│   ├── lock.test.ts                  # 삭제
│   ├── background-generation.test.ts # T2·T3
│   └── decision.test.ts              # 소스 금지어의 acquireLock → beginWrite
├── app/
│   ├── wiring.test.ts                # P7
│   ├── wipe-diaries.test.ts          # W1~W4
│   ├── write-failures.test.ts        # P9
│   ├── auto-write-attempts.test.ts   # T4 (열넷)
│   ├── diagnostics-view.test.ts      # 새 갈래 문구
│   └── app-wipe-source.test.ts       # requestWipe가 liveWrites를 넘긴다
├── i18n/ko-golden.test.ts            # ADDED_AFTER_GOLDEN에 「사용자가 그만둠」
└── ui/
    ├── home-join.test.tsx            # 새 파일 — H1~H12
    └── (기존 홈 테스트)              # 무변경 통과가 FR-013의 증거
```

**Structure Decision**: 등록부는 `src/diary/`에 둔다(research R2). 화면은 타입만 알고 값은 조립부가 넘긴다. 새 계층·새 디렉터리가 없다.

## 구현 순서 (태스크의 뼈대)

tasks.md의 단계와 같은 순서다.

1. **기준선** (Phase 1) — 변경 전 `npm test` 수를 적는다. `contracts/live-write.md`는 이미 있다.
2. **토대** (Phase 2) — 등록부: `live-write.test.ts` 먼저(R1~R10) → `live-write.ts`. 파이프라인·배선: `pipeline.live-write.test.ts`·`wiring.test.ts` 먼저 → `pipeline.ts`·`wiring.ts`. 쓰기 실패 기록이 그만둠을 거른다(`write-failures`). 지우기를 잠금 파일에서 등록부의 칸으로 옮긴다(동작은 그대로 — `wipe-diaries.ts`, `App.tsx`의 `requestWipe`). 여기까지 `lock.ts`는 지우지 않는다.
3. **US2 삭제** (Phase 3) — `lock.ts`·`lock-port.ts`·`lock.test.ts`, `App.tsx`의 `clearStaleLocksOnStart`. 소스 계약(P8)이 0건을 잠근다. `tsc`가 남은 참조를 전부 짚는다. 주석 정리.
4. **US1 홈의 합류** (Phase 4) — `home-join.test.tsx` 먼저(H1~H3·H5·H8~H11) → `DiaryHomeScreen.tsx` → `App.tsx`가 `liveWrites`를 넘긴다.
5. **US3 실패 뒤 이어 쓰기·낡은 목록** (Phase 5) — H6·H12.
6. **US4 그만두기** (Phase 6) — 시도 기록의 새 갈래(`auto-write-attempts`·카탈로그·`diagnostics-view`) → `task.ts` → 홈의 그만두기 갈래(H4·H7).
7. **US5 지우기와 회귀** (Phase 7) — 지우기가 남의 쓰기를 끊고 기다린다(W2). 기존 홈 테스트가 고치지 않고 통과하는지 본다.
8. **마무리** (Phase 8) — 위반 주입(quickstart §1 표) → 문서(020·079 계약의 대체 표기, `AGENTS.md`) → 전체 테스트·린트 → 실기기 quickstart §2(D1~D5)·§3(S1·S2) → 결과를 quickstart 「실측」·`AGENTS.md` 「080」·설계 문서에 적는다.

## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 전제(런타임 하나)가 틀렸다 — 헤드리스 태스크와 화면이 다른 런타임이다 | 실기기 D1이 먼저 본다(모델 적재 로그가 겹치는가). 틀리면 구현을 멈추고 소유자에게 알린다 — 등록부만으로는 막지 못하므로 설계로 돌아간다 |
| 합류 effect와 057·018 effect가 같은 렌더에서 엇갈린다 | 057·018 effect가 맨 앞에서 「남의 쓰기가 있는가」를 본다(H8). 순서에 기대지 않는다. `home-join.test.tsx`가 「합류했을 때 `claimAutoWrite`·`prepare`·`captionDay`가 불리지 않았다」를 단언한다 |
| 합류하지 못한 채 남의 쓰기가 끝나 홈의 목록이 낡았는데 057이 풀려 방금 써진 날을 다시 쓴다(020에서는 `already-running`이 「한 번」을 소모해 막던 자리) | H12 — 남의 쓰기를 본 뒤에는 목록을 다시 읽어 반영하기 전에 057을 시작하지 않는다. 테스트가 「목록 읽기가 끝나기 전에는 `claimAutoWrite`가 불리지 않는다」를 호출 순서로 단언한다 |
| jest가 못 잡는 화면 결함(stale closure, effect 되먹임 — AGENTS 「조용히 실패하는 결함」) | 실기기 D1·D2·D5에서 화면을 눈으로 본다. 합류 뒤 설정에 다녀와도 「쓰는 중」이 남는지(055) 포함 |
| 홈이 시작한 쓰기의 회귀 | 기존 홈 테스트 스위트(`home-auto-write`·`home-rapid-cancel`·`home-wipe`·`writing-in-place-*`)가 `liveWrites` 없이 그대로 통과해야 한다(H11). 실기기 D5 |
| `lock.ts`를 지우다 다른 뜻의 「lock」(바 잠금 `lockBar`·`barLockMs`)을 건드린다 | 일괄 치환을 하지 않는다. `tsc`가 짚는 자리만 고친다 |

## Complexity Tracking

위반 없음 — 적을 것이 없다.

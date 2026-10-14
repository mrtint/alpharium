# Contract: 살아 있는 쓰기 등록부와 합류 (080)

020 `contracts/generation-lock.md` 전체와 079 `contracts/assembly.md` L절을 대체한다. 둘이 이 문서와 어긋나면 이 문서가 최신이다.

낱말: **칸**은 등록부가 든 하나뿐인 자리다. **차지**는 칸에 들어가는 것, **비움**은 나오는 것이다. **남의 쓰기**는 홈이 스스로 시작하지 않은 살아 있는 쓰기다. **목록 상태**는 스펙의 「쓰기 전 상태」다(화면 상태 `kind: "list"` — 안 쓴 날이든 쓴 날이든 쓰는 중이 아닌 홈).

## R. 등록부 (`src/diary/live-write.ts`, 순수)

```ts
export type LiveWriteEnd = { ok: boolean; cancelled: boolean };
export type LiveProgress = { stage: ProgressStage; branch?: MonologueBranch };

export type LiveWrite = {
  kind: "write";
  day: DayDate;
  owner: AssemblyOwner; // "screen" | "background" (079 assembly.ts)
  done: Promise<LiveWriteEnd>;
  progress(): LiveProgress | null;
  onProgress(listener: (progress: LiveProgress) => void): () => void;
  cancel(): void;
};
export type LiveSlot = LiveWrite | { kind: "wipe" };

export type WriteHandle = {
  publish(stage: ProgressStage, branch?: MonologueBranch): void;
  isCancelled(): boolean;
  end(result: { ok: boolean }): void;
};
export type WipeHandle = { end(): void };

export interface LiveWrites {
  current(): LiveSlot | null;
  beginWrite(spec: { day: DayDate; owner: AssemblyOwner; stop?: () => unknown }): WriteHandle | null;
  beginWipe(): WipeHandle | null;
  onChange(listener: () => void): () => void;
}

export function createLiveWrites(): LiveWrites;
export const liveWrites: LiveWrites; // 앱이 쓰는 하나
```

| ID | 규칙 |
| --- | --- |
| R1 | 칸은 하나다. 비어 있으면 `beginWrite`·`beginWipe`는 차지하고 손잡이를 준다. 차 있으면(쓰기든 지우기든) `null`을 준다 |
| R2 | 차지는 동기다 — `beginWrite`·`beginWipe` 안에 `await`가 없다. 「확인 후 넣기」 사이에 다른 차지가 끼어들 수 없다 |
| R3 | `end()`는 칸을 비우고 → `done`을 푼다 → 변화를 알린다, 이 순서다. `done`이 풀린 시점에 `current()`는 그 쓰기가 아니다 |
| R4 | `end()`를 두 번 불러도 한 번만 비운다. 그 사이 다른 쓰기가 칸을 차지했으면 그 쓰기를 비우지 않는다 |
| R5 | `cancel()`은 그만둠을 세우고(`isCancelled()`가 참) `stop`을 한 번 부른다. `stop`이 던지거나 거부돼도 `cancel()`은 던지지 않는다. 끝남을 기다리지 않는다. 두 번 불러도 `stop`은 한 번이다. 끝난 쓰기의 `cancel()`은 아무 일도 하지 않는다 |
| R6 | `done`은 던지지 않는다. `{ ok, cancelled }`에서 `ok`는 `end()`가 받은 값, `cancelled`는 그 시점의 그만둠이다 |
| R7 | `publish()`는 최근 단계를 바꾸고 단계 구독자에게 알린다. `progress()`는 한 번도 싣지 않았으면 `null`이다. 구독자가 던져도 쓰기는 이어진다 |
| R8 | `onChange` 구독자는 칸이 차거나 빌 때마다 불린다. 돌려준 함수로 구독을 끊는다. 구독자가 던져도 차지·비움은 끝난다 |
| R9 | 이 파일은 시각·타이머·파일·기기를 읽지 않는다 — `Date`·`setTimeout`·`setInterval`·`expo-`·`react-native`·`require(` 가 없다(주석을 걷고 본다). 나이로 판정하는 길이 없다 |
| R10 | 앱이 쓰는 등록부는 모듈의 `liveWrites` 하나다. `src/` 안에서 `createLiveWrites()`를 부르는 자리는 이 파일뿐이다(테스트는 새 등록부를 만든다) |

## P. 파이프라인·배선

| ID | 규칙 |
| --- | --- |
| P1 | `PipelineDeps.beginWrite?: (day: DayDate) => WriteHandle \| null`이 020의 `acquireLock?`을 대체한다. 주지 않으면 등록부를 쓰지 않는다(002~019 테스트 그대로) |
| P2 | `run()`의 순서는 `day-writable` → 인스턴스 `running` → `beginWrite` 다. `null`이면 `{ ok: false, stage: "already-running" }`를 곧바로 돌려주고 신호도 모델도 건드리지 않는다 |
| P3 | 차지한 뒤에는 성공·실패·예외 어느 길로 끝나도 `finally`에서 `end()`를 부른다. `end()`는 `runStages`가 돌아온 뒤 — 곧 백엔드가 모델 정리까지 마친 뒤(079 U8)다 |
| P4 | `run()`은 진행 신호를 손잡이의 `publish()`에도 싣는다. 호출자가 `onProgress`를 주지 않아도 싣는다 |
| P5 | 저장 직전 확인(071)은 `input.isCancelled?.()` **또는** 손잡이의 `isCancelled()`다 |
| P5a | 같은 확인을 **`backend.generate()` 직전에도** 한 번 한다(코드 리뷰). 어댑터가 `generate()`에 들어설 때 지난 그만두기 신호를 비우므로, 그 전에 온 끊기는 여기서 걸러야 한다 — 걸리면 생성을 부르지 않고 `generation` 단계의 `interrupted` 실패다. 칸의 `cancel()`은 「생성이 아직 시작되지 않았어도 그 쓰기는 생성 없이 끝난다」를 보장한다 |
| P6 | 실패 결과에 그만둠이 실린다: 손잡이의 `isCancelled()`가 참이고 결과가 실패이면 `cancelled: true`가 붙는다. 성공 결과에는 붙지 않는다(저장이 시작된 뒤의 그만두기는 일기를 남긴다 — 071). `PipelineStage`는 늘지 않는다 |
| P7 | `wiring.ts`의 `createAppPipeline()`은 `beginWrite`를 `(day) => registry.beginWrite({ day, owner, stop })`로 묶는다 — `owner`는 079 A8의 그 한 변수, `stop`은 그 파이프라인 백엔드의 `stop`(없으면 싣지 않는다), `registry`는 `deps.liveWrites ?? liveWrites`다 |
| P8 | `pipeline.ts`·`wiring.ts`·`task.ts`·`wipe-diaries.ts`·`App.tsx`에 잠금 파일 통로·낡음 시간·시작 시 청소가 없다. `src/schedule/lock.ts`·`lock-port.ts`는 없다 |
| P9 | 쓰기 실패 기록(060 `recordWriteFailure`)은 `cancelled`가 참인 결과를 기록하지 않는다 — 판정은 그 한 곳(`isRecordable`)이다 |

## T. 태스크 (`src/schedule/task.ts`)

| ID | 규칙 |
| --- | --- |
| T1 | 파이프라인 조립은 그대로 한 곳, `{ lockOwner: "background" }`다(079 A9) |
| T2 | 결과가 `cancelled`이면: 완성 알림을 보내지 않고, 태스크 결과는 `"skipped"`, 시도 기록 갈래는 `cancelled`다 |
| T3 | `already-running` → `"skipped"`(갈래 `already-running`)는 그대로다 |
| T4 | 시도 기록 갈래는 열넷이다 — `cancelled`가 `already-running` 뒤, `ran` 앞에 든다. 문구 「사용자가 그만둠」은 카탈로그 `attempts.cancelled`다 |

## H. 홈 (`src/ui/DiaryHomeScreen.tsx`)

홈은 `liveWrites?: Pick<LiveWrites, "current" | "onChange">`를 prop으로 받는다. `src/ui/`는 `live-write.ts`에서 타입만 import한다.

| ID | 규칙 |
| --- | --- |
| H1 | **합류 조건**: 칸에 쓰기가 있고, 홈이 도는 쓰기를 갖고 있지 않고(`running`), 목록을 읽었고, 화면이 목록 상태이고, 덮여 있지 않고, 재료 확인·달력·설정 안내 대화상자와 쓰기 판정이 열려 있지 않다. 지우기 칸에는 합류하지 않는다 |
| H2 | 합류하면 그 쓰기의 날을 고르고 「쓰는 중」이 된다. 혼잣말은 `progress()`가 있으면 그 단계로 시작하고 `onProgress`를 따른다 — 단계에서 줄을 고르는 규칙은 홈이 시작한 쓰기와 같은 함수다 |
| H3 | 합류한 동안 홈의 `running`은 거짓이다 — 앱이 앞을 벗어나도 `stop`을 부르지 않는다(005 FR-014b는 홈이 시작한 쓰기에만) |
| H4 | 합류한 「쓰는 중」의 그만두기·뒤로 가기는 그 쓰기의 `cancel()`을 부르고 `done`을 기다린 뒤 목록을 다시 읽어 목록 상태로 돌아온다. 057의 「한 번」을 소모한다(`claimAutoWrite()`를 부르고 결과를 버린다) |
| H5 | 합류한 쓰기가 `ok`로 끝나면 목록을 다시 읽어 목록 상태다(그 날은 쓴 날로 보인다). 토스트 없음 |
| H6 | 합류한 쓰기가 실패로 끝나면(`ok`도 `cancelled`도 아님) 목록을 다시 읽어 목록 상태다. 토스트 없음, 쓰기 실패 기록을 홈이 남기지 않는다(시작한 쪽이 남긴다). 그 뒤 057 자동 시작 조건이 다시 판정된다 — `claimAutoWrite()`가 거짓이면(그 실행의 「한 번」이 이미 쓰였다) 아무 일도 없다 |
| H7 | 홈이 그만두지 않았는데 `cancelled`로 끝나면(지우기가 끊었다) H6과 같되 057의 「한 번」을 소모한다 |
| H8 | 남의 쓰기가 칸에 있는 동안 057 자동 시작은 `claimAutoWrite()`를 부르지 않고, 018 미리 준비·사진 미리 읽기는 `prepare`·`captionDay`를 부르지 않는다 |
| H8a | 남의 쓰기가 칸에 있는 동안 온 060 쓰기 요청(진단 「지금 한 번 써 보기」)은 시작하지 않고 요청만 비운다 — 「이미 쓰는 중」과 같다(코드 리뷰). **H8의 미리 준비 확인은 방어다**: 지금 `App.tsx`는 `prepare`·`release`·`captionDay`를 홈에 넘기지 않는다 |
| H9 | 홈이 시작한 쓰기가 `already-running`으로 돌아왔고 칸에 쓰기가 있으면 토스트를 띄우지 않는다 — 목록 상태로 돌아가 H1이 합류시킨다. 칸에 쓰기가 없으면(지우기 중·이미 끝남) 종전대로다 |
| H10 | 홈이 언마운트된 뒤에 끝난 합류는 상태를 바꾸지 않는다. 단계·변화 구독은 언마운트·합류 종료 때 끊는다 |
| H11 | `liveWrites`를 주지 않으면 합류·H8·H9·H12가 없다 — 기존 화면 테스트가 그대로 통과한다 |
| H12 | 홈이 남의 쓰기를 한 번이라도 봤으면(H8로 물러섰든 합류했든) 그 쓰기가 끝난 뒤 **목록을 다시 읽어 반영하기 전에는** 057 자동 시작이 `claimAutoWrite()`를 부르지 않는다. 합류하지 못한 채 칸이 비면(변화 구독) 홈은 목록 상태일 때 목록을 다시 읽는다 — 낡은 목록으로 방금 써진 날을 다시 쓰지 않는다 |

## W. 지우기 (`src/app/wipe-diaries.ts`)

| ID | 규칙 |
| --- | --- |
| W1 | `WipeDeps`에서 `lockPort`·`nowMs`가 없어지고 `liveWrites`가 든다 |
| W2 | 칸에 쓰기가 있으면 `cancel()`을 부르고 `done`을 기다린 뒤에 `beginWipe()`를 한다. 홈이 시작한 쓰기는 그 전에 홈이 이미 멈췄다(058 `stopHome` — 그대로) |
| W3 | `beginWipe()`가 `null`이면 아무것도 지우지 않고 `{ kind: "busy" }`다 |
| W4 | 지우는 순서(일기 → 사진 사본 → 알림 확인 기록 → 트레이 알림)와 남기는 것(057 건너뜀·이름·설정·모듈)은 058 그대로다. `finally`에서 `end()` |

## 대체되는 것

| 옛 규칙 | 지금 |
| --- | --- |
| 020 L2 `decideAcquire`(나이로 낡음 판정)·`isMine` | 없다 — R1·R4 |
| 020 L3 잠금 파일 통로 | 없다 — R9 |
| 020 L4 `acquireLock`/`releaseLock` | R1·R3 |
| 020 L5 `PipelineDeps.acquireLock?` | P1~P3 |
| 020 L6 취득 실패 시 화면 동작 | H1·H9 (합류) |
| 020 L7·L7a `STALE_LOCK_MS`·`clearStaleLocksOnStart` | 없다 — 프로세스가 죽으면 등록부도 없다 |
| 020 L9 100회 시뮬레이션 | `live-write.test.ts`가 등록부로 옮긴다 |
| 079 L1·L2 | 없다 |

## 검증

| 무엇 | 어디서 |
| --- | --- |
| R1~R8·R10 | `__tests__/diary/live-write.test.ts` (100회 무작위 순서 포함) |
| R9·P8 | 같은 파일의 소스 계약 — 주석을 걷고 본다. `src/`·`App.tsx` 전체에서 `STALE_LOCK_MS`·`diary-generation.lock`·`clearStaleLocksOnStart`·`lock-port` 0건 |
| P1~P6·P5a | `__tests__/diary/pipeline.live-write.test.ts` (옛 `pipeline.lock.test.ts`를 대체), 저장 직전 확인은 `pipeline-cancel-on-save.test.ts`(071) |
| P7 | `__tests__/app/wiring.test.ts` |
| P9 | `__tests__/app/write-failures.test.ts` |
| T1~T4 | `__tests__/schedule/background-generation.test.ts`·`__tests__/app/auto-write-attempts.test.ts`·`__tests__/app/diagnostics-view.test.ts` |
| H1~H12·H8a | `__tests__/ui/home-join.test.tsx` (새 파일, RNTL). 「FR-013」 묶음은 진짜 `createPipeline()`을 같은 등록부에 묶어 본다 — 가짜 파이프라인은 칸을 차지하지 않아 `running` 확인을 지워도 통과한다 |
| W1~W4 | `__tests__/app/wipe-diaries.test.ts` |
| 실기기 | [quickstart.md](../quickstart.md) |

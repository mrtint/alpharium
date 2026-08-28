# Contract: 프로세스 경계 경합 잠금 (`src/schedule/lock.ts`, `pipeline.ts` 옵셔널 확장)

관련: FR-008, User Story 3, SC-005, 019 E1(한 번에 하나의 추론 엔진),
019 research.md §5(경합을 막지 않고 관측만 한 미해결 과제).

## L1 — 왜 필요한가

`pipeline.ts`의 `running: Set<DayDate>`는 **인스턴스 로컬**이다. 화면과
백그라운드 태스크는 각자 `createAppPipeline()`을 불러 **다른 파이프라인
인스턴스**를 만든다(wiring.ts 계약: "파이프라인을 만드는 자리는 여기
하나뿐"이지만, 부를 때마다 새 인스턴스). 두 인스턴스가 동시에 살면
`running` 방어가 서로를 못 본다. 프로세스(때로는 별도 JS 런타임)를
가로지르는 잠금이 필요하다.

## L2 — 순수 판정 (`src/schedule/lock.ts`)

```ts
export type LockRecord = { owner: "screen" | "background"; acquiredAtMs: number };

/** 이 시간 넘긴 잠금은 죽은 것. 이 파일에만 존재하는 상수. */
export const STALE_LOCK_MS = 5 * 60 * 1000;

export function decideAcquire(input: {
  owner: "screen" | "background";
  nowMs: number;
  existing: LockRecord | null;
}): { granted: true; record: LockRecord } | { granted: false };

export function isMine(record: LockRecord, onDisk: LockRecord | null): boolean;
```

`decideAcquire` 규칙:

- `existing === null` → `{ granted: true, record: { owner, acquiredAtMs:
  nowMs } }`.
- `existing !== null && nowMs - existing.acquiredAtMs > STALE_LOCK_MS`
  → `{ granted: true, record: { owner, acquiredAtMs: nowMs } }`
  (stale 덮어쓰기).
- else → `{ granted: false }`.

`isMine`: `onDisk !== null && onDisk.acquiredAtMs === record.acquiredAtMs`
— 내가 취득한 그 잠금이 아직 디스크에 그대로 있을 때만 true. stale로
남에게 덮어쓰인 경우 false → 내 `release`가 남의 잠금을 지우지 않는다.

## L3 — 기기 통로 (`src/schedule/lock-port.ts`)

```ts
export interface LockPort {
  /** 잠금 파일 내용을 읽는다. 없으면 null. 깨졌으면 null. */
  read(): Promise<LockRecord | null>;
  /** 원자적으로 쓴다. store.ts의 .writing + moveSync 패턴을 쓴다. */
  write(record: LockRecord): Promise<void>;
  /** 잠금 파일을 지운다. 없어도 예외 없음. */
  clear(): Promise<void>;
}
```

- 파일: `Paths.document/locks/diary-generation.lock`. `diary/` 밖(007이
  `preferences/`를 밖에 둔 이유와 같다 — `listDays()`가 안 건드리게).
- `write()`: `store.ts`의 `writeAtomically`와 같은 임시 파일 +
  `moveSync`. "존재 확인 후 쓰기" 사이의 경합 창을 좁힌다(research.md §4
  남는 위험).
- 지연 import.

## L4 — `acquireLock` 조합 함수

```ts
export async function acquireLock(
  port: LockPort,
  owner: "screen" | "background",
  nowMs: number,
): Promise<LockRecord | null>;  // null이면 취득 실패
```

1. `existing = await port.read()`.
2. `decideAcquire({ owner, nowMs, existing })`.
3. `granted`면 `port.write(record)` → `record` 반환.
4. 아니면 `null`.

```ts
export async function releaseLock(
  port: LockPort,
  record: LockRecord,
): Promise<void>;
```

1. `onDisk = await port.read()`.
2. `isMine(record, onDisk)`면 `port.clear()`. 아니면 아무것도 안 한다.

## L5 — `pipeline.ts` 옵셔널 확장

`PipelineDeps`에 추가(003의 `isModelReady?`, 017의 `geocoding?`과 같은
옵셔널 확장 — 주지 않으면 기존 동작, 회귀 없음):

```ts
export type PipelineDeps = {
  // ... 기존 ...
  /**
   * 프로세스 경계 경합 잠금 (020). 주면 run()이 day-writable 판정
   * 다음, instance-local running 판정과 함께 취득을 시도한다.
   * 취득 실패 시 { ok: false, stage: "already-running" }로 즉시 반환.
   * 주지 않으면 잠금을 시도하지 않는다(002~019 동작 유지).
   */
  acquireLock?: (owner: "screen" | "background") => Promise<LockHandle | null>;
};

export type LockHandle = { release: () => Promise<void> };
```

`run()` 안 순서(변경분):

```text
1. isDayWritable? — 기존
2. running.has(day)? — 기존 (instance-local)
3. ★ deps.acquireLock 있으면:
     const handle = await deps.acquireLock(owner);
     if (handle === null) return stop("already-running", "...(다른 곳에서 생성 중)");
4. running.add(day)
   try { return await runStages(...) }
   finally {
     running.delete(day);
     await handle?.release().catch(() => {});   // ★
   }
```

- `owner`는 `run()` 호출자가 정한다 — `PipelineInput`에 옵셔널 필드
  `lockOwner?: "screen" | "background"`를 더하거나(003 `isModelReady`
  방식), `acquireLock` 자체를 owner-bound 클로저로 주입(wiring.ts에서
  bind). **후자를 택한다** — `PipelineInput`은 화면/태스크가 공유하는
  데이터라 owner 개념이 안 어울린다.
- `wiring.ts`가 `acquireLock`을 만들 때: 화면 경로면 `() =>
  acquireLock(port, "screen", Date.now())`, 태스크 경로면 `"background"`.
  **`Date.now()`를 여기서 부르는 것은 허용** — 잠금 취득 시각은
  테스트가 경계값을 볼 필요가 없는 벽시계 사실이다(단, `lock.ts`의
  순수 `decideAcquire`는 `nowMs`를 인자로 받는다 — 그쪽이 테스트
  대상이다).

## L6 — 취득 실패 시 동작

| 호출자 | 취득 실패 시 |
|---|---|
| 백그라운드 태스크 (`task.ts`) | `already-running` 결과 → `runAutoDiaryTask`가 `"skipped"` 반환 → 다음 콜백 재시도(FR-013 경로와 합류). 알림 안 보냄. |
| 화면 (`DiaryHomeScreen`) | `already-running` 결과 → 사용자에게 "이미 쓰는 중이에요" 안내(기존 `already-running` stage의 화면 문구 재사용) 또는 진행 중 결과를 기다림(User Story 3 Scenario 2). 조용히 새 생성을 시작하지 않는다. |

## L7 — stale 타임아웃의 근거와 위험

- 값 `5분`: 019 실측 최장 완주 2분 27초의 2배 + 여유.
- **위험**: narrative(exaone, 019에서 콜드 242초 관측)를 백그라운드에서
  돌리면 4분+가 될 수 있다. 019는 quiet만 백그라운드 검증했고 narrative
  백그라운드 완주 자체가 미확인(019 findings "다음 스펙에서 고려할
  사항"). **tasks에 narrative 백그라운드 확인 태스크를 넣고, 4분을
  넘으면 이 상수를 재검토**한다. 너무 크게 잡으면(예: 30분) 진짜 죽은
  잠금이 오래 살아 다음 실행을 막는다.

### L7a — 앱 시작 시 죽은 잠금 청소 (실기기 검증에서 발견)

**증상**: `force-stop`으로 앱을 죽인 뒤 재시작하면, 이전 화면
프로세스가 `pipeline.run()` 도중이었을 때 `finally { release() }`가
안 돌아 잠금 파일이 남는다. 재시작 후 화면 "일기 쓰기"가 5분간 전부
`already-running`으로 막힌다 — 대화형 흐름에 5분은 너무 길다.

**해결**: `clearStaleLocksOnStart(port, nowMs)`를 `App.tsx` 마운트 시
1회 부른다.

- `"screen"` 잠금: **나이와 무관하게 무조건 지운다.** 화면 프로세스는
  앱 UI 하나뿐이므로, 앱이 방금 시작했다는 것은 이전 화면 프로세스가
  죽었다는 뜻 — 남은 `"screen"` 잠금은 정의상 죽은 것이다.
- `"background"` 잠금: **`decideAcquire`와 같은 stale 판정
  (`nowMs - acquiredAtMs > STALE_LOCK_MS`)을 거친 것만 지운다.**
  `expo-background-task`(WorkManager) 콜백은 앱 프로세스 안에서 돌 수
  있어, 앱을 여는 순간 백그라운드 생성이 실제로 진행 중일 수 있다 —
  그 살아있는 잠금을 지우면 화면이 동시 생성을 시작해 E1을 깬다.

`pipeline.ts`의 인스턴스 로컬 `running`이 "앱이 죽으면 사라진다"로 이
문제를 피한 것과 같은 정신 — 파일은 안 사라지므로 시작 시 정리한다.

## L8 — 위반 주입 (계약 테스트)

| 주입 | 기대 |
|---|---|
| `decideAcquire`가 `existing !== null`이고 fresh인데 `granted: true` | L2 위반 — fresh 잠금은 deny |
| `releaseLock`이 `isMine` 확인 없이 `clear()` | L4 위반 — 남의/stale 대체 잠금을 지움 |
| `STALE_LOCK_MS`를 export하고 밖에서 참조 | 값이 두 곳에 생김 (009 `SELECTABLE_DAY_COUNT` 패턴) — export는 하되(테스트가 상수 확인) `pipeline.ts`·`task.ts`가 이 값을 하드코딩하지 않는지 소스 검사 |
| `pipeline.run()`이 `acquireLock` 없이도 파일 잠금을 직접 읽는다 | L5 위반 — 파일 통로는 주입, `pipeline.ts`는 `expo-file-system`을 import하지 않는다(store 통해서만) |
| `acquireLock`을 줬는데 `finally`에서 `release` 안 함 | L5 위반 — 잠금이 안 풀려 다음 실행 5분간 막힘 |

## L9 — SC-005 검증 (100회 재현)

`__tests__/schedule/lock.test.ts`가 순수 판정 100회 시뮬레이션(두
"프로세스"가 무작위 순서로 `decideAcquire`/`releaseLock`) → 어느
시점에도 두 `granted`가 동시에 유효하지 않음을 확인. 실기기 검증은
quickstart.md의 경합 재현 절차(화면 "쓰기" 직후 백그라운드 수동 트리거).

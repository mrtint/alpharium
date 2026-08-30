/**
 * 프로세스 경계 경합 잠금 — 순수 판정 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/generation-lock.md
 *       L2·L4·L7
 *       spec.md FR-008·User Story 3·SC-005
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 필요한가**: `pipeline.ts`의 `running: Set<DayDate>`는 인스턴스 로컬이다.
 * 화면과 백그라운드 태스크는 각자 `createAppPipeline()`을 불러 **다른
 * 파이프라인 인스턴스**를 만들므로, 두 인스턴스가 동시에 살면 `running`
 * 방어가 서로를 못 본다(L1). 프로세스(때로는 별도 JS 런타임)를 가로지르는
 * 파일 잠금이 필요하다.
 *
 * **이 파일은 순수 판정만 한다.** 파일 통로는 `lock-port.ts`, 조합은
 * `acquireLock`/`releaseLock`. `decideAcquire`는 `nowMs`를 인자로 받는다 —
 * `decision.ts`가 `now`를 인자로 받는 것과 같은 규칙(테스트가 경계값을 본다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LockRecord = {
  owner: "screen" | "background";
  /** 취득 시각(벽시계 ms). stale 판정에만 쓰인다. */
  acquiredAtMs: number;
};

/**
 * 이 시간을 넘긴 잠금은 죽은 것으로 본다.
 *
 * **값 `5분`의 근거** (024, specs/024-background-stability-exceptions):
 * 규칙은 `narrative`(exaone, 로스터에서 가장 느린 캐릭터) 백그라운드 완주
 * 실측 최댓값 M초 × 2, 분 단위 올림이다(contracts/stale-lock-basis.md SL4,
 * data-model.md §5). 019가 `quiet` 최장 완주 2분 27초(147초) × 2 = 294초를
 * 5분(300초)으로 올린 것과 같은 방식이며, 020의 `lock.ts` 주석이 명시한
 * 게이트("narrative 완주가 4분을 넘으면 재검토")를 024가 실제로 수행했다.
 * `narrative` 실측 M과 이 값의 확정 근거는 findings.md §1에 있다.
 * `narrative`는 `quiet`보다 느리므로 이 값은 5분 아래로 내려가지 않는다 —
 * 너무 크게 잡으면 진짜 죽은 잠금이 오래 살아 다음 실행을 막는다.
 *
 * **export하지만 `pipeline.ts`·`task.ts`가 하드코딩하지 않는다**(L8, SL1) —
 * 계약 테스트가 상수를 확인하되, 값이 두 곳에 생기지 않게 소스를 검사한다.
 */
export const STALE_LOCK_MS = 5 * 60 * 1000;

/**
 * 지금 잠금을 취득할 수 있는가.
 *
 *  - `existing === null` → 취득(granted).
 *  - `existing`이 있고 `nowMs - existing.acquiredAtMs > STALE_LOCK_MS` →
 *    stale이므로 덮어쓰기(granted).
 *  - 그 외(fresh 잠금이 존재) → deny.
 */
export function decideAcquire(input: {
  owner: "screen" | "background";
  nowMs: number;
  existing: LockRecord | null;
}): { granted: true; record: LockRecord } | { granted: false } {
  const { owner, nowMs, existing } = input;

  if (existing === null || nowMs - existing.acquiredAtMs > STALE_LOCK_MS) {
    return { granted: true, record: { owner, acquiredAtMs: nowMs } };
  }
  return { granted: false };
}

/**
 * 디스크에 있는 잠금이 내가 취득한 바로 그 잠금인가.
 *
 * `acquiredAtMs`로 식별한다 — stale로 남에게 덮어쓰인 경우 값이 달라져
 * `false`가 되고, 그러면 내 `release`가 남의 잠금을 지우지 않는다(L4).
 */
export function isMine(record: LockRecord, onDisk: LockRecord | null): boolean {
  return onDisk !== null && onDisk.acquiredAtMs === record.acquiredAtMs;
}

/* ──────────────────────── 조합 함수 (통로는 주입) ──────────────────────── */

/** `lock.ts`가 파일에 닿지 않게 하는 통로. `lock-port.ts`가 기기 구현을 준다. */
export interface LockPort {
  /** 잠금 파일 내용을 읽는다. 없거나 깨졌으면 null. */
  read(): Promise<LockRecord | null>;
  /** 원자적으로 쓴다(store.ts의 `.writing` + moveSync 패턴). */
  write(record: LockRecord): Promise<void>;
  /** 잠금 파일을 지운다. 없어도 예외 없음. */
  clear(): Promise<void>;
}

/**
 * 잠금을 취득한다. `null`이면 실패(다른 곳에서 생성 중).
 *
 * "존재 확인 후 쓰기" 사이에 경합 창이 남는다(research.md §4) — `write()`의
 * 원자적 쓰기가 창을 좁히고, stale 타임아웃이 최악의 경우(죽은 잠금)를
 * 회복한다.
 */
export async function acquireLock(
  port: LockPort,
  owner: "screen" | "background",
  nowMs: number,
): Promise<LockRecord | null> {
  const existing = await port.read();
  const decision = decideAcquire({ owner, nowMs, existing });
  if (!decision.granted) return null;

  await port.write(decision.record);
  return decision.record;
}

/**
 * 잠금을 놓는다.
 *
 * **내가 취득한 그 잠금이 아직 디스크에 그대로일 때만 지운다**(L4) — stale로
 * 남에게 덮어쓰인 잠금을 지우면 남의 생성을 방해한다.
 */
export async function releaseLock(port: LockPort, record: LockRecord): Promise<void> {
  const onDisk = await port.read();
  if (isMine(record, onDisk)) {
    await port.clear();
  }
}

/**
 * 앱 시작 시, 이전 프로세스가 남긴 죽은 잠금을 청소한다 (L7 보강).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 필요한가**: `pipeline.run()`의 `finally { release() }`는 프로세스가
 * 정상 종료할 때만 돈다. `force-stop`·OS kill·크래시로 죽으면 잠금 파일이
 * `STALE_LOCK_MS`(5분)까지 살아, 그동안 화면 생성이 전부 `already-running`
 * 으로 막힌다 — 화면 대화형 흐름에는 5분도 너무 길다.
 *
 * **`"screen"` 잠금은 무조건 지운다**: 화면 프로세스는 앱 UI 하나뿐이다.
 * 앱이 방금 시작했다는 것은 이전 화면 프로세스가 죽었다는 뜻이므로, 디스크에
 * 남은 `"screen"` 잠금은 **정의상 죽은 것**이다.
 *
 * **`"background"` 잠금은 stale일 때만 지운다**: `expo-background-task`
 * (WorkManager) 콜백은 앱 프로세스 안에서 돌 수 있어(별도 런타임이 아닐
 * 수 있음), 앱을 여는 순간 백그라운드 생성이 **실제로 진행 중일 수 있다**.
 * 그 살아있는 잠금을 지우면 화면이 동시 생성을 시작해 E1(엔진 동시 접근)을
 * 깬다 — 정확히 이 잠금이 막으려는 것이다. 그래서 `"background"`는
 * `decideAcquire`와 같은 stale 판정(`nowMs - acquiredAtMs > STALE_LOCK_MS`)을
 * 거친 것만 지운다.
 *
 * `pipeline.ts`의 인스턴스 로컬 `running`이 "앱이 죽으면 사라진다"로 이
 * 문제를 피한 것과 같은 정신 — 파일은 안 사라지므로 시작 시 정리한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function clearStaleLocksOnStart(port: LockPort, nowMs: number): Promise<void> {
  const onDisk = await port.read();
  if (onDisk === null) return;

  if (onDisk.owner === "screen") {
    await port.clear();
    return;
  }

  // "background" — stale일 때만.
  if (nowMs - onDisk.acquiredAtMs > STALE_LOCK_MS) {
    await port.clear();
  }
}

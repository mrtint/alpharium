/**
 * 앱 열기 자동 쓰기의 「한 번」 (057 FR-017·FR-020 — 082가 `App.tsx`에서 옮겼다).
 *
 * 계약: specs/082-auto-write-claim-handoff/contracts/auto-write-open.md CL1~CL7
 *       (057 `contracts/auto-write.md` OP1 · 064 `contracts/simulation.md` AF3 · 080 `contracts/live-write.md` H4·H7)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 앱을 열 때의 자동 쓰기는 한 실행(앱 프로세스가 사는 동안)에 한 번만 저절로 시작한다. 홈이 **실제로 시작하는 순간**
 * `claimAutoWrite()`를 부르고, 거짓이면 시작하지 않는다 — 이번 실행에서 이미 시작했거나(그만두거나 실패해도 다시 저절로
 * 시작하지 않는다), 첫 실행 흐름의 자동 첫 일기(040)를 시도한 실행이다(첫 실행이 이긴다).
 *
 * **한 번을 소모하는 자리는 넷이다**: (1) 홈이 실제로 시작할 때의 `claimAutoWrite()` — 시작하지 않을 판정으로는 소모하지
 * 않는다(057), (2) 흉내로 쓰기가 막혔을 때(064), (3) 홈이 합류한 남의 쓰기를 사용자가 끊었을 때 — 홈이 `claimAutoWrite()`를
 * 불러 버린다(080 H4·H7), (4) ★ 「일기 모두 지우기」가 홈을 다시 마운트하기 직전의 `spendAutoWrite()`(082). 넷째가 없던 때는
 * 지운 직후 다시 마운트된 판정이 방금 지운 어제를 「안 쓴 날」로 넘겨, 한 번이 남은 실행이면 홈이 눈앞에서 다시 썼다
 * (2026-10-14 실기기 재현).
 *
 * 소모를 되돌리는 길은 **쓸 차례 알림을 누른 응답의 `rearmAutoWrite()` 하나다**(085 FR-023 — 082 CL6의 유일한 예외, research 085 R14·R21).
 * 배터리 예외가 없는 기기는 프로세스를 얼렸다가 같은 실행으로 풀므로, 이것이 없으면 그 실행에서 이미 한 번 시작한 날 알림을 눌러도
 * 쓰지 않는다. 누름 하나에 한 번이다 — 다시 연 「한 번」도 claim하면 소모된다. 첫 실행(040)·흉내(064)는 다시 여는 것보다 앞선다.
 * 설정에서 자동 쓰기를 새로 켜는 것은 다시 열지 않는다(082 그대로).
 *
 * 「한 번」은 **세대**로 든다 — 다시 열 때마다 세대가 하나 오르고, 그 세대에서 이미 소모했는가를 본다. 세대가 state라 다시 열면
 * `claimAutoWrite`의 정체가 바뀌어 홈의 057 effect가 다시 돈다(RA2). `rearmAutoWrite`의 정체는 바뀌지 않는다 — `App.tsx`의
 * 마운트 effect(`lastResponse`·`onResponse`)에 넣어도 그 effect가 다시 돌지 않는다(R21).
 * 값은 메모리에만 있다. 프로세스가 죽으면 사라지고 새 실행은 처음부터다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type AutoWriteClaimDeps = {
  /** 064 — 흉내 기록을 읽었는가. 읽기 전에는 판정하지 않는다(소모하지도 않는다) */
  simulationLoaded: boolean;
  /** 064 — 흉내가 쓰기를 막고 있는가 */
  writeBlocked: boolean;
  /** 040 — 이 실행이 첫 실행의 자동 첫 일기를 시도했는가. 렌더가 아니라 콜백 안에서 읽는다 */
  firstRunTried: { readonly current: boolean };
};

export type AutoWriteClaim = {
  /** 홈이 시작하려는 순간 부른다. 참이면 시작해도 된다 — 그리고 그 실행의 한 번이 소모된다 */
  claimAutoWrite: () => boolean;
  /** 묻지 않고 소모한다 — 이 실행에서는 더 저절로 시작하지 않는다. 흉내 기록을 읽기 전이어도 소모한다(사용자의 명시적 행동이다) */
  spendAutoWrite: () => void;
  /** 085 FR-023 — 쓸 차례 알림을 누른 응답에서만 부른다. 「한 번」을 한 번 다시 연다 */
  rearmAutoWrite: () => void;
};

export function useAutoWriteClaim({
  simulationLoaded,
  writeBlocked,
  firstRunTried,
}: AutoWriteClaimDeps): AutoWriteClaim {
  // 085 — 「한 번」의 세대. 쓸 차례 알림을 누를 때마다 하나 오른다
  const [generation, setGeneration] = useState(0);
  /** 한 번을 소모한 세대. `null`이면 아직 소모하지 않았다 */
  const spentIn = useRef<number | null>(null);
  // 064 — 흉내가 켜진 실행에서는 앱 열기 자동 쓰기가 없다 — 흉내를 꺼도 같은 실행에서 저절로 시작하지 않게 한 번을 소모한다(AF3).
  useEffect(() => {
    if (writeBlocked) spentIn.current = generation;
  }, [writeBlocked, generation]);
  const claimAutoWrite = useCallback(() => {
    // 064 — 흉내 기록을 읽기 전에는 판정하지 않는다(소모하지도 않는다) — 읽은 뒤 이 콜백이 바뀌어 홈이 다시 판정한다.
    if (!simulationLoaded) return false;
    if (firstRunTried.current || spentIn.current === generation) return false;
    spentIn.current = generation;
    return !writeBlocked;
  }, [simulationLoaded, writeBlocked, firstRunTried, generation]);

  const spendAutoWrite = useCallback(() => {
    spentIn.current = generation;
  }, [generation]);

  const rearmAutoWrite = useCallback(() => {
    setGeneration((g) => g + 1);
  }, []);

  return { claimAutoWrite, spendAutoWrite, rearmAutoWrite };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  acquireLock,
  clearStaleLocksOnStart,
  decideAcquire,
  isMine,
  releaseLock,
  STALE_LOCK_MS,
  type LockPort,
  type LockRecord,
} from "../../src/schedule/lock";

/**
 * 프로세스 경계 경합 잠금의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/generation-lock.md
 *       L2·L4·L8·L9
 *       spec.md FR-008·User Story 3·SC-005
 *
 * `decideAcquire`/`isMine`은 순수 함수다 — 100회 무작위 순서 시뮬레이션으로
 * "두 granted가 동시에 유효한 시점 0건"(SC-005)을 증명한다.
 */

const NOW = 1_000_000;

describe("L2 — decideAcquire", () => {
  it("existing === null이면 granted", () => {
    const r = decideAcquire({ owner: "screen", nowMs: NOW, existing: null });
    expect(r).toEqual({ granted: true, record: { owner: "screen", acquiredAtMs: NOW } });
  });

  it("fresh 잠금이 있으면 deny", () => {
    const existing: LockRecord = { owner: "background", acquiredAtMs: NOW - 1000 };
    expect(decideAcquire({ owner: "screen", nowMs: NOW, existing })).toEqual({ granted: false });
  });

  it("stale(STALE_LOCK_MS 초과) 잠금은 덮어쓴다", () => {
    const existing: LockRecord = { owner: "background", acquiredAtMs: NOW - STALE_LOCK_MS - 1 };
    const r = decideAcquire({ owner: "screen", nowMs: NOW, existing });
    expect(r).toEqual({ granted: true, record: { owner: "screen", acquiredAtMs: NOW } });
  });

  it("정확히 STALE_LOCK_MS면 아직 fresh (초과해야 stale)", () => {
    const existing: LockRecord = { owner: "background", acquiredAtMs: NOW - STALE_LOCK_MS };
    expect(decideAcquire({ owner: "screen", nowMs: NOW, existing })).toEqual({ granted: false });
  });
});

describe("L4 — isMine", () => {
  const mine: LockRecord = { owner: "screen", acquiredAtMs: NOW };

  it("디스크의 것이 내가 취득한 그 잠금이면 true", () => {
    expect(isMine(mine, { owner: "screen", acquiredAtMs: NOW })).toBe(true);
  });

  it("디스크가 비었으면 false", () => {
    expect(isMine(mine, null)).toBe(false);
  });

  it("stale로 남에게 덮어쓰인 경우 false — 내 release가 남의 잠금을 안 지운다", () => {
    expect(isMine(mine, { owner: "background", acquiredAtMs: NOW + STALE_LOCK_MS + 5 })).toBe(
      false,
    );
  });
});

/** 두 "프로세스"의 잠금 상태를 흉내내는 인메모리 통로. */
function memoryLockPort(): LockPort & { record: LockRecord | null } {
  return {
    record: null,
    async read() {
      return this.record;
    },
    async write(record) {
      this.record = record;
    },
    async clear() {
      this.record = null;
    },
  };
}

describe("L4 — acquireLock / releaseLock 조합", () => {
  it("빈 상태에서 취득하면 record를 돌려주고 디스크에 쓴다", async () => {
    const port = memoryLockPort();
    const rec = await acquireLock(port, "screen", NOW);
    expect(rec).toEqual({ owner: "screen", acquiredAtMs: NOW });
    expect(port.record).toEqual(rec);
  });

  it("이미 fresh 잠금이 있으면 null", async () => {
    const port = memoryLockPort();
    await acquireLock(port, "background", NOW);
    expect(await acquireLock(port, "screen", NOW + 1000)).toBeNull();
  });

  it("releaseLock은 내 잠금만 지운다", async () => {
    const port = memoryLockPort();
    const rec = await acquireLock(port, "screen", NOW);
    await releaseLock(port, rec!);
    expect(port.record).toBeNull();
  });

  it("releaseLock은 남이 stale로 덮어쓴 잠금을 지우지 않는다", async () => {
    const port = memoryLockPort();
    const mine = await acquireLock(port, "screen", NOW);
    // 백그라운드가 stale로 덮어씀
    await acquireLock(port, "background", NOW + STALE_LOCK_MS + 10);
    const foreign = port.record;
    await releaseLock(port, mine!);
    expect(port.record).toEqual(foreign); // 그대로
  });
});

/**
 * ★ L7 보강 — 앱 시작 시 죽은 잠금 청소.
 *
 * `force-stop`·크래시로 `pipeline.run()`의 `finally { release() }`가 안 돌면
 * 잠금 파일이 5분까지 살아 화면 생성이 전부 `already-running`으로 막힌다.
 */
describe("clearStaleLocksOnStart — 죽은 잠금 청소 (L7 보강)", () => {
  it("잠금이 없으면 아무것도 안 한다", async () => {
    const port = memoryLockPort();
    await clearStaleLocksOnStart(port, NOW);
    expect(port.record).toBeNull();
  });

  it("'screen' 잠금은 나이와 무관하게 무조건 지운다 (화면 프로세스는 하나)", async () => {
    const port = memoryLockPort();
    port.record = { owner: "screen", acquiredAtMs: NOW - 1000 }; // 방금 전 — fresh
    await clearStaleLocksOnStart(port, NOW);
    expect(port.record).toBeNull();
  });

  it("fresh한 'background' 잠금은 지우지 않는다 (진행 중일 수 있다)", async () => {
    const port = memoryLockPort();
    const live: LockRecord = { owner: "background", acquiredAtMs: NOW - 5000 };
    port.record = live;
    await clearStaleLocksOnStart(port, NOW);
    expect(port.record).toEqual(live); // 그대로
  });

  it("stale한 'background' 잠금은 지운다", async () => {
    const port = memoryLockPort();
    port.record = { owner: "background", acquiredAtMs: NOW - STALE_LOCK_MS - 1 };
    await clearStaleLocksOnStart(port, NOW);
    expect(port.record).toBeNull();
  });

  it("정확히 STALE_LOCK_MS인 'background'는 아직 살아 있다 (초과해야 지운다)", async () => {
    const port = memoryLockPort();
    const boundary: LockRecord = { owner: "background", acquiredAtMs: NOW - STALE_LOCK_MS };
    port.record = boundary;
    await clearStaleLocksOnStart(port, NOW);
    expect(port.record).toEqual(boundary);
  });
});

/**
 * ★ L9 — SC-005: 순수 판정 100회 무작위 순서 시뮬레이션.
 *
 * 두 "프로세스"(screen·background)가 무작위 순서로 취득/해제를 시도할 때
 * 어느 시점에도 두 개의 granted 잠금이 동시에 유효하지 않아야 한다.
 */
describe("L9 / SC-005 — 100회 재현", () => {
  it("두 granted가 동시에 유효한 시점이 0건이다", () => {
    // Math.random()은 이 저장소에서 금지 — 인덱스로 결정적 의사난수를 만든다.
    const pseudo = (i: number) => ((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    let violations = 0;

    for (let run = 0; run < 100; run += 1) {
      let onDisk: LockRecord | null = null;
      const held: { screen: LockRecord | null; background: LockRecord | null } = {
        screen: null,
        background: null,
      };
      let clock = 0;

      // 각 run에서 40번의 무작위 동작.
      for (let step = 0; step < 40; step += 1) {
        clock += Math.floor(pseudo(run * 40 + step) * 90_000); // 0~90초 진행
        const owner: "screen" | "background" =
          pseudo(run * 97 + step) < 0.5 ? "screen" : "background";
        const action = pseudo(run * 131 + step * 7);

        if (held[owner] === null && action < 0.6) {
          // 취득 시도
          const d = decideAcquire({ owner, nowMs: clock, existing: onDisk });
          if (d.granted) {
            onDisk = d.record;
            held[owner] = d.record;
          }
        } else if (held[owner] !== null) {
          // 해제 시도
          if (isMine(held[owner]!, onDisk)) onDisk = null;
          held[owner] = null;
        }

        // ★ 불변식: 두 프로세스가 동시에 "내 잠금이 디스크에 유효"라고 믿으면 위반.
        const screenValid = held.screen !== null && isMine(held.screen, onDisk);
        const backgroundValid = held.background !== null && isMine(held.background, onDisk);
        if (screenValid && backgroundValid) violations += 1;
      }
    }

    expect(violations).toBe(0);
  });
});

describe("L8 — 위반 주입 (소스 검사)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/lock.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("STALE_LOCK_MS는 이 파일에서만 정의된다 (export는 하되)", () => {
    expect(CODE).toMatch(/export const STALE_LOCK_MS/);
  });

  it("decideAcquire가 Date.now()를 부르지 않는다 (nowMs는 인자)", () => {
    const fn = CODE.match(/export function decideAcquire[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).not.toMatch(/Date\.now\(\)|new Date\(\)/);
  });

  it("lock.ts는 expo-file-system을 import하지 않는다 (통로는 주입)", () => {
    expect(CODE).not.toMatch(/expo-file-system/);
  });
});

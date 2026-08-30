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

/**
 * ★ 024 — contracts/stale-lock-basis.md SL1·SL2·SL4.
 *
 * `narrative`(exaone) 백그라운드 완주 실측이 `STALE_LOCK_MS`의 근거가 된다.
 * 020의 `lock.ts` 주석이 명시한 게이트("narrative 백그라운드 완주가 4분을
 * 넘으면 이 상수를 재검토")를 이 스펙이 실제로 수행했음을 소스가 드러내야
 * 한다.
 */
describe("SL1 — STALE_LOCK_MS 단일 정의 (024, stale-lock-basis.md)", () => {
  const LOCK_TS = readFileSync(join(__dirname, "../../src/schedule/lock.ts"), "utf8");
  const TASK_TS = readFileSync(join(__dirname, "../../src/schedule/task.ts"), "utf8");
  const PIPELINE_TS = readFileSync(join(__dirname, "../../src/diary/pipeline.ts"), "utf8");

  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("lock.ts에 STALE_LOCK_MS가 정확히 한 번 정의된다", () => {
    const defs = stripComments(LOCK_TS).match(/\bconst\s+STALE_LOCK_MS\b/g) ?? [];
    expect(defs).toHaveLength(1);
  });

  it("task.ts는 잠금 만료 시간 리터럴을 하드코딩하지 않는다 (lock.ts에만)", () => {
    const code = stripComments(TASK_TS);
    // 5분/4분 밀리초 리터럴, 또는 명시적 상수. STALE_LOCK_MS import는 허용.
    expect(code).not.toMatch(/\b300000\b|\b240000\b|[45]\s*\*\s*60\s*\*\s*1000/);
    expect(code).not.toMatch(/\bconst\s+STALE_LOCK_MS\b/);
  });

  it("pipeline.ts도 잠금 만료 시간 리터럴을 하드코딩하지 않는다 (기존 검사 재확인)", () => {
    const code = stripComments(PIPELINE_TS);
    expect(code).not.toMatch(/STALE_LOCK_MS\s*=|\b300000\b|[45]\s*\*\s*60\s*\*\s*1000/);
  });
});

describe("SL2 — STALE_LOCK_MS 근거 주석이 narrative 실측을 참조 (024)", () => {
  const LOCK_TS = readFileSync(join(__dirname, "../../src/schedule/lock.ts"), "utf8");
  // STALE_LOCK_MS 선언 바로 위의 블록 주석.
  const commentBlock = LOCK_TS.match(/\/\*\*[\s\S]*?\*\/\s*export const STALE_LOCK_MS/)?.[0] ?? "";

  it("근거 주석에 narrative 백그라운드 완주 실측 참조가 있다", () => {
    // "narrative"와 "완주"(또는 "024 실측")가 함께 언급돼야 한다.
    const mentionsNarrative = /narrative/i.test(commentBlock);
    const mentionsMeasurement = /완주.*(?:최댓값|최대|측정)|024\s*실측|specs\/024/i.test(
      commentBlock,
    );
    expect(mentionsNarrative && mentionsMeasurement).toBe(true);
  });

  it("근거가 019 quiet 실측 문구만으로 남아 있지 않다", () => {
    const onlyQuietBasis =
      /quiet|2분\s*27초|147초/.test(commentBlock) && !/narrative/i.test(commentBlock);
    expect(onlyQuietBasis).toBe(false);
  });
});

describe("SL4 — STALE_LOCK_MS 값 규칙 (024, stale-lock-basis.md)", () => {
  it("값은 분 단위(60000의 배수)다", () => {
    expect(STALE_LOCK_MS % 60_000).toBe(0);
  });

  it("값은 최소 5분 이상이다 (narrative는 quiet보다 느리므로 하향 없음)", () => {
    // 규칙: 새값 = ceil(M × 2 / 60000) × 60000. narrative M >= quiet M이므로
    // 새값 >= 현재 5분. 상향은 가능하되 하향은 규칙상 불가.
    expect(STALE_LOCK_MS).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });
});

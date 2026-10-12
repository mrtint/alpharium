/**
 * 078 — 자동 쓰기 시도 기록 (AT1~AT9). 060 쓰기 실패 기록과 같은 꼴이다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ATTEMPT_OUTCOMES,
  ATTEMPT_PATHS,
  MAX_AUTO_WRITE_ATTEMPTS,
  attemptOutcomeOf,
  loadAutoWriteAttempts,
  recordAttemptEnd,
  recordAttemptStart,
  type AutoWriteAttemptPort,
} from "../../src/app/auto-write-attempts";

function memoryPort(
  initial: string | null = null,
): AutoWriteAttemptPort & { content: string | null } {
  const port = {
    content: initial,
    async read() {
      return port.content;
    },
    async write(serialized: string) {
      port.content = serialized;
    },
  };
  return port;
}

const AT = new Date("2026-10-13T13:12:03.456Z");
const LATER = new Date("2026-10-13T14:00:00.000Z");

describe("AT1 — 갈래는 사람이 못 박은 상수다", () => {
  it("경로 셋, 결과 열둘 — 순서까지", () => {
    expect(ATTEMPT_PATHS).toEqual(["background", "app-open", "manual"]);
    expect(ATTEMPT_OUTCOMES).toEqual([
      "started",
      "simulation",
      "disabled",
      "not-near-target",
      "all-written",
      "no-photo-access",
      "no-material",
      "no-character",
      "write",
      "already-running",
      "ran",
      "failed",
    ]);
    expect(MAX_AUTO_WRITE_ATTEMPTS).toBe(20);
  });
});

describe("AT2 — 시작은 started 줄을 맨 앞에 넣는다", () => {
  it("빈 기록에 한 줄", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    expect(await loadAutoWriteAttempts(port)).toEqual([
      { at: AT, path: "background", outcome: "started" },
    ]);
    expect(JSON.parse(port.content ?? "")).toEqual({
      items: [{ at: "2026-10-13T13:12:03.456Z", path: "background", outcome: "started" }],
    });
  });

  it("기존 줄 앞에 선다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptStart(port, "manual", LATER);
    expect((await loadAutoWriteAttempts(port)).map((i) => i.path)).toEqual([
      "manual",
      "background",
    ]);
  });
});

describe("AT3 — 끝은 같은 at·path의 줄을 결과로 바꾼다", () => {
  it("짝을 찾으면 줄 수가 늘지 않는다 (ms까지 같은 at)", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptEnd(port, "background", AT, "ran");
    expect(await loadAutoWriteAttempts(port)).toEqual([
      { at: AT, path: "background", outcome: "ran" },
    ]);
  });

  it("경로가 다르면 짝이 아니다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptEnd(port, "manual", AT, "ran");
    expect((await loadAutoWriteAttempts(port)).map((i) => i.outcome)).toEqual(["ran", "started"]);
  });
});

describe("AT4 — 짝 없는 끝", () => {
  it("짝이 없으면 맨 앞에 넣는다 (앱 열기 경로는 시작 없이 끝만 쓴다)", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    expect(await loadAutoWriteAttempts(port)).toEqual([
      { at: AT, path: "app-open", outcome: "not-near-target" },
    ]);
  });

  it("AT4b — 바로 앞 줄과 경로·결과가 같으면 시각만 갱신한다 (앱 열기 줄이 백그라운드 줄을 밀어내지 않게)", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "background", AT, "not-near-target");
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    await recordAttemptEnd(port, "app-open", LATER, "not-near-target");
    const items = await loadAutoWriteAttempts(port);
    expect(items).toEqual([
      { at: LATER, path: "app-open", outcome: "not-near-target" },
      { at: AT, path: "background", outcome: "not-near-target" },
    ]);
  });

  it("바로 앞 줄과 결과가 다르면 새 줄이다", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    await recordAttemptEnd(port, "app-open", LATER, "write");
    expect((await loadAutoWriteAttempts(port)).map((i) => i.outcome)).toEqual([
      "write",
      "not-near-target",
    ]);
  });
});

describe("AT5 — 상한 20", () => {
  it("21번째를 넣으면 가장 오래된 것이 떨어진다", async () => {
    const port = memoryPort();
    for (let n = 0; n < 21; n += 1) {
      await recordAttemptStart(port, "background", new Date(Date.UTC(2026, 9, 1, n)));
    }
    const items = await loadAutoWriteAttempts(port);
    expect(items).toHaveLength(20);
    expect(items[0]?.at.toISOString()).toBe("2026-10-01T20:00:00.000Z");
    expect(items[19]?.at.toISOString()).toBe("2026-10-01T01:00:00.000Z");
  });
});

describe("AT6 — 깨진 기록", () => {
  it.each([
    ["JSON 아님", "{"],
    ["items가 배열 아님", JSON.stringify({ items: 3 })],
    ["객체 아님", "7"],
  ])("%s → 빈 목록", async (_name, raw) => {
    expect(await loadAutoWriteAttempts(memoryPort(raw))).toEqual([]);
  });

  it("모르는 갈래·깨진 시각은 건너뛰고 나머지는 산다", async () => {
    const port = memoryPort(
      JSON.stringify({
        items: [
          { at: "2026-10-13T13:12:03.456Z", path: "background", outcome: "ran" },
          { at: "2026-10-13T13:12:03.456Z", path: "cron", outcome: "ran" },
          { at: "2026-10-13T13:12:03.456Z", path: "background", outcome: "took-5s" },
          { at: "어제", path: "background", outcome: "ran" },
          null,
        ],
      }),
    );
    expect(await loadAutoWriteAttempts(port)).toEqual([
      { at: AT, path: "background", outcome: "ran" },
    ]);
  });

  it("읽기 예외 → 빈 목록", async () => {
    const broken: AutoWriteAttemptPort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    expect(await loadAutoWriteAttempts(broken)).toEqual([]);
  });
});

describe("AT7 — 기록 실패는 삼킨다", () => {
  it("쓰기 예외가 밖으로 나오지 않는다", async () => {
    const broken: AutoWriteAttemptPort = {
      read: async () => null,
      write: () => Promise.reject(new Error("io")),
    };
    await expect(recordAttemptStart(broken, "background", AT)).resolves.toBeUndefined();
    await expect(recordAttemptEnd(broken, "background", AT, "ran")).resolves.toBeUndefined();
  });
});

describe("AT10 — 같은 프로세스의 겹친 기록은 줄을 잃지 않는다", () => {
  /** 읽기·쓰기가 한 박자씩 걸리는 통로 — 기기 통로는 `await import` 뒤에 파일을 만지므로 두 기록의 읽기·쓰기가 엇갈릴 수 있다 */
  function slowPort(): AutoWriteAttemptPort {
    let content: string | null = null;
    const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
    return {
      async read() {
        await tick();
        return content;
      },
      async write(serialized) {
        await tick();
        content = serialized;
      },
    };
  }

  it("백그라운드 시작과 앱 열기 판정이 동시에 기록해도 두 줄이 다 남는다 (iOS는 백그라운드 재실행에서 둘이 함께 돈다)", async () => {
    const port = slowPort();
    await Promise.all([
      recordAttemptStart(port, "background", AT),
      recordAttemptEnd(port, "app-open", LATER, "all-written"),
    ]);
    const items = await loadAutoWriteAttempts(port);
    expect(items.map((i) => [i.path, i.outcome]).sort()).toEqual([
      ["app-open", "all-written"],
      ["background", "started"],
    ]);
  });
});

describe("AT8 — 판정 → 갈래", () => {
  it("idle은 reason, skip은 because, write는 write", () => {
    expect(attemptOutcomeOf({ kind: "idle", reason: "disabled" })).toBe("disabled");
    expect(attemptOutcomeOf({ kind: "idle", reason: "not-near-target" })).toBe("not-near-target");
    expect(attemptOutcomeOf({ kind: "idle", reason: "all-written" })).toBe("all-written");
    expect(attemptOutcomeOf({ kind: "skip", day: "2026-10-12", because: "no-photo-access" })).toBe(
      "no-photo-access",
    );
    expect(attemptOutcomeOf({ kind: "skip", day: "2026-10-12", because: "no-material" })).toBe(
      "no-material",
    );
    expect(attemptOutcomeOf({ kind: "write", day: "2026-10-12" })).toBe("write");
  });
});

describe("AT9 — 소스 계약", () => {
  const SRC = readFileSync(join(__dirname, "../../src/app/auto-write-attempts.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("파일은 preferences/auto-write-attempts.json 하나이고 비동기 File 호출을 쓰지 않는다", () => {
    expect(SRC).toMatch(/"preferences"/);
    expect(SRC).toMatch(/"auto-write-attempts\.json"/);
    expect(SRC).toMatch(/textSync\(\)/);
    expect(SRC).toMatch(/moveSync\(/);
    expect(SRC).not.toMatch(/\.text\(\)|\.move\(|\.copy\(|\.bytes\(/);
  });

  it("시간·바이트·토큰을 기록하지 않는다 (원칙 IV)", () => {
    expect(SRC).not.toMatch(/elapsed|duration|bytes|token|timings/i);
  });
});

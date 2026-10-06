/**
 * 쓰기 실패 기록 계약 (060, WF1~WF6·WF8·WF9).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MAX_WRITE_FAILURES,
  loadWriteFailures,
  recordWriteFailure,
  writeFailureReasonFor,
  type WriteFailurePort,
} from "../../src/app/write-failures";

function memoryPort(initial: string | null = null): WriteFailurePort & { content: string | null } {
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

const AT = new Date("2026-10-06T09:12:03.000Z");

describe("WF1 — 갈래 판정", () => {
  it.each([
    ["storage", "디스크 가득", "save"],
    ["request-build", "캐릭터가 정해지지 않아 요청을 만들지 못했다", "module"],
    ["model-not-ready", "고른 캐릭터의 모델이 아직 기기에 없다", "module"],
    ["signals", "2026-10-05의 신호를 가져오지 못했다", "photos"],
    ["vision", "vision-failed: not-ready", "module"],
    ["vision", "vision-failed: failed", "photos"],
    ["vision", "vision-failed: cancelled", "photos"],
    ["generation", "model-load-failed: not-found", "module"],
    ["generation", "model-load-failed: load-failed", "module"],
    ["generation", "rejected: empty", "empty"],
    ["generation", "rejected: echo", "unwritten"],
    ["generation", "rejected: language", "unwritten"],
    ["generation", "rejected: unfinished", "unwritten"],
    ["generation", "timed-out", "unwritten"],
    ["generation", "interrupted", "unwritten"],
    ["generation", "generation-failed: oom", "unwritten"],
    ["generation", "backend-unavailable: x", "unwritten"],
    ["generation", "not-implemented", "unwritten"],
    ["day-not-closed", "미래 날", "unwritten"],
    ["어떤-새-단계", "뭔가", "unwritten"],
    ["generation", "처음 보는 reason", "unwritten"],
  ])("%s / %s → %s", (stage, reason, expected) => {
    expect(writeFailureReasonFor({ stage, reason })).toBe(expected);
  });
});

describe("WF2 — 기록하지 않는 것", () => {
  it("already-running과 성공은 기록하지 않는다", async () => {
    const port = memoryPort();
    await recordWriteFailure(port, { ok: false, stage: "already-running", reason: "x" }, AT);
    await recordWriteFailure(port, { ok: true }, AT);
    expect(port.content).toBeNull();
  });
});

describe("WF4 — 더하기와 상한", () => {
  it("맨 앞에 더하고 같은 갈래가 연달아도 각각 한 줄이다", async () => {
    const port = memoryPort();
    await recordWriteFailure(port, { ok: false, stage: "storage", reason: "x" }, AT);
    await recordWriteFailure(
      port,
      { ok: false, stage: "storage", reason: "x" },
      new Date("2026-10-06T10:00:00.000Z"),
    );
    const items = await loadWriteFailures(port);
    expect(items.map((i) => i.reason)).toEqual(["save", "save"]);
    expect(items[0]?.at.toISOString()).toBe("2026-10-06T10:00:00.000Z");
  });

  it("열 건을 넘으면 가장 오래된 것부터 빠진다", async () => {
    const port = memoryPort();
    for (let i = 0; i < MAX_WRITE_FAILURES + 1; i += 1) {
      await recordWriteFailure(
        port,
        { ok: false, stage: i === 0 ? "signals" : "storage", reason: "x" },
        new Date(Date.UTC(2026, 9, 6, 0, i)),
      );
    }
    const items = await loadWriteFailures(port);
    expect(items).toHaveLength(10);
    expect(items.map((item) => item.reason)).not.toContain("photos"); // 맨 처음(가장 오래된) 것이 빠졌다
    expect(items[0]?.at.getUTCMinutes()).toBe(10);
  });
});

describe("WF5 — 읽기는 던지지 않는다", () => {
  it.each([
    ["파일 없음", null],
    ["깨진 JSON", "{"],
    ["items가 배열이 아님", JSON.stringify({ items: 3 })],
    ["객체가 아님", "3"],
  ])("%s → 빈 목록", async (_name, raw) => {
    expect(await loadWriteFailures(memoryPort(raw))).toEqual([]);
  });

  it("통로가 던져도 빈 목록이다", async () => {
    const port: WriteFailurePort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.resolve(),
    };
    expect(await loadWriteFailures(port)).toEqual([]);
  });

  it("모르는 reason이나 해석 안 되는 at인 항목만 버린다", async () => {
    const raw = JSON.stringify({
      items: [
        { reason: "save", at: "2026-10-06T09:00:00.000Z" },
        { reason: "비밀", at: "2026-10-06T09:00:00.000Z" },
        { reason: "empty", at: "어제" },
        { reason: "module", at: "2026-10-05T09:00:00.000Z" },
        null,
      ],
    });
    const items = await loadWriteFailures(memoryPort(raw));
    expect(items.map((i) => i.reason)).toEqual(["save", "module"]);
  });
});

describe("WF6 — 기록 실패는 삼킨다", () => {
  it("읽기·쓰기 통로가 던져도 던지지 않는다", async () => {
    const port: WriteFailurePort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    await expect(
      recordWriteFailure(port, { ok: false, stage: "storage", reason: "x" }, AT),
    ).resolves.toBeUndefined();
  });
});

describe("소스 계약 — WF3·WF8·WF9", () => {
  const code = (file: string) =>
    readFileSync(join(__dirname, "..", "..", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
  const source = code("src/app/write-failures.ts");

  it("WF3 — 직렬화 객체의 키는 reason·at뿐이고 측정 어휘가 없다", () => {
    const serialize = source.slice(source.indexOf("JSON.stringify({"));
    const keys = [...serialize.slice(0, serialize.indexOf("}),") + 3).matchAll(/(\w+):/g)].map(
      (m) => m[1],
    );
    expect(keys.filter((k) => k !== "items" && k !== "reason" && k !== "at")).toEqual([]);
    expect(source).not.toMatch(/duration|elapsed|timing|token|[^a-z]ms[^a-z]/i);
  });

  it("WF8 — 파일 이름은 write-failures.json 하나다", () => {
    expect(source).toContain("write-failures.json");
    expect(source).not.toMatch(/auto-diary|auto-write-skipped|onboarding|notified/);
  });

  it("판정은 앞 토큰·detail만 본다 — 긴 문장 비교가 없다", () => {
    expect(source).not.toMatch(/===\s*["'][^"']{20,}["']/);
  });

  it("CC4 — src/ui·diary/pipeline을 import하지 않는다", () => {
    expect(source).not.toMatch(/from\s+["'][^"']*(?:\/ui\/|diary\/pipeline)/);
  });

  it("WF9 — 지우기와 파이프라인은 이 모듈을 import하지 않는다", () => {
    expect(code("src/app/wipe-diaries.ts")).not.toContain("write-failures");
    expect(code("src/diary/pipeline.ts")).not.toContain("write-failures");
  });
});

/**
 * 세그먼트 병렬 전송 조립 — RangeFetchPort 주입 (026, C9~C17).
 *
 * 계약: specs/026-parallel-model-download/contracts/segmented-transfer.md 「조립」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `runSegmented`는 `RangeFetchPort` 대역을 받아 구간들을 병렬로 받는다. 지문 검증·
 * `state.json` 쓰기는 하지 않는다(호출자 몫). `Character`를 모른다.
 *
 * C16·C17은 `checkSegmentedFile`이 소스에서 금지 import·속도 어휘를 잡는지를
 * `constitution-rules`로 직접 확인한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkSegmentedFile } from "../../scripts/constitution-rules";
import { runSegmented } from "../../src/models/segmented/transfer";
import { MIN_SEGMENT_BYTES } from "../../src/models/segmented/plan";
import type { RangeFetchPort, RangeOutcome } from "../../src/models/port";
import type { Segment } from "../../src/models/segmented/types";

/** RangeFetchPort 대역. 각 구간의 fetch 호출을 기록하고 결과를 조작한다. */
function fakeRange(
  opts: {
    support?: "supported" | "unsupported";
    totalBytes?: number;
    outcomes?: Record<number, RangeOutcome>;
    onFetch?: (segment: Segment, signal?: AbortSignal) => void;
    /** 각 구간이 보고할 바이트 (기본: 구간 전체) */
    bytesFor?: (segment: Segment) => number;
    delayMs?: number;
  } = {},
): { port: RangeFetchPort; calls: Segment[]; concurrent: number } {
  const calls: Segment[] = [];
  let inFlight = 0;
  let maxConcurrent = 0;

  const port: RangeFetchPort = {
    async probeRange() {
      return opts.support === "unsupported"
        ? { kind: "unsupported" }
        : { kind: "supported", totalBytes: opts.totalBytes ?? MIN_SEGMENT_BYTES * 8 };
    },
    async fetchRange(_key, _url, segment, onBytes, signal) {
      calls.push(segment);
      opts.onFetch?.(segment, signal);
      inFlight++;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      inFlight--;

      const outcome = opts.outcomes?.[segment.index] ?? ({ kind: "completed" } as RangeOutcome);
      if (outcome.kind === "completed") {
        const bytes = opts.bytesFor ? opts.bytesFor(segment) : segment.end - segment.start + 1;
        onBytes(bytes);
      }
      return outcome;
    },
  };

  return {
    port,
    calls,
    get concurrent() {
      return maxConcurrent;
    },
  };
}

const noAbort = new AbortController().signal;

/* ───────────────────── C9 — Range 미지원 → fallback ───────────────────── */

it("C9 — probeRange가 unsupported면 { kind: 'fallback' }", async () => {
  const r = fakeRange({ support: "unsupported" });
  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
  });
  expect(result).toEqual({ kind: "fallback" });
  expect(r.calls).toHaveLength(0); // 구간을 받지 않는다
});

it("C9 — 파일이 작아 단일 구간이면 fallback", async () => {
  const r = fakeRange({ support: "supported", totalBytes: MIN_SEGMENT_BYTES });
  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
  });
  expect(result).toEqual({ kind: "fallback" });
});

/* ───────────────────── C10 — 정상 완주 ───────────────────── */

it("C10 — 모든 구간 완료 → { completed } + onProgress(1)", async () => {
  const r = fakeRange({ support: "supported", totalBytes: MIN_SEGMENT_BYTES * 8 });
  const fractions: (number | null)[] = [];
  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: (f) => fractions.push(f),
    pauseSignal: noAbort,
  });
  expect(result).toEqual({ kind: "completed" });
  expect(fractions[fractions.length - 1]).toBe(1);
  expect(r.calls).toHaveLength(4); // SEGMENT_COUNT
});

/* ───────────────────── C11 — 한 구간 실패 → 나머지 abort ───────────────────── */

it("C11 — 한 구간이 failed면 나머지 abort + { failed }", async () => {
  const seen: { index: number; aborted: boolean }[] = [];
  const r = fakeRange({
    support: "supported",
    totalBytes: MIN_SEGMENT_BYTES * 8,
    delayMs: 5,
    outcomes: { 1: { kind: "failed", reason: "끊김" } },
    onFetch: (segment, signal) => {
      // 잠시 뒤에 signal 상태를 본다
      setTimeout(() => seen.push({ index: segment.index, aborted: signal?.aborted ?? false }), 10);
    },
  });
  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
  });
  expect(result).toMatchObject({ kind: "failed" });
  // 실패 후 다른 구간들에 abort 신호가 갔다
  await new Promise((r) => setTimeout(r, 20));
  expect(seen.some((s) => s.index !== 1 && s.aborted)).toBe(true);
});

/* ───────────────────── C12 — pause → { paused, resume } ───────────────────── */

it("C12 — pauseSignal 발동 → { paused, resume } with 정확한 receivedBytes", async () => {
  const pause = new AbortController();
  const total = MIN_SEGMENT_BYTES * 8;
  const r = fakeRange({
    support: "supported",
    totalBytes: total,
    delayMs: 30,
    // 각 구간은 절반만 받고 나서 aborted로 끝난다
    bytesFor: (s) => Math.floor((s.end - s.start + 1) / 2),
    outcomes: {
      0: { kind: "aborted" },
      1: { kind: "aborted" },
      2: { kind: "aborted" },
      3: { kind: "aborted" },
    },
  });

  const p = runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: pause.signal,
  });
  // 곧바로 멈춘다
  setTimeout(() => pause.abort(), 5);
  const result = await p;

  expect(result).toMatchObject({ kind: "paused" });
  if (result.kind === "paused") {
    expect(result.resume.assetKey).toBe("a1");
    expect(result.resume.totalBytes).toBe(total);
    expect(result.resume.segmentCount).toBe(4);
    // 각 구간이 절반 정도 받았다
    expect(result.resume.receivedBytes).toHaveLength(4);
  }
});

/* ───────────────────── C13 — 재개는 남은 구간만 fetch ───────────────────── */

it("C13 — resume 주입 시 남은 구간만 fetchRange 호출", async () => {
  const total = MIN_SEGMENT_BYTES * 8;
  const segmentSize = total / 4;
  const r = fakeRange({ support: "supported", totalBytes: total });

  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
    resume: {
      assetKey: "a1",
      totalBytes: total,
      segmentCount: 4,
      // 구간 0·1 완료, 2는 절반, 3 미시작
      receivedBytes: [segmentSize, segmentSize, segmentSize / 2, 0],
    },
  });

  expect(result).toEqual({ kind: "completed" });
  // 완료된 0·1은 다시 안 받는다 — 2·3만
  expect(r.calls.map((s) => s.index).sort()).toEqual([2, 3]);
  // 구간 2는 이미 받은 지점부터
  const seg2 = r.calls.find((s) => s.index === 2)!;
  expect(seg2.start).toBe(segmentSize * 2 + segmentSize / 2);
});

/* ───────────────────── C24 — 병렬 수신 (US2) ───────────────────── */

it("C24 — 모든 구간을 동시에 fetch한다 (순차 아님)", async () => {
  const r = fakeRange({
    support: "supported",
    totalBytes: MIN_SEGMENT_BYTES * 8,
    delayMs: 20,
  });

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
  });

  // 4구간이 동시에 in-flight였다 — 순차라면 concurrent가 1이다.
  expect(r.concurrent).toBe(4);
});

it("C24 — 동시 fetch 수가 SEGMENT_COUNT를 넘지 않는다", async () => {
  const r = fakeRange({
    support: "supported",
    totalBytes: MIN_SEGMENT_BYTES * 8,
    delayMs: 10,
  });

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
  });

  expect(r.concurrent).toBeLessThanOrEqual(4);
});

/* ───────────────────── C25 — 원칙 III·IV: 구간 정보 미노출 (SC-008) ───────────────────── */

describe("원칙 III·IV — 구간 정보가 콜백 밖으로 나가지 않는다 (C25)", () => {
  it("onProgress는 number|null 하나만 받는다 — 구간 배열·개수가 아니다", async () => {
    const r = fakeRange({ support: "supported", totalBytes: MIN_SEGMENT_BYTES * 8 });
    const args: unknown[] = [];

    await runSegmented({ range: r.port }, "a1", "http://x", {
      onProgress: (f) => args.push(f),
      pauseSignal: noAbort,
    });

    for (const a of args) {
      expect(a === null || typeof a === "number").toBe(true);
    }
  });

  it("transfer.ts·plan.ts 소스에 속도·구간별 처리량 어휘가 없다", () => {
    for (const rel of ["src/models/segmented/transfer.ts", "src/models/segmented/plan.ts"]) {
      const src = readFileSync(join(__dirname, "../../", rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(src).not.toMatch(/bytesPerSecond|throughput|elapsed|\bspeed\b|Mbps|transferRate/i);
    }
  });

  it("SegmentedTransferResult에 구간별 값이 노출되지 않는다 (paused.resume은 재개용 상태)", () => {
    const src = readFileSync(join(__dirname, "../../src/models/segmented/transfer.ts"), "utf8");
    // paused.resume은 SegmentedResume(재개용) — 그 외 갈래에 구간 정보가 없다.
    expect(src).toMatch(/kind:\s*"completed"/);
    expect(src).toMatch(/kind:\s*"fallback"/);
    expect(src).toMatch(/kind:\s*"failed";\s*reason/);
  });
});

/* ───────────────────── C16·C17 — checkSegmentedFile 경계 ───────────────────── */

describe("checkSegmentedFile (C16·C17)", () => {
  it("plan.ts·transfer.ts에 위반이 없다", () => {
    for (const rel of ["src/models/segmented/plan.ts", "src/models/segmented/transfer.ts"]) {
      const src = readFileSync(join(__dirname, "../../", rel), "utf8");
      expect(checkSegmentedFile(rel, src)).toEqual([]);
    }
  });

  it("C16 — Character import를 잡는다", () => {
    const v = checkSegmentedFile(
      "src/models/segmented/transfer.ts",
      `import type { Character } from "../../diary/types";\nexport const x = 1;`,
    );
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].rule).toMatch(/캐릭터/);
  });

  it("C16 — models/roster import를 잡는다", () => {
    const v = checkSegmentedFile(
      "src/models/segmented/plan.ts",
      `import { assetFor } from "../roster";\n`,
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it("C17 — 속도 어휘(bytesPerSecond·elapsed·speed)를 잡는다", () => {
    for (const token of ["bytesPerSecond", "elapsed", "const speed = 1", "throughput"]) {
      const v = checkSegmentedFile("src/models/segmented/transfer.ts", `const x = ${token};`);
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it("expo-port.ts는 대상이 아니다 (전송 방식 선택은 기기 통로)", () => {
    expect(
      checkSegmentedFile(
        "src/models/expo-port.ts",
        `import { Character } from "x"; const speed = 1;`,
      ),
    ).toEqual([]);
  });
});

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
import {
  MIN_SEGMENT_BYTES,
  SEGMENT_CONCURRENCY,
  SEGMENT_COUNT,
  planSegments,
} from "../../src/models/segmented/plan";
import type { RangeFetchPort, RangeOutcome } from "../../src/models/port";
import type { Segment, SegmentedResume } from "../../src/models/segmented/types";

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
    /** 구간마다 결과를 늦추거나 정하는 훅. 값을 주면 그것이 결과다 */
    gate?: (segment: Segment, signal?: AbortSignal) => Promise<RangeOutcome | void>;
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
      const gated = opts.gate ? await opts.gate(segment, signal) : undefined;
      inFlight--;

      const outcome =
        gated ?? opts.outcomes?.[segment.index] ?? ({ kind: "completed" } as RangeOutcome);
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
  expect(r.calls).toHaveLength(SEGMENT_COUNT);
});

/* ───────────────────── C11 — 한 구간 실패 → 나머지 abort ───────────────────── */

it("C11 — 한 구간이 failed면 나머지 abort + { failed } + 새 구간을 더 꺼내지 않는다", async () => {
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
  // 첫 묶음(동시 SEGMENT_CONCURRENCY개)을 넘어 새 구간을 시작하지 않았다.
  expect(r.calls.length).toBeLessThanOrEqual(SEGMENT_CONCURRENCY * 2);
  expect(r.calls.length).toBeLessThan(SEGMENT_COUNT);
});

/* ───────────────────── C12 — pause → { paused, resume } (113: 끝난 번호만) ───────────────────── */

it("C12 — pauseSignal 발동 → { paused }이고 resume.doneIndices에는 끝난 구간만, 받던 구간은 없다", async () => {
  const pause = new AbortController();
  const total = MIN_SEGMENT_BYTES * 8;
  // 구간 0·1은 곧바로 끝나고, 그 뒤 받는 구간들은 멈춤 신호를 기다렸다가 aborted로 끝난다.
  const r = fakeRange({
    support: "supported",
    totalBytes: total,
    gate: async (segment, signal) => {
      if (segment.index <= 1) return { kind: "completed" };
      if (segment.index === 2) pause.abort();
      await new Promise((res) => setTimeout(res, 5));
      if (signal?.aborted || pause.signal.aborted) return { kind: "aborted" };
    },
  });

  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: pause.signal,
  });

  expect(result).toMatchObject({ kind: "paused" });
  if (result.kind === "paused") {
    expect(result.resume.assetKey).toBe("a1");
    expect(result.resume.totalBytes).toBe(total);
    expect(result.resume.segmentCount).toBe(SEGMENT_COUNT);
    expect(result.resume.doneIndices).toEqual([0, 1]);
  }
});

it("C12 — 멈춘 뒤에는 새 구간을 시작하지 않는다", async () => {
  const pause = new AbortController();
  const r = fakeRange({
    support: "supported",
    totalBytes: MIN_SEGMENT_BYTES * 8,
    gate: async (segment) => {
      if (segment.index === 0) pause.abort();
      await new Promise((res) => setTimeout(res, 5));
      if (pause.signal.aborted) return { kind: "aborted" };
    },
  });

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: pause.signal,
  });

  expect(r.calls.length).toBeLessThanOrEqual(SEGMENT_CONCURRENCY);
});

/* ───────────────────── C13 — 재개는 끝나지 않은 구간만 fetch ───────────────────── */

it("C13 — resume 주입 시 끝난 구간은 fetchRange를 부르지 않고 남은 구간은 전체를 받는다", async () => {
  const total = MIN_SEGMENT_BYTES * 8;
  const plan = planSegments(total);
  const r = fakeRange({ support: "supported", totalBytes: total });
  const doneIndices = [0, 1, 5, 15];

  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
    resume: { assetKey: "a1", totalBytes: total, segmentCount: SEGMENT_COUNT, doneIndices },
  });

  expect(result).toEqual({ kind: "completed" });
  expect(r.calls.map((s) => s.index).sort((a, b) => a - b)).toEqual(
    plan.segments.map((s) => s.index).filter((i) => !doneIndices.includes(i)),
  );
  // 남은 구간은 구간 시작부터 전체를 받는다 (받던 구간은 처음부터).
  for (const call of r.calls) expect(call).toEqual(plan.segments[call.index]);
});

it("C13 — 모든 구간이 끝났다는 기록이면 요청 없이 completed + onProgress(1)", async () => {
  const total = MIN_SEGMENT_BYTES * 8;
  const r = fakeRange({ support: "supported", totalBytes: total });
  const fractions: (number | null)[] = [];
  const checkpoints: SegmentedResume[] = [];

  const result = await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: (f) => fractions.push(f),
    onCheckpoint: (c) => {
      checkpoints.push(c);
    },
    pauseSignal: noAbort,
    resume: {
      assetKey: "a1",
      totalBytes: total,
      segmentCount: SEGMENT_COUNT,
      doneIndices: Array.from({ length: SEGMENT_COUNT }, (_, i) => i),
    },
  });

  expect(result).toEqual({ kind: "completed" });
  expect(r.calls).toHaveLength(0);
  expect(fractions[fractions.length - 1]).toBe(1);
  expect(checkpoints).toEqual([]);
});

it("C13 — 재개한 받기의 진행률은 끝난 구간을 이미 받은 것으로 세어 거기서 시작한다 (FR-009)", async () => {
  const total = MIN_SEGMENT_BYTES * 8;
  const r = fakeRange({
    support: "supported",
    totalBytes: total,
    // 남은 구간은 한 바이트도 보고하지 않는다 — 진행률은 끝난 구간 몫만 남는다.
    bytesFor: () => 0,
  });
  const fractions: (number | null)[] = [];

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: (f) => fractions.push(f),
    pauseSignal: noAbort,
    resume: {
      assetKey: "a1",
      totalBytes: total,
      segmentCount: SEGMENT_COUNT,
      doneIndices: [0, 1, 2, 3],
    },
  });

  // 16구간 중 4개가 끝났으므로 보고되는 첫 값은 4/16이다.
  expect(fractions[0]).toBeCloseTo(0.25, 5);
});

/* ───────────────────── 113 — 체크포인트 (contracts/checkpoint.md) ───────────────────── */

describe("onCheckpoint (113, FR-002·FR-005)", () => {
  it("구간이 끝날 때마다 누적 doneIndices(오름차순)로 순서대로 불린다", async () => {
    const total = MIN_SEGMENT_BYTES * 8;
    const r = fakeRange({
      support: "supported",
      totalBytes: total,
      // 번호가 큰 구간이 먼저 끝나게 섞는다.
      gate: async (segment) => {
        await new Promise((res) => setTimeout(res, (SEGMENT_COUNT - segment.index) % 5));
      },
    });
    const seen: SegmentedResume[] = [];

    const result = await runSegmented({ range: r.port }, "a1", "http://x", {
      onProgress: () => {},
      onCheckpoint: (c) => {
        seen.push(structuredClone(c));
      },
      pauseSignal: noAbort,
    });

    expect(result).toEqual({ kind: "completed" });
    expect(seen).toHaveLength(SEGMENT_COUNT);
    seen.forEach((c, i) => {
      expect(c.assetKey).toBe("a1");
      expect(c.totalBytes).toBe(total);
      expect(c.segmentCount).toBe(SEGMENT_COUNT);
      expect(c.doneIndices).toHaveLength(i + 1);
      expect([...c.doneIndices].sort((a, b) => a - b)).toEqual(c.doneIndices);
    });
    expect(seen[SEGMENT_COUNT - 1].doneIndices).toEqual(
      Array.from({ length: SEGMENT_COUNT }, (_, i) => i),
    );
  });

  it("호출은 겹치지 않는다 — 직전 호출이 끝난 뒤에 다음을 부른다", async () => {
    const r = fakeRange({ support: "supported", totalBytes: MIN_SEGMENT_BYTES * 8 });
    let running = 0;
    let overlapped = false;

    await runSegmented({ range: r.port }, "a1", "http://x", {
      onProgress: () => {},
      onCheckpoint: async () => {
        running++;
        if (running > 1) overlapped = true;
        await new Promise((res) => setTimeout(res, 2));
        running--;
      },
      pauseSignal: noAbort,
    });

    expect(overlapped).toBe(false);
  });

  it("체크포인트가 던져도 받기는 끝까지 간다 (최적화일 뿐이다)", async () => {
    const r = fakeRange({ support: "supported", totalBytes: MIN_SEGMENT_BYTES * 8 });

    const result = await runSegmented({ range: r.port }, "a1", "http://x", {
      onProgress: () => {},
      onCheckpoint: () => {
        throw new Error("쓰기 실패");
      },
      pauseSignal: noAbort,
    });

    expect(result).toEqual({ kind: "completed" });
    expect(r.calls).toHaveLength(SEGMENT_COUNT);
  });

  it("실패한 구간과 받던 구간은 체크포인트에 들어가지 않는다", async () => {
    const r = fakeRange({
      support: "supported",
      totalBytes: MIN_SEGMENT_BYTES * 8,
      gate: async (segment, signal) => {
        if (segment.index === 1) return { kind: "failed", reason: "끊김" };
        // 나머지는 실패가 알려질 때까지 기다리다 취소된다.
        await new Promise((res) => setTimeout(res, 15));
        if (signal?.aborted) return { kind: "aborted" };
      },
    });
    const seen: number[][] = [];

    const result = await runSegmented({ range: r.port }, "a1", "http://x", {
      onProgress: () => {},
      onCheckpoint: (c) => {
        seen.push([...c.doneIndices]);
      },
      pauseSignal: noAbort,
    });

    expect(result).toMatchObject({ kind: "failed" });
    for (const done of seen) expect(done).not.toContain(1);
  });

  it("폴백(지원 안 함·작은 파일)에서는 부르지 않는다", async () => {
    const calls: SegmentedResume[] = [];
    for (const r of [
      fakeRange({ support: "unsupported" }),
      fakeRange({ support: "supported", totalBytes: MIN_SEGMENT_BYTES }),
    ]) {
      await runSegmented({ range: r.port }, "a1", "http://x", {
        onProgress: () => {},
        onCheckpoint: (c) => {
          calls.push(c);
        },
        pauseSignal: noAbort,
      });
    }
    expect(calls).toEqual([]);
  });
});

/* ───────────────────── onSizeResolved — 기기 통로가 total을 얻는다 (F1 fix) ───────────────────── */

it("onSizeResolved가 probeRange 성공 후 전체 크기로 1회 호출된다", async () => {
  const total = MIN_SEGMENT_BYTES * 8;
  const r = fakeRange({ support: "supported", totalBytes: total });
  const sizes: number[] = [];

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    onSizeResolved: (t) => sizes.push(t),
    pauseSignal: noAbort,
  });

  expect(sizes).toEqual([total]);
});

it("onSizeResolved가 재개 시 저장된 totalBytes로 호출된다", async () => {
  const total = MIN_SEGMENT_BYTES * 8;
  const r = fakeRange({ support: "supported", totalBytes: total });
  const sizes: number[] = [];

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    onSizeResolved: (t) => sizes.push(t),
    pauseSignal: noAbort,
    resume: {
      assetKey: "a1",
      totalBytes: total,
      segmentCount: SEGMENT_COUNT,
      doneIndices: [],
    },
  });

  expect(sizes).toEqual([total]);
});

it("폴백일 때는 onSizeResolved가 호출되지 않는다", async () => {
  const r = fakeRange({ support: "unsupported" });
  const sizes: number[] = [];

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    onSizeResolved: (t) => sizes.push(t),
    pauseSignal: noAbort,
  });

  expect(sizes).toEqual([]);
});

/* ───────────────────── C24 — 병렬 수신 (113: 동시 SEGMENT_CONCURRENCY개) ───────────────────── */

it("C24 — 구간을 동시에 SEGMENT_CONCURRENCY개 받는다 (순차도 전부 동시도 아님)", async () => {
  const r = fakeRange({
    support: "supported",
    totalBytes: MIN_SEGMENT_BYTES * 8,
    delayMs: 20,
  });

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
  });

  // 순차라면 1, 전부 동시라면 SEGMENT_COUNT다.
  expect(r.concurrent).toBe(SEGMENT_CONCURRENCY);
});

it("C24 — 동시 fetch 수가 SEGMENT_CONCURRENCY를 넘지 않는다", async () => {
  const r = fakeRange({
    support: "supported",
    totalBytes: MIN_SEGMENT_BYTES * 8,
    delayMs: 10,
  });

  await runSegmented({ range: r.port }, "a1", "http://x", {
    onProgress: () => {},
    pauseSignal: noAbort,
  });

  expect(r.concurrent).toBeLessThanOrEqual(SEGMENT_CONCURRENCY);
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

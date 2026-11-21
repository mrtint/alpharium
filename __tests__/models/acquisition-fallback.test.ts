/**
 * 예비 경로 전환과 옛 a1 정리 (122).
 *
 * 계약: specs/122-diary-model-r2-fallback/contracts/acquisition-fallback.md AF1~AF8
 *       spec.md US3 (옛 파일·옛 구간 기록 정리, 정리 뒤 이어받기)
 *
 * 파일 시스템·내려받기를 대역으로 갈아끼운다. 대역 파일은 크기만 가진 「가짜 파일」이며,
 * 받기 호출이 끝나면 받은 만큼 크기가 바뀐다.
 */

import { createAcquisition } from "../../src/models/acquisition";
import type {
  DiskSpacePort,
  DownloadPort,
  MetadataPort,
  ModelFilePort,
  TransferHandle,
  TransferOutcome,
} from "../../src/models/port";
import { assetFor } from "../../src/models/roster";
import { planSegments } from "../../src/models/segmented/plan";
import type { SegmentCheckpoint, SegmentedResume } from "../../src/models/segmented/types";
import { readState, writeState, type ModelState } from "../../src/models/storage";

const ASSET = assetFor("quiet");
const OLD_BYTES = 1_522_796_768;
const OLD_MD5 = "d8506380fd1f0fdb8e4318a01b8b8e34";

type Call = { op: "start" | "resume"; url: string; state: unknown };

/** 한 번의 받기 호출이 무엇을 하는가 */
type Step = {
  outcome: TransferOutcome;
  /** 받기가 끝난 뒤 파일 크기. 없으면 그대로 */
  bytesAfter?: number;
  /** 체크포인트로 남길 끝난 구간 */
  checkpointDone?: number[];
};

function harness(opts: {
  initialBytes: number | null;
  initialState?: ModelState;
  steps: Step[];
  /** 지문 계산 결과. 기본은 파일이 기준 크기면 기준 지문, 아니면 옛 지문 */
  hash?: (bytes: number | null) => string | null;
}) {
  let bytes = opts.initialBytes;
  let stored: string | null = null;
  const calls: Call[] = [];
  const removed: string[] = [];
  const steps = [...opts.steps];

  const metadata: MetadataPort = {
    async read() {
      return stored;
    },
    async writeAtomically(contents) {
      stored = contents;
    },
  };

  const files: ModelFilePort = {
    async facts() {
      return { exists: bytes !== null, bytes };
    },
    async contentHash() {
      if (opts.hash) return opts.hash(bytes);
      if (bytes === null) return null;
      return bytes === ASSET.expectedBytes ? ASSET.md5 : OLD_MD5;
    },
    async remove(key) {
      removed.push(key);
      bytes = null;
    },
    async bytesUsed() {
      return bytes ?? 0;
    },
  };

  const disk: DiskSpacePort = {
    async availableBytes() {
      return Number.MAX_SAFE_INTEGER;
    },
  };

  const handle = (call: Call, checkpoint: SegmentCheckpoint | undefined): TransferHandle => {
    calls.push(call);
    const step = steps.shift();
    if (step === undefined) throw new Error(`예상하지 못한 받기 호출 ${call.op} ${call.url}`);
    return {
      async wait() {
        if (step.checkpointDone !== undefined) {
          await checkpoint?.({
            assetKey: ASSET.key,
            totalBytes: ASSET.expectedBytes,
            segmentCount: planSegments(ASSET.expectedBytes).segments.length,
            doneIndices: step.checkpointDone,
          });
        }
        if (step.bytesAfter !== undefined) bytes = step.bytesAfter;
        return step.outcome;
      },
      async pause() {},
    };
  };

  const download: DownloadPort = {
    start(_key, url, _onProgress, checkpoint) {
      return handle({ op: "start", url, state: null }, checkpoint);
    },
    resume(_key, url, state, _onProgress, checkpoint) {
      return handle({ op: "resume", url, state }, checkpoint);
    },
  };

  const acquisition = createAcquisition({ files, metadata, disk, download });
  return {
    acquisition,
    calls,
    removed,
    metadata,
    async seed(state: ModelState) {
      await writeState(metadata, state);
    },
    state: () => readState(metadata),
    bytes: () => bytes,
  };
}

const EMPTY: ModelState = { verdicts: [], paused: [], segmented: [] };
const SEGMENTS = planSegments(ASSET.expectedBytes).segments;
const FULL = ASSET.expectedBytes;
/** 구간 0~3이 끝났을 때 파일이 최소한 닿는 크기 */
const AFTER_FOUR = SEGMENTS[3]!.end + 1;

describe("122 — 로스터 전제", () => {
  test("a1에는 주 경로와 다른 예비 경로가 있다", () => {
    expect(ASSET.fallbackUrl).toBeDefined();
    expect(ASSET.fallbackUrl).not.toBe(ASSET.url);
  });
});

describe("122 AF — 예비 경로 전환", () => {
  test("AF1·AF2: 주 경로 실패 → 예비 경로로 한 번, 끝난 구간은 이어받는다", async () => {
    const h = harness({
      initialBytes: null,
      steps: [
        {
          outcome: { kind: "failed", reason: "HTTP 503" },
          checkpointDone: [0, 1, 2, 3],
          bytesAfter: AFTER_FOUR,
        },
        { outcome: { kind: "completed" }, bytesAfter: FULL },
      ],
    });

    const result = await h.acquisition.prepare("quiet");

    expect(result).toEqual({ ok: true, verified: true });
    expect(h.calls.map((c) => [c.op, c.url])).toEqual([
      ["start", ASSET.url],
      ["resume", ASSET.fallbackUrl],
    ]);
    expect((h.calls[1]!.state as SegmentedResume).doneIndices).toEqual([0, 1, 2, 3]);
  });

  test("AF2: 끝난 구간이 없으면 예비 경로는 처음부터", async () => {
    const h = harness({
      initialBytes: null,
      steps: [
        { outcome: { kind: "failed", reason: "dns" } },
        { outcome: { kind: "completed" }, bytesAfter: FULL },
      ],
    });

    expect(await h.acquisition.prepare("quiet")).toEqual({ ok: true, verified: true });
    expect(h.calls.map((c) => [c.op, c.url])).toEqual([
      ["start", ASSET.url],
      ["start", ASSET.fallbackUrl],
    ]);
  });

  test("AF3: 단일 스트림 재개 기록(옛 주소)은 받기 시작에서 부분 파일과 함께 지우고 처음부터 받는다", async () => {
    const h = harness({
      initialBytes: 300_000_000,
      steps: [{ outcome: { kind: "completed" }, bytesAfter: FULL }],
    });
    await h.seed({ ...EMPTY, paused: [{ assetKey: ASSET.key, state: { url: "old" } }] });

    expect(await h.acquisition.prepare("quiet")).toEqual({ ok: true, verified: true });
    expect(h.removed).toEqual([ASSET.key]);
    expect(h.calls.map((c) => [c.op, c.url])).toEqual([["start", ASSET.url]]);
    expect((await h.state()).paused).toEqual([]);
  });

  test("AF4: 주 경로 실패 뒤 기록을 정리하는 사이에 멈추면 예비 경로를 시작하지 않는다", async () => {
    const urls: string[] = [];
    let stored: string | null = null;
    let primaryFailed = false;
    let pauseFired = false;
    let acquisition: ReturnType<typeof createAcquisition>;
    acquisition = createAcquisition({
      files: {
        facts: async () => ({ exists: false, bytes: null }),
        contentHash: async () => null,
        remove: async () => {},
        bytesUsed: async () => 0,
      },
      metadata: {
        read: async () => {
          // 주 경로가 실패한 뒤 첫 기록 읽기(예비 경로 준비) 도중에 사용자가 멈춘다.
          if (primaryFailed && !pauseFired) {
            pauseFired = true;
            void acquisition.pause("quiet");
          }
          return stored;
        },
        writeAtomically: async (c) => {
          stored = c;
        },
      },
      disk: { availableBytes: async () => Number.MAX_SAFE_INTEGER },
      download: {
        start(_k, url) {
          urls.push(url);
          return {
            wait: async () => {
              primaryFailed = true;
              return { kind: "failed", reason: "r2" };
            },
            pause: async () => {},
          };
        },
        resume() {
          throw new Error("재개 없음");
        },
      },
    });

    expect(await acquisition.prepare("quiet")).toEqual({
      ok: false,
      failure: { kind: "network", reason: "받다가 멈췄다" },
    });
    expect(pauseFired).toBe(true);
    expect(urls).toEqual([ASSET.url]);
  });

  test("AF4: 사용자가 멈추면 예비 경로로 넘어가지 않는다", async () => {
    const paused: SegmentedResume = {
      assetKey: ASSET.key,
      totalBytes: FULL,
      segmentCount: SEGMENTS.length,
      doneIndices: [0],
    };
    const h = harness({
      initialBytes: null,
      steps: [{ outcome: { kind: "paused", state: paused }, bytesAfter: SEGMENTS[0]!.end + 1 }],
    });

    const result = await h.acquisition.prepare("quiet");

    expect(result).toEqual({ ok: false, failure: { kind: "network", reason: "받다가 멈췄다" } });
    expect(h.calls).toHaveLength(1);
  });

  test("AF4: 멈추기를 누른 뒤 주 경로가 실패로 끝나도 예비 경로로 넘어가지 않는다", async () => {
    let release: (o: TransferOutcome) => void = () => {};
    const urls: string[] = [];
    let stored: string | null = null;
    const acquisition = createAcquisition({
      files: {
        facts: async () => ({ exists: false, bytes: null }),
        contentHash: async () => null,
        remove: async () => {},
        bytesUsed: async () => 0,
      },
      metadata: {
        read: async () => stored,
        writeAtomically: async (c) => {
          stored = c;
        },
      },
      disk: { availableBytes: async () => Number.MAX_SAFE_INTEGER },
      download: {
        start(_k, url) {
          urls.push(url);
          return {
            wait: () => new Promise<TransferOutcome>((r) => (release = r)),
            // 멈추는 도중 연결이 끊겨 실패로 끝나는 경우
            pause: async () => release({ kind: "failed", reason: "취소" }),
          };
        },
        resume() {
          throw new Error("재개 없음");
        },
      },
    });

    const pending = acquisition.prepare("quiet");
    for (let i = 0; i < 100 && urls.length < 1; i++) await new Promise((r) => setImmediate(r));
    await acquisition.pause("quiet");

    expect(await pending).toEqual({ ok: false, failure: { kind: "network", reason: "취소" } });
    expect(urls).toEqual([ASSET.url]);
  });

  test("AF4: 검증 실패는 예비 경로로 다시 받지 않는다", async () => {
    const h = harness({
      initialBytes: null,
      steps: [{ outcome: { kind: "completed" }, bytesAfter: FULL }],
      hash: (b) => (b === null ? null : "0".repeat(32)),
    });

    expect(await h.acquisition.prepare("quiet")).toEqual({
      ok: false,
      failure: { kind: "verification-failed" },
    });
    expect(h.calls).toHaveLength(1);
  });

  test("AF5: 예비 경로도 실패하면 예비의 까닭으로 연결 실패, 그 이상 시도하지 않는다", async () => {
    const h = harness({
      initialBytes: null,
      steps: [
        { outcome: { kind: "failed", reason: "r2" } },
        { outcome: { kind: "failed", reason: "hf" } },
      ],
    });

    expect(await h.acquisition.prepare("quiet")).toEqual({
      ok: false,
      failure: { kind: "network", reason: "hf" },
    });
    expect(h.calls).toHaveLength(2);
  });

  test("AF6: 예비 경로에서 멈추면 재개 기록을 남긴다", async () => {
    const resume: SegmentedResume = {
      assetKey: ASSET.key,
      totalBytes: FULL,
      segmentCount: SEGMENTS.length,
      doneIndices: [0, 1],
    };
    const h = harness({
      initialBytes: null,
      steps: [
        { outcome: { kind: "failed", reason: "r2" } },
        { outcome: { kind: "paused", state: resume }, bytesAfter: SEGMENTS[1]!.end + 1 },
      ],
    });

    expect(await h.acquisition.prepare("quiet")).toEqual({
      ok: false,
      failure: { kind: "network", reason: "받다가 멈췄다" },
    });
    expect((await h.state()).segmented).toEqual([resume]);
  });

  test("AF7: 예비 경로로 받는 동안 pause()가 그 받기를 멈춘다", async () => {
    let fallbackPaused = false;
    let release: (o: TransferOutcome) => void = () => {};
    const files: ModelFilePort = {
      async facts() {
        return { exists: false, bytes: null };
      },
      async contentHash() {
        return null;
      },
      async remove() {},
      async bytesUsed() {
        return 0;
      },
    };
    let stored: string | null = null;
    const metadata: MetadataPort = {
      async read() {
        return stored;
      },
      async writeAtomically(c) {
        stored = c;
      },
    };
    let started = 0;
    const download: DownloadPort = {
      start(_k, url) {
        started += 1;
        if (url === ASSET.url) {
          return { wait: async () => ({ kind: "failed", reason: "r2" }), pause: async () => {} };
        }
        return {
          wait: () => new Promise<TransferOutcome>((r) => (release = r)),
          pause: async () => {
            fallbackPaused = true;
            release({ kind: "paused", state: { opaque: true } });
          },
        };
      },
      resume() {
        throw new Error("재개 없음");
      },
    };
    const acquisition = createAcquisition({
      files,
      metadata,
      disk: { availableBytes: async () => Number.MAX_SAFE_INTEGER },
      download,
    });

    const pending = acquisition.prepare("quiet");
    // 예비 경로가 시작될 때까지 기다린다. 전환이 없으면 영영 오지 않으므로 횟수를 묶는다.
    for (let i = 0; i < 100 && started < 2; i++) await new Promise((r) => setImmediate(r));
    expect(started).toBe(2);
    await acquisition.pause("quiet");

    expect(fallbackPaused).toBe(true);
    expect(await pending).toEqual({
      ok: false,
      failure: { kind: "network", reason: "받다가 멈췄다" },
    });
  });
});

describe("122 US3 — 옛 a1 정리", () => {
  test("옛 파일(기준보다 큼)과 옛 검증 기록 → 지우고 새로 받는다", async () => {
    const h = harness({
      initialBytes: OLD_BYTES,
      steps: [{ outcome: { kind: "completed" }, bytesAfter: FULL }],
    });
    await h.seed({
      ...EMPTY,
      verdicts: [
        { assetKey: ASSET.key, verifiedMd5: OLD_MD5, verifiedBytes: OLD_BYTES, passed: true },
      ],
    });

    expect(await h.acquisition.prepare("quiet")).toEqual({ ok: true, verified: true });
    expect(h.removed).toEqual([ASSET.key]);
    expect(h.calls.map((c) => [c.op, c.url])).toEqual([["start", ASSET.url]]);
    expect((await h.state()).verdicts).toEqual([
      { assetKey: ASSET.key, verifiedMd5: ASSET.md5, verifiedBytes: FULL, passed: true },
    ]);
  });

  test("옛 크기로 적힌 구간 기록과 부분 파일 → 지우고 처음부터", async () => {
    const h = harness({
      initialBytes: 400_000_000,
      steps: [{ outcome: { kind: "completed" }, bytesAfter: FULL }],
    });
    await h.seed({
      ...EMPTY,
      segmented: [
        {
          assetKey: ASSET.key,
          totalBytes: OLD_BYTES,
          segmentCount: planSegments(OLD_BYTES).segments.length,
          doneIndices: [0, 1, 2],
        },
      ],
    });

    expect(await h.acquisition.prepare("quiet")).toEqual({ ok: true, verified: true });
    expect(h.removed).toEqual([ASSET.key]);
    expect(h.calls.map((c) => c.op)).toEqual(["start"]);
  });

  test("정리 뒤 받다 멈춘 기기 → 다음 받기는 지우지 않고 이어받는다", async () => {
    const resume: SegmentedResume = {
      assetKey: ASSET.key,
      totalBytes: FULL,
      segmentCount: SEGMENTS.length,
      doneIndices: [0, 1, 2, 3],
    };
    const h = harness({
      initialBytes: OLD_BYTES,
      steps: [
        { outcome: { kind: "paused", state: resume }, bytesAfter: AFTER_FOUR },
        { outcome: { kind: "completed" }, bytesAfter: FULL },
      ],
    });
    await h.seed({
      ...EMPTY,
      verdicts: [
        { assetKey: ASSET.key, verifiedMd5: OLD_MD5, verifiedBytes: OLD_BYTES, passed: true },
      ],
    });

    await h.acquisition.prepare("quiet");
    expect(h.removed).toHaveLength(1);

    expect(await h.acquisition.prepare("quiet")).toEqual({ ok: true, verified: true });
    expect(h.removed).toHaveLength(1);
    expect(h.calls.map((c) => [c.op, c.url])).toEqual([
      ["start", ASSET.url],
      ["resume", ASSET.url],
    ]);
  });

  test("새 모델을 받아 둔 기기는 다시 받지 않는다", async () => {
    const h = harness({ initialBytes: FULL, steps: [] });
    await h.seed({
      ...EMPTY,
      verdicts: [
        { assetKey: ASSET.key, verifiedMd5: ASSET.md5, verifiedBytes: FULL, passed: true },
      ],
    });

    expect(await h.acquisition.prepare("quiet")).toEqual({ ok: true, verified: true });
    expect(await h.acquisition.prepare("quiet")).toEqual({ ok: true, verified: true });
    expect(h.calls).toEqual([]);
    expect(h.removed).toEqual([]);
  });
});

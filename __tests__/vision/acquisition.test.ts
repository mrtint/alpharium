import {
  prepareVision,
  removeVision,
  visionReadiness,
  visionStorageBytes,
  type VisionAcquisitionPorts,
} from "../../src/vision/acquisition";
import { visionAssets } from "../../src/vision/roster";
import type { TransferOutcome, TransferProgress } from "../../src/models/port";
import { planSegments } from "../../src/models/segmented/plan";
import type { SegmentCheckpoint } from "../../src/models/segmented/types";
import { readState } from "../../src/models/storage";

/**
 * 사진 보는 모델 준비의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-026~031
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **003의 통로를 대역으로 갈아끼워 기기 없이 검증한다.**
 *
 * 이 모듈은 003의 계약을 하나도 바꾸지 않는다 — `DownloadPort`가 이미 캐릭터를
 * 모르기 때문이다. 그래서 003의 테스트 29개가 그대로 남는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ASSETS = visionAssets();

type Options = {
  /** 기기에 이미 있는 파일: key → 바이트 */
  present?: Record<string, number>;
  free?: number;
  outcome?: TransferOutcome;
  hash?: string | null;
  /** 받기 전과 받은 뒤의 지문이 다를 때(깨진 파일을 다시 받는 경우). `hash`보다 먼저 쓴다 */
  hashes?: Record<string, string>;
  /** 113 — 시작할 때 이미 있는 state.json 내용 */
  metadata?: string | null;
  /** 113 — 받는 도중 일어나는 일(체크포인트 호출 등). 값을 주면 그것이 결과다 */
  scenario?: (ctx: {
    key: string;
    checkpoint?: SegmentCheckpoint;
    resumed: boolean;
  }) => Promise<TransferOutcome | void>;
};

function makePorts(options: Options = {}) {
  const files = new Map<string, number>(Object.entries(options.present ?? {}));
  const removed: string[] = [];
  const started: string[] = [];
  const hashed: string[] = [];
  const resumed: string[] = [];
  let metadata: string | null = options.metadata ?? null;

  const makeTask = (
    key: string,
    onProgress: (p: TransferProgress) => void,
    checkpoint: SegmentCheckpoint | undefined,
    isResume: boolean,
  ) => {
    return {
      async wait() {
        onProgress({ bytesWritten: 100, totalBytes: 100 });
        const scripted = await options.scenario?.({ key, checkpoint, resumed: isResume });
        if (scripted !== undefined) return scripted;
        const outcome = options.outcome ?? ({ kind: "completed" } as TransferOutcome);
        // 성공했으면 파일이 생긴 것으로 둔다.
        if (outcome.kind === "completed") {
          const asset = [ASSETS.base, ASSETS.projector].find((a) => a.key === key);
          files.set(key, asset?.expectedBytes ?? 0);
        }
        return outcome;
      },
      async pause() {},
    };
  };

  const ports: VisionAcquisitionPorts = {
    files: {
      async facts(key) {
        const bytes = files.get(key);
        return bytes === undefined ? { exists: false, bytes: null } : { exists: true, bytes };
      },
      /**
       * **로스터의 지문을 그대로 돌려주는 것이 기본이다.**
       *
       * 2026-08-22에 실기기에서 md5를 채록한 뒤로 `prepareVision()`이 **실제로
       * 검증한다** — 아무 문자열이나 돌려주면 그 검증에 걸려 실패한다. 그것이 검증이
       * 도는 증거이므로 대역을 「맞는 지문」으로 두고, **틀린 지문은 아래에서 일부러
       * 준다**(「지문이 다르면 거부한다」).
       */
      async contentHash(key) {
        hashed.push(key);
        const once = options.hashes?.[key];
        if (once !== undefined) {
          delete options.hashes?.[key];
          return once;
        }
        if (options.hash !== undefined) return options.hash;
        return key === ASSETS.base.key ? ASSETS.base.md5 : ASSETS.projector.md5;
      },
      async remove(key) {
        removed.push(key);
        files.delete(key);
      },
      async bytesUsed(key) {
        return files.get(key) ?? 0;
      },
    },
    metadata: {
      async read() {
        return metadata;
      },
      async writeAtomically(contents) {
        metadata = contents;
      },
    },
    disk: {
      async availableBytes() {
        return options.free ?? 10_000_000_000;
      },
    },
    download: {
      start(key, _url, onProgress: (p: TransferProgress) => void, checkpoint?: SegmentCheckpoint) {
        started.push(key);
        return makeTask(key, onProgress, checkpoint, false);
      },
      resume(key, _url, _state, onProgress, checkpoint) {
        resumed.push(key);
        return makeTask(key, onProgress, checkpoint, true);
      },
    } as VisionAcquisitionPorts["download"],
  };

  return { ports, files, removed, started, resumed, hashed, metadataOf: () => metadata };
}

describe("준비 상태 — 둘을 하나로 접는다 (FR-026)", () => {
  it("둘 다 없으면 받아야 함", async () => {
    const { ports } = makePorts();
    expect((await visionReadiness(ports)).kind).toBe("not-downloaded");
  });

  // ★ SC-009 — 하나라도 없으면 「쓸 수 있음」이 아니다.
  it("★ 본체만 있으면 ready가 아니다 (FR-027, SC-009)", async () => {
    const { ports } = makePorts({ present: { [ASSETS.base.key]: ASSETS.base.expectedBytes } });
    expect((await visionReadiness(ports)).kind).not.toBe("ready");
  });

  it("mmproj만 있어도 ready가 아니다", async () => {
    const { ports } = makePorts({
      present: { [ASSETS.projector.key]: ASSETS.projector.expectedBytes },
    });
    expect((await visionReadiness(ports)).kind).not.toBe("ready");
  });

  it("준비 상태에 파일이 둘이라는 것이 드러나지 않는다 (원칙 III)", async () => {
    const { ports } = makePorts({ present: { [ASSETS.base.key]: ASSETS.base.expectedBytes } });
    const readiness = await visionReadiness(ports);

    expect(JSON.stringify(readiness)).not.toMatch(/mmproj|projector|본체|파일 2|v1|v2/);
  });
});

describe("받기 — 두 파일을 함께 (FR-027)", () => {
  it("★ 두 파일을 다 받는다", async () => {
    const { ports, started } = makePorts();
    expect(await prepareVision(ports)).toEqual({ ok: true });

    expect(started).toEqual([ASSETS.base.key, ASSETS.projector.key]);
  });

  it("받고 나면 ready다", async () => {
    const { ports } = makePorts();
    await prepareVision(ports);

    expect((await visionReadiness(ports)).kind).toBe("ready");
  });

  it("이미 있으면 다시 받지 않는다", async () => {
    const { ports, started } = makePorts({
      present: {
        [ASSETS.base.key]: ASSETS.base.expectedBytes,
        [ASSETS.projector.key]: ASSETS.projector.expectedBytes,
      },
    });

    await prepareVision(ports);
    expect(started).toEqual([]);
  });

  // 110 — 검증 기록 전에 앱이 죽으면 크기만으로 성공을 돌려줘 받지도 준비되지도 못하는 상태에 갇혔다.
  it("★ 온전하고 기록이 없으면 받지 않고 ready가 된다 (110)", async () => {
    const { ports, started } = makePorts({
      present: {
        [ASSETS.base.key]: ASSETS.base.expectedBytes,
        [ASSETS.projector.key]: ASSETS.projector.expectedBytes,
      },
      free: 0,
    });

    expect((await visionReadiness(ports)).kind).not.toBe("ready");
    const result = await prepareVision(ports);

    expect(result).toEqual({ ok: true });
    expect(started).toEqual([]);
    expect((await visionReadiness(ports)).kind).toBe("ready");
  });

  it("이미 준비됐으면 지문을 다시 계산하지 않는다 (110)", async () => {
    const { ports, hashed } = makePorts();
    await prepareVision(ports);
    hashed.length = 0;

    await prepareVision(ports);

    expect(hashed).toEqual([]);
  });

  it("★ 크기만 맞고 내용이 다르면 지우고 그 파일만 다시 받는다 (110)", async () => {
    const { ports, started, removed } = makePorts({
      present: {
        [ASSETS.base.key]: ASSETS.base.expectedBytes,
        [ASSETS.projector.key]: ASSETS.projector.expectedBytes,
      },
      hashes: { [ASSETS.base.key]: "중간이 빈 파일" },
    });

    const result = await prepareVision(ports);

    expect(result).toEqual({ ok: true });
    expect(removed).toEqual([ASSETS.base.key]);
    expect(started).toEqual([ASSETS.base.key]);
    expect((await visionReadiness(ports)).kind).toBe("ready");
  });

  it("받은 직후의 검증 기록을 쓰지 못하면 성공으로 돌려주지 않는다 (110)", async () => {
    const { ports } = makePorts();
    ports.metadata.writeAtomically = async () => {
      throw new Error("쓰지 못했다");
    };

    await expect(prepareVision(ports)).rejects.toThrow("쓰지 못했다");
  });

  it("먼저 한 검증의 기록을 쓰지 못하면 성공으로 돌려주지 않는다 (110)", async () => {
    const { ports } = makePorts({
      present: { [ASSETS.base.key]: ASSETS.base.expectedBytes },
    });
    ports.metadata.writeAtomically = async () => {
      throw new Error("쓰지 못했다");
    };

    await expect(prepareVision(ports)).rejects.toThrow("쓰지 못했다");
  });

  it("지문을 계산하지 못하면 통과시키지 않고 받는다 (110)", async () => {
    const { ports, started, removed } = makePorts({
      present: { [ASSETS.base.key]: ASSETS.base.expectedBytes },
      hashes: {},
      hash: null,
    });

    const result = await prepareVision(ports);

    expect(removed).toContain(ASSETS.base.key);
    expect(started).toContain(ASSETS.base.key);
    expect(result.ok).toBe(false);
  });

  it("기준보다 큰 파일은 있다고 보지 않고 받는다 (110)", async () => {
    const { ports, started, hashed } = makePorts({
      present: { [ASSETS.base.key]: ASSETS.base.expectedBytes + 1 },
    });

    await prepareVision(ports);

    expect(started).toContain(ASSETS.base.key);
    expect(hashed.filter((key) => key === ASSETS.base.key)).toHaveLength(1);
  });

  it("공간이 모자라면 거부한다 — 크기를 말하지 않는다 (003 FR-019a)", async () => {
    const { ports } = makePorts({ free: 1000 });
    const result = await prepareVision(ports);

    expect(result).toEqual({ ok: false, failure: { kind: "insufficient-space" } });
    expect(JSON.stringify(result)).not.toMatch(/\d{6,}/);
  });

  it("네트워크가 실패하면 거부한다", async () => {
    const { ports } = makePorts({ outcome: { kind: "failed", reason: "끊겼다" } });
    const result = await prepareVision(ports);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.kind).toBe("network");
  });

  it("첫 파일이 실패하면 둘째를 받지 않는다", async () => {
    const { ports, started } = makePorts({ outcome: { kind: "failed", reason: "끊겼다" } });
    await prepareVision(ports);

    expect(started).toEqual([ASSETS.base.key]);
  });

  it("진행률이 하나의 비율로 나온다 — 파일이 둘인 것이 드러나지 않는다", async () => {
    const seen: (number | null)[] = [];
    const { ports } = makePorts();
    await prepareVision(ports, (f) => seen.push(f));

    expect(seen.length).toBeGreaterThan(0);
    for (const fraction of seen) {
      if (fraction !== null) {
        expect(fraction).toBeGreaterThanOrEqual(0);
        expect(fraction).toBeLessThanOrEqual(1);
      }
    }
    expect(seen[seen.length - 1]).toBe(1);
  });
});

/**
 * ★ FR-031 — 지문을 채록한다 (원칙 V).
 *
 * 003의 `readiness.md` 「기준값이 아직 없을 때」와 같은 방식이다.
 * **미리 적는 지문은 어디서 왔든 짐작이다.**
 */
describe("md5 — 채록하고 검증한다 (FR-031)", () => {
  it("★ 내려받은 파일의 지문을 남긴다", async () => {
    const { ports, metadataOf } = makePorts();
    await prepareVision(ports);

    expect(metadataOf()).toContain(ASSETS.base.md5);
    expect(metadataOf()).toContain(ASSETS.projector.md5);
  });

  /**
   * **★ 지문이 채록되기 전에는 이 갈래가 존재하지 않았다.**
   *
   * 로스터의 md5가 비어 있는 동안 `prepareVision()`은 무엇이 오든 통과시켰다 —
   * 채록이지 검증이 아니었고, 그 사실이 빈 문자열로 드러나 있었다. 실기기에서
   * 지문을 얻은 지금은 **다른 파일이 오면 거부한다.**
   */
  it("★ 지문이 다르면 거부하고 파일을 남기지 않는다", async () => {
    const { ports, removed } = makePorts({ hash: "0".repeat(32) });
    const result = await prepareVision(ports);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.kind).toBe("verification-failed");
    // 온전하지 않은 파일이 남으면 다음에 「있다」로 읽힌다
    expect(removed).toContain(ASSETS.base.key);
  });

  it("지문을 읽지 못하면 거부한다 — 확인하지 않은 것을 통과시키지 않는다", async () => {
    const { ports } = makePorts({ hash: null });
    const result = await prepareVision(ports);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.kind).toBe("verification-failed");
  });

  it("로스터의 지문이 실기기에서 채록한 값이다 (원칙 V)", () => {
    // 실측 (2026-08-22, SM-G986N). 두 번 받아 두 번 다 같은 값이었다.
    expect(ASSETS.base.md5).toBe("b0f40eda778e7563d8bc8a64be19134d");
    expect(ASSETS.projector.md5).toBe("7e8624e77234ee00c3c2f918220070c9");
  });
});

describe("지우기 — 둘 다 (FR-028)", () => {
  it("★ 두 파일을 모두 지운다", async () => {
    const { ports, removed } = makePorts({
      present: {
        [ASSETS.base.key]: ASSETS.base.expectedBytes,
        [ASSETS.projector.key]: ASSETS.projector.expectedBytes,
      },
    });

    await removeVision(ports);
    expect(removed.sort()).toEqual([ASSETS.base.key, ASSETS.projector.key].sort());
  });

  it("지우면 받아야 함으로 돌아간다", async () => {
    const { ports } = makePorts({
      present: {
        [ASSETS.base.key]: ASSETS.base.expectedBytes,
        [ASSETS.projector.key]: ASSETS.projector.expectedBytes,
      },
    });

    await removeVision(ports);
    expect((await visionReadiness(ports)).kind).toBe("not-downloaded");
  });

  it("없어도 조용히 넘어간다", async () => {
    const { ports } = makePorts();
    await expect(removeVision(ports)).resolves.toBeUndefined();
  });
});

describe("저장 공간 — 하나의 수 (FR-029)", () => {
  it("두 파일을 합쳐 낸다", async () => {
    const { ports } = makePorts({
      present: { [ASSETS.base.key]: 100, [ASSETS.projector.key]: 50 },
    });

    expect(await visionStorageBytes(ports)).toBe(150);
  });

  it("없으면 0이다", async () => {
    const { ports } = makePorts();
    expect(await visionStorageBytes(ports)).toBe(0);
  });

  it("하나만 있어도 그 크기가 나온다 — 자리를 차지하고 있다", async () => {
    const { ports } = makePorts({ present: { [ASSETS.base.key]: 100 } });
    expect(await visionStorageBytes(ports)).toBe(100);
  });
});

describe("끝난 구간을 기록하고 이어받는다 (113)", () => {
  const BASE = ASSETS.base;
  const COUNT = planSegments(BASE.expectedBytes).segments.length;
  const PLAN = planSegments(BASE.expectedBytes);
  const record = (assetKey: string, doneIndices: number[], over: object = {}) => ({
    assetKey,
    totalBytes: BASE.expectedBytes,
    segmentCount: COUNT,
    doneIndices,
    ...over,
  });
  const meta = (r: unknown) => JSON.stringify({ verdicts: [], paused: [], segmented: [r] });

  it("구간이 끝나면 그 번호가 state.json에 남는다", async () => {
    const h = makePorts({
      scenario: async ({ key, checkpoint }) => {
        if (key !== BASE.key) return;
        await checkpoint?.(record(key, [0, 2]));
        return { kind: "failed", reason: "끊김" };
      },
    });

    const result = await prepareVision(h.ports);

    expect(result.ok).toBe(false);
    const state = await readState({
      read: async () => h.metadataOf(),
      writeAtomically: async () => {},
    });
    expect(state.segmented).toEqual([record(BASE.key, [0, 2])]);
  });

  it("정합한 기록이 있으면 그 기록으로 이어받는다", async () => {
    const h = makePorts({
      present: { [BASE.key]: PLAN.segments[1].end + 1 },
      metadata: meta(record(BASE.key, [0, 1])),
    });

    const result = await prepareVision(h.ports);

    expect(result).toEqual({ ok: true });
    expect(h.resumed).toEqual([BASE.key]);
    expect(h.started).toEqual([ASSETS.projector.key]);
  });

  it("받기가 끝나면 구간 기록이 지워진다 — 남으면 다음에 받지도 검증하지도 못한다", async () => {
    const h = makePorts({
      present: { [BASE.key]: PLAN.segments[1].end + 1 },
      metadata: meta(record(BASE.key, [0, 1])),
    });

    await prepareVision(h.ports);

    const state = await readState({
      read: async () => h.metadataOf(),
      writeAtomically: async () => {},
    });
    expect(state.segmented).toEqual([]);
    expect(state.verdicts.map((v) => v.assetKey).sort()).toEqual(
      [ASSETS.base.key, ASSETS.projector.key].sort(),
    );
  });

  it("파일과 어긋난 기록은 지우고 처음부터 받는다", async () => {
    const h = makePorts({
      present: { [BASE.key]: PLAN.segments[3].end }, // 끝난 구간의 끝에 못 미친다
      metadata: meta(record(BASE.key, [0, 3])),
    });

    const result = await prepareVision(h.ports);

    expect(result).toEqual({ ok: true });
    expect(h.resumed).toEqual([]);
    expect(h.started).toContain(BASE.key);
    expect(h.removed).toContain(BASE.key);
  });

  it("지문이 달라 파일을 지우면 구간 기록도 지운다", async () => {
    const h = makePorts({
      present: { [BASE.key]: PLAN.segments[1].end + 1 },
      metadata: meta(record(BASE.key, [0, 1])),
      hash: "다른 지문",
    });

    const result = await prepareVision(h.ports);

    expect(result).toEqual({ ok: false, failure: { kind: "verification-failed" } });
    const state = await readState({
      read: async () => h.metadataOf(),
      writeAtomically: async () => {},
    });
    expect(state.segmented).toEqual([]);
  });

  it("이어받을 때는 남은 양만 공간으로 요구한다", async () => {
    const done = PLAN.segments.slice(0, COUNT - 1).map((s) => s.index);
    const last = PLAN.segments[COUNT - 1];
    const h = makePorts({
      present: { [BASE.key]: BASE.expectedBytes },
      metadata: meta(record(BASE.key, done)),
      // 본체는 마지막 구간만, 사진 투영 모델(처음부터)은 전체가 들어갈 자리.
      free: Math.max(last.end - last.start + 1, ASSETS.projector.expectedBytes),
    });

    const result = await prepareVision(h.ports);

    // 기준 크기가 파일과 같고 기록이 있어 이어받는다(먼저 검증하지 않는다 — 110).
    expect(result).toEqual({ ok: true });
    expect(h.resumed).toContain(BASE.key);
  });
});

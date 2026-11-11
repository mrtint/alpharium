/**
 * 내려받기 검증 (A1~A20).
 *
 * 계약: specs/003-character-model-files/contracts/acquisition.md
 *
 * **A1(고른 것만)·A2(다른 것 안 생김)가 헌법 로스터의 방어선이다.**
 * **A15(둘째 요청 거부)와 A17(멈추면 통함)이 짝이다** — 거부만 있고 빠져나갈 길이 없으면
 * 사용자가 갇힌다.
 *
 * 전부 기기 없이 돈다. `port.ts` 대역으로 네트워크와 파일 시스템을 갈아끼운다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createAcquisition, fractionOf, SPACE_HEADROOM } from "../../src/models/acquisition";
import type {
  DiskSpacePort,
  DownloadPort,
  MetadataPort,
  ModelFilePort,
  TransferOutcome,
  TransferProgress,
} from "../../src/models/port";
import { assetFor, CHARACTERS } from "../../src/models/roster";
import { planSegments } from "../../src/models/segmented/plan";
import type { SegmentCheckpoint, SegmentedResume } from "../../src/models/segmented/types";
import { readState } from "../../src/models/storage";
import type { DownloadProgress } from "../../src/models/types";
import { FUTURE_CHARACTER } from "../future-character";

const ACQUISITION_CODE = readFileSync(join(__dirname, "../../src/models/acquisition.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

type Requested = { key: string; url: string; resumed: boolean };

/** 대역 묶음. 어떤 자산을 요청했는지 추적해 A1·A2를 검증한다. */
function harness(
  options: {
    outcome?: TransferOutcome;
    available?: number;
    hash?: string | null;
    /** 받기 전과 받은 뒤의 지문이 다를 때(깨진 파일을 다시 받는 경우). `hash`보다 먼저 쓴다 */
    hashes?: (string | null)[];
    hashThrows?: boolean;
    bytes?: number | null;
    progress?: TransferProgress[];
    metadata?: string | null;
    /** 113 — 받는 도중 일어나는 일을 흉내 낸다(체크포인트 호출 등). 값을 주면 그것이 결과다 */
    scenario?: (ctx: {
      checkpoint?: SegmentCheckpoint;
      state: unknown;
      resumed: boolean;
    }) => Promise<TransferOutcome | void>;
    /** 파일 상태가 바뀌는 흉내 — 받기 전·후 모양을 따로 줄 때 */
    exists?: boolean;
    availableSequence?: number[];
  } = {},
) {
  const requested: Requested[] = [];
  const removed: string[] = [];
  const hashed: string[] = [];
  const created: string[] = [];
  let stored = options.metadata ?? null;
  let paused = false;

  // 기본값은 **다 받아 온전한 파일**이다. 받기가 끝나면 곧바로 검증이 돌기 때문에
  // (FR-021a), 파일이 없는 것을 기본으로 두면 모든 성공 경로가 verification-failed로
  // 끝나 무엇을 시험하는지 흐려진다. 검증 실패를 보고 싶은 테스트만 값을 바꾼다.
  //
  // **지문은 로스터의 기준값과 같아야 한다.** 로스터에 실측 md5가 들어오면 검증이
  // 채록에서 진짜 비교로 바뀌므로, 아무 문자열이나 돌려주면 성공 경로가 전부
  // verification-failed가 된다. 이 대역은 "온전한 파일"을 흉내 내는 것이 목적이므로
  // 기준값을 그대로 되돌려준다 — 기준이 아직 없으면(빈 문자열) 채록 경로를 탄다.
  const bytes = options.bytes === undefined ? 1000 : options.bytes;
  const matchingHash = (key: string) => {
    const asset = CHARACTERS.map(assetFor).find((a) => a.key === key);
    return asset && asset.md5 !== "" ? asset.md5 : "hash";
  };

  const files: ModelFilePort = {
    async facts() {
      return { exists: options.exists ?? bytes != null, bytes: bytes ?? null };
    },
    async contentHash(key) {
      hashed.push(key);
      if (options.hashThrows) throw new Error("읽지 못했다");
      if (options.hashes !== undefined && options.hashes.length > 0) {
        return options.hashes.shift() ?? null;
      }
      return options.hash === undefined ? matchingHash(key) : options.hash;
    },
    async remove(key) {
      removed.push(key);
    },
    async bytesUsed() {
      return 0;
    },
  };

  const metadata: MetadataPort = {
    async read() {
      return stored;
    },
    async writeAtomically(contents) {
      stored = contents;
    },
  };

  const disk: DiskSpacePort = {
    async availableBytes() {
      return options.available ?? Number.MAX_SAFE_INTEGER;
    },
  };

  const makeTask = (
    onProgress: (p: TransferProgress) => void,
    checkpoint?: SegmentCheckpoint,
    state: unknown = null,
    resumed = false,
  ) => ({
    async wait(): Promise<TransferOutcome> {
      for (const p of options.progress ?? []) onProgress(p);
      const scripted = await options.scenario?.({ checkpoint, state, resumed });
      if (scripted !== undefined) return scripted;
      if (paused) return { kind: "paused", state: { at: 1 } };
      return options.outcome ?? { kind: "completed" };
    },
    async pause() {
      paused = true;
    },
  });

  const download: DownloadPort = {
    start(key, url, onProgress, checkpoint) {
      requested.push({ key, url, resumed: false });
      created.push(key);
      return makeTask(onProgress, checkpoint);
    },
    resume(key, url, state, onProgress, checkpoint) {
      requested.push({ key, url, resumed: true });
      return makeTask(onProgress, checkpoint, state, true);
    },
  };

  return {
    ports: { files, metadata, disk, download },
    requested,
    created,
    removed,
    hashed,
    metadataPort: metadata,
    pauseNext: () => {
      paused = true;
    },
  };
}

describe("내려받기", () => {
  // A1 — 헌법 로스터의 방어선 (SC-002)
  it("고른 캐릭터의 자산 하나만 요청한다", async () => {
    const h = harness();
    await createAcquisition(h.ports).prepare("quiet");

    expect(h.requested).toHaveLength(1);
    expect(h.requested[0].key).toBe(assetFor("quiet").key);
  });

  // A2
  it("고른 캐릭터의 파일만 생긴다 (037 — 로스터가 하나)", async () => {
    const h = harness();
    await createAcquisition(h.ports).prepare("quiet");

    // 037 — 로스터에 다른 캐릭터가 없어 "다른 캐릭터의 파일이 안 생긴다"를 자산으로
    // 비교할 수 없다. 대신 **고른 것 하나만** 생겼는지 본다. 캐릭터가 늘면 원래
    // 비교(다른 자산 키가 h.created에 없다)로 되돌린다.
    expect(h.created).toEqual([assetFor("quiet").key]);
  });

  // A3 — GB 단위 데이터를 사용자 모르게 쓰지 않는다
  it("저절로 시작하지 않는다", () => {
    const h = harness();
    createAcquisition(h.ports);

    expect(h.requested).toHaveLength(0);
  });

  // A4 — 진행률이 캐릭터 단위다 (FR-013a)
  it("진행 보고에 바이트와 파일 정보가 없다", async () => {
    const h = harness({ progress: [{ bytesWritten: 50, totalBytes: 100 }] });
    const seen: DownloadProgress[] = [];

    await createAcquisition(h.ports).prepare("quiet", (p) => seen.push(p));

    expect(seen.length).toBeGreaterThan(0);
    for (const p of seen) {
      expect(Object.keys(p).sort()).toEqual(["character", "fraction"]);
    }
  });

  // A5 — 무해해 보이지만 모델 비교의 시작점이다 (원칙 IV)
  it("진행률에 시간·속도 정보가 없다", () => {
    expect(ACQUISITION_CODE).not.toMatch(/Date\.now|performance\.now|elapsed|bytesPerSecond/);
  });

  // A6 — 서버가 Content-Length를 주지 않으면 -1 (원칙 V)
  it("총량을 모르고 기준 크기도 없으면 진행률이 '모름'이다", () => {
    expect(fractionOf(500, -1, 0)).toBeNull();
  });

  it("총량을 몰라도 기준 크기가 있으면 그것으로 갈음한다", () => {
    expect(fractionOf(500, -1, 1000)).toBe(0.5);
  });

  // A12~A14 — 공간 판정 (FR-019, FR-019a, FR-019b, SC-007)
  //
  // 로스터의 기준 크기는 아직 0이므로(받은 다음에 잰다) 사전 판정이 돌게 하려면 잠시
  // 값을 넣어야 한다. **반드시 되돌린다** — 되돌리지 않으면 뒤의 테스트가 작은 디스크에서
  // 공간 부족으로 실패하고, 원인이 자기 테스트에 없어 찾기 어려워진다.
  async function withExpectedBytes<T>(bytes: number, run: () => Promise<T>): Promise<T> {
    const asset = assetFor("quiet");
    const original = asset.expectedBytes;
    Object.assign(asset, { expectedBytes: bytes });
    try {
      return await run();
    } finally {
      Object.assign(asset, { expectedBytes: original });
    }
  }

  // 110 — 파일이 없는 경우다. 기준 크기와 같은 파일이 있으면 받지 않고 검증만 한다.
  it("공간이 모자라면 요청하지 않고 거부한다", async () => {
    await withExpectedBytes(1000, async () => {
      const h = harness({ available: 10, bytes: null });

      const result = await createAcquisition(h.ports).prepare("quiet");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.kind).toBe("insufficient-space");
      expect(h.requested).toHaveLength(0);
    });
  });

  // A13 — 여유 0으로 받으면 방금 받은 모델이 지워질 수 있다 (FR-019b)
  it("남은 공간이 딱 맞으면 시작하지 않는다", async () => {
    await withExpectedBytes(1000, async () => {
      const h = harness({ available: 1000, bytes: null });

      const result = await createAcquisition(h.ports).prepare("quiet");

      expect(result.ok).toBe(false);
      expect(h.requested).toHaveLength(0);
    });
  });

  it("여유까지 있으면 시작한다", async () => {
    await withExpectedBytes(1000, async () => {
      const h = harness({ available: Math.ceil(1000 * SPACE_HEADROOM) + 1, bytes: null });

      await createAcquisition(h.ports).prepare("quiet");

      expect(h.requested).toHaveLength(1);
    });
  });

  // A14 — "3.2GB가 필요하다"가 아니라 "공간이 더 필요하다" (FR-019a)
  it("공간 부족 실패에 크기가 담기지 않는다", async () => {
    await withExpectedBytes(1000, async () => {
      const h = harness({ available: 10 });

      const result = await createAcquisition(h.ports).prepare("quiet");

      if (!result.ok) expect(Object.keys(result.failure)).toEqual(["kind"]);
    });
  });

  // A13 — 026: "한 번에 하나"가 해제됐다. `busy` 갈래는 유지되나(FR-028) 의미가
  // "같은 캐릭터 중복"으로 좁아진다(FR-003). 003의 옛 "다른 캐릭터 → busy"는
  // "이제 둘 다 시작"으로 갱신한다.
  describe("동시 내려받기 (026, A13)", () => {
    function gated(h: ReturnType<typeof harness>) {
      let open: () => void = () => {};
      const gate = new Promise<void>((resolve) => (open = resolve));
      const download: DownloadPort = {
        start(key, url, onProgress) {
          h.ports.download.start(key, url, onProgress);
          return {
            async wait(): Promise<TransferOutcome> {
              await gate;
              return { kind: "completed" };
            },
            async pause() {},
          };
        },
        resume: h.ports.download.resume,
      };
      return { acq: createAcquisition({ ...h.ports, download }), open: () => open() };
    }

    /**
     * ★ 037 — 로스터가 하나여서 **동시 내려받기를 시험할 대상이 없다.**
     *
     * 이 계약들(026 A13·FR-004·A3)은 없어진 것이 아니라 부를 캐릭터가 없을 뿐이다.
     * 두 캐릭터가 **각자의 모델 자산**을 가져야 성립하므로 `FUTURE_CHARACTER`
     * (식별자만 있는 자리)로는 대신할 수 없다 — `assetFor()`가 자산을 못 찾는다.
     *
     * **캐릭터가 로스터에 늘면 `it.skip`을 풀고 그 캐릭터로 바꾼다**(037 FR-014).
     * 그때까지 이 자리가 "아직 둘째가 없다"를 드러낸다. `acquisition.ts`의 동시
     * 다운로드 코드는 그대로 살아 있다.
     */
    it.skip("서로 다른 캐릭터는 동시에 받는다 (더 이상 busy 거부가 아니다)", async () => {
      const h = harness();
      const { acq, open } = gated(h);

      const first = acq.prepare("quiet");
      const second = acq.prepare(FUTURE_CHARACTER);

      // 둘 다 시작한다 — 두 번째가 즉시 거부되지 않는다.
      expect(acq.busyWith().sort()).toEqual([FUTURE_CHARACTER, "quiet"].sort());

      open();
      expect((await first).ok).toBe(true);
      expect((await second).ok).toBe(true);
    });

    it("같은 캐릭터를 다시 요청하면 거부되고 그 캐릭터 자신을 알려준다 (FR-003)", async () => {
      const h = harness();
      const { acq, open } = gated(h);

      const first = acq.prepare("quiet");
      const dup = await acq.prepare("quiet");

      expect(dup.ok).toBe(false);
      if (!dup.ok && dup.failure.kind === "busy") {
        expect(dup.failure.busyWith).toBe("quiet");
      } else {
        throw new Error("busy 실패가 아니다");
      }

      open();
      await first;
    });

    /**
     * ★ 037 — 로스터가 하나여서 **동시 내려받기를 시험할 대상이 없다.**
     *
     * 이 계약들(026 A13·FR-004·A3)은 없어진 것이 아니라 부를 캐릭터가 없을 뿐이다.
     * 두 캐릭터가 **각자의 모델 자산**을 가져야 성립하므로 `FUTURE_CHARACTER`
     * (식별자만 있는 자리)로는 대신할 수 없다 — `assetFor()`가 자산을 못 찾는다.
     *
     * **캐릭터가 로스터에 늘면 `it.skip`을 풀고 그 캐릭터로 바꾼다**(037 FR-014).
     * 그때까지 이 자리가 "아직 둘째가 없다"를 드러낸다. `acquisition.ts`의 동시
     * 다운로드 코드는 그대로 살아 있다.
     */
    it.skip("한 캐릭터를 멈춰도 다른 캐릭터는 계속된다 (FR-004)", async () => {
      const h = harness();
      const { acq, open } = gated(h);

      const first = acq.prepare("quiet");
      const second = acq.prepare(FUTURE_CHARACTER);
      expect(acq.busyWith().sort()).toEqual([FUTURE_CHARACTER, "quiet"].sort());

      await acq.pause("quiet");
      // narrative는 여전히 받는 중
      expect(acq.busyWith()).toContain(FUTURE_CHARACTER);

      open();
      await first;
      expect((await second).ok).toBe(true);
    });

    /**
     * ★ 037 — 로스터가 하나여서 **동시 내려받기를 시험할 대상이 없다.**
     *
     * 이 계약들(026 A13·FR-004·A3)은 없어진 것이 아니라 부를 캐릭터가 없을 뿐이다.
     * 두 캐릭터가 **각자의 모델 자산**을 가져야 성립하므로 `FUTURE_CHARACTER`
     * (식별자만 있는 자리)로는 대신할 수 없다 — `assetFor()`가 자산을 못 찾는다.
     *
     * **캐릭터가 로스터에 늘면 `it.skip`을 풀고 그 캐릭터로 바꾼다**(037 FR-014).
     * 그때까지 이 자리가 "아직 둘째가 없다"를 드러낸다. `acquisition.ts`의 동시
     * 다운로드 코드는 그대로 살아 있다.
     */
    it.skip("busyWith()가 받는 중인 전부를 배열로 준다 (A3)", async () => {
      const h = harness();
      const { acq, open } = gated(h);

      acq.prepare("quiet");
      acq.prepare(FUTURE_CHARACTER);
      acq.prepare(FUTURE_CHARACTER);

      expect(acq.busyWith().sort()).toEqual([FUTURE_CHARACTER, "quiet"].sort());
      open();
    });

    it("받던 것이 끝나면 그 캐릭터가 busyWith에서 빠진다 (finally, A7)", async () => {
      const h = harness();
      const acq = createAcquisition(h.ports);

      await acq.prepare("quiet");
      expect(acq.busyWith()).toEqual([]);
    });

    it("같은 캐릭터도 끝난 뒤에는 다시 받을 수 있다", async () => {
      const h = harness();
      const acq = createAcquisition(h.ports);

      await acq.prepare("quiet");
      expect((await acq.prepare("quiet")).ok).toBe(true);
    });
  });

  // A6 — 026: 동시 공간 판정은 이미 받는 중인 것들의 남은 용량을 여유에서 뺀다 (FR-007).
  /**
   * ★ 037 — 위와 같은 이유로 시험할 둘째 자산이 없다. 캐릭터가 늘면 되살린다.
   */
  it.skip("동시 다운로드에서 공간 판정이 받는 중인 것들의 남은 용량을 뺀다", async () => {
    const asset1 = assetFor("quiet");
    const asset2 = assetFor(FUTURE_CHARACTER);
    const orig1 = asset1.expectedBytes;
    const orig2 = asset2.expectedBytes;
    Object.assign(asset1, { expectedBytes: 1000 });
    Object.assign(asset2, { expectedBytes: 1000 });
    try {
      // 여유는 1500 * HEADROOM 만큼 — quiet 하나는 되지만, quiet가 받는 중이면
      // 그 남은 1000을 빼고 나면 narrative가 안 된다.
      let releaseQuiet: () => void = () => {};
      const quietDone = new Promise<void>((r) => (releaseQuiet = r));
      const h = harness({ available: Math.ceil(1500 * SPACE_HEADROOM) });
      const download: DownloadPort = {
        start(key, _url, _onProgress) {
          return {
            async wait(): Promise<TransferOutcome> {
              // quiet는 붙잡아 둔다(받는 중). narrative는 여기 오지 않는다
              // (공간 판정에서 거부되므로) — 오면 그 자체가 실패 증거다.
              if (key === assetFor("quiet").key) await quietDone;
              return { kind: "completed" };
            },
            async pause() {},
          };
        },
        resume: h.ports.download.resume,
      };
      const acq = createAcquisition({ ...h.ports, download });

      // quiet를 시작해 "받는 중"으로 만든다. prepare의 동기 구간이 running.set을
      // 먼저 실행하므로, 그 뒤 이벤트 루프를 한 바퀴 돌려 space check까지 진행시킨다.
      const quiet = acq.prepare("quiet");
      await new Promise((r) => setTimeout(r, 0));
      expect(acq.busyWith()).toContain("quiet");

      const second = await acq.prepare(FUTURE_CHARACTER);

      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.failure.kind).toBe("insufficient-space");

      releaseQuiet();
      await quiet;
    } finally {
      Object.assign(asset1, { expectedBytes: orig1 });
      Object.assign(asset2, { expectedBytes: orig2 });
    }
  }, 10000);

  // A8 / A9 — 처음부터 다시 받지 않는다 (FR-015, SC-006)
  it("중단 정보가 있으면 이어받는다", async () => {
    const key = assetFor("quiet").key;
    const h = harness({
      metadata: JSON.stringify({ verdicts: [], paused: [{ assetKey: key, state: { at: 1 } }] }),
    });

    await createAcquisition(h.ports).prepare("quiet");

    expect(h.requested[0].resumed).toBe(true);
  });

  // A9 — 026: 세그먼트 재개 상태가 있으면 그것을 resume에 넘긴다 (FR-022).
  it("세그먼트 재개 상태가 있으면 이어받으며 그 상태를 넘긴다", async () => {
    const key = assetFor("quiet").key;
    const asset = assetFor("quiet");
    const resume = {
      assetKey: key,
      totalBytes: asset.expectedBytes,
      segmentCount: planSegments(asset.expectedBytes).segments.length,
      doneIndices: [0],
    };
    const h = harness({
      bytes: asset.expectedBytes,
      metadata: JSON.stringify({ verdicts: [], paused: [], segmented: [resume] }),
    });
    const passed: unknown[] = [];
    const download: DownloadPort = {
      start: h.ports.download.start,
      resume(k, url, state, onProgress) {
        passed.push(state);
        return h.ports.download.resume(k, url, state, onProgress);
      },
    };

    await createAcquisition({ ...h.ports, download }).prepare("quiet");

    expect(h.requested[0].resumed).toBe(true);
    expect(passed[0]).toMatchObject({ doneIndices: [0] });
  });

  // A7 — 멈추면 이어받을 수 있는 상태로 남는다 (FR-014)
  it("멈추면 중단 상태가 기기에 남는다", async () => {
    const h = harness();
    h.pauseNext();

    await createAcquisition(h.ports).prepare("quiet");

    const state = await readState(h.metadataPort);
    expect(state.paused).toHaveLength(1);
  });

  // A10 — 026: pause 시 outcome.state에 segmentCount가 있으면 withSegmentedResume,
  // 없으면 withPaused (data-model.md 상태 전이).
  it("멈춘 것이 세그먼트면 segmented에, 아니면 paused에 남는다", async () => {
    // 세그먼트 outcome
    const hSeg = harness({
      outcome: undefined,
    });
    // makeTask는 paused 시 { at: 1 }을 준다 — 세그먼트를 흉내 내려면 별도 download 대역
    const key = assetFor("quiet").key;
    const download: DownloadPort = {
      start(k, url, onProgress) {
        hSeg.ports.download.start(k, url, onProgress);
        return {
          async wait(): Promise<TransferOutcome> {
            return {
              kind: "paused",
              state: {
                assetKey: key,
                totalBytes: 1000,
                segmentCount: 16,
                doneIndices: [0, 3],
              },
            };
          },
          async pause() {},
        };
      },
      resume: hSeg.ports.download.resume,
    };

    await createAcquisition({ ...hSeg.ports, download }).prepare("quiet");

    const state = await readState(hSeg.metadataPort);
    expect(state.segmented).toHaveLength(1);
    expect(state.paused).toHaveLength(0);
  });

  // A10 / A11 — 실패가 "받았음"이 아니다 (FR-017, FR-018)
  it("끊기면 실패로 드러나고 검증 결과가 남지 않는다", async () => {
    const h = harness({ outcome: { kind: "failed", reason: "끊김" } });

    const result = await createAcquisition(h.ports).prepare("quiet");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.kind).toBe("network");

    const state = await readState(h.metadataPort);
    expect(state.verdicts).toHaveLength(0);
  });

  // A19 — 완료 후 검증이 돈다 (FR-021a)
  it("다 받으면 검증 결과가 남는다", async () => {
    const h = harness({ bytes: 1000, hash: "measured" });

    await createAcquisition(h.ports).prepare("quiet");

    const state = await readState(h.metadataPort);
    expect(state.verdicts).toHaveLength(1);
    expect(state.verdicts[0].verifiedMd5).toBe("measured");
  });

  // A20 — 타입 수준에서 대체가 불가능해야 한다 (FR-035, 원칙 I)
  it("실패 어디에도 대체 자산이 없다", async () => {
    const h = harness({ outcome: { kind: "failed", reason: "끊김" } });

    const result = await createAcquisition(h.ports).prepare("quiet");

    if (!result.ok) {
      const json = JSON.stringify(result.failure);
      expect(json).not.toMatch(/http/i);
      expect(json).not.toContain("fallback");
    }
  });
});

/**
 * 110 — 받기 전에 먼저 검증한다.
 *
 * 받기가 끝난 뒤 검증 기록 전에 앱이 죽으면 온전한 파일이 기록 없이 남는다(iPhone 13 mini, 2026-11-01). 그 파일을 다시 받지 않되,
 * 크기는 맞고 중간이 빈 파일을 통과시키지 않는다.
 */
describe("받기 전에 먼저 검증한다 (110)", () => {
  const ASSET = assetFor("quiet");
  const passedState = JSON.stringify({
    verdicts: [
      {
        assetKey: ASSET.key,
        verifiedMd5: ASSET.md5,
        verifiedBytes: ASSET.expectedBytes,
        passed: true,
      },
    ],
  });

  it("온전하고 기록이 없으면 받지 않고 검증 기록을 남긴다", async () => {
    const { ports, requested, removed, metadataPort } = harness({ bytes: ASSET.expectedBytes });

    const result = await createAcquisition(ports).prepare("quiet");

    expect(result.ok).toBe(true);
    expect(requested).toEqual([]);
    expect(removed).toEqual([]);
    const verdict = (await readState(metadataPort)).verdicts.find((v) => v.assetKey === ASSET.key);
    expect(verdict?.passed).toBe(true);
    expect(verdict?.verifiedBytes).toBe(ASSET.expectedBytes);
  });

  it("공간이 모자라도 온전한 파일은 거부하지 않는다", async () => {
    const { ports, requested } = harness({ bytes: ASSET.expectedBytes, available: 0 });

    const result = await createAcquisition(ports).prepare("quiet");

    expect(result.ok).toBe(true);
    expect(requested).toEqual([]);
  });

  it("이미 준비됐으면 받지도 지문을 계산하지도 않는다", async () => {
    const { ports, requested, hashed } = harness({
      bytes: ASSET.expectedBytes,
      metadata: passedState,
    });

    const result = await createAcquisition(ports).prepare("quiet");

    expect(result.ok).toBe(true);
    expect(requested).toEqual([]);
    expect(hashed).toEqual([]);
  });

  it("크기만 맞고 내용이 다르면 지우고 처음부터 받는다", async () => {
    const { ports, requested, removed, metadataPort } = harness({
      bytes: ASSET.expectedBytes,
      hashes: ["중간이 빈 파일"],
    });

    const result = await createAcquisition(ports).prepare("quiet");

    expect(result.ok).toBe(true);
    expect(removed).toEqual([ASSET.key]);
    expect(requested).toEqual([{ key: ASSET.key, url: ASSET.url, resumed: false }]);
    const verdict = (await readState(metadataPort)).verdicts.find((v) => v.assetKey === ASSET.key);
    expect(verdict?.passed).toBe(true);
  });

  it("깨진 파일을 지운 뒤 공간이 모자라면 받지 않고 거부한다", async () => {
    const { ports, requested, removed } = harness({
      bytes: ASSET.expectedBytes,
      hashes: ["중간이 빈 파일"],
      available: 0,
    });

    const result = await createAcquisition(ports).prepare("quiet");

    expect(result).toEqual({ ok: false, failure: { kind: "insufficient-space" } });
    expect(removed).toEqual([ASSET.key]);
    expect(requested).toEqual([]);
  });

  it("옛 검증 실패 기록이 있어도 먼저 다시 검증한다", async () => {
    const { ports, requested } = harness({
      bytes: ASSET.expectedBytes,
      metadata: JSON.stringify({
        verdicts: [{ assetKey: ASSET.key, verifiedMd5: "x", verifiedBytes: 1, passed: false }],
      }),
    });

    const result = await createAcquisition(ports).prepare("quiet");

    expect(result.ok).toBe(true);
    expect(requested).toEqual([]);
  });

  it("지문을 계산하지 못하면 통과시키지 않고 처음부터 받는다", async () => {
    const { ports, requested, removed } = harness({
      bytes: ASSET.expectedBytes,
      hashes: [null],
    });

    await createAcquisition(ports).prepare("quiet");

    expect(removed).toEqual([ASSET.key]);
    expect(requested).toHaveLength(1);
  });

  it("지문 계산이 예외를 던져도 통과시키지 않고 처음부터 받는다", async () => {
    const { ports, requested, removed, metadataPort } = harness({
      bytes: ASSET.expectedBytes,
      hashThrows: true,
    });

    // 받은 뒤의 검증도 던지므로 결과는 실패로 올라간다. 볼 것은 먼저 받으러 갔다는 것과 통과가 없다는 것이다.
    await createAcquisition(ports)
      .prepare("quiet")
      .catch(() => {});

    expect(removed).toEqual([ASSET.key]);
    expect(requested).toHaveLength(1);
    const verdict = (await readState(metadataPort)).verdicts.find((v) => v.assetKey === ASSET.key);
    expect(verdict?.passed ?? false).toBe(false);
  });

  it("크기가 다르면 지문을 계산하지 않고 받는다", async () => {
    const { ports, requested, hashed } = harness({ bytes: ASSET.expectedBytes - 1, hash: "x" });

    await createAcquisition(ports).prepare("quiet");

    expect(requested).toHaveLength(1);
    // 받은 뒤의 검증 한 번뿐이다.
    expect(hashed).toEqual([ASSET.key]);
  });

  it("파일과 어긋난 통과 기록은 받기 전에 지운다 — 받다 죽은 파일이 지문 없이 준비되지 않게", async () => {
    const { ports, requested, metadataPort } = harness({
      bytes: ASSET.expectedBytes - 1,
      metadata: passedState,
      outcome: { kind: "failed", reason: "끊겼다" },
    });

    await createAcquisition(ports).prepare("quiet");

    expect(requested).toHaveLength(1);
    expect((await readState(metadataPort)).verdicts).toEqual([]);
  });

  it("기준보다 큰 파일은 지우고 받는다 — 받아도 작아지지 않는다", async () => {
    const { ports, requested, removed } = harness({ bytes: ASSET.expectedBytes + 1, hash: "x" });

    await createAcquisition(ports).prepare("quiet");

    expect(removed).toEqual([ASSET.key]);
    expect(requested).toHaveLength(1);
  });

  it("이어받기 기록이 있으면 크기가 맞아도 먼저 검증하지 않고 이어받는다", async () => {
    const { ports, requested, removed } = harness({
      bytes: ASSET.expectedBytes,
      metadata: JSON.stringify({
        segmented: [
          {
            assetKey: ASSET.key,
            totalBytes: ASSET.expectedBytes,
            segmentCount: planSegments(ASSET.expectedBytes).segments.length,
            doneIndices: [0, 1, 2],
          },
        ],
      }),
    });

    await createAcquisition(ports).prepare("quiet");

    expect(removed).toEqual([]);
    expect(requested).toEqual([{ key: ASSET.key, url: ASSET.url, resumed: true }]);
  });

  it("검증 기록을 쓰지 못하면 성공으로 돌려주지 않는다", async () => {
    const { ports } = harness({ bytes: ASSET.expectedBytes });
    ports.metadata.writeAtomically = async () => {
      throw new Error("쓰지 못했다");
    };

    await expect(createAcquisition(ports).prepare("quiet")).rejects.toThrow("쓰지 못했다");
  });
});

/* ───────────────────── 113 — 끝난 구간 기록과 이어받기 ───────────────────── */

describe("끝난 구간을 기록하고 이어받는다 (113)", () => {
  const ASSET = assetFor("quiet");
  const PLAN = planSegments(ASSET.expectedBytes);
  const COUNT = PLAN.segments.length;
  const endOf = (i: number) => PLAN.segments[i].end;
  const record = (doneIndices: number[], over: Partial<SegmentedResume> = {}) => ({
    assetKey: ASSET.key,
    totalBytes: ASSET.expectedBytes,
    segmentCount: COUNT,
    doneIndices,
    ...over,
  });
  const meta = (resume: unknown) =>
    JSON.stringify({ verdicts: [], paused: [], segmented: [resume] });

  it("구간이 끝나는 즉시 state.json에 끝난 번호가 남는다 (FR-002)", async () => {
    let snapshots: number[][] = [];
    const h = harness({
      scenario: async ({ checkpoint }) => {
        await checkpoint?.(record([0]));
        // 두 번째 체크포인트 직전에 기록을 읽는다 — 첫 구간이 이미 남아 있어야 한다.
        snapshots.push(
          (await readState(h.metadataPort)).segmented.find((s) => s.assetKey === ASSET.key)
            ?.doneIndices ?? [],
        );
        await checkpoint?.(record([0, 4]));
        snapshots.push(
          (await readState(h.metadataPort)).segmented.find((s) => s.assetKey === ASSET.key)
            ?.doneIndices ?? [],
        );
        // 앱이 여기서 죽었다고 보고 다 받지 못한 채 끊긴다.
        return { kind: "failed", reason: "죽음" };
      },
    });

    const result = await createAcquisition(h.ports).prepare("quiet");

    expect(result.ok).toBe(false);
    expect(snapshots).toEqual([[0], [0, 4]]);
  });

  it("동시에 끝난 구간의 기록이 서로를 덮어쓰지 않는다 (FR-005)", async () => {
    const h = harness({
      scenario: async ({ checkpoint }) => {
        // 겹쳐 부른다 — 호출자는 줄을 세우지 않는다. 줄은 저장 쪽(`mutateState`)이 세운다.
        await Promise.all([checkpoint?.(record([2])), checkpoint?.(record([2, 6]))]);
        return { kind: "failed", reason: "끊김" };
      },
    });

    await createAcquisition(h.ports).prepare("quiet");

    const saved = (await readState(h.metadataPort)).segmented[0];
    expect(saved.doneIndices).toEqual([2, 6]);
  });

  it("실패해도 끝난 구간 기록은 남고, 다시 받으면 그 기록으로 이어받는다 (US2)", async () => {
    const first = harness({
      bytes: endOf(1) + 1,
      scenario: async ({ checkpoint }) => {
        await checkpoint?.(record([0, 1]));
        return { kind: "failed", reason: "끊김" };
      },
    });
    await createAcquisition(first.ports).prepare("quiet");
    const stored = (await readState(first.metadataPort)).segmented;
    expect(stored).toEqual([record([0, 1])]);

    const passed: unknown[] = [];
    const second = harness({
      bytes: endOf(1) + 1,
      metadata: JSON.stringify({ verdicts: [], paused: [], segmented: stored }),
      scenario: async ({ state }) => {
        passed.push(state);
      },
    });
    const result = await createAcquisition(second.ports).prepare("quiet");

    expect(passed).toEqual([record([0, 1])]);
    expect(second.requested[0].resumed).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("모든 구간이 끝났다는 기록이면 곧바로 검증으로 간다 (받지 않고 지문만)", async () => {
    const all = PLAN.segments.map((s) => s.index);
    const h = harness({ bytes: ASSET.expectedBytes, metadata: meta(record(all)) });

    // 전송 쪽은 새 구간 없이 곧바로 completed를 돌려주는 것이 계약이다.
    const result = await createAcquisition(h.ports).prepare("quiet");

    expect(result.ok).toBe(true);
    expect(h.hashed).toEqual([ASSET.key]);
  });

  it("받기가 성공하면 재개 기록이 지워진다 (FR-008)", async () => {
    const h = harness({
      bytes: endOf(0) + 1,
      metadata: meta(record([0])),
    });

    const result = await createAcquisition(h.ports).prepare("quiet");

    expect(result.ok).toBe(true);
    expect((await readState(h.metadataPort)).segmented).toEqual([]);
  });

  it("지문 검증이 실패해도 재개 기록은 남지 않는다 — 처음부터 다시 받는다", async () => {
    const h = harness({
      bytes: endOf(0) + 1,
      hash: "다른 지문",
      metadata: meta(record([0])),
    });

    const result = await createAcquisition(h.ports).prepare("quiet");

    expect(result).toEqual({ ok: false, failure: { kind: "verification-failed" } });
    expect((await readState(h.metadataPort)).segmented).toEqual([]);
  });

  describe("이어받을 때의 공간 판정 (FR-011)", () => {
    const withExpected = async <T>(run: () => Promise<T>) => run();

    it("남은 양만 요구한다 — 남은 공간이 전체 × 1.15보다 작아도 남은 양 × 1.15보다 크면 이어받는다", async () => {
      const done = PLAN.segments.slice(0, COUNT - 2).map((s) => s.index);
      const remaining = PLAN.segments
        .slice(COUNT - 2)
        .reduce((n, s) => n + (s.end - s.start + 1), 0);
      const h = harness({
        bytes: ASSET.expectedBytes,
        available: Math.ceil(remaining * SPACE_HEADROOM) + 1,
        metadata: meta(record(done)),
      });

      const result = await withExpected(() => createAcquisition(h.ports).prepare("quiet"));

      expect(result.ok).toBe(true);
      expect(h.requested[0].resumed).toBe(true);
    });

    it("남은 양 × 1.15보다 작으면 거부한다", async () => {
      const done = PLAN.segments.slice(0, COUNT - 2).map((s) => s.index);
      const remaining = PLAN.segments
        .slice(COUNT - 2)
        .reduce((n, s) => n + (s.end - s.start + 1), 0);
      const h = harness({
        bytes: ASSET.expectedBytes - 1,
        available: Math.floor(remaining * SPACE_HEADROOM) - 1,
        metadata: meta(record(done)),
      });

      const result = await createAcquisition(h.ports).prepare("quiet");

      expect(result).toEqual({ ok: false, failure: { kind: "insufficient-space" } });
      expect(h.requested).toHaveLength(0);
    });

    it("기록이 없으면 지금처럼 전체를 요구한다", async () => {
      const h = harness({ bytes: null, exists: false, available: Math.floor(ASSET.expectedBytes) });

      const result = await createAcquisition(h.ports).prepare("quiet");

      expect(result).toEqual({ ok: false, failure: { kind: "insufficient-space" } });
    });
  });

  describe("어긋난 기록은 믿지 않고 처음부터 받는다 (US3, FR-006)", () => {
    const expectRestart = async (h: ReturnType<typeof harness>, removesPartial = true) => {
      await createAcquisition(h.ports).prepare("quiet");
      expect(h.requested).toEqual([{ key: ASSET.key, url: ASSET.url, resumed: false }]);
      // 부분 파일도 함께 지운다. (옛 형식은 읽을 때 이미 버려져 그 자리에서는 지울 것이 없다 —
      // 구간은 전부 다시 받아 덮어쓴다.)
      if (removesPartial) expect(h.removed).toContain(ASSET.key);
    };

    it("최종 파일이 없으면", async () => {
      await expectRestart(harness({ bytes: null, exists: false, metadata: meta(record([0, 1])) }));
    });

    it("파일 크기가 끝난 구간의 끝에 못 미치면", async () => {
      await expectRestart(harness({ bytes: endOf(3), metadata: meta(record([0, 3])) }));
    });

    it("기록의 전체 크기가 기준 크기와 다르면", async () => {
      await expectRestart(
        harness({
          bytes: endOf(0) + 1,
          metadata: meta(record([0], { totalBytes: ASSET.expectedBytes + 1 })),
        }),
      );
    });

    it("기록의 구간 수가 지금 계획과 다르면", async () => {
      await expectRestart(
        harness({ bytes: endOf(0) + 1, metadata: meta(record([0], { segmentCount: COUNT / 2 })) }),
      );
    });

    it("옛 형식(receivedBytes) 기록이면", async () => {
      const old = {
        assetKey: ASSET.key,
        totalBytes: ASSET.expectedBytes,
        segmentCount: 4,
        receivedBytes: [1, 2, 3, 4],
      };
      await expectRestart(harness({ bytes: endOf(0) + 1, metadata: meta(old) }), false);
    });

    it("버려진 기록은 state.json에서도 지워진다", async () => {
      const h = harness({ bytes: null, exists: false, metadata: meta(record([0])) });

      await createAcquisition(h.ports).prepare("quiet");

      expect((await readState(h.metadataPort)).segmented).toEqual([]);
    });
  });
});

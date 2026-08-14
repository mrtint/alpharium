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
import { readState } from "../../src/models/storage";
import type { DownloadProgress } from "../../src/models/types";

const ACQUISITION_CODE = readFileSync(join(__dirname, "../../src/models/acquisition.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

type Requested = { key: string; url: string; resumed: boolean };

/** 대역 묶음. 어떤 자산을 요청했는지 추적해 A1·A2를 검증한다. */
function harness(options: {
  outcome?: TransferOutcome;
  available?: number;
  hash?: string | null;
  bytes?: number | null;
  progress?: TransferProgress[];
  metadata?: string | null;
} = {}) {
  const requested: Requested[] = [];
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
      return { exists: bytes != null, bytes: bytes ?? null };
    },
    async contentHash(key) {
      return options.hash === undefined ? matchingHash(key) : options.hash;
    },
    async remove() {},
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

  const makeTask = (onProgress: (p: TransferProgress) => void) => ({
    async wait(): Promise<TransferOutcome> {
      for (const p of options.progress ?? []) onProgress(p);
      if (paused) return { kind: "paused", state: { at: 1 } };
      return options.outcome ?? { kind: "completed" };
    },
    async pause() {
      paused = true;
    },
  });

  const download: DownloadPort = {
    start(key, url, onProgress) {
      requested.push({ key, url, resumed: false });
      created.push(key);
      return makeTask(onProgress);
    },
    resume(key, _state, onProgress) {
      requested.push({ key, url: "", resumed: true });
      return makeTask(onProgress);
    },
  };

  return {
    ports: { files, metadata, disk, download },
    requested,
    created,
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
  it("다른 캐릭터의 파일이 생기지 않는다", async () => {
    const h = harness();
    await createAcquisition(h.ports).prepare("quiet");

    const others = (["narrative", "imaginative", "chinese", "english"] as const).map(
      (c) => assetFor(c).key,
    );
    for (const key of others) expect(h.created).not.toContain(key);
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

  it("공간이 모자라면 요청하지 않고 거부한다", async () => {
    await withExpectedBytes(1000, async () => {
      const h = harness({ available: 10 });

      const result = await createAcquisition(h.ports).prepare("quiet");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.kind).toBe("insufficient-space");
      expect(h.requested).toHaveLength(0);
    });
  });

  // A13 — 여유 0으로 받으면 방금 받은 모델이 지워질 수 있다 (FR-019b)
  it("남은 공간이 딱 맞으면 시작하지 않는다", async () => {
    await withExpectedBytes(1000, async () => {
      const h = harness({ available: 1000 });

      const result = await createAcquisition(h.ports).prepare("quiet");

      expect(result.ok).toBe(false);
      expect(h.requested).toHaveLength(0);
    });
  });

  it("여유까지 있으면 시작한다", async () => {
    await withExpectedBytes(1000, async () => {
      const h = harness({ available: Math.ceil(1000 * SPACE_HEADROOM) + 1 });

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

  // A15~A17 — 한 번에 하나 (FR-020, FR-020a, SC-013)
  //
  // 첫 요청을 문(gate)으로 붙잡아 "받는 중"을 만든 뒤 둘째를 넣는다. 문을 열기 전에는
  // 첫 요청이 끝나지 않으므로 둘이 실제로 겹친다.
  describe("한 번에 하나", () => {
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

    it("받는 중에 다른 캐릭터를 요청하면 거부되고 무엇을 받는 중인지 알려준다", async () => {
      const h = harness();
      const { acq, open } = gated(h);

      const first = acq.prepare("quiet");
      const second = await acq.prepare("narrative");

      expect(second.ok).toBe(false);
      if (!second.ok && second.failure.kind === "busy") {
        expect(second.failure.busyWith).toBe("quiet");
      } else {
        throw new Error("busy 실패가 아니다");
      }

      open();
      await first;
    });

    // A16 — 앞의 것이 조용히 취소되지 않는다
    it("거부되어도 받던 것은 계속된다", async () => {
      const h = harness();
      const { acq, open } = gated(h);

      const first = acq.prepare("quiet");
      await acq.prepare("narrative");
      expect(acq.busyWith()).toBe("quiet");

      open();
      expect((await first).ok).toBe(true);
    });

    // A17 — 거부만 있고 빠져나갈 길이 없으면 사용자가 갇힌다
    it("받던 것이 끝나면 새 요청이 통한다", async () => {
      const h = harness();
      const acq = createAcquisition(h.ports);

      await acq.prepare("quiet");
      expect(acq.busyWith()).toBeNull();

      expect((await acq.prepare("narrative")).ok).toBe(true);
    });
  });

  // A8 / A9 — 처음부터 다시 받지 않는다 (FR-015, SC-006)
  it("중단 정보가 있으면 이어받는다", async () => {
    const key = assetFor("quiet").key;
    const h = harness({
      metadata: JSON.stringify({ verdicts: [], paused: [{ assetKey: key, state: { at: 1 } }] }),
    });

    await createAcquisition(h.ports).prepare("quiet");

    expect(h.requested[0].resumed).toBe(true);
  });

  // A7 — 멈추면 이어받을 수 있는 상태로 남는다 (FR-014)
  it("멈추면 중단 상태가 기기에 남는다", async () => {
    const h = harness();
    h.pauseNext();

    await createAcquisition(h.ports).prepare("quiet");

    const state = await readState(h.metadataPort);
    expect(state.paused).toHaveLength(1);
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

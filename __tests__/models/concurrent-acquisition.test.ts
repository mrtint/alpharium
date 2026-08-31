/**
 * 동시 내려받기 — acquisition.ts 확장 (026, A1~A11).
 *
 * 계약: specs/026-parallel-model-download/contracts/concurrent-acquisition.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 003의 `acquisition.test.ts`가 "한 번에 하나"를 검증했고, 이 파일은 그것이
 * 해제된 뒤의 **동시성 계약**을 본다 — 자리 선점(A8), 세그먼트 재개 전달(A9~A11),
 * `withoutAsset`이 segmented도 비우는지(A11).
 *
 * `acquisition.test.ts`와 겹치는 케이스(A1~A7)는 그쪽에서 이미 갱신했다 —
 * 여기서는 003 테스트가 다루지 않던 갈래만 둔다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createAcquisition } from "../../src/models/acquisition";
import type {
  DiskSpacePort,
  DownloadPort,
  MetadataPort,
  ModelFilePort,
  TransferOutcome,
  TransferProgress,
} from "../../src/models/port";
import { assetFor, CHARACTERS } from "../../src/models/roster";
import { readState, segmentedFor } from "../../src/models/storage";

function harness(metadata: string | null = null) {
  const requested: { key: string; url: string; resumed: boolean; state: unknown }[] = [];
  let stored = metadata;

  // 로스터에 실측 md5가 들어온 캐릭터는 검증이 진짜 비교로 바뀐다 — 대역은 "온전한
  // 파일"을 흉내 내는 것이 목적이므로 기준값을 그대로 되돌려준다 (003 harness와 동일).
  const matchingHash = (key: string) => {
    const asset = CHARACTERS.map(assetFor).find((a) => a.key === key);
    return asset && asset.md5 !== "" ? asset.md5 : "hash";
  };

  const files: ModelFilePort = {
    async facts() {
      return { exists: true, bytes: 1000 };
    },
    async contentHash(key) {
      return matchingHash(key);
    },
    async remove() {},
    async bytesUsed() {
      return 0;
    },
  };
  const meta: MetadataPort = {
    async read() {
      return stored;
    },
    async writeAtomically(c) {
      stored = c;
    },
  };
  const disk: DiskSpacePort = {
    async availableBytes() {
      return Number.MAX_SAFE_INTEGER;
    },
  };

  const makeTask = (
    onProgress: (p: TransferProgress) => void,
    outcome: TransferOutcome = { kind: "completed" },
  ) => ({
    async wait(): Promise<TransferOutcome> {
      onProgress({ bytesWritten: 1000, totalBytes: 1000 });
      return outcome;
    },
    async pause() {},
  });

  const download: DownloadPort = {
    start(key, url, onProgress) {
      requested.push({ key, url, resumed: false, state: null });
      return makeTask(onProgress);
    },
    resume(key, url, state, onProgress) {
      requested.push({ key, url, resumed: true, state });
      return makeTask(onProgress);
    },
  };

  return { ports: { files, metadata: meta, disk, download }, requested, metaPort: meta };
}

/* ───────────────────── A8 — 자리 선점 (await 사이 끼어듦 방어) ───────────────────── */

it("A8 — await 사이에 같은 캐릭터를 다시 요청해도 두 번 시작되지 않는다", async () => {
  const h = harness();
  const acq = createAcquisition(h.ports);

  // 두 prepare를 동시에 — await하지 않고 나란히 시작
  const [r1, r2] = await Promise.all([acq.prepare("quiet"), acq.prepare("quiet")]);

  // 하나는 성공, 하나는 busy. 시작은 정확히 한 번.
  const oks = [r1, r2].filter((r) => r.ok).length;
  const busies = [r1, r2].filter((r) => !r.ok && r.failure.kind === "busy").length;
  expect(oks).toBe(1);
  expect(busies).toBe(1);
  expect(h.requested).toHaveLength(1);
});

/* ───────────────────── A9 — 세그먼트 재개 상태를 resume에 넘긴다 ───────────────────── */

it("A9 — segmentedFor가 non-null이면 그 값을 download.resume에 넘긴다", async () => {
  const key = assetFor("quiet").key;
  const resume = {
    assetKey: key,
    totalBytes: 1000,
    segmentCount: 4,
    receivedBytes: [250, 250, 0, 0],
  };
  const h = harness(JSON.stringify({ verdicts: [], paused: [], segmented: [resume] }));

  await createAcquisition(h.ports).prepare("quiet");

  expect(h.requested[0].resumed).toBe(true);
  expect(h.requested[0].state).toMatchObject({ segmentCount: 4, receivedBytes: [250, 250, 0, 0] });
});

it("A9 — resume에 로스터 url이 함께 넘어간다 (port.ts resume 시그니처 확장)", async () => {
  const key = assetFor("quiet").key;
  const h = harness(
    JSON.stringify({
      verdicts: [],
      paused: [],
      segmented: [
        { assetKey: key, totalBytes: 1000, segmentCount: 4, receivedBytes: [1, 0, 0, 0] },
      ],
    }),
  );

  await createAcquisition(h.ports).prepare("quiet");

  expect(h.requested[0].url).toBe(assetFor("quiet").url);
});

/* ───────────────────── A10 — pause 시 세그먼트/일반 분기 ───────────────────── */

it("A10 — pause outcome이 SegmentedResume 모양이면 withSegmentedResume로 저장", async () => {
  const key = assetFor("quiet").key;
  const h = harness();
  const download: DownloadPort = {
    start(k, url, onProgress) {
      h.requested.push({ key: k, url, resumed: false, state: null });
      return {
        async wait(): Promise<TransferOutcome> {
          void onProgress;
          return {
            kind: "paused",
            state: {
              assetKey: key,
              totalBytes: 1000,
              segmentCount: 4,
              receivedBytes: [600, 100, 0, 0],
            },
          };
        },
        async pause() {},
      };
    },
    resume: h.ports.download.resume,
  };

  await createAcquisition({ ...h.ports, download }).prepare("quiet");

  const state = await readState(h.metaPort);
  expect(segmentedFor(state, key)?.receivedBytes).toEqual([600, 100, 0, 0]);
  expect(state.paused).toHaveLength(0);
});

/* ───────────────────── A11 — 검증 통과 후 withoutAsset이 segmented도 비운다 ───────────────────── */

it("A11 — 다 받아 검증되면 segmented 재개 상태가 사라진다", async () => {
  const key = assetFor("quiet").key;
  const h = harness(
    JSON.stringify({
      verdicts: [],
      paused: [],
      segmented: [
        { assetKey: key, totalBytes: 1000, segmentCount: 4, receivedBytes: [1, 0, 0, 0] },
      ],
    }),
  );

  await createAcquisition(h.ports).prepare("quiet");

  const state = await readState(h.metaPort);
  expect(segmentedFor(state, key)).toBeNull();
  expect(state.verdicts).toHaveLength(1);
});

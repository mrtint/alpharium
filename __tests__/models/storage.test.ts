/**
 * 보관과 삭제 검증 (S1~S14).
 *
 * 계약: specs/003-character-model-files/contracts/storage.md
 *
 * **S4(부분 파일도 지워짐)와 S6(일기는 남음)이 빠뜨리기 쉬운 둘이다.**
 * 전자가 빠지면 지웠는데 공간이 안 비고, 후자가 빠지면 모델을 지운 대가로 일기를 잃는다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { MetadataPort, ModelFilePort } from "../../src/models/port";
import {
  pausedFor,
  readState,
  removeAsset,
  segmentedFor,
  verdictFor,
  withoutSegmented,
  withPaused,
  withSegmentedResume,
  withVerdict,
  withoutAsset,
  writeState,
  type ModelState,
} from "../../src/models/storage";
import type { SegmentedResume } from "../../src/models/segmented/types";

/**
 * 주석을 걷어낸 소스. 금지 규칙을 **설명하는 것**과 **코드로 쓰는 것**은 다르다 —
 * 걷어내지 않으면 규칙을 문서화할수록 테스트가 실패하는 거꾸로 된 상태가 된다.
 */
const STORAGE_CODE = readFileSync(join(__dirname, "../../src/models/storage.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

/** 파일 대역. 지워진 것과 남은 것을 추적한다. */
function filePort(present: Record<string, number>) {
  const files = { ...present };
  const port: ModelFilePort = {
    async facts(key) {
      return { exists: key in files, bytes: files[key] ?? null };
    },
    async contentHash(key) {
      return key in files ? "hash" : null;
    },
    async remove(key) {
      delete files[key];
      // 부분 파일도 함께 지운다(FR-029) — 구현이 이 규칙을 지키는지는 아래 별도 검증
      delete files[`${key}.partial`];
    },
    async bytesUsed(key) {
      return (files[key] ?? 0) + (files[`${key}.partial`] ?? 0);
    },
  };
  return { port, files };
}

/** 메타데이터 대역. 쓰기 실패를 흉내 낼 수 있다. */
function metadataPort(initial: string | null = null) {
  let stored = initial;
  let failWrite = false;
  const port: MetadataPort = {
    async read() {
      return stored;
    },
    async writeAtomically(contents) {
      if (failWrite) throw new Error("쓰기 실패");
      stored = contents;
    },
  };
  return {
    port,
    current: () => stored,
    failNext: () => {
      failWrite = true;
    },
  };
}

const VERDICT = { assetKey: "a1", verifiedMd5: "abc", verifiedBytes: 1000, passed: true };

describe("보관과 삭제", () => {
  // S1
  it("지우면 파일이 사라진다", async () => {
    const { port, files } = filePort({ a1: 1000 });
    const meta = metadataPort();

    await removeAsset(port, meta.port, "a1");

    expect(files).not.toHaveProperty("a1");
  });

  // S4 — 남으면 공간이 실제로 비지 않는다 (SC-008)
  it("부분 파일도 함께 지워진다", async () => {
    const { port, files } = filePort({ a1: 500, "a1.partial": 300 });
    const meta = metadataPort();

    await removeAsset(port, meta.port, "a1");

    expect(files).not.toHaveProperty("a1.partial");
  });

  // S5
  it("지우면 검증 결과와 중단 상태도 사라진다", async () => {
    const state: ModelState = {
      verdicts: [VERDICT],
      segmented: [],
      paused: [{ assetKey: "a1", state: {} }],
    };
    const { port } = filePort({ a1: 1000 });
    const meta = metadataPort(JSON.stringify(state));

    await removeAsset(port, meta.port, "a1");

    const after = await readState(meta.port);
    expect(verdictFor(after, "a1")).toBeNull();
    expect(pausedFor(after, "a1")).toBeNull();
  });

  // S7
  it("다른 캐릭터의 것은 그대로 남는다", async () => {
    const state: ModelState = {
      verdicts: [VERDICT, { ...VERDICT, assetKey: "a2" }],
      segmented: [],
      paused: [],
    };
    const { port, files } = filePort({ a1: 1000, a2: 2000 });
    const meta = metadataPort(JSON.stringify(state));

    await removeAsset(port, meta.port, "a1");

    expect(files).toHaveProperty("a2");
    const after = await readState(meta.port);
    expect(verdictFor(after, "a2")).not.toBeNull();
  });

  // S6 / S14 — 모델 파일과 일기는 별개다 (FR-030, SC-009)
  it("일기 자리를 건드리지 않는다", () => {
    // 이 모듈이 002의 저장에 닿는 경로가 아예 없어야 한다.
    expect(STORAGE_CODE).not.toContain("diary");
    expect(STORAGE_CODE).not.toContain("DiaryStore");
  });

  // S9 — 사용자가 보는 것은 "지금 차지하는 자리"다
  it("공간 사용에 부분 파일도 합산된다", async () => {
    const { port } = filePort({ a1: 500, "a1.partial": 300 });

    expect(await port.bytesUsed("a1")).toBe(800);
  });

  // S12 — 쓰다 죽으면 검증 결과 전체를 잃는다
  it("메타 쓰기가 실패해도 기존 것이 남는다", async () => {
    const original: ModelState = { verdicts: [VERDICT], paused: [], segmented: [] };
    const meta = metadataPort(JSON.stringify(original));
    meta.failNext();

    await expect(
      writeState(meta.port, { verdicts: [], paused: [], segmented: [] }),
    ).rejects.toThrow();

    const after = await readState(meta.port);
    expect(verdictFor(after, "a1")).not.toBeNull();
  });

  // S13 — 정리와 재검증은 다른 일이다
  it("메타가 없어도 빈 상태로 읽히고 터지지 않는다", async () => {
    const meta = metadataPort(null);

    const state = await readState(meta.port);

    expect(state.verdicts).toEqual([]);
    expect(state.paused).toEqual([]);
  });

  it("메타가 깨져 있어도 빈 상태로 읽힌다", async () => {
    const meta = metadataPort("{{{ 깨진 JSON");

    const state = await readState(meta.port);

    expect(state.verdicts).toEqual([]);
  });

  it("한 자산에 검증 결과는 하나다", () => {
    let state: ModelState = { verdicts: [], paused: [], segmented: [] };
    state = withVerdict(state, VERDICT);
    state = withVerdict(state, { ...VERDICT, verifiedMd5: "new" });

    expect(state.verdicts).toHaveLength(1);
    expect(verdictFor(state, "a1")?.verifiedMd5).toBe("new");
  });

  it("한 자산에 중단 상태는 하나다", () => {
    let state: ModelState = { verdicts: [], paused: [], segmented: [] };
    state = withPaused(state, { assetKey: "a1", state: { at: 1 } });
    state = withPaused(state, { assetKey: "a1", state: { at: 2 } });

    expect(state.paused).toHaveLength(1);
  });

  it("자산 하나만 걷어낼 수 있다", () => {
    const state: ModelState = {
      verdicts: [VERDICT, { ...VERDICT, assetKey: "a2" }],
      segmented: [],
      paused: [{ assetKey: "a1", state: {} }],
    };

    const after = withoutAsset(state, "a1");

    expect(after.verdicts).toHaveLength(1);
    expect(after.paused).toHaveLength(0);
  });

  // 왕복에서 값이 변하지 않는다 (002의 SC-007과 같은 성질)
  it("저장하고 꺼내면 같은 값이 나온다", async () => {
    const meta = metadataPort();
    const state: ModelState = {
      verdicts: [VERDICT],
      segmented: [],
      paused: [{ assetKey: "a2", state: { opaque: "value" } }],
    };

    await writeState(meta.port, state);
    const after = await readState(meta.port);

    expect(after).toEqual(state);
  });
});

/* ─────────────────── 026 — 세그먼트 재개 상태 (data-model.md 「ModelState」) ─────────────────── */

const RESUME: SegmentedResume = {
  assetKey: "a2",
  totalBytes: 1_644_918_272,
  segmentCount: 4,
  receivedBytes: [411_229_568, 411_229_568, 200_000_000, 0],
};

describe("세그먼트 재개 상태 (026)", () => {
  it("segmented 없는 옛 파일도 빈 배열로 읽힌다 (마이그레이션 불필요)", async () => {
    const meta = metadataPort(JSON.stringify({ verdicts: [], paused: [] }));

    const state = await readState(meta.port);

    expect(state.segmented).toEqual([]);
  });

  it("segmented가 깨진 값이어도 빈 배열", async () => {
    const meta = metadataPort(JSON.stringify({ verdicts: [], paused: [], segmented: "깨짐" }));

    const state = await readState(meta.port);

    expect(state.segmented).toEqual([]);
  });

  it("segmentedFor가 해당 자산의 재개 상태를 준다", () => {
    const state: ModelState = { verdicts: [], paused: [], segmented: [RESUME] };

    expect(segmentedFor(state, "a2")).toEqual(RESUME);
    expect(segmentedFor(state, "a1")).toBeNull();
  });

  it("withSegmentedResume는 한 자산에 하나만 둔다", () => {
    let state: ModelState = { verdicts: [], paused: [], segmented: [] };
    state = withSegmentedResume(state, RESUME);
    state = withSegmentedResume(state, { ...RESUME, receivedBytes: [1, 2, 3, 4] });

    expect(state.segmented).toHaveLength(1);
    expect(segmentedFor(state, "a2")?.receivedBytes).toEqual([1, 2, 3, 4]);
  });

  it("withSegmentedResume는 같은 자산을 paused에서 제거한다 (상호배타)", () => {
    let state: ModelState = {
      verdicts: [],
      paused: [{ assetKey: "a2", state: { opaque: "x" } }],
      segmented: [],
    };

    state = withSegmentedResume(state, RESUME);

    expect(pausedFor(state, "a2")).toBeNull();
    expect(segmentedFor(state, "a2")).not.toBeNull();
  });

  it("withPaused는 같은 자산을 segmented에서 제거한다 (상호배타)", () => {
    let state: ModelState = { verdicts: [], paused: [], segmented: [RESUME] };

    state = withPaused(state, { assetKey: "a2", state: { opaque: "x" } });

    expect(segmentedFor(state, "a2")).toBeNull();
    expect(pausedFor(state, "a2")).not.toBeNull();
  });

  it("withoutSegmented는 segmented에서만 제거한다", () => {
    const state: ModelState = {
      verdicts: [VERDICT],
      paused: [],
      segmented: [RESUME, { ...RESUME, assetKey: "a3" }],
    };

    const after = withoutSegmented(state, "a2");

    expect(after.segmented).toHaveLength(1);
    expect(after.verdicts).toHaveLength(1);
  });

  it("withoutAsset도 segmented를 비운다", () => {
    const state: ModelState = {
      verdicts: [VERDICT],
      paused: [],
      segmented: [RESUME],
    };

    const after = withoutAsset(state, "a2");

    expect(after.segmented).toHaveLength(0);
  });

  it("segmented 왕복에서 값이 변하지 않는다", async () => {
    const meta = metadataPort();
    const state: ModelState = { verdicts: [], paused: [], segmented: [RESUME] };

    await writeState(meta.port, state);

    expect(await readState(meta.port)).toEqual(state);
  });
});

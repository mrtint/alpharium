/**
 * 내용 검증 검증 (D11, D16~D17의 채록 갈래).
 *
 * 계약: specs/003-character-model-files/contracts/readiness.md
 *
 * **크기는 같고 내용이 다른 파일이 걸리는지가 이 스토리의 존재 이유다**(SC-015).
 * 크기만 보는 검증으로는 통과해 버리는 경우이며, 그러면 헌법 원칙 V의 "받았는데 깨졌음"이
 * 사실상 판정되지 않는다.
 */

import { settleExistingFile, verifyDownloaded } from "../../src/models/verification";
import type { MetadataPort, ModelFilePort } from "../../src/models/port";

/** 파일 대역. 크기와 지문을 따로 정할 수 있어 "크기는 같은데 내용이 다른" 경우를 만든다. */
function filePort(bytes: number | null, hash: string | null): ModelFilePort {
  return {
    async facts() {
      return { exists: bytes !== null, bytes };
    },
    async contentHash() {
      return hash;
    },
    async remove() {},
    async bytesUsed() {
      return bytes ?? 0;
    },
  };
}

describe("내용 검증", () => {
  // D11 — 이 테스트가 이 스토리의 존재 이유다
  it("크기는 같고 내용이 다르면 통과하지 못한다", async () => {
    const verdict = await verifyDownloaded(filePort(1000, "different"), {
      assetKey: "a1",
      expectedBytes: 1000,
      expectedMd5: "abc",
    });

    expect(verdict.passed).toBe(false);
  });

  it("내용이 같으면 통과한다", async () => {
    const verdict = await verifyDownloaded(filePort(1000, "abc"), {
      assetKey: "a1",
      expectedBytes: 1000,
      expectedMd5: "abc",
    });

    expect(verdict.passed).toBe(true);
  });

  // 설계 중 발견 — 로스터가 바뀌면 옛 결과가 새 자산의 것으로 오독된다
  it("무엇을 검증했는지 함께 남긴다", async () => {
    const verdict = await verifyDownloaded(filePort(1000, "abc"), {
      assetKey: "a1",
      expectedBytes: 1000,
      expectedMd5: "abc",
    });

    expect(verdict.assetKey).toBe("a1");
    expect(verdict.verifiedBytes).toBe(1000);
    expect(verdict.verifiedMd5).toBe("abc");
  });

  it("파일이 없으면 통과하지 못한다", async () => {
    const verdict = await verifyDownloaded(filePort(null, null), {
      assetKey: "a1",
      expectedBytes: 1000,
      expectedMd5: "abc",
    });

    expect(verdict.passed).toBe(false);
  });

  // 「기준값이 아직 없을 때」 — 받은 다음에 재기로 한 결정의 귀결
  it("기준 지문이 없으면 받은 파일의 지문을 채록하고 통과시킨다", async () => {
    const verdict = await verifyDownloaded(filePort(12345, "measured"), {
      assetKey: "a1",
      expectedBytes: 0,
      expectedMd5: "",
    });

    expect(verdict.passed).toBe(true);
    // 채록한 값이 남아야 로스터에 옮겨 적을 수 있다
    expect(verdict.verifiedMd5).toBe("measured");
    expect(verdict.verifiedBytes).toBe(12345);
  });

  // 채록이라도 파일이 없으면 기록할 것이 없다
  it("기준 지문이 없어도 파일이 없으면 통과하지 못한다", async () => {
    const verdict = await verifyDownloaded(filePort(null, null), {
      assetKey: "a1",
      expectedBytes: 0,
      expectedMd5: "",
    });

    expect(verdict.passed).toBe(false);
  });

  // 원칙 IV — 검증이 측정 장치가 되지 않는다
  it("검증 결과에 시각·소요 시간이 없다", async () => {
    const verdict = await verifyDownloaded(filePort(1000, "abc"), {
      assetKey: "a1",
      expectedBytes: 1000,
      expectedMd5: "abc",
    });

    expect(verdict).not.toHaveProperty("verifiedAt");
    expect(verdict).not.toHaveProperty("elapsed");
    expect(verdict).not.toHaveProperty("duration");
  });
});

// 130 — 옛 모델과 새 모델의 바이트 수가 같다. 기록의 지문으로 옛 버전을 가려 다시 받는다.
describe("이미 있는 파일 정리 — 같은 크기·다른 지문", () => {
  function metadataPort(
    initial: object,
  ): MetadataPort & { contents: () => { verdicts: unknown[] } } {
    let raw: string | null = JSON.stringify(initial);
    return {
      async read() {
        return raw;
      },
      async writeAtomically(c: string) {
        raw = c;
      },
      contents: () => JSON.parse(raw ?? "null"),
    };
  }

  it("옛 지문으로 통과한 기록이면 지문을 다시 계산하지 않고 파일·기록을 지운 뒤 받으러 간다", async () => {
    const removed: string[] = [];
    let hashed = 0;
    const files: ModelFilePort = {
      async facts() {
        return { exists: true, bytes: 1000 };
      },
      async contentHash() {
        hashed++;
        return "old";
      },
      async remove(key) {
        removed.push(key);
      },
      async bytesUsed() {
        return 1000;
      },
    };
    const metadata = metadataPort({
      verdicts: [{ assetKey: "a1", verifiedMd5: "old", verifiedBytes: 1000, passed: true }],
      paused: [],
      segmented: [],
    });

    const result = await settleExistingFile(
      { files, metadata },
      { assetKey: "a1", expectedBytes: 1000, expectedMd5: "new" },
    );

    expect(result).toBe("download");
    expect(removed).toEqual(["a1"]);
    expect(hashed).toBe(0);
    expect(metadata.contents().verdicts).toEqual([]);
  });

  it("기록의 지문이 기준과 같으면 그대로 준비됨이다", async () => {
    const removed: string[] = [];
    const files: ModelFilePort = {
      ...filePort(1000, "new"),
      async remove(key) {
        removed.push(key);
      },
    };
    const metadata = metadataPort({
      verdicts: [{ assetKey: "a1", verifiedMd5: "new", verifiedBytes: 1000, passed: true }],
      paused: [],
      segmented: [],
    });
    const result = await settleExistingFile(
      { files, metadata },
      { assetKey: "a1", expectedBytes: 1000, expectedMd5: "new" },
    );
    expect(result).toBe("ready");
    expect(removed).toEqual([]);
  });
});

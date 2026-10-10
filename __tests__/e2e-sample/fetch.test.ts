import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CatalogPhoto } from "../../scripts/e2e-sample/catalog";
import { fetchCatalog, type FetchBytes } from "../../scripts/e2e-sample/fetch";

/**
 * 070 — 내려받기 (contracts/sample-seeding.md F-1~F-3·F-5).
 *
 * 네트워크는 주입한 대역이다. 캐시는 임시 폴더.
 */

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function photo(file: string, bytes: Buffer | null): CatalogPhoto {
  return {
    file,
    url: `https://upload.wikimedia.org/x/${file}`,
    sha256: bytes === null ? "" : sha(bytes),
    license: "CC0",
    sourcePage: `https://commons.wikimedia.org/wiki/File:${file}`,
    checkedOn: "2026-10-10",
    tags: ["food"],
    widthPx: 960,
  };
}

const A = Buffer.from("aaaa-image-bytes");
const B = Buffer.from("bbbb-image-bytes");

function harness(responses: Record<string, Buffer | number[]>) {
  const calls: string[] = [];
  const sleeps: number[] = [];
  const fetchBytes: FetchBytes = async (url) => {
    calls.push(url);
    const response = responses[url.split("/").pop()!];
    if (response === undefined) return { status: 404, bytes: Buffer.alloc(0) };
    if (Array.isArray(response)) {
      const status = response.shift() ?? 200;
      return status === 200 ? { status, bytes: A } : { status, bytes: Buffer.alloc(0) };
    }
    return { status: 200, bytes: response };
  };
  const sleep = async (ms: number) => {
    sleeps.push(ms);
  };
  const cacheDir = mkdtempSync(join(tmpdir(), "pocketlog-sample-cache-"));
  return { calls, sleeps, fetchBytes, sleep, cacheDir };
}

describe("fetchCatalog", () => {
  it("F-1: 순차로 받아 캐시에 쓰고, 요청 사이에 간격을 둔다", async () => {
    const h = harness({ "a.jpg": A, "b.jpg": B });
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", A), photo("b.jpg", B)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(true);
    expect(h.calls).toEqual([
      "https://upload.wikimedia.org/x/a.jpg",
      "https://upload.wikimedia.org/x/b.jpg",
    ]);
    expect(readFileSync(join(h.cacheDir, "a.jpg")).equals(A)).toBe(true);
    // 첫 요청 앞에는 간격이 없고 둘째 앞에는 ≥ 1000ms
    expect(h.sleeps.filter((ms) => ms >= 1000).length).toBeGreaterThanOrEqual(1);
  });

  it("F-1: 이미 있고 해시가 맞으면 건너뛴다 (네트워크 호출 0)", async () => {
    const h = harness({ "a.jpg": A });
    writeFileSync(join(h.cacheDir, "a.jpg"), A);
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", A)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(true);
    expect(h.calls).toEqual([]);
  });

  it("F-2: 해시가 다르면 파일을 남기지 않고 파일 이름과 함께 실패한다", async () => {
    const h = harness({ "a.jpg": B }); // 목록은 A의 해시인데 B가 온다
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", A)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/a\.jpg/);
    expect(existsSync(join(h.cacheDir, "a.jpg"))).toBe(false);
  });

  it("F-2: 캐시에 깨진 파일이 있으면 지우고 다시 받는다", async () => {
    const h = harness({ "a.jpg": A });
    writeFileSync(join(h.cacheDir, "a.jpg"), Buffer.from("garbage"));
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", A)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(true);
    expect(h.calls).toHaveLength(1);
    expect(readFileSync(join(h.cacheDir, "a.jpg")).equals(A)).toBe(true);
  });

  it("F-2: 중간에 하나가 실패하면 부분 캐시를 성공으로 보고하지 않는다", async () => {
    const h = harness({ "a.jpg": A, "b.jpg": A }); // b는 목록 해시(B)와 다르다
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", A), photo("b.jpg", B)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(false);
  });

  it("F-3: 429는 백오프 후 다시 시도하고 최대 3회 뒤 실패한다", async () => {
    const h = harness({ "a.jpg": [429, 429, 200] });
    const ok = await fetchCatalog({
      catalog: [photo("a.jpg", A)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(ok.ok).toBe(true);
    expect(h.calls).toHaveLength(3);
    // 백오프는 늘어난다
    const backoffs = h.sleeps.filter((ms) => ms >= 2000);
    expect(backoffs.length).toBeGreaterThanOrEqual(2);

    const h2 = harness({ "a.jpg": [429, 429, 429, 429, 429] });
    const failed = await fetchCatalog({
      catalog: [photo("a.jpg", A)],
      cacheDir: h2.cacheDir,
      fetchBytes: h2.fetchBytes,
      sleep: h2.sleep,
      recordHashes: false,
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.reason).toMatch(/429/);
    expect(h2.calls.length).toBeLessThanOrEqual(4);
  });

  it("404 등 200이 아닌 응답은 이유와 함께 실패한다", async () => {
    const h = harness({});
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", A)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/404/);
  });

  it("F-5: 해시가 비었는데 기록 모드가 아니면 실패한다", async () => {
    const h = harness({ "a.jpg": A });
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", null)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/record-hashes/);
  });

  it("F-5: 기록 모드는 빈 해시만 채우고 채워진 항목은 대조만 한다", async () => {
    const h = harness({ "a.jpg": A, "b.jpg": B });
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", null), photo("b.jpg", B)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.photos.find((p) => p.file === "a.jpg")!.sha256).toBe(sha(A));
      expect(result.photos.find((p) => p.file === "b.jpg")!.sha256).toBe(sha(B));
    }
  });

  it("F-5: 기록 모드여도 채워진 항목의 불일치는 여전히 실패한다", async () => {
    const h = harness({ "a.jpg": B });
    const result = await fetchCatalog({
      catalog: [photo("a.jpg", A)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: true,
    });
    expect(result.ok).toBe(false);
  });

  it("안전하지 않은 파일 이름은 캐시 밖에 쓰지 않는다", async () => {
    const h = harness({ "evil.jpg": A });
    const result = await fetchCatalog({
      catalog: [photo("../evil.jpg", A)],
      cacheDir: h.cacheDir,
      fetchBytes: h.fetchBytes,
      sleep: h.sleep,
      recordHashes: false,
    });
    expect(result.ok).toBe(false);
  });
});

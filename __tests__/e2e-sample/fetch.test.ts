import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CatalogPhoto } from "../../scripts/e2e-sample/catalog";
import { fetchCatalog, type FetchBytes, type LookupJson } from "../../scripts/e2e-sample/fetch";
import { tinyJpeg } from "./jpeg-fixture";

/**
 * 070 — 내려받기 (contracts/sample-seeding.md F-1·F-3). 084가 F-2·F-5를 대체했다
 * (specs/084-sample-photo-identity/contracts/photo-identity.md V-1~V-7): 처음 보는 썸네일 바이트는 Commons 원본을 확인한 뒤에만 받아들인다.
 *
 * 네트워크(썸네일·원본 조회)는 주입한 대역이다. 캐시는 임시 폴더.
 */

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** 원본 1440×810 → 960폭이면 540 */
const ORIGINAL = { width: 1440, height: 810 };
const SHA1 = "0123456789abcdef0123456789abcdef01234567";
const OTHER_SHA1 = "fedcba9876543210fedcba9876543210fedcba98";

const A = tinyJpeg(960, 540, 1);
const B = tinyJpeg(960, 540, 2);
/** A와 같은 원본의 다른 데이터센터 변형 */
const A2 = tinyJpeg(960, 540, 3);
const A3 = tinyJpeg(960, 540, 4);

function photo(
  file: string,
  bytes: Buffer[] | null,
  overrides: Partial<CatalogPhoto> = {},
): CatalogPhoto {
  return {
    file,
    url: `https://upload.wikimedia.org/x/${file}`,
    sha256: bytes === null ? [] : bytes.map(sha),
    originalSha1: SHA1,
    license: "CC0",
    sourcePage: `https://commons.wikimedia.org/wiki/File:${file}`,
    checkedOn: "2026-10-10",
    tags: ["food"],
    widthPx: 960,
    ...overrides,
  };
}

type Original = { sha1: string; width: number; height: number; timestamp: string };
type LookupAnswer = Original | number | "missing" | "throw" | "garbage";

const okOriginal = (over: Partial<Original> = {}): Original => ({
  sha1: SHA1,
  ...ORIGINAL,
  timestamp: "2020-01-01T00:00:00Z",
  ...over,
});

function harness(
  responses: Record<string, Buffer | number[] | Buffer[]>,
  originals: Record<string, LookupAnswer | LookupAnswer[]> = {},
) {
  const calls: string[] = [];
  const lookups: string[] = [];
  const sleeps: number[] = [];
  /** 썸네일·원본 조회를 한 줄로 — 간격이 어디에 들어가는지 본다 */
  const timeline: string[] = [];
  const fetchBytes: FetchBytes = async (url) => {
    calls.push(url);
    timeline.push(`get:${url.split("/").pop()}`);
    const response = responses[url.split("/").pop()!];
    if (response === undefined) return { status: 404, bytes: Buffer.alloc(0) };
    if (Array.isArray(response)) {
      const next = response.shift();
      if (Buffer.isBuffer(next)) return { status: 200, bytes: next };
      const status = next ?? 200;
      return status === 200 ? { status, bytes: A } : { status, bytes: Buffer.alloc(0) };
    }
    return { status: 200, bytes: response };
  };
  const lookupJson: LookupJson = async (url) => {
    const title = new URL(url).searchParams.get("titles")!.replace(/^File:/, "");
    lookups.push(title);
    timeline.push(`lookup:${title}`);
    const entry = originals[title];
    const answer = Array.isArray(entry) ? entry.shift() : entry;
    if (answer === undefined || answer === "missing") {
      return { status: 200, json: { query: { pages: { "-1": { ns: 6, title, missing: "" } } } } };
    }
    if (answer === "throw") throw new Error("ECONNRESET");
    if (answer === "garbage") return { status: 200, json: null };
    if (typeof answer === "number") return { status: answer, json: null };
    return {
      status: 200,
      json: { query: { pages: { "1": { ns: 6, title, imageinfo: [answer] } } } },
    };
  };
  const sleep = async (ms: number) => {
    sleeps.push(ms);
    timeline.push(`sleep:${ms}`);
  };
  const cacheDir = mkdtempSync(join(tmpdir(), "pocketlog-sample-cache-"));
  const run = (catalog: CatalogPhoto[], recordHashes = false) =>
    fetchCatalog({ catalog, cacheDir, fetchBytes, lookupJson, sleep, recordHashes });
  return { calls, lookups, sleeps, timeline, cacheDir, run };
}

describe("fetchCatalog — 받아들인 해시 (F-1·F-3·V-1·V-2)", () => {
  it("F-1: 순차로 받아 캐시에 쓰고, 요청 사이에 간격을 둔다", async () => {
    const h = harness({ "a.jpg": A, "b.jpg": B });
    const result = await h.run([photo("a.jpg", [A]), photo("b.jpg", [B])]);
    expect(result.ok).toBe(true);
    expect(h.calls).toEqual([
      "https://upload.wikimedia.org/x/a.jpg",
      "https://upload.wikimedia.org/x/b.jpg",
    ]);
    expect(readFileSync(join(h.cacheDir, "a.jpg")).equals(A)).toBe(true);
    // 첫 요청 앞에는 간격이 없고 둘째 앞에는 ≥ 1000ms
    expect(h.timeline[0]).toBe("get:a.jpg");
    expect(h.sleeps.filter((ms) => ms >= 1000).length).toBeGreaterThanOrEqual(1);
  });

  it("V-1: 받은 해시가 목록에 있으면 원본을 조회하지 않고, 바뀐 것이 없다", async () => {
    const h = harness({ "a.jpg": A2 });
    const result = await h.run([photo("a.jpg", [A, A2])]);
    expect(result.ok).toBe(true);
    expect(h.lookups).toEqual([]);
    if (result.ok) {
      expect(result.changed).toBe(false);
      expect(result.accepted).toEqual([]);
      expect(result.photos[0].sha256).toEqual([sha(A), sha(A2)]);
    }
  });

  it("F-1·V-1: 이미 있고 해시가 목록에 있으면 건너뛴다 (네트워크 호출 0)", async () => {
    const h = harness({ "a.jpg": A });
    writeFileSync(join(h.cacheDir, "a.jpg"), A2);
    const result = await h.run([photo("a.jpg", [A, A2])]);
    expect(result.ok).toBe(true);
    expect(h.calls).toEqual([]);
    expect(h.lookups).toEqual([]);
    if (result.ok) expect(result.cached).toBe(1);
  });

  it("V-2: 캐시에 목록에 없는 파일이 있으면 지우고 다시 받는다", async () => {
    const h = harness({ "a.jpg": A });
    writeFileSync(join(h.cacheDir, "a.jpg"), Buffer.from("garbage"));
    const result = await h.run([photo("a.jpg", [A])]);
    expect(result.ok).toBe(true);
    expect(h.calls).toHaveLength(1);
    expect(readFileSync(join(h.cacheDir, "a.jpg")).equals(A)).toBe(true);
  });

  it("F-3: 429는 백오프 후 다시 시도하고 최대 3회 뒤 실패한다", async () => {
    const h = harness({ "a.jpg": [429, 429, 200] });
    const ok = await h.run([photo("a.jpg", [A])]);
    expect(ok.ok).toBe(true);
    expect(h.calls).toHaveLength(3);
    // 백오프는 늘어난다
    expect(h.sleeps.filter((ms) => ms >= 2000).length).toBeGreaterThanOrEqual(2);

    const h2 = harness({ "a.jpg": [429, 429, 429, 429, 429] });
    const failed = await h2.run([photo("a.jpg", [A])]);
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.reason).toMatch(/429/);
    expect(h2.calls.length).toBeLessThanOrEqual(4);
  });

  it("404 등 200이 아닌 응답은 이유와 함께 실패한다", async () => {
    const h = harness({});
    const result = await h.run([photo("a.jpg", [A])]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/404/);
  });

  it("안전하지 않은 파일 이름은 캐시 밖에 쓰지 않는다", async () => {
    const h = harness({ "evil.jpg": A });
    const result = await h.run([photo("../evil.jpg", [A])]);
    expect(result.ok).toBe(false);
  });
});

describe("fetchCatalog — 새 썸네일 변형 받아들이기 (US1, V-3·V-6·V-7)", () => {
  it("V-3: 처음 보는 해시 + 원본 sha1 같음 + 썸네일 모양 → 캐시에 두고 덧붙인다", async () => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": okOriginal() });
    const result = await h.run([photo("a.jpg", [A])]);
    expect(result.ok).toBe(true);
    expect(h.lookups).toEqual(["a.jpg"]);
    expect(readFileSync(join(h.cacheDir, "a.jpg")).equals(A2)).toBe(true);
    if (result.ok) {
      expect(result.photos[0].sha256).toEqual([sha(A), sha(A2)]);
      expect(result.accepted).toEqual(["a.jpg"]);
      expect(result.changed).toBe(true);
    }
  });

  it("V-3: 덧붙인 목록으로 다시 돌리면 원본 조회도 네트워크도 없다", async () => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": okOriginal() });
    const first = await h.run([photo("a.jpg", [A])]);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const callsBefore = h.calls.length;
    const second = await h.run(first.photos);
    expect(second.ok).toBe(true);
    expect(h.calls.length).toBe(callsBefore);
    expect(h.lookups).toEqual(["a.jpg"]);
    if (second.ok) expect(second.changed).toBe(false);
  });

  it("V-3: 사진마다 자기 목록에 덧붙인다 (다른 사진의 목록을 건드리지 않는다)", async () => {
    const h = harness(
      { "a.jpg": A2, "b.jpg": A3 },
      { "a.jpg": okOriginal(), "b.jpg": okOriginal() },
    );
    const result = await h.run([photo("a.jpg", [A]), photo("b.jpg", [A])]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.photos[0].sha256).toEqual([sha(A), sha(A2)]);
      expect(result.photos[1].sha256).toEqual([sha(A), sha(A3)]);
      expect(result.accepted).toEqual(["a.jpg", "b.jpg"]);
    }
  });

  it("V-6: 원본 조회 앞에도 요청 간격이 들어간다", async () => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": okOriginal() });
    await h.run([photo("a.jpg", [A])]);
    const at = h.timeline.indexOf("lookup:a.jpg");
    expect(at).toBeGreaterThan(0);
    expect(h.timeline[at - 1]).toMatch(/^sleep:(\d+)$/);
    expect(Number(h.timeline[at - 1].split(":")[1])).toBeGreaterThanOrEqual(1000);
  });

  it("V-6: 원본 조회의 429도 백오프 후 다시 시도한다", async () => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": [429, okOriginal()] });
    const result = await h.run([photo("a.jpg", [A])]);
    expect(result.ok).toBe(true);
    expect(h.lookups).toEqual(["a.jpg", "a.jpg"]);
  });
});

describe("fetchCatalog — 다른 사진은 받지 않는다 (US2, V-4)", () => {
  const expectRejected = (
    h: ReturnType<typeof harness>,
    result: Awaited<ReturnType<ReturnType<typeof harness>["run"]>>,
  ) => {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/a\.jpg/);
    expect(existsSync(join(h.cacheDir, "a.jpg"))).toBe(false);
  };

  it("원본 sha1이 다르면 실패하고 두 sha1의 앞자리를 보인다", async () => {
    const h = harness({ "a.jpg": B }, { "a.jpg": okOriginal({ sha1: OTHER_SHA1 }) });
    const result = await h.run([photo("a.jpg", [A])]);
    expectRejected(h, result);
    if (!result.ok) {
      expect(result.reason).toContain(SHA1.slice(0, 12));
      expect(result.reason).toContain(OTHER_SHA1.slice(0, 12));
    }
  });

  it.each([
    ["HTTP 500", 500],
    ["JSON이 아님", "garbage"],
    ["페이지 없음", "missing"],
    ["조회가 던짐", "throw"],
  ] as const)("원본을 확인하지 못하면(%s) 실패한다", async (_label, answer) => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": answer });
    expectRejected(h, await h.run([photo("a.jpg", [A])]));
  });

  it("원본 조회의 429가 네 번이면 실패하고 이유에 429가 있다", async () => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": [429, 429, 429, 429, 429] });
    const result = await h.run([photo("a.jpg", [A])]);
    expectRejected(h, result);
    if (!result.ok) expect(result.reason).toMatch(/429/);
    expect(h.lookups.length).toBeLessThanOrEqual(4);
  });

  it.each([
    ["폭이 다름", tinyJpeg(800, 450, 9)],
    ["높이가 2px 넘게 다름", tinyJpeg(960, 543, 9)],
    ["JPEG가 아님", Buffer.from("<html>200으로 온 오류 페이지</html>")],
  ])("원본이 같아도 썸네일 모양이 아니면(%s) 실패한다", async (_label, bytes) => {
    const h = harness({ "a.jpg": bytes }, { "a.jpg": okOriginal() });
    expectRejected(h, await h.run([photo("a.jpg", [A])]));
  });

  it("출처 페이지가 File: 제목이 아니면 조회 없이 실패한다", async () => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": okOriginal() });
    const result = await h.run([
      photo("a.jpg", [A], { sourcePage: "https://commons.wikimedia.org/wiki/Category:X" }),
    ]);
    expectRejected(h, result);
    expect(h.lookups).toEqual([]);
  });

  it("앞 사진이 새 변형으로 받아들여진 뒤 뒤 사진이 실패하면 전체가 실패다 (부분 성공 없음)", async () => {
    const h = harness(
      { "b.jpg": A2, "a.jpg": B },
      { "b.jpg": okOriginal(), "a.jpg": okOriginal({ sha1: OTHER_SHA1 }) },
    );
    const result = await h.run([photo("b.jpg", [A]), photo("a.jpg", [A])]);
    expectRejected(h, result);
  });
});

describe("fetchCatalog — 기록 모드 (US4, V-5)", () => {
  it("원본 sha1이 비었는데 기록 모드가 아니면 실패하고 기록 모드로 채우라고 알린다", async () => {
    const h = harness({ "a.jpg": A }, { "a.jpg": okOriginal() });
    const result = await h.run([photo("a.jpg", [A], { originalSha1: "" })]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/record-hashes/);
  });

  it("빈 원본 sha1을 조회해 채우고, 이미 채워진 항목은 조회하지 않는다", async () => {
    const h = harness({ "a.jpg": A, "b.jpg": B }, { "a.jpg": okOriginal() });
    const result = await h.run(
      [photo("a.jpg", [A], { originalSha1: "" }), photo("b.jpg", [B])],
      true,
    );
    expect(result.ok).toBe(true);
    expect(h.lookups).toEqual(["a.jpg"]);
    if (result.ok) {
      expect(result.photos[0].originalSha1).toBe(SHA1);
      expect(result.photos[1].originalSha1).toBe(SHA1);
      expect(result.changed).toBe(true);
      expect(result.accepted).toEqual([]);
    }
  });

  it("원본이 확인 일자 뒤에 다시 올라왔으면 채우지 않고 실패한다", async () => {
    const h = harness(
      { "a.jpg": A },
      { "a.jpg": okOriginal({ timestamp: "2026-10-11T00:00:00Z" }) },
    );
    const result = await h.run([photo("a.jpg", [A], { originalSha1: "" })], true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/a\.jpg/);
  });

  it("원본을 올린 날이 확인 일자와 같으면 채운다", async () => {
    const h = harness(
      { "a.jpg": A },
      { "a.jpg": okOriginal({ timestamp: "2026-10-10T23:59:59Z" }) },
    );
    const result = await h.run([photo("a.jpg", [A], { originalSha1: "" })], true);
    expect(result.ok).toBe(true);
  });

  it("채운 사진이 처음 보는 해시여도 원본 조회는 그 사진에 한 번뿐이다", async () => {
    const h = harness({ "a.jpg": A2 }, { "a.jpg": okOriginal() });
    const result = await h.run([photo("a.jpg", [A], { originalSha1: "" })], true);
    expect(result.ok).toBe(true);
    expect(h.lookups).toEqual(["a.jpg"]);
    if (result.ok) {
      expect(result.photos[0].originalSha1).toBe(SHA1);
      expect(result.photos[0].sha256).toEqual([sha(A), sha(A2)]);
      expect(result.accepted).toEqual(["a.jpg"]);
    }
  });

  it("이미 채워진 원본 sha1은 덮어쓰지 않는다 — 원본이 달라졌으면 그 사진은 실패한다", async () => {
    const h = harness({ "a.jpg": B }, { "a.jpg": okOriginal({ sha1: OTHER_SHA1 }) });
    const result = await h.run([photo("a.jpg", [A])], true);
    expect(result.ok).toBe(false);
  });

  it("빈 해시 목록은 원본 확인을 거친 받은 바이트의 해시로 채운다", async () => {
    const h = harness({ "a.jpg": A }, { "a.jpg": okOriginal() });
    const result = await h.run([photo("a.jpg", null)], true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.photos[0].sha256).toEqual([sha(A)]);
      expect(result.changed).toBe(true);
    }
  });

  it("채우기 조회가 실패하면 실패한다", async () => {
    const h = harness({ "a.jpg": A }, { "a.jpg": "throw" });
    const result = await h.run([photo("a.jpg", [A], { originalSha1: "" })], true);
    expect(result.ok).toBe(false);
  });
});

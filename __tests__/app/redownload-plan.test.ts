/**
 * 059 — 모듈 다시 받기 계획 (계약 RD1~RD4·RD6, 037).
 *
 * 받을 것이 없으면 확인 없이 알리고, 있으면 확인한다. 연결 종류는 모바일이 **확인될 때만** 문구에 쓴다(원칙 V). 이 경로는 모듈 파일을
 * 지우지 않는다(037 — 소스 계약).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { planRedownload, remainingBytes, type RedownloadDeps } from "../../src/app/redownload-plan";

function deps(over: Partial<RedownloadDeps> = {}): RedownloadDeps {
  return {
    readFacts: async () => [
      { key: "v1", ready: true },
      { key: "v2", ready: true },
      { key: "a1", ready: true },
    ],
    readRemainingBytes: async () => 1_200_000_000,
    readConnection: jest.fn(async () => "cellular" as const),
    ...over,
  };
}

const missing = async () => [
  { key: "v1", ready: false },
  { key: "v2", ready: false },
  { key: "a1", ready: true },
];

describe("RD1 — 다 있으면 nothing", () => {
  it("연결 종류를 읽지 않는다", async () => {
    const d = deps();
    expect(await planRedownload(d)).toEqual({ kind: "nothing" });
    expect(d.readConnection).not.toHaveBeenCalled();
  });
});

describe("RD2·RD3 — 빠진 것이 있으면 confirm", () => {
  it("모바일이 확인되면 받을 양을 문자열로 준다(1000 기준)", async () => {
    expect(await planRedownload(deps({ readFacts: missing }))).toEqual({
      kind: "confirm",
      cellularSize: "1.2GB",
    });
  });

  it.each(["wifi", "other", "unknown"] as const)(
    "연결 %s 면 cellularSize 가 null",
    async (connection) => {
      const result = await planRedownload(
        deps({ readFacts: missing, readConnection: async () => connection }),
      );
      expect(result).toEqual({ kind: "confirm", cellularSize: null });
    },
  );

  it("연결을 읽다 던져도 confirm 이고 null", async () => {
    const result = await planRedownload(
      deps({
        readFacts: missing,
        readConnection: async () => {
          throw new Error("io");
        },
      }),
    );
    expect(result).toEqual({ kind: "confirm", cellularSize: null });
  });

  it("받을 양을 못 읽으면 모바일이어도 크기를 말하지 않는다(지어내지 않는다)", async () => {
    const result = await planRedownload(
      deps({
        readFacts: missing,
        readRemainingBytes: async () => {
          throw new Error("io");
        },
      }),
    );
    expect(result).toEqual({ kind: "confirm", cellularSize: null });
  });
});

describe("planRedownload 가 사실을 못 읽으면", () => {
  it("「다 있다」로 세지 않고 confirm 으로 다룬다(원칙 V)", async () => {
    const result = await planRedownload(
      deps({
        readFacts: async () => {
          throw new Error("io");
        },
      }),
    );
    expect(result).toEqual({ kind: "confirm", cellularSize: null });
  });
});

describe("RD6 — 파일을 지우지 않는다", () => {
  it.each(["redownload-plan.ts", "network-port.ts"])("%s 에 지우기 어휘가 없다", (file) => {
    const code = readFileSync(join(__dirname, "../../src/app", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.remove\(|\.delete\(|removeAll|unlink/);
  });
});

describe("RD4 — 받을 양", () => {
  const expectedBytes = { v1: 380, v2: 100, a1: 1500 };

  it("준비되지 않은 키마다 기대 − 이미 받은 만큼(0 이상)의 합이다", () => {
    const facts = [
      { key: "v1", ready: false },
      { key: "v2", ready: false },
      { key: "a1", ready: true },
    ];
    expect(remainingBytes({ facts, expectedBytes, usedBytes: { v1: 80, v2: 130, a1: 1500 } })).toBe(
      300,
    );
  });

  it("이미 받은 만큼을 못 읽은 키는 기대 전체로 센다(적게 말하지 않는다)", () => {
    const facts = [
      { key: "v1", ready: false },
      { key: "v2", ready: true },
      { key: "a1", ready: false },
    ];
    expect(remainingBytes({ facts, expectedBytes, usedBytes: { v1: null, a1: 500 } })).toBe(
      380 + 1000,
    );
  });

  it("다 준비됐으면 0", () => {
    const facts = ["v1", "v2", "a1"].map((key) => ({ key, ready: true }));
    expect(remainingBytes({ facts, expectedBytes, usedBytes: {} })).toBe(0);
  });
});

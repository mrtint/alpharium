import { parseIosLayer2Args } from "../../scripts/layer2-ios/run";

/**
 * 095 — iOS 층 2 명령줄 인자. 잘못 쓴 인자가 모든 흐름을 돌리지 않는다(리뷰 11).
 */

describe("iOS 층 2 인자 (095)", () => {
  it("인자가 없으면 모든 흐름이다", () => {
    expect(parseIosLayer2Args([])).toEqual({
      flowIds: [],
      unknown: [],
      operationTimeoutMs: undefined,
      generationTimeoutMs: undefined,
    });
  });

  it("흐름 id와 대기 한도(초)를 읽는다", () => {
    const parsed = parseIosLayer2Args([
      "write-and-read",
      "--operation-timeout",
      "5",
      "--generation-timeout",
      "7",
    ]);
    expect(parsed.flowIds).toEqual(["write-and-read"]);
    expect(parsed.operationTimeoutMs).toBe(5000);
    expect(parsed.generationTimeoutMs).toBe(7000);
    expect(parsed.unknown).toEqual([]);
  });

  it("모르는 흐름 id·잘못된 옵션 값은 unknown에 모은다 (전부 돌리지 않는다)", () => {
    expect(parseIosLayer2Args(["write-and-reed"]).unknown).toEqual(["write-and-reed"]);
    expect(parseIosLayer2Args(["--operation-timeout", "abc"]).unknown).toHaveLength(1);
    expect(parseIosLayer2Args(["--operation-timeout"]).unknown).toHaveLength(1);
    expect(parseIosLayer2Args(["--bogus"]).unknown).toEqual(["--bogus"]);
  });
});

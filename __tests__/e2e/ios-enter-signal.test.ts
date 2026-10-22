import { waitForSignalFile } from "../../scripts/layer2-ios/enter-signal";

/**
 * 097 — 표준 입력이 터미널이 아닐 때(에이전트·CI 셸) 「조작을 마쳤다」를 파일로 알린다. 파일이 생기면 entered, 한도까지 안 생기면 timeout.
 * 앞 흐름이 남긴 신호 파일은 시작할 때 지워 새 신호만 센다(터미널의 남은 Enter 처리와 같은 이유).
 */

function fake(appearsAtPoll: number | null, stale = false) {
  let clock = 0;
  let polls = 0;
  const existing = new Set<string>(stale ? ["signal"] : []);
  const removed: string[] = [];
  return {
    removed,
    deps: {
      exists: (path: string) => {
        polls += 1;
        if (appearsAtPoll !== null && polls >= appearsAtPoll) existing.add(path);
        return existing.has(path);
      },
      remove: (path: string) => {
        removed.push(path);
        existing.delete(path);
      },
      sleep: async (ms: number) => {
        clock += ms;
      },
      nowMs: () => clock,
    },
  };
}

describe("조작 완료 신호 파일 (097)", () => {
  it("파일이 생기면 entered", async () => {
    const { deps } = fake(3);
    expect(await waitForSignalFile("signal", 60_000, deps)).toBe("entered");
  });

  it("한도까지 안 생기면 timeout", async () => {
    const { deps } = fake(null);
    expect(await waitForSignalFile("signal", 5_000, deps)).toBe("timeout");
  });

  it("시작할 때 남아 있던 옛 신호는 지우고 새 신호만 센다", async () => {
    const { deps, removed } = fake(null, true);
    expect(await waitForSignalFile("signal", 3_000, deps)).toBe("timeout");
    expect(removed).toContain("signal");
  });

  it("신호를 읽은 뒤에는 파일을 지운다 (다음 흐름이 이어 읽지 않게)", async () => {
    const { deps, removed } = fake(2);
    await waitForSignalFile("signal", 60_000, deps);
    expect(removed.filter((p) => p === "signal").length).toBeGreaterThanOrEqual(2);
  });
});

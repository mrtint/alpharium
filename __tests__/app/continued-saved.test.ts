/**
 * 092 CW5·FR-008 — 이어 쓰기가 저장됐을 때: 앱이 뒤에 있을 때만, 쓸 차례 알림을 맞춘 뒤 완성 알림을 한 번.
 */

import { notifyContinuedSaved, type ContinuedSavedDeps } from "../../src/app/continued-saved";

function deps(launch: ReturnType<ContinuedSavedDeps["launchState"]>, log: unknown[][]) {
  const value: ContinuedSavedDeps = {
    launchState: () => launch,
    reconcile: async (names) => {
      log.push(["reconcile", names]);
    },
    notify: async (day, character, names) => {
      log.push(["notify", day, character, names]);
    },
  };
  return value;
}

describe("092 CW5 — notifyContinuedSaved", () => {
  it("뒤에 있으면 맞추기 → 완성 알림 순서로 한 번씩", async () => {
    const log: unknown[][] = [];
    await notifyContinuedSaved("2026-10-19", "quiet", { quiet: "금동이" }, deps("background", log));
    expect(log).toEqual([
      ["reconcile", { quiet: "금동이" }],
      ["notify", "2026-10-19", "quiet", { quiet: "금동이" }],
    ]);
  });

  it.each([["active"], [undefined]] as const)("%p면 아무것도 하지 않는다", async (launch) => {
    const log: unknown[][] = [];
    await notifyContinuedSaved("2026-10-19", "quiet", undefined, deps(launch, log));
    expect(log).toEqual([]);
  });

  it("앞 판정이 던지면 띄우지 않고, 맞추기·알림이 던져도 던지지 않는다", async () => {
    const log: unknown[][] = [];
    await notifyContinuedSaved("2026-10-19", "quiet", undefined, {
      ...deps("background", log),
      launchState: () => {
        throw new Error("x");
      },
    });
    expect(log).toEqual([]);
    await expect(
      notifyContinuedSaved("2026-10-19", "quiet", undefined, {
        launchState: () => "background",
        reconcile: () => Promise.reject(new Error("r")),
        notify: async () => {
          log.push(["notify"]);
        },
      }),
    ).resolves.toBeUndefined();
    expect(log).toEqual([["notify"]]);
    await expect(
      notifyContinuedSaved("2026-10-19", "quiet", undefined, {
        launchState: () => "background",
        reconcile: async () => {},
        notify: () => Promise.reject(new Error("n")),
      }),
    ).resolves.toBeUndefined();
  });
});

describe("118 — 관찰(판정은 바꾸지 않는다)", () => {
  it("뒤가 아니라서 돌아오면 not-background, 알리면 notified를 알린다", async () => {
    const seen: string[] = [];
    const observe = (e: string) => seen.push(e);
    await notifyContinuedSaved("2026-10-19", "quiet", undefined, {
      ...deps("active", []),
      observe,
    });
    await notifyContinuedSaved("2026-10-19", "quiet", undefined, {
      ...deps("background", []),
      observe,
    });
    expect(seen).toEqual(["saved-not-background", "saved-notified"]);
  });

  it("관찰이 던져도 알림은 그대로 나간다", async () => {
    const log: unknown[][] = [];
    await notifyContinuedSaved("2026-10-19", "quiet", undefined, {
      ...deps("background", log),
      observe: () => {
        throw new Error("x");
      },
    });
    expect(log.map((l) => l[0])).toEqual(["reconcile", "notify"]);
  });
});

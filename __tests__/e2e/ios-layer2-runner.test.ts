import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { fixtureDay } from "../../scripts/layer1/fixtures";
import type { Outcome } from "../../scripts/layer1/device";
import type { IosPhone, RemoteFile } from "../../scripts/layer2-ios/device";
import { IOS_LAYER2_FLOWS } from "../../scripts/layer2-ios/flows";
import { runLayer2Ios, type IosLayer2Deps } from "../../scripts/layer2-ios/runner";

/**
 * 095 — iOS 층 2 실행기의 단계와 보고 (기기 대역·가짜 시계).
 *
 * 계약: specs/095-ios-e2e-suite/contracts/ios-layer2-runner.md (L2-0~L2-8, I-1), FR-010·FR-012
 */

const UDID = "PHONE-1";
const NOW = new Date(2026, 9, 22, 14, 30);
const ok: Outcome = { ok: true, value: undefined };
const MODELS: RemoteFile[] = ["a1.bin", "state.json", "v1.bin", "v2.bin"].map((name) => ({
  name,
  size: 1000,
}));

type Setup = Partial<{
  devices: string[] | null;
  probe: Outcome;
  models: RemoteFile[];
  /** 폴링 몇 번째에 일기 파일이 생기나 (undefined = 안 생김) */
  diaryAppearsAtPoll: number;
  diaryText: string;
  failureItems: string[];
  enter: "entered" | "timeout" | "no-tty";
  xcode: boolean;
  seeded: string[];
  /** 지우기가 안 돼 쓸 날의 일기 파일이 처음부터 남아 있다 */
  staleDiary: boolean;
  /** 실패 기록 파일은 있는데 가져오지 못한다 */
  unreadableFailure: boolean;
  /** 앱을 띄운 뒤 일기 폴더 목록 읽기가 항상 실패한다 */
  pollErrors: boolean;
}>;

function build(over: Setup = {}, flows = IOS_LAYER2_FLOWS) {
  const events: string[] = [];
  let polls = 0;
  let launched = false;
  let clock = 0;
  const day = (flow: (typeof flows)[number]) => fixtureDay(NOW, flow.writtenDay);
  // 한 번에 한 흐름만 돌리는 테스트라 현재 흐름은 첫 흐름이다
  const current = flows[0];
  const failuresText =
    over.failureItems === undefined
      ? null
      : JSON.stringify({
          items: over.failureItems.map((reason) => ({ reason, at: NOW.toISOString() })),
        });
  const phone: IosPhone = {
    labels: {
      toolMissing: "devicectl 없음",
      noDevice: "iPhone 없음",
      probeHint: "서명 빌드가 아닐 수 있다",
    },
    listDevices: () => (over.devices === undefined ? [UDID] : over.devices),
    probe: () => over.probe ?? ok,
    listDir: (_u, relative) => ({
      ok: true,
      value: relative === "models" ? (over.models ?? MODELS).map((m) => m.name) : [],
    }),
    remoteList: (_u, relative) => {
      if (relative === "models") return { ok: true, value: over.models ?? MODELS };
      if (relative === "diary") {
        if (!launched) {
          // 앱을 띄우기 전의 목록 — 기준 상태 확인과 쓸 날의 일기가 없는지 보는 자리
          return {
            ok: true,
            value: over.staleDiary ? [{ name: `${day(current)}.json`, size: 500 }] : [],
          };
        }
        if (over.pollErrors) return { ok: false, detail: "device locked" };
        polls += 1;
        events.push("poll");
        const appeared = over.diaryAppearsAtPoll !== undefined && polls >= over.diaryAppearsAtPoll;
        return { ok: true, value: appeared ? [{ name: `${day(current)}.json`, size: 500 }] : [] };
      }
      if (relative === "preferences") {
        // 기준 상태 확인(앱을 띄우기 전)에서는 실패 기록이 없다 — 이 실행이 낳은 것만 앱을 띄운 뒤에 보인다
        const shown = launched && (failuresText !== null || over.unreadableFailure === true);
        return { ok: true, value: shown ? [{ name: "write-failures.json", size: 10 }] : [] };
      }
      return { ok: true, value: [] };
    },
    forceStop: () => {
      events.push("forceStop");
      // 앱을 끄면 폴링 단계가 끝난 것이다 — 이어지는 기준 상태 복원의 목록 읽기는 폴링이 아니다
      launched = false;
      return ok;
    },
    ensureDirs: () => ok,
    writeFile: (_u, relative) => {
      events.push(`write:${relative}`);
      return ok;
    },
    copyFile: () => ok,
    removeFile: (_u, relative) => {
      events.push(`remove:${relative}`);
      return ok;
    },
    pullFile: (_u, relative, local) => {
      events.push(`pull:${relative}`);
      if (relative.endsWith("write-failures.json") && over.unreadableFailure)
        return { ok: false, detail: "copy from failed" };
      mkdirSync(dirname(local), { recursive: true });
      const text = relative.endsWith("write-failures.json")
        ? failuresText!
        : (over.diaryText ??
          JSON.stringify({ date: day(current), text: "휴대폰이 오늘을 짐작했다." }));
      writeFileSync(local, text);
      return ok;
    },
    flush: async () => {
      events.push("flush");
      return ok;
    },
    launch: () => {
      events.push("launch");
      launched = true;
      return ok;
    },
  };
  const deps: IosLayer2Deps = {
    phone,
    now: NOW,
    flows,
    collectDirectory: mkdtempSync(join(tmpdir(), "pocketlog-l2ios-")),
    pollIntervalMs: 5000,
    log: (line) => events.push(`log:${line}`),
    clock: {
      nowMs: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
    },
    prompt: {
      announce: (lines) => events.push(`announce:${lines.length}`),
      waitForEnter: async () => {
        events.push("wait-enter");
        return over.enter ?? "entered";
      },
    },
    seed: {
      xcodeRunning: () => over.xcode ?? false,
      seedDay: (d) => {
        events.push(`seed:${d}`);
        return ok;
      },
      seededDays: (udid) => {
        events.push(`seeded-days:${udid}`);
        return over.seeded ?? [];
      },
      markSeeded: (udid, d) => events.push(`mark:${udid}:${d}`),
    },
  };
  return { deps, events };
}

const only = (id: string) => IOS_LAYER2_FLOWS.filter((f) => f.id === id);

describe("iOS 층 2 실행기 (095)", () => {
  it("L2-0 — 안내 한 줄을 출력한다 (보관함에 합성 사진이 남는다는 말 포함)", async () => {
    const { deps, events } = build({ diaryAppearsAtPoll: 1 }, only("open-app-writes"));
    await runLayer2Ios(deps);
    const first = events.find((e) => e.startsWith("log:"))!;
    expect(first).toContain("전용");
    expect(first).toContain("합성 사진");
  });

  it.each([
    ["devicectl 없음", { devices: null }, "devicectl 없음"],
    ["iPhone 없음", { devices: [] }, "iPhone 없음"],
  ] as [string, Setup, string][])(
    "L2-1 — %s는 skipped이고 아무것도 바꾸지 않는다 (SC-005)",
    async (_n, over, reason) => {
      const { deps, events } = build(over);
      const result = await runLayer2Ios(deps);
      expect(result.status).toBe("skipped");
      expect(result.reason).toContain(reason);
      expect(events.some((e) => /^(write|remove|flush|launch|seed)/.test(e))).toBe(false);
    },
  );

  it("L2-1 — iPhone이 둘 이상이면 aborted", async () => {
    const { deps } = build({ devices: ["A", "B"] });
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("aborted");
  });

  it("L2-1 — 컨테이너에 못 닿으면 aborted이고 서명 빌드 짐작을 말한다", async () => {
    const { deps } = build({ probe: { ok: false, detail: "locked" } });
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("서명 빌드");
  });

  it("L2-2 — 모델이 없거나 0바이트면 aborted이고 아무것도 바꾸지 않는다", async () => {
    for (const models of [
      [{ name: "a1.bin", size: 1 }],
      MODELS.map((m) => (m.name === "v1.bin" ? { ...m, size: 0 } : m)),
    ]) {
      const { deps, events } = build({ models });
      const result = await runLayer2Ios(deps);
      expect(result.status).toBe("aborted");
      expect(result.reason).toMatch(/모델/);
      expect(events.some((e) => /^(write|remove|flush|launch|seed)/.test(e))).toBe(false);
    }
  });

  it("앱을 열면 쓰기 — 사람 조작 없이 일기 파일이 생기면 passed이고 일기를 가져온다 (L2-6·L2-8)", async () => {
    const { deps, events } = build({ diaryAppearsAtPoll: 3 }, only("open-app-writes"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("passed");
    expect(result.perFlow[0].outcome).toBe("passed");
    expect(result.perFlow[0].collected).toContain(String(fixtureDay(NOW, "yesterday")));
    expect(events).not.toContain("wait-enter");
    expect(events.filter((e) => e === "poll")).toHaveLength(3);
  });

  it("순서(B2) — 기준 상태 → 시딩 → 앱 종료 → 흐름별 덮어쓰기 → 실행", async () => {
    const { deps, events } = build({ diaryAppearsAtPoll: 1 }, only("open-app-writes"));
    await runLayer2Ios(deps);
    const at = (e: string) => events.findIndex((x) => x === e || x.startsWith(e));
    const firstFlush = at("flush");
    const seed = at("seed:");
    const stopAfterSeed = events.indexOf("forceStop", seed);
    // 기준 상태가 먼저 auto-diary.json을 꺼진 값으로 쓰므로 덮어쓰기는 시딩 뒤의 첫 쓰기다
    const override = events.findIndex(
      (e, i) => i > seed && e === "write:preferences/auto-diary.json",
    );
    const launch = at("launch");
    expect(firstFlush).toBeLessThan(seed);
    expect(seed).toBeLessThan(stopAfterSeed);
    expect(stopAfterSeed).toBeLessThan(override);
    expect(override).toBeLessThan(launch);
    // 시딩 앞에는 기준값(꺼짐)만 쓰이고 켜짐은 시딩 뒤의 마지막 쓰기다 — 시딩 앱 실행이 쓰기를 먼저 시작하지 않게
    expect(events.indexOf("write:preferences/auto-diary.json")).toBeLessThan(seed);
  });

  it("B1 — 같은 날 이미 심었으면 시딩을 건너뛴다", async () => {
    const day = String(fixtureDay(NOW, "yesterday"));
    const { deps, events } = build(
      { diaryAppearsAtPoll: 1, seeded: [day] },
      only("open-app-writes"),
    );
    await runLayer2Ios(deps);
    expect(events.some((e) => e.startsWith("seed:"))).toBe(false);
  });

  it("087 — Xcode가 켜져 있으면 시딩 전에 aborted", async () => {
    const { deps, events } = build({ xcode: true }, only("open-app-writes"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("Xcode");
    expect(events.some((e) => e.startsWith("seed:"))).toBe(false);
  });

  it("사람 흐름 — 안내 뒤 Enter를 기다리고, 그 뒤 폴링한다", async () => {
    const { deps, events } = build({ diaryAppearsAtPoll: 1 }, only("diagnostics-try-write"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("passed");
    expect(events.indexOf("announce:3")).toBeLessThan(events.indexOf("wait-enter"));
    expect(events.indexOf("wait-enter")).toBeLessThan(events.indexOf("poll"));
  });

  it("FR-010 — Enter가 없으면 failed-operation-timeout (폴링하지 않는다)", async () => {
    const { deps, events } = build({ enter: "timeout" }, only("diagnostics-try-write"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("failed");
    expect(result.perFlow[0].outcome).toBe("failed-operation-timeout");
    expect(events).not.toContain("poll");
  });

  it("FR-010 — Enter 뒤 10분 안에 파일이 없으면 failed-generation-timeout (조작 초과와 다른 값)", async () => {
    const { deps, events } = build({}, only("diagnostics-try-write"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("failed");
    expect(result.perFlow[0].outcome).toBe("failed-generation-timeout");
    expect(result.reason).toContain("diagnostics-try-write");
    // 10분 / 5초 = 120번 안팎
    const polls = events.filter((e) => e === "poll").length;
    expect(polls).toBeGreaterThanOrEqual(120);
    expect(polls).toBeLessThanOrEqual(122);
  });

  it("표준 입력이 터미널이 아니면 사람 흐름은 aborted", async () => {
    const { deps } = build({ enter: "no-tty" }, only("diagnostics-try-write"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("터미널");
  });

  it("L2-7 — 실패 기록에 새 항목이 있으면 failed-write-failure이고 갈래 이름을 말한다 (본문은 읽지 않는다)", async () => {
    const { deps } = build(
      { diaryAppearsAtPoll: 1, failureItems: ["timed-out"] },
      only("open-app-writes"),
    );
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("failed");
    expect(result.perFlow[0].outcome).toBe("failed-write-failure");
    expect(result.reason).toContain("timed-out");
  });

  it("L2-7 — 일기 파일이 깨졌거나 날짜가 다르면 failed-invalid-diary", async () => {
    for (const diaryText of [
      "not json",
      JSON.stringify({ date: "1999-01-01", text: "x" }),
      JSON.stringify({ date: "x", text: "" }),
    ]) {
      const { deps } = build({ diaryAppearsAtPoll: 1, diaryText }, only("open-app-writes"));
      const result = await runLayer2Ios(deps);
      expect(result.perFlow[0].outcome).toBe("failed-invalid-diary");
    }
  });

  it("L2-8 — 흐름 끝마다 기준 상태로 되돌리고 끝에도 한 번 되돌린다 (flush 호출)", async () => {
    const { deps, events } = build({ diaryAppearsAtPoll: 1 }, only("open-app-writes"));
    await runLayer2Ios(deps);
    expect(events.filter((e) => e === "flush").length).toBeGreaterThanOrEqual(3);
    expect(events[events.length - 1]).not.toBe("launch");
  });

  it("B1 — 시딩 표식은 기기마다 따로다 (UDID로 묻고 UDID로 적는다)", async () => {
    const { deps, events } = build({ diaryAppearsAtPoll: 1 }, only("open-app-writes"));
    await runLayer2Ios(deps);
    expect(events).toContain(`seeded-days:${UDID}`);
    expect(events.some((e) => e.startsWith(`mark:${UDID}:`))).toBe(true);
  });

  it("리뷰 1 — 지우기가 안 돼 쓸 날의 일기가 남아 있으면 앱을 띄우기 전에 aborted (이 실행이 쓰지 않은 파일로 통과하지 않는다)", async () => {
    const { deps, events } = build(
      { staleDiary: true, diaryAppearsAtPoll: 1 },
      only("open-app-writes"),
    );
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("aborted");
    expect(result.reason).toMatch(/지우지 못한|이미 있다/);
    expect(events).not.toContain("launch");
  });

  it("리뷰 2 — 실패 기록이 있는데 가져오지 못하면 「실패 없음」이 아니라 failed다", async () => {
    const { deps } = build(
      { diaryAppearsAtPoll: 1, unreadableFailure: true },
      only("open-app-writes"),
    );
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("failed");
    expect(result.perFlow[0].outcome).toBe("failed-write-failure");
    expect(result.perFlow[0].detail).toContain("읽지 못했다");
  });

  it("리뷰 3 — 일기 폴더 목록이 연속으로 읽히지 않으면 생성 시간 초과가 아니라 기기에 닿지 못한다고 aborted", async () => {
    const { deps, events } = build({ pollErrors: true }, only("open-app-writes"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("device locked");
    expect(events.filter((e) => e === "poll")).toHaveLength(0);
  });

  it("리뷰 4 — 중간에 aborted로 끝나도 기준 상태로 되돌린다 (자동 쓰기 켜짐이 남지 않게)", async () => {
    const { deps, events } = build({ enter: "no-tty" }, only("first-run-auto-diary"));
    const result = await runLayer2Ios(deps);
    expect(result.status).toBe("aborted");
    const lastLaunch = events.lastIndexOf("launch");
    // 앱을 띄운 뒤 되돌리는 flush가 한 번 더 있다
    expect(events.slice(lastLaunch).includes("flush")).toBe(true);
  });
});

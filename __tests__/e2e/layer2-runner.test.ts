import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BASELINE } from "../../scripts/layer1/baseline";
import type { Layer2Device, Outcome } from "../../scripts/layer1/device";
import { LAYER2_FLOWS } from "../../scripts/layer2/flows";
import { runLayer2 } from "../../scripts/layer2/runner";

/**
 * 073 — 층 2 실행기의 단계와 보고 (기기 대역).
 *
 * 계약: specs/073-e2e-layer2-stale-flows/contracts/layer2-runner.md (T-1~T-8)
 *
 * 대역은 호출을 순서대로 기록한다. 층 1(069)과 달리 흐름마다 기준 상태를 다시 만들고 흐름 하나씩 maestro를 부른다.
 */

const SERIAL = "TESTSERIAL";
const ok: Outcome = { ok: true, value: undefined };
const NOW = new Date(2026, 9, 10, 14, 30);
const TODAY = "2026-10-10";
const YESTERDAY = "2026-10-09";
const DAY_BEFORE = "2026-10-08";

type MaestroResult = { status: number | null; failed: string[] | null };
type Overrides = Partial<{
  devices: string[] | null;
  maestro: boolean;
  models: string[];
  /** 흐름 파일 → 결과들(재시도용으로 여러 개). 없으면 통과 */
  results: Record<string, MaestroResult[]>;
  pull: Outcome;
}>;

function fakeDevice(over: Overrides = {}) {
  const calls: string[] = [];
  const attempts: Record<string, number> = {};
  const device: Layer2Device = {
    listDevices: () => (over.devices === undefined ? [SERIAL] : over.devices),
    hasMaestro: () => over.maestro ?? true,
    probe: () => ok,
    listDir: (_s, relative) => {
      const map: Record<string, string[]> = {
        models: over.models ?? ["a1.bin", "v1.bin", "v2.bin"],
        diary: [],
        "vision-cache": [],
      };
      return { ok: true, value: map[relative] ?? [] };
    },
    forceStop: () => {
      calls.push("forceStop");
      return ok;
    },
    ensureDirs: () => ok,
    writeFile: (_s, relative, content) => {
      calls.push(`write:${relative}${relative.startsWith("preferences/") ? `=${content}` : ""}`);
      return ok;
    },
    copyFile: (_s, relative) => {
      calls.push(`copy:${relative}`);
      return ok;
    },
    removeFile: (_s, relative) => {
      calls.push(`remove:${relative}`);
      return ok;
    },
    pullFile: (_s, relative, local) => {
      calls.push(`pull:${relative}->${local.replace(/\\/g, "/")}`);
      return over.pull ?? ok;
    },
    runMaestro: (flows, env) => {
      const flow = flows[0];
      attempts[flow] = (attempts[flow] ?? 0) + 1;
      calls.push(`maestro:${flows.join(",")}|${JSON.stringify(env ?? {})}`);
      const list = over.results?.[flow];
      return list === undefined
        ? { status: 0, failed: null }
        : (list[attempts[flow] - 1] ?? list[list.length - 1]);
    },
  };
  return { device, calls };
}

const run = (over: Overrides = {}) => {
  const { device, calls } = fakeDevice(over);
  const lines: string[] = [];
  const result = runLayer2({
    device,
    flows: LAYER2_FLOWS,
    now: NOW,
    collectDirectory: "COLLECT",
    log: (l) => lines.push(l),
  });
  return { result, calls, lines };
};

const maestroCalls = (calls: string[]) => calls.filter((c) => c.startsWith("maestro:"));

describe("층 2 실행기 (073)", () => {
  it("T-0 — 안내 한 줄을 출력하고 확인 질문은 없다 (L2-0)", () => {
    const { lines } = run();
    expect(lines[0]).toContain("전용 테스트 기기");
    expect(lines.join("\n")).not.toMatch(/\(y\/n\)/i);
  });

  it.each([
    ["adb 없음", { devices: null }],
    ["기기 없음", { devices: [] }],
    ["Maestro 없음", { maestro: false }],
  ] as [string, Overrides][])("T-1 — %s는 skipped이고 기기를 건드리지 않는다", (_n, over) => {
    const { result, calls } = run(over);
    expect(result.status).toBe("skipped");
    expect(calls.filter((c) => /^(write|remove|copy|maestro|forceStop)/.test(c))).toEqual([]);
  });

  it("T-1b — 기기가 둘이면 aborted (임의로 고르지 않는다)", () => {
    const { result, calls } = run({ devices: ["A", "B"] });
    expect(result.status).toBe("aborted");
    expect(calls).toEqual([]);
  });

  it("T-2 — 모델이 없으면 aborted이고 흐름을 하나도 돌리지 않는다", () => {
    const { result, calls } = run({ models: ["v1.bin"] });
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("모델");
    expect(maestroCalls(calls)).toEqual([]);
    expect(calls.some((c) => /^(write|remove|copy):/.test(c))).toBe(false);
  });

  it("T-3 — 흐름 넷이 각각 기준 상태를 다시 만든 뒤 흐름 하나씩 돈다", () => {
    const { result, calls } = run();
    expect(result.status).toBe("passed");
    const maestro = maestroCalls(calls);
    expect(maestro.map((c) => c.slice("maestro:".length).split("|")[0])).toEqual(
      LAYER2_FLOWS.map((f) => f.file),
    );
    // 각 maestro 앞에는 (앞 maestro 이후) 앱 종료가 있다
    let stopsSinceLast = 0;
    for (const c of calls) {
      if (c === "forceStop") stopsSinceLast += 1;
      if (c.startsWith("maestro:")) {
        expect(stopsSinceLast).toBeGreaterThanOrEqual(1);
        stopsSinceLast = 0;
      }
    }
    // 설정 기준값(write)이 매 흐름마다 적용된다
    const onboardingWrites = calls.filter((c) => c.startsWith("write:preferences/onboarding.json"));
    expect(onboardingWrites.length).toBeGreaterThanOrEqual(LAYER2_FLOWS.length);
  });

  it("T-3b — 흐름마다 TODAY·YESTERDAY 값을 -e로 넘긴다", () => {
    const { calls } = run();
    const first = maestroCalls(calls)[0];
    expect(first).toContain(`"TODAY":"${TODAY}"`);
    expect(first).toContain(`"YESTERDAY":"${YESTERDAY}"`);
  });

  it("T-3c — absentDays에 든 날의 일기는 심지 않고 나머지는 심는다", () => {
    const { calls } = run();
    const days = { today: TODAY, yesterday: YESTERDAY, "day-before": DAY_BEFORE } as const;
    for (const flow of LAYER2_FLOWS) {
      const index = calls.findIndex((c) => c.startsWith(`maestro:${flow.file}|`));
      const before = calls.slice(0, index);
      const planted = before
        .slice(before.lastIndexOf("forceStop"))
        .filter((c) => c.startsWith("write:diary/"));
      for (const absent of flow.absentDays)
        expect(planted).not.toContain(`write:diary/${days[absent]}.json`);
      for (const key of Object.keys(days) as (keyof typeof days)[]) {
        if (!flow.absentDays.includes(key))
          expect(planted).toContain(`write:diary/${days[key]}.json`);
      }
    }
  });

  it("T-3d — 설정 덮어쓰기: 자동 쓰기 흐름은 켜짐+지금 시, 첫 실행 흐름은 온보딩 되돌림", () => {
    const { calls } = run();
    expect(
      calls.some((c) =>
        c.startsWith('write:preferences/auto-diary.json={"enabled":true,"targetHour":14}'),
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c) => c.startsWith("write:preferences/onboarding.json") && c.includes('"completed":false'),
      ),
    ).toBe(true);
  });

  it("T-4 — 한 흐름이 실패해도 나머지를 돌리고 전체는 failed, 흐름별 상태를 말한다", () => {
    const second = LAYER2_FLOWS[1].file;
    const { result, calls } = run({ results: { [second]: [{ status: 1, failed: [second] }] } });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain(second);
    expect(maestroCalls(calls)).toHaveLength(LAYER2_FLOWS.length);
    expect(result.perFlow.map((f) => f.status)).toEqual(
      LAYER2_FLOWS.map((f) => (f.file === second ? "failed" : "passed")),
    );
  });

  it("T-5 — 보고서 없이 실패한 흐름(기기 서버 죽음)은 한 번만 다시 돈다", () => {
    const first = LAYER2_FLOWS[0].file;
    const { result, calls } = run({
      results: {
        [first]: [
          { status: 1, failed: null },
          { status: 0, failed: null },
        ],
      },
    });
    expect(result.status).toBe("passed");
    expect(calls.filter((c) => c.startsWith(`maestro:${first}|`))).toHaveLength(2);
  });

  it("T-5b — 다시 돌려도 보고서 없이 실패하면 failed (무한 재시도 없음)", () => {
    const first = LAYER2_FLOWS[0].file;
    const { result, calls } = run({ results: { [first]: [{ status: 1, failed: null }] } });
    expect(result.status).toBe("failed");
    expect(calls.filter((c) => c.startsWith(`maestro:${first}|`))).toHaveLength(2);
  });

  it("T-5c — 흐름이 진짜로 실패(보고서에 이름)하면 다시 돌리지 않는다", () => {
    const first = LAYER2_FLOWS[0].file;
    const { calls } = run({ results: { [first]: [{ status: 1, failed: [first] }] } });
    expect(calls.filter((c) => c.startsWith(`maestro:${first}|`))).toHaveLength(1);
  });

  it("T-6 — 일기 가져오기가 실패해도 판정은 passed다 (출력일 뿐)", () => {
    const { result, lines } = run({ pull: { ok: false, detail: "pull failed" } });
    expect(result.status).toBe("passed");
    expect(lines.join("\n")).toContain("pull failed");
  });

  it("T-6b — 흐름이 쓴 날의 일기를 수집 폴더로 가져온다", () => {
    const { calls, result } = run();
    const pulls = calls.filter((c) => c.startsWith("pull:"));
    expect(pulls).toHaveLength(LAYER2_FLOWS.length);
    for (const flow of LAYER2_FLOWS) {
      const day = flow.writtenDay === "today" ? TODAY : YESTERDAY;
      expect(pulls.some((p) => p.startsWith(`pull:diary/${day}.json->COLLECT/`))).toBe(true);
    }
    expect(result.perFlow.every((f) => f.collected !== undefined)).toBe(true);
  });

  it("T-6c — 실패한 흐름은 일기를 가져오지 않는다", () => {
    const first = LAYER2_FLOWS[0].file;
    const { calls } = run({ results: { [first]: [{ status: 1, failed: [first] }] } });
    expect(calls.filter((c) => c.startsWith("pull:"))).toHaveLength(LAYER2_FLOWS.length - 1);
  });

  it("T-7 — 마지막 흐름 뒤 기준 상태를 한 번 더 만든다", () => {
    const { calls } = run();
    const lastMaestro = calls.map((c) => c.startsWith("maestro:")).lastIndexOf(true);
    const after = calls.slice(lastMaestro + 1);
    expect(after).toContain("forceStop");
    for (const e of BASELINE.filter((b) => b.action === "write")) {
      expect(after.some((c) => c.startsWith(`write:preferences/${e.file}=`))).toBe(true);
    }
    expect(after.some((c) => c.startsWith("write:diary/"))).toBe(true);
  });

  it("T-8 — 모델 폴더에는 쓰기·삭제 호출이 없다", () => {
    const { calls } = run();
    expect(calls.filter((c) => /^(write|remove|copy):models/.test(c))).toEqual([]);
  });
});

describe("층 2 흐름 표 (073)", () => {
  it("F-1 — 표본의 1일 전은 사진이 있는 날이다 (쓰기 흐름이 사진을 읽는 경로를 탄다)", () => {
    const source = readFileSync(join(process.cwd(), "docs", "e2e", "sample-table.md"), "utf8");
    const row = source.split(/\r?\n/).find((line) => /^\|\s*1\s*\|/.test(line));
    expect(row).toBeDefined();
    expect(Number(row!.split("|")[3].trim())).toBeGreaterThanOrEqual(1);
  });

  it("F-2 — 흐름 표는 파일마다 하나이고 .maestro/layer2-*.yml이다", () => {
    const files = LAYER2_FLOWS.map((f) => f.file);
    expect(new Set(files).size).toBe(files.length);
    expect(files).toHaveLength(4);
    for (const f of files) expect(f).toMatch(/^\.maestro\/layer2-[a-z0-9-]+\.yml$/);
  });
});

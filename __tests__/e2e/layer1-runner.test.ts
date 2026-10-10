import { BASELINE } from "../../scripts/layer1/baseline";
import type { Layer1Device, Outcome } from "../../scripts/layer1/device";
import { DEDICATED_DEVICE_NOTICE, runLayer1 } from "../../scripts/layer1/runner";

/**
 * 069 — 층 1 실행기의 단계와 보고 (기기 대역).
 *
 * 계약: specs/069-e2e-layer1-screen-flows/contracts/layer1-runner.md
 *
 * 대역은 호출을 순서대로 기록한다. `Layer1Device`에 `pm clear`·설치 같은 메서드가 아예 없다는 것이 I-1의 한 겹이고,
 * 소스에 그 말이 없다는 것은 layer1-source-contract.test.ts가 잠근다.
 */

const SERIAL = "TESTSERIAL";
const ok: Outcome = { ok: true, value: undefined };

type Overrides = Partial<{
  devices: string[] | null;
  maestro: boolean;
  probe: Outcome;
  models: string[];
  diary: string[];
  cache: string[];
  maestroResult: { status: number | null; failed: string[] | null };
}>;

function fakeDevice(over: Overrides = {}) {
  const calls: string[] = [];
  const device: Layer1Device = {
    listDevices: () => (over.devices === undefined ? [SERIAL] : over.devices),
    hasMaestro: () => over.maestro ?? true,
    probe: () => {
      calls.push("probe");
      return over.probe ?? ok;
    },
    listDir: (_s, relative) => {
      calls.push(`list:${relative}`);
      const map: Record<string, string[]> = {
        models: over.models ?? ["a1.bin", "v1.bin", "v2.bin"],
        diary: over.diary ?? ["2026-10-01.json", "2026-10-02.json.writing", "notes.txt"],
        "vision-cache": over.cache ?? ["old-1.jpg", "old-2.jpg"],
      };
      return { ok: true, value: map[relative] ?? [] };
    },
    forceStop: () => {
      calls.push("forceStop");
      return ok;
    },
    ensureDirs: () => {
      calls.push("ensureDirs");
      return ok;
    },
    writeFile: (_s, relative) => {
      calls.push(`write:${relative}`);
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
    runMaestro: (flows) => {
      calls.push(`maestro:${flows.join(",")}`);
      return over.maestroResult ?? { status: 0, failed: null };
    },
  };
  return { device, calls };
}

const NOW = new Date(2026, 9, 10, 14, 30);
const FLOWS = [".maestro/restart-persistence.yml"];
const run = (over: Overrides = {}) => {
  const { device, calls } = fakeDevice(over);
  const lines: string[] = [];
  const result = runLayer1({ device, flows: FLOWS, now: NOW, log: (l) => lines.push(l) });
  return { result, calls, lines };
};

describe("층 1 실행기 (069)", () => {
  it("R1 — 안내 한 줄을 출력한다 (L0, 확인 질문 없음)", () => {
    const { lines } = run();
    expect(lines[0]).toContain(DEDICATED_DEVICE_NOTICE);
    expect(lines.join("\n")).not.toMatch(/\(y\/n\)/i);
  });

  it.each([
    ["adb 없음", { devices: null }],
    ["기기 없음", { devices: [] }],
    ["Maestro 없음", { maestro: false }],
  ] as [string, Overrides][])(
    "R2 — %s는 skipped이고 기기를 건드리지 않는다 (통과 아님)",
    (_n, over) => {
      const { result, calls } = run(over);
      expect(result.status).toBe("skipped");
      expect(result.reason).toBeTruthy();
      expect(calls.filter((c) => /^(write|remove|copy):/.test(c))).toEqual([]);
    },
  );

  it("R3 — run-as가 안 되면 aborted이고 이유를 말한다", () => {
    const { result, calls } = run({ probe: { ok: false, detail: "package not debuggable" } });
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("package not debuggable");
    expect(calls).not.toContain("forceStop");
  });

  it("R4 — 모델 파일이 없으면 aborted이고 아무것도 바꾸지 않는다", () => {
    const { result, calls } = run({ models: ["v1.bin"] });
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("모델");
    expect(calls.some((c) => /^(write|remove|copy|maestro):/.test(c))).toBe(false);
    expect(calls).not.toContain("forceStop");
  });

  it("R5 — 정상이면 앱 종료(L4)가 파일 변경(L5·L6)보다 먼저다 (I-7)", () => {
    const { result, calls } = run();
    expect(result.status).toBe("passed");
    const stop = calls.indexOf("forceStop");
    const firstChange = calls.findIndex((c) => /^(write|remove|copy):/.test(c));
    expect(stop).toBeGreaterThanOrEqual(0);
    expect(stop).toBeLessThan(firstChange);
  });

  it("R6 — 설정 기준값: write·delete는 적용하고 keep은 건드리지 않는다", () => {
    const { calls } = run();
    for (const e of BASELINE) {
      const path = `preferences/${e.file}`;
      if (e.action === "write") expect(calls).toContain(`write:${path}`);
      if (e.action === "delete") expect(calls).toContain(`remove:${path}`);
      if (e.action === "keep") {
        expect(calls).not.toContain(`write:${path}`);
        expect(calls).not.toContain(`remove:${path}`);
      }
    }
  });

  it("R7 — 일기 폴더는 YYYY-MM-DD.json(.writing)만 지우고 그 밖의 파일은 그대로다", () => {
    const { calls } = run();
    expect(calls).toContain("remove:diary/2026-10-01.json");
    expect(calls).toContain("remove:diary/2026-10-02.json.writing");
    expect(calls).not.toContain("remove:diary/notes.txt");
  });

  it("R8 — 픽스처 일기 3편을 심고 사진 사본 폴더를 비운 뒤 5개로 채운다", () => {
    const { calls } = run();
    expect(calls.filter((c) => c.startsWith("write:diary/"))).toHaveLength(3);
    expect(calls).toContain("remove:vision-cache/old-1.jpg");
    expect(calls).toContain("remove:vision-cache/old-2.jpg");
    expect(calls.filter((c) => c.startsWith("copy:vision-cache/"))).toHaveLength(5);
  });

  it("R9 — 모델 폴더에는 쓰기·삭제 호출이 없다 (I-1)", () => {
    const { calls } = run();
    expect(calls.filter((c) => /^(write|remove|copy):models/.test(c))).toEqual([]);
  });

  it("R10 — 흐름은 한 번의 maestro 실행으로, 기준 상태를 만든 뒤에 돈다", () => {
    const { calls } = run();
    const maestro = calls.filter((c) => c.startsWith("maestro:"));
    expect(maestro).toEqual([`maestro:${FLOWS.join(",")}`]);
    expect(calls.indexOf(maestro[0])).toBe(calls.length - 1);
  });

  it("R11 — 흐름이 실패하면 failed이고 실패한 흐름 이름을 말한다", () => {
    const { result } = run({ maestroResult: { status: 1, failed: ["restart-persistence"] } });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("restart-persistence");
  });

  it("R12 — 종료 코드만 있고 이름을 모르면 알 수 없음으로 말한다", () => {
    const { result } = run({ maestroResult: { status: 2, failed: null } });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("알 수 없음");
  });
});

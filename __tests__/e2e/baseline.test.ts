import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { BASELINE, NON_PREFERENCE_JSON } from "../../scripts/layer1/baseline";

/**
 * 069 — 층 1 기준 상태 (설정 파일).
 *
 * 계약: specs/069-e2e-layer1-screen-flows/contracts/baseline-state.md
 *
 * G-1 드리프트 가드: 앱이 새 설정 파일을 읽기 시작하면 이 표에 한 줄을 더하게 만든다. 표가 낡으면 층 1이 「깨끗한 기준 상태」라고
 * 믿는 기기에 지난 실행의 설정이 남는다 — 오류 없이 다른 갈래를 타는 조용한 실패다.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** 주석을 걷는다 — 이 저장소의 주석은 파일 이름을 설명으로 적는다 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const entry = (file: string) => BASELINE.find((e) => e.file === file);

describe("층 1 기준 상태 (069)", () => {
  it("G-1 — 앱 소스가 읽는 설정 파일 이름은 모두 기준 표에 있거나 설정이 아니라고 적혀 있다", () => {
    const found = new Set<string>();
    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      const code = stripComments(readFileSync(path, "utf8"));
      for (const m of code.matchAll(/["'`]([a-z][a-z-]*\.json)["'`]/g)) found.add(m[1]);
    }
    expect(found.size).toBeGreaterThan(5); // 스캔이 실제로 파일을 읽었다
    const known = new Set([
      ...BASELINE.map((e) => e.file),
      ...NON_PREFERENCE_JSON.map((e) => e.file),
    ]);
    expect([...found].filter((f) => !known.has(f)).sort()).toEqual([]);
  });

  it("G-2 — 표의 파일 이름이 중복되지 않는다", () => {
    const names = BASELINE.map((e) => e.file);
    expect(new Set(names).size).toBe(names.length);
  });

  it("B1 — 온보딩은 네 필드 모두 true로 써서 첫 실행 게이트를 지난다", () => {
    const e = entry("onboarding.json");
    expect(e?.action).toBe("write");
    expect(JSON.parse(e?.content ?? "{}")).toEqual({
      completed: true,
      batteryNoticeShown: true,
      welcomeShown: true,
      downloadConsented: true,
    });
  });

  it("B2 — 자동으로 쓰기는 꺼짐으로 못 박는다 (생성이 시작되지 않게)", () => {
    const e = entry("auto-diary.json");
    expect(e?.action).toBe("write");
    expect(JSON.parse(e?.content ?? "{}")).toEqual({ enabled: false, targetHour: 22 });
  });

  it.each([
    "developer-menu.json",
    "simulation.json",
    "auto-write-skipped.json",
    "notified.json",
    "write-failures.json",
    "character-names.json",
    "geocoding-setting.json",
  ])("B3 — %s는 삭제한다", (file) => {
    expect(entry(file)?.action).toBe("delete");
  });

  it("B4 — 고른 캐릭터는 건드리지 않는다 (이유가 적혀 있다)", () => {
    const e = entry("selected-character.json");
    expect(e?.action).toBe("keep");
    expect((e?.reason ?? "").length).toBeGreaterThan(0);
  });

  it("B5 — write 항목은 JSON으로 읽히고 delete·keep 항목은 내용이 없다", () => {
    for (const e of BASELINE) {
      if (e.action === "write") expect(() => JSON.parse(e.content ?? "")).not.toThrow();
      else expect(e.content).toBeUndefined();
    }
  });
});

/**
 * 하루 경계가 한 파일에만 있는가 — 소스 계약 (049).
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md DB10·DB11·DB13
 *
 * **왜 소스를 읽는가**: 049가 경계를 04:00에서 자정으로 옮기며 `vision/select.ts`에 04:00이
 * 복제돼 있던 것을 찾았다(`getHours() - 4`). 경계만 바꾸고 이런 복제를 놓치면 **오류 없이
 * 네 시간 어긋난 채 돈다** — 값 테스트는 그 파일이 무엇을 복제했는지 모른다. 그래서 「시를
 * 빼거나 더해 하루 기준을 옮기는 자리」를 소스에서 직접 센다.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");

function strip(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const FILES = [...walk(join(ROOT, "src")), join(ROOT, "App.tsx")].map((full) => ({
  path: relative(ROOT, full).replace(/\\/g, "/"),
  code: strip(readFileSync(full, "utf8")),
}));

const read = (path: string) => strip(readFileSync(join(ROOT, path), "utf8"));

describe("DB10 — 사라진 선언", () => {
  const source = read("src/config/day-boundary.ts");
  it.each(["writableAt", "stripDays", "STRIP_DAY_COUNT", "DAY_STARTS_AT_HOUR"])(
    "%s가 선언되지 않는다",
    (name) => {
      expect(source).not.toMatch(new RegExp(`(function|const)\\s+${name}\\b`));
    },
  );
});

describe("DB11 — 하루 기준을 옮기는 시(時) 계산은 경계 파일 밖에 없다", () => {
  it.each(FILES.map((f) => [f.path, f.code]))("%s에 getHours() ± 계산이 없다", (path, code) => {
    if (path === "src/config/day-boundary.ts") return;
    expect(code).not.toMatch(/getHours\(\)\s*[-+]/);
  });

  const ALLOWED = new Set([
    "src/config/day-boundary.ts",
    "src/diary/prompt.ts", // 사진 시각 표시
    "src/schedule/decision.ts", // 목표 시각 창
    "src/vision/select.ts", // 자정 기준 하루 안의 분
  ]);

  it("getHours()는 허용 목록에서만 부른다", () => {
    const offenders = FILES.filter((f) => f.code.includes("getHours()") && !ALLOWED.has(f.path));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});

describe("DB13 — FR-021 사흘 범위의 소비처", () => {
  it("백그라운드 태스크가 selectableDays를 부른다", () => {
    expect(read("src/schedule/task.ts")).toMatch(/selectableDays\(now\)/);
  });

  it("App의 사진 있는 날 탐색과 canPrepare가 selectableDays를 부른다", () => {
    const app = read("App.tsx");
    expect(app.match(/selectableDays\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(app).toMatch(/canPrepare=\{/);
  });

  it("화면 상태(state.ts)는 selectableDays를 부르지 않는다 — 화면 범위와 분리", () => {
    expect(read("src/app/state.ts")).not.toContain("selectableDays");
  });
});

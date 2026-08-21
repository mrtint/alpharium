/**
 * 결과의 모양 — 오독할 수 없어야 한다 (FR-018a·018b·018c).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/cli.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **⚠️ 이 파일은 선언을 `readFileSync`로 직접 읽는다.**
 *
 * 007에서 `AppScreen`에 `stage: string`을 주입해 보니 **jest는 38개 전부 통과했다** —
 * 타입은 지워지므로 런타임 검사가 보지 못한다. 잡은 것은 `tsc`뿐이었고 그것은
 * `npm run lint`에 있다.
 *
 * 008이 그 교훈으로 「선언을 직접 읽는」 방식을 세웠고, 여기서도 같이 한다.
 * **`npm test`만 돌리는 사람에게도 방어가 참이어야 한다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describeRun, failure, EXIT_DIRTY, EXIT_FAILED, EXIT_OK } from "../../scripts/seed/output";
import type { RunResult } from "../../scripts/seed/output";

const outputSource = readFileSync(join(process.cwd(), "scripts", "seed", "output.ts"), "utf8");

/** `RunResult`의 선언 부분만 잘라 낸다. 주석은 걷어낸다(008의 교훈) */
function runResultDeclaration(): string {
  const start = outputSource.indexOf("export type RunResult");
  expect(start).toBeGreaterThanOrEqual(0);

  const end = outputSource.indexOf("export const EXIT_OK", start);
  expect(end).toBeGreaterThan(start);

  const slice = outputSource.slice(start, end);

  // 잘라 낸 것이 정말 RunResult인지 확인한다 — 008에서 슬라이스가 조용히
  // 어긋날 뻔한 일이 있었다. 어긋나도 검사는 통과하는 종류의 결함이다.
  expect(slice).toContain("ok: true");
  expect(slice).toContain("ok: false");

  return slice
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ""))
    .filter((line) => !/^\s*\*/.test(line) && !/^\s*\/\*/.test(line))
    .join("\n");
}

describe("결과에 지표를 담지 않는다 (헌법 원칙 IV)", () => {
  /**
   * **자리가 없으면 담을 수 없다.**
   *
   * 007에서 `ActivityIndicator`에 진행률 파라미터가 없는 것이 원칙 IV의 방어가 됐던
   * 것과 같다. 여기서는 우리가 그 자리를 두지 않는 쪽을 고른다.
   */
  it.each([
    "elapsedMs",
    "durationMs",
    "tookMs",
    "speed",
    "rate",
    "bytesPerSecond",
    "score",
    "quality",
  ])("`%s` 자리가 없다", (forbidden) => {
    expect(runResultDeclaration()).not.toContain(forbidden);
  });

  /**
   * **도구는 생성된 일기를 읽지 않는다**(FR-022). 결과에 일기가 담길 자리도 없어야
   * 한다 — 담기면 다음 사람이 그것으로 채점을 시작한다.
   */
  it.each(["diary", "text", "content", "generated"])("`%s` 자리가 없다", (forbidden) => {
    expect(runResultDeclaration()).not.toContain(forbidden);
  });

  /** 있어야 하는 것 — 없으면 에이전트가 판단할 수 없다 */
  it.each(["ok", "day", "shape", "seeded", "withLocation", "existing", "reason", "detail"])(
    "`%s`는 있다",
    (needed) => {
      expect(runResultDeclaration()).toContain(needed);
    },
  );
});

describe("부분 성공을 성공으로 만들 수 없다 (FR-018c)", () => {
  /**
   * `ok: true`인 갈래에 「몇 장이 실패했나」를 담을 자리가 없다. 3장 중 2장이면
   * **실패이지 「2장 성공」이 아니다.**
   */
  it.each(["failed", "partial", "skipped", "errors"])(
    "성공 갈래에 `%s` 자리가 없다",
    (forbidden) => {
      const declaration = runResultDeclaration();
      const successPart = declaration.slice(0, declaration.indexOf("ok: false"));

      expect(successPart).not.toContain(forbidden);
    },
  );
});

describe("종료 코드가 셋으로 갈린다 (FR-018a)", () => {
  it("성공·실패·어긋남이 서로 다르다", () => {
    expect(new Set([EXIT_OK, EXIT_FAILED, EXIT_DIRTY]).size).toBe(3);
  });

  /**
   * **`EXIT_DIRTY`가 따로 있는 이유**: 에이전트가 다음에 할 일이 다르다. `1`이면
   * 다시 시도해도 되고, `2`면 `seed:clear`를 먼저 돌려야 한다. 하나로 뭉치면
   * 에이전트가 어긋난 기기 위에서 검증을 이어 간다.
   */
  it("성공은 0이다 — 셸의 관례", () => {
    expect(EXIT_OK).toBe(0);
  });
});

describe("사람이 읽는 문장", () => {
  const success = (over: Partial<Extract<RunResult, { ok: true }>> = {}): RunResult => ({
    ok: true,
    day: "2026-08-20",
    shape: "rich",
    seeded: 3,
    withLocation: 2,
    existing: 0,
    ...over,
  });

  it("심은 수와 좌표 수를 말한다", () => {
    const text = describeRun(success()).join("\n");

    expect(text).toContain("2026-08-20");
    expect(text).toContain("3장");
    expect(text).toContain("2장");
  });

  /** `empty` 모양은 심을 것이 없다 — 「0장을 심었다」는 이상하게 읽힌다 */
  it("사진 0장인 하루를 다르게 말한다", () => {
    expect(describeRun(success({ seeded: 0, withLocation: 0 })).join("\n")).toContain("0장인 하루");
  });

  /**
   * **★ 남은 것이 있으면 반드시 말한다**(FR-011b, 명확화 Q4).
   *
   * 자동으로 치우지 않기로 했으므로 **남은 것이 안 보이는 일이 없어야 한다.**
   * 008에서 받다 만 모델 셋이 기기에 남았고 아무도 몰랐던 것이 선례다.
   */
  it("남아 있던 것이 있으면 알리고 치우는 길을 준다", () => {
    const text = describeRun(success({ existing: 2 })).join("\n");

    expect(text).toContain("2장");
    expect(text).toContain("seed:clear");
  });

  it("남은 것이 없으면 그 말을 하지 않는다", () => {
    expect(describeRun(success({ existing: 0 })).join("\n")).not.toContain("seed:clear");
  });

  it("실패는 까닭을 말한다", () => {
    const text = describeRun(failure("day-out-of-range", "고를 수 있는 하루: 2026-08-20")).join(
      "\n",
    );

    expect(text).toContain("2026-08-20");
  });
});

describe("마지막 줄이 항상 JSON이다 (FR-018b)", () => {
  /**
   * **에이전트는 마지막 줄만 본다.** JSON을 먼저 찍고 뒤에 뭔가를 더 찍으면 읽지
   * 못한다 — `report()`가 그 순서를 강제한다.
   */
  it.each([
    [
      "성공",
      { ok: true, day: "2026-08-20", shape: "rich", seeded: 3, withLocation: 2, existing: 0 },
    ],
    ["실패", { ok: false, reason: "no-device", detail: "기기가 없다" }],
  ])("%s에서도 JSON 한 줄로 끝난다", (_label, result) => {
    const printed: string[] = [];
    const spy = jest.spyOn(console, "log").mockImplementation((line) => printed.push(String(line)));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { report } = require("../../scripts/seed/output");
    report(result, ["사람이 읽는 줄", "또 한 줄"]);

    spy.mockRestore();

    const last = printed[printed.length - 1];
    expect(() => JSON.parse(last)).not.toThrow();
    expect(JSON.parse(last)).toEqual(result);
    // 줄바꿈이 섞이면 「한 줄」이 아니다
    expect(last).not.toContain("\n");
  });
});

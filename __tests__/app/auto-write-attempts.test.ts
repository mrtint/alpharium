/**
 * 078 → 109 — 자동 쓰기 시도 기록. 109부터 최근 20건 한 파일이 아니라 **날짜별 장부**(`attempt-ledger/YYYY-MM-DD.json`)다.
 *
 * 계약: specs/109-attempt-ledger/contracts/ledger-file.md · day-summary.md
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ATTEMPT_OUTCOMES,
  ATTEMPT_PATHS,
  attemptDayOf,
  attemptOutcomeOf,
  loadAttemptSummaries,
  loadDayAttempts,
  recordAttemptEnd,
  recordAttemptExpired,
  recordAttemptStart,
  summarizeDay,
  summaryDays,
  type AutoWriteAttempt,
  type AutoWriteAttemptPort,
} from "../../src/app/auto-write-attempts";
import { dayOf } from "../../src/config/day-boundary";

/** 날마다 한 파일. 줄 수가 많은 날을 위해 임의 길이를 받는다. */
function memoryPort(initial: Record<string, string> = {}): AutoWriteAttemptPort & {
  files: Map<string, string>;
} {
  const files = new Map<string, string>(Object.entries(initial));
  return {
    files,
    async read(day) {
      return files.get(day) ?? null;
    },
    async write(day, serialized) {
      files.set(day, serialized);
    },
    async days() {
      return [...files.keys()];
    },
  };
}

// 기기 시간대와 무관하게 같은 날이 되도록 현지 시각으로 만든다.
const AT = new Date(2026, 9, 13, 22, 12, 3, 456);
const LATER = new Date(2026, 9, 13, 23, 0, 0, 0);
const DAY = dayOf(AT);

function lines(port: ReturnType<typeof memoryPort>, day = DAY): AutoWriteAttempt[] {
  const raw = port.files.get(day);
  if (raw === undefined) return [];
  return (JSON.parse(raw) as { items: { at: string; path: string; outcome: string }[] }).items.map(
    (item) => ({ ...item, at: new Date(item.at) }) as AutoWriteAttempt,
  );
}

describe("AT1 — 갈래는 사람이 못 박은 상수다", () => {
  it("경로 셋, 결과 열다섯 — 순서까지 (080: 사용자가 그만둠, 090: 시간 예산이 끝남)", () => {
    expect(ATTEMPT_PATHS).toEqual(["background", "app-open", "manual"]);
    expect(ATTEMPT_OUTCOMES).toEqual([
      "started",
      "simulation",
      "disabled",
      "not-near-target",
      "catch-up-spent",
      "all-written",
      "no-photo-access",
      "no-material",
      "no-character",
      "write",
      "already-running",
      "cancelled",
      "ran",
      "failed",
      "expired",
    ]);
    expect(ATTEMPT_OUTCOMES).toHaveLength(15);
  });
});

describe("T002 — 장부 파일: 날 하나에 { items }, 필드는 여섯뿐", () => {
  it("시작 줄이 그 날 파일에 직렬화된다 (at은 ISO)", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    expect([...port.files.keys()]).toEqual([DAY]);
    expect(JSON.parse(port.files.get(DAY) ?? "")).toEqual({
      items: [{ at: AT.toISOString(), path: "background", outcome: "started" }],
    });
    expect(await loadDayAttempts(port, DAY)).toEqual([
      { at: AT, path: "background", outcome: "started" },
    ]);
  });

  it("옵션 필드 launch·wake·day를 싣고 읽으면 돌아온다 (이 여섯뿐)", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT, "background", "battery");
    await recordAttemptEnd(port, "background", AT, "ran", "2026-10-12");
    const [line] = (JSON.parse(port.files.get(DAY) ?? "") as { items: object[] }).items;
    expect(Object.keys(line ?? {}).sort()).toEqual(
      ["at", "day", "launch", "outcome", "path", "wake"].sort(),
    );
    expect(await loadDayAttempts(port, DAY)).toEqual([
      {
        at: AT,
        path: "background",
        outcome: "ran",
        launch: "background",
        wake: "battery",
        day: "2026-10-12",
      },
    ]);
  });

  it.each([
    ["JSON 아님", "{"],
    ["items가 배열 아님", JSON.stringify({ items: 3 })],
    ["객체 아님", "7"],
  ])("깨진 파일(%s) → 그 날만 빈 값", async (_name, raw) => {
    expect(await loadDayAttempts(memoryPort({ [DAY]: raw }), DAY)).toEqual([]);
  });

  it("모르는 갈래·깨진 시각·두 값 밖의 launch/wake/day는 건너뛰거나 필드 없이 읽는다", async () => {
    const port = memoryPort({
      [DAY]: JSON.stringify({
        items: [
          { at: AT.toISOString(), path: "background", outcome: "ran" },
          { at: AT.toISOString(), path: "cron", outcome: "ran" },
          { at: AT.toISOString(), path: "background", outcome: "took-5s" },
          { at: "어제", path: "background", outcome: "ran" },
          { at: AT.toISOString(), path: "background", outcome: "ran", launch: "inactive" },
          { at: AT.toISOString(), path: "background", outcome: "ran", wake: "solar" },
          { at: AT.toISOString(), path: "app-open", outcome: "write", day: "어제" },
          null,
        ],
      }),
    });
    const items = await loadDayAttempts(port, DAY);
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item).not.toHaveProperty("launch");
      expect(item).not.toHaveProperty("wake");
      expect(item).not.toHaveProperty("day");
    }
  });

  it("읽기 예외 → 빈 값", async () => {
    const broken: AutoWriteAttemptPort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
      days: () => Promise.reject(new Error("io")),
    };
    expect(await loadDayAttempts(broken, DAY)).toEqual([]);
  });
});

describe("T004 — 기록 규칙", () => {
  it("SC-001 — 15분 간격 백그라운드 시작·끝 30쌍이 30줄로 모두 남는다 (상한 없음)", async () => {
    const port = memoryPort();
    for (let n = 0; n < 30; n += 1) {
      const at = new Date(2026, 9, 13, 0, n * 15, 0, 0);
      await recordAttemptStart(port, "background", at, "background");
      await recordAttemptEnd(port, "background", at, "no-material");
    }
    const all = lines(port);
    expect(all).toHaveLength(30);
    expect(all.every((line) => line.outcome === "no-material")).toBe(true);
    // 시간순 — 오래된 줄이 앞
    expect(all[0]?.at.getTime()).toBeLessThan(all[29]?.at.getTime() ?? 0);
  });

  it("시작만 기록하면 started가 남는다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    expect(lines(port).map((l) => l.outcome)).toEqual(["started"]);
  });

  it("끝은 같은 at·path의 started를 결과로 바꾼다 — 줄 수가 늘지 않고 080 그만둠도 산다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptEnd(port, "background", AT, "ran");
    expect(lines(port).map((l) => l.outcome)).toEqual(["ran"]);
    await recordAttemptStart(port, "background", LATER);
    await recordAttemptEnd(port, "background", LATER, "cancelled");
    expect(lines(port).map((l) => l.outcome)).toEqual(["ran", "cancelled"]);
  });

  it("경로가 다르면 짝이 아니다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT);
    await recordAttemptEnd(port, "manual", AT, "ran");
    expect(lines(port).map((l) => [l.path, l.outcome])).toEqual([
      ["background", "started"],
      ["manual", "ran"],
    ]);
  });

  it("짝 없는 끝은 덧붙인다 (앱 열기는 시작 없이 끝만 쓴다)", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    expect(lines(port)).toEqual([{ at: AT, path: "app-open", outcome: "not-near-target" }]);
  });

  it("FR-004 — 앱 열기 끝이 마지막 줄과 경로·결과·day가 같으면 시각만 갱신한다", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "app-open", AT, "not-near-target");
    await recordAttemptEnd(port, "app-open", LATER, "not-near-target");
    expect(lines(port)).toEqual([{ at: LATER, path: "app-open", outcome: "not-near-target" }]);
  });

  it("앱 열기도 결과가 다르거나 day가 다르면 새 줄이다", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "app-open", AT, "write", "2026-10-24");
    await recordAttemptEnd(port, "app-open", LATER, "write", "2026-10-23");
    await recordAttemptEnd(port, "app-open", new Date(LATER.getTime() + 1000), "no-material");
    expect(lines(port).map((l) => l.outcome)).toEqual(["write", "write", "no-material"]);
  });

  it("백그라운드·수동 끝은 마지막 줄과 같아도 합치지 않는다", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "background", AT, "not-near-target");
    await recordAttemptEnd(port, "background", new Date(LATER.getTime() + 1000), "not-near-target");
    await recordAttemptEnd(port, "manual", new Date(LATER.getTime() + 2000), "not-near-target");
    await recordAttemptEnd(port, "manual", new Date(LATER.getTime() + 3000), "not-near-target");
    expect(lines(port)).toHaveLength(4);
  });

  it("합치기는 날 파일을 넘지 않는다 — 날마다 첫 줄이 남는다", async () => {
    const port = memoryPort();
    const next = new Date(2026, 9, 14, 0, 5, 0, 0);
    await recordAttemptEnd(port, "app-open", AT, "all-written");
    await recordAttemptEnd(port, "app-open", next, "all-written");
    expect(lines(port, dayOf(AT))).toHaveLength(1);
    expect(lines(port, dayOf(next))).toHaveLength(1);
  });

  it("FR-003 — 만료는 만료 시각의 날 파일에 따로 선 줄이고 시작 줄을 건드리지 않으며 합치지 않는다", async () => {
    const port = memoryPort();
    await recordAttemptStart(port, "background", AT, "background");
    await recordAttemptExpired(port, LATER);
    await recordAttemptExpired(port, new Date(LATER.getTime() + 1000));
    expect(lines(port).map((l) => l.outcome)).toEqual(["started", "expired", "expired"]);
    // 멈췄던 실행이 이어서 끝나면 시작 줄만 끝남으로 바뀐다 — 만료 줄도 그대로
    await recordAttemptEnd(port, "background", AT, "ran");
    expect(lines(port).map((l) => l.outcome)).toEqual(["ran", "expired", "expired"]);
  });

  it("만료 줄은 짝이 아니다 — 시작 줄이 없을 때 같은 at의 끝이 만료 줄을 덮지 않는다 (FR-003)", async () => {
    const port = memoryPort();
    await recordAttemptExpired(port, AT);
    await recordAttemptEnd(port, "background", AT, "ran");
    expect(lines(port).map((l) => l.outcome)).toEqual(["expired", "ran"]);
  });

  it("오늘보다 뒤 날짜 파일(시계 오류)은 요약 범위의 시작이 아니다", async () => {
    const port = memoryPort({ "2099-01-01": JSON.stringify({ items: [] }) });
    expect(await loadAttemptSummaries(port, AT)).toEqual([]);
    await recordAttemptEnd(port, "background", new Date(2026, 9, 13, 3, 0), "ran");
    const summaries = await loadAttemptSummaries(port, AT);
    expect(summaries.map((s) => s.day)).toEqual(["2026-10-13"]);
  });

  it("시나리오 4 — 자정 직전에 시작해 자정 뒤에 끝난 실행은 시작 날 파일에서 닫힌다 (끝은 같은 at로 부른다)", async () => {
    const port = memoryPort();
    const beforeMidnight = new Date(2026, 9, 13, 23, 59, 50, 0);
    await recordAttemptStart(port, "background", beforeMidnight, "background");
    await recordAttemptEnd(port, "background", beforeMidnight, "ran");
    expect([...port.files.keys()]).toEqual([dayOf(beforeMidnight)]);
    expect(lines(port, dayOf(beforeMidnight)).map((l) => l.outcome)).toEqual(["ran"]);
  });

  it("시나리오 2 — 닷새에 걸쳐 기록하면 닷새 파일이 모두 있고 어느 날도 비지 않는다", async () => {
    const port = memoryPort();
    for (let d = 0; d < 5; d += 1) {
      const at = new Date(2026, 9, 10 + d, 3, 0, 0, 0);
      await recordAttemptStart(port, "background", at);
      await recordAttemptEnd(port, "background", at, "no-material");
    }
    const days = await port.days();
    expect(days).toHaveLength(5);
    for (const day of days) expect(lines(port, day).length).toBeGreaterThan(0);
  });

  it("Edge — 시계가 되감겨 이전 날의 at이 와도 그 at의 날 파일에 들어간다", async () => {
    const port = memoryPort();
    const today = new Date(2026, 9, 13, 10, 0, 0, 0);
    const rewound = new Date(2026, 9, 11, 10, 0, 0, 0);
    await recordAttemptEnd(port, "app-open", today, "all-written");
    await recordAttemptEnd(port, "app-open", rewound, "all-written");
    expect((await port.days()).sort()).toEqual([dayOf(rewound), dayOf(today)].sort());
  });

  it("AT10 — 같은 프로세스의 겹친 기록은 줄을 잃지 않는다 (읽기·쓰기가 한 박자씩 걸려도)", async () => {
    const files = new Map<string, string>();
    const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
    const slow: AutoWriteAttemptPort = {
      async read(day) {
        await tick();
        return files.get(day) ?? null;
      },
      async write(day, serialized) {
        await tick();
        files.set(day, serialized);
      },
      async days() {
        return [...files.keys()];
      },
    };
    await Promise.all([
      recordAttemptStart(slow, "background", AT),
      recordAttemptEnd(slow, "app-open", LATER, "all-written"),
    ]);
    const items = await loadDayAttempts(slow, DAY);
    expect(items.map((i) => [i.path, i.outcome]).sort()).toEqual([
      ["app-open", "all-written"],
      ["background", "started"],
    ]);
  });
});

describe("T008 — 날짜별 요약 (day-summary S1~S4)", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 13, h, m, 0, 0);
  const item = (
    path: AutoWriteAttempt["path"],
    outcome: AutoWriteAttempt["outcome"],
    when: Date,
  ): AutoWriteAttempt => ({ at: when, path, outcome });

  it("백그라운드 줄만 센다: 깨움 = expired 아닌 줄, 미완 = started, 결과별은 started·expired 제외", () => {
    const summary = summarizeDay("2026-10-13", [
      item("background", "no-material", at(2, 22)),
      item("background", "no-material", at(2, 37)),
      item("background", "ran", at(6, 52)),
      item("background", "started", at(9, 0)),
      item("background", "expired", at(9, 5)),
      item("app-open", "all-written", at(10)),
      item("manual", "ran", at(11)),
    ]);
    expect(summary).toEqual({
      day: "2026-10-13",
      wakes: 4,
      firstAt: at(2, 22),
      lastAt: at(9, 0),
      unfinished: 1,
      byOutcome: { "no-material": 2, ran: 1 },
    });
  });

  it("백그라운드 줄이 없으면 깨움 0, 시각 없음", () => {
    const summary = summarizeDay("2026-10-13", [item("app-open", "all-written", at(10))]);
    expect(summary).toEqual({ day: "2026-10-13", wakes: 0, unfinished: 0, byOutcome: {} });
  });

  it("범위 — 가장 이른 장부 날부터 오늘까지 최근 날이 위, 최대 14일, 파일 없는 날도 낀다", () => {
    expect(summaryDays("2026-10-10", "2026-10-13", 14)).toEqual([
      "2026-10-13",
      "2026-10-12",
      "2026-10-11",
      "2026-10-10",
    ]);
    const long = summaryDays("2026-09-01", "2026-10-13", 14);
    expect(long).toHaveLength(14);
    expect(long[0]).toBe("2026-10-13");
    expect(long[13]).toBe("2026-09-30");
  });

  it("loadAttemptSummaries — 장부가 비면 빈 배열, 있으면 최근 날부터 요약 (파일 없는 날은 깨움 0)", async () => {
    const empty = memoryPort();
    expect(await loadAttemptSummaries(empty, at(12))).toEqual([]);

    const port = memoryPort();
    await recordAttemptEnd(port, "background", new Date(2026, 9, 11, 3, 0), "no-material");
    await recordAttemptEnd(port, "background", new Date(2026, 9, 13, 3, 0), "ran");
    const summaries = await loadAttemptSummaries(port, at(12));
    expect(summaries.map((s) => [s.day, s.wakes])).toEqual([
      ["2026-10-13", 1],
      ["2026-10-12", 0],
      ["2026-10-11", 1],
    ]);
  });

  it("14일보다 오래된 날 파일은 읽히지 않지만 지워지지도 않는다", async () => {
    const port = memoryPort();
    await recordAttemptEnd(port, "background", new Date(2026, 8, 1, 3, 0), "ran");
    await recordAttemptEnd(port, "background", new Date(2026, 9, 13, 3, 0), "ran");
    const summaries = await loadAttemptSummaries(port, at(12));
    expect(summaries).toHaveLength(14);
    expect(port.files.size).toBe(2);
  });

  it("깨진 날 파일은 그 날만 깨움 0으로 읽고 다른 날은 읽는다", async () => {
    const port = memoryPort({ "2026-10-12": "{" });
    await recordAttemptEnd(port, "background", new Date(2026, 9, 13, 3, 0), "ran");
    const summaries = await loadAttemptSummaries(port, at(12));
    expect(summaries.map((s) => [s.day, s.wakes])).toEqual([
      ["2026-10-13", 1],
      ["2026-10-12", 0],
    ]);
  });
});

describe("AT8 — 판정 → 갈래", () => {
  it("idle은 reason, skip은 because, write는 write", () => {
    expect(attemptOutcomeOf({ kind: "idle", reason: "disabled" })).toBe("disabled");
    expect(attemptOutcomeOf({ kind: "idle", reason: "not-near-target" })).toBe("not-near-target");
    expect(attemptOutcomeOf({ kind: "idle", reason: "all-written" })).toBe("all-written");
    expect(attemptOutcomeOf({ kind: "skip", day: "2026-10-12", because: "no-photo-access" })).toBe(
      "no-photo-access",
    );
    expect(attemptOutcomeOf({ kind: "skip", day: "2026-10-12", because: "no-material" })).toBe(
      "no-material",
    );
    expect(attemptOutcomeOf({ kind: "write", day: "2026-10-12" })).toBe("write");
  });

  it("attemptDayOf — 쓰기 판정만 날을 준다", () => {
    expect(attemptDayOf({ kind: "write", day: "2026-10-24" })).toBe("2026-10-24");
    expect(
      attemptDayOf({ kind: "skip", day: "2026-10-24", because: "no-material" }),
    ).toBeUndefined();
    expect(attemptDayOf({ kind: "idle", reason: "disabled" })).toBeUndefined();
  });
});

describe("T015 — 실패는 삼키고 옛 파일은 소스에 없다", () => {
  it("쓰기·읽기·목록 예외가 밖으로 나오지 않는다 (FR-006)", async () => {
    const broken: AutoWriteAttemptPort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
      days: () => Promise.reject(new Error("io")),
    };
    await expect(recordAttemptStart(broken, "background", AT)).resolves.toBeUndefined();
    await expect(recordAttemptEnd(broken, "background", AT, "ran")).resolves.toBeUndefined();
    await expect(recordAttemptExpired(broken, AT)).resolves.toBeUndefined();
    await expect(loadAttemptSummaries(broken, AT)).resolves.toEqual([]);
  });

  it("쓰기만 실패해도 그 뒤 기록이 이어진다 (대기열이 끊기지 않는다)", async () => {
    const port = memoryPort();
    let fail = true;
    const flaky: AutoWriteAttemptPort = {
      ...port,
      write: async (day, text) => {
        if (fail) throw new Error("disk");
        await port.write(day, text);
      },
    };
    await recordAttemptStart(flaky, "background", AT);
    fail = false;
    await recordAttemptStart(flaky, "background", LATER);
    expect(lines(port).map((l) => l.at.getTime())).toEqual([LATER.getTime()]);
  });
});

describe("AT9·T006·T015 — 소스 계약", () => {
  const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const SRC = strip(readFileSync(join(__dirname, "../../src/app/auto-write-attempts.ts"), "utf8"));

  it("장부 디렉터리 attempt-ledger 하나를 쓰고 비동기 File 호출을 쓰지 않는다 (L1·L7)", () => {
    expect(SRC).toMatch(/"attempt-ledger"/);
    expect(SRC).toMatch(/textSync\(\)/);
    expect(SRC).toMatch(/moveSync\(/);
    expect(SRC).not.toMatch(/\.text\(\)|\.move\(|\.copy\(|\.bytes\(/);
    // 날 파일 이름은 함수로 만든다 — `const X_FILE = "….json"` 꼴이면 설정 파일 목록 테스트가 센다
    expect(SRC).not.toMatch(/const [A-Z_]+_FILE = "[a-z-]+\.json"/);
  });

  it("옛 20건 파일과 상한 상수가 소스에 없다 (FR-009, L6)", () => {
    expect(SRC).not.toMatch(/auto-write-attempts\.json/);
    expect(SRC).not.toMatch(/MAX_AUTO_WRITE_ATTEMPTS|loadAutoWriteAttempts/);
    expect(SRC).not.toMatch(/preferences/);
  });

  it("시간·바이트·토큰·이유 문자열을 기록하지 않는다 (원칙 IV, FR-005)", () => {
    expect(SRC).not.toMatch(/elapsed|duration|bytes|token|timings/i);
  });

  it("직렬화 필드는 at·path·outcome·launch·wake·day 여섯뿐이다 (SC-006)", () => {
    const body = SRC.slice(
      SRC.indexOf("function toStored"),
      SRC.indexOf("function toStored") + 700,
    );
    for (const field of ["at:", "path:", "outcome:", "launch", "wake", "day"])
      expect(body).toContain(field);
    expect(body).not.toMatch(/photo|place|location|body|text:|title/i);
  });

  it("네트워크 호출이 없다 (FR-011)", () => {
    expect(SRC).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket/);
  });

  it("지우는 호출은 임시 파일·교체 대상 정리뿐이다 — 장부 날 파일을 지우는 코드가 없다 (FR-002, L3)", () => {
    const deletes = SRC.match(/\.delete\(\)/g) ?? [];
    expect(deletes).toHaveLength(2);
    expect(SRC).toMatch(/if \(temporary\.exists\) temporary\.delete\(\);/);
    expect(SRC).toMatch(/if \(target\.exists\) target\.delete\(\);/);
  });

  it("일기 지우기·개발자 끄기·온보딩 다시 코드가 장부를 참조하지 않는다 (FR-002)", () => {
    for (const file of [
      "src/app/wipe-diaries.ts",
      "src/app/wipe-port.ts",
      "src/app/developer-off.ts",
      "src/onboarding/reset.ts",
    ]) {
      let text = "";
      try {
        text = readFileSync(join(__dirname, "../..", file), "utf8");
      } catch {
        continue; // 파일이 없으면 참조도 없다
      }
      expect(strip(text)).not.toMatch(/attempt-ledger/);
    }
  });
});

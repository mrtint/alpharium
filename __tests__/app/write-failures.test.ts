/**
 * 쓰기 실패 기록 계약 (060 WF2~WF6·WF8·WF9, 081 F1~F7·S1~S5 — 갈래 판정은 081이 WF1을 대체했다).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MAX_WRITE_FAILURES,
  loadWriteFailures,
  recordWriteFailure,
  writeFailureReasonFor,
  type WriteFailurePort,
} from "../../src/app/write-failures";
import { failureLines } from "../../src/app/diagnostics-view";
import { REJECT_REASONS } from "../../src/diary/acceptance";

function memoryPort(initial: string | null = null): WriteFailurePort & { content: string | null } {
  const port = {
    content: initial,
    async read() {
      return port.content;
    },
    async write(serialized: string) {
      port.content = serialized;
    },
  };
  return port;
}

const AT = new Date("2026-10-06T09:12:03.000Z");

/** 주석을 걷은 소스 — 이 저장소의 주석은 금지어를 설명 안에 정당하게 쓴다 */
const code = (file: string) =>
  readFileSync(join(__dirname, "..", "..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
const source = code("src/app/write-failures.ts");

describe("081 F1~F4·F6 — 갈래 판정 (060 WF1을 대체)", () => {
  it("F1 — 갈래는 정확히 열하나이고 타입은 그 목록에서 나온다", () => {
    const list = /const REASONS = \[([^\]]*)\] as const;/.exec(source)?.[1] ?? "";
    expect([...list.matchAll(/"([^"]+)"/g)].map((m) => m[1])).toEqual([
      "module",
      "photos",
      "empty",
      "save",
      "echo",
      "language",
      "unfinished",
      "timed-out",
      "interrupted",
      "error",
      "unwritten",
    ]);
    // 타입에만 더한 갈래는 읽을 때 조용히 버려진다 — 타입을 목록에서 끌어낸다
    expect(source).toMatch(/export type WriteFailureReason = \(typeof REASONS\)\[number\];/);
  });

  it.each([
    ["storage", "디스크 가득", "save"],
    ["request-build", "캐릭터가 정해지지 않아 요청을 만들지 못했다", "module"],
    ["model-not-ready", "고른 캐릭터의 모델이 아직 기기에 없다", "module"],
    ["signals", "2026-10-05의 신호를 가져오지 못했다", "photos"],
    ["vision", "vision-failed: not-ready", "module"],
    ["vision", "vision-failed: failed", "photos"],
    // F3 — 사진을 못 읽은 것이 아니라 읽는 도중 끊긴 것이다(060은 photos였다)
    ["vision", "vision-failed: cancelled", "interrupted"],
    ["generation", "model-load-failed: not-found", "module"],
    ["generation", "model-load-failed: load-failed", "module"],
    ["generation", "rejected: empty", "empty"],
    ["generation", "rejected: echo", "echo"],
    ["generation", "rejected: language", "language"],
    ["generation", "rejected: unfinished", "unfinished"],
    // F4 — detail이 넷 밖이거나 없으면(옛 모양) 다른 갈래로 새지 않는다
    ["generation", "rejected", "unwritten"],
    ["generation", "rejected: too-short", "unwritten"],
    ["generation", "timed-out", "timed-out"],
    ["generation", "interrupted", "interrupted"],
    ["generation", "interrupted: 시작 전에 그만두었다", "interrupted"],
    ["generation", "generation-failed: oom", "error"],
    // F6 — 오류 문구는 읽지 않는다
    ["generation", "generation-failed: rejected: echo", "error"],
    ["generation", "generation-failed: a: b: timed-out", "error"],
    ["generation", "backend-unavailable: x", "unwritten"],
    ["generation", "not-implemented", "unwritten"],
    ["day-not-closed", "미래 날", "unwritten"],
    ["어떤-새-단계", "뭔가", "unwritten"],
    ["generation", "처음 보는 reason", "unwritten"],
    // 단계가 다르면 같은 낱말도 그 갈래가 아니다
    ["signals", "timed-out", "photos"],
    ["storage", "rejected: echo", "save"],
  ])("%s / %s → %s", (stage, reason, expected) => {
    expect(writeFailureReasonFor({ stage, reason })).toBe(expected);
  });

  it("단계도 이유도 없으면 unwritten이고 던지지 않는다", () => {
    expect(writeFailureReasonFor({})).toBe("unwritten");
  });

  it("F5 — 거부 갈래 넷은 판정의 갈래 넷과 같은 집합이다", () => {
    const fromRecord = REJECT_REASONS.map((why) =>
      writeFailureReasonFor({ stage: "generation", reason: `rejected: ${why}` }),
    );
    // 판정 갈래마다 자기 이름의 기록 갈래가 선다 — 판정 갈래가 늘면 여기서 unwritten이 나와 실패한다
    expect(fromRecord).toEqual([...REJECT_REASONS]);
    expect(REJECT_REASONS).toHaveLength(4);
  });

  it("F5 — 이 모듈은 판정 모듈에 기대지 않는다", () => {
    expect(source).not.toMatch(/acceptance/);
  });

  it("F7 — 판정 본문에 문구 비교가 없다", () => {
    // 이유를 가르는 도우미(`split`·`rejectedReasonFor`)부터 판정 함수 끝까지 본다
    const from = source.indexOf("function split(");
    const body = source.slice(from, source.indexOf("function isRecordable"));
    expect(from).toBeGreaterThan(-1);
    expect(body.length).toBeGreaterThan(100);
    expect(body).not.toMatch(/[가-힣]/);
    expect(body).not.toMatch(/includes\(|startsWith\(|endsWith\(|\.match\(|\.test\(|RegExp/);
  });
});

describe("WF2 — 기록하지 않는 것", () => {
  it("already-running과 성공은 기록하지 않는다", async () => {
    const port = memoryPort();
    await recordWriteFailure(port, { ok: false, stage: "already-running", reason: "x" }, AT);
    await recordWriteFailure(port, { ok: true }, AT);
    expect(port.content).toBeNull();
  });

  // 080 P9 — 사용자가 그만둔 쓰기(합류한 홈의 그만두기·지우기)는 실패가 아니다. 결과의 값으로 가른다.
  it("사용자가 그만둔 쓰기는 기록하지 않는다", async () => {
    const port = memoryPort();
    await recordWriteFailure(
      port,
      {
        ok: false,
        stage: "generation",
        reason: "interrupted: 저장 전에 그만두었다",
        cancelled: true,
      },
      AT,
    );
    expect(port.content).toBeNull();
  });

  it("같은 실패라도 그만둠이 없으면 기록한다", async () => {
    const port = memoryPort();
    await recordWriteFailure(
      port,
      { ok: false, stage: "generation", reason: "interrupted: 저장 전에 그만두었다" },
      AT,
    );
    // 081 — 그만둔 것이 아닌 끊김은 자기 갈래로 남는다(전에는 unwritten이었다)
    expect(await loadWriteFailures(port)).toEqual([{ reason: "interrupted", at: AT }]);
  });

  // FR-016 — 첫 실행 자동 첫 일기에는 시도 기록도 알림도 없다. 그만둔 그 쓰기가 실패로 남지 않는 길은 이 한 곳이다.
  it("첫 실행 자동 첫 일기는 결과를 그대로 이 함수에 넘긴다", () => {
    const code = readFileSync(join(__dirname, "../../src/app/wiring.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const trigger = code.slice(code.indexOf("export async function triggerFirstRunAutoDiary"));

    expect(trigger).toMatch(/\.then\(\(result\) =>\s*recordWriteFailure\([^,]+,\s*result,/);
  });
});

describe("WF4 — 더하기와 상한", () => {
  it("맨 앞에 더하고 같은 갈래가 연달아도 각각 한 줄이다", async () => {
    const port = memoryPort();
    await recordWriteFailure(port, { ok: false, stage: "storage", reason: "x" }, AT);
    await recordWriteFailure(
      port,
      { ok: false, stage: "storage", reason: "x" },
      new Date("2026-10-06T10:00:00.000Z"),
    );
    const items = await loadWriteFailures(port);
    expect(items.map((i) => i.reason)).toEqual(["save", "save"]);
    expect(items[0]?.at.toISOString()).toBe("2026-10-06T10:00:00.000Z");
  });

  it("열 건을 넘으면 가장 오래된 것부터 빠진다", async () => {
    const port = memoryPort();
    for (let i = 0; i < MAX_WRITE_FAILURES + 1; i += 1) {
      await recordWriteFailure(
        port,
        { ok: false, stage: i === 0 ? "signals" : "storage", reason: "x" },
        new Date(Date.UTC(2026, 9, 6, 0, i)),
      );
    }
    const items = await loadWriteFailures(port);
    expect(items).toHaveLength(10);
    expect(items.map((item) => item.reason)).not.toContain("photos"); // 맨 처음(가장 오래된) 것이 빠졌다
    expect(items[0]?.at.getUTCMinutes()).toBe(10);
  });
});

describe("WF5 — 읽기는 던지지 않는다", () => {
  it.each([
    ["파일 없음", null],
    ["깨진 JSON", "{"],
    ["items가 배열이 아님", JSON.stringify({ items: 3 })],
    ["객체가 아님", "3"],
  ])("%s → 빈 목록", async (_name, raw) => {
    expect(await loadWriteFailures(memoryPort(raw))).toEqual([]);
  });

  it("통로가 던져도 빈 목록이다", async () => {
    const port: WriteFailurePort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.resolve(),
    };
    expect(await loadWriteFailures(port)).toEqual([]);
  });

  it("모르는 reason이나 해석 안 되는 at인 항목만 버린다", async () => {
    const raw = JSON.stringify({
      items: [
        { reason: "save", at: "2026-10-06T09:00:00.000Z" },
        { reason: "비밀", at: "2026-10-06T09:00:00.000Z" },
        { reason: "empty", at: "어제" },
        { reason: "module", at: "2026-10-05T09:00:00.000Z" },
        null,
      ],
    });
    const items = await loadWriteFailures(memoryPort(raw));
    expect(items.map((i) => i.reason)).toEqual(["save", "module"]);
  });
});

describe("WF6 — 기록 실패는 삼킨다", () => {
  it("읽기·쓰기 통로가 던져도 던지지 않는다", async () => {
    const port: WriteFailurePort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    await expect(
      recordWriteFailure(port, { ok: false, stage: "storage", reason: "x" }, AT),
    ).resolves.toBeUndefined();
  });
});

describe("081 S2~S4 — 새 갈래의 저장과 옛 기록", () => {
  it("S2 — 새 갈래 여섯이 기록·재독 왕복에서 보존된다", async () => {
    const port = memoryPort();
    const results = [
      { stage: "generation", reason: "rejected: echo" },
      { stage: "generation", reason: "rejected: language" },
      { stage: "generation", reason: "rejected: unfinished" },
      { stage: "generation", reason: "timed-out" },
      { stage: "vision", reason: "vision-failed: cancelled" },
      { stage: "generation", reason: "generation-failed: x" },
    ];
    for (const result of results) await recordWriteFailure(port, { ok: false, ...result }, AT);

    expect((await loadWriteFailures(port)).map((i) => i.reason)).toEqual([
      "error",
      "interrupted",
      "timed-out",
      "unfinished",
      "language",
      "echo",
    ]);
    // S1 — 항목이 담는 것은 여전히 둘뿐이다
    const stored = JSON.parse(port.content ?? "{}") as { items: object[] };
    for (const item of stored.items) expect(Object.keys(item).sort()).toEqual(["at", "reason"]);
  });

  it("S3·S4 — 옛·새가 섞인 기록: 옛 줄은 그 갈래 그대로, 모르는 줄만 빠진다 (US3)", async () => {
    const raw = JSON.stringify({
      items: [
        { reason: "interrupted", at: "2026-10-14T09:00:00.000Z" },
        { reason: "unwritten", at: "2026-10-13T09:00:00.000Z" },
        { reason: "photos", at: "2026-10-12T09:00:00.000Z" },
        { reason: "made-up", at: "2026-10-11T09:00:00.000Z" },
      ],
    });
    const items = await loadWriteFailures(memoryPort(raw));

    expect(items.map((i) => i.reason)).toEqual(["interrupted", "unwritten", "photos"]);
    expect(failureLines(items).map((line) => line.reasonText)).toEqual([
      "도중에 끊김",
      "일기를 쓰지 못함",
      "사진을 읽지 못함",
    ]);
  });
});

describe("소스 계약 — WF3·WF8·WF9", () => {
  it("WF3 — 직렬화 객체의 키는 reason·at뿐이고 측정 어휘가 없다", () => {
    const serialize = source.slice(source.indexOf("JSON.stringify({"));
    const keys = [...serialize.slice(0, serialize.indexOf("}),") + 3).matchAll(/(\w+):/g)].map(
      (m) => m[1],
    );
    expect(keys.filter((k) => k !== "items" && k !== "reason" && k !== "at")).toEqual([]);
    expect(source).not.toMatch(/duration|elapsed|timing|token|[^a-z]ms[^a-z]/i);
  });

  it("WF8 — 파일 이름은 write-failures.json 하나다", () => {
    expect(source).toContain("write-failures.json");
    expect(source).not.toMatch(/auto-diary|auto-write-skipped|onboarding|notified/);
  });

  it("판정은 앞 토큰·detail만 본다 — 긴 문장 비교가 없다", () => {
    expect(source).not.toMatch(/===\s*["'][^"']{20,}["']/);
  });

  it("CC4 — src/ui·diary/pipeline을 import하지 않는다", () => {
    expect(source).not.toMatch(/from\s+["'][^"']*(?:\/ui\/|diary\/pipeline)/);
  });

  it("WF9 — 지우기와 파이프라인은 이 모듈을 import하지 않는다", () => {
    expect(code("src/app/wipe-diaries.ts")).not.toContain("write-failures");
    expect(code("src/diary/pipeline.ts")).not.toContain("write-failures");
  });
});

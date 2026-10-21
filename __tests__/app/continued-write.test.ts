/**
 * 092 CW3·FR-007 — 이어 쓰기 세션. 신청·단계·박동 → 막대 값, 한 번만 닫기, 만료.
 *
 * 막대는 단계 몫(준비 0–5%, 사진 5–45%, 글 45–95%) 안에서 박동마다 남은 몫의 1/4(사진)·1/16(조각)·1/400(토큰)만큼 오른다(research R3) —
 * 박동 없이는 오르지 않고(타이머 없음, FR-003), 끝나기 전에 95%를 넘지 않는다.
 */

import { createContinuedWrite, PROGRESS_TOTAL } from "../../src/app/continued-write";
import type { ContinuedWritePort } from "../../src/app/continued-write-port";
import type { Beat } from "../../src/inference/heartbeat";

function harness(accept = true) {
  const calls: unknown[][] = [];
  let expire: (() => void) | null = null;
  const port: ContinuedWritePort = {
    begin: (title, subtitle) => {
      calls.push(["begin", title, subtitle]);
      return Promise.resolve(accept);
    },
    report: (subtitle, completed, total) => {
      calls.push(["report", subtitle, completed, total]);
    },
    finish: (success) => {
      calls.push(["finish", success]);
    },
    onExpired: (listener) => {
      expire = listener;
      return () => {
        expire = null;
      };
    },
  };
  const listeners = new Set<(beat: Beat) => void>();
  const subscribe = (listener: (beat: Beat) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const beat = (kind: Beat) => listeners.forEach((l) => l(kind));
  const reports = () => calls.filter((c) => c[0] === "report");
  // 박동마다 보고 한도(2초)보다 넉넉히 시간이 흐르는 시계 — 한도를 보는 테스트는 따로 시계를 준다
  let now = 0;
  const clock = () => (now += 10_000);
  return {
    continued: createContinuedWrite(port, subscribe, clock),
    calls,
    reports,
    beat,
    listeners,
    expire: () => expire?.(),
    hasExpiryListener: () => expire !== null,
  };
}

const WRITE = { name: "금동이", day: "2026-10-19" as const };

describe("092 CW3 — 신청", () => {
  it("제목·첫 보조 줄로 신청하고, 받아들여지면 준비 단계 0으로 보고한다", async () => {
    const h = harness();
    const session = await h.continued.start(WRITE, () => {});
    expect(session.accepted).toBe(true);
    expect(h.calls).toEqual([
      ["begin", "금동이가 10월 19일 일기를 쓰고 있어요", "준비하는 중"],
      ["report", "준비하는 중", 0, PROGRESS_TOTAL],
    ]);
    expect(PROGRESS_TOTAL).toBe(1_000_000);
  });

  it("거절이면 보고·닫기·만료 구독·박동 구독이 없다", async () => {
    const h = harness(false);
    const session = await h.continued.start(WRITE, () => {});
    expect(session.accepted).toBe(false);
    session.progress("vision");
    h.beat("photo");
    session.finish(true);
    expect(h.calls).toEqual([["begin", "금동이가 10월 19일 일기를 쓰고 있어요", "준비하는 중"]]);
    expect(h.listeners.size).toBe(0);
    expect(h.hasExpiryListener()).toBe(false);
  });
});

describe("092 CW3 — 막대", () => {
  it("단계 몫의 시작으로 오르고, 박동마다 남은 몫의 일부만큼 오른다", async () => {
    const h = harness();
    const session = await h.continued.start(WRITE, () => {});
    session.progress("signals");
    session.progress("vision");
    h.beat("photo");
    h.beat("photo");
    session.progress("load");
    session.progress("generation");
    h.beat("chunk");
    expect(h.reports()).toEqual([
      ["report", "준비하는 중", 0, PROGRESS_TOTAL],
      ["report", "사진을 보는 중", 50_000, PROGRESS_TOTAL],
      ["report", "사진을 보는 중", 150_000, PROGRESS_TOTAL],
      ["report", "사진을 보는 중", 225_000, PROGRESS_TOTAL],
      ["report", "글을 쓰는 중", 450_000, PROGRESS_TOTAL],
      ["report", "글을 쓰는 중", 481_250, PROGRESS_TOTAL],
    ]);
  });

  it("박동 없이는 오르지 않는다 — 같은 단계·뒤로 가는 단계는 보고하지 않는다", async () => {
    const h = harness();
    const session = await h.continued.start(WRITE, () => {});
    session.progress("vision");
    const before = h.reports().length;
    session.progress("vision");
    session.progress("signals");
    expect(h.reports()).toHaveLength(before);
  });

  it("끝나기 전에 95%를 넘지 않는다", async () => {
    const h = harness();
    const session = await h.continued.start(WRITE, () => {});
    session.progress("vision");
    for (let i = 0; i < 200; i += 1) h.beat("photo");
    const photos = h.reports().at(-1)?.[2] as number;
    // 몫 끝에 닿은 뒤에도 보고마다 한 칸은 오른다(아래 「보고마다 막대 값이 오른다」) — 넘는 것은 보고 수만큼이다
    expect(photos).toBeLessThanOrEqual(450_000 + h.reports().length);
    session.progress("generation");
    for (let i = 0; i < 500; i += 1) h.beat("chunk");
    const last = h.reports().at(-1)?.[2] as number;
    expect(last).toBeLessThanOrEqual(950_000 + h.reports().length);
    expect(last).toBeGreaterThan(900_000);
  });

  it("보조 줄은 카탈로그 셋 중 하나이고 숫자가 없다", async () => {
    const h = harness();
    const session = await h.continued.start(WRITE, () => {});
    session.progress("vision");
    h.beat("photo");
    session.progress("generation");
    h.beat("chunk");
    const subtitles = new Set(h.calls.map((c) => c[c[0] === "begin" ? 2 : 1] as string));
    for (const subtitle of subtitles) {
      expect(["준비하는 중", "사진을 보는 중", "글을 쓰는 중"]).toContain(subtitle);
      expect(subtitle).not.toMatch(/\d/);
    }
  });
});

describe("092 FR-007 — 닫기", () => {
  it("한 번만 닫고, 닫은 뒤에는 박동·단계를 보고하지 않으며 구독을 푼다", async () => {
    const h = harness();
    const session = await h.continued.start(WRITE, () => {});
    session.finish(true);
    session.finish(false);
    session.progress("vision");
    h.beat("photo");
    expect(h.calls.filter((c) => c[0] === "finish")).toEqual([["finish", true]]);
    expect(h.reports()).toHaveLength(1);
    expect(h.listeners.size).toBe(0);
    expect(h.hasExpiryListener()).toBe(false);
  });

  it("만료면 쓰기를 끊으라고 한 번 알리고 닫힌 것으로 둔다 — 그 뒤 닫기는 네이티브에 가지 않는다", async () => {
    const h = harness();
    const expired: number[] = [];
    const session = await h.continued.start(WRITE, () => expired.push(1));
    h.expire();
    h.expire();
    session.finish(false);
    h.beat("chunk");
    expect(expired).toEqual([1]);
    expect(h.calls.filter((c) => c[0] === "finish")).toEqual([]);
    expect(h.reports()).toHaveLength(1);
  });

  it("닫은 뒤에 온 만료는 알리지 않는다", async () => {
    const h = harness();
    const expired: number[] = [];
    const session = await h.continued.start(WRITE, () => expired.push(1));
    session.finish(true);
    h.expire();
    expect(expired).toEqual([]);
  });
});

describe("092 — 토큰 박동과 보고 간격", () => {
  function tight() {
    const calls: unknown[][] = [];
    const port: ContinuedWritePort = {
      begin: () => Promise.resolve(true),
      report: (subtitle, completed) => {
        calls.push([subtitle, completed]);
      },
      finish: () => {},
      onExpired: () => () => {},
    };
    let listener: (beat: Beat) => void = () => {};
    let now = 0;
    const continued = createContinuedWrite(
      port,
      (l) => {
        listener = l;
        return () => {};
      },
      () => now,
    );
    return {
      continued,
      calls,
      beat: (kind: Beat, at: number) => {
        now = at;
        listener(kind);
      },
      at: (t: number) => {
        now = t;
      },
    };
  }

  it("박동은 막대를 늘 앞으로 움직이되, 보고는 2초에 한 번까지만 보낸다 — 단계가 바뀌면 곧바로 보낸다", async () => {
    const h = tight();
    const session = await h.continued.start(WRITE, () => {});
    h.at(0);
    session.progress("generation");
    h.beat("token", 100);
    h.beat("token", 900);
    h.beat("token", 2_100);
    h.beat("token", 2_500);
    h.beat("token", 4_200);
    const completed = h.calls.map((c) => c[1] as number);
    // 첫 보고(준비) · 글 단계 · 2.1초 · 4.2초
    expect(h.calls).toHaveLength(4);
    expect(h.calls[1]).toEqual(["글을 쓰는 중", 450_000]);
    for (let i = 1; i < completed.length; i += 1) {
      expect(completed[i]).toBeGreaterThanOrEqual(completed[i - 1]);
    }
    // 건너뛴 박동도 막대에 반영된다 — 2.1초 보고는 박동 셋만큼 오른 값이다
    expect(completed[2]).toBeGreaterThan(completed[1]);
  });

  it("토큰 하나는 조각 하나보다 조금 오른다", async () => {
    const a = tight();
    const s1 = await a.continued.start(WRITE, () => {});
    s1.progress("generation");
    a.beat("token", 10_000);
    const b = tight();
    const s2 = await b.continued.start(WRITE, () => {});
    s2.progress("generation");
    b.beat("chunk", 10_000);
    expect((a.calls.at(-1)?.[1] as number) - 450_000).toBeLessThan(
      (b.calls.at(-1)?.[1] as number) - 450_000,
    );
  });

  it("보고마다 막대 값이 오른다 — 시스템은 값이 오르지 않는 공백을 멈춤으로 본다 (2026-10-21 run I: 947에서 36초 → 만료)", async () => {
    const h = tight();
    const session = await h.continued.start(WRITE, () => {});
    session.progress("generation");
    for (let i = 1; i <= 5_000; i += 1) h.beat("token", i * 3_000);
    const completed = h.calls.slice(1).map((c) => c[1] as number);
    expect(completed.length).toBeGreaterThan(5_000);
    for (let i = 1; i < completed.length; i += 1) {
      expect(completed[i]).toBeGreaterThan(completed[i - 1]);
    }
    expect(completed.at(-1)).toBeLessThan(PROGRESS_TOTAL);
  });
});

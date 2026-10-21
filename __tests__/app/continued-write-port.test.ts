/**
 * 092 CW2 — 이어 쓰기 네이티브 통로. 모듈이 없거나(안드로이드·시뮬레이터 밖의 jest) 던지면 신청은 거절이고 나머지는 아무 일도 없다.
 */

import { continuedWritePort, type ContinuedWriteNative } from "../../src/app/continued-write-port";

function fake(overrides: Partial<ContinuedWriteNative> = {}) {
  const calls: unknown[][] = [];
  const listeners: ((payload: unknown) => void)[] = [];
  const native: ContinuedWriteNative = {
    begin: (title, subtitle) => {
      calls.push(["begin", title, subtitle]);
      return Promise.resolve("com.a810labs.pocketlog.write.A");
    },
    report: (subtitle, completed, total) => {
      calls.push(["report", subtitle, completed, total]);
    },
    finish: (success) => {
      calls.push(["finish", success]);
    },
    addListener: (_event, listener) => {
      listeners.push(listener);
      return { remove: () => listeners.splice(listeners.indexOf(listener), 1) };
    },
    ...overrides,
  };
  return { native, calls, listeners };
}

describe("092 CW2 — continuedWritePort", () => {
  it("모듈이 없으면 begin은 거짓, 나머지는 던지지 않는다", async () => {
    const port = continuedWritePort(() => null);
    await expect(port.begin("t", "s")).resolves.toBe(false);
    expect(() => port.report("s", 1, 1000)).not.toThrow();
    expect(() => port.finish(true)).not.toThrow();
    const off = port.onExpired(() => {});
    expect(() => off()).not.toThrow();
  });

  it("모듈을 읽다 던져도 거절이다", async () => {
    const port = continuedWritePort(() => {
      throw new Error("x");
    });
    await expect(port.begin("t", "s")).resolves.toBe(false);
    expect(() => port.report("s", 1, 1000)).not.toThrow();
    expect(() => port.finish(false)).not.toThrow();
  });

  it("네이티브가 참이면 참, 거부하거나 참이 아닌 값이면 거짓", async () => {
    const { native, calls } = fake();
    await expect(continuedWritePort(() => native).begin("제목", "준비")).resolves.toBe(true);
    expect(calls).toEqual([["begin", "제목", "준비"]]);
    const rejects = fake({ begin: () => Promise.reject(new Error("no")) }).native;
    await expect(continuedWritePort(() => rejects).begin("t", "s")).resolves.toBe(false);
    const odd = fake({ begin: () => Promise.resolve(true as unknown as string) }).native;
    await expect(continuedWritePort(() => odd).begin("t", "s")).resolves.toBe(false);
    const refused = fake({ begin: () => Promise.resolve(null) }).native;
    await expect(continuedWritePort(() => refused).begin("t", "s")).resolves.toBe(false);
    const empty = fake({ begin: () => Promise.resolve("") }).native;
    await expect(continuedWritePort(() => empty).begin("t", "s")).resolves.toBe(false);
    const throws = fake({
      begin: () => {
        throw new Error("sync");
      },
    }).native;
    await expect(continuedWritePort(() => throws).begin("t", "s")).resolves.toBe(false);
  });

  it("report·finish를 그대로 넘기고, 던져도 삼킨다", () => {
    const { native, calls } = fake();
    const port = continuedWritePort(() => native);
    port.report("글", 500, 1000);
    port.finish(true);
    expect(calls).toEqual([
      ["report", "글", 500, 1000],
      ["finish", true],
    ]);
    const bad = continuedWritePort(
      () =>
        fake({
          report: () => {
            throw new Error("r");
          },
          finish: () => {
            throw new Error("f");
          },
        }).native,
    );
    expect(() => bad.report("s", 1, 1)).not.toThrow();
    expect(() => bad.finish(true)).not.toThrow();
  });

  it("지금 신청의 만료만 듣고, 돌려준 함수로 그만 듣는다", async () => {
    const { native, listeners } = fake();
    const port = continuedWritePort(() => native);
    await port.begin("t", "s");
    const heard: number[] = [];
    const off = port.onExpired(() => heard.push(1));
    // 앞 쓰기의 늦은 만료·식별자 없는 이벤트는 지금 쓰기를 끊지 않는다(코드 리뷰)
    listeners.forEach((l) => l({ identifier: "com.a810labs.pocketlog.write.OLD" }));
    listeners.forEach((l) => l({}));
    listeners.forEach((l) => l({ identifier: "com.a810labs.pocketlog.write.A" }));
    off();
    expect(listeners).toHaveLength(0);
    expect(heard).toEqual([1]);
  });
});

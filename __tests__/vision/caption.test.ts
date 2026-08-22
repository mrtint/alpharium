import { captionAll } from "../../src/vision/caption";
import type { Photo } from "../../src/signals/types";
import type { VisionEngine } from "../../src/vision/vision-port";

/**
 * 캡션 모으기의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/contracts/vision-engine.md E4·E5
 *       specs/011-photo-vision-summary/data-model.md 「세 수」
 *
 * **세 수가 서로 다른 것을 말한다는 것이 이 파일의 핵심이다.**
 */

const photo = (id: string, hour: number): Photo => ({
  id,
  takenAt: new Date(2026, 7, 20, hour, 0, 0),
});

const FIVE = [photo("a", 8), photo("b", 11), photo("c", 14), photo("d", 17), photo("e", 20)];

/** 사진마다 다른 캡션을 주되, `fails`에 든 id는 빈 문자열을 준다 */
function engineWith(fails: string[] = [], throwsOn: string[] = []): VisionEngine {
  return {
    async load() {
      return { ok: true };
    },
    async caption(path: string) {
      const id = path.replace("/photo/", "").replace(".jpg", "");
      if (throwsOn.includes(id)) throw new Error("읽다 무너졌다");
      if (fails.includes(id)) return { text: "" };
      return { text: `사진 ${id}의 내용` };
    },
    async stop() {},
    async unload() {},
  };
}

const resolve = async (p: Photo) => `/photo/${p.id}.jpg`;

describe("세 수가 서로 다른 것을 말한다 (FR-006)", () => {
  it("사진 3장, 다 읽힘 → 3 / 3 / 3", async () => {
    const three = FIVE.slice(0, 3);
    const vision = await captionAll(engineWith(), three, 3, resolve);

    expect(vision).not.toBeNull();
    expect(vision?.available).toBe(3);
    expect(vision?.considered).toBe(3);
    expect(vision?.captions).toHaveLength(3);
  });

  // ★ 「있는 것 중 다섯만 보았다」 — FR-012의 근거다.
  it("사진 12장 중 5장을 골랐다 → available 12 / considered 5", async () => {
    const vision = await captionAll(engineWith(), FIVE, 12, resolve);

    expect(vision?.available).toBe(12);
    expect(vision?.considered).toBe(5);
    expect(vision?.captions).toHaveLength(5);
  });

  // ★ E4 — 한 장의 실패가 나머지를 무너뜨리지 않는다 (FR-005a).
  it("5장 중 1장이 실패해도 나머지 4장이 남는다", async () => {
    const vision = await captionAll(engineWith(["c"]), FIVE, 5, resolve);

    expect(vision?.considered).toBe(5);
    expect(vision?.captions).toHaveLength(4);
    expect(vision?.captions.map((c) => c.photoId)).toEqual(["a", "b", "d", "e"]);
  });

  it("읽다 무너져도 나머지가 남는다", async () => {
    const vision = await captionAll(engineWith([], ["b"]), FIVE, 5, resolve);

    expect(vision?.captions).toHaveLength(4);
    expect(vision?.considered).toBe(5);
  });

  /**
   * ★ 원칙 V의 자리다.
   *
   * **`captions`가 비었지만 「사진이 없다」가 아니다** — 004의 `photos`가 `none`인 것과
   * 완전히 다른 사실이며, 프롬프트가 다르게 적는다(SC-006).
   */
  it("전부 실패해도 seen이며 available·considered가 남는다", async () => {
    const vision = await captionAll(engineWith(["a", "b", "c", "d", "e"]), FIVE, 5, resolve);

    expect(vision).not.toBeNull();
    expect(vision?.captions).toHaveLength(0);
    expect(vision?.considered).toBe(5);
    expect(vision?.available).toBe(5);
  });

  it("경로를 얻지 못한 사진은 건너뛰되 considered에는 남는다", async () => {
    const spotty = async (p: Photo) => (p.id === "c" ? null : `/photo/${p.id}.jpg`);
    const vision = await captionAll(engineWith(), FIVE, 5, spotty);

    expect(vision?.captions).toHaveLength(4);
    expect(vision?.considered).toBe(5);
  });

  it("경로 얻기가 던져도 나머지가 남는다", async () => {
    const throwing = async (p: Photo) => {
      if (p.id === "d") throw new Error("경로 실패");
      return `/photo/${p.id}.jpg`;
    };
    const vision = await captionAll(engineWith(), FIVE, 5, throwing);

    expect(vision?.captions).toHaveLength(4);
  });
});

describe("한 장씩 읽는다 (FR-001a)", () => {
  it("사진 수만큼 부른다 — 한 번에 몰아 넣지 않는다", async () => {
    const seen: string[] = [];
    const engine: VisionEngine = {
      async load() {
        return { ok: true };
      },
      async caption(path) {
        seen.push(path);
        return { text: "x" };
      },
      async stop() {},
      async unload() {},
    };

    await captionAll(engine, FIVE, 5, resolve);
    expect(seen).toHaveLength(5);
  });

  it("찍힌 시각 순을 유지한다 — 프롬프트가 시간 순으로 읽힌다", async () => {
    const vision = await captionAll(engineWith(), FIVE, 5, resolve);
    const hours = vision?.captions.map((c) => c.takenAt.getHours()) ?? [];

    expect(hours).toEqual([8, 11, 14, 17, 20]);
  });

  it("각 캡션이 어느 사진인지와 언제인지를 지닌다 (FR-007b)", async () => {
    const vision = await captionAll(engineWith(), FIVE.slice(0, 1), 1, resolve);

    expect(vision?.captions[0]).toEqual({
      photoId: "a",
      takenAt: FIVE[0].takenAt,
      text: "사진 a의 내용",
    });
  });
});

/**
 * ★ E5 — 그만두면 거기까지 읽은 것을 버린다 (FR-009).
 *
 * **`null`을 돌려주는 것이 「버린다」의 구현이다.** 여기까지의 캡션을 담아 돌려주면
 * 호출자가 그것을 쓸 수 있고, 그러면 「적게 본 일기」가 나온다 — 그만둔 것은 취소이지
 * 그것이 아니다.
 */
describe("E5. 그만두면 버린다 (FR-009)", () => {
  it("처음부터 그만둔 상태면 아무것도 읽지 않는다", async () => {
    const seen: string[] = [];
    const engine: VisionEngine = {
      async load() {
        return { ok: true };
      },
      async caption(path) {
        seen.push(path);
        return { text: "x" };
      },
      async stop() {},
      async unload() {},
    };

    const vision = await captionAll(engine, FIVE, 5, resolve, { cancelled: true });

    expect(vision).toBeNull();
    expect(seen).toHaveLength(0);
  });

  it("도중에 그만두면 거기까지의 캡션을 버린다", async () => {
    const cancel = { cancelled: false };
    let count = 0;
    const engine: VisionEngine = {
      async load() {
        return { ok: true };
      },
      async caption() {
        count += 1;
        if (count === 3) cancel.cancelled = true;
        return { text: "읽은 것" };
      },
      async stop() {},
      async unload() {},
    };

    const vision = await captionAll(engine, FIVE, 5, resolve, cancel);

    // 세 장을 읽었지만 **아무것도 돌려주지 않는다.**
    expect(count).toBe(3);
    expect(vision).toBeNull();
  });

  it("마지막 장을 읽는 동안 그만둬도 버린다", async () => {
    const cancel = { cancelled: false };
    let count = 0;
    const engine: VisionEngine = {
      async load() {
        return { ok: true };
      },
      async caption() {
        count += 1;
        if (count === 5) cancel.cancelled = true;
        return { text: "읽은 것" };
      },
      async stop() {},
      async unload() {},
    };

    expect(await captionAll(engine, FIVE, 5, resolve, cancel)).toBeNull();
  });

  it("그만두지 않으면 전부 읽는다", async () => {
    const vision = await captionAll(engineWith(), FIVE, 5, resolve, { cancelled: false });
    expect(vision?.captions).toHaveLength(5);
  });
});

describe("이 함수는 엔진을 열지도 닫지도 않는다 (E1은 호출자의 몫)", () => {
  it("load·unload를 부르지 않는다", async () => {
    const calls: string[] = [];
    const engine: VisionEngine = {
      async load() {
        calls.push("load");
        return { ok: true };
      },
      async caption() {
        return { text: "x" };
      },
      async stop() {
        calls.push("stop");
      },
      async unload() {
        calls.push("unload");
      },
    };

    await captionAll(engine, FIVE, 5, resolve);

    expect(calls).toEqual([]);
  });
});

describe("지어내지 않는다 (원칙 II)", () => {
  it("빈 캡션을 대신할 문장을 만들지 않는다", async () => {
    const vision = await captionAll(engineWith(["a", "b"]), FIVE, 5, resolve);
    const texts = vision?.captions.map((c) => c.text) ?? [];

    expect(texts).toHaveLength(3);
    for (const text of texts) {
      expect(text).not.toMatch(/설명할 수 없|알 수 없|보지 못|실패/);
      expect(text).not.toBe("");
    }
  });
});

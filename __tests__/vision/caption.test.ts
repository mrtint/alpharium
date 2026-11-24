import { captionAll } from "../../src/vision/caption";
import type { Photo } from "../../src/signals/types";
import type { ResizeExecutor } from "../../src/vision/resize";
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

/**
 * 사진마다 다른 캡션을 주되, `fails`에 든 id는 빈 문자열을 준다.
 *
 * **파일명(basename)만으로 id를 판정한다** — 017부터 리사이즈 경로가
 * `/resized/{id}.jpg`처럼 원본과 다른 디렉터리를 가질 수 있으므로, 전체
 * 경로 문자열 치환이 아니라 마지막 경로 조각만 본다.
 */
function engineWith(fails: string[] = [], throwsOn: string[] = []): VisionEngine {
  return {
    async load() {
      return { ok: true };
    },
    async caption(path: string) {
      const id = (path.split("/").pop() ?? path).replace(".jpg", "");
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
      resizedPath: "/photo/a.jpg",
      ownsResizedPath: false,
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

/**
 * 013 — 캡션 전에 줄인다.
 *
 * 계약: specs/013-photo-resize-caption/contracts/resize.md 「호출자 쪽 계약」
 *       specs/013-photo-resize-caption/data-model.md 「생애」
 */
describe("013 — resize를 주입하지 않으면 011 이전과 동일하다 (하위 호환)", () => {
  it("resize를 안 주면 원본 경로로 캡션한다", async () => {
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

    await captionAll(engine, FIVE.slice(0, 1), 1, resolve);

    expect(seen).toEqual(["/photo/a.jpg"]);
  });
});

describe("013 US2 — 리사이즈 실패가 하루를 무너뜨리지 않는다 (FR-010·011)", () => {
  it("리사이즈가 실패한 장은 건너뛰고 나머지는 계속 캡션한다", async () => {
    const failsOn = "c";
    const resize: ResizeExecutor = async (sourcePath) => {
      if (sourcePath.includes(failsOn)) return { ok: false };
      return { ok: true, path: sourcePath };
    };

    const vision = await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize);

    expect(vision?.considered).toBe(5);
    expect(vision?.captions).toHaveLength(4);
    expect(vision?.captions.map((c) => c.photoId)).toEqual(["a", "b", "d", "e"]);
  });

  it("리사이즈가 던져도(계약 위반) 나머지는 계속 캡션한다", async () => {
    const throwsOn = "b";
    const resize: ResizeExecutor = async (sourcePath) => {
      if (sourcePath.includes(throwsOn)) throw new Error("리사이즈 무너짐");
      return { ok: true, path: sourcePath };
    };

    const vision = await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize);

    expect(vision?.captions).toHaveLength(4);
  });

  it("리사이즈 실패로 건너뛴 장의 내용을 지어내지 않는다", async () => {
    const resize: ResizeExecutor = async (sourcePath) => {
      if (sourcePath.includes("a")) return { ok: false };
      return { ok: true, path: sourcePath };
    };

    const vision = await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize);
    const texts = vision?.captions.map((c) => c.text) ?? [];

    for (const text of texts) {
      expect(text).not.toMatch(/설명할 수 없|알 수 없|보지 못|실패/);
    }
  });
});

/**
 * 017 이전(013 시절) — **모든 장을 즉시 지웠다.** 017부터는 캡션에 **성공한**
 * 장만 삭제를 미룬다(contracts/photo-preservation.md P1·P2) — 아래
 * "017 — 성공한 캡션은 즉시 지우지 않는다" 절이 새 계약이다.
 */
describe("017 — 성공한 캡션은 즉시 지우지 않는다 (contracts/photo-preservation.md P1)", () => {
  it("캡션 성공한 장의 사본은 지우기가 불리지 않는다", async () => {
    const cleaned: string[] = [];
    const resize: ResizeExecutor = async (sourcePath) => ({
      ok: true,
      path: sourcePath.replace("/photo/", "/resized/"),
    });

    await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize, async (path) => {
      cleaned.push(path);
    });

    expect(cleaned).toHaveLength(0);
  });

  it("캡션 성공한 장의 PhotoCaption.resizedPath가 실제 리사이즈 경로와 일치한다", async () => {
    const resize: ResizeExecutor = async (sourcePath) => ({
      ok: true,
      path: sourcePath.replace("/photo/", "/resized/"),
    });

    const vision = await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize);

    expect(vision?.captions.map((c) => c.resizedPath)).toEqual(
      FIVE.map((p) => `/resized/${p.id}.jpg`),
    );
    // 실제로 새 사본이 만들어졌으므로 이 기능이 지우기를 관리한다.
    expect(vision?.captions.every((c) => c.ownsResizedPath === true)).toBe(true);
  });
});

describe("017 — 캡션이 실패한 장의 사본은 즉시 지운다 (contracts/photo-preservation.md P2)", () => {
  it("캡션 결과가 빈 문자열인 장은 지우기가 불린다", async () => {
    const cleaned: string[] = [];
    const resize: ResizeExecutor = async (sourcePath) => ({
      ok: true,
      path: sourcePath.replace("/photo/", "/resized/"),
    });

    await captionAll(engineWith(["c"]), FIVE, 5, resolve, undefined, resize, async (path) => {
      cleaned.push(path);
    });

    // c만 캡션 실패 → c의 사본만 즉시 지워진다. 나머지 넷은 미뤄진다.
    expect(cleaned).toEqual(["/resized/c.jpg"]);
  });

  it("엔진이 던진 장도 캡션 실패로 취급해 즉시 지운다", async () => {
    const cleaned: string[] = [];
    const resize: ResizeExecutor = async (sourcePath) => ({
      ok: true,
      path: sourcePath.replace("/photo/", "/resized/"),
    });

    await captionAll(engineWith([], ["b"]), FIVE, 5, resolve, undefined, resize, async (path) => {
      cleaned.push(path);
    });

    expect(cleaned).toEqual(["/resized/b.jpg"]);
  });

  it("리사이즈에 실패한 장은 지우기를 부르지 않는다 — 지울 사본이 없다", async () => {
    const cleaned: string[] = [];
    const resize: ResizeExecutor = async (sourcePath) => {
      if (sourcePath.includes("a")) return { ok: false };
      return { ok: true, path: sourcePath.replace("/photo/", "/resized/") };
    };

    await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize, async (path) => {
      cleaned.push(path);
    });

    expect(cleaned).toHaveLength(0);
    expect(cleaned).not.toContain("/resized/a.jpg");
  });

  /**
   * ★ C1·FR-006 — 원본과 같은 경로를 그대로 쓴 경우(이미 작아 리사이즈를 건너뜀)는
   * 지우지 않는다. 원본을 지우는 경로가 있으면 안 된다(회귀 확인).
   */
  it("이미 작아 원본 경로를 그대로 쓴 장은 지우지 않는다", async () => {
    const cleaned: string[] = [];
    const resize: ResizeExecutor = async (sourcePath) => ({ ok: true, path: sourcePath });

    await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize, async (path) => {
      cleaned.push(path);
    });

    expect(cleaned).toHaveLength(0);
  });

  /**
   * ★ 2026-10-10 — 070의 e2e 표본 사진(960px)이 전부 1024px 미만이라 이 분기를
   * 타자 051 캐러셀의 `entry.photos`가 통째로 비어 그날 사진이 하나도 안 보였다.
   * **캡션이 성공했으면 원본 경로라도 표시용으로 싣는다** — 지우기 관리 대상이
   * 아니라는 것(`ownsResizedPath: false`)과 "화면에 안 보인다"는 서로 다른 사실이다.
   */
  it("이미 작아 원본 경로를 그대로 쓴 장도 표시용 resizedPath를 싣되 지우기 대상은 아니다", async () => {
    const resize: ResizeExecutor = async (sourcePath) => ({ ok: true, path: sourcePath });

    const vision = await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize);

    for (const caption of vision?.captions ?? []) {
      expect(caption.resizedPath).toBe(`/photo/${caption.photoId}.jpg`);
      expect(caption.ownsResizedPath).toBe(false);
    }
  });

  it("cleanup을 안 주입해도 정상 동작한다", async () => {
    const resize: ResizeExecutor = async (sourcePath) => ({
      ok: true,
      path: sourcePath.replace("/photo/", "/resized/"),
    });

    const vision = await captionAll(engineWith(), FIVE, 5, resolve, undefined, resize);

    expect(vision?.captions).toHaveLength(5);
  });

  it("그만두어도(E5) 이미 실패로 확정된 장의 지우기는 그대로 불린다", async () => {
    const cleaned: string[] = [];
    const cancel = { cancelled: false };
    let count = 0;
    const engine: VisionEngine = {
      async load() {
        return { ok: true };
      },
      async caption() {
        count += 1;
        if (count === 3) cancel.cancelled = true;
        return { text: "" }; // 실패로 확정되는 장들
      },
      async stop() {},
      async unload() {},
    };
    const resize: ResizeExecutor = async (sourcePath) => ({
      ok: true,
      path: sourcePath.replace("/photo/", "/resized/"),
    });

    const vision = await captionAll(engine, FIVE, 5, resolve, cancel, resize, async (path) => {
      cleaned.push(path);
    });

    expect(vision).toBeNull();
    // 세 장 모두 캡션 실패(빈 문자열)이므로 각각 즉시 지워진다.
    expect(cleaned).toHaveLength(3);
  });

  it("캡션이 그 장에서 예외를 던져도 지우기는 불린다", async () => {
    const cleaned: string[] = [];
    const engine: VisionEngine = {
      async load() {
        return { ok: true };
      },
      async caption() {
        throw new Error("엔진이 무너짐");
      },
      async stop() {},
      async unload() {},
    };
    const resize: ResizeExecutor = async (sourcePath) => ({
      ok: true,
      path: sourcePath.replace("/photo/", "/resized/"),
    });

    await captionAll(engine, FIVE.slice(0, 1), 1, resolve, undefined, resize, async (path) => {
      cleaned.push(path);
    });

    expect(cleaned).toEqual(["/resized/a.jpg"]);
  });
});

/**
 * 015 — 사진 전환 신호 (onPhotoStart).
 *
 * 계약: specs/015-writing-monologue/contracts/photo-advance.md
 *       specs/015-writing-monologue/data-model.md 「사진 전환 신호」
 *
 * **`"vision"`이 나가는 유일한 경로다.** `on-device.ts`는 별도로 보내지
 * 않는다(C1 정정) — 이 콜백의 호출 횟수가 그대로 진행 신호의 근거가 된다
 * (SC-006).
 */
describe("015 — onPhotoStart (SC-006)", () => {
  it("사진 1장 → 1번 불린다", async () => {
    const calls: unknown[] = [];
    await captionAll(
      engineWith(),
      FIVE.slice(0, 1),
      1,
      resolve,
      undefined,
      undefined,
      undefined,
      (...args) => calls.push(args),
    );

    expect(calls).toHaveLength(1);
  });

  it("사진 3장 → 3번 불린다", async () => {
    const calls: unknown[] = [];
    await captionAll(
      engineWith(),
      FIVE.slice(0, 3),
      3,
      resolve,
      undefined,
      undefined,
      undefined,
      (...args) => calls.push(args),
    );

    expect(calls).toHaveLength(3);
  });

  it("사진 0장 → 호출 자체가 안 일어난다", async () => {
    const calls: unknown[] = [];
    await captionAll(engineWith(), [], 0, resolve, undefined, undefined, undefined, (...args) =>
      calls.push(args),
    );

    expect(calls).toHaveLength(0);
  });

  it("인자 없이 호출된다 — 순번을 넘기지 않는다", async () => {
    let receivedArgs: unknown[] | undefined;
    await captionAll(
      engineWith(),
      FIVE.slice(0, 1),
      1,
      resolve,
      undefined,
      undefined,
      undefined,
      (...args) => {
        receivedArgs = args;
      },
    );

    expect(receivedArgs).toEqual([]);
  });

  it("그만두기로 3장 중 2번째에서 중단되면 2번만 불린다", async () => {
    const cancel = { cancelled: false };
    let count = 0;
    const engine: VisionEngine = {
      async load() {
        return { ok: true };
      },
      async caption() {
        count += 1;
        if (count === 2) cancel.cancelled = true;
        return { text: "읽은 것" };
      },
      async stop() {},
      async unload() {},
    };

    const calls: unknown[] = [];
    const vision = await captionAll(
      engine,
      FIVE.slice(0, 3),
      3,
      resolve,
      cancel,
      undefined,
      undefined,
      (...args) => calls.push(args),
    );

    expect(vision).toBeNull();
    expect(calls).toHaveLength(2);
  });

  it("onPhotoStart를 안 넘겨도 기존 동작이 그대로다 (옵셔널 확장)", async () => {
    const vision = await captionAll(engineWith(), FIVE, 5, resolve);
    expect(vision?.captions).toHaveLength(5);
  });
});

/* ═══════════════════ 128 — 문서류 판정 (contracts/detection.md) ═══════════════════ */

/** 장마다 정해진 묘사를 돌려주는 엔진. 표본에서 옮긴 꼴(내용 없이). */
function engineSaying(texts: Record<string, string>): VisionEngine & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    async load() {
      return { ok: true };
    },
    async caption(path: string) {
      const id = (path.split("/").pop() ?? path).replace(".jpg", "");
      asked.push(id);
      return { text: texts[id] ?? `The image shows ${id}.` };
    },
    async stop() {},
    async unload() {},
  };
}

const copyResize: ResizeExecutor = async (sourcePath) => ({
  ok: true,
  path: sourcePath.replace("/photo/", "/resized/"),
});

describe("128 D3 — 읽은 뒤: 문서 묘사는 재료에서 빠진다", () => {
  it.each<[string, string]>([
    ["문답 꼴", "**Question:** What is the total amount?\n\n**Answer:** 1,000 won."],
    ["앞 공백·# 꼴", "  ## Question: What is this?\nAnswer: a form."],
    ["소문자 문답", "question: what? answer: that."],
    ["receipt", "A paper Receipt on a table."],
    ["invoices", "Two invoices lying flat."],
    ["document", "A DOCUMENT with a stamp."],
    ["transaction", "A record of a transaction."],
  ])("%s → 빠지고 unreadable 1, 사본을 지운다", async (_, text) => {
    const cleaned: string[] = [];
    const vision = await captionAll(
      engineSaying({ b: text }),
      FIVE.slice(0, 2),
      2,
      resolve,
      undefined,
      copyResize,
      async (p) => {
        cleaned.push(p);
      },
    );
    expect(vision?.captions.map((c) => c.photoId)).toEqual(["a"]);
    expect(vision?.unreadable).toBe(1);
    expect(vision?.considered).toBe(2);
    expect(cleaned).toEqual(["/resized/b.jpg"]);
  });

  it.each<[string, string]>([
    [
      "table(호텔방 묘사 — 실측 오탐 후보)",
      "The image shows a hotel room with a bed, a table with a vase.",
    ],
    ["text", "A sign with text on a wall."],
    ["paper", "A paper crane on a desk."],
    ["낱말 일부(documentary)", "A documentary poster."],
    ["문답이 중간에", "A board that says Question: why?"],
  ])("%s → 남는다", async (_, text) => {
    const vision = await captionAll(engineSaying({ a: text }), FIVE.slice(0, 1), 1, resolve);
    expect(vision?.captions).toHaveLength(1);
    expect(vision?.unreadable).toBe(0);
  });

  it("빈 묘사는 실패한 장이지 거른 장이 아니다 (D4)", async () => {
    const vision = await captionAll(engineSaying({ a: "" }), FIVE.slice(0, 1), 1, resolve);
    expect(vision?.captions).toHaveLength(0);
    expect(vision?.unreadable).toBe(0);
  });

  it("그만두면 종전대로 null (D5)", async () => {
    const cancel = { cancelled: true };
    const vision = await captionAll(engineSaying({}), FIVE, 5, resolve, cancel);
    expect(vision).toBeNull();
  });
});

describe("128 D2 — 읽기 전: 화면 캡처는 묘사하지 않는다", () => {
  const shot = (id: string, extra: Partial<Photo>): Photo => ({ ...photo(id, 9), ...extra });

  it.each<[string, Partial<Photo>]>([
    ["Screenshot_ 이름", { filename: "Screenshot_20261119_165537.jpg" }],
    ["소문자 screenshot 이름", { filename: "screenshot-1.png" }],
    ["세로 2.17", { width: 1440, height: 3120 }],
    ["세로 정확히 2", { width: 1000, height: 2000 }],
  ])("%s → 경로·리사이즈·묘사를 부르지 않고 unreadable 1", async (_, extra) => {
    const resolved: string[] = [];
    const resized: string[] = [];
    const engine = engineSaying({});
    const vision = await captionAll(
      engine,
      [shot("s", extra)],
      1,
      async (p) => {
        resolved.push(p.id);
        return `/photo/${p.id}.jpg`;
      },
      undefined,
      async (src) => {
        resized.push(src);
        return { ok: true, path: src };
      },
    );
    expect(resolved).toEqual([]);
    expect(resized).toEqual([]);
    expect(engine.asked).toEqual([]);
    expect(vision?.unreadable).toBe(1);
    expect(vision?.captions).toHaveLength(0);
  });

  it.each<[string, Partial<Photo>]>([
    ["가로 파노라마", { width: 4000, height: 1000 }],
    ["카메라 16:9 세로", { width: 2252, height: 4000 }],
    ["크기 모름", {}],
    ["가로 0", { width: 0, height: 3000 }],
    ["이름이 Screenshot을 품기만", { filename: "MyScreenshot.jpg" }],
  ])("%s → 종전대로 읽는다", async (_, extra) => {
    const engine = engineSaying({});
    const vision = await captionAll(engine, [shot("s", extra)], 1, resolve);
    expect(engine.asked).toEqual(["s"]);
    expect(vision?.unreadable).toBe(0);
    expect(vision?.captions).toHaveLength(1);
  });
});

describe("128 D1 — 판정은 caption.ts 한 곳, 기준은 바깥에서 못 본다", () => {
  const { readFileSync, readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const RAW = readFileSync(join(__dirname, "../../src/vision/caption.ts"), "utf8");
  const CODE = strip(RAW);

  it("판정 낱말이 caption.ts 코드에 있다", () => {
    for (const w of ["receipt", "invoice", "document", "transaction"]) expect(CODE).toContain(w);
  });

  it("판정 기준을 export하지 않는다", () => {
    expect(CODE).not.toMatch(/export\s+(const|function)\s+\w*(DOCUMENT|SCREEN|Document|Screen)/);
    // 값 export는 captionAll 하나뿐이다(나머지는 타입)
    expect(CODE.match(/^export (?!type |async function captionAll)/gm)).toBeNull();
  });

  it("「사람이 정한 값」이라고 적혀 있다", () => {
    expect(RAW).toMatch(/사람이 정한 값/);
  });

  it("src/ 다른 곳에 판정 낱말 정규식이 없다", () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(n)) files.push(p);
      }
    };
    walk(join(__dirname, "../../src"));
    const others = files.filter(
      (f) =>
        !f.endsWith(join("vision", "caption.ts")) &&
        /invoice|transaction/i.test(strip(readFileSync(f, "utf8"))),
    );
    expect(others).toEqual([]);
  });
});

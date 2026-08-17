/**
 * generate() 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md 「추론 어댑터 확장」
 *       specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 I의 방어선이다.**
 *
 * ⚠️ **005에서 이 파일의 전제 하나가 바뀌었다.** 002는 「두 어댑터가 늘
 * `not-implemented`를 반환한다」를 검증했다. 005가 실제 생성을 붙였으므로 그 단언은
 * 더 이상 참이 아니며, **바뀌는 것이 목적이지 사고가 아니다**(tasks.md T034).
 *
 * 함께 고친 것: 요청의 시각 설정을 `"quick"`에서 `"none"`으로 바꿨다. `"quick"`은
 * 005 FR-022가 막는 값이 됐고, 그대로 두면 새 코드에서도 `not-implemented`가 나와
 * **테스트가 「우연히」 통과한다** — 통과의 이유가 바뀐 것을 놓치게 된다.
 *
 * **바뀌지 않은 것: 「실패 결과 어디에도 텍스트가 없다」**(FR-016, SC-004). 002가 세운
 * 이 불변식은 005에서도 그대로이며, 갈래가 늘었으므로 오히려 더 넓게 검증한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildRequest } from "../../src/diary/request";
import type { DiaryRequest, VisionSetting } from "../../src/diary/types";
import { createDesktopServerBackend } from "../../src/inference/desktop-server";
import { createOnDeviceBackend } from "../../src/inference/on-device";
import type { GenerationEngine } from "../../src/inference/engine-port";
import type {
  GenerationFailure,
  InferenceBackend,
} from "../../src/inference/types";
import { emptyDay, richDay, unknownDay } from "../../src/signals/fake";
import type { DaySignals } from "../../src/signals/types";

const GOOD_KO = "오늘 주인은 어딘가로 나섰다. 사진 세 장이 남았고 나는 그것만 안다.";

/**
 * 요청 하나를 만든다. buildRequest를 거쳐 실제 경로와 같은 모양을 쓴다.
 *
 * **시각 설정 기본값이 `"none"`이다** — 005 FR-022가 나머지 둘을 막으므로, 생성 경로를
 * 보려면 `none`이어야 한다.
 */
function requestFor(
  day: DaySignals = richDay("2026-08-12"),
  vision: VisionSetting = "none",
): DiaryRequest {
  const result = buildRequest(day, "quiet", vision);
  if (!result.ok) throw new Error("테스트 준비 실패: 요청을 만들지 못했다");
  return result.request;
}

/** 늘 통과할 글을 돌려주는 엔진 대역 */
const goodEngine = (): GenerationEngine => ({
  async load() {
    return { ok: true };
  },
  async run() {
    return { text: GOOD_KO, ending: { kind: "eos" } };
  },
  async stop() {},
  async unload() {},
});

describe("005 — 온디바이스가 실제로 생성한다 (FR-001·004) ★", () => {
  it("엔진이 있으면 일기가 나온다", async () => {
    // **002 이후 처음이다.** 이 어댑터는 지금까지 not-implemented만 돌려줬다.
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    const result = await backend.generate(requestFor());

    expect(result).toEqual({ text: GOOD_KO });
  });

  it("신호가 비어도 생성한다 (002 FR-005a·b)", async () => {
    // 휴대폰이 아무것도 보지 못한 것 자체가 일기의 내용이 된다(원칙 II).
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    expect(await backend.generate(requestFor(emptyDay("2026-08-12")))).toEqual({
      text: GOOD_KO,
    });
    expect(await backend.generate(requestFor(unknownDay("2026-08-12")))).toEqual({
      text: GOOD_KO,
    });
  });
});

describe("005 — 엔진이 없으면 정직하게 말한다 (원칙 I)", () => {
  // 시뮬레이터·웹에는 네이티브 모듈이 없다. **그럴듯한 텍스트를 만들지 않는다.**
  it("backend-unavailable을 반환한다", async () => {
    const result = await createOnDeviceBackend(async () => ({})).generate(requestFor());

    expect("text" in result).toBe(false);
    if ("kind" in result) expect(result.kind).toBe("backend-unavailable");
  });

  it("데스크톱 어댑터는 아직 not-implemented다", async () => {
    // 데스크톱 경로는 서버 프로토콜이 서야 돈다(research §8). 없는 것을 없다고 말한다.
    const backend = createDesktopServerBackend("http://localhost:8080", async () => true);

    const result = await backend.generate(requestFor());

    expect("text" in result).toBe(false);
  });
});

describe("005 — 시각 설정을 조용히 낮추지 않는다 (FR-022, SC-009)", () => {
  it("none이면 생성이 진행된다", async () => {
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    expect(await backend.generate(requestFor(richDay("2026-08-12"), "none"))).toEqual({
      text: GOOD_KO,
    });
  });

  it.each(["quick", "detailed"] as const)(
    "%s면 사진을 보지 않은 일기가 대신 나오지 않는다",
    async (vision) => {
      // **`none`으로 조용히 낮추면 사용자가 요청하지 않은 일기가 나온다.**
      const backend = createOnDeviceBackend(async () => ({}), goodEngine());

      const result = await backend.generate(requestFor(richDay("2026-08-12"), vision));

      expect("text" in result).toBe(false);
      if ("kind" in result) expect(result.kind).toBe("not-implemented");
    },
  );

  it("막힌 요청은 모델을 열지도 않는다", async () => {
    // 열고 닫는 것은 비싸다. 어차피 못 할 일이면 시작하지 않는다.
    let loaded = false;
    const engine: GenerationEngine = {
      ...goodEngine(),
      async load() {
        loaded = true;
        return { ok: true };
      },
    };

    await createOnDeviceBackend(async () => ({}), engine).generate(
      requestFor(richDay("2026-08-12"), "detailed"),
    );

    expect(loaded).toBe(false);
  });
});

describe("실패 결과에 텍스트가 없다 (002 FR-016, SC-004) — 원칙 I의 방어선", () => {
  /**
   * `GenerationFailure`의 어느 갈래에도 `text` 필드가 없어야 한다.
   * 있으면 그 순간 가짜 일기가 만들어질 자리가 생긴다.
   *
   * **005가 갈래를 넷 더했고, 전부 같은 불변식을 지킨다.**
   */
  const failures: readonly GenerationFailure[] = [
    { kind: "not-implemented" },
    { kind: "backend-unavailable", reason: "네이티브 모듈이 없다" },
    { kind: "generation-failed", reason: "추론 중 중단됐다" },
    // ─── 005가 더한 갈래 ───
    { kind: "model-load-failed", reason: "not-found" },
    { kind: "rejected", why: "empty" },
    { kind: "rejected", why: "echo" },
    { kind: "rejected", why: "language" },
    { kind: "rejected", why: "unfinished" },
    { kind: "timed-out" },
    { kind: "interrupted" },
  ];

  it.each(failures)("$kind 갈래에 text 필드가 없다", (failure) => {
    expect("text" in failure).toBe(false);
    expect(Object.keys(failure)).not.toContain("text");
  });

  it("거부 갈래가 거부된 글을 실어 나르지 않는다 (005 FR-017c)", () => {
    // `why`는 갈래일 뿐 글이 아니다. 글을 담으면 그것이 `text`가 새는 경로가 된다.
    const rejected: GenerationFailure = { kind: "rejected", why: "echo" };

    expect(Object.keys(rejected).sort()).toEqual(["kind", "why"]);
  });

  it("실패의 reason은 원인이지 일기 본문이 아니다", () => {
    // reason이 있는 갈래도 그것은 진단용 사실이지 사용자가 읽을 일기가 아니다.
    // 호출자가 reason을 일기 자리에 넣지 않도록 타입이 text와 이름을 달리한다.
    const failure: GenerationFailure = { kind: "generation-failed", reason: "중단됨" };

    expect(Object.keys(failure).sort()).toEqual(["kind", "reason"]);
  });

  it("판정이 거부한 결과에 본문이 없다", async () => {
    const rejecting: GenerationEngine = {
      ...goodEngine(),
      async run() {
        return { text: "이 글은 거부되어야 한다", ending: { kind: "length" } };
      },
    };
    const backend = createOnDeviceBackend(async () => ({}), rejecting);

    const result = await backend.generate(requestFor());

    expect(JSON.stringify(result)).not.toContain("이 글은 거부되어야 한다");
    expect("text" in result).toBe(false);
  });
});

describe("어느 어댑터도 예외를 던지지 않는다 (002 FR-019)", () => {
  const backends: readonly { name: string; make: () => InferenceBackend }[] = [
    { name: "온디바이스(엔진 있음)", make: () => createOnDeviceBackend(async () => ({}), goodEngine()) },
    { name: "온디바이스(엔진 없음)", make: () => createOnDeviceBackend(async () => ({})) },
    {
      name: "데스크톱 서버",
      make: () => createDesktopServerBackend("http://localhost:8080", async () => true),
    },
  ];

  it.each(backends)("$name: 실패는 값이다", async ({ make }) => {
    await expect(make().generate(requestFor())).resolves.toBeDefined();
  });

  it.each(backends)("$name: isAvailable()은 001 그대로 남아 있다", async ({ make }) => {
    const backend = make();

    expect(typeof backend.isAvailable).toBe("function");
    expect(await backend.isAvailable()).toEqual({ kind: "loaded" });
  });

  it("엔진이 던져도 값으로 돌아온다", async () => {
    const throwing: GenerationEngine = {
      ...goodEngine(),
      async run() {
        throw new Error("네이티브가 무너졌다");
      },
    };
    const backend = createOnDeviceBackend(async () => ({}), throwing);

    const result = await backend.generate(requestFor());

    expect("text" in result).toBe(false);
    if ("kind" in result) expect(result.kind).toBe("generation-failed");
  });
});

describe("요청에 맞춘 그럴듯한 답을 만들지 않는다 (원칙 I)", () => {
  it("엔진이 없으면 어떤 요청이든 같은 상태를 돌려준다", async () => {
    // 미리 만들어 둔 응답도, 요청을 보고 지어낸 텍스트도 없다.
    const backend = createOnDeviceBackend(async () => ({}));

    const forRich = await backend.generate(requestFor(richDay("2026-08-12")));
    const forEmpty = await backend.generate(requestFor(emptyDay("2026-08-13")));

    expect(forRich).toEqual(forEmpty);
    expect("text" in forRich).toBe(false);
  });
});

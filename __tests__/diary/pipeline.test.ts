/**
 * 파이프라인 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/pipeline.md 「검증 표」
 *
 * **이 기능에서는 항상 `generation`에서 멈춘다.** 추론이 `not-implemented`를 반환하기
 * 때문이며, 그것이 정상이다. 파이프라인이 거기까지 도달하는 것 자체가 검증 대상이다.
 *
 * `now`를 인자로 받으므로 03:59와 04:00 경계를 자유롭게 만들 수 있다. 테스트가 시간에
 * 의존하지 않는다(FR-018a).
 */

import { createPipeline } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { Character, DiaryEntry, VisionSetting } from "../../src/diary/types";
import type { GenerationResult, InferenceBackend, ProgressStage } from "../../src/inference/types";
import { partiallyUnknownDay, richDay } from "../../src/signals/fake";
import type { DaySignals } from "../../src/signals/types";
import type { DayDate } from "../../src/config/day-boundary";
import type { PhotoVision } from "../../src/vision/types";

/** 하루가 닫힌 뒤의 시각. 2026-08-12는 2026-08-13 04:00에 닫힌다. */
const AFTER_CLOSE = new Date("2026-08-13T06:00:00");
const DAY: DayDate = "2026-08-12";

/** 추론 대역. 이 기능의 실제 어댑터와 같이 not-implemented를 돌려준다. */
function backendReturning(result: GenerationResult): InferenceBackend {
  return {
    location: "on-device",
    async isAvailable() {
      return { kind: "loaded" };
    },
    async generate() {
      return result;
    },
  };
}

const notImplemented = () => backendReturning({ kind: "not-implemented" });
const generating = (text: string) => backendReturning({ text });

/** 파이프라인 하나를 대역과 함께 만든다. */
function makePipeline(
  overrides: {
    backend?: InferenceBackend;
    store?: ReturnType<typeof memoryStore>;
    signals?: (day: DayDate) => Promise<DaySignals | null>;
    /** 003이 더한 단계. 주지 않으면 건너뛴다 — 002의 기존 테스트가 그대로 돈다 */
    isModelReady?: (character: Character) => Promise<boolean>;
    /** 017 — 저장 실패 시 usedPhotos의 사본을 정리한다. 주지 않으면 건너뛴다 */
    cleanupResizedPhoto?: (path: string) => Promise<void>;
  } = {},
) {
  const store = overrides.store ?? memoryStore();
  const pipeline = createPipeline({
    backend: overrides.backend ?? notImplemented(),
    store,
    loadSignals: overrides.signals ?? (async (day) => partiallyUnknownDay(day)),
    isModelReady: overrides.isModelReady,
    cleanupResizedPhoto: overrides.cleanupResizedPhoto,
  });
  return { pipeline, store };
}

function inputFor(
  overrides: {
    day?: DayDate;
    now?: Date;
    character?: Character;
    vision?: VisionSetting;
    seen?: PhotoVision;
  } = {},
) {
  return {
    day: overrides.day ?? DAY,
    now: overrides.now ?? AFTER_CLOSE,
    character: "character" in overrides ? overrides.character : ("quiet" as Character),
    vision: overrides.vision ?? ("quick" as VisionSetting),
    ...("seen" in overrides ? { seen: overrides.seen } : {}),
  };
}

describe("단계별 실패가 해당 stage로 보고된다 (FR-019, SC-006)", () => {
  // contracts/pipeline.md 「검증 표」 6행
  it("하루가 아직 안 닫힘 → day-not-closed (FR-018c, SC-010)", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor({ now: new Date("2026-08-13T03:59:00") }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("day-not-closed");
  });

  it("신호를 가져오지 못함 → signals", async () => {
    const { pipeline } = makePipeline({ signals: async () => null });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("signals");
  });

  it("캐릭터 없음 → request-build (FR-007)", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor({ character: undefined }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("request-build");
  });

  it("생성이 not-implemented → generation (FR-015)", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("generation");
  });

  it("저장 실패 → storage (FR-024)", async () => {
    const store = memoryStore({ failWith: "저장 공간이 없다" });
    const { pipeline } = makePipeline({ backend: generating("일기 본문"), store });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("storage");
  });

  /**
   * 006 FR-034 — **덮어썼다는 사실이 결과에 드러난다** (002 FR-023a).
   *
   * `store.save()`는 `overwrote`를 돌려주는데 파이프라인이 그것을 버리면 화면이 알 수
   * 없다. **조용히 덮어쓰면 사용자는 이전 일기가 사라진 줄도 모른다** — 온디바이스
   * 생성은 비용이 크고 사라진 일기는 되돌릴 수 없다.
   */
  it("처음 저장하면 overwrote가 false다 (006 FR-034)", async () => {
    const { pipeline } = makePipeline({ backend: generating("첫 일기") });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.overwrote).toBe(false);
  });

  it("같은 하루에 다시 쓰면 overwrote가 true다 (006 FR-034)", async () => {
    const store = memoryStore();
    const { pipeline } = makePipeline({ backend: generating("첫 일기"), store });

    await pipeline.run(inputFor());
    const second = await pipeline.run(inputFor());

    expect(second.ok).toBe(true);
    if (second.ok) expect(second.overwrote).toBe(true);
  });

  /**
   * 006 FR-012a — **저장 실패인데 글은 있다.**
   *
   * 002가 「실패 갈래에 entry도 text도 없다」로 정한 것을 넓힌다. 금지된 것은
   * **지어낸 텍스트가 일기 자리에 들어가는 것**이었고, 여기 실린 글은 모델이 실제로
   * 생성하고 판정을 통과한 것이다.
   *
   * **`storage` 갈래에만 붙는다** — 6단계에 도달했다는 것 자체가 생성 성공을 뜻하기
   * 때문이다(5단계가 실패하면 6단계에 오지 않는다).
   */
  it("저장 실패 → storage에 생성된 entry가 실려 온다 (006 FR-012a)", async () => {
    const store = memoryStore({ failWith: "저장 공간이 없다" });
    const { pipeline } = makePipeline({ backend: generating("오늘 주인은 조용했다"), store });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("storage");
      // 30초를 들여 만든 글이다. 다시 생성해도 같은 글이 나오지 않는다.
      expect(result.entry).toBeDefined();
      expect(result.entry?.text).toBe("오늘 주인은 조용했다");
      expect(result.entry?.date).toBe(DAY);
    }
  });

  /**
   * 006 SC-008c의 뒷면 — **다른 실패 갈래에는 entry가 없다.**
   *
   * 이것이 002의 불변식이 살아 있다는 증거다. `storage`에만 붙는 이유가 「거기 도달했다는
   * 것이 생성 성공을 뜻하기 때문」이므로, 생성 전에 멈춘 갈래에 entry가 생기면 그 근거가
   * 무너진다.
   */
  it("생성 전에 멈춘 실패에는 entry가 없다 (002 FR-012 유지)", async () => {
    const cases = [
      // 신호 없음
      makePipeline({ signals: async () => null }),
      // 모델 미준비
      makePipeline({ isModelReady: async () => false }),
      // 생성 실패
      makePipeline({ backend: notImplemented() }),
    ];

    for (const { pipeline } of cases) {
      const result = await pipeline.run(inputFor());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.stage).not.toBe("storage");
        expect(result.entry).toBeUndefined();
      }
    }
  });

  it("전부 성공 → ok: true, entry", async () => {
    // 이 기능에서는 실제로 도달하지 않는 경로다. 길이 이어져 있는지만 확인한다.
    const { pipeline, store } = makePipeline({ backend: generating("오늘 주인은 조용했다") });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.text).toBe("오늘 주인은 조용했다");
      expect(result.entry.date).toBe(DAY);
      expect(result.entry.character).toBe("quiet");
    }
    expect(await store.has(DAY)).toBe(true);
  });

  it("실패에는 stage와 reason이 반드시 있다 — stage 없이 실패하는 경로가 없다", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBeDefined();
      expect(typeof result.reason).toBe("string");
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("하루 경계 — 닫히지 않은 하루는 거부된다 (FR-018c, SC-010)", () => {
  it("2026-08-13 03:59는 아직 안 닫혔다", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor({ now: new Date("2026-08-13T03:59:59") }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("day-not-closed");
  });

  it("2026-08-13 04:00이면 닫혔으므로 다음 단계로 넘어간다", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor({ now: new Date("2026-08-13T04:00:00") }));

    // day-not-closed를 지나 generation까지 갔다는 것이 확인 대상이다.
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("generation");
  });

  it("진행 중인 하루는 거부된다", async () => {
    // 012: 오늘 + 정오 이전이어야 거부된다. 정오 이후는 isDayWritable()이 true다.
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor({ now: new Date("2026-08-12T09:00:00") }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("day-not-closed");
  });

  it("닫히지 않은 하루는 신호도 가져오지 않는다 — 앞에서 멈춘다", async () => {
    let called = false;
    const { pipeline } = makePipeline({
      signals: async (day) => {
        called = true;
        return partiallyUnknownDay(day);
      },
    });

    // 012: 정오 이전이어야 앞에서 멈춘다.
    await pipeline.run(inputFor({ now: new Date("2026-08-12T09:00:00") }));
    expect(called).toBe(false);
  });
});

describe("중복 실행을 막는다 (FR-018d)", () => {
  /**
   * 온디바이스 추론은 오래 걸린다. 사용자가 여러 번 눌러도 한 번만 돌아야 한다.
   */
  it("같은 하루가 진행 중이면 already-running", async () => {
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    const slowBackend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        await blocked;
        return { kind: "not-implemented" };
      },
    };

    const { pipeline } = makePipeline({ backend: slowBackend });

    const first = pipeline.run(inputFor());
    const second = await pipeline.run(inputFor());

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.stage).toBe("already-running");

    release();
    await first;
  });

  it("다른 하루는 동시에 돌 수 있다", async () => {
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    const slowBackend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        await blocked;
        return { kind: "not-implemented" };
      },
    };

    const { pipeline } = makePipeline({ backend: slowBackend });

    const first = pipeline.run(inputFor({ day: "2026-08-12" }));
    release();
    const second = await pipeline.run(inputFor({ day: "2026-08-11" }));

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.stage).not.toBe("already-running");
    await first;
  });

  it("실패로 끝나도 진행 중에서 빠진다 — 다시 시도할 수 있다", async () => {
    // 빠지지 않으면 실패한 하루를 영영 다시 시도할 수 없다(contracts/pipeline.md).
    const { pipeline } = makePipeline();

    const first = await pipeline.run(inputFor());
    expect(first.ok).toBe(false);
    if (!first.ok) expect(first.stage).toBe("generation");

    const second = await pipeline.run(inputFor());
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.stage).toBe("generation");
  });

  it("성공으로 끝나도 진행 중에서 빠진다", async () => {
    const { pipeline } = makePipeline({ backend: generating("일기") });

    expect((await pipeline.run(inputFor())).ok).toBe(true);
    expect((await pipeline.run(inputFor())).ok).toBe(true);
  });

  it("진행 중 상태를 저장소에 남기지 않는다", async () => {
    // 남기면 앱이 죽었을 때 "영원히 생성 중"인 하루가 생긴다.
    const { pipeline, store } = makePipeline();
    await pipeline.run(inputFor());

    // 실패했으므로 저장소에 아무것도 남지 않아야 한다.
    expect(await store.listDays()).toEqual([]);
  });
});

describe("불변식 — 실패 시 일기를 만들지 않는다 (FR-012)", () => {
  it("생성이 실패하면 저장을 부르지 않는다 (FR-023b)", async () => {
    const store = memoryStore();
    await store.save({
      date: DAY,
      text: "지켜져야 할 기존 일기",
      character: "quiet",
      signalsUsed: richDay(DAY),
      createdAt: new Date("2026-08-13T05:00:00"),
    });

    const { pipeline } = makePipeline({ store });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    // 생성이 실패했으므로 기존 일기가 그대로 남아야 한다.
    expect((await store.load(DAY))?.text).toBe("지켜져야 할 기존 일기");
  });

  it("실패 결과에 entry가 없다 — 빈 본문의 일기를 만들지 않는다", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    expect("entry" in result).toBe(false);
  });

  it("실패 결과에 text가 없다 — 플레이스홀더가 일기 자리에 들어가지 않는다", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(inputFor());

    expect("text" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain("생성할 수 없");
  });
});

describe("파이프라인은 실행 시점을 판단하지 않는다 (FR-018a)", () => {
  /**
   * "지금이 만들 때인가"는 부르는 쪽의 몫이다. 파이프라인은 주어진 하루가 닫혔는지만 본다.
   * 그래야 앱을 열 때 부르든 나중에 백그라운드가 부르든 계약이 같다.
   */
  it("now를 인자로 받는다 — 스스로 현재 시각을 읽지 않는다", async () => {
    const { pipeline } = makePipeline();

    // 실제 현재 시각이 무엇이든 인자로 준 now만 본다.
    const closed = await pipeline.run(inputFor({ now: new Date("2030-01-01T00:00:00") }));
    const notClosed = await pipeline.run(inputFor({ now: new Date("2026-08-12T05:00:00") }));

    expect(closed.ok).toBe(false);
    if (!closed.ok) expect(closed.stage).toBe("generation");
    if (!notClosed.ok) expect(notClosed.stage).toBe("day-not-closed");
  });

  it("추론 어댑터를 스스로 고르지 않는다 — 주입받는다 (FR-017)", async () => {
    // 001의 select.ts가 고른 결과를 받는다. 파이프라인이 스스로 고르면
    // 헌법 원칙 I의 방어선이 둘로 갈라진다.
    let generateCalled = false;
    const spy: InferenceBackend = {
      location: "desktop-server",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        generateCalled = true;
        return { kind: "not-implemented" };
      },
    };

    const { pipeline } = makePipeline({ backend: spy });
    await pipeline.run(inputFor());

    expect(generateCalled).toBe(true);
  });
});

describe("생성된 일기는 근거를 담는다 (FR-011)", () => {
  it("signalsUsed에 생성에 쓰인 신호가 담긴다", async () => {
    const { pipeline } = makePipeline({ backend: generating("일기 본문") });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      const entry: DiaryEntry = result.entry;
      expect(entry.signalsUsed.date).toBe(DAY);
      expect(entry.signalsUsed.steps.kind).toBe("unknown");
    }
  });
});

/**
 * 003이 더한 단계 — 모델이 기기에 없으면 생성 앞에서 멈춘다 (D13, D14).
 *
 * 계약: specs/003-character-model-files/contracts/readiness.md
 */
describe("모델이 준비되지 않으면 생성을 시도하지 않는다 (003 FR-008)", () => {
  // D13
  it("준비되지 않은 캐릭터면 model-not-ready에서 멈춘다", async () => {
    const { pipeline } = makePipeline({ isModelReady: async () => false });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("model-not-ready");
  });

  it("준비되지 않았으면 추론을 부르지 않는다", async () => {
    let generateCalled = false;
    const spy: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        generateCalled = true;
        return { kind: "not-implemented" };
      },
    };

    const { pipeline } = makePipeline({ backend: spy, isModelReady: async () => false });
    await pipeline.run(inputFor());

    // 없는 모델로 추론을 시도하면 무너진다. 그 앞에서 막는 것이 이 단계의 존재 이유다.
    expect(generateCalled).toBe(false);
  });

  // D14 — 조용한 대체는 사용자가 고른 캐릭터를 배신하는 것이다 (FR-008a, SC-005)
  it("준비된 다른 캐릭터가 있어도 대신 쓰지 않는다", async () => {
    const asked: Character[] = [];
    const { pipeline } = makePipeline({
      isModelReady: async (character) => {
        asked.push(character);
        return false; // 고른 캐릭터만 없다
      },
    });

    const result = await pipeline.run(inputFor({ character: "quiet" }));

    expect(result.ok).toBe(false);
    // 고른 캐릭터 하나만 묻는다 — 다른 캐릭터를 훑어 대체재를 찾지 않는다
    expect(asked).toEqual(["quiet"]);
  });

  it("준비됐으면 생성까지 간다", async () => {
    const { pipeline } = makePipeline({ isModelReady: async () => true });

    const result = await pipeline.run(inputFor());

    // 003이 끝나도 generate()는 not-implemented다 (FR-009)
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("generation");
  });

  it("판정을 주지 않으면 이 단계를 건너뛴다 (002 그대로)", async () => {
    const { pipeline } = makePipeline();

    const result = await pipeline.run(inputFor());

    if (!result.ok) expect(result.stage).toBe("generation");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 005 — 실제 생성이 붙은 뒤의 파이프라인
 *
 * **위 테스트들은 대역이 `not-implemented`를 돌려주는 경우이며 그대로 유효하다.**
 * 여기서는 대역이 실제 글을 돌려줄 때 파이프라인이 끝까지 가는지 본다.
 * ══════════════════════════════════════════════════════════════════════════ */

describe("005 — 파이프라인이 처음으로 끝까지 간다 (FR-004) ★", () => {
  it("생성이 성공하면 ok: true로 끝난다", async () => {
    // **002 이후 처음이다.** 이 한 줄이 이 기능의 존재 증명이며, 지금까지 파이프라인은
    // 늘 generation에서 멈췄다.
    const { pipeline } = makePipeline({ backend: generating("조용한 하루였다.") });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.text).toBe("조용한 하루였다.");
  });

  it("생성된 일기가 저장된다", async () => {
    const { pipeline, store } = makePipeline({ backend: generating("조용한 하루였다.") });

    await pipeline.run(inputFor());

    const saved = await store.load(DAY);
    expect(saved).not.toBeNull();
    expect(saved?.text).toBe("조용한 하루였다.");
  });

  it("일기가 어느 신호를 보고 쓰였는지 함께 남는다 (002 FR-011)", async () => {
    const { pipeline } = makePipeline({ backend: generating("조용한 하루였다.") });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.signalsUsed.date).toBe(DAY);
  });
});

describe("005 — 실패하면 저장이 일어나지 않는다 (FR-020, SC-004b)", () => {
  /** 실패를 돌려주는 대역들 — 판정이 거부한 갈래를 어댑터가 이미 옮긴 모양이다 */
  const failures: GenerationResult[] = [
    { kind: "rejected", why: "empty" },
    { kind: "rejected", why: "echo" },
    { kind: "rejected", why: "language" },
    { kind: "rejected", why: "unfinished" },
    { kind: "interrupted" },
    { kind: "timed-out" },
    { kind: "model-load-failed", reason: "not-found" },
  ];

  it.each(failures)("$kind — 저장되지 않는다", async (failure) => {
    const { pipeline, store } = makePipeline({ backend: backendReturning(failure) });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("generation");
    expect(await store.load(DAY)).toBeNull();
  });

  it.each(failures)("$kind — 결과에 text가 없다 (002 FR-016)", async (failure) => {
    const { pipeline } = makePipeline({ backend: backendReturning(failure) });

    const result = await pipeline.run(inputFor());

    expect(JSON.stringify(result)).not.toContain('"text"');
  });

  it("실패해도 기존 일기가 그대로 있다 (002 FR-023b)", async () => {
    const store = memoryStore();
    const first = makePipeline({ backend: generating("먼저 쓴 일기"), store });
    await first.pipeline.run(inputFor());

    // 같은 하루를 다시 요청했는데 이번에는 거부됐다.
    const second = makePipeline({
      backend: backendReturning({ kind: "rejected", why: "echo" }),
      store,
    });
    const result = await second.pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    // **먼저 쓴 일기가 사라지지 않았다.** 생성을 시작하며 먼저 지웠다면 잃었을 것이다.
    expect((await store.load(DAY))?.text).toBe("먼저 쓴 일기");
  });
});

describe("005 — 하루에 일기는 하나다 (FR-020a, SC-004c)", () => {
  it("성공하면 기존 일기를 덮어쓴다", async () => {
    const store = memoryStore();

    await makePipeline({ backend: generating("첫 번째"), store }).pipeline.run(inputFor());
    await makePipeline({ backend: generating("두 번째"), store }).pipeline.run(inputFor());

    expect((await store.load(DAY))?.text).toBe("두 번째");
  });

  it("저장된 것을 생성 대신 다시 보여주지 않는다 (원칙 I)", async () => {
    // 두 번째 요청도 실제로 생성을 시도해야 한다 — 첫 결과를 재사용하면 원칙 I 위반이다.
    const store = memoryStore();
    let generateCalls = 0;

    const counting: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        generateCalls += 1;
        return { text: `생성 ${generateCalls}회차` };
      },
    };

    const { pipeline } = makePipeline({ backend: counting, store });
    await pipeline.run(inputFor());
    await pipeline.run(inputFor());

    expect(generateCalls).toBe(2);
    expect((await store.load(DAY))?.text).toBe("생성 2회차");
  });
});

/* ═══════════════ 011 — vision 단계 (FR-021) ═══════════════ */

/**
 * 계약: specs/011-photo-vision-summary/data-model.md 「파이프라인 단계가 하나 는다」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`generation`과 따로 두는 까닭**: 사용자가 할 일이 다르다.
 *
 * - `vision` 실패 → 「사진 보는 것을 준비하거나 설정을 바꿔라」
 * - `generation` 실패 → 「캐릭터를 준비하거나 다시 시도하라」
 *
 * 003이 `model-not-ready`를 따로 둔 것과 같은 판단이며, 뭉개면 002 FR-019(어느
 * 단계에서 멈췄는지 말한다)가 무의미해진다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("011 — vision 단계", () => {
  const failingVision: InferenceBackend = {
    location: "on-device",
    async isAvailable() {
      return { kind: "loaded" };
    },
    async generate() {
      return { kind: "vision-failed", reason: "not-ready" };
    },
  };

  it("★ 사진을 못 보면 vision 단계에서 멈춘다 — generation이 아니다", async () => {
    const { pipeline } = makePipeline({ backend: failingVision });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("vision");
      expect(result.reason).toContain("vision-failed");
    }
  });

  it("사진을 못 보면 저장하지 않는다 — 가짜 일기가 남지 않는다 (FR-021)", async () => {
    const { pipeline, store } = makePipeline({ backend: failingVision });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    expect(await store.listDays()).toEqual([]);
  });

  it("실패에 글이 없다 (002 FR-016)", async () => {
    const { pipeline } = makePipeline({ backend: failingVision });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.entry).toBeUndefined();
  });

  it("다른 생성 실패는 여전히 generation이다 — 뭉개지지 않는다", async () => {
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        return { kind: "generation-failed", reason: "무너졌다" };
      },
    };

    const { pipeline } = makePipeline({ backend });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("generation");
  });

  it("까닭이 세 갈래로 구분되어 전달된다 (FR-022)", async () => {
    for (const reason of ["not-ready", "failed", "cancelled"] as const) {
      const backend: InferenceBackend = {
        location: "on-device",
        async isAvailable() {
          return { kind: "loaded" };
        },
        async generate() {
          return { kind: "vision-failed", reason };
        },
      };

      const { pipeline } = makePipeline({ backend });
      const result = await pipeline.run(inputFor());

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain(reason);
    }
  });
});

/**
 * 012 — 파이프라인 게이트가 오늘을 열어준다.
 *
 * 계약: specs/012-today-diary/contracts/day-boundary.md §3 「파이프라인 게이트」
 *
 * ★ 이 기능에서 가장 위험한 배선 지점이다(research.md §9). 지금 게이트는
 * `isDayClosed()`만 보므로 오늘은 언제나 `day-not-closed`로 멈춘다. **"일기가
 * 생성됐다"만으로 통과시키지 않고, day-not-closed를 지나 다음 단계(여기서는
 * generation)까지 실제로 진행하는지 직접 검사한다**(009의 W-T1과 같은 방식).
 */
describe("012 — 정오 이후 오늘이 day-not-closed를 지나 진행한다 (contracts/day-boundary.md §3)", () => {
  const TODAY: DayDate = "2026-08-21";

  it("1. 오늘 + 정오 이전 → day-not-closed로 멈춘다 (FR-002)", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(
      inputFor({ day: TODAY, now: new Date("2026-08-21T11:59:00") }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("day-not-closed");
  });

  it("★ 2. 오늘 + 정오 이후 → day-not-closed를 지나 다음 단계(generation)로 진행한다 (FR-001, 이 계약의 핵심)", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(
      inputFor({ day: TODAY, now: new Date("2026-08-21T12:00:00") }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // day-not-closed가 아니라 그 뒤 단계(이 스위트의 대역은 not-implemented를
      // 반환하므로 generation)까지 도달했는지가 핵심이다.
      expect(result.stage).not.toBe("day-not-closed");
      expect(result.stage).toBe("generation");
    }
  });

  it("3. 어제(닫힘) + 아무 때나 → 지금과 동일하게 통과한다 (회귀 없음)", async () => {
    const { pipeline } = makePipeline();
    const result = await pipeline.run(
      inputFor({ day: "2026-08-20", now: new Date("2026-08-21T09:00:00") }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).not.toBe("day-not-closed");
      expect(result.stage).toBe("generation");
    }
  });
});

/**
 * 014 US2 — 제목이 판정 통과 후 사후 분리된다 (FR-006·007·009).
 *
 * **`judge()`는 이 테스트가 건드리지 않는다** — `generating()` 대역이 이미
 * `judge()`를 우회해 `{ text }`를 곧바로 파이프라인에 전달한다(002 이래의 구조).
 * 여기서 보는 것은 오직 `pipeline.ts`가 `generated.text`를 받은 뒤 `title`과
 * `text`(본문)로 어떻게 나누는가다.
 */
describe("014 — 제목이 사후 분리된다 (FR-006·007·009)", () => {
  it("제목 형식(첫 줄+빈 줄+본문)이면 title과 text가 나뉜다", async () => {
    const { pipeline } = makePipeline({
      backend: generating("조용한 하루\n\n오늘은 아무 일도 없었다."),
    });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.title).toBe("조용한 하루");
      expect(result.entry.text).toBe("오늘은 아무 일도 없었다.");
    }
  });

  it("제목 형식이 아니면 title 없이 전체가 text다(FR-009 — 거부되지 않는다)", async () => {
    const { pipeline } = makePipeline({
      backend: generating("오늘은 아무 일도 없었다. 그냥 하루가 지나갔다."),
    });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.title).toBeUndefined();
      expect(result.entry.text).toBe("오늘은 아무 일도 없었다. 그냥 하루가 지나갔다.");
    }
  });
});

/**
 * 017 — 사진 보존 판정 (contracts/photo-preservation.md P4).
 *
 * `generated.usedPhotos`가 있을 때, 저장 성공이면 `entry.photos`로 남고
 * 저장 실패면 정리된다 — 최종 지킴/지움 판정은 파이프라인이 저장 결과를
 * 확인한 뒤에만 일어난다(research.md §1).
 */
describe("017 — 사진 보존 판정 (contracts/photo-preservation.md P4)", () => {
  const usedPhotos = [
    { photoId: "a", takenAt: new Date("2026-08-12T08:00:00"), resizedPath: "/resized/a.jpg" },
    { photoId: "b", takenAt: new Date("2026-08-12T14:00:00"), resizedPath: "/resized/b.jpg" },
  ];

  function backendWithPhotos(text: string): InferenceBackend {
    return {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        return { text, usedPhotos };
      },
    };
  }

  it("저장 성공 시 entry.photos가 generated.usedPhotos를 그대로 담는다", async () => {
    const { pipeline } = makePipeline({ backend: backendWithPhotos("오늘 사진을 찍었다.") });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.photos).toEqual(usedPhotos);
    }
  });

  it("저장 실패 시 usedPhotos의 사본이 정리된다(cleanupResized 호출)", async () => {
    const store = memoryStore({ failWith: "저장 공간이 없다" });
    const cleaned: string[] = [];
    const { pipeline } = makePipeline({
      backend: backendWithPhotos("오늘 사진을 찍었다."),
      store,
      cleanupResizedPhoto: async (path) => {
        cleaned.push(path);
      },
    });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("storage");
    expect(cleaned.sort()).toEqual(["/resized/a.jpg", "/resized/b.jpg"]);
  });

  it("usedPhotos가 없으면(사진 안 본 생성) entry.photos도 없다", async () => {
    const { pipeline } = makePipeline({ backend: generating("사진 없는 하루였다.") });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.photos).toBeUndefined();
  });

  it("cleanupResizedPhoto를 주지 않아도 저장 실패가 정상 동작한다 (옵셔널)", async () => {
    const store = memoryStore({ failWith: "저장 공간이 없다" });
    const { pipeline } = makePipeline({ backend: backendWithPhotos("오늘 사진을 찍었다."), store });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("storage");
  });
});

/**
 * 017 US3 — 소요 시간이 entry로 옮겨진다 (contracts/elapsed-time.md).
 *
 * `generated.timing`이 있으면 `entry.timing`으로 그대로 옮겨진다 — 파이프라인은
 * 값을 가공하지 않는다.
 */
describe("017 — generated.timing이 entry.timing으로 옮겨진다", () => {
  it("timing이 있으면 그대로 entry.timing에 담긴다", async () => {
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        return { text: "오늘 하루를 보냈다.", timing: { visionMs: 1200, writingMs: 5400 } };
      },
    };

    const { pipeline } = makePipeline({ backend });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.timing).toEqual({ visionMs: 1200, writingMs: 5400 });
    }
  });

  it("timing이 없으면(사진 안 본 생성이라도 writingMs는 있어야 하지만, 방어로) entry.timing도 없다", async () => {
    const { pipeline } = makePipeline({ backend: generating("소요 시간 없는 생성.") });
    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.timing).toBeUndefined();
  });
});

/**
 * 017 US4 — 장소명 지오코딩 (contracts/place-name.md L2·L3·L4).
 *
 * 설정이 꺼지거나 좌표가 없으면 지오코딩 포트를 부르지 않는다. 켜져 있고
 * 좌표가 있으면 정확히 1회 호출되며, 결과가 화면(entry.placeName)과
 * 프롬프트(request) 양쪽에 같은 값으로 반영된다("두 개의 진실" 금지).
 */
describe("017 — 장소명 지오코딩 (contracts/place-name.md L2·L3·L4)", () => {
  function signalsWithPlace(): DaySignals {
    return {
      date: DAY,
      photos: { kind: "none" },
      places: {
        kind: "known",
        value: {
          trace: {
            visitCount: 1,
            approximateDistanceMeters: 0,
            representativeCoordinate: { latitude: 37.5665, longitude: 126.978 },
          },
          source: "photo-exif",
          photosWithLocation: 1,
          photosConsidered: 1,
        },
      },
      steps: { kind: "unknown", reason: "no-channel" },
      battery: { kind: "unknown", reason: "no-channel" },
      connectivity: { kind: "unknown", reason: "no-channel" },
    };
  }

  function signalsWithoutPlace(): DaySignals {
    return {
      date: DAY,
      photos: { kind: "none" },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "no-channel" },
      battery: { kind: "unknown", reason: "no-channel" },
      connectivity: { kind: "unknown", reason: "no-channel" },
    };
  }

  function makeGeocodingSpy(result: { kind: "known"; value: string } | { kind: "unknown" }) {
    const calls: unknown[] = [];
    return {
      calls,
      port: {
        async reverseGeocode(coordinate: unknown) {
          calls.push(coordinate);
          return result;
        },
      },
    };
  }

  it("설정 꺼짐이면 좌표가 있어도 지오코딩 포트가 호출되지 않는다", async () => {
    const { calls, port } = makeGeocodingSpy({ kind: "known", value: "서울 중구" });
    const pipeline = createPipeline({
      backend: generating("오늘 하루."),
      store: memoryStore(),
      loadSignals: async () => signalsWithPlace(),
      geocoding: port,
      geocodingEnabled: false,
    });

    await pipeline.run(inputFor());
    expect(calls).toHaveLength(0);
  });

  it("좌표가 없으면(none) 설정이 켜져 있어도 호출되지 않는다", async () => {
    const { calls, port } = makeGeocodingSpy({ kind: "known", value: "서울 중구" });
    const pipeline = createPipeline({
      backend: generating("오늘 하루."),
      store: memoryStore(),
      loadSignals: async () => signalsWithoutPlace(),
      geocoding: port,
      geocodingEnabled: true,
    });

    await pipeline.run(inputFor());
    expect(calls).toHaveLength(0);
  });

  it("설정 켜짐 + 좌표 있음이면 정확히 1회만 호출된다", async () => {
    const { calls, port } = makeGeocodingSpy({ kind: "known", value: "서울 중구" });
    const pipeline = createPipeline({
      backend: generating("오늘 하루."),
      store: memoryStore(),
      loadSignals: async () => signalsWithPlace(),
      geocoding: port,
      geocodingEnabled: true,
    });

    await pipeline.run(inputFor());
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ latitude: 37.5665, longitude: 126.978 });
  });

  it("known이면 entry.placeName과 프롬프트에 같은 문자열이 반영된다 (L4)", async () => {
    const { port } = makeGeocodingSpy({ kind: "known", value: "서울 중구" });
    let receivedRequest: unknown;
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate(request) {
        receivedRequest = request;
        return { text: "오늘 하루." };
      },
    };

    const pipeline = createPipeline({
      backend,
      store: memoryStore(),
      loadSignals: async () => signalsWithPlace(),
      geocoding: port,
      geocodingEnabled: true,
    });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.placeName).toEqual({ kind: "known", value: "서울 중구" });
    }
    expect((receivedRequest as { placeName?: string }).placeName).toBe("서울 중구");
  });

  it("unknown이면 entry.placeName이 unknown이고 프롬프트에는 장소 이름 문장이 없다", async () => {
    const { port } = makeGeocodingSpy({ kind: "unknown" });
    let receivedRequest: unknown;
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate(request) {
        receivedRequest = request;
        return { text: "오늘 하루." };
      },
    };

    const pipeline = createPipeline({
      backend,
      store: memoryStore(),
      loadSignals: async () => signalsWithPlace(),
      geocoding: port,
      geocodingEnabled: true,
    });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.placeName).toEqual({ kind: "unknown" });
    }
    expect((receivedRequest as { placeName?: string }).placeName).toBeUndefined();
  });

  it("geocoding을 주지 않으면(옵셔널) 지오코딩 없이 정상 동작한다", async () => {
    const { pipeline } = makePipeline({
      backend: generating("오늘 하루."),
      signals: async () => signalsWithPlace(),
    });

    const result = await pipeline.run(inputFor());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entry.placeName).toBeUndefined();
  });
});

/**
 * 015 — 쓰는 중 독백: onProgress 신호 중계.
 *
 * 계약: specs/015-writing-monologue/data-model.md 「Pipeline.run() 확장」
 *
 * **파이프라인은 신호의 내용을 해석·가공하지 않는다** — `loadSignals()` 호출
 * 직전에 `"signals"`를 보내고, 나머지는 그대로 백엔드까지 중계한다(중계기
 * 역할만 한다, plan.md 핵심 배선 위험).
 */
describe("015 — onProgress 신호 중계", () => {
  it("loadSignals() 호출 전에 onProgress가 'signals'로 불린다", async () => {
    const stages: string[] = [];
    const { pipeline } = makePipeline({
      signals: async (day) => {
        // loadSignals가 불린 시점에는 이미 'signals'가 와 있어야 한다.
        expect(stages).toContain("signals");
        return partiallyUnknownDay(day);
      },
    });

    await pipeline.run(inputFor(), (stage) => stages.push(stage));

    expect(stages).toContain("signals");
  });

  it("onProgress가 백엔드까지 그대로 전달된다", async () => {
    let receivedOnProgress: ((stage: ProgressStage) => void) | undefined;
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate(_request, onStage) {
        receivedOnProgress = onStage;
        onStage?.("generation");
        return { text: "글" };
      },
    };
    const { pipeline } = makePipeline({ backend });

    const stages: string[] = [];
    await pipeline.run(inputFor(), (stage) => stages.push(stage));

    expect(receivedOnProgress).toBeDefined();
    expect(stages).toContain("generation");
  });

  it("onProgress를 안 넘겨도 기존 테스트가 그대로 통과한다 (옵셔널 확장)", async () => {
    const { pipeline } = makePipeline({ backend: generating("오늘은 조용했다.") });

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
  });
});

/**
 * 018 — PipelineInput.seen이 backend.generate()까지 전달된다.
 *
 * 계약: specs/018-prompt-prefix-prewarm/contracts/prewarm-engine.md
 *       (pipeline.test.ts 테스트 항목), data-model.md §5
 *
 * `/speckit-analyze` F1이 발견한 구조적 문제("화면이 미리 읽은 seen이
 * 파이프라인을 거치지 않고는 실제 백엔드에 닿을 수 없다")의 해소를 검증한다.
 */
describe("018 — PipelineInput.seen이 backend.generate()로 그대로 전달된다", () => {
  const caption: PhotoVision = {
    captions: [{ photoId: "a", takenAt: new Date("2026-08-12T08:00:00"), text: "커피잔" }],
    considered: 1,
    available: 1,
  };

  it("seen을 채워 run()을 부르면 backend.generate()가 세 번째 인자로 그 값을 받는다", async () => {
    let receivedSeen: PhotoVision | undefined;
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate(_request, _onStage, seen) {
        receivedSeen = seen;
        return { text: "글" };
      },
    };
    const { pipeline } = makePipeline({ backend });

    await pipeline.run(inputFor({ seen: caption }));

    expect(receivedSeen).toEqual(caption);
  });

  it("seen을 안 주면 undefined로 불린다 (회귀 없음)", async () => {
    let receivedSeen: PhotoVision | undefined = caption; // 미리 채워 덮어쓰이는지 확인
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate(_request, _onStage, seen) {
        receivedSeen = seen;
        return { text: "글" };
      },
    };
    const { pipeline } = makePipeline({ backend });

    await pipeline.run(inputFor());

    expect(receivedSeen).toBeUndefined();
  });

  it("파이프라인은 seen의 내용을 해석하지 않고 그대로 통과시킨다", async () => {
    // request-build 실패 등 이른 단계에서 멈추면 seen이 backend까지 갈 이유가
    // 없다 — 여기서는 정상 경로에서 값이 변형되지 않는지만 본다.
    let receivedSeen: PhotoVision | undefined;
    const backend: InferenceBackend = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate(_request, _onStage, seen) {
        receivedSeen = seen;
        return { text: "글" };
      },
    };
    const { pipeline } = makePipeline({ backend });

    await pipeline.run(inputFor({ seen: caption }));

    // 캡션 배열의 내용이 한 글자도 안 바뀐다.
    expect(receivedSeen?.captions[0]?.text).toBe("커피잔");
    expect(receivedSeen?.considered).toBe(1);
    expect(receivedSeen?.available).toBe(1);
  });
});

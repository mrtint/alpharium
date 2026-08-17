/**
 * 생성 엔진 계약 테스트.
 *
 * 계약: specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **대역으로 검증하는 것과 못 하는 것을 가른다.**
 *
 * 여기서 보는 것: 적재·정리의 규칙, 시간 한도, 지표가 경계를 넘지 못하는 것.
 * 여기서 못 보는 것: `initLlama`가 실제로 성공하는가 — **실기기의 몫이다**(quickstart D1).
 *
 * **E-2(어느 경로로도 정리된다)가 가장 중요하다.** 실패 경로에서 `unload()`를 잊으면
 * 다음 요청이 메모리 부족으로 죽고, 그것은 실기기에서야 드러난다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildPrompt } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import type { Character, DiaryRequest } from "../../src/diary/types";
import { createOnDeviceBackend } from "../../src/inference/on-device";
import type {
  Ending,
  GenerationEngine,
  LoadResult,
  RunResult,
} from "../../src/inference/engine-port";
import { isGenerationFailure } from "../../src/inference/types";
import { richDay } from "../../src/signals/fake";

const DAY = "2026-08-16";
const GOOD_KO = "오늘 주인은 어딘가로 나섰다. 사진 세 장이 남았고 나는 그것만 안다.";

function requestFor(character: Character = "quiet"): DiaryRequest {
  const result = buildRequest(richDay(DAY), character, "none");
  if (!result.ok) throw new Error("테스트 준비 실패");
  return result.request;
}

/** 엔진 대역. 무엇이 언제 불렸는지 기록한다. */
function fakeEngine(
  options: {
    load?: (character: Character) => LoadResult;
    run?: (prompt: string) => RunResult | Promise<RunResult>;
  } = {},
) {
  const calls: string[] = [];
  let open: Character | null = null;
  /** 동시에 열린 최대 개수. 1을 넘으면 E1 위반이다 */
  let maxOpen = 0;
  let openCount = 0;

  const engine: GenerationEngine = {
    async load(character) {
      calls.push(`load:${character}`);
      const result = options.load?.(character) ?? { ok: true };
      if (result.ok) {
        // 실제 구현은 이전 것을 먼저 닫아야 한다. 여기서는 세기만 한다.
        if (open !== null && open !== character) {
          calls.push(`implicit-close:${open}`);
          openCount -= 1;
        }
        if (open !== character) {
          openCount += 1;
          maxOpen = Math.max(maxOpen, openCount);
        }
        open = character;
      }
      return result;
    },
    async run(prompt) {
      calls.push("run");
      return options.run?.(prompt) ?? { text: GOOD_KO, ending: { kind: "eos" } };
    },
    async stop() {
      calls.push("stop");
    },
    async unload() {
      calls.push("unload");
      if (open !== null) openCount -= 1;
      open = null;
    },
  };

  return {
    engine,
    calls,
    get maxOpen() {
      return maxOpen;
    },
  };
}

/** 대역 엔진을 쓰는 온디바이스 어댑터 */
function backendWith(engine: GenerationEngine, timeoutMs?: number) {
  return createOnDeviceBackend(async () => ({}), engine, timeoutMs);
}

describe("E-1 한 번에 하나만 열린다 (FR-008)", () => {
  it("다른 캐릭터를 요청하면 앞의 것이 닫힌다", async () => {
    const fake = fakeEngine();
    const backend = backendWith(fake.engine);

    await backend.generate(requestFor("quiet"));
    await backend.generate(requestFor("narrative"));

    expect(fake.calls).toContain("load:quiet");
    expect(fake.calls).toContain("load:narrative");
    // **두 모델이 동시에 열린 순간이 없어야 한다** — GB 둘이면 기기가 죽는다.
    expect(fake.maxOpen).toBeLessThanOrEqual(1);
  });

  it("생성이 끝날 때마다 닫힌다", async () => {
    const fake = fakeEngine();
    await backendWith(fake.engine).generate(requestFor());

    expect(fake.calls.filter((c) => c === "unload")).toHaveLength(1);
  });
});

describe("E-2 어떻게 끝나든 정리된다 (FR-009, FR-021d) ★", () => {
  // **실패 경로에서 잊기 가장 쉬운 자리다.** 정리되지 않으면 다음 요청이 메모리
  // 부족으로 죽고, 그것은 실기기에서야 드러난다.

  it("생성이 성공해도 unload된다", async () => {
    const fake = fakeEngine();
    await backendWith(fake.engine).generate(requestFor());
    expect(fake.calls).toContain("unload");
  });

  it("판정이 거부해도 unload된다", async () => {
    const fake = fakeEngine({ run: () => ({ text: "", ending: { kind: "eos" } }) });
    const result = await backendWith(fake.engine).generate(requestFor());

    expect(isGenerationFailure(result)).toBe(true);
    expect(fake.calls).toContain("unload");
  });

  it("run()이 던져도 unload된다", async () => {
    const fake = fakeEngine({
      run: () => {
        throw new Error("네이티브가 무너졌다");
      },
    });
    const result = await backendWith(fake.engine).generate(requestFor());

    expect(isGenerationFailure(result)).toBe(true);
    expect(fake.calls).toContain("unload");
  });

  it("적재가 실패하면 run을 시도하지 않는다", async () => {
    const fake = fakeEngine({ load: () => ({ ok: false, reason: "not-found" }) });
    await backendWith(fake.engine).generate(requestFor());

    expect(fake.calls).not.toContain("run");
  });

  it("두 번째 요청이 정상적으로 돈다 — 정리가 됐다는 증거", async () => {
    const fake = fakeEngine({
      run: () => {
        throw new Error("한 번 무너진다");
      },
    });
    const backend = backendWith(fake.engine);

    await backend.generate(requestFor());
    // 실패 뒤에도 다음 요청이 적재까지 간다.
    await backend.generate(requestFor());

    expect(fake.calls.filter((c) => c.startsWith("load:"))).toHaveLength(2);
  });
});

describe("E-3 시간 한도 (FR-021)", () => {
  it("한도를 넘으면 stop()이 불린다", async () => {
    const fake = fakeEngine({
      run: () => new Promise<RunResult>(() => {}), // 영원히 끝나지 않는다
    });
    const result = await backendWith(fake.engine, 30).generate(requestFor());

    expect(fake.calls).toContain("stop");
    expect(isGenerationFailure(result)).toBe(true);
    if (isGenerationFailure(result)) expect(result.kind).toBe("timed-out");
  });

  it("한도를 넘어도 unload된다", async () => {
    const fake = fakeEngine({ run: () => new Promise<RunResult>(() => {}) });
    await backendWith(fake.engine, 30).generate(requestFor());

    expect(fake.calls).toContain("unload");
  });

  it("한도 안에 끝나면 stop()이 불리지 않는다", async () => {
    const fake = fakeEngine();
    await backendWith(fake.engine, 5000).generate(requestFor());

    expect(fake.calls).not.toContain("stop");
  });

  it("시간 한도 실패에 text가 없다 (FR-021)", async () => {
    const fake = fakeEngine({ run: () => new Promise<RunResult>(() => {}) });
    const result = await backendWith(fake.engine, 30).generate(requestFor());

    expect(JSON.stringify(result)).not.toContain("text");
  });
});

describe("E-4 지표가 경계를 넘지 못한다 (FR-011, 원칙 IV) ★", () => {
  it("RunResult에 text·ending 외의 필드가 없다", () => {
    // **자리가 없으면 담을 수 없다.** 이것이 이 기능의 첫 방어선이다 —
    // llama.rn의 completion()이 timings·tokens_predicted를 공짜로 준다.
    const result: RunResult = { text: GOOD_KO, ending: { kind: "eos" } };
    expect(Object.keys(result).sort()).toEqual(["ending", "text"]);
  });

  it("Ending이 값을 갖지 않는다", () => {
    // { kind: "length", tokens: 512 } 같은 형태를 두면 그것이 지표다.
    const endings: Ending[] = [
      { kind: "eos" },
      { kind: "length" },
      { kind: "context" },
      { kind: "interrupted" },
      { kind: "timeout" },
    ];
    for (const ending of endings) {
      expect(Object.keys(ending)).toEqual(["kind"]);
    }
  });

  it("생성 결과에 소요 시간·토큰 수가 실리지 않는다", async () => {
    const fake = fakeEngine();
    const result = await backendWith(fake.engine).generate(requestFor());

    const serialized = JSON.stringify(result);
    for (const forbidden of ["timings", "tokens", "ms", "per_second", "elapsed"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe("E-5 LoadResult에 모델 정보가 없다 (FR-010, 원칙 III)", () => {
  it("성공 갈래가 ok만 담는다", () => {
    const result: LoadResult = { ok: true };
    expect(Object.keys(result)).toEqual(["ok"]);
  });

  it("실패 갈래가 두 까닭만 담는다", () => {
    // 파일이 없는 것과 있는데 못 여는 것은 사용자가 할 일이 다르다(FR-017d).
    const notFound: LoadResult = { ok: false, reason: "not-found" };
    const loadFailed: LoadResult = { ok: false, reason: "load-failed" };
    expect(Object.keys(notFound).sort()).toEqual(["ok", "reason"]);
    expect(Object.keys(loadFailed).sort()).toEqual(["ok", "reason"]);
  });

  it("적재 실패 결과에 모델 이름·경로가 없다", async () => {
    const fake = fakeEngine({ load: () => ({ ok: false, reason: "load-failed" }) });
    const result = await backendWith(fake.engine).generate(requestFor());

    const serialized = JSON.stringify(result).toLowerCase();
    for (const word of ["kanana", "gguf", "huggingface", ".bin", "a1", "quiet"]) {
      expect(serialized).not.toContain(word);
    }
  });

  it("고른 캐릭터의 모델을 열지 못하면 다른 캐릭터로 대신하지 않는다 (FR-010)", async () => {
    // 조용한 대체는 사용자가 고른 캐릭터를 배신하는 것이다.
    const fake = fakeEngine({
      load: (character) =>
        character === "quiet" ? { ok: false, reason: "not-found" } : { ok: true },
    });
    const result = await backendWith(fake.engine).generate(requestFor("quiet"));

    expect(isGenerationFailure(result)).toBe(true);
    // 다른 캐릭터를 열어 본 적이 없어야 한다.
    expect(fake.calls.filter((c) => c.startsWith("load:"))).toEqual(["load:quiet"]);
  });
});

describe("E-6 끊긴 결과의 부분 출력이 새지 않는다 (FR-021c) ★", () => {
  it("interrupted면 부분 출력이 있어도 거부된다", async () => {
    // **끊긴 결과에도 거기까지 생성된 text가 들어 있다**(research §2).
    const partial = "오늘 주인은 어딘가로 나섰다가";
    const fake = fakeEngine({
      run: () => ({ text: partial, ending: { kind: "interrupted" } }),
    });
    const result = await backendWith(fake.engine).generate(requestFor());

    expect(isGenerationFailure(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(partial);
  });

  it("잘린 결과도 마찬가지다", async () => {
    const partial = "오늘은 아침부터";
    const fake = fakeEngine({
      run: () => ({ text: partial, ending: { kind: "length" } }),
    });
    const result = await backendWith(fake.engine).generate(requestFor());

    expect(isGenerationFailure(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(partial);
  });
});

describe("어댑터가 프롬프트를 그대로 넘긴다", () => {
  it("buildPrompt의 결과가 run()에 간다 (FR-013b)", async () => {
    let seen = "";
    const fake = fakeEngine({
      run: (prompt) => {
        seen = prompt;
        return { text: GOOD_KO, ending: { kind: "eos" } };
      },
    });
    const request = requestFor();
    await backendWith(fake.engine).generate(request);

    expect(seen).toBe(buildPrompt(request));
  });
});

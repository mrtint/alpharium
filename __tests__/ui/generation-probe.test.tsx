/**
 * 생성 패널 화면 테스트.
 *
 * 계약: specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 화면이 원칙 IV와 원칙 I을 동시에 어기기 쉬운 자리다.**
 *
 * 오래 기다리므로 「얼마나 남았나」를 넣고 싶어지고(원칙 IV의 지표), 생성 중인 글을
 * 흘려 보여주고 싶어진다(판정을 통과하지 않은 글이 화면에 오른다). **이 테스트가 둘 다
 * 막는다.**
 *
 * ⚠️ `@testing-library/react-native` 14의 `render`는 **Promise를 반환한다**(AGENTS.md
 * 실측). `await` 없이 쓰면 `screen`이 비어 있고 오류 문구가 원인을 가리키지 않는다.
 *
 * **006이 계약을 바꿨다: `backend`가 아니라 `pipeline`을 받는다**(FR-010a).
 * 어댑터를 직접 부르면 저장을 건너뛰고, 그것이 일기가 하나도 남지 않은 원인이었다.
 * 아래 대역은 **실제 파이프라인**이며 메모리 저장소를 쓴다 — 「저장까지 갔는가」를
 * 화면 테스트에서 확인할 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

import { createPipeline } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { describeFailure } from "../../src/app/failure-text";
import { GenerationProbe } from "../../src/ui/GenerationProbe";
import type { GenerationResult, InferenceBackend } from "../../src/inference/types";
import { richDay } from "../../src/signals/fake";

const DIARY = "오늘 주인은 어딘가로 나섰다. 사진 세 장이 남았고 나는 그것만 안다.";

/** 하루가 닫힌 뒤의 시각. 2026-08-16은 2026-08-17 04:00에 닫힌다 */
const NOW = new Date("2026-08-17T06:00:00");

function backendReturning(
  result: GenerationResult,
  options: { delayMs?: number } = {},
): InferenceBackend & { stop?: () => Promise<void> } {
  return {
    location: "on-device",
    async isAvailable() {
      return { kind: "loaded" };
    },
    async generate() {
      if (options.delayMs !== undefined) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
      return result;
    },
    async stop() {},
  };
}

const loadSignals = async () => richDay("2026-08-16");

/**
 * 화면이 받을 파이프라인. **대역 어댑터를 진짜 파이프라인에 넣는다.**
 *
 * 어댑터만 갈아끼우고 파이프라인은 제품과 같은 것을 쓰므로, 「생성이 저장까지 가는가」가
 * 화면 테스트에서 그대로 확인된다.
 */
function pipelineWith(
  backend: InferenceBackend & { stop?: () => Promise<void> },
  store = memoryStore(),
) {
  const pipeline = createPipeline({
    backend,
    store,
    loadSignals: (day) => loadSignals().then((signals) => ({ ...signals, date: day })),
  });
  return { pipeline, store, stop: backend.stop };
}

async function renderProbe(
  backend: InferenceBackend & { stop?: () => Promise<void> },
  store = memoryStore(),
) {
  const wired = pipelineWith(backend, store);
  await render(
    <GenerationProbe
      pipeline={wired.pipeline}
      stop={wired.stop}
      character="quiet"
      now={() => NOW}
    />,
  );
  return wired;
}

describe("일기가 나오면 보여준다", () => {
  it("생성에 성공하면 본문이 화면에 있다", async () => {
    await renderProbe(backendReturning({ text: DIARY }));

    await userEvent.press(screen.getByText("일기 쓰기"));

    await waitFor(() => expect(screen.getByText(DIARY)).toBeTruthy());
  });
});

/**
 * ★ 006의 핵심 — **P1·P2. 생성이 저장까지 간다.**
 *
 * 005에서는 이 화면이 `backend.generate()`를 직접 부르고 결과를 `useState`에만 담아
 * **저장이 한 번도 일어나지 않았다.** 화면을 나가면 일기가 사라졌다.
 */
describe("★ 생성이 저장까지 간다 (006 FR-010, SC-008b)", () => {
  it("성공하면 저장소에 남는다", async () => {
    const store = memoryStore();
    await renderProbe(backendReturning({ text: DIARY }), store);

    await userEvent.press(screen.getByText("일기 쓰기"));
    await waitFor(() => expect(screen.getByText(DIARY)).toBeTruthy());

    // **화면에 보이는 것만으로는 부족하다.** 저장소에 실제로 있어야 한다.
    const days = await store.listDays();
    expect(days).toHaveLength(1);
    const saved = await store.load(days[0]);
    expect(saved?.text).toBe(DIARY);
  });

  it("생성이 실패하면 저장소가 비어 있다", async () => {
    const store = memoryStore();
    await renderProbe(backendReturning({ kind: "rejected", why: "empty" }), store);

    await userEvent.press(screen.getByText("일기 쓰기"));
    await waitFor(() => expect(screen.getByText(/다시 시도/)).toBeTruthy());

    expect(await store.listDays()).toHaveLength(0);
  });
});

/**
 * ★ 006 FR-012a·b — **저장이 실패해도 글은 읽을 수 있다.**
 *
 * 30초를 들여 만든 글이고 다시 생성해도 같은 글이 나오지 않는다. **원칙 I을 어기지
 * 않는다** — 금지된 것은 미리 만든 글을 생성 대신 내놓는 것이지, 방금 생성한 글을
 * 보여주는 것이 아니다.
 */
describe("★ 저장 실패 (006 FR-012a·b, SC-008c·e)", () => {
  it("글이 화면에 남는다", async () => {
    const store = memoryStore({ failWith: "저장 공간이 없다" });
    await renderProbe(backendReturning({ text: DIARY }), store);

    await userEvent.press(screen.getByText("일기 쓰기"));

    await waitFor(() => expect(screen.getByText(DIARY)).toBeTruthy());
  });

  it("저장하지 못했다는 것과 사라진다는 것이 함께 보인다", async () => {
    const store = memoryStore({ failWith: "저장 공간이 없다" });
    await renderProbe(backendReturning({ text: DIARY }), store);

    await userEvent.press(screen.getByText("일기 쓰기"));

    // 성공한 것처럼 보이면 사용자는 일기가 남은 줄 안다(SC-008c).
    await waitFor(() => expect(screen.getByText(/저장하지 못했다/)).toBeTruthy());
    expect(screen.getByText(/사라진다/)).toBeTruthy();
  });

  it("성공했을 때는 그 말이 없다", async () => {
    await renderProbe(backendReturning({ text: DIARY }));

    await userEvent.press(screen.getByText("일기 쓰기"));
    await waitFor(() => expect(screen.getByText(DIARY)).toBeTruthy());

    expect(screen.queryByText(/저장하지 못했다/)).toBeNull();
  });
});

describe("「쓰고 있다」 표시 (FR-028) ★", () => {
  it("생성 중에는 돌고 있다는 것이 보인다", async () => {
    await renderProbe(backendReturning({ text: DIARY }, { delayMs: 50 }));

    await userEvent.press(screen.getByText("일기 쓰기"));

    // 아무 표시가 없으면 멈춘 앱으로 읽히고, 사용자가 떠나면 생성이 버려진다(FR-021b).
    await waitFor(() => expect(screen.getByText("쓰고 있다")).toBeTruthy());
  });

  it("끝나면 표시가 사라진다 (FR-028c)", async () => {
    await renderProbe(backendReturning({ text: DIARY }, { delayMs: 20 }));

    await userEvent.press(screen.getByText("일기 쓰기"));
    await waitFor(() => expect(screen.getByText(DIARY)).toBeTruthy());

    expect(screen.queryByText("쓰고 있다")).toBeNull();
  });

  it("실패로 끝나도 표시가 사라진다", async () => {
    await renderProbe(backendReturning({ kind: "rejected", why: "echo" }, { delayMs: 20 }));

    await userEvent.press(screen.getByText("일기 쓰기"));
    await waitFor(() => expect(screen.queryByText("쓰고 있다")).toBeNull());
  });

  it("★ 수치가 보이지 않는다 (FR-028a, 원칙 IV)", async () => {
    // **진행률·남은 시간·토큰 수가 화면에 오르면 그것이 모델 비교의 시작점이다.**
    await renderProbe(backendReturning({ text: DIARY }, { delayMs: 50 }));

    await userEvent.press(screen.getByText("일기 쓰기"));
    await waitFor(() => expect(screen.getByText("쓰고 있다")).toBeTruthy());

    for (const forbidden of ["%", "초", "토큰", "남음", "/s"]) {
      expect(screen.queryByText(new RegExp(forbidden))).toBeNull();
    }
  });
});

describe("★ 판정을 통과하지 않은 글이 화면에 오르지 않는다 (FR-028b, SC-008a)", () => {
  it("거부된 결과에는 본문이 없다", async () => {
    // **원칙 I의 방어선을 화면 쪽에서 우회하지 않는다.** 거부될 글을 사용자가 이미
    // 읽어 버리면, 실패 경로에 text가 없는 것이 무의미해진다.
    await renderProbe(backendReturning({ kind: "rejected", why: "unfinished" }));

    await userEvent.press(screen.getByText("일기 쓰기"));

    await waitFor(() => expect(screen.getByText(/다시 시도해 볼 만하다/)).toBeTruthy());
    expect(screen.queryByText(DIARY)).toBeNull();
  });

  it("실패 뒤 다시 시도하면 앞의 본문이 지워진다", async () => {
    // 앞의 일기가 남아 있으면 새 실패가 성공처럼 읽힌다.
    let result: GenerationResult = { text: DIARY };
    const backend: InferenceBackend & { stop?: () => Promise<void> } = {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      async generate() {
        return result;
      },
      async stop() {},
    };

    await renderProbe(backend);

    await userEvent.press(screen.getByText("일기 쓰기"));
    await waitFor(() => expect(screen.getByText(DIARY)).toBeTruthy());

    result = { kind: "timed-out" };
    await userEvent.press(screen.getByText("일기 쓰기"));

    await waitFor(() => expect(screen.queryByText(DIARY)).toBeNull());
  });
});

describe("실패를 「할 수 있는 것」으로 옮긴다 (FR-017d·e) ★", () => {
  /**
   * **모델의 실패 양상을 그대로 드러내지 않는다**(원칙 III). 「되뱉었다」·「언어가
   * 다르다」는 캐릭터 뒤의 모델을 드러내는 말이다.
   */
  const leaking = [
    "되뱉",
    "메아리",
    "echo",
    "언어",
    "language",
    "빈 글",
    "empty",
    "unfinished",
    "잘림",
    "토큰",
    "모델",
  ];

  const failures: GenerationResult[] = [
    { kind: "rejected", why: "empty" },
    { kind: "rejected", why: "echo" },
    { kind: "rejected", why: "language" },
    { kind: "rejected", why: "unfinished" },
    { kind: "timed-out" },
    { kind: "interrupted" },
    { kind: "model-load-failed", reason: "not-found" },
    { kind: "model-load-failed", reason: "load-failed" },
    { kind: "backend-unavailable", reason: "네이티브 모듈이 없다" },
    { kind: "generation-failed", reason: "무너졌다" },
    { kind: "not-implemented" },
  ];

  it.each(failures)("$kind — 문구에 모델의 실패 양상이 없다", (failure) => {
    const message = describeFailure(failure);

    expect(message.length).toBeGreaterThan(0);
    for (const word of leaking) {
      expect(message).not.toContain(word);
    }
  });

  it("네 거부 갈래가 하나의 말로 옮겨진다", () => {
    // 사용자에게 필요한 것은 「무엇이 잘못됐나」가 아니라 「무엇을 할 수 있나」다.
    const messages = new Set(
      (["empty", "echo", "language", "unfinished"] as const).map((why) =>
        describeFailure({ kind: "rejected", why }),
      ),
    );

    expect(messages.size).toBe(1);
  });

  it("갈래마다 할 수 있는 것이 구분된다", () => {
    // 뭉개면 「다시 시도하면 되는가」와 「캐릭터를 받아야 하는가」를 구분할 수 없다.
    const notFound = describeFailure({ kind: "model-load-failed", reason: "not-found" });
    const rejected = describeFailure({ kind: "rejected", why: "echo" });

    expect(notFound).not.toBe(rejected);
    expect(notFound).toMatch(/준비/);
    expect(rejected).toMatch(/다시 시도/);
  });

  it("성공에는 실패 문구가 없다", () => {
    expect(describeFailure({ text: DIARY })).toBe("");
  });

  it("화면에 실패 문구가 보인다", async () => {
    await renderProbe(backendReturning({ kind: "model-load-failed", reason: "not-found" }));

    await userEvent.press(screen.getByText("일기 쓰기"));

    await waitFor(() => expect(screen.getByText(/준비/)).toBeTruthy());
  });
});

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
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

import { describeFailure, GenerationProbe } from "../../src/ui/GenerationProbe";
import type { GenerationResult, InferenceBackend } from "../../src/inference/types";
import { richDay } from "../../src/signals/fake";

const DIARY = "오늘 주인은 어딘가로 나섰다. 사진 세 장이 남았고 나는 그것만 안다.";

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

async function renderProbe(backend: InferenceBackend & { stop?: () => Promise<void> }) {
  await render(<GenerationProbe backend={backend} loadSignals={loadSignals} character="quiet" />);
}

describe("일기가 나오면 보여준다", () => {
  it("생성에 성공하면 본문이 화면에 있다", async () => {
    await renderProbe(backendReturning({ text: DIARY }));

    await userEvent.press(screen.getByText("일기 쓰기"));

    await waitFor(() => expect(screen.getByText(DIARY)).toBeTruthy());
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

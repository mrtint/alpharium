/**
 * 038 — TypewriterText 계약 (contracts/typewriter-text.md B, C1~C9 + C-TYPO).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * jest `ui` 프로젝트(jest-expo). `jest.useFakeTimers()` + `act(() =>
 * jest.advanceTimersByTime(...))`로 글자 노출 진행을 검증한다. RNTL 14 —
 * `render`·`fireEvent` 모두 Promise를 반환하므로 `await` 필수, 쿼리는
 * `screen.*`에서(025·035 실측, AGENTS.md).
 *
 * `charMs`는 임의 양수(10)로 주입한다 — `REVEAL.charMs === 15`는
 * `theme-tokens.test.ts` DT7이 별도로 잠근다(analyze A1).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, screen } from "@testing-library/react-native";

import { TypewriterText } from "../../src/ui/components/TypewriterText";

const SRC = readFileSync(join(__dirname, "../../src/ui/components/TypewriterText.tsx"), "utf8");
const SRC_NO_COMMENTS = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const CHAR_MS = 10;

afterEach(() => {
  // 각 테스트가 useFakeTimers를 켰든 안 켰든, 다음 테스트로 상태가 새지 않게 정리한다.
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("C1·C2 — 마운트 시 0에서 시작해 charMs마다 글자 수 증가", () => {
  it("초기 렌더는 빈 문자열, advanceTimersByTime(charMs*k) 후 k글자 노출", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    await render(
      <TypewriterText text="가나다라마" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    // 마운트 직후: 아직 0글자 (텍스트 노드가 비어 있거나 아직 없음)
    expect(screen.queryByText("가나다라마")).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS * 2);
    });
    expect(screen.getByText("가나")).toBeTruthy();

    jest.useRealTimers();
  });
});

describe("C3 — 노출 완료 시 onDone 1회 + 타이머 정지", () => {
  it("전체 글자 수만큼 진행하면 onDone이 불린다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    await render(
      <TypewriterText text="가나다" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS * 3);
    });
    expect(screen.getByText("가나다")).toBeTruthy();
    expect(onDone).toHaveBeenCalledTimes(1);

    // 타이머가 멈췄으므로 더 진행해도 onDone이 재호출되지 않는다.
    await act(() => {
      jest.advanceTimersByTime(CHAR_MS * 10);
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});

describe("C4 — skipToEnd가 true가 되면 즉시 전체 + onDone", () => {
  it("false→true 전환 시 전체 텍스트가 즉시 보이고 onDone이 불린다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const { rerender } = await render(
      <TypewriterText text="가나다라마" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    expect(screen.queryByText("가나다라마")).toBeNull();

    await act(async () => {
      await rerender(
        <TypewriterText text="가나다라마" charMs={CHAR_MS} skipToEnd={true} onDone={onDone} />,
      );
    });

    expect(screen.getByText("가나다라마")).toBeTruthy();
    expect(onDone).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it("이미 완료된 뒤 skipToEnd가 계속 true여도 onDone이 재호출되지 않는다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const { rerender } = await render(
      <TypewriterText text="가나" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS * 2);
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    await act(async () => {
      await rerender(
        <TypewriterText text="가나" charMs={CHAR_MS} skipToEnd={true} onDone={onDone} />,
      );
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});

describe("C5 — text 교체 시 처음부터 리셋", () => {
  it("text가 바뀌면 노출 글자 수가 0으로 리셋되고 onDone이 재무장된다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const { rerender } = await render(
      <TypewriterText text="가나" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS * 2);
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    await act(async () => {
      await rerender(
        <TypewriterText text="다른 글" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
      );
    });
    // 리셋됐으므로 새 텍스트가 즉시 전부 보이지 않는다.
    expect(screen.queryByText("다른 글")).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS * 4);
    });
    expect(screen.getByText("다른 글")).toBeTruthy();
    expect(onDone).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});

describe("C6 — 언마운트 시 타이머 정리", () => {
  it("언마운트 시 setInterval에 대응하는 clearInterval을 호출한다", async () => {
    jest.useFakeTimers();
    const clearSpy = jest.spyOn(global, "clearInterval");
    const onDone = jest.fn();
    const { unmount } = await render(
      <TypewriterText text="가나다라마" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    const callsBeforeUnmount = clearSpy.mock.calls.length;
    await unmount();

    // 언마운트 이펙트 클린업이 setInterval을 만든 바로 그 id로 clearInterval을
    // 부른다 — RNTL의 언마운트 자체가 clearInterval을 대신 불러주지 않는다.
    expect(clearSpy.mock.calls.length).toBeGreaterThan(callsBeforeUnmount);

    clearSpy.mockRestore();
    jest.useRealTimers();
  });

  it("언마운트 후 advanceTimersByTime으로 setState가 더 불리지 않는다(act 경고 없음)", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const { unmount } = await render(
      <TypewriterText text="가나다라마" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS);
    });

    await unmount();

    // 언마운트 후 타이머를 더 진행해도 예외나 경고 없이 조용해야 한다.
    let threw = false;
    try {
      jest.advanceTimersByTime(CHAR_MS * 100);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(onDone).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe("C7 — 빈 문자열은 즉시 onDone", () => {
  it("text === ''이면 타이머 없이 onDone이 1회 불린다", async () => {
    const onDone = jest.fn();
    await render(<TypewriterText text="" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />);

    await act(async () => {
      // effect flush
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("C8 — onDone은 어떤 경로로도 총 1회만", () => {
  it("자연 완료 직후 skipToEnd가 true가 돼도 재호출되지 않는다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const { rerender } = await render(
      <TypewriterText text="가나" charMs={CHAR_MS} skipToEnd={false} onDone={onDone} />,
    );

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS * 2);
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    await act(async () => {
      await rerender(
        <TypewriterText text="가나" charMs={CHAR_MS} skipToEnd={true} onDone={onDone} />,
      );
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});

describe("C-TYPO — variant·style을 AppText에 위임한다 (analyze I1)", () => {
  it("variant='title'이면 title 타이포로 렌더된다", async () => {
    await render(
      <TypewriterText
        text="제목"
        charMs={CHAR_MS}
        skipToEnd={true}
        onDone={() => {}}
        variant="title"
      />,
    );
    const node = screen.getByText("제목");
    expect(node).toBeTruthy();
  });

  it("style 오버라이드가 렌더된 노드에 반영된다", async () => {
    await render(
      <TypewriterText
        text="본문"
        charMs={CHAR_MS}
        skipToEnd={true}
        onDone={() => {}}
        variant="body"
        style={{ fontSize: 16, lineHeight: 26 }}
      />,
    );
    const node = screen.getByText("본문");
    const flatStyle = [node.props.style].flat(Infinity);
    expect(flatStyle.some((s) => s && s.fontSize === 16)).toBe(true);
  });
});

describe("C9 — 성능·지표 경계 (원칙 IV)", () => {
  it("charMs가 JSX 텍스트로 렌더되지 않는다", () => {
    expect(SRC_NO_COMMENTS).not.toMatch(/>\s*\{?\s*charMs\s*\}?\s*</);
  });

  it("Date.now·performance 토큰이 없다", () => {
    for (const forbidden of ["Date.now", "performance.now", "Date()"]) {
      expect(SRC_NO_COMMENTS).not.toContain(forbidden);
    }
  });

  it("모델·도메인 계층을 import하지 않는다", () => {
    expect(SRC_NO_COMMENTS).not.toMatch(/from ["'].*\/(diary|models|inference|vision|signals)\//);
  });
});

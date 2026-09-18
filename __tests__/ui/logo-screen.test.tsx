/**
 * 스플래시(로고) 화면 계약 테스트 (043).
 *
 * 계약: specs/043-modernist-splash-permissions/spec.md FR-001~FR-006
 *       tasks.md T008
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 리뷰 보드 프레임 1k 레이아웃을 그대로 따르는지(로고 마크 72×72, 타이틀,
 * 하단 안내 문구+로딩 점 3개), 정해진 시간 뒤 자동으로 `onDone`을 부르는지
 * (FR-006), 진행률·모델명 등 원칙 IV가 금지하는 지표가 없는지를 검증한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, screen } from "@testing-library/react-native";

import { LogoScreen, LOGO_DISPLAY_MS } from "../../src/ui/LogoScreen";

describe("LogoScreen — 렌더 (FR-001~FR-004)", () => {
  it("전체 화면 컨테이너 testID가 있다", async () => {
    await render(<LogoScreen onDone={() => {}} />);
    expect(screen.getByTestId("first-run-logo")).toBeTruthy();
  });

  it("72×72 accent 로고 마크가 있다", async () => {
    await render(<LogoScreen onDone={() => {}} />);
    const mark = screen.getByTestId("splash-logo-mark");
    expect(mark).toBeTruthy();
  });

  it("브랜드 타이틀 'Alpharium'이 원문 그대로 보인다(Clarifications)", async () => {
    await render(<LogoScreen onDone={() => {}} />);
    expect(screen.getByText("Alpharium")).toBeTruthy();
  });

  it("하단 안내 문구 '휴대폰 안에서만'이 보인다", async () => {
    await render(<LogoScreen onDone={() => {}} />);
    expect(screen.getByText(/휴대폰 안에서만/i)).toBeTruthy();
  });

  it("로딩 점 3개가 렌더된다", async () => {
    await render(<LogoScreen onDone={() => {}} />);
    expect(screen.getByTestId("splash-loading-dot-0")).toBeTruthy();
    expect(screen.getByTestId("splash-loading-dot-1")).toBeTruthy();
    expect(screen.getByTestId("splash-loading-dot-2")).toBeTruthy();
  });
});

describe("LogoScreen — 자동 전환 (FR-006)", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("LOGO_DISPLAY_MS 경과 후 onDone이 호출된다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    await render(<LogoScreen onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();

    await act(() => {
      jest.advanceTimersByTime(LOGO_DISPLAY_MS);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("언마운트되면 타이머가 정리되어 onDone이 불리지 않는다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const { unmount } = await render(<LogoScreen onDone={onDone} />);

    await act(() => {
      unmount();
    });
    await act(() => {
      jest.advanceTimersByTime(LOGO_DISPLAY_MS * 2);
    });

    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("LogoScreen — 원칙 IV 소스 검사 (FR-005)", () => {
  const RAW = readFileSync(join(__dirname, "../../src/ui/LogoScreen.tsx"), "utf8");
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("모델 식별자·퍼센트·진행률 계산 흔적이 없다", () => {
    expect(RAW).not.toMatch(/kanana|exaone|hyperclovax|qwen3?|gemma3?|GGUF|Q4_|Q8_/i);
    expect(CODE).not.toMatch(/%|progress|fraction/i);
  });
});

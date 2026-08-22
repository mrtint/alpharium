/**
 * 덮어쓰기 확인 화면 테스트.
 *
 * 계약: specs/012-today-diary/contracts/overwrite-confirm.md §2 「화면」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 판정은 `state.ts`가 한다 — 이 화면은 `confirm-overwrite` 상태를
 * 받아 날짜·확인·취소만 보여준다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen, userEvent } from "@testing-library/react-native";

import { OverwriteConfirmScreen } from "../../src/ui/OverwriteConfirmScreen";

const noop = () => {};

describe("V1~V3 — 보여야 하는 것 (FR-011·012)", () => {
  it("V1. 확인 문구가 보인다", async () => {
    await render(<OverwriteConfirmScreen day="2026-08-20" onCancel={noop} onConfirm={noop} />);
    expect(screen.getByText(/덮어쓸지|덮어쓸 것인지|이미 있다/)).toBeTruthy();
  });

  it("V2. 확인 대상 날짜가 보인다", async () => {
    await render(<OverwriteConfirmScreen day="2026-08-20" onCancel={noop} onConfirm={noop} />);
    expect(screen.getByText(/2026-08-20/)).toBeTruthy();
  });

  it("V3. 확인·취소 두 버튼이 보인다", async () => {
    await render(<OverwriteConfirmScreen day="2026-08-20" onCancel={noop} onConfirm={noop} />);
    expect(screen.getByText("확인")).toBeTruthy();
    expect(screen.getByText("취소")).toBeTruthy();
  });
});

describe("X1~X3 — 보이면 안 되는 것", () => {
  it("X1. 기존 일기의 본문이 없다 (원칙 I)", async () => {
    await render(<OverwriteConfirmScreen day="2026-08-20" onCancel={noop} onConfirm={noop} />);
    // 화면 어디에도 일기 텍스트가 실릴 자리가 없다 — props 자체에 entry가 없다.
    expect(screen.queryByText(/주인은|나는 휴대폰/)).toBeNull();
  });

  it("X2. 진행률·경과 시간이 없다 (원칙 IV)", async () => {
    await render(<OverwriteConfirmScreen day="2026-08-20" onCancel={noop} onConfirm={noop} />);
    for (const metric of ["%", "초", "진행", "elapsed"]) {
      expect(screen.queryByText(new RegExp(metric))).toBeNull();
    }
  });

  it("X3. 모델 이름·캐릭터 내부 식별자가 없다 (원칙 III)", async () => {
    await render(<OverwriteConfirmScreen day="2026-08-20" onCancel={noop} onConfirm={noop} />);
    for (const leaked of ["quiet", "narrative", "gguf", "kanana"]) {
      expect(screen.queryByText(new RegExp(leaked))).toBeNull();
    }
  });
});

describe("버튼이 각각의 콜백을 부른다", () => {
  it("확인을 누르면 onConfirm이 불린다", async () => {
    const user = userEvent.setup();
    let confirmed = false;
    await render(
      <OverwriteConfirmScreen
        day="2026-08-20"
        onCancel={noop}
        onConfirm={() => {
          confirmed = true;
        }}
      />,
    );
    await user.press(screen.getByText("확인"));
    expect(confirmed).toBe(true);
  });

  it("취소를 누르면 onCancel이 불린다", async () => {
    const user = userEvent.setup();
    let cancelled = false;
    await render(
      <OverwriteConfirmScreen
        day="2026-08-20"
        onCancel={() => {
          cancelled = true;
        }}
        onConfirm={noop}
      />,
    );
    await user.press(screen.getByText("취소"));
    expect(cancelled).toBe(true);
  });
});

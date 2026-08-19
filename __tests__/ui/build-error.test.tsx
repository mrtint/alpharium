/**
 * 빌드 오류 화면 테스트.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2, FR-035b
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **사용자가 고칠 수 있는 문제가 아니다.** 그래서 「다시 시도하라」로 말하면 안 되고
 * (S10), 환경 변수 이름을 보여도 안 된다(원칙 III) — 뜻 없는 문자열을 떠넘기는 것이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen } from "@testing-library/react-native";

import { BuildErrorScreen } from "../../src/ui/BuildErrorScreen";

describe("빌드 오류 화면 (FR-035b)", () => {
  it("이 빌드가 잘못 만들어졌다는 것을 말한다", async () => {
    await render(<BuildErrorScreen />);

    expect(screen.getByText(/잘못 만들어졌다/)).toBeTruthy();
  });

  it("무엇을 하면 되는지 알려준다", async () => {
    await render(<BuildErrorScreen />);

    // 사용자가 할 수 있는 일은 「알리는 것」뿐이다.
    expect(screen.getByText(/알려야/)).toBeTruthy();
  });

  /**
   * ★ S10 — **「다시 시도하라」로 말하지 않는다.**
   *
   * 그렇게 말하면 사용자가 고칠 수 있다고 오해하고 같은 일을 반복한다.
   */
  it("★ 「다시 시도」가 없다", async () => {
    await render(<BuildErrorScreen />);

    for (const retry of ["다시 시도", "재시도", "다시 눌러"]) {
      expect(screen.queryByText(new RegExp(retry))).toBeNull();
    }
  });

  /**
   * ★ 원칙 III — **개발자 정보를 사용자에게 떠넘기지 않는다.**
   */
  it("★ 환경 변수 이름·값이 없다", async () => {
    await render(<BuildErrorScreen />);

    for (const leaked of ["EXPO_PUBLIC", "APP_ENV", "NODE_ENV", "prod", "dev", "local", ".env"]) {
      expect(screen.queryByText(new RegExp(leaked))).toBeNull();
    }
  });

  it("★ 모델 정보와 지표가 없다", async () => {
    await render(<BuildErrorScreen />);

    for (const leaked of ["gguf", "GGUF", "토큰", "초", "모델"]) {
      expect(screen.queryByText(new RegExp(leaked))).toBeNull();
    }
  });
});

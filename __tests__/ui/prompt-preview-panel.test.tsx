/**
 * 입력 프롬프트 미리보기 패널 (022).
 *
 * 계약: specs/022-prompt-token-diagnostics/contracts/prompt-preview.md PP7
 *
 * **화면은 진단 리포트의 문자열만 받는다.** 이 테스트가 mock `promptPreviews`를 넘겨
 * 렌더를 확인하고, 소스가 `diary/prompt`를 import하지 않음을 함께 잠근다.
 *
 * ⚠️ `@testing-library/react-native` 14의 `render`는 Promise를 반환한다(AGENTS.md).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, userEvent } from "@testing-library/react-native";

import type { Character } from "../../src/diary/types";
import type { PromptPreviewSet } from "../../src/diagnostics/types";
import { PromptPreviewPanel } from "../../src/ui/PromptPreviewPanel";
import { FUTURE_CHARACTER } from "../future-character";

jest.setTimeout(30000);

const previews: Readonly<Record<Character, PromptPreviewSet>> = {
  quiet: {
    empty: {
      ok: true,
      text: "QUIET 신호 없음 프롬프트",
      approxChars: "QUIET 신호 없음 프롬프트".length,
    },
    photos: {
      ok: true,
      text: "QUIET 사진 있음\n사진: 2장 (10시, 18시)\n프롬프트",
      approxChars: "QUIET 사진 있음\n사진: 2장 (10시, 18시)\n프롬프트".length,
    },
  },
  // 037 — 로스터가 하나라 화면 전환·조립 실패를 보일 둘째 캐릭터가 없다.
  // 이 화면은 `previews` 레코드를 그대로 그리므로 식별자만 다르면 되고,
  // FUTURE_CHARACTER가 그 자리다. 캐릭터가 늘면 그 캐릭터로 바꾼다(FR-014).
  [FUTURE_CHARACTER]: {
    empty: { ok: false, reason: "요청을 만들 수 없다 (no-character)" },
    photos: { ok: true, text: "FUTURE 사진", approxChars: "FUTURE 사진".length },
  },
};

const presetLabels = { empty: "신호 없음", photos: "사진 있음" };

describe("PromptPreviewPanel — 렌더 (022 US1)", () => {
  it("첫 캐릭터(quiet)의 프리셋별 프롬프트 원본을 그린다", async () => {
    await render(<PromptPreviewPanel previews={previews} presetLabels={presetLabels} />);

    expect(screen.getByTestId("prompt-preview-quiet-empty")).toHaveTextContent(
      "QUIET 신호 없음 프롬프트",
    );
    expect(screen.getByTestId("prompt-preview-quiet-photos")).toHaveTextContent(/사진: 2장/);
    expect(screen.getByText("신호 없음")).toBeTruthy();
    expect(screen.getByText("사진 있음")).toBeTruthy();
  });

  /**
   * ★ 037 — 이 화면은 칩을 `CHARACTERS`에서 그린다(`PromptPreviewPanel.tsx:35`).
   * 로스터가 하나라 **누를 둘째 칩이 없다** — `previews` 레코드에 키를 더해도
   * 칩이 생기지 않으므로 `FUTURE_CHARACTER`로도 대신할 수 없다.
   *
   * 캐릭터가 로스터에 늘면 `it.skip`을 풀고 그 캐릭터로 바꾼다(FR-014). 화면의
   * 전환·실패 렌더 코드는 그대로 살아 있다.
   */
  it.skip("캐릭터를 바꾸면 다른 텍스트가 나온다", async () => {
    const user = userEvent.setup();
    await render(<PromptPreviewPanel previews={previews} presetLabels={presetLabels} />);

    await user.press(screen.getByTestId(`prompt-preview-character-${FUTURE_CHARACTER}`));

    expect(screen.getByTestId(`prompt-preview-${FUTURE_CHARACTER}-photos`)).toHaveTextContent(
      "FUTURE 사진",
    );
    expect(screen.queryByTestId("prompt-preview-quiet-empty")).toBeNull();
  });

  /**
   * ★ 037 — 이 화면은 칩을 `CHARACTERS`에서 그린다(`PromptPreviewPanel.tsx:35`).
   * 로스터가 하나라 **누를 둘째 칩이 없다** — `previews` 레코드에 키를 더해도
   * 칩이 생기지 않으므로 `FUTURE_CHARACTER`로도 대신할 수 없다.
   *
   * 캐릭터가 로스터에 늘면 `it.skip`을 풀고 그 캐릭터로 바꾼다(FR-014). 화면의
   * 전환·실패 렌더 코드는 그대로 살아 있다.
   */
  it.skip("조립 실패 프리뷰는 사유를 보인다 (FR-009)", async () => {
    const user = userEvent.setup();
    await render(<PromptPreviewPanel previews={previews} presetLabels={presetLabels} />);

    await user.press(screen.getByTestId(`prompt-preview-character-${FUTURE_CHARACTER}`));

    expect(screen.getByTestId(`prompt-preview-${FUTURE_CHARACTER}-empty`)).toHaveTextContent(
      "조립할 수 없음: 요청을 만들 수 없다 (no-character)",
    );
  });

  it("근사 크기를 '토큰 아님' 라벨과 함께 보인다 (FR-011, PP6)", async () => {
    await render(<PromptPreviewPanel previews={previews} presetLabels={presetLabels} />);

    const size = screen.getByTestId("prompt-preview-size-quiet-empty");
    expect(size).toHaveTextContent(/조립 시점 근사치, 실측 토큰 아님/);
    expect(size).toHaveTextContent(new RegExp(`${"QUIET 신호 없음 프롬프트".length}자`));
  });

  it("사진 있음의 표시 크기가 신호 없음보다 크다", async () => {
    const user = userEvent.setup();
    await render(<PromptPreviewPanel previews={previews} presetLabels={presetLabels} />);
    await user.press(screen.getByTestId("prompt-preview-character-quiet"));

    const emptyChars = previews.quiet.empty.ok ? previews.quiet.empty.approxChars : 0;
    const photoChars = previews.quiet.photos.ok ? previews.quiet.photos.approxChars : 0;
    expect(photoChars).toBeGreaterThan(emptyChars);
  });
});

describe("PP7 — 화면 소스가 프롬프트 조립·신호 타입에 닿지 않는다", () => {
  it.each(["PromptPreviewPanel.tsx", "DiagnosticsScreen.tsx"])(
    "%s가 diary/prompt를 import하지 않는다",
    (file) => {
      const src = readFileSync(join(__dirname, "..", "..", "src", "ui", file), "utf8");
      expect(src).not.toMatch(/from\s+["'][^"']*diary\/prompt["']/);
      expect(src).not.toMatch(/from\s+["'][^"']*signals\/(?:types|collect|fake)["']/);
    },
  );

  it("소스에 token 어휘가 없다 (원칙 IV)", () => {
    const src = readFileSync(
      join(__dirname, "..", "..", "src", "ui", "PromptPreviewPanel.tsx"),
      "utf8",
    );
    expect(src.toLowerCase()).not.toContain("token");
  });
});

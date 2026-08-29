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
  narrative: {
    empty: { ok: true, text: "NARRATIVE 신호 없음", approxChars: "NARRATIVE 신호 없음".length },
    photos: { ok: true, text: "NARRATIVE 사진 있음", approxChars: "NARRATIVE 사진 있음".length },
  },
  imaginative: {
    empty: { ok: false, reason: "요청을 만들 수 없다 (no-character)" },
    photos: { ok: true, text: "IMAGINATIVE 사진", approxChars: "IMAGINATIVE 사진".length },
  },
  chinese: {
    empty: { ok: true, text: "CHINESE 中文", approxChars: "CHINESE 中文".length },
    photos: { ok: true, text: "CHINESE 사진", approxChars: "CHINESE 사진".length },
  },
  english: {
    empty: { ok: true, text: "ENGLISH prompt", approxChars: "ENGLISH prompt".length },
    photos: { ok: true, text: "ENGLISH photo prompt", approxChars: "ENGLISH photo prompt".length },
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

  it("캐릭터를 바꾸면 다른 텍스트가 나온다", async () => {
    const user = userEvent.setup();
    await render(<PromptPreviewPanel previews={previews} presetLabels={presetLabels} />);

    await user.press(screen.getByTestId("prompt-preview-character-narrative"));

    expect(screen.getByTestId("prompt-preview-narrative-empty")).toHaveTextContent(
      "NARRATIVE 신호 없음",
    );
    expect(screen.queryByTestId("prompt-preview-quiet-empty")).toBeNull();
  });

  it("조립 실패 프리뷰는 사유를 보인다 (FR-009)", async () => {
    const user = userEvent.setup();
    await render(<PromptPreviewPanel previews={previews} presetLabels={presetLabels} />);

    await user.press(screen.getByTestId("prompt-preview-character-imaginative"));

    expect(screen.getByTestId("prompt-preview-imaginative-empty")).toHaveTextContent(
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

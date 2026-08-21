/**
 * 캐릭터 목록 화면 — 내려받기 상태와 거부 안내 (008, V8~V15).
 *
 * 계약: specs/008-download-conflict-feedback/contracts/download-view.md §계약 2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **⚠️ 이 화면에 device-free 테스트가 지금까지 하나도 없었다**(2026-08-21 확인).
 *
 * 003이 만든 뒤 `boundaries.test.ts`가 **소스 문자열만** 훑었고, Maestro 흐름은 주소가
 * 없어 실제 내려받기를 돌리지 않았다. **이 파일이 그 그물을 처음 세운다** — 008이 이
 * 화면을 크게 고치므로 회귀를 잡을 것이 필요하다.
 *
 * ⚠️ `@testing-library/react-native` 14의 `render`는 **Promise를 반환한다**(AGENTS.md).
 * `await` 없이 쓰면 `screen`이 비고 오류 문구가 원인을 가리키지 않는다.
 *
 * ⚠️ `toHaveTextContent`는 **정확히 일치**를 보므로 부분 문자열은 정규식으로 준다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen, userEvent } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Character } from "../../src/diary/types";
import { resolveDownloadView } from "../../src/models/download-view";
import type { DownloadProgress, DownloadRejection, ModelReadiness } from "../../src/models/types";
import { CharacterListScreen } from "../../src/ui/CharacterListScreen";

const noop = () => {};

const CHARACTERS = ["quiet", "narrative", "imaginative", "chinese", "english"] as const;

/** 전부 「받아야 함」인 기본 상태. 필요한 것만 덮어쓴다 */
function readinessWith(
  overrides: Partial<Record<Character, ModelReadiness>> = {},
): Record<Character, ModelReadiness> {
  const base = Object.fromEntries(
    CHARACTERS.map((c) => [c, { kind: "not-downloaded" } as ModelReadiness]),
  ) as Record<Character, ModelReadiness>;
  return { ...base, ...overrides };
}

async function renderList(options: {
  active?: DownloadProgress | null;
  rejection?: DownloadRejection | null;
  readiness?: Record<Character, ModelReadiness>;
  onPause?: () => void;
  onPrepare?: (character: Character) => void;
  onDismissNotice?: () => void;
}) {
  const view = resolveDownloadView(options.active ?? null, options.rejection ?? null);

  await render(
    <CharacterListScreen
      readiness={options.readiness ?? readinessWith()}
      view={view}
      onPrepare={options.onPrepare ?? noop}
      onPause={options.onPause ?? noop}
      onRemove={noop}
      onDismissNotice={options.onDismissNotice ?? noop}
    />,
  );
}

/* ───────────────────── V10~V13 — 거부 안내 (US1) ───────────────────── */

describe("거부 안내 (FR-001·002·003)", () => {
  const receiving: DownloadProgress = { character: "quiet", fraction: 0.4 };
  const rejection: DownloadRejection = { requested: "narrative", busyWith: "quiet" };

  // V10 — 무엇을 멈춰야 하는지 알아야 한다
  it("★ 안내가 받는 중인 캐릭터를 말한다(V10)", async () => {
    await renderList({ active: receiving, rejection });

    expect(screen.getByTestId("download-notice")).toHaveTextContent(/quiet/);
  });

  /**
   * V11 — **빠져나갈 길을 말한다.**
   *
   * 이것을 빠뜨리면 안내가 무의미하다. 「거부됨」만 말하고 어떻게 하면 되는지
   * 말하지 않으면 사용자는 여전히 갇힌다 — 003 FR-020a가 막으려던 상태다.
   */
  it("★ 안내가 멈추면 된다는 것을 말한다(V11)", async () => {
    await renderList({ active: receiving, rejection });

    expect(screen.getByTestId("download-notice")).toHaveTextContent(/멈추/);
  });

  // V12 — 사용자가 닫을 수 있다 (FR-005)
  it("안내를 닫을 수 있다(V12)", async () => {
    const onDismissNotice = jest.fn();
    await renderList({ active: receiving, rejection, onDismissNotice });

    await userEvent.press(screen.getByTestId("dismiss-notice"));

    expect(onDismissNotice).toHaveBeenCalled();
  });

  // 거부가 없으면 안내 자리도 없다
  it("거부가 없으면 안내가 없다", async () => {
    await renderList({ active: receiving, rejection: null });

    expect(screen.queryByTestId("download-notice")).toBeNull();
  });

  /**
   * V13 — **거부당한 줄이 특별해지지 않는다**(FR-007·010).
   *
   * 거부는 그 캐릭터의 **준비 상태를 바꾸지 않았다.** 「받아야 함」이던 것은 그대로
   * 「받아야 함」이며, 받는 중으로도 실패로도 보이지 않는다.
   */
  it("★ 거부당한 줄이 평소대로다(V13)", async () => {
    await renderList({ active: receiving, rejection });

    const row = screen.getByTestId("character-row-narrative");
    expect(row).toHaveTextContent(/받아야 함/);
    expect(row).not.toHaveTextContent(/받는 중/);
    expect(screen.queryByTestId("pause-narrative")).toBeNull();
  });
});

/* ───────────────────── V8·V9·V15 — 진행 표시 (US2) ───────────────────── */

describe("진행 표시 (FR-008·009·017)", () => {
  const receiving: DownloadProgress = { character: "quiet", fraction: 0.42 };
  const rejection: DownloadRejection = { requested: "narrative", busyWith: "quiet" };

  // V8 — 진행률이 보인다
  it("받는 중인 줄에 진행률이 보인다(V8)", async () => {
    await renderList({ active: receiving });

    expect(screen.getByTestId("character-row-quiet")).toHaveTextContent(/42%/);
  });

  /**
   * ★ **V9 — 거부 뒤에도 멈추기 버튼이 있다**(FR-009).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **이것이 버그 ②의 화면 쪽 검증이다.**
   *
   * 006까지 다른 캐릭터를 누르면 받던 것의 진행률이 지워졌고, 멈추기 버튼이 **그와
   * 함께 사라져** 사용자가 갇혔다 — 멈출 수도, 다른 것을 받을 수도 없었다.
   * V11의 안내가 「멈추면 됩니다」라고 말하는데 멈출 버튼이 없으면 **거짓말이다.**
   * ─────────────────────────────────────────────────────────────────────────
   */
  it("★ 거부당한 뒤에도 받던 줄의 진행률과 멈추기가 남는다(V9)", async () => {
    await renderList({ active: receiving, rejection });

    expect(screen.getByTestId("character-row-quiet")).toHaveTextContent(/42%/);
    expect(screen.getByTestId("pause-quiet")).toBeTruthy();
  });

  it("멈추기를 누르면 멈춘다", async () => {
    const onPause = jest.fn();
    await renderList({ active: receiving, rejection, onPause });

    await userEvent.press(screen.getByTestId("pause-quiet"));

    expect(onPause).toHaveBeenCalled();
  });

  /**
   * V15 — **백분율을 모르면 지어내지 않는다**(FR-017, 원칙 V).
   *
   * 탭에서 돌아온 직후가 이 상태다 — 받는 중인 것은 알지만 백분율은 아직 모른다.
   * 「0%」로 채우면 「하나도 안 받았다」는 거짓이 된다.
   */
  it("★ 백분율을 모르면 숫자를 지어내지 않는다(V15)", async () => {
    await renderList({ active: { character: "quiet", fraction: null } });

    const row = screen.getByTestId("character-row-quiet");
    expect(row).toHaveTextContent(/받는 중/);
    expect(row).not.toHaveTextContent(/%/);
  });

  // FR-010 — 진행 표시는 실제로 받는 중인 것에만 붙는다
  it("받는 중이 아닌 줄에는 멈추기가 없다", async () => {
    await renderList({ active: receiving });

    expect(screen.queryByTestId("pause-narrative")).toBeNull();
    expect(screen.queryByTestId("pause-imaginative")).toBeNull();
  });

  // FR-012 — 받는 것이 없으면 진행 표시도 없다
  it("받는 것이 없으면 어느 줄도 받는 중이 아니다", async () => {
    await renderList({ active: null });

    for (const character of CHARACTERS) {
      expect(screen.queryByTestId(`pause-${character}`)).toBeNull();
    }
  });
});

/* ─────────────── 탭에서 돌아왔을 때 (US3, FR-013) ─────────────── */

describe("되찾은 진행 상태 (FR-013)", () => {
  /**
   * 탭을 왕복하고 돌아오면 `acquisition.busyWith()`가 **캐릭터만** 준다 —
   * 백분율은 콜백으로만 오므로 아직 모른다.
   *
   * **그 상태가 화면에서 온전해야 한다**: 받는 중으로 보이고, 멈출 수 있고,
   * **숫자를 지어내지 않는다.**
   */
  it("★ 백분율 없이 되찾아도 받는 중으로 보이고 멈출 수 있다", async () => {
    await renderList({ active: { character: "quiet", fraction: null } });

    const row = screen.getByTestId("character-row-quiet");
    expect(row).toHaveTextContent(/받는 중/);
    expect(row).not.toHaveTextContent(/0%/);
    // ★ 멈출 수 없으면 되찾은 의미가 없다 — 사용자가 다시 갇힌다.
    expect(screen.getByTestId("pause-quiet")).toBeTruthy();
  });
});

/* ───────────────────── V14 — 원칙 III (모델 정보 0건) ───────────────────── */

describe("원칙 III — 모델 정보가 새지 않는다 (FR-004, V14)", () => {
  /**
   * 헌법 로스터의 다섯 모델 이름과 규모·양자화가 **화면에 하나도 없어야 한다.**
   * 거부 안내가 새 문구이므로 여기가 새 위험이다 — 「quiet을 받는 중(2.1GB)」처럼
   * 쓰기 쉽다.
   */
  it("★ 화면 어디에도 모델 정보가 없다(V14)", async () => {
    await renderList({
      active: { character: "quiet", fraction: 0.4 },
      rejection: { requested: "narrative", busyWith: "quiet" },
    });

    const text = JSON.stringify(screen.toJSON());
    for (const forbidden of ["kanana", "exaone", "hyperclova", "qwen", "gemma", "gguf", "Q4_K_M"]) {
      expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
    // 규모·크기도 나오지 않는다
    expect(text).not.toMatch(/\d+(\.\d+)?\s?[BG]B?\b/);
  });

  /**
   * **조심해서 안 쓰는 것이 아니라 쓸 수 없다.**
   *
   * 007이 헌법 검사로 강제한 것을 여기서 다시 확인한다 — 이 파일이 `roster`·
   * `assetFor`·`ModelAsset`을 import 하지 않으므로 크기를 **알 방법이 없다.**
   */
  it("★ 화면이 모델 자산에 닿는 통로가 없다", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src", "ui", "CharacterListScreen.tsx"),
      "utf8",
    );

    // **주석은 걷어내고 코드만 본다.** 이 파일의 주석이 "`ModelAsset`을 import 하지
    // 않는다"고 **설명하고 있으며**, 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다
    // (`scripts/constitution-rules.ts`가 같은 이유로 같은 처리를 한다).
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(code).not.toContain("ModelAsset");
    expect(code).not.toContain("assetFor");
    expect(code).not.toMatch(/from\s+["'].*models\/roster["']/);
  });
});

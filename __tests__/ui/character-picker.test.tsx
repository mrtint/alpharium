/**
 * 캐릭터를 고르는 자리.
 *
 * 계약: specs/007-diary-ui-refinement/contracts/selection.md §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 헌법 원칙 III이 여기서 시험받는다.**
 *
 * 003의 `CharacterListScreen`이 준비(받기·지우기)를 맡고, 이 화면은 **준비된 것 중
 * 고르는 일**을 맡는다. 처음으로 「고르는 행위」가 화면에 생기므로 모델 정보가 새는지
 * 여부가 여기서 판가름난다.
 *
 * ⚠️ `@testing-library/react-native` 14의 `render`는 **Promise를 반환한다**(AGENTS.md).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen, userEvent } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Character } from "../../src/diary/types";
import { personaOf } from "../../src/diary/persona";
import { CharacterPicker } from "../../src/ui/CharacterPicker";

const noop = () => {};

/** 준비된 것과 아닌 것을 섞어 만든다 */
function entries(ready: Character[]): { character: Character; ready: boolean }[] {
  return (["quiet", "narrative", "imaginative", "chinese", "english"] as const).map(
    (character) => ({ character, ready: ready.includes(character) }),
  );
}

async function renderPicker(
  ready: Character[],
  selected: Character | null,
  onSelect: (character: Character) => void = noop,
) {
  await render(
    <CharacterPicker characters={entries(ready)} selected={selected} onSelect={onSelect} />,
  );
}

describe("CharacterPicker (007 contracts/selection.md §4 검증 표)", () => {
  it("1. 준비된 것이 둘이고 하나가 골라져 있으면 어느 것인지 보인다(FR-002)", async () => {
    await renderPicker(["quiet", "narrative"], "quiet");

    // 고른 것이 눌린 상태로 표시된다 — 접근성 상태로 검사하므로 스타일에 묶이지 않는다.
    // 014 — 버튼의 접근성 이름이 내부 식별자가 아니라 persona 이름으로 바뀐다.
    const chosen = screen.getByRole("button", { name: new RegExp(personaOf("quiet").name) });
    expect(chosen.props.accessibilityState?.selected).toBe(true);
  });

  it("2. 준비되지 않은 캐릭터는 고를 수 있는 것으로 보이지 않는다(FR-004)", async () => {
    await renderPicker(["quiet"], "quiet");

    const notReady = screen.getByRole("button", {
      name: new RegExp(personaOf("narrative").name),
    });
    expect(notReady.props.accessibilityState?.disabled).toBe(true);
  });

  it("3. 준비된 것을 누르면 그 캐릭터로 onSelect가 불린다(FR-001)", async () => {
    const picked: Character[] = [];
    await renderPicker(["quiet", "narrative"], "quiet", (c) => picked.push(c));

    await userEvent.press(
      screen.getByRole("button", { name: new RegExp(personaOf("narrative").name) }),
    );

    expect(picked).toEqual(["narrative"]);
  });

  it("4. 준비되지 않은 것을 누르면 onSelect가 불리지 않는다(FR-004)", async () => {
    const picked: Character[] = [];
    await renderPicker(["quiet"], "quiet", (c) => picked.push(c));

    await userEvent.press(
      screen.getByRole("button", { name: new RegExp(personaOf("english").name) }),
    );

    // **고를 수 없는 것을 고른 상태로 만들지 않는다** — 쓰려다 실패하게 된다.
    expect(picked).toEqual([]);
  });

  /**
   * ★ 5. **모델 정보가 0건이다**(FR-007, SC-011, 원칙 III).
   *
   * 사용자는 모델 이름을 보고 고르지 않는다. 파라미터 수·양자화·크기가 보이면
   * 그것으로 모델을 역추적할 수 있다.
   */
  it("5. 모델 식별자·크기·속도가 화면에 없다(FR-007, SC-011)", async () => {
    await renderPicker(["quiet", "narrative", "imaginative", "chinese", "english"], "quiet");

    const rendered = JSON.stringify(screen.toJSON());
    for (const forbidden of [
      "Q4_K_M",
      "gguf",
      "GGUF",
      "hyperclovax",
      "kanana",
      "exaone",
      "qwen",
      "gemma",
      "GB",
      "MB",
      "B 모델",
      "파라미터",
      "토큰",
    ]) {
      expect(rendered).not.toContain(forbidden);
    }
  });

  it("6. 준비된 것이 하나도 없으면 준비하라는 안내가 보인다(FR-006)", async () => {
    await renderPicker([], null);

    // 「어디로 가야 하는가」까지 말한다 — 「준비해야 한다」만으로는 사용자가 헤맨다.
    expect(screen.getByText(/캐릭터 탭/)).toBeTruthy();
  });

  /**
   * 7. **`imaginative`만 고지가 붙는다**(FR-009 예외).
   *
   * 헌법 로스터가 "이 캐릭터는 상상을 섞는다는 것을 사용자에게 알린다(MUST)"고
   * 요구했다 — **지어낸 설명이 아니라 헌법 본문이 근거다.** 006 실측이 이를
   * 뒷받침한다(같은 하루에 quiet 0건, imaginative 2건 지어냄).
   */
  it("7. imaginative에 「상상을 섞는다」 고지가 있다(헌법 로스터 MUST)", async () => {
    await renderPicker(["imaginative"], "imaginative");

    // 014 — 오드의 소개("상상력이 풍부해요")와 헌법 MUST 고지("상상을 섞어
    // 씁니다")가 둘 다 "상상"을 포함하므로 고지 문구로 정확히 매칭한다.
    expect(screen.getByText("상상을 섞어 씁니다")).toBeTruthy();
  });

  /**
   * ★ 014 — **성격 문안은 이제 persona.ts가 정한 한 줄 소개로만 나온다**(FR-001·002).
   *
   * 이전에는 성격 설명 자체가 없었다("관측 근거가 이 저장소에 없다"). 이제
   * `persona.ts`가 로드맵 문서의 실측 근거 있는 소개를 담아 다섯 자리 모두에
   * 소개가 붙는다 — 지어낸 문구가 새로 추가된 것이 아니라, 근거가 이미 있던
   * 값이 화면에 연결됐다(원칙 III).
   */
  it("다섯 자리 모두 persona.ts의 소개가 보인다(014 FR-001)", async () => {
    await renderPicker(["quiet", "narrative", "chinese", "english"], "quiet");

    for (const character of ["quiet", "narrative", "chinese", "english"] as const) {
      expect(screen.getByText(new RegExp(personaOf(character).tagline))).toBeTruthy();
    }

    // 헌법 MUST 고지("상상을 섞어 씁니다")는 imaginative 자리에 **하나만** 있다 —
    // 넷으로 번지지 않았다. 오드의 소개("상상력이 풍부해요")는 별개이며 이 검사의
    // 대상이 아니다.
    expect(screen.getAllByText("상상을 섞어 씁니다")).toHaveLength(1);
  });

  it("다섯 자리가 처음부터 전부 보인다(003 FR-005a를 이어받는다)", async () => {
    await renderPicker([], null);

    for (const character of ["quiet", "narrative", "imaginative", "chinese", "english"] as const) {
      expect(screen.getByText(new RegExp(personaOf(character).name))).toBeTruthy();
    }
  });

  it("내부 식별자가 화면에 노출되지 않는다(014 FR-004)", async () => {
    await renderPicker(["quiet", "narrative", "imaginative", "chinese", "english"], "quiet");

    for (const character of ["quiet", "narrative", "imaginative", "chinese", "english"]) {
      expect(screen.queryByText(new RegExp(`^${character}$`))).toBeNull();
    }
  });

  it("추천 표시가 없다 — 다섯이 같은 자격으로 보인다(FR-008)", async () => {
    await renderPicker(["quiet", "narrative"], null);

    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toContain("추천");
    expect(rendered).not.toContain("권장");
  });
});

/**
 * ★ 모듈 그래프 검사 (계약 §4의 "모듈 그래프로도 검증한다").
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **조심해서 안 쓰는 것이 아니라 쓸 수 없어야 한다.**
 *
 * 003의 `CharacterListScreen`이 `ModelAsset`을 import 하지 않아 자산키·주소·크기·
 * 지문에 닿는 경로가 **아예 없는** 것과 같은 방어다. 위의 5번은 지금 보이는 것을
 * 검사하지만, 이 검사는 **닿을 수 있는 길 자체가 없음**을 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("CharacterPicker 모듈 그래프 (원칙 III)", () => {
  const source = readFileSync(
    join(__dirname, "..", "..", "src", "ui", "CharacterPicker.tsx"),
    "utf8",
  );

  /**
   * 주석을 걷어낸 실제 코드.
   *
   * **주석에서 `ModelAsset`을 언급하는 것은 위반이 아니다** — 오히려 왜 쓰지 않는지
   * 설명하는 자리다. 검사해야 할 것은 **닿을 수 있는 길이 있는가**이므로 코드만 본다.
   */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("roster를 import 하지 않는다", () => {
    expect(code).not.toContain("roster");
  });

  it("ModelAsset·assetFor에 닿지 않는다", () => {
    expect(code).not.toContain("ModelAsset");
    expect(code).not.toContain("assetFor");
  });

  it("models/ 아래 어떤 것도 import 하지 않는다", () => {
    expect(code).not.toMatch(/from\s+["'][^"']*models\//);
  });

  /**
   * import 문 자체를 세어 둔다 — 늘어나면 무엇이 들어왔는지 보게 된다.
   *
   * 014 — `../diary/persona`가 새로 추가된다. `persona.ts`는 `roster.ts`를
   * import하지 않으므로(계약 P2, persona.test.ts가 별도로 검증) 이 파일이
   * persona를 거쳐도 모델 자산에는 여전히 닿지 않는다.
   */
  it("import 하는 것은 react-native·캐릭터 타입·persona뿐이다", () => {
    const imports = [...code.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

    expect(imports.sort()).toEqual(["../diary/persona", "../diary/types", "react-native"]);
  });
});

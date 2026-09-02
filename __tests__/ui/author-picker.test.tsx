import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";

import { AuthorPicker, type AuthorOption } from "../../src/ui/AuthorPicker";

/**
 * 설정 탭 "일기 작성자" 섹션의 계약 테스트 (029).
 *
 * 계약: specs/029-writing-flow-simplification/contracts/settings-sections.md S1
 *       (SS1·SS2, ST3), US4 AS1·AS4
 *
 * **화면은 모델을 모른다**(원칙 III) — persona 이름·소개와 준비 여부만 props로
 * 받는다. 007 `CharacterPicker` 선례.
 */

const OPTIONS: AuthorOption[] = [
  { name: "금동이", tagline: "군더더기 없이 담백하게 적어요", ready: true, selected: true },
  { name: "루이", tagline: "하루를 이야기처럼 풀어내요", ready: false, selected: false },
  { name: "오드", tagline: "상상력이 풍부해요", ready: true, selected: false },
];

describe("SS1 — persona 이름·소개만 보인다 (원칙 III, ST3)", () => {
  it("다섯(여기선 셋) 캐릭터가 이름·소개로 렌더된다", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} />);

    expect(screen.getByText("금동이")).toBeTruthy();
    expect(screen.getByText("루이")).toBeTruthy();
    expect(screen.getByText("오드")).toBeTruthy();
    expect(screen.getByText("군더더기 없이 담백하게 적어요")).toBeTruthy();
  });

  it("모델 식별자·파라미터·양자화가 화면에 없다", async () => {
    const { toJSON } = await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} />);
    const rendered = JSON.stringify(toJSON());

    expect(rendered).not.toMatch(/kanana|exaone|hyperclovax|qwen|gemma|gguf|Q4_K_M|2\.1b|2\.4b/i);
  });

  it("소스가 models/roster·persona·assetFor에 닿지 않는다", () => {
    const SOURCE = readFileSync(join(__dirname, "../../src/ui/AuthorPicker.tsx"), "utf8");
    const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(CODE).not.toMatch(/models\/roster|assetFor|ModelAsset|diary\/persona/);
  });
});

describe("SS2 — 준비된 캐릭터를 고른다", () => {
  it("준비된 캐릭터를 누르면 그 index로 onSelect가 불린다", async () => {
    const picked: number[] = [];
    await render(<AuthorPicker options={OPTIONS} onSelect={(i) => picked.push(i)} />);

    fireEvent.press(screen.getByTestId("author-option-2")); // 오드 (ready)
    expect(picked).toEqual([2]);
  });

  it("미준비 캐릭터는 비활성이다 (내려받기 안내가 뜬다)", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} />);

    const luiRow = screen.getByTestId("author-option-1"); // 루이 (not ready)
    expect(luiRow.props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByText(/아직 준비되지 않음/)).toBeTruthy();
  });

  it("고정된 작성자에 표식이 있다", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} />);

    expect(screen.getByText("작성자")).toBeTruthy();
    expect(screen.getByTestId("author-option-0").props.accessibilityState?.selected).toBe(true);
  });
});

describe("US4 AS4 — 고정값이 없으면 온보딩 기본(quiet)이 현재 작성자다", () => {
  it("selected가 첫 항목(금동이)에만 있는 조합도 유효하다", async () => {
    // App.tsx 조립이 selected-character.json 없을 때 quiet=금동이를 selected로 넘긴다.
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} />);

    expect(screen.getByTestId("author-option-0").props.accessibilityState?.selected).toBe(true);
  });
});

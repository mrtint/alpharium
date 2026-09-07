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

/* ──────────── 035 — 이름 바꾸기 (contracts/welcome-gate.md W17~W20) ──────────── */

describe("W17 — 준비된 캐릭터만 이름을 바꿀 수 있다 (FR-022·FR-023)", () => {
  it("준비된 줄에 편집 진입점이 있다", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={() => {}} />);

    // 금동이(0)·오드(2)는 ready, 루이(1)는 미준비.
    expect(screen.queryByTestId("author-rename-0")).not.toBeNull();
    expect(screen.queryByTestId("author-rename-2")).not.toBeNull();
  });

  it("★ 미준비 줄에는 편집 진입점이 없다", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={() => {}} />);

    expect(screen.queryByTestId("author-rename-1")).toBeNull();
  });

  it("미준비 안내 문구는 그대로다 (029·034 회귀)", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={() => {}} />);

    expect(screen.getByText("아직 준비되지 않음 — 아래에서 내려받으세요")).toBeTruthy();
  });

  it("onRename을 주지 않으면 편집 진입점이 아예 없다 (029 동작 보존)", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} />);

    expect(screen.queryByTestId("author-rename-0")).toBeNull();
  });
});

describe("W18·W19 — 편집 입력과 저장", () => {
  it("편집을 열면 현재 이름이 초기값이다", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={() => {}} />);
    await fireEvent.press(screen.getByTestId("author-rename-0"));

    expect(screen.getByTestId("author-rename-input-0").props.value).toBe("금동이");
  });

  it("FR-013 — 입력 상한이 12다", async () => {
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={() => {}} />);
    await fireEvent.press(screen.getByTestId("author-rename-0"));

    expect(screen.getByTestId("author-rename-input-0").props.maxLength).toBe(12);
  });

  it("저장하면 index와 입력값을 넘긴다", async () => {
    const onRename = jest.fn();
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={onRename} />);

    await fireEvent.press(screen.getByTestId("author-rename-0"));
    await fireEvent.changeText(screen.getByTestId("author-rename-input-0"), "복실이");
    await fireEvent.press(screen.getByTestId("author-rename-save-0"));

    expect(onRename).toHaveBeenCalledWith(0, "복실이");
  });

  it("★ W19 — 비운 채 저장하면 빈 문자열을 넘긴다 (조립부가 기본 이름으로 되돌린다)", async () => {
    const onRename = jest.fn();
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={onRename} />);

    await fireEvent.press(screen.getByTestId("author-rename-0"));
    await fireEvent.changeText(screen.getByTestId("author-rename-input-0"), "");
    await fireEvent.press(screen.getByTestId("author-rename-save-0"));

    expect(onRename).toHaveBeenCalledWith(0, "");
  });

  it("취소하면 콜백을 부르지 않고 편집이 닫힌다", async () => {
    const onRename = jest.fn();
    await render(<AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={onRename} />);

    await fireEvent.press(screen.getByTestId("author-rename-0"));
    await fireEvent.changeText(screen.getByTestId("author-rename-input-0"), "복실이");
    await fireEvent.press(screen.getByTestId("author-rename-cancel-0"));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByTestId("author-rename-input-0")).toBeNull();
  });

  it("★ 편집 중 이름 prop이 바뀌어도 편집기가 살아 있다 (줄 key는 위치다)", async () => {
    // key={opt.name}이면 이름이 바뀌는 순간 줄이 언마운트·리마운트되어 편집
    // 상태가 사라진다 — 실기기에서 저장 버튼에 닿기 전에 편집기가 닫혔다(035).
    const { rerender } = await render(
      <AuthorPicker options={OPTIONS} onSelect={() => {}} onRename={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId("author-rename-0"));
    await fireEvent.changeText(screen.getByTestId("author-rename-input-0"), "복");

    // 부모가 다른 이유로 다시 그려도(예: readiness 갱신) 편집기가 유지된다.
    rerender(
      <AuthorPicker
        options={[{ ...OPTIONS[0]!, name: "금동이" }, OPTIONS[1]!, OPTIONS[2]!]}
        onSelect={() => {}}
        onRename={() => {}}
      />,
    );

    expect(screen.queryByTestId("author-rename-input-0")).not.toBeNull();
    expect(screen.getByTestId("author-rename-input-0").props.value).toBe("복");
  });

  it("★ 소스의 줄 key가 opt.name이 아니다 (리마운트로 편집이 날아가지 않도록)", () => {
    const CODE = readFileSync(join(__dirname, "../../src/ui/AuthorPicker.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(CODE).not.toMatch(/key=\{opt\.name\}/);
    expect(CODE).toMatch(/key=\{index\}/);
  });
});

describe("035 — 화면은 여전히 모델도 검증 규칙도 모른다 (원칙 III)", () => {
  it("사용자 지정 이름을 그대로 그린다 — 폴백은 조립부가 한다", async () => {
    const renamed = [{ ...OPTIONS[0]!, name: "복실이" }, OPTIONS[1]!, OPTIONS[2]!];
    await render(<AuthorPicker options={renamed} onSelect={() => {}} onRename={() => {}} />);

    expect(screen.getByText("복실이")).toBeTruthy();
    // 소개는 코드 안 고정값 그대로다(헌법 1.4.0 — 이름만 사용자가 짓는다).
    expect(screen.getByText("군더더기 없이 담백하게 적어요")).toBeTruthy();
  });

  it("src/welcome/를 import하지 않는다 (W14)", () => {
    const CODE = readFileSync(join(__dirname, "../../src/ui/AuthorPicker.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(CODE).not.toMatch(/from\s+["'][^"']*welcome\//);
    expect(CODE).not.toContain("validateCharacterName");
  });
});

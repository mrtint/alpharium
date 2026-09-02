import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";

import { VisionPicker } from "../../src/ui/VisionPicker";
import { VISION_SETTINGS } from "../../src/diary/types";

/**
 * 사진 설정 고르는 자리의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-015·016·018·019·019a·020
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 「사진과 시각 처리」가 이 화면의 모양을 정했다.**
 *
 * - 사진 이해 방식은 캐릭터가 아니라 설정이다(MUST)
 * - **사용자가 시각 인코더를 고르게 하지 않는다**(MUST NOT)
 *
 * SC-004가 그것을 검사한다 — 모델 이름·파일·크기가 하나도 없어야 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `@testing-library/react-native` 14의 `render`는 **Promise를 반환한다**(2026-08-16
 * 실측). `await` 없이 쓰면 `screen`이 비어 있고, 오류 문구가 원인을 가리키지 않는다.
 */

describe("셋이 보인다 (FR-015)", () => {
  it("보지 않음·빠르게 봄·자세히 봄이 있다", async () => {
    await render(<VisionPicker onSelect={() => {}} selected="none" />);

    expect(screen.getByText("사진을 보지 않음")).toBeTruthy();
    expect(screen.getByText("빠르게 봄")).toBeTruthy();
    expect(screen.getByText("자세히 봄")).toBeTruthy();
  });

  it("설정마다 testID가 있다 — release의 R8에서 살아남는다 (008 실측)", async () => {
    await render(<VisionPicker onSelect={() => {}} selected="none" />);

    for (const setting of VISION_SETTINGS) {
      expect(screen.getByTestId(`vision-${setting}`)).toBeTruthy();
    }
  });

  it("누르면 그 설정이 전달된다", async () => {
    const chosen: string[] = [];
    await render(<VisionPicker onSelect={(v) => chosen.push(v)} selected="none" />);

    fireEvent.press(screen.getByTestId("vision-detailed"));
    expect(chosen).toEqual(["detailed"]);
  });
});

describe("고른 것이 표시된다", () => {
  it.each(VISION_SETTINGS)("%s를 고르면 그 줄에 「선택」이 붙는다", async (setting) => {
    await render(<VisionPicker onSelect={() => {}} selected={setting} />);

    const row = screen.getByTestId(`vision-${setting}`);
    expect(row.props.accessibilityState?.selected).toBe(true);
  });

  it("고른 것은 하나뿐이다", async () => {
    await render(<VisionPicker onSelect={() => {}} selected="quick" />);

    expect(screen.getAllByText("선택")).toHaveLength(1);
  });

  // FR-018 — 007이 「말없이 집지 않는다」로 정한 것과 같은 판단이다.
  it("기본이 「보지 않음」이다", async () => {
    await render(<VisionPicker onSelect={() => {}} selected="none" />);

    expect(screen.getByTestId("vision-none").props.accessibilityState?.selected).toBe(true);
    expect(screen.getByTestId("vision-quick").props.accessibilityState?.selected).toBe(false);
  });
});

describe("무엇이 다른지 읽을 수 있다 (FR-019a·020)", () => {
  it("설정마다 설명이 있다", async () => {
    await render(<VisionPicker onSelect={() => {}} selected="none" />);

    expect(screen.getByText(/몇 장 있었는지만/)).toBeTruthy();
    expect(screen.getByText(/무엇이 담겼는지/)).toBeTruthy();
    expect(screen.getByText(/꼼꼼히/)).toBeTruthy();
  });

  /**
   * ★ FR-020 — 헌법 원칙 III이 「기다림처럼 사용자의 시간을 쓰는 것은 그 순간에
   * 알린다」고 했고, 여기서는 **고르기 전에** 알린다.
   */
  it("「자세히 봄」이 오래 걸린다는 것을 고르기 전에 알린다", async () => {
    await render(<VisionPicker onSelect={() => {}} selected="none" />);

    expect(screen.getByText(/오래 걸린다/)).toBeTruthy();
  });
});

/**
 * ★ SC-004 — 헌법이 「시각 인코더를 고르게 하지 않는다」(MUST NOT)로 못 박은 자리.
 */
describe("모델 정보가 하나도 없다 (FR-016, SC-004, 원칙 III)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/ui/VisionPicker.tsx"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("모델 이름·파일명이 소스에 없다", () => {
    expect(CODE).not.toMatch(/LFM|SmolVLM|mmproj|gguf|Qwen|gemma/i);
  });

  it("토큰 수·크기가 소스에 없다", () => {
    expect(CODE).not.toMatch(/image_max_tokens|\b256\b|\b1024\b|MB|GB/);
  });

  // 원칙 IV — 「2배 느리다」는 측정값이며, 적으면 사용자가 두 설정을 견주게 된다.
  it("초·백분율·배수가 소스에 없다", () => {
    expect(CODE).not.toMatch(/\d+\s*초|\d+%|\d+배|퍼센트/);
  });

  it("화면에도 모델 정보가 없다", async () => {
    const { toJSON } = await render(<VisionPicker onSelect={() => {}} selected="quick" />);
    const rendered = JSON.stringify(toJSON());

    expect(rendered).not.toMatch(/LFM|mmproj|gguf|256|1024|토큰/i);
  });

  it("모델 자산에 닿지 않는다", () => {
    expect(CODE).not.toMatch(/models\/roster|assetFor|ModelAsset|vision\/roster/);
  });
});

/**
 * ★ 029 — "자동"이 4번째 선택지로 앞에 온다 (FR-024, S2/SS5).
 */
describe("029 — 자동 포함 4-상태 (FR-024)", () => {
  it("자동/보지 않음/빠르게 봄/자세히 봄이 모두 있다", async () => {
    await render(<VisionPicker onSelect={() => {}} selected="auto" />);

    expect(screen.getByTestId("vision-auto")).toBeTruthy();
    expect(screen.getByTestId("vision-none")).toBeTruthy();
    expect(screen.getByTestId("vision-quick")).toBeTruthy();
    expect(screen.getByTestId("vision-detailed")).toBeTruthy();
  });

  it('"자동"을 고르면 onSelect("auto")가 불린다', async () => {
    const chosen: string[] = [];
    await render(<VisionPicker onSelect={(v) => chosen.push(v)} selected="none" />);

    fireEvent.press(screen.getByTestId("vision-auto"));
    expect(chosen).toEqual(["auto"]);
  });

  it('기본이 "자동"이면 그 줄이 선택됨으로 표시된다', async () => {
    await render(<VisionPicker onSelect={() => {}} selected="auto" />);

    expect(screen.getByTestId("vision-auto").props.accessibilityState?.selected).toBe(true);
    expect(screen.getByTestId("vision-none").props.accessibilityState?.selected).toBe(false);
  });

  it('"자동" 설명이 "사진이 있으면 빠르게, 없으면 안 본다"는 뜻이다', async () => {
    await render(<VisionPicker onSelect={() => {}} selected="auto" />);

    expect(screen.getByText(/사진이 있으면.*없으면/)).toBeTruthy();
  });
});

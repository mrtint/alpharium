import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";

import { ConstraintBand } from "../../src/ui/components/ConstraintBand";

/**
 * 108 — 제약 띠 부품 (계약 constraint-band.md CP1~CP4).
 */

jest.setTimeout(30000);

const props = { text: "사진 권한이 없어요", action: "권한 허용", onAction: () => {} };

describe("CP1 — 글자 하나와 채워진 버튼 하나, 닫기가 없다", () => {
  it("글자는 한 줄이고 글꼴 배율 상한은 1.2다", async () => {
    await render(<ConstraintBand {...props} />);
    const label = screen.getByText(props.text);
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.maxFontSizeMultiplier).toBe(1.2);
  });

  it("누를 수 있는 것은 버튼 하나뿐이다", async () => {
    await render(<ConstraintBand {...props} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("프롭에 닫기 계열 이름이 없다(소스 계약)", () => {
    const source = readFileSync(
      join(__dirname, "../../src/ui/components/ConstraintBand.tsx"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/dismiss|onClose/i);
  });
});

describe("CP2 — 버튼은 44 이상이고 역할·라벨을 가진다", () => {
  it("누르면 onAction", async () => {
    const onAction = jest.fn();
    await render(<ConstraintBand {...props} onAction={onAction} />);
    const button = screen.getByTestId("constraint-band-action");
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityLabel).toBe("권한 허용");
    expect(button.props.style).toEqual(expect.objectContaining({ minHeight: 44 }));
    await fireEvent.press(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe("CP3 — 읽는 순서는 글자 → 버튼", () => {
  it("글자가 버튼보다 먼저 트리에 있다", async () => {
    await render(<ConstraintBand {...props} />);
    // 화면 트리를 앞에서부터 훑어 글자가 나오는 순서를 본다
    const order: string[] = [];
    const walk = (node: unknown) => {
      if (typeof node === "string") order.push(node);
      else if (node !== null && typeof node === "object") {
        const children = (node as { children?: unknown[] | null }).children;
        if (Array.isArray(children)) children.forEach(walk);
      }
    };
    walk(screen.toJSON());
    expect(order.indexOf(props.text)).toBeGreaterThanOrEqual(0);
    expect(order.indexOf(props.action)).toBeGreaterThan(order.indexOf(props.text));
  });
});

describe("CP4 — hidden이면 보이지도 읽히지도 눌리지도 않는다(높이는 유지)", () => {
  it("opacity 0·접근성 숨김·터치 통과", async () => {
    await render(<ConstraintBand {...props} hidden />);
    const band = screen.getByTestId("constraint-band", { includeHiddenElements: true });
    expect(band.props.style).toEqual(expect.objectContaining({ opacity: 0 }));
    expect(band.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(band.props.accessibilityElementsHidden).toBe(true);
    expect(band.props.pointerEvents).toBe("none");
  });

  it("hidden이 아니면 보인다", async () => {
    await render(<ConstraintBand {...props} />);
    const band = screen.getByTestId("constraint-band");
    expect(band.props.style).toEqual(expect.objectContaining({ opacity: 1 }));
    expect(band.props.pointerEvents).toBe("auto");
  });
});

/**
 * T050 — 「적음」 확인의 **구조 조건** (006 SC-511·SC-512·SC-514)
 *
 * 006이 중립성을 **문면이 아니라 구조로** 지키기로 했다. 문장만 부드럽게 쓰고 취소를
 * 기본 선택에 두면 그것은 게이트다.
 *
 * - 006 FR-542: **진행이 기본 선택**인가
 * - 006 FR-543: 평가어(부족·빈약·미흡·불충분)와 경고 기호가 없는가
 * - 006 FR-540: 「보통」에서는 뜨지 않는가
 * - 006 FR-544: 전달하는 것이 **지금 반영되는 관측의 셈**인가
 *
 * **이월된 관찰 항목**: 사용자가 실제로 「말리는 것」으로 느끼는지는 이 구조적 조건으로
 * 닫히지 않는다. T062가 관찰로 받는다.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { ScaleNotice, shouldShowScaleNotice, EVALUATIVE_WORDS, WARNING_SYMBOLS } from "../../src/ui/components/ScaleNotice";
import { createDigest } from "../../src/signals/digest";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";

const digestWith = (scale: ScaleVerdict) =>
  createDigest({
    date: "2026-08-02",
    observedAt: "2026-08-02T18:30:00+09:00",
    steps: observed(4210),
    activePeriods: observed(["저녁"]),
    stays: unobserved(),
    moved: observed(true),
    photos: unobserved(),
    events: unobserved(),
    scale,
  });

const noop = () => undefined;

describe("「적음」일 때만 표시한다 (006 FR-540, SC-514)", () => {
  it("「적음」에서는 표시한다", () => {
    expect(shouldShowScaleNotice(ScaleVerdict.Modest)).toBe(true);
  });

  it("「보통」에서는 뜨지 않는다", () => {
    expect(shouldShowScaleNotice(ScaleVerdict.Normal)).toBe(false);
  });

  it("「비어 있음」에서는 뜨지 않는다 — 그 자리는 빈 집계 알림이다 (006 FR-526)", () => {
    expect(shouldShowScaleNotice(ScaleVerdict.Empty)).toBe(false);
  });
});

const renderNotice = () =>
  render(<ScaleNotice digest={digestWith(ScaleVerdict.Modest)} onProceed={noop} onCancel={noop} />);

describe("진행이 기본 선택이다 (006 FR-542, SC-511)", () => {
  it("기본 선택으로 표시되는 것은 진행이다", () => {
    const { getByTestId } = renderNotice();

    expect(getByTestId("scale-notice-proceed").props.accessibilityState?.selected).toBe(true);
    expect(getByTestId("scale-notice-cancel").props.accessibilityState?.selected).toBeFalsy();
  });

  it("진행이 먼저 놓인다 — 취소가 기본 자리를 차지하지 않는다", () => {
    const { getByTestId } = renderNotice();

    const testIds = React.Children.toArray(getByTestId("scale-notice-actions").props.children).map(
      (child) => (child as React.ReactElement<{ testID?: string }>).props.testID,
    );
    expect(testIds[0]).toBe("scale-notice-proceed");
  });

  it("취소 경로도 존재한다 — 진행이 유일한 선택은 아니다", () => {
    expect(renderNotice().getByTestId("scale-notice-cancel")).toBeTruthy();
  });
});

describe("평가어와 경고 기호를 쓰지 않는다 (006 FR-543, SC-512)", () => {
  /** 화면에 실제로 나오는 문면 전체를 모은다. */
  const visibleText = () => {
    const { toJSON } = renderNotice();
    return JSON.stringify(toJSON());
  };

  it.each(EVALUATIVE_WORDS)("평가어가 없다: %s", (word) => {
    expect(visibleText()).not.toContain(word);
  });

  it.each(WARNING_SYMBOLS)("경고 기호가 없다: %s", (symbol) => {
    expect(visibleText()).not.toContain(symbol);
  });

  it("금지 목록이 006 FR-543의 예시를 포함한다", () => {
    for (const word of ["부족", "빈약", "미흡", "불충분"]) {
      expect(EVALUATIVE_WORDS).toContain(word);
    }
  });
});

describe("전달하는 것은 지금 반영되는 관측의 셈이다 (006 FR-544)", () => {
  it("관측된 항목의 수가 표시된다", () => {
    const { getByTestId } = renderNotice();
    // 걸음 수·활동 시간대·이동 여부 셋이 관측되었다.
    expect(getByTestId("scale-notice-count").props.children).toEqual(expect.arrayContaining([3]));
  });
});

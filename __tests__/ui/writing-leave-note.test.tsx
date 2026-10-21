/**
 * 093 — 쓰는 중 화면의 플랫폼별 상시 안내 한 줄.
 *
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 */

import { render, screen } from "@testing-library/react-native";

import { WritingPaper } from "../../src/ui/WritingPaper";

describe("093 — WritingPaper 안내 줄", () => {
  it("leaveNote가 있으면 안내 줄 아래에 그린다", async () => {
    await render(<WritingPaper leaveNote="앱을 나가도 계속 써요." line="줄" name="금동이" />);
    expect(screen.getByTestId("writing-leave-note")).toHaveTextContent(/^앱을 나가도 계속 써요\.$/);
    const order = screen
      .getByTestId("writing-paper")
      .children.map((c) => (typeof c === "object" && "props" in c ? (c.props.testID ?? "") : ""))
      .filter((id) => id !== "");
    expect(order).toEqual([
      "writing-kicker",
      "writing-monologue",
      "writing-byline",
      "writing-leave-note",
    ]);
  });

  it("없으면(안드로이드) 줄이 없고 종전과 같다", async () => {
    await render(<WritingPaper line="줄" name="금동이" />);
    expect(screen.queryByTestId("writing-leave-note")).toBeNull();
    expect(screen.getByTestId("writing-byline")).toHaveTextContent(
      /^금동이가 쓰고 있어요\. 진행률은 세지 않아요\.$/,
    );
  });
});

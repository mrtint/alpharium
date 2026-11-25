/**
 * 132 — 홈 하단 안내는 한 번에 하나 (G6, contracts/lock-rules.md HB1·HB2, 규칙 문서 K8·K9 — 108 제약 띠로 옮겨 잠근다).
 *
 * - HB1(K8·R8): 토스트가 떠 있는 동안 제약 띠는 가려진다(보이지도 읽히지도 눌리지도 않는다).
 * - HB2(K9·3-3): 쓰는 중 화면에는 제약 띠가 없다.
 */

import { render, screen } from "@testing-library/react-native";

import { stripCellsFor, writePromptFor, type DiaryListItem } from "../../src/app/state";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";

jest.setTimeout(30000);

const NOW = new Date("2026-09-24T10:00:00");
const CONSTRAINT = { text: "사진 권한이 꺼져 있어요", action: "허용", onAction: jest.fn() };

async function renderList(extra: Partial<DiaryListScreenProps>) {
  const items: DiaryListItem[] = [];
  const write = writePromptFor(items, NOW, null);
  await render(
    <DiaryListScreen
      cells={stripCellsFor(items, write.day, NOW)}
      items={items}
      onSelectDay={jest.fn()}
      onWrite={jest.fn()}
      write={write}
      {...extra}
    />,
  );
}

describe("HB1(K8) — 토스트가 뜨면 띠는 가려진다", () => {
  it("토스트가 없으면 띠가 보인다(기준선)", async () => {
    await renderList({ constraint: CONSTRAINT });
    const band = screen.getByTestId("constraint-band");
    expect(band).toHaveStyle({ opacity: 1 });
    expect(band.props.pointerEvents).toBe("auto");
  });

  it("토스트와 함께면 띠는 가려지고 읽히지도 눌리지도 않는다", async () => {
    await renderList({ constraint: CONSTRAINT, toast: { id: 1, text: "일기를 쓰지 못했어요." } });
    expect(screen.getByTestId("failure-toast")).toBeTruthy();
    // 가려진 띠는 접근성 트리에서 빠지므로 숨은 요소까지 찾는다
    const band = screen.getByTestId("constraint-band", { includeHiddenElements: true });
    expect(band).toHaveStyle({ opacity: 0 });
    expect(band.props.pointerEvents).toBe("none");
    expect(band.props.accessibilityElementsHidden).toBe(true);
    expect(band.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});

describe("HB2(K9) — 쓰는 중 화면에 띠가 없다", () => {
  it("쓰는 중이면 constraint를 줘도 띠가 그려지지 않는다", async () => {
    await renderList({ constraint: CONSTRAINT, writing: { line: "쓰는 중", name: "금동이" } });
    expect(screen.getByTestId("stop-bar")).toBeTruthy();
    expect(screen.queryByTestId("constraint-band", { includeHiddenElements: true })).toBeNull();
  });
});

/**
 * 051 수정 — 쓴 날의 지면을 끝까지 내린 것으로 만드는 테스트 도우미 (`.test`가 아니다 — 스위트로 세지 않는다).
 *
 * 쓴 날의 「다시 쓰기」 바는 지면 끝에 닿아야 올라오고, 그 전에는 누를 수 없다(보드 `2c` ④). jest에는
 * 레이아웃이 없어 지면이 스스로 재지 못하므로, 지면(`written-paper`)에 레이아웃·내용 크기 이벤트를
 * 직접 쏜다 — 짧은 본문(내용 500 < 보이는 800)이라 처음부터 끝이다(`2k`).
 *
 * RNTL 14의 `fireEvent`는 Promise다(025) — 반드시 await한다.
 */
import { fireEvent, screen } from "@testing-library/react-native";

export async function reachPaperEnd() {
  const paper = await screen.findByTestId("written-paper");
  await fireEvent(paper, "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
  });
  await fireEvent(paper, "contentSizeChange", 400, 500);
}

/**
 * 052 — 지면을 `y`까지 스크롤한 것으로 만든다. 지면마다 처음 부르면 레이아웃·내용 크기를 먼저 쏜다
 * (긴 본문: 보이는 800, 내용 2000). 그 뒤 `scroll` 사건을 쏜다 — 접힘 판정은 스크롤 사건에서 돈다.
 */
const measured = new WeakSet<object>();

export async function scrollPaper(
  y: number,
  { viewport = 800, content = 2000 }: { viewport?: number; content?: number } = {},
) {
  const paper = await screen.findByTestId("written-paper", { includeHiddenElements: true });
  if (!measured.has(paper)) {
    measured.add(paper);
    await fireEvent(paper, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: viewport } },
    });
    await fireEvent(paper, "contentSizeChange", 400, content);
  }
  await fireEvent.scroll(paper, { nativeEvent: { contentOffset: { y } } });
}

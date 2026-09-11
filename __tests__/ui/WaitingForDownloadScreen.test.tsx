/**
 * 다운로드 대기 화면 계약 테스트 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-006, Clarifications
 *       tasks.md T018
 *
 * 작명을 먼저 마쳤는데 다운로드가 아직 안 끝났을 때 보이는 화면 — 그만두기
 * 경로가 없다(029의 필수 에셋은 앱 동작에 반드시 필요하므로 최초 온보딩은
 * 다운로드 완료까지 머무른다는 clarify 답변).
 */

import { render, screen } from "@testing-library/react-native";

import { WaitingForDownloadScreen } from "../../src/ui/WaitingForDownloadScreen";

describe("WaitingForDownloadScreen — 렌더", () => {
  it("렌더되면 testID가 있다", async () => {
    await render(<WaitingForDownloadScreen fraction={0.3} />);
    expect(screen.getByTestId("waiting-for-download-screen")).toBeTruthy();
  });

  it("그만두기/취소 버튼이 없다 (clarify — FR-006)", async () => {
    await render(<WaitingForDownloadScreen fraction={0.5} />);
    expect(screen.queryByText(/그만두기/)).toBeNull();
    expect(screen.queryByText(/취소/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("진행률을 보여준다(029 essentialDownloadFraction 재사용)", async () => {
    await render(<WaitingForDownloadScreen fraction={0.42} />);
    expect(screen.getByTestId("waiting-for-download-progress")).toBeTruthy();
  });
});

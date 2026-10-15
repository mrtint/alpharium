/**
 * 085 — 개발자 화면 맨 아래의 쓸 차례 예약 줄.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md DV3
 *       spec.md FR-022
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 */

import { render, screen, within } from "@testing-library/react-native";

import { DeveloperScreen, type DeveloperScreenProps } from "../../src/ui/DeveloperScreen";

function props(over: Partial<DeveloperScreenProps> = {}): DeveloperScreenProps {
  return {
    modules: { reading: null, writing: null },
    showsDiagnostics: false,
    onRedownload: jest.fn(),
    onReplayOnboarding: jest.fn(),
    onDisable: jest.fn(),
    onOpenDiagnostics: jest.fn(),
    attempts: [],
    failures: [],
    ...over,
  };
}

describe("DV3", () => {
  it("줄이 있으면 그 글자를 실패 묶음 뒤에 그린다", async () => {
    await render(<DeveloperScreen {...props({ reminderLine: "쓸 차례 알림 · 예약 없음" })} />);
    const line = screen.getByTestId("developer-reminder-line");
    expect(within(line).getByText("쓸 차례 알림 · 예약 없음")).toBeTruthy();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf("developer-group-failures")).toBeGreaterThan(-1);
    expect(tree.indexOf("developer-reminder-line")).toBeGreaterThan(
      tree.indexOf("developer-group-failures"),
    );
  });

  it("줄이 없으면 그리지 않는다", async () => {
    await render(<DeveloperScreen {...props()} />);
    expect(screen.queryByTestId("developer-reminder-line")).toBeNull();
  });
});

/**
 * 106 — 진단 화면 머리의 「빠른 주기 켜짐 · 주기 N분」 한 줄 (FR-013, spec US5 AS3).
 *
 * 켜져 있을 때만 조립부가 줄을 넘긴다 — 줄이 있으면 환경 묶음 맨 위에 그리고, 없으면 그리지 않는다.
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 */

import { render, screen } from "@testing-library/react-native";

import { DiagnosticsScreen, type DiagnosticsScreenProps } from "../../src/ui/DiagnosticsScreen";

function props(over: Partial<DiagnosticsScreenProps> = {}): DiagnosticsScreenProps {
  return {
    environment: { build: "DEV · 1.0.0 (24)", device: "Android 16", inference: "기기 · CPU" },
    storage: "",
    onInspectStorage: jest.fn(),
    photo: null,
    canRequestPhoto: false,
    onRequestPhoto: jest.fn(),
    probe: null,
    onRefreshProbe: jest.fn(),
    previews: null,
    onTryOnce: jest.fn(),
    onRunAuto: jest.fn(),
    autoRunning: false,
    autoResult: null,
    failures: [],
    attempts: [],
    ...over,
  };
}

describe("진단 머리 한 줄", () => {
  it("줄이 있으면 환경 묶음 맨 위에 그린다", async () => {
    await render(<DiagnosticsScreen {...props({ fastCycleLine: "빠른 주기 켜짐 · 주기 30분" })} />);
    expect(screen.getByText("빠른 주기 켜짐 · 주기 30분")).toBeTruthy();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf("diagnostics-fast-cycle")).toBeGreaterThan(-1);
    expect(tree.indexOf("diagnostics-fast-cycle")).toBeLessThan(tree.indexOf("diagnostics-build"));
  });

  it("줄이 없으면 그리지 않는다", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    expect(screen.queryByTestId("diagnostics-fast-cycle")).toBeNull();
  });
});

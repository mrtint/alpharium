import { fireEvent, render, screen } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DownloadProgressScreen } from "../../src/ui/DownloadProgressScreen";

/**
 * 다운로드 진행 슬라이드 화면의 계약 테스트 (045, ★ convergence T023이
 * 실패·재시도 뷰 케이스를 추가).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C6·C7·C9
 *       spec.md FR-004~FR-007·FR-011
 *
 * **RNTL 14는 `render`도 `fireEvent`도 Promise를 반환한다** — `await` 없이는
 * 렌더·상태 갱신이 flush되지 않는다(025 실측, 043·044가 이어받은 관례).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DownloadProgressScreen.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("FR-004 — 슬라이드 진행 화면(downloadReady: false)", () => {
  it("슬라이드 레이아웃이 렌더된다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        failed={false}
        onProceed={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-screen")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-complete")).toBeNull();
    expect(screen.queryByTestId("download-progress-failed")).toBeNull();
  });

  it("첫 진입 시 첫 슬라이드(01/04) 문구가 보인다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        failed={false}
        onProceed={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByText("01 / 04")).not.toBeNull();
  });
});

describe("FR-007 — 완료 화면(downloadReady: true)", () => {
  it("완료 뷰가 렌더되고 슬라이드·실패 뷰는 없다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={true}
        failed={false}
        onProceed={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-complete")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-screen")).toBeNull();
    expect(screen.queryByTestId("download-progress-failed")).toBeNull();
  });

  it("시작할게요 버튼이 있고 onProceed 콜백이 연결된다", async () => {
    const onProceed = jest.fn();
    await render(
      <DownloadProgressScreen
        downloadReady={true}
        failed={false}
        onProceed={onProceed}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-proceed")).not.toBeNull();
    await fireEvent.press(screen.getByTestId("download-progress-proceed"));
    expect(onProceed).toHaveBeenCalledTimes(1);
  });
});

describe("FR-011 — 실패 시 재시도 뷰(convergence T022, 원칙 I)", () => {
  it("failed: true면 실패 뷰가 렌더되고 슬라이드·완료 뷰는 없다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        failed={true}
        onProceed={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-failed")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-screen")).toBeNull();
    expect(screen.queryByTestId("download-progress-complete")).toBeNull();
  });

  it("failed: true는 downloadReady: true보다 우선한다 — 막다른 길을 만들지 않는다", async () => {
    // 실패와 완료가 동시에 참일 수는 없지만(App.tsx가 상호 배타로 관리),
    // 화면 자체의 방어로 failed를 먼저 검사하는지 확인한다.
    await render(
      <DownloadProgressScreen
        downloadReady={true}
        failed={true}
        onProceed={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-failed")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-complete")).toBeNull();
  });

  it("다시 시도 버튼이 있고 onRetry 콜백이 정확히 1회 호출된다", async () => {
    const onRetry = jest.fn();
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        failed={true}
        onProceed={jest.fn()}
        onRetry={onRetry}
      />,
    );
    expect(screen.queryByTestId("download-progress-retry")).not.toBeNull();
    await fireEvent.press(screen.getByTestId("download-progress-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("실패 뷰에 오류 원문·모델 식별자가 없다(원칙 III, C9)", () => {
    const failedBlock = CODE.slice(
      CODE.indexOf("if (failed) {"),
      CODE.indexOf("const stage = resolveSlideStage"),
    );
    expect(failedBlock).not.toMatch(/\b(?:v1|v2|a1|ESSENTIAL_ASSET_KEYS|error\.message|reason)\b/i);
  });
});

describe("FR-006 — 바이트·퍼센트·전송 속도가 소스에 없다 (원칙 IV, C9)", () => {
  it("소스에 바이트·퍼센트·속도 토큰이 없다", () => {
    expect(CODE).not.toMatch(/\b(?:byte|percent|speed|MB|GB)\b/i);
  });

  it("essentialDownloadFraction을 import하지 않는다", () => {
    expect(CODE).not.toMatch(/essentialDownloadFraction/);
  });

  it("essential-assets.ts를 import하지 않는다 (C9)", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*essential-assets["']/);
  });
});

describe("props 시그니처 — downloadReady·onProceed·failed·onRetry 뿐", () => {
  it("props 타입에 다른 필드가 없다(convergence로 failed·onRetry 추가)", () => {
    const start = CODE.indexOf("export type DownloadProgressScreenProps");
    const end = CODE.indexOf("};", start);
    const propsType = CODE.slice(start, end);
    const fields = [...propsType.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    expect(new Set(fields)).toEqual(new Set(["downloadReady", "onProceed", "failed", "onRetry"]));
  });
});

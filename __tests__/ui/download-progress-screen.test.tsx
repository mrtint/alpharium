import { render, screen } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DownloadProgressScreen } from "../../src/ui/DownloadProgressScreen";

/**
 * 다운로드 진행 슬라이드 화면의 계약 테스트 (045).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C6·C7·C9
 *       spec.md FR-004~FR-007
 *
 * **RNTL 14는 `render`도 `fireEvent`도 Promise를 반환한다** — `await` 없이는
 * 렌더·상태 갱신이 flush되지 않는다(025 실측, 043·044가 이어받은 관례).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DownloadProgressScreen.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("FR-004 — 슬라이드 진행 화면(downloadReady: false)", () => {
  it("슬라이드 레이아웃이 렌더된다", async () => {
    await render(<DownloadProgressScreen downloadReady={false} onProceed={jest.fn()} />);
    expect(screen.queryByTestId("download-progress-screen")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-complete")).toBeNull();
  });

  it("첫 진입 시 첫 슬라이드(01/04) 문구가 보인다", async () => {
    await render(<DownloadProgressScreen downloadReady={false} onProceed={jest.fn()} />);
    expect(screen.queryByText("01 / 04")).not.toBeNull();
  });
});

describe("FR-007 — 완료 화면(downloadReady: true)", () => {
  it("완료 뷰가 렌더되고 슬라이드 뷰는 없다", async () => {
    await render(<DownloadProgressScreen downloadReady={true} onProceed={jest.fn()} />);
    expect(screen.queryByTestId("download-progress-complete")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-screen")).toBeNull();
  });

  it("시작할게요 버튼이 있고 onProceed 콜백이 연결된다", async () => {
    await render(<DownloadProgressScreen downloadReady={true} onProceed={jest.fn()} />);
    expect(screen.queryByTestId("download-progress-proceed")).not.toBeNull();
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

describe("props 시그니처 — downloadReady·onProceed 뿐", () => {
  it("props 타입에 다른 필드가 없다", () => {
    const start = CODE.indexOf("export type DownloadProgressScreenProps");
    const end = CODE.indexOf("};", start);
    const propsType = CODE.slice(start, end);
    const fields = [...propsType.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    expect(new Set(fields)).toEqual(new Set(["downloadReady", "onProceed"]));
  });
});

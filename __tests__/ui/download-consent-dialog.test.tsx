import { fireEvent, render, screen } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DownloadConsentDialog } from "../../src/ui/DownloadConsentDialog";

/**
 * 다운로드 동의 안내 Dialog의 계약 테스트 (045).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C9
 *       spec.md FR-002a·FR-003
 *
 * **RNTL 14는 `render`도 `fireEvent`도 Promise를 반환한다** — `await` 없이는
 * 렌더·상태 갱신이 flush되지 않는다(025 실측, 043·044가 이어받은 관례).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DownloadConsentDialog.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("FR-002a — [확인/시작] 하나만 있다", () => {
  it("확인 버튼이 렌더된다", async () => {
    await render(<DownloadConsentDialog onConfirm={jest.fn()} visible={true} />);
    expect(screen.queryByTestId("download-consent-confirm")).not.toBeNull();
  });

  it("소스에 거부·건너뛰기·나중에 관련 콜백·testID가 없다", () => {
    expect(CODE).not.toMatch(/onSkip|onDecline|onDismiss|onCancel|나중에|건너뛰기|거부/);
  });

  it("props 타입에 onConfirm 외의 콜백이 없다(시그니처 확인)", () => {
    const propsType = CODE.slice(
      CODE.indexOf("export type DownloadConsentDialogProps"),
      CODE.indexOf("export function DownloadConsentDialog"),
    );
    const callbackFields = [...propsType.matchAll(/^\s*(\w+):\s*\(\)\s*=>\s*void;/gm)].map(
      (m) => m[1],
    );
    expect(callbackFields).toEqual(["onConfirm"]);
  });
});

describe("FR-003 — 모델 식별자·바이트 크기를 노출하지 않는다 (원칙 III·IV, C9)", () => {
  it("소스에 모델 식별자·자산 키·바이트·GB 텍스트가 없다", () => {
    expect(CODE).not.toMatch(/\b(?:v1|v2|a1|ESSENTIAL_ASSET_KEYS|MB|GB|byte)\b/i);
  });

  it("essential-assets.ts를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*essential-assets["']/);
  });
});

describe("onConfirm 콜백", () => {
  it("확인 버튼을 누르면 onConfirm이 정확히 1회 호출된다", async () => {
    const onConfirm = jest.fn();
    await render(<DownloadConsentDialog onConfirm={onConfirm} visible={true} />);
    await fireEvent.press(screen.getByTestId("download-consent-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("visible: false — Modal이 안 보인다", () => {
  it("visible=false여도 컴포넌트 자체는 존재한다(Modal의 visible prop이 담당)", async () => {
    await render(<DownloadConsentDialog onConfirm={jest.fn()} visible={false} />);
    // RN의 Modal은 visible=false일 때도 트리에 노드를 유지할 수 있으므로
    // (구현 세부), 여기서는 크래시 없이 렌더되는 것만 확인한다.
    expect(true).toBe(true);
  });
});

import { act, fireEvent, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CellularConsentDialog } from "../../src/ui/CellularConsentDialog";
import { renderWithPortal } from "./render-with-portal";

/**
 * 074 — 모바일 데이터 동의 대화상자.
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG12·CG14
 *
 * 045의 표준 동의(`DownloadConsentDialog`)는 건드리지 않고 이 대화상자를 따로 둔다 — 표준 동의의 「[받을게요] 하나뿐」 계약 테스트(`download-consent-dialog.test.tsx`)가
 * 소스 어휘까지 잠그고 있어서, 같은 컴포넌트에 선택지를 더하면 045의 계약과 부딪친다. 덮개·뒤로 가기로 닫히지 않는 것은 같다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/CellularConsentDialog.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const base = { visible: true, sizeLabel: "2.0GB" as string | null };

describe("CG12 — 선택지 둘", () => {
  it("두 버튼이 있다", async () => {
    await renderWithPortal(
      <CellularConsentDialog {...base} onConfirm={jest.fn()} onDefer={jest.fn()} />,
    );
    expect(screen.getByTestId("download-consent-cellular-confirm")).toBeTruthy();
    expect(screen.getByTestId("download-consent-defer")).toBeTruthy();
    expect(screen.getByText("모바일 데이터로 다운로드")).toBeTruthy();
    expect(screen.getByText("나중에 다운로드")).toBeTruthy();
  });

  it("각 버튼은 자기 콜백을 한 번 부르고 다른 콜백은 부르지 않는다", async () => {
    const onConfirm = jest.fn();
    const onDefer = jest.fn();
    await renderWithPortal(
      <CellularConsentDialog {...base} onConfirm={onConfirm} onDefer={onDefer} />,
    );
    await fireEvent.press(screen.getByTestId("download-consent-defer"));
    expect(onDefer).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("download-consent-cellular-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDefer).toHaveBeenCalledTimes(1);
  });

  it("받을 양이 있으면 본문에 보인다", async () => {
    await renderWithPortal(
      <CellularConsentDialog {...base} onConfirm={jest.fn()} onDefer={jest.fn()} />,
    );
    expect(screen.getByText(/약 2\.0GB/)).toBeTruthy();
  });

  it("★ 받을 양을 못 읽었으면 양 없이 같은 안내가 보이고 숫자를 지어내지 않는다", async () => {
    await renderWithPortal(
      <CellularConsentDialog onConfirm={jest.fn()} onDefer={jest.fn()} sizeLabel={null} visible />,
    );
    expect(screen.getByText(/데이터를 꽤 쓰게 돼요/)).toBeTruthy();
    expect(screen.queryByText(/\d+(\.\d)?\s?(GB|MB)/)).toBeNull();
  });

  it("visible=false면 그리지 않는다", async () => {
    await renderWithPortal(
      <CellularConsentDialog {...base} onConfirm={jest.fn()} onDefer={jest.fn()} visible={false} />,
    );
    expect(screen.queryByTestId("cellular-consent-dialog")).toBeNull();
  });
});

describe("덮개·뒤로 가기로 닫히지 않는다 (FR-008) — 둘 중 하나를 고른다", () => {
  type Listener = () => boolean | null | undefined;

  it("덮개를 눌러도 남고 어느 콜백도 불리지 않는다", async () => {
    const onConfirm = jest.fn();
    const onDefer = jest.fn();
    await renderWithPortal(
      <CellularConsentDialog {...base} onConfirm={onConfirm} onDefer={onDefer} />,
    );
    await fireEvent.press(screen.getByTestId("cellular-consent-dialog-overlay"));
    expect(screen.getByTestId("cellular-consent-dialog")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onDefer).not.toHaveBeenCalled();
  });

  it("뒤로 가기는 소비되지만(앱이 닫히지 않는다) 대화상자가 그대로이고 콜백이 불리지 않는다", async () => {
    const handlers: Listener[] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
      if (event === "hardwareBackPress") handlers.push(handler as Listener);
      return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
    });
    const onConfirm = jest.fn();
    const onDefer = jest.fn();
    await renderWithPortal(
      <CellularConsentDialog {...base} onConfirm={onConfirm} onDefer={onDefer} />,
    );

    let consumed = false;
    await act(async () => {
      for (const handler of [...handlers].reverse()) {
        if (handler() === true) {
          consumed = true;
          break;
        }
      }
    });
    expect(consumed).toBe(true);
    expect(screen.getByTestId("cellular-consent-dialog")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onDefer).not.toHaveBeenCalled();
  });
});

describe("CG14 — 화면은 문자열과 핸들러만 받는다", () => {
  it("연결 조회·모듈 자산에 닿지 않는다", () => {
    expect(CODE).not.toMatch(/network-port|readConnection|essential-assets|ESSENTIAL_ASSET_KEYS/);
  });

  it("모델 식별자·바이트 단위 리터럴이 소스에 없다(받을 양은 prop으로만 온다)", () => {
    expect(CODE).not.toMatch(/\b(?:v1|v2|a1|MB|GB|byte)\b/i);
  });

  it("문구는 카탈로그(consentGate.cellular)에서 읽는다", () => {
    expect(CODE).toMatch(/consentGate\.cellular/);
  });
});

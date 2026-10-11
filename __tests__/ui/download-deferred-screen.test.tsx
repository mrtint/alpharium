import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DownloadDeferredScreen } from "../../src/ui/DownloadDeferredScreen";

/**
 * 074 — 「나중에 받기」 뒤의 대기 화면.
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG13·CG14
 *
 * 막다른 길이 아니다 — 「다시 확인하기」 하나가 있고, 앱을 스스로 닫지 않는다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DownloadDeferredScreen.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("CG13 — 대기 화면", () => {
  it("안내와 「다시 확인하기」가 있고, 누르면 onRecheck가 한 번 불린다", async () => {
    const onRecheck = jest.fn();
    await render(<DownloadDeferredScreen onRecheck={onRecheck} />);
    expect(screen.getByTestId("download-deferred")).toBeTruthy();
    expect(screen.getByText("Wi-Fi에서 받는 게 좋아요")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("download-deferred-recheck"));
    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it("★ 아무것도 받지 않았다고 알린다 — 진행률·바이트·모델 어휘가 없다", async () => {
    await render(<DownloadDeferredScreen onRecheck={jest.fn()} />);
    expect(screen.getByText(/아무것도 받지 않았어요/)).toBeTruthy();
    expect(screen.queryByText(/%|GB|MB|진행/)).toBeNull();
  });

  it("뒤로 가기는 화면에 아무 영향이 없다 — 이 화면이 BackHandler를 가로채지도 앱을 닫지도 않는다", async () => {
    const add = jest.spyOn(BackHandler, "addEventListener");
    add.mockClear();
    const exit = jest.spyOn(BackHandler, "exitApp").mockImplementation(() => {});
    await render(<DownloadDeferredScreen onRecheck={jest.fn()} />);
    expect(add).not.toHaveBeenCalledWith("hardwareBackPress", expect.anything());
    await act(async () => {});
    expect(exit).not.toHaveBeenCalled();
    expect(screen.getByTestId("download-deferred")).toBeTruthy();
  });
});

describe("CG14 — 화면은 문자열과 핸들러만 받는다", () => {
  it("연결 조회·모듈 자산·종료 호출에 닿지 않는다", () => {
    expect(CODE).not.toMatch(
      /network-port|readConnection|essential-assets|ESSENTIAL_ASSET_KEYS|exitApp|BackHandler/,
    );
  });

  it("문구는 카탈로그(consentGate.deferred)에서 읽는다", () => {
    expect(CODE).toMatch(/consentGate\.deferred/);
  });
});

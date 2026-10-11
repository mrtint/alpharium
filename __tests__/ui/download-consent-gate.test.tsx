import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { READ_LIMIT_MS } from "../../src/app/consent-gate";
import type { Connection } from "../../src/app/network-port";
import { DownloadConsentGate } from "../../src/ui/DownloadConsentGate";
import { renderWithPortal } from "./render-with-portal";

/**
 * 074 — 첫 실행 동의 단계의 조립: 연결 종류에 따라 표준 동의 / 모바일 동의 / 대기 화면.
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG11~CG17, spec FR-001~FR-008·SC-001~SC-003a
 *
 * `App.tsx`는 jest에서 완전히 렌더하기 어려워(AppFrame.firstrun.test.tsx) 이 조립을 별도 화면으로 떼어 실제로 그린다.
 * `onConfirm`은 `App.tsx`의 `onConfirmDownloadConsent`(동의 저장 → 다운로드 시작)이므로, 이 콜백이 불리지 않았다 =
 * 동의가 저장되지 않았고 내려받기가 시작되지 않았다.
 */

function setup(
  connection: Connection | (() => Promise<Connection>),
  size: string | null = "2.0GB",
) {
  const onConfirm = jest.fn();
  const readConnection = jest.fn(
    typeof connection === "function" ? connection : async () => connection,
  );
  const readSizeLabel = jest.fn(async () => size);
  return { onConfirm, readConnection, readSizeLabel };
}

const ui = (p: ReturnType<typeof setup>) => (
  <DownloadConsentGate
    onConfirm={p.onConfirm}
    readConnection={p.readConnection}
    readSizeLabel={p.readSizeLabel}
  />
);

describe("표준 갈래 (FR-002, CG11) — wifi·other·unknown", () => {
  it.each(["wifi", "other", "unknown"] as const)(
    "%s이면 지금과 같은 [받을게요] 하나뿐이다",
    async (c) => {
      const p = setup(c);
      await renderWithPortal(ui(p));
      await screen.findByTestId("download-consent-confirm");
      expect(screen.getByText("받을게요")).toBeTruthy();
      expect(screen.queryByTestId("download-consent-defer")).toBeNull();
      expect(screen.queryByText(/GB|MB|모바일/)).toBeNull();
      expect(p.readSizeLabel).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByTestId("download-consent-confirm"));
      expect(p.onConfirm).toHaveBeenCalledTimes(1);
    },
  );
});

describe("모바일 갈래 (FR-001·FR-003·FR-004·FR-005)", () => {
  it("cellular면 모바일 동의가 받을 양과 함께 뜬다", async () => {
    const p = setup("cellular", "2.0GB");
    await renderWithPortal(ui(p));
    await screen.findByTestId("cellular-consent-dialog");
    expect(screen.getByText(/약 2\.0GB/)).toBeTruthy();
    expect(screen.queryByTestId("download-consent-confirm")).toBeNull();
  });

  it("★ SC-001 — 모바일 동의가 떠 있는 동안 동의 콜백(저장·내려받기 시작)은 불리지 않았다", async () => {
    const p = setup("cellular");
    await renderWithPortal(ui(p));
    await screen.findByTestId("cellular-consent-dialog");
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  it("「모바일 데이터로 받기」는 표준 동의와 같은 콜백을 한 번 부른다(CG16)", async () => {
    const p = setup("cellular");
    await renderWithPortal(ui(p));
    await fireEvent.press(await screen.findByTestId("download-consent-cellular-confirm"));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("「나중에 받기」 (FR-006·FR-007, CG17)", () => {
  it("대기 화면이 뜨고 동의 콜백은 불리지 않는다", async () => {
    const p = setup("cellular");
    await renderWithPortal(ui(p));
    await fireEvent.press(await screen.findByTestId("download-consent-defer"));
    expect(screen.getByTestId("download-deferred")).toBeTruthy();
    expect(screen.queryByTestId("cellular-consent-dialog")).toBeNull();
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  it("Wi-Fi로 바꾼 뒤 「다시 확인하기」를 누르면 표준 동의가 뜬다 — 자동으로 받지는 않는다", async () => {
    const seq: Connection[] = ["cellular", "wifi"];
    const p = setup(async () => seq.shift() ?? "wifi");
    await renderWithPortal(ui(p));
    await fireEvent.press(await screen.findByTestId("download-consent-defer"));
    await fireEvent.press(screen.getByTestId("download-deferred-recheck"));
    await screen.findByTestId("download-consent-confirm");
    expect(screen.queryByTestId("download-deferred")).toBeNull();
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  it("여전히 모바일이면 「다시 확인하기」 뒤 모바일 동의가 다시 뜬다", async () => {
    const p = setup("cellular");
    await renderWithPortal(ui(p));
    await fireEvent.press(await screen.findByTestId("download-consent-defer"));
    await fireEvent.press(screen.getByTestId("download-deferred-recheck"));
    await screen.findByTestId("cellular-consent-dialog");
    expect(p.readConnection).toHaveBeenCalledTimes(2);
  });

  it("★ 앱을 다시 연 것(새로 마운트)은 대기 화면이 아니라 처음부터 읽는다", async () => {
    const first = setup("cellular");
    const { unmount } = await renderWithPortal(ui(first));
    await fireEvent.press(await screen.findByTestId("download-consent-defer"));
    await unmount();

    const second = setup("cellular");
    await renderWithPortal(ui(second));
    await screen.findByTestId("cellular-consent-dialog");
    expect(second.readConnection).toHaveBeenCalledTimes(1);
  });
});

describe("읽는 동안과 한도 (FR-001a, SC-003a)", () => {
  afterEach(() => jest.useRealTimers());

  it("읽는 동안은 어느 대화상자도 대기 화면도 없다", async () => {
    let release: (c: Connection) => void = () => {};
    const p = setup(() => new Promise<Connection>((resolve) => (release = resolve)));
    await renderWithPortal(ui(p));
    expect(screen.queryByTestId("download-consent-dialog")).toBeNull();
    expect(screen.queryByTestId("cellular-consent-dialog")).toBeNull();
    expect(screen.queryByTestId("download-deferred")).toBeNull();
    await act(async () => release("wifi"));
    await waitFor(() => expect(screen.getByTestId("download-consent-confirm")).toBeTruthy());
  });

  it("연결 조회가 응답하지 않아도 한도 뒤 표준 동의가 뜬다", async () => {
    jest.useFakeTimers();
    const p = setup(() => new Promise<Connection>(() => {}));
    await renderWithPortal(ui(p));
    await act(async () => {
      jest.advanceTimersByTime(READ_LIMIT_MS);
    });
    expect(screen.getByTestId("download-consent-confirm")).toBeTruthy();
  });
});

describe("소스", () => {
  const CODE = readFileSync(join(__dirname, "../../src/ui/DownloadConsentGate.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("연결 조회·모듈 자산을 직접 import하지 않는다 — 통로는 props로 받는다(CG14)", () => {
    expect(CODE).not.toMatch(
      /from\s+["'][^"']*(network-port|essential-assets|essential-assets-port)["']/,
    );
  });

  it("저장·플래그 통로를 모른다 — 「나중에 받기」는 저장하지 않는다(CG17)", () => {
    expect(CODE).not.toMatch(/saveOnboardingFlag|onboarding\/flag|FileSystem|downloadConsented/);
  });
});

import { act, fireEvent, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DownloadConsentDialog } from "../../src/ui/DownloadConsentDialog";
import { renderWithPortal } from "./render-with-portal";

/**
 * 다운로드 동의 안내 Dialog의 계약 테스트 (045).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C9
 *       spec.md FR-002a·FR-003
 *       specs/095-download-size-notice/contracts/consent-size.md DS8·DS9 — 045 FR-003의 「바이트·GB 비노출」을 대체한다
 *       (받을 양은 prop으로만 받는다 — 화면이 양을 지어내지 않는다)
 *
 * **RNTL 14는 `render`도 `fireEvent`도 Promise를 반환한다** — `await` 없이는
 * 렌더·상태 갱신이 flush되지 않는다(025 실측, 043·044가 이어받은 관례).
 *
 * **050 — RN 코어 `Modal`에서 공용 확인 대화상자(`ConfirmDialog`, RNR AlertDialog)로 옮겼다**
 * (Clarifications Q4, contracts/dialogs.md MIG1). 동작·문구·testID는 그대로이고, 포털로 뜨므로
 * `renderWithPortal`로 그린다. 「덮개·뒤로 가기로 닫히지 않는다」를 새로 잠근다 — 045의 「거부·건너뛰기
 * 조작 없음」이 코어 `Modal`의 `onRequestClose={() => {}}`에서 오던 것을 이제 부품이 보장한다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DownloadConsentDialog.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("FR-002a — [확인/시작] 하나만 있다", () => {
  it("확인 버튼이 렌더된다", async () => {
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={jest.fn()} sizeLabel={null} visible={true} />,
    );
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

describe("DS9 — 모델 식별자·자산 키를 노출하지 않고, 받을 양은 prop으로만 받는다 (원칙 III·V)", () => {
  it("소스에 모델 식별자·자산 키 텍스트가 없다", () => {
    expect(CODE).not.toMatch(/\b(?:v1|v2|a1|ESSENTIAL_ASSET_KEYS)\b/i);
  });

  it("essential-assets·network-port를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*(essential-assets|network-port)[^"']*["']/);
  });

  it("★ 숫자·단위 리터럴이 없다 — 양을 지어낼 길이 없다(import 경로의 `i18n`은 빼고 본다)", () => {
    const body = CODE.replace(/^import .*$/gm, "");
    expect(body).not.toMatch(/\d|\b(?:MB|GB|byte)\b/i);
  });
});

describe("DS8 — 본문에 받을 양 (095 FR-001·FR-002)", () => {
  it("sizeLabel이 있으면 「약 {양}」이 든 본문이다", async () => {
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={jest.fn()} sizeLabel="2.0GB" visible />,
    );
    expect(
      screen.getByText(
        "일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 약 2.0GB 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.",
      ),
    ).toBeTruthy();
  });

  it("sizeLabel이 null이면 숫자 없는 원래 문장이다", async () => {
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={jest.fn()} sizeLabel={null} visible />,
    );
    expect(
      screen.getByText(
        "일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.",
      ),
    ).toBeTruthy();
  });
});

describe("onConfirm 콜백", () => {
  it("확인 버튼을 누르면 onConfirm이 정확히 1회 호출된다", async () => {
    const onConfirm = jest.fn();
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={onConfirm} sizeLabel={null} visible={true} />,
    );
    await fireEvent.press(screen.getByTestId("download-consent-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("visible: false — 그리지 않는다", () => {
  it("visible=false면 대화상자가 없다", async () => {
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={jest.fn()} sizeLabel={null} visible={false} />,
    );
    expect(screen.queryByTestId("download-consent-dialog")).toBeNull();
  });
});

describe("★ 050 MIG1 — 덮개·뒤로 가기로 닫히지 않는다 (045 「거부·건너뛰기 없음」 유지)", () => {
  type Listener = () => boolean | null | undefined;

  it("덮개를 눌러도 남고, onConfirm도 불리지 않는다", async () => {
    const onConfirm = jest.fn();
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={onConfirm} sizeLabel={null} visible />,
    );
    await fireEvent.press(screen.getByTestId("download-consent-dialog-overlay"));
    expect(screen.getByTestId("download-consent-dialog")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("뒤로 가기는 소비되지만(앱이 닫히지 않는다) 대화상자가 그대로다", async () => {
    const handlers: Listener[] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
      if (event === "hardwareBackPress") handlers.push(handler as Listener);
      return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
    });
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={jest.fn()} sizeLabel={null} visible />,
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
    expect(screen.getByTestId("download-consent-dialog")).toBeTruthy();
  });

  it("문구가 그대로다", async () => {
    await renderWithPortal(
      <DownloadConsentDialog onConfirm={jest.fn()} sizeLabel={null} visible />,
    );
    expect(screen.getByText("받을 것이 있어요")).toBeTruthy();
    expect(screen.getByText("받을게요")).toBeTruthy();
  });
});

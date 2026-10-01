/**
 * 050 — 대화상자 기반 (contracts/dialogs.md DLG1~DLG7).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 두 종류다 — **확인 대화상자**(`ConfirmDialog`, 덮개로 안 닫힘·뒤로 가기 = 취소)와 **일반 대화상자**
 * (`DismissibleDialog`, 덮개·뒤로 가기로 닫힘). 프리미티브가 뒤로 가기를 스스로 붙잡는다(research R3).
 *
 * `BackHandler.mockPressBack()`은 이 jest-expo 판에 없다(diary-home.test 실측) — `addEventListener`를
 * 스파이해 등록된 핸들러를 직접 부른다. **`mockRestore`하지 않는다** — 되돌리면 이후 구독 반환값이
 * `undefined`가 된다(diary-home.test와 같다). 스파이는 매 테스트 다시 걸어 핸들러 목록만 새로 받는다.
 *
 * 모양은 인라인 `style`로 본다 — jest에는 NativeWind 변환이 없다(034).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { BackHandler, StyleSheet } from "react-native";

import {
  ConfirmDialog,
  DialogActionButton,
  DialogCancelButton,
  DialogNote,
  DismissibleDialog,
} from "../../src/ui/components/Dialog";
import { COLORS, DIALOG, OVERLAY, RADIUS } from "../../src/ui/theme/tokens";
import { renderWithPortal } from "./render-with-portal";

type BackListener = () => boolean | null | undefined;

function captureBackHandlers(): BackListener[] {
  const handlers: BackListener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    if (event === "hardwareBackPress") handlers.push(handler as BackListener);
    return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
  });
  return handlers;
}

/** 가장 나중에 등록된 핸들러부터 부른다 — RN이 뒤로 가기를 전달하는 순서다 */
function pressBack(handlers: BackListener[]): boolean {
  for (const handler of [...handlers].reverse()) {
    if (handler() === true) return true;
  }
  return false;
}

const flat = (node: { props: { style?: unknown } }): Record<string, unknown> =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

function Confirm({ open = true, onCancel }: { open?: boolean; onCancel?: () => void }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={() => {}} testID="act">
            다시 쓰기
          </DialogActionButton>
          {onCancel !== undefined && (
            <DialogCancelButton onPress={onCancel} testID="cancel">
              취소
            </DialogCancelButton>
          )}
        </>
      }
      description="설명"
      onCancel={onCancel}
      open={open}
      testID="dlg"
      title="제목"
    />
  );
}

describe("DLG1~DLG3 — 확인 대화상자", () => {
  it("★ DLG1 — 덮개를 눌러도 닫히지 않는다 (onCancel 0회)", async () => {
    captureBackHandlers();
    const onCancel = jest.fn();
    await renderWithPortal(<Confirm onCancel={onCancel} />);

    await fireEvent.press(screen.getByTestId("dlg-overlay"));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId("dlg")).toBeTruthy();
  });

  it("★ DLG2 — 뒤로 가기 → onCancel 1회, 핸들러는 true", async () => {
    const handlers = captureBackHandlers();
    const onCancel = jest.fn();
    await renderWithPortal(<Confirm onCancel={onCancel} />);

    let consumed = false;
    await act(async () => {
      consumed = pressBack(handlers);
    });
    expect(consumed).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("★ DLG3 — onCancel이 없으면 뒤로 가기가 아무것도 바꾸지 않되 앱을 닫지 않는다(true)", async () => {
    const handlers = captureBackHandlers();
    await renderWithPortal(<Confirm />);

    let consumed = false;
    await act(async () => {
      consumed = pressBack(handlers);
    });
    expect(consumed).toBe(true);
    expect(screen.getByTestId("dlg")).toBeTruthy();
  });

  it("open이 거짓이면 아무것도 그리지 않는다", async () => {
    captureBackHandlers();
    await renderWithPortal(<Confirm open={false} />);
    expect(screen.queryByTestId("dlg")).toBeNull();
  });

  it("취소 버튼 → onCancel 1회", async () => {
    captureBackHandlers();
    const onCancel = jest.fn();
    await renderWithPortal(<Confirm onCancel={onCancel} />);
    await fireEvent.press(screen.getByTestId("cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("DLG4 — 일반 대화상자", () => {
  function Dismissible({ onClose }: { onClose: () => void }) {
    return (
      <DismissibleDialog onClose={onClose} open testID="sheet" title="날짜로 이동">
        <DialogCancelButton onPress={onClose} testID="sheet-cancel">
          취소
        </DialogCancelButton>
      </DismissibleDialog>
    );
  }

  it("★ 덮개를 누르면 onClose 1회", async () => {
    captureBackHandlers();
    const onClose = jest.fn();
    await renderWithPortal(<Dismissible onClose={onClose} />);
    await fireEvent.press(screen.getByTestId("sheet-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("★ 뒤로 가기 → onClose 1회", async () => {
    const handlers = captureBackHandlers();
    const onClose = jest.fn();
    await renderWithPortal(<Dismissible onClose={onClose} />);
    await act(async () => {
      pressBack(handlers);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("면 안의 제목을 눌러도 닫히지 않는다 (누름이 덮개로 새지 않는다)", async () => {
    captureBackHandlers();
    const onClose = jest.fn();
    await renderWithPortal(<Dismissible onClose={onClose} />);
    await fireEvent.press(screen.getByText("날짜로 이동"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("DLG5·DLG6 — 보드 모양 (인라인 style)", () => {
  it("★ DLG5 — 덮개 scrim, 면 반경 0·테두리 2 text·여백 24·간격 16, 좌우 20", async () => {
    captureBackHandlers();
    await renderWithPortal(<Confirm onCancel={() => {}} />);

    const overlay = flat(screen.getByTestId("dlg-overlay"));
    expect(overlay.backgroundColor).toBe(OVERLAY.scrim);
    expect(overlay.paddingHorizontal).toBe(DIALOG.inset);

    const face = flat(screen.getByTestId("dlg"));
    expect(face.borderRadius).toBe(0);
    expect(face.borderWidth).toBe(DIALOG.borderWidth);
    expect(face.borderColor).toBe(COLORS.text);
    expect(face.padding).toBe(DIALOG.padding);
    expect(face.gap).toBe(DIALOG.gap);
    expect(face.backgroundColor).toBe(COLORS.bg);
    expect(face.boxShadow).toBe(OVERLAY.faceShadow);
  });

  it("★ DLG6 — 동작 = accent 배경 + accentForeground 글자, 취소 = 1px text 테두리, 높이 48·반경 6", async () => {
    captureBackHandlers();
    await renderWithPortal(<Confirm onCancel={() => {}} />);

    const act1 = flat(screen.getByTestId("act"));
    expect(act1.backgroundColor).toBe(COLORS.accent);
    expect(act1.height).toBe(DIALOG.buttonHeight);
    expect(act1.borderRadius).toBe(RADIUS.control);
    const actLabel = flat(screen.getByText("다시 쓰기"));
    expect(actLabel.color).toBe(COLORS.accentForeground);
    expect(actLabel.fontSize).toBe(16);
    expect(actLabel.fontWeight).toBe("600");

    const cancel = flat(screen.getByTestId("cancel"));
    expect(cancel.borderWidth).toBe(1);
    expect(cancel.borderColor).toBe(COLORS.text);
    expect(cancel.height).toBe(DIALOG.buttonHeight);
    expect(cancel.borderRadius).toBe(RADIUS.control);
  });

  it("DLG6 — 버튼은 세로로 쌓이고 동작이 위다 (간격 8)", async () => {
    captureBackHandlers();
    await renderWithPortal(<Confirm onCancel={() => {}} />);

    const footer = flat(screen.getByTestId("dlg-footer"));
    expect(footer.flexDirection ?? "column").toBe("column");
    expect(footer.gap).toBe(DIALOG.buttonGap);
    // 트리 순서대로 돌려준다 — 먼저 나온 것이 위다(세로 쌓기)
    const ids = within(screen.getByTestId("dlg-footer"))
      .getAllByTestId(/^(act|cancel)$/)
      .map((n) => n.props.testID);
    expect(ids.indexOf("act")).toBeLessThan(ids.indexOf("cancel"));
  });
});

describe("★ DLG8 — 화면보다 높아지면 안전 영역 안에서 본문이 스크롤된다 (056 실기기 — 글꼴 2.0배)", () => {
  it("덮개는 위·아래에도 바깥 여백을 둔다(안전 영역이 없으면 inset만)", async () => {
    captureBackHandlers();
    await renderWithPortal(
      <DismissibleDialog onClose={() => {}} open testID="tall" title="제목">
        <DialogNote>본문</DialogNote>
      </DismissibleDialog>,
    );
    const overlay = flat(screen.getByTestId("tall-overlay"));
    expect(overlay.paddingTop).toBe(DIALOG.inset);
    expect(overlay.paddingBottom).toBe(DIALOG.inset);
  });

  it("면은 덮개 높이를 넘지 않고 줄어들 수 있으며, 본문은 스크롤 뷰 안에 있다", async () => {
    captureBackHandlers();
    await renderWithPortal(
      <DismissibleDialog onClose={() => {}} open testID="tall" title="제목">
        <DialogNote testID="tall-note">본문</DialogNote>
      </DismissibleDialog>,
    );
    expect(flat(screen.getByTestId("tall"))).toMatchObject({ flexShrink: 1 });
    const body = screen.getByTestId("tall-body");
    expect(body.type).toBe("RCTScrollView");
    expect(within(body).getByTestId("tall-note")).toBeTruthy();
    // 제목은 스크롤 밖 — 넘쳐도 무엇을 고르는 창인지 보인다
    expect(within(body).queryByText("제목")).toBeNull();
  });

  it("부제(subtitle)는 제목과 한 묶음(간격 6)으로 스크롤 밖에 있다", async () => {
    captureBackHandlers();
    await renderWithPortal(
      <DismissibleDialog
        onClose={() => {}}
        open
        subtitle="이 휴대폰의 시간대 · 서울 (GMT+9)"
        subtitleTestID="tall-sub"
        testID="tall"
        title="제목"
      >
        <DialogNote>본문</DialogNote>
      </DismissibleDialog>,
    );
    const sub = screen.getByTestId("tall-sub");
    expect(sub).toHaveTextContent("이 휴대폰의 시간대 · 서울 (GMT+9)");
    expect(within(screen.getByTestId("tall-body")).queryByTestId("tall-sub")).toBeNull();
    expect(flat(screen.getByTestId("tall-head")).gap).toBe(DIALOG.subtitleGap);
  });
});

describe("★ DLG7 — 대화상자 부품에 색 리터럴이 없다 (tokens.ts 단일 출처)", () => {
  it("Dialog.tsx에 hex·rgba( 가 없다", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/components/Dialog.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    expect(code).not.toContain("rgba(");
  });
});

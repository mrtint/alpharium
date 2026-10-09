/**
 * 067 — 쓴 날 사진 확대 화면 (contracts/photo-viewer.md ZP1~ZP10).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **jest는 배선만 본다.** reanimated·캐러셀은 `jest/setup-ui.ts`의 목이고(캐러셀 목은 첫 항목만 그린다), 제스처는
 * gesture-handler `jestSetup`의 `fireGestureHandler`로 콜백만 쏜다 — 핀치·이동이 「움직이는가」는 실기기(quickstart
 * Q5~Q11)에서 본다. 문턱 판정 자체는 `__tests__/app/photo-viewer.test.ts`(ZV)가 잠근다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import { PHOTO_VIEWER_TEXT, WRITTEN_DAY_TEXT } from "../../src/ui/home-text";
import { PhotoViewer } from "../../src/ui/PhotoViewer";

jest.setTimeout(30000);

const photo = (i: number) => ({
  photoId: `p${i}`,
  takenAt: new Date(`2026-10-08T0${i}:00:00`),
  resizedPath: `/data/photos/p${i}.jpg`,
});
const three = [photo(1), photo(2), photo(3)];

const code = (rel: string) =>
  readFileSync(join(__dirname, "../..", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

describe("067 ZP — 확대 화면 (US1)", () => {
  it("ZP1 — 상태 표시줄·내비게이션 바까지 덮는 투명 Modal, 내용은 GestureHandlerRootView 안", async () => {
    await render(<PhotoViewer onClose={() => {}} photos={three} startIndex={0} />);
    const modal = screen.getByTestId("photo-viewer");
    expect(modal.props.visible).toBe(true);
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(modal.props.navigationBarTranslucent).toBe(true);
    expect(code("src/ui/PhotoViewer.tsx")).toMatch(/<GestureHandlerRootView/);
  });

  it("ZP2 — 여러 장이면 시작 장의 순번 「n / N」, 1장이면 순번이 없다", async () => {
    const { unmount } = await render(
      <PhotoViewer onClose={() => {}} photos={three} startIndex={1} />,
    );
    expect(screen.getByTestId("photo-viewer-badge")).toHaveTextContent("2 / 3");
    await unmount();

    await render(<PhotoViewer onClose={() => {}} photos={[photo(1)]} startIndex={0} />);
    expect(screen.queryByTestId("photo-viewer-badge")).toBeNull();
  });

  it("ZP3 — 닫기 버튼: 버튼 역할·카탈로그 이름, 누르면 지금 순번으로 onClose", async () => {
    const onClose = jest.fn();
    await render(<PhotoViewer onClose={onClose} photos={three} startIndex={2} />);
    const close = screen.getByTestId("photo-viewer-close");
    expect(close.props.accessibilityRole).toBe("button");
    expect(close.props.accessibilityLabel).toBe(PHOTO_VIEWER_TEXT.close);
    await fireEvent.press(close);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(2);
  });

  it("ZP4 — 뒤로 가기(onRequestClose)도 지금 순번으로 onClose", async () => {
    const onClose = jest.fn();
    await render(<PhotoViewer onClose={onClose} photos={three} startIndex={1} />);
    screen.getByTestId("photo-viewer").props.onRequestClose();
    expect(onClose).toHaveBeenCalledWith(1);
  });

  it("ZP6 — 사진은 원래 비율 그대로(contain), 원본 색, 사본 경로", async () => {
    await render(<PhotoViewer onClose={() => {}} photos={[photo(1)]} startIndex={0} />);
    const image = screen.getByTestId("photo-viewer-image");
    expect(image).toHaveProp("resizeMode", "contain");
    expect(image.props.source).toEqual({ uri: "file:///data/photos/p1.jpg" });
    const style = Object.assign({}, ...[image.props.style].flat(Infinity).filter(Boolean));
    expect(style.filter).toBeUndefined();
  });

  it("ZP9 — 사본을 못 불러오면 「이 사진은 이제 없어요」", async () => {
    await render(<PhotoViewer onClose={() => {}} photos={[photo(1)]} startIndex={0} />);
    await fireEvent(screen.getByTestId("photo-viewer-image"), "error");
    expect(screen.getByTestId("photo-viewer-missing")).toHaveTextContent(
      WRITTEN_DAY_TEXT.photoMissing,
    );
  });
});

describe("067 ZP — 넘김·아래로 끌어 닫기 (US2)", () => {
  it("ZP5 — 여러 장: 순환 캐러셀이 누른 장부터, 배율 1이라 넘길 수 있다. 1장: 캐러셀 없음", async () => {
    const { unmount } = await render(
      <PhotoViewer onClose={() => {}} photos={three} startIndex={2} />,
    );
    const carousel = screen.getByTestId("photo-viewer-carousel");
    expect(carousel.props.loop).toBe(true);
    expect(carousel.props.defaultIndex).toBe(2);
    expect(carousel.props.scrollEnabled).toBe(true);
    expect(carousel.props.data).toBe(three);
    await unmount();

    await render(<PhotoViewer onClose={() => {}} photos={[photo(1)]} startIndex={0} />);
    expect(screen.queryByTestId("photo-viewer-carousel")).toBeNull();
    expect(screen.getByTestId("photo-viewer-image")).toBeTruthy();
  });

  it("ZP5a — 넘기면 순번이 따라간다", async () => {
    await render(<PhotoViewer onClose={() => {}} photos={three} startIndex={0} />);
    await act(async () => {
      screen.getByTestId("photo-viewer-carousel").props.onProgressChange(1.6);
    });
    expect(screen.getByTestId("photo-viewer-badge")).toHaveTextContent("3 / 3");
  });

  it("★ ZP7 — 배율 1에서 아래로: 짧게 놓으면 그대로, 길게 놓으면 지금 순번으로 닫힌다", async () => {
    // gesture-handler 목 함정(AGENTS): 팬은 한 테스트의 한 렌더에서만 쏜다.
    const onClose = jest.fn();
    await render(<PhotoViewer onClose={onClose} photos={[photo(1)]} startIndex={0} />);
    const drag = (translationY: number) =>
      fireGestureHandler(getByGestureTestId("photo-viewer-pan-p1"), [
        { state: State.BEGAN, translationX: 0, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, translationX: 0, translationY: translationY / 2, velocityY: 0 },
        { state: State.ACTIVE, translationX: 0, translationY, velocityY: 0 },
        { state: State.END, translationX: 0, translationY, velocityY: 0 },
      ]);

    await act(async () => drag(60));
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => drag(130));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(0);
  });

  it("ZP8 — 배율 1의 끌기는 세로가 먼저일 때만, 확대되면 넘김을 끈다, 확대 화면 캐러셀은 가로가 먼저일 때만", async () => {
    const photoCode = code("src/ui/ZoomablePhoto.tsx");
    expect(photoCode).toMatch(/activeOffsetY\(\[-10, 10\]\)/);
    expect(photoCode).toMatch(/failOffsetX\(\[-10, 10\]\)/);
    const viewerCode = code("src/ui/PhotoViewer.tsx");
    expect(viewerCode).toMatch(/scrollEnabled=\{!zoomed\}/);
    expect(viewerCode).toMatch(/activeOffsetX\(\[-10, 10\]\)/);
    expect(viewerCode).toMatch(/failOffsetY\(\[-10, 10\]\)/);

    await render(<PhotoViewer onClose={() => {}} photos={three} startIndex={0} />);
    const configure = screen.getByTestId("photo-viewer-carousel").props.onConfigurePanGesture;
    expect(typeof configure).toBe("function");
    const gesture: Record<string, jest.Mock> = {};
    gesture.activeOffsetX = jest.fn(() => gesture);
    gesture.failOffsetY = jest.fn(() => gesture);
    configure(gesture);
    expect(gesture.activeOffsetX).toHaveBeenCalledWith([-10, 10]);
    expect(gesture.failOffsetY).toHaveBeenCalledWith([-10, 10]);
  });
});

describe("067 ZP — 핀치·두 번 탭·이동 (US3)", () => {
  it("ZP10 — 핀치·두 번 탭·이동이 한 제스처로 묶여 판정 함수를 부른다 (손맛은 실기기)", () => {
    const photoCode = code("src/ui/ZoomablePhoto.tsx");
    expect(photoCode).toMatch(/Gesture\.Pinch\(\)/);
    expect(photoCode).toMatch(/numberOfTaps\(2\)/);
    expect(photoCode).toMatch(/Gesture\.Simultaneous\(/);
    for (const call of [
      "pinchScale(",
      "settleScale(",
      "doubleTapScale(",
      "panLimit(",
      "clampOffset(",
      "isZoomed(",
      "shouldDismiss(",
      "backdropOpacity(",
    ]) {
      expect(photoCode.includes(call) || code("src/ui/PhotoViewer.tsx").includes(call)).toBe(true);
    }
  });
});

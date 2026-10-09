/**
 * 051 — 쓴 날 캐러셀 (보드 `2c`·`2k`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md CAR1~CAR11 (CAR9는 067이 뒤집었다 —
 *       specs/067-photo-zoom-viewer/contracts/photo-viewer.md ZC1~ZC7)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **jest는 배선만 본다**(C9). `react-native-reanimated-carousel`은 `jest/setup-ui.ts`의 목이 첫
 * 슬라이드만 그리고 받은 props(`loop`·`onSnapToItem`·`onConfigurePanGesture`·`data`)를 host 노드에
 * 넘긴다. 실제 넘김·순환·세로 스크롤과의 제스처 분리는 실기기(quickstart D2~D4)에서 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { DiaryEntry } from "../../src/diary/types";
import { PHOTO_VIEWER_TEXT } from "../../src/ui/home-text";
import { indexAtProgress, PhotoCarousel } from "../../src/ui/PhotoCarousel";
import { WrittenDayPaper } from "../../src/ui/WrittenDayPaper";
import { COLORS, WRITTEN_DAY } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const photo = (i: number) => ({
  photoId: `p${i}`,
  takenAt: new Date(`2026-09-26T0${i}:00:00`),
  resizedPath: `/data/photos/p${i}.jpg`,
});
const three = [photo(1), photo(2), photo(3)];

const entry = (day: string, photos: DiaryEntry["photos"]): DiaryEntry => ({
  date: day,
  text: "본문",
  character: "quiet",
  signalsUsed: {
    date: day,
    photos: { kind: "none" },
    places: { kind: "none" },
    steps: { kind: "unknown", reason: "-" },
    battery: { kind: "unknown", reason: "-" },
    connectivity: { kind: "unknown", reason: "-" },
  },
  createdAt: new Date(`${day}T12:00:00`),
  photos,
});

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("051 CAR — 사진 수에 따른 갈래", () => {
  it("CAR1 — 0장·사진 목록 없음 → 아무것도 그리지 않는다", async () => {
    for (const photos of [[], undefined]) {
      const { unmount } = await render(<PhotoCarousel photos={photos} width={320} />);
      expect(screen.queryByTestId("photo-carousel")).toBeNull();
      expect(screen.queryByTestId("photo-carousel-single")).toBeNull();
      expect(screen.queryByTestId("photo-carousel-badge")).toBeNull();
      expect(screen.queryByTestId("photo-carousel-indicator")).toBeNull();
      await unmount();
    }
  });

  it("CAR1 — 사진이 없으면 본문이 지면의 첫 자식이다 (보드 2k)", async () => {
    await render(
      <WrittenDayPaper
        paper={{ kind: "readable", entry: entry("2026-09-26", []), madeUp: false }}
      />,
    );
    expect(screen.queryByTestId("photo-carousel")).toBeNull();
    expect(screen.getByTestId("written-body")).toBeTruthy();
  });

  it("★ CAR2 — 1장 → 사진만, 배지·인디케이터·캐러셀 없음", async () => {
    await render(<PhotoCarousel photos={[photo(1)]} width={320} />);
    expect(screen.getByTestId("photo-carousel-single")).toBeTruthy();
    expect(screen.queryByTestId("photo-carousel")).toBeNull();
    expect(screen.queryByTestId("photo-carousel-badge")).toBeNull();
    expect(screen.queryByTestId("photo-carousel-indicator")).toBeNull();
  });

  it("★ CAR3 — 여러 장 → loop 캐러셀, 세로 스크롤과 가르는 제스처 설정, 저장된 순서 그대로", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    const carousel = screen.getByTestId("photo-carousel");
    expect(carousel.props.loop).toBe(true);
    expect(typeof carousel.props.onConfigurePanGesture).toBe("function");
    expect(carousel.props.data.map((p: { photoId: string }) => p.photoId)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);

    // activeOffsetX(±10)로 가로가 확실할 때만 캐러셀이 잡고, failOffsetY(±10)로 세로가 먼저면
    // 놓는다(research R1, 051 실기기 — 세로 끌기의 가로 흔들림을 캐러셀이 잡았다).
    const gesture: Record<string, jest.Mock> = {};
    gesture.activeOffsetX = jest.fn(() => gesture);
    gesture.failOffsetY = jest.fn(() => gesture);
    carousel.props.onConfigurePanGesture(gesture);
    expect(gesture.activeOffsetX).toHaveBeenCalledWith([-10, 10]);
    expect(gesture.failOffsetY).toHaveBeenCalledWith([-10, 10]);
  });

  it("CAR4 — 배지 「1 / 3」, 인디케이터 3칸 — 현재 칸만 긴 막대", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("1 / 3");
    const cells = [0, 1, 2].map((i) => screen.getByTestId(`photo-carousel-dot-${i}`));
    expect(cells[0]).toHaveStyle({ width: 18, height: 4, backgroundColor: COLORS.text });
    expect(cells[1]).toHaveStyle({
      width: 6,
      height: 4,
      backgroundColor: WRITTEN_DAY.indicatorIdle,
    });
    expect(cells[2]).toHaveStyle({ width: 6, backgroundColor: WRITTEN_DAY.indicatorIdle });
  });

  it("★ CAR5 — 셋째 장에 멈추면 배지 「3 / 3」, 셋째 칸이 긴 막대", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    await act(async () => {
      screen.getByTestId("photo-carousel").props.onProgressChange(2);
    });
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("3 / 3");
    expect(screen.getByTestId("photo-carousel-dot-2")).toHaveStyle({ width: 18 });
    expect(screen.getByTestId("photo-carousel-dot-0")).toHaveStyle({ width: 6 });
  });

  it("★ CAR6 — 원본 색(흑백 필터 없음)·잘라 채움, 높이 210", async () => {
    // 2026-10-01 저장소 소유자 결정 — 보드의 grayscale을 따르지 않는다.
    await render(<PhotoCarousel photos={[photo(1)]} width={320} />);
    const face = screen.getByTestId("photo-face-p1");
    expect(flat(face.props.style)).toMatchObject({ height: WRITTEN_DAY.photoHeight });
    expect(flat(face.props.style).filter).toBeUndefined();
    expect(screen.getByTestId("diary-photo")).toHaveProp("resizeMode", "cover");
  });

  it("CAR7 — 배지: accent 배경 + accentForeground 글자, 11/700, 위·오른쪽 10", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    const badge = screen.getByTestId("photo-carousel-badge");
    expect(flat(badge.props.style)).toMatchObject({
      backgroundColor: COLORS.accent,
      top: 10,
      right: 10,
    });
    expect(screen.getByText("1 / 3")).toHaveStyle({
      color: COLORS.accentForeground,
      fontSize: 11,
      fontWeight: "700",
    });
    expect(flat(badge.props.style).filter).toBeUndefined();
  });

  it("★ CAR8 — 사본을 못 불러오면 그 슬라이드에 「이 사진은 이제 없어요」, 전체 수는 그대로", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    await fireEvent(screen.getByTestId("diary-photo"), "error");
    expect(screen.getByTestId("diary-photo-missing")).toHaveTextContent("이 사진은 이제 없어요");
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("1 / 3");
  });

  it("★ CAR5a — 배지·인디케이터는 넘김이 끝나길 기다리지 않는다 (onSnapToItem 미사용)", async () => {
    // 실기기: onSnapToItem은 넘김 애니메이션이 끝난 뒤에 불려 막대가 한 박자 늦게 따라왔다.
    await render(<PhotoCarousel photos={three} width={320} />);
    const carousel = screen.getByTestId("photo-carousel");
    expect(carousel.props.onSnapToItem).toBeUndefined();
    // 둘째 장으로 반을 조금 넘게 끈 순간 — 손을 떼기 전에 이미 바뀐다
    await act(async () => {
      carousel.props.onProgressChange(0.6);
    });
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("2 / 3");
    expect(screen.getByTestId("photo-carousel-dot-1")).toHaveStyle({ width: 18 });
  });

  it("CAR5b — 위치 → 순번: 반올림, 순환(범위 밖·음수), 이상값은 0", () => {
    expect(indexAtProgress(0, 3)).toBe(0);
    expect(indexAtProgress(0.49, 3)).toBe(0);
    expect(indexAtProgress(0.51, 3)).toBe(1);
    expect(indexAtProgress(2.6, 3)).toBe(0); // 마지막 장에서 첫 장으로 순환
    expect(indexAtProgress(-0.6, 3)).toBe(2); // 첫 장에서 뒤로
    expect(indexAtProgress(-4, 3)).toBe(2);
    expect(indexAtProgress(7, 3)).toBe(1);
    expect(indexAtProgress(Number.NaN, 3)).toBe(0);
    expect(indexAtProgress(1, 0)).toBe(0);
  });

  /*
   * 067 — 051 CAR9(「사진에 누름이 없다」)를 뒤집었다. 사진을 누르면 확대 화면이 열린다(contracts/photo-viewer.md ZC1~ZC4).
   */
  it("★ ZC1 — 여러 장: 각 사진은 누를 수 있다 (사진 크게 보기)", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    // 캐러셀 목은 첫 장만 그린다
    const open = screen.getByTestId("photo-open-p1");
    expect(open.props.accessibilityRole).toBe("imagebutton");
    expect(open.props.accessibilityLabel).toBe(PHOTO_VIEWER_TEXT.open);
  });

  it("ZC2 — 1장도 누를 수 있다", async () => {
    await render(<PhotoCarousel photos={[photo(1)]} width={320} />);
    expect(screen.getByTestId("photo-open-p1").props.accessibilityLabel).toBe(
      PHOTO_VIEWER_TEXT.open,
    );
  });

  it("★ ZC3 — 누르면 확대 화면이 누른 장부터 열린다", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    expect(screen.queryByTestId("photo-viewer")).toBeNull();
    await fireEvent.press(screen.getByTestId("photo-open-p1"));
    expect(screen.getByTestId("photo-viewer")).toBeTruthy();
    expect(screen.getByTestId("photo-viewer-badge")).toHaveTextContent("1 / 3");
    expect(screen.getByTestId("photo-viewer-carousel").props.defaultIndex).toBe(0);
  });

  it("ZC4 — 사본을 못 불러온 칸은 누를 수 없다", async () => {
    await render(<PhotoCarousel photos={[photo(1)]} width={320} />);
    await fireEvent(screen.getByTestId("diary-photo"), "error");
    expect(screen.getByTestId("diary-photo-missing")).toBeTruthy();
    expect(screen.queryByTestId("photo-open-p1")).toBeNull();
  });

  it("★ ZC8 — 사진 한 장을 가로로 쓸고 떼면 열리지 않는다, 제자리에서 떼면 열린다 (실기기에서 드러남)", async () => {
    await render(<PhotoCarousel photos={[photo(1)]} width={320} />);
    const open = screen.getByTestId("photo-open-p1");
    await fireEvent(open, "pressIn", { nativeEvent: { pageX: 300, pageY: 500 } });
    await fireEvent(open, "press", { nativeEvent: { pageX: 60, pageY: 505 } });
    expect(screen.queryByTestId("photo-viewer")).toBeNull();

    await fireEvent(open, "pressIn", { nativeEvent: { pageX: 300, pageY: 500 } });
    await fireEvent(open, "press", { nativeEvent: { pageX: 303, pageY: 502 } });
    expect(screen.getByTestId("photo-viewer")).toBeTruthy();
  });

  it("★ ZC5 — 확대 화면을 셋째 장에서 닫으면 지면도 셋째 장", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    await fireEvent.press(screen.getByTestId("photo-open-p1"));
    await act(async () => {
      screen.getByTestId("photo-viewer").props.onRequestClose();
    });
    // 시작 장(0)으로 닫힌 경우 — 그대로 첫 장
    expect(screen.queryByTestId("photo-viewer")).toBeNull();
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("1 / 3");

    await fireEvent.press(screen.getByTestId("photo-open-p1"));
    await act(async () => {
      screen.getByTestId("photo-viewer-carousel").props.onProgressChange(2);
    });
    await act(async () => {
      screen.getByTestId("photo-viewer").props.onRequestClose();
    });
    expect(screen.queryByTestId("photo-viewer")).toBeNull();
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("3 / 3");
    expect(screen.getByTestId("photo-carousel-dot-2")).toHaveStyle({ width: 18 });
  });

  it("ZC6 — 닫힐 때 지면 캐러셀을 애니메이션 없이 그 장으로 옮긴다 (소스 — 목에는 ref가 없다)", () => {
    const source = readFileSync(join(__dirname, "../../src/ui/PhotoCarousel.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toMatch(/scrollTo\(\{\s*index[^}]*animated:\s*false/);
  });

  it("ZC7 — 누름이 넘김을 빼앗지 않는다: 지면 캐러셀의 팬 설정은 그대로", async () => {
    await render(<PhotoCarousel photos={three} width={320} />);
    const gesture: Record<string, jest.Mock> = {};
    gesture.activeOffsetX = jest.fn(() => gesture);
    gesture.failOffsetY = jest.fn(() => gesture);
    screen.getByTestId("photo-carousel").props.onConfigurePanGesture(gesture);
    expect(gesture.activeOffsetX).toHaveBeenCalledWith([-10, 10]);
    expect(gesture.failOffsetY).toHaveBeenCalledWith([-10, 10]);
  });

  it("★ CAR10 — 날이 바뀌면 캐러셀이 새로 마운트되어 1장부터", async () => {
    const { rerender } = await render(
      <WrittenDayPaper
        paper={{ kind: "readable", entry: entry("2026-09-26", three), madeUp: false }}
      />,
    );
    await act(async () => {
      screen.getByTestId("photo-carousel").props.onProgressChange(2);
    });
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("3 / 3");

    await rerender(
      <WrittenDayPaper
        paper={{ kind: "readable", entry: entry("2026-09-25", three), madeUp: false }}
      />,
    );
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("1 / 3");
  });

  it("CAR11 — 캐러셀 라이브러리를 딥 import하지 않는다 (v5 규칙)", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });
    for (const file of walk(join(__dirname, "../../src"))) {
      expect(readFileSync(file, "utf8")).not.toMatch(/react-native-reanimated-carousel\//);
    }
  });
});

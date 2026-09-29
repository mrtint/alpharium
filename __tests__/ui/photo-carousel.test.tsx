/**
 * 051 — 쓴 날 캐러셀 (보드 `2c`·`2k`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md CAR1~CAR11
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **jest는 배선만 본다**(C9). `react-native-reanimated-carousel`은 `jest/setup-ui.ts`의 목이 첫
 * 슬라이드만 그리고 받은 props(`loop`·`onSnapToItem`·`onConfigurePanGesture`·`data`)를 host 노드에
 * 넘긴다. 실제 넘김·순환·흑백·세로 스크롤과의 제스처 분리는 실기기(quickstart D2~D4)에서 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { DiaryEntry } from "../../src/diary/types";
import { PhotoCarousel } from "../../src/ui/PhotoCarousel";
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
      screen.getByTestId("photo-carousel").props.onSnapToItem(2);
    });
    expect(screen.getByTestId("photo-carousel-badge")).toHaveTextContent("3 / 3");
    expect(screen.getByTestId("photo-carousel-dot-2")).toHaveStyle({ width: 18 });
    expect(screen.getByTestId("photo-carousel-dot-0")).toHaveStyle({ width: 6 });
  });

  it("★ CAR6 — 흑백·잘라 채움, 높이 210", async () => {
    await render(<PhotoCarousel photos={[photo(1)]} width={320} />);
    const face = screen.getByTestId("photo-face-p1");
    expect(flat(face.props.style)).toMatchObject({
      height: WRITTEN_DAY.photoHeight,
      filter: [{ grayscale: 1 }],
    });
    expect(screen.getByTestId("diary-photo")).toHaveProp("resizeMode", "cover");
  });

  it("CAR7 — 배지: accent 배경 + accentForeground 글자, 11/700, 위·오른쪽 10 — 흑백 면 밖", async () => {
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

  it("CAR9 — 사진에 누름이 없다 (갤러리 없음)", async () => {
    await render(<PhotoCarousel photos={[photo(1)]} width={320} />);
    expect(screen.getByTestId("diary-photo").props.onPress).toBeUndefined();
    expect(screen.getByTestId("photo-face-p1").props.onPress).toBeUndefined();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("★ CAR10 — 날이 바뀌면 캐러셀이 새로 마운트되어 1장부터", async () => {
    const { rerender } = await render(
      <WrittenDayPaper
        paper={{ kind: "readable", entry: entry("2026-09-26", three), madeUp: false }}
      />,
    );
    await act(async () => {
      screen.getByTestId("photo-carousel").props.onSnapToItem(2);
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

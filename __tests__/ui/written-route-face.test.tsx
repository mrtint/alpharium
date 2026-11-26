/**
 * 135 — 쓴 날 사진 자리의 지도 면과 폴라로이드 카드.
 *
 * 계약: specs/135-diary-route-views/contracts/written-route.md WR1~WR9
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`·`rerender`는 Promise다 — `await`한다.
 */

import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import type { DayRoute } from "../../src/app/day-route";
import type { PaperState } from "../../src/app/written-day";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { WrittenDayPaper } from "../../src/ui/WrittenDayPaper";

const SIGNALS: DaySignals = {
  date: "2026-11-26",
  photos: { kind: "none" },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "-" },
  battery: { kind: "unknown", reason: "-" },
  connectivity: { kind: "unknown", reason: "-" },
};

type Photo = NonNullable<DiaryEntry["photos"]>[number];
const photo = (id: string, hour: number, placeIndex?: number | null): Photo => ({
  photoId: id,
  takenAt: new Date(2026, 10, 26, hour),
  resizedPath: `/r/${id}.jpg`,
  ownsResizedPath: true,
  ...(placeIndex !== undefined ? { placeIndex } : {}),
});

/** 자리 1에 사진 넷, 자리 2에 하나, 자리 3에는 없음, 좌표 없는 사진 하나 */
const LINKED: Photo[] = [
  photo("a", 9, 0),
  photo("b", 10, 0),
  photo("c", 11, 0),
  photo("d", 11, 0),
  photo("e", 14, 1),
  photo("n", 15, null),
];

const entry = (date: string, photos: Photo[] | undefined): DiaryEntry => ({
  date,
  title: "하루",
  text: "첫 문단이다.",
  character: "quiet",
  signalsUsed: { ...SIGNALS, date },
  createdAt: new Date(2026, 10, 26, 22),
  ...(photos !== undefined ? { photos } : {}),
});

const paper = (
  photos: Photo[] | undefined,
  date = "2026-11-26",
): Extract<PaperState, { kind: "readable" }> => ({
  kind: "readable",
  entry: entry(date, photos),
  madeUp: false,
});

const MAP_ROUTE: DayRoute = {
  items: [
    { n: 1, period: "morning", label: "서울숲", photos: 4, x: 0.15, y: 0.75 },
    { n: 2, period: "afternoon", label: "성수동", photos: 1, x: 0.5, y: 0.3 },
    { n: 3, period: "evening", label: null, photos: 1, x: 0.85, y: 0.7 },
  ],
  more: 0,
  diagram: true,
};

const LIST_ROUTE: DayRoute = {
  items: [{ n: 1, period: "morning", label: "서울숲", photos: 1 }],
  more: 0,
  diagram: false,
};

const HIDDEN = { includeHiddenElements: true } as const;

async function showMap() {
  await fireEvent.press(screen.getByTestId("show-route-map"));
}

describe("135 WR1~WR6 — 사진 면과 지도 면", () => {
  it("★ WR2·WR3 — 지도 아이콘으로 지도 면, 사진 아이콘으로 돌아온다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    expect(screen.queryByTestId("route-face")).toBeNull();
    expect(screen.getByTestId("show-route-map").props.accessibilityLabel).toBe("다닌 길 보기");

    await showMap();
    expect(screen.getByTestId("route-face")).toBeTruthy();
    expect(screen.getByTestId("show-photos").props.accessibilityLabel).toBe("사진 보기");
    // 사진 면은 숨지만 마운트를 유지한다 — 돌아오면 보던 장이다
    expect(screen.queryByTestId("show-route-map")).toBeNull();
    expect(screen.getByTestId("show-route-map", HIDDEN)).toBeTruthy();

    await fireEvent.press(screen.getByTestId("show-photos"));
    expect(screen.queryByTestId("route-face")).toBeNull();
    expect(screen.getByTestId("show-route-map")).toBeTruthy();
  });

  it("사진이 1장이어도 지도 아이콘이 있다", async () => {
    await render(<WrittenDayPaper paper={paper([photo("a", 9, 0)])} route={MAP_ROUTE} />);
    expect(screen.getByTestId("show-route-map")).toBeTruthy();
  });

  it("WR1 — 동선을 그릴 수 없는 날(목록만·없음)은 지도 아이콘이 없고 아래 칸이 그대로다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={LIST_ROUTE} />);
    expect(screen.queryByTestId("show-route-map")).toBeNull();
    expect(screen.getByTestId("day-route")).toBeTruthy();

    await render(<WrittenDayPaper paper={paper(LINKED)} />);
    expect(screen.queryByTestId("show-route-map")).toBeNull();
    expect(screen.queryByTestId("day-route", HIDDEN)).toBeNull();
  });

  it("★ WR5 — 지도 면이 있는 날은 아래 「하루 동선」 칸을 그리지 않는다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    expect(screen.queryByTestId("day-route", HIDDEN)).toBeNull();
  });

  it("★ WR4 — 사진이 0장이면 지도 면만, 사진 아이콘 없이", async () => {
    await render(<WrittenDayPaper paper={paper(undefined)} route={MAP_ROUTE} />);
    expect(screen.getByTestId("route-face")).toBeTruthy();
    expect(screen.queryByTestId("show-photos")).toBeNull();
    expect(screen.queryByTestId("show-route-map")).toBeNull();
  });

  it("★ WR6 — 다른 날이 오면 사진 면으로 시작한다", async () => {
    const { rerender } = await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    expect(screen.getByTestId("route-face")).toBeTruthy();
    await rerender(<WrittenDayPaper paper={paper(LINKED, "2026-11-25")} route={MAP_ROUTE} />);
    expect(screen.queryByTestId("route-face")).toBeNull();
    expect(screen.getByTestId("show-route-map")).toBeTruthy();
  });
});

describe("135 WR7·WR8 — 번호를 누르면 폴라로이드", () => {
  it("★ 점은 「N번 자리, 이름, 때」로 읽히는 버튼이다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    const m1 = screen.getByTestId("route-marker-1");
    expect(m1.props.accessibilityRole).toBe("button");
    expect(m1.props.accessibilityLabel).toBe("1번 자리, 서울숲, 오전");
    expect(screen.getByTestId("route-marker-3").props.accessibilityLabel).toBe("3번 자리, 저녁");
  });

  it("★ 누르면 그 자리 사진 최대 3장 + 「+N」과 「번호 · 때 · 이름」 한 줄", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    expect(screen.queryByTestId("route-card")).toBeNull();
    await fireEvent.press(screen.getByTestId("route-marker-1"));
    const card = screen.getByTestId("route-card");
    expect(within(card).getAllByTestId(/^route-card-photo-/)).toHaveLength(3);
    expect(within(card).getByTestId("route-card-more")).toHaveTextContent("+1");
    expect(within(card).getByText("1 · 오전 · 서울숲")).toBeTruthy();
    expect(card.props.accessibilityLabel).toBe("1번 자리 사진 4장 크게 보기");
  });

  it("★ 카드를 누르면 그 자리 사진만으로 확대 화면이 열린다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    await fireEvent.press(screen.getByTestId("route-marker-1"));
    await fireEvent.press(screen.getByTestId("route-card"));
    expect(screen.getByTestId("photo-viewer")).toBeTruthy();
    expect(screen.getByTestId("photo-viewer-badge")).toHaveTextContent("1 / 4");
  });

  it("같은 점·빈 곳이면 닫히고, 다른 점이면 옮겨간다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    await fireEvent.press(screen.getByTestId("route-marker-1"));
    await fireEvent.press(screen.getByTestId("route-marker-1"));
    expect(screen.queryByTestId("route-card")).toBeNull();

    await fireEvent.press(screen.getByTestId("route-marker-1"));
    await fireEvent.press(screen.getByTestId("route-marker-2"));
    expect(within(screen.getByTestId("route-card")).getByText("2 · 오후 · 성수동")).toBeTruthy();
    expect(screen.getByTestId("route-marker-2").props.accessibilityState).toEqual({
      selected: true,
    });

    await fireEvent.press(screen.getByTestId("route-face-backdrop"));
    expect(screen.queryByTestId("route-card")).toBeNull();
  });

  it("면을 바꾸면 카드가 닫힌다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    await fireEvent.press(screen.getByTestId("route-marker-1"));
    await fireEvent.press(screen.getByTestId("show-photos"));
    await showMap();
    expect(screen.queryByTestId("route-card")).toBeNull();
  });

  it("★ 사진이 남지 않은 자리 — 「이곳에서 남은 사진이 없어요」, 누를 수 없다", async () => {
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    await fireEvent.press(screen.getByTestId("route-marker-3"));
    const card = screen.getByTestId("route-card");
    expect(within(card).getByText("이곳에서 남은 사진이 없어요")).toBeTruthy();
    expect(within(card).getByText("3 · 저녁")).toBeTruthy();
    expect(card.props.accessibilityRole).toBeUndefined();
  });

  it("★ 옛 일기(placeIndex 없음) — 「이 일기에는 자리별 사진이 남아 있지 않아요」, 짐작한 사진이 없다", async () => {
    const old = [photo("a", 9), photo("e", 14)];
    await render(<WrittenDayPaper paper={paper(old)} route={MAP_ROUTE} />);
    await showMap();
    await fireEvent.press(screen.getByTestId("route-marker-1"));
    const card = screen.getByTestId("route-card");
    expect(within(card).getByText("이 일기에는 자리별 사진이 남아 있지 않아요")).toBeTruthy();
    expect(within(card).queryAllByTestId(/^route-card-photo-/)).toHaveLength(0);
  });
});

describe("135 코드 리뷰 회귀", () => {
  it("★ 지도 면에서 같은 날 동선이 사라지면 사진 면이 다시 보인다(빈 칸이 아니다)", async () => {
    const { rerender } = await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    await rerender(<WrittenDayPaper paper={paper(LINKED)} route={LIST_ROUTE} />);
    expect(screen.queryByTestId("route-face")).toBeNull();
    // 숨은(낭독 제외) 캐러셀이 아니라 보이는 캐러셀이다
    expect(screen.getByTestId("photo-open-a")).toBeTruthy();
  });

  it("★ 카드가 열리면 낭독기에 알린다", async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    await render(<WrittenDayPaper paper={paper(LINKED)} route={MAP_ROUTE} />);
    await showMap();
    await fireEvent.press(screen.getByTestId("route-marker-3"));
    expect(announce).toHaveBeenLastCalledWith("3 · 저녁. 이곳에서 남은 사진이 없어요");
    announce.mockRestore();
  });
});

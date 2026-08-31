/**
 * 025 — 일기 본문 사진 슬라이더 & 풀스크린 갤러리.
 *
 * 계약: specs/025-diary-photo-gallery/contracts/photo-gallery.md
 *
 * ⚠️ `render`와 `fireEvent`는 Promise를 반환한다(RNTL 14) — 상태 갱신을 보려면
 * `await`한다. 부분 문자열은 정규식으로 준다.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";

import { DiaryDetailScreen } from "../../src/ui/DiaryDetailScreen";
import type { DiaryEntry } from "../../src/diary/types";
import { partiallyUnknownDay } from "../../src/signals/fake";

const BODY = "오늘 주인은 어딘가로 나섰다.";

const entryFor = (photoCount: number): DiaryEntry => ({
  date: "2026-08-16",
  text: BODY,
  character: "quiet",
  signalsUsed: partiallyUnknownDay("2026-08-16"),
  createdAt: new Date("2026-08-17T06:00:00"),
  photos: Array.from({ length: photoCount }, (_, i) => ({
    photoId: `p${i}`,
    takenAt: new Date(`2026-08-16T0${i}:00:00`),
    resizedPath: `/resized/p${i}.jpg`,
  })),
});

const WIDTH = 300;

/**
 * 페이저를 index 페이지로 스크롤한다.
 *
 * jest-expo의 `ScrollView`는 `onMomentumScrollEnd`를 테스트에서 전달하지 않지만
 * `onScroll` + `fireEvent.scroll`은 지원한다(RNTL 14 `native-state` 추적). 제품
 * 컴포넌트가 두 핸들러를 같은 계산으로 연결하므로 이 경로로 위치 표시 갱신을
 * 검증할 수 있다.
 */
async function swipeTo(testID: string, index: number) {
  await fireEvent.scroll(screen.getByTestId(testID), {
    nativeEvent: {
      contentOffset: { x: index * WIDTH, y: 0 },
      layoutMeasurement: { width: WIDTH, height: 400 },
      contentSize: { width: WIDTH * 8, height: 400 },
    },
  });
}

/** 슬라이더 셀 하나를 탭해 갤러리를 연다. */
async function tapCell(index: number) {
  await fireEvent.press(screen.getByTestId(`photo-slider-cell-${index}`));
}

// ───────────────────────────────────────────────────────────────────────────
// A. PhotoSlider — 본문 가로 슬라이더
// ───────────────────────────────────────────────────────────────────────────

describe("PhotoSlider (contracts §A)", () => {
  it("C1 — photos가 있으면 가로 슬라이더 페이저로 렌더되고 각 사진이 이미지다", async () => {
    await render(<DiaryDetailScreen entry={entryFor(3)} />);

    expect(screen.getByTestId("photo-slider-pager")).toBeTruthy();
    // 페이저는 오프스크린 셀도 마운트한다 — 3장 전부.
    expect(screen.getAllByTestId("diary-photo")).toHaveLength(3);
  });

  it("C3 — 위치 표시가 있고 스와이프에서 갱신된다", async () => {
    await render(<DiaryDetailScreen entry={entryFor(3)} />);

    const pos = screen.getByTestId("photo-slider-position");
    expect(pos).toHaveTextContent("1 / 3");

    await swipeTo("photo-slider-pager", 1);
    expect(pos).toHaveTextContent("2 / 3");
  });

  it("C4 — 사진 셀을 탭하면 그 index로 갤러리가 열린다", async () => {
    await render(<DiaryDetailScreen entry={entryFor(3)} />);

    await tapCell(1);

    expect(screen.getByTestId("photo-gallery")).toBeTruthy();
    expect(screen.getByTestId("photo-gallery-position")).toHaveTextContent("2 / 3");
  });

  it("C4 — 슬라이더 셀은 접근성 역할이 imagebutton이다", async () => {
    await render(<DiaryDetailScreen entry={entryFor(2)} />);
    expect(screen.getAllByRole("imagebutton")).toHaveLength(2);
  });

  it("C5 — 사본을 못 불러오면 그 셀만 '이제 없다', 나머지는 정상", async () => {
    await render(<DiaryDetailScreen entry={entryFor(3)} />);

    const images = screen.getAllByTestId("diary-photo");
    expect(images).toHaveLength(3);

    await fireEvent(images[0], "error");

    expect(screen.getByTestId("diary-photo-missing")).toBeTruthy();
    expect(screen.getByText(/이 사진은 이제 없다/)).toBeTruthy();
    // 나머지 두 장은 여전히 이미지. 위치 표시의 전체 수는 그대로 3.
    expect(screen.getAllByTestId("diary-photo")).toHaveLength(2);
    expect(screen.getByTestId("photo-slider-position")).toHaveTextContent(/\/ 3$/);
  });

  it("C6 — 사진이 1장뿐이면 '1 / 1'로 정상 렌더된다", async () => {
    await render(<DiaryDetailScreen entry={entryFor(1)} />);

    expect(screen.getByTestId("photo-slider-position")).toHaveTextContent("1 / 1");
    expect(screen.getAllByTestId("diary-photo")).toHaveLength(1);
  });

  it("C8·C9 — 위치 표시는 순번뿐, 캡션·모델 식별자·속도·단위가 없다", async () => {
    await render(<DiaryDetailScreen entry={entryFor(3)} />);

    expect(screen.getByTestId("photo-slider-position")).toHaveTextContent(/^\d+ \/ \d+$/);
    for (const leaked of ["quiet", "gguf", "토큰", "/s"]) {
      expect(screen.queryByText(new RegExp(leaked))).toBeNull();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// B. PhotoGalleryModal — 풀스크린 갤러리
// ───────────────────────────────────────────────────────────────────────────

describe("PhotoGalleryModal (contracts §B)", () => {
  async function openGalleryAt(photoCount: number, tapIndex: number) {
    await render(<DiaryDetailScreen entry={entryFor(photoCount)} />);
    await tapCell(tapIndex);
  }

  it("C10·C11 — 탭하면 갤러리가 뜨고 탭한 사진 순번에서 시작한다", async () => {
    await openGalleryAt(4, 2);

    expect(screen.getByTestId("photo-gallery")).toBeTruthy();
    expect(screen.getByTestId("photo-gallery-position")).toHaveTextContent("3 / 4");
  });

  it("C12·C13 — 좌우 스와이프로 넘어가고 마지막 다음으로는 순환하지 않는다", async () => {
    await openGalleryAt(3, 0);

    const pos = screen.getByTestId("photo-gallery-position");
    await swipeTo("photo-gallery-pager", 2);
    expect(pos).toHaveTextContent("3 / 3");

    // 마지막에서 더 넘겨도(인덱스 5 상당) 3/3에 클램프.
    await swipeTo("photo-gallery-pager", 5);
    expect(pos).toHaveTextContent("3 / 3");
  });

  it("C15 — 닫기 버튼이 갤러리를 닫는다(상세 화면으로 복귀)", async () => {
    await openGalleryAt(3, 1);

    expect(screen.getByTestId("photo-gallery-close")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("photo-gallery-close"));

    expect(screen.queryByTestId("photo-gallery")).toBeNull();
    // 상세 본문은 그대로.
    expect(screen.getByText(BODY)).toBeTruthy();
  });

  it("C15 — onRequestClose(안드로이드 뒤로 가기)로도 닫힌다", async () => {
    await openGalleryAt(3, 1);

    await fireEvent(screen.getByTestId("photo-gallery"), "requestClose");
    expect(screen.queryByTestId("photo-gallery")).toBeNull();
  });

  it("C16 — 갤러리 안의 유일한 버튼은 닫기 버튼뿐이다(배경 탭 닫기 없음)", async () => {
    await openGalleryAt(3, 1);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toBe(screen.getByTestId("photo-gallery-close"));
  });

  it("C17 — 갤러리에서 사본 실패는 풀스크린 '이제 없다'", async () => {
    await openGalleryAt(3, 0);

    // 갤러리 페이저 안의 이미지 하나에 error.
    const images = screen.getAllByTestId("diary-photo");
    await fireEvent(images[images.length - 1], "error");

    expect(screen.getAllByTestId("diary-photo-missing").length).toBeGreaterThanOrEqual(1);
  });

  it("C18 — 사진 1장짜리 갤러리도 정상으로 열리고 닫힌다", async () => {
    await openGalleryAt(1, 0);

    expect(screen.getByTestId("photo-gallery-position")).toHaveTextContent("1 / 1");
    await fireEvent.press(screen.getByTestId("photo-gallery-close"));
    expect(screen.queryByTestId("photo-gallery")).toBeNull();
  });

  it("C18a — 갤러리가 열린 채 부모가 리렌더돼도 상태·마운트가 유지된다 (FR-015a)", async () => {
    const entry = entryFor(4);
    const view = await render(<DiaryDetailScreen entry={entry} />);
    await tapCell(2);

    const pos = screen.getByTestId("photo-gallery-position");
    await swipeTo("photo-gallery-pager", 3);
    expect(pos).toHaveTextContent("4 / 4");

    // 회전·AppState 변화 모사 — 같은 props로 리렌더.
    view.rerender(<DiaryDetailScreen entry={entry} />);

    expect(screen.getByTestId("photo-gallery")).toBeTruthy();
    // 스와이프로 옮긴 위치가 유지된다(initialIndex로 되돌아가지 않음).
    expect(screen.getByTestId("photo-gallery-position")).toHaveTextContent("4 / 4");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C. DiaryDetailScreen 배선 & 회귀 (contracts §C·§D)
// ───────────────────────────────────────────────────────────────────────────

describe("DiaryDetailScreen 배선 (contracts §C)", () => {
  const oldEntry: DiaryEntry = {
    date: "2026-08-10",
    text: "옛 일기.",
    character: "quiet",
    signalsUsed: partiallyUnknownDay("2026-08-10"),
    createdAt: new Date("2026-08-11T06:00:00"),
    // photos 없음
  };

  it("C20·C27 — photos가 없는 옛 일기는 슬라이더·갤러리 없이 정상", async () => {
    await render(<DiaryDetailScreen entry={oldEntry} />);

    expect(screen.queryByTestId("diary-photo")).toBeNull();
    expect(screen.queryByTestId("photo-slider-position")).toBeNull();
    expect(screen.queryByTestId("photo-gallery")).toBeNull();
    expect(screen.getByText(/^사진: /)).toBeTruthy();
  });

  it("C23 — 갤러리가 열려도 상세 본문이 트리에 남는다(언마운트 안 됨)", async () => {
    await render(<DiaryDetailScreen entry={entryFor(3)} />);
    await tapCell(0);

    expect(screen.getByTestId("photo-gallery")).toBeTruthy();
    expect(screen.getByText(BODY)).toBeTruthy();
  });
});

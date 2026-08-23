/**
 * 일기 상세 화면 테스트.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *
 * ⚠️ `render`는 Promise를 반환한다(AGENTS.md). `toHaveTextContent`는 **정확히 일치**를
 * 보므로 부분 문자열은 정규식으로 준다.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";

import { DiaryDetailScreen } from "../../src/ui/DiaryDetailScreen";
import type { DiaryEntry } from "../../src/diary/types";
import { partiallyUnknownDay, richDay, unknownDay } from "../../src/signals/fake";

const DIARY = "오늘 주인은 어딘가로 나섰다. 사진 세 장이 남았고 나는 그것만 안다.";

const entryFor = (day = "2026-08-16", signals = partiallyUnknownDay("2026-08-16")): DiaryEntry => ({
  date: day,
  text: DIARY,
  character: "quiet",
  signalsUsed: signals,
  createdAt: new Date("2026-08-17T06:00:00"),
});

describe("전문을 읽는다 (FR-019)", () => {
  it("일기 본문이 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} />);

    expect(screen.getByText(DIARY)).toBeTruthy();
  });

  it("어느 날의 일기인지 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor("2026-08-16")} />);

    expect(screen.getByText(/2026-08-16/)).toBeTruthy();
  });
});

/** 014 US2 — 제목이 있으면 보인다(FR-011) */
describe("제목 (014 FR-011)", () => {
  it("제목이 있으면 보인다", async () => {
    await render(<DiaryDetailScreen entry={{ ...entryFor(), title: "조용한 하루" }} />);

    expect(screen.getByText("조용한 하루")).toBeTruthy();
  });

  it("제목이 없으면 본문만 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} />);

    expect(screen.getByText(DIARY)).toBeTruthy();
    expect(screen.queryByText("undefined")).toBeNull();
  });
});

/**
 * ★ 006 FR-012b — **저장되지 않은 일기는 그 사실을 말한다.**
 *
 * 30초를 들여 만든 글을 읽을 수 있게 하되, 목록에 남지 않는다는 것을 사용자가 알아야
 * 한다. 성공처럼 보이면 사용자는 일기가 남은 줄 안다(SC-008c).
 */
describe("★ 저장되지 않은 일기 (FR-012b)", () => {
  it("저장하지 못했다는 것과 사라진다는 것이 함께 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} saved={false} />);

    expect(screen.getByText(/저장하지 못했다/)).toBeTruthy();
    expect(screen.getByText(/사라진다/)).toBeTruthy();
  });

  it("글은 그대로 읽을 수 있다 (SC-008e)", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} saved={false} />);

    expect(screen.getByText(DIARY)).toBeTruthy();
  });

  it("저장된 일기에는 그 말이 없다", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} saved={true} />);

    expect(screen.queryByText(/저장하지 못했다/)).toBeNull();
  });

  it("saved를 주지 않으면 저장된 것으로 본다 — 목록에서 연 일기다", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} />);

    expect(screen.queryByText(/저장하지 못했다/)).toBeNull();
  });
});

/**
 * ★ 006 FR-034 — **덮어썼다는 사실을 사용자에게 옮긴다** (002 FR-023a).
 *
 * 조용히 덮어쓰면 사용자는 이전 일기가 사라진 줄도 모른다. 온디바이스 생성은 비용이
 * 크고 사라진 일기는 되돌릴 수 없다.
 */
describe("★ 덮어쓴 일기 (FR-034)", () => {
  it("덮어썼다는 것이 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} overwrote={true} />);

    expect(screen.getByText(/이전 일기.*덮어/)).toBeTruthy();
  });

  it("처음 쓴 일기에는 그 말이 없다", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} overwrote={false} />);

    expect(screen.queryByText(/덮어/)).toBeNull();
  });

  it("목록에서 연 일기에는 그 말이 없다", async () => {
    // overwrote를 주지 않으면 방금 쓴 것이 아니다.
    await render(<DiaryDetailScreen entry={entryFor()} />);

    expect(screen.queryByText(/덮어/)).toBeNull();
  });
});

/**
 * ★ 원칙 V — **사진을 보지 못한 하루와 사진이 없었던 하루가 다르게 보인다**
 * (FR-032, SC-016).
 *
 * 004가 값에서 지킨 구분이 화면에서 무너지면 무의미해진다.
 */
describe("★ 모르는 것과 없는 것이 구분된다 (FR-032)", () => {
  it("사진을 보지 못한 하루는 「모른다」로 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor("2026-08-16", unknownDay("2026-08-16"))} />);

    expect(screen.getByText(/^사진: 모른다$/)).toBeTruthy();
  });

  it("사진이 있었던 하루는 그 수가 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor("2026-08-16", richDay("2026-08-16"))} />);

    // 본문에도 「사진」이 들어 있으므로 신호 줄을 콕 집는다.
    expect(screen.getByText(/^사진: \d+장$/)).toBeTruthy();
    expect(screen.queryByText(/사진.*모른다/)).toBeNull();
  });

  it("★ 「모른다」와 「없었다」가 같은 문장이 아니다", async () => {
    await render(<DiaryDetailScreen entry={entryFor("2026-08-16", unknownDay("2026-08-16"))} />);

    // 모르는 것을 「없었다」로 적으면 일기가 거짓을 쓴다.
    expect(screen.queryByText(/사진.*없었다/)).toBeNull();
  });
});

/**
 * 012 — 관측 불가 축이 상세 화면에서 사라진다.
 *
 * 계약: specs/012-today-diary/contracts/signal-visibility.md §1의 3번 행
 */
describe("012 — 걸음·배터리·연결이 상세 화면에 없다 (contracts/signal-visibility.md §1)", () => {
  it("사진이 known인 하루에도 걸음 줄이 없다 (회귀 없음 포함)", async () => {
    await render(<DiaryDetailScreen entry={entryFor("2026-08-16", richDay("2026-08-16"))} />);

    expect(screen.queryByText(/걸음/)).toBeNull();
  });

  it("걸음이 unknown이어도 걸음 줄이 없다", async () => {
    await render(
      <DiaryDetailScreen entry={entryFor("2026-08-16", partiallyUnknownDay("2026-08-16"))} />,
    );

    expect(screen.queryByText(/걸음/)).toBeNull();
  });

  it("사진과 다닌 자리만 보인다", async () => {
    await render(<DiaryDetailScreen entry={entryFor("2026-08-16", richDay("2026-08-16"))} />);

    expect(screen.getByText(/^사진: /)).toBeTruthy();
    expect(screen.getByText(/^다닌 자리: /)).toBeTruthy();
  });
});

/**
 * 017 — 사진 표시 (User Story 1, FR-001~003).
 *
 * 계약: specs/017-diary-body-screen/contracts/photo-preservation.md P6
 */
describe("017 — 사진 표시 (FR-001~003)", () => {
  const photos = [
    { photoId: "a", takenAt: new Date("2026-08-16T08:00:00"), resizedPath: "/resized/a.jpg" },
    { photoId: "b", takenAt: new Date("2026-08-16T14:00:00"), resizedPath: "/resized/b.jpg" },
  ];

  it("entry.photos가 있으면 그 사진들이 이미지로 렌더된다", async () => {
    await render(<DiaryDetailScreen entry={{ ...entryFor(), photos }} />);

    const images = screen.getAllByTestId("diary-photo");
    const sources = images.map((img) => img.props.source.uri);

    expect(sources).toContain("file:///resized/a.jpg");
    expect(sources).toContain("file:///resized/b.jpg");
  });

  it("entry.photos가 없으면(옛 일기) 사진 표시 영역 없이 기존 텍스트만 렌더된다 (회귀)", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} />);

    expect(screen.queryAllByTestId("diary-photo")).toHaveLength(0);
    expect(screen.getByText(/^사진: /)).toBeTruthy();
  });

  it("사진을 못 불러오면(onError) 그 사진 자리에 '이제 없다' 문구가 뜨고 나머지는 정상 렌더된다 (P6)", async () => {
    await render(<DiaryDetailScreen entry={{ ...entryFor(), photos }} />);

    const images = screen.getAllByTestId("diary-photo");
    expect(images).toHaveLength(2);

    fireEvent(images[0], "onError");

    expect(await screen.findByText(/이 사진은 이제 없다/)).toBeTruthy();
    // 나머지 한 장은 여전히 이미지로 남아 있다.
    expect(screen.getAllByTestId("diary-photo")).toHaveLength(1);
  });
});

/**
 * 017 US3 — 소요 시간 사후 기록 (contracts/elapsed-time.md T5~T9).
 */
describe("017 — 소요 시간 문장 (contracts/elapsed-time.md)", () => {
  it("visionMs·writingMs 둘 다 있으면 두 문장이 모두 렌더된다", async () => {
    await render(
      <DiaryDetailScreen
        entry={{ ...entryFor(), timing: { visionMs: 130_000, writingMs: 5_400 } }}
      />,
    );

    expect(screen.getByText(/사진을.*분석하는 데/)).toBeTruthy();
    expect(screen.getByText(/일기를 작성하는 데/)).toBeTruthy();
  });

  it("visionMs가 없으면(사진 0장) 사진 분석 문장은 없고 글쓰기 문장만 렌더된다 (FR-013)", async () => {
    await render(<DiaryDetailScreen entry={{ ...entryFor(), timing: { writingMs: 5_400 } }} />);

    expect(screen.queryByText(/사진을.*분석하는 데/)).toBeNull();
    expect(screen.getByText(/일기를 작성하는 데/)).toBeTruthy();
  });

  it("timing이 아예 없으면(옛 일기) 소요 시간 문장이 전혀 렌더되지 않는다 (FR-018, 회귀)", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} />);

    expect(screen.queryByText(/작성하는 데/)).toBeNull();
    expect(screen.queryByText(/분석하는 데/)).toBeNull();
  });

  it("문장 어디에도 모델 식별자·비교 표현이 없다 (T8, 원칙 III·헌법 1.2.0)", async () => {
    await render(
      <DiaryDetailScreen
        entry={{ ...entryFor(), timing: { visionMs: 130_000, writingMs: 5_400 } }}
      />,
    );

    for (const leaked of ["gguf", "GGUF", "hyperclovax", "kanana", "지난번", "평균", "보다 빠르", "보다 느리"]) {
      expect(screen.queryByText(new RegExp(leaked))).toBeNull();
    }
  });

  it("1분 미만은 'SS초', 그 이상은 'M분 SS초'로 포맷한다 (T10)", async () => {
    await render(
      <DiaryDetailScreen entry={{ ...entryFor(), timing: { writingMs: 45_000 } }} />,
    );
    expect(screen.getByText(/45초/)).toBeTruthy();
  });

  it("1분 이상은 'M분 SS초'로 포맷한다 (T10)", async () => {
    await render(
      <DiaryDetailScreen entry={{ ...entryFor(), timing: { writingMs: 130_000 } }} />,
    );
    expect(screen.getByText(/2분 10초/)).toBeTruthy();
  });
});

/**
 * ★ 원칙 III·IV — **모델 정보와 지표가 화면에 없다**(S4·S5).
 */
describe("★ 화면에 없어야 하는 것", () => {
  it("모델 식별자·파라미터·양자화·파일 이름이 없다 (SC-019)", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} />);

    for (const leaked of ["gguf", "GGUF", "Q4", "hyperclovax", "kanana", "1.5B", "quiet"]) {
      expect(screen.queryByText(new RegExp(leaked))).toBeNull();
    }
  });

  it("생성 시간·속도·토큰 수가 없다 (SC-020)", async () => {
    await render(<DiaryDetailScreen entry={entryFor()} />);

    for (const metric of ["토큰", "/s", "ms", "걸렸"]) {
      expect(screen.queryByText(new RegExp(metric))).toBeNull();
    }
  });
});

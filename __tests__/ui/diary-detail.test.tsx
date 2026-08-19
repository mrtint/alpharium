/**
 * 일기 상세 화면 테스트.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *
 * ⚠️ `render`는 Promise를 반환한다(AGENTS.md). `toHaveTextContent`는 **정확히 일치**를
 * 보므로 부분 문자열은 정규식으로 준다.
 */

import { render, screen } from "@testing-library/react-native";

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

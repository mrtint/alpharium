/**
 * 일기 목록 화면 테스트.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면 디자인은 검사하지 않는다**(FR-027). 여기서 보는 것은 **무엇이 보이고 무엇이
 * 보이지 않는가**이며, 그것은 헌법 문제이지 미감 문제가 아니다.
 *
 * ⚠️ `@testing-library/react-native` 14의 `render`는 **Promise를 반환한다**(AGENTS.md
 * 실측). `await` 없이 쓰면 `screen`이 비어 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen, userEvent } from "@testing-library/react-native";

import type { DiaryListItem } from "../../src/app/state";
import { DiaryListScreen } from "../../src/ui/DiaryListScreen";

const readable = (day: string): DiaryListItem => ({ day, readable: true });
const unreadable = (day: string): DiaryListItem => ({ day, readable: false });

const noop = () => {};

async function renderList(
  items: DiaryListItem[],
  handlers: { onOpen?: (item: DiaryListItem) => void; onWrite?: () => void } = {},
) {
  await render(
    <DiaryListScreen
      items={items}
      onOpen={handlers.onOpen ?? noop}
      onWrite={handlers.onWrite ?? noop}
    />,
  );
}

describe("빈 상태 (FR-018, S7)", () => {
  it("★ 빈 화면이 아니다 — 무엇을 하면 생기는지 보인다", async () => {
    await renderList([]);

    // 아무것도 없으면 사용자는 앱이 고장난 줄 안다.
    expect(screen.getByText(/아직 일기가 없다/)).toBeTruthy();
    // 버튼은 정확히 일치로 찾는다 — 안내 문구에도 「일기 쓰기」가 들어 있다.
    expect(screen.getByText("일기 쓰기")).toBeTruthy();
  });
});

describe("목록 (FR-017)", () => {
  it("저장된 날짜가 보인다", async () => {
    await renderList([readable("2026-08-16"), readable("2026-08-15")]);

    expect(screen.getByText("2026-08-16")).toBeTruthy();
    expect(screen.getByText("2026-08-15")).toBeTruthy();
  });

  it("항목을 누르면 그 항목이 전달된다", async () => {
    const opened: DiaryListItem[] = [];
    await renderList([readable("2026-08-16")], { onOpen: (item) => opened.push(item) });

    await userEvent.press(screen.getByText("2026-08-16"));

    expect(opened).toEqual([readable("2026-08-16")]);
  });

  it("일기가 있어도 쓰기 자리가 있다", async () => {
    // **읽기와 쓰기는 다른 동작이다**(S1, 원칙 I).
    await renderList([readable("2026-08-16")]);

    expect(screen.getByText("일기 쓰기")).toBeTruthy();
  });

  it("쓰기를 누르면 알려준다", async () => {
    let wrote = 0;
    await renderList([], { onWrite: () => (wrote += 1) });

    await userEvent.press(screen.getByText("일기 쓰기"));

    expect(wrote).toBe(1);
  });
});

/**
 * ★ S3 — **「읽을 수 없다」와 「일기가 없다」가 다르게 보인다**(원칙 V).
 *
 * 004가 값에서 지킨 `unknown` ≠ `none` 구분을 화면에서도 지킨다.
 */
describe("★ 읽을 수 없는 일기 (FR-017a, S3)", () => {
  it("목록에 남아 있다 — 사라지지 않는다", async () => {
    await renderList([unreadable("2026-08-16")]);

    expect(screen.getByText("2026-08-16")).toBeTruthy();
  });

  it("읽을 수 없다는 것이 드러난다", async () => {
    await renderList([unreadable("2026-08-16")]);

    expect(screen.getByText(/읽을 수 없다/)).toBeTruthy();
  });

  it("읽을 수 있는 일기에는 그 표시가 없다", async () => {
    await renderList([readable("2026-08-16")]);

    expect(screen.queryByText(/읽을 수 없다/)).toBeNull();
  });

  it("빈 목록과 구분된다", async () => {
    await renderList([unreadable("2026-08-16")]);

    // 「일기가 없다」로 읽히면 원칙 V가 화면에서 깨진다.
    expect(screen.queryByText(/아직 일기가 없다/)).toBeNull();
  });
});

/**
 * ★ 원칙 III·IV — **모델 정보와 지표가 화면에 없다**(S4·S5).
 */
describe("★ 화면에 없어야 하는 것", () => {
  it("모델 식별자·양자화·파일 이름이 없다 (SC-019)", async () => {
    await renderList([readable("2026-08-16"), unreadable("2026-08-15")]);

    for (const leaked of ["gguf", "GGUF", "Q4", "hyperclovax", "kanana", "1.5B", ".bin"]) {
      expect(screen.queryByText(new RegExp(leaked))).toBeNull();
    }
  });

  it("생성 시간·속도·토큰 수가 없다 (SC-020)", async () => {
    await renderList([readable("2026-08-16")]);

    for (const metric of ["토큰", "초", "/s", "ms"]) {
      expect(screen.queryByText(new RegExp(metric))).toBeNull();
    }
  });
});

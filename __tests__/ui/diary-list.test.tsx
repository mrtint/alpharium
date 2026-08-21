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

import type { DiaryListItem, PhotoHint } from "../../src/app/state";
import { DiaryListScreen } from "../../src/ui/DiaryListScreen";

const readable = (day: string, photos: PhotoHint = { kind: "none" }): DiaryListItem => ({
  day,
  readable: true,
  photos,
});
// **읽지 못하면 사진도 「모른다」다**(원칙 V) — 「없었다」가 아니다.
const unreadable = (day: string): DiaryListItem => ({
  day,
  readable: false,
  photos: { kind: "unknown" },
});

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

/**
 * 007 §5 — 목록의 사진 갈래 (FR-018·018a·019, contracts/screens.md §5).
 */
describe("사진 신호 (007 FR-018·019)", () => {
  it("1. 사진을 본 날은 장수가 보인다", async () => {
    await renderList([readable("2026-08-19", { kind: "known", count: 3 })]);

    expect(screen.getByText("사진 3장")).toBeTruthy();
  });

  it("2. 사진이 없던 날은 「사진 없음」이다", async () => {
    await renderList([readable("2026-08-19", { kind: "none" })]);

    expect(screen.getByText("사진 없음")).toBeTruthy();
  });

  it("3. 모르는 날은 「사진 모름」이다", async () => {
    await renderList([readable("2026-08-19", { kind: "unknown" })]);

    expect(screen.getByText("사진 모름")).toBeTruthy();
  });

  /**
   * ★ 4. **「없음」과 「모름」이 서로 다른 문구다**(원칙 V, SC-008).
   *
   * 같은 말로 뭉개면 004가 값에서 지킨 구분이 화면에서 무너지고, 권한이 없어 모르는
   * 것을 「사진이 없다」로 적게 된다 — **화면이 거짓을 말한다.**
   */
  it("★ 4. 「없음」인 날과 「모름」인 날이 서로 다르게 보인다(SC-008)", async () => {
    await renderList([
      readable("2026-08-19", { kind: "none" }),
      readable("2026-08-18", { kind: "unknown" }),
    ]);

    expect(screen.getByText("사진 없음")).toBeTruthy();
    expect(screen.getByText("사진 모름")).toBeTruthy();
  });

  /** 5. **사진 말고는 보이지 않는다**(FR-018a, SC-008a) */
  it("5. 자리·걸음·배터리·연결이 목록에 없다(FR-018a)", async () => {
    await renderList([readable("2026-08-19", { kind: "known", count: 2 })]);

    const rendered = JSON.stringify(screen.toJSON());
    for (const forbidden of ["걸음", "배터리", "연결", "다닌 자리", "곳"]) {
      expect(rendered).not.toContain(forbidden);
    }
  });

  it("6. 읽을 수 없는 날은 「읽을 수 없다」와 「사진 모름」이 함께 보인다", async () => {
    await renderList([unreadable("2026-08-19")]);

    expect(screen.getByText("읽을 수 없다")).toBeTruthy();
    expect(screen.getByText("사진 모름")).toBeTruthy();
  });

  it("8. 일기 전문이 목록에 보이지 않는다(FR-020)", async () => {
    await renderList([readable("2026-08-19", { kind: "none" })]);

    // 목록은 훑는 자리이지 읽는 자리가 아니다.
    expect(screen.queryByText(/조용한 하루/)).toBeNull();
  });
});

/**
 * 007 §4 — 쓰기 자리 (FR-002a·023·024, contracts/screens.md §4).
 *
 * **셋이 한자리에 모인다** — 전부 「누르면 무슨 일이 일어나는가」에 답하기 때문이다.
 */
describe("쓰기 자리 (007 FR-002a·023·024)", () => {
  const characters = [
    { character: "quiet" as const, ready: true },
    { character: "narrative" as const, ready: true },
  ];

  it("1. 쓰게 될 하루가 보인다(FR-023, SC-009)", async () => {
    await render(
      <DiaryListScreen
        items={[]}
        onOpen={noop}
        onWrite={noop}
        write={{ day: "2026-08-19", overwrites: false }}
      />,
    );

    expect(screen.getByText("2026-08-19를 쓴다")).toBeTruthy();
  });

  it("2. 이미 있으면 덮어쓴다고 누르기 전에 알린다(FR-024, SC-010)", async () => {
    await render(
      <DiaryListScreen
        items={[readable("2026-08-19")]}
        onOpen={noop}
        onWrite={noop}
        write={{ day: "2026-08-19", overwrites: true }}
      />,
    );

    expect(screen.getByText(/덮어쓴다/)).toBeTruthy();
  });

  it("덮어쓰지 않을 때는 그 경고가 없다", async () => {
    await render(
      <DiaryListScreen
        items={[]}
        onOpen={noop}
        onWrite={noop}
        write={{ day: "2026-08-19", overwrites: false }}
      />,
    );

    expect(screen.queryByText(/덮어쓴다/)).toBeNull();
  });

  /**
   * ★ 3. **덮어쓰기 예고가 쓰기를 대신하지 않는다**(FR-025, SC-014, 원칙 I).
   *
   * 「이미 있으니 그것을 보여주자」로 갈리면 저장된 것이 생성을 대신하고, 그 순간
   * 헌법 원칙 I이 깨진다. **`onWrite`는 인자를 받지 않는다.**
   */
  it("★ 3. 이미 있어도 누르면 쓰기가 시작된다(FR-025, SC-014)", async () => {
    let started = 0;
    await render(
      <DiaryListScreen
        items={[readable("2026-08-19")]}
        onOpen={noop}
        onWrite={() => (started += 1)}
        write={{ day: "2026-08-19", overwrites: true }}
      />,
    );

    await userEvent.press(screen.getByText("일기 쓰기"));

    expect(started).toBe(1);
  });

  it("고른 캐릭터가 보이고 바꿀 수 있다(FR-002)", async () => {
    const picked: string[] = [];
    await render(
      <DiaryListScreen
        characters={characters}
        items={[]}
        onOpen={noop}
        onSelectCharacter={(c) => picked.push(c)}
        onWrite={noop}
        selection={{ kind: "selected", character: "quiet" }}
      />,
    );

    await userEvent.press(screen.getByRole("button", { name: /narrative/ }));

    expect(picked).toEqual(["narrative"]);
  });

  it("★ 옮겨졌으면 그 사실을 알린다(FR-005a, SC-003a)", async () => {
    await render(
      <DiaryListScreen
        characters={characters}
        items={[]}
        onOpen={noop}
        onWrite={noop}
        selection={{ kind: "selected", character: "narrative", movedFrom: "quiet" }}
      />,
    );

    // **말없이 바뀌지 않는다** — 캐릭터마다 글의 성격이 다르다.
    expect(screen.getByText(/quiet.*쓸 수 없어.*narrative/)).toBeTruthy();
  });

  it("옮기지 않았으면 알림이 없다", async () => {
    await render(
      <DiaryListScreen
        characters={characters}
        items={[]}
        onOpen={noop}
        onWrite={noop}
        selection={{ kind: "selected", character: "quiet" }}
      />,
    );

    expect(screen.queryByText(/쓸 수 없어/)).toBeNull();
  });
});

/**
 * 054 — 제자리 쓰기: `DiaryHomeScreen` 조립.
 *
 * 계약: specs/054-in-place-writing/contracts/writing-in-place.md W1·W12~W16 (조립 수준), SC-001·SC-002, FR-012
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 쓰는 동안 홈을 떠나지 않는다 — 별도 전체 화면이 아니라 같은 홈이 「쓰는 중」 모드가 된다. 그동안 목록을
 * 다시 읽지 않고, 새 파일이 생기지 않으며, 스트립·헤더 날짜를 눌러도 고른 날이 바뀌지 않는다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen, userEvent } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

/** 2026-09-28(월) 16:15 */
const NOW = () => new Date("2026-09-28T16:15:00");

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

function hangingPipeline(): Pipeline & { finish: (result: PipelineResult) => void } {
  let release: (result: PipelineResult) => void = () => {};
  return {
    run: () =>
      new Promise<PipelineResult>((resolve) => {
        release = resolve;
      }),
    finish: (result) => release(result),
  };
}

async function renderHome(pipeline: Pipeline) {
  const store = memoryStore();
  const listDays = jest.spyOn(store, "listDays");
  const save = jest.spyOn(store, "save");
  await render(
    <DiaryHomeScreen
      now={NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={store}
    />,
  );
  return { store, listDays, save };
}

async function startWriting() {
  await userEvent.press(await screen.findByTestId("write-button"));
  await screen.findByTestId("stop-button");
}

describe("SC-001 — 홈을 떠나지 않는다", () => {
  it("쓰기를 시작해도 같은 트리에 헤더·스트립이 있고 「쓰는 중」이다", async () => {
    await renderHome(hangingPipeline());
    expect(await screen.findByTestId("material-paper")).toBeTruthy();

    await startWriting();

    expect(screen.getByTestId("home-day-state")).toHaveTextContent("쓰는 중");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("28");
    expect(screen.getByTestId("day-strip", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("writing-paper")).toBeTruthy();
    expect(screen.queryByTestId("material-paper")).toBeNull();
    expect(screen.queryByTestId("write-button")).toBeNull();
  });

  it("안내 줄에 지금 캐릭터의 이름이 들어간다", async () => {
    await renderHome(hangingPipeline());
    await startWriting();
    // 기본 이름(`personaOf`) — 「금동이」
    expect(screen.getByTestId("writing-byline")).toHaveTextContent(
      /^금동이가 쓰고 있어요\. 진행률은 세지 않아요\.$/,
    );
  });
});

describe("SC-002 — 쓰는 동안 고른 날이 바뀌지 않는다", () => {
  it("스트립 칸·헤더 날짜를 눌러도 아무 일도 없다", async () => {
    await renderHome(hangingPipeline());
    await startWriting();

    const cell = screen.getByTestId("day-2026-09-27", { includeHiddenElements: true });
    await userEvent.press(cell);

    expect(screen.getByTestId("home-day-number")).toHaveTextContent("28");
    expect(screen.queryByTestId("home-date-button")).toBeNull();
    expect(screen.queryByText("날짜로 이동")).toBeNull();
  });
});

describe("FR-012 — 쓰는 중 상태는 파일에 남지 않고 목록을 다시 읽지도 않는다", () => {
  it("쓰는 동안 저장소를 새로 읽거나 쓰지 않는다", async () => {
    const { listDays, save } = await renderHome(hangingPipeline());
    await screen.findByTestId("material-paper");
    const readsBefore = listDays.mock.calls.length;

    await startWriting();

    expect(listDays.mock.calls.length).toBe(readsBefore);
    expect(save).not.toHaveBeenCalled();
  });
});

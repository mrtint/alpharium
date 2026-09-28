/**
 * 050 — 덮어쓰기 확인 대화상자 (보드 `2d`).
 *
 * 계약: specs/050-dialog-foundation/contracts/dialogs.md OW1~OW7·OW9·OW10
 *       (012 contracts/overwrite-confirm.md의 X1~X3를 계승)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 012는 이미 있는 하루를 다시 쓰려 하면 **전체 화면**으로 확인했다. 050은 그것을 **홈 위의 확인 대화상자**로
 * 바꾼다 — 홈(헤더·스트립)이 덮개 뒤에 그대로 있고, 덮개를 눌러도 닫히지 않으며, 뒤로 가기·「취소」는 홈을
 * 그대로 둔다. 쓰는 중·그만두기·실패 화면은 바꾸지 않는다(Clarifications Q1).
 *
 * `AppState`·`BackHandler` 스파이는 되돌리지 않는다(diary-home.test와 같다 — 되돌리면 이후 구독 반환값이
 * `undefined`가 된다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { AppState, BackHandler } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { partiallyUnknownDay } from "../../src/signals/fake";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { reachPaperEnd } from "./paper-end";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const NOW = new Date("2026-09-28T09:00:00"); // 월요일
const TODAY = "2026-09-28";
const PAST = "2026-09-20";

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

const entryFor = (day: string): DiaryEntry => ({
  date: day,
  text: "주인은 조용했다.",
  character: "quiet",
  signalsUsed: partiallyUnknownDay(day),
  createdAt: new Date(`${day}T20:00:00`),
});

/** 부를 때까지 끝나지 않는 파이프라인 — 몇 번 불렸는지 센다 */
function countingPipeline(): Pipeline & { calls: number } {
  const pipeline = {
    calls: 0,
    run: () => {
      pipeline.calls += 1;
      return new Promise<PipelineResult>(() => {});
    },
  };
  return pipeline;
}

type Listener = (...args: never[]) => unknown;

function captureListeners() {
  const back: Listener[] = [];
  const appState: Listener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    if (event === "hardwareBackPress") back.push(handler as Listener);
    return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
  });
  jest.spyOn(AppState, "addEventListener").mockImplementation((event, handler) => {
    if (event === "change") appState.push(handler as Listener);
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
  return { back, appState };
}

async function renderHome(chosenDay: string) {
  const listeners = captureListeners();
  const store = memoryStore();
  await store.save(entryFor(TODAY));
  await store.save(entryFor(PAST));
  const pipeline = countingPipeline();
  await renderWithPortal(
    <DiaryHomeScreen
      chosenDay={chosenDay}
      now={() => NOW}
      onChooseDay={() => {}}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={store}
    />,
  );
  // 051 수정 — 쓴 날의 「다시 쓰기」 바는 지면 끝에 닿아야 올라온다(보드 `2c` ④).
  await reachPaperEnd();
  await screen.findByTestId("write-button");
  return { pipeline, listeners, store };
}

async function openDialog() {
  await fireEvent.press(screen.getByTestId("write-button"));
  await screen.findByTestId("overwrite-dialog");
}

describe("OW1~OW5 — 홈 위의 확인 대화상자", () => {
  it("★ OW1 — 일기가 있는 날에서 쓰기 버튼(051 「다시 쓰기」) → 홈이 남은 채 대화상자, 생성은 아직 0회", async () => {
    const { pipeline } = await renderHome(PAST);
    await openDialog();

    expect(screen.getByTestId("home-day-number")).toBeTruthy();
    expect(screen.getByText("일기를 다시 쓸까요?")).toBeTruthy();
    expect(screen.getByText("다 쓰면 지금 일기가 새 글로 바뀌어요.")).toBeTruthy();
    // 051 — 쓴 날의 하단 바도 「다시 쓰기」다. 대화상자의 버튼은 대화상자 안에서 찾는다.
    expect(within(screen.getByTestId("overwrite-confirm")).getByText("다시 쓰기")).toBeTruthy();
    expect(screen.getByText("취소")).toBeTruthy();
    expect(pipeline.calls).toBe(0);
  });

  it("★ OW2 — 「취소」 → 대화상자가 사라지고 고른 날 그대로, 생성 0회", async () => {
    const { pipeline } = await renderHome(PAST);
    await openDialog();

    await fireEvent.press(screen.getByTestId("overwrite-cancel"));
    await waitFor(() => expect(screen.queryByTestId("overwrite-dialog")).toBeNull());
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("20");
    expect(pipeline.calls).toBe(0);
  });

  it("★ OW3 — 뒤로 가기 → 취소와 같다", async () => {
    const { pipeline, listeners } = await renderHome(PAST);
    await openDialog();

    await act(async () => {
      for (const handler of [...listeners.back].reverse()) {
        if ((handler as () => boolean)() === true) break;
      }
    });
    await waitFor(() => expect(screen.queryByTestId("overwrite-dialog")).toBeNull());
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("20");
    expect(pipeline.calls).toBe(0);
  });

  it("★ OW4 — 덮개를 눌러도 닫히지 않는다", async () => {
    const { pipeline } = await renderHome(PAST);
    await openDialog();

    await fireEvent.press(screen.getByTestId("overwrite-dialog-overlay"));
    expect(screen.getByTestId("overwrite-dialog")).toBeTruthy();
    expect(pipeline.calls).toBe(0);
  });

  it("★ OW5 — 「다시 쓰기」 → 대화상자가 닫히고 생성 1회", async () => {
    const { pipeline } = await renderHome(PAST);
    await openDialog();

    await fireEvent.press(screen.getByTestId("overwrite-confirm"));
    await waitFor(() => expect(pipeline.calls).toBe(1));
    expect(screen.queryByTestId("overwrite-dialog")).toBeNull();
  });
});

describe("★ OW6 — 오늘을 다시 쓸 때만 안내 한 줄 (Clarifications Q5)", () => {
  it("오늘 → 「지금까지의 하루로 써요.」", async () => {
    await renderHome(TODAY);
    await openDialog();
    expect(screen.getByTestId("overwrite-today-note")).toHaveTextContent("지금까지의 하루로 써요.");
  });

  it("지난 날 → 안내 없음", async () => {
    await renderHome(PAST);
    await openDialog();
    expect(screen.queryByTestId("overwrite-today-note")).toBeNull();
  });
});

describe("★ OW10 — 대화상자가 뜬 채 앱이 백그라운드로 갔다 와도 그대로다", () => {
  it("background → active 뒤에도 대화상자와 고른 날이 남는다", async () => {
    const { listeners } = await renderHome(PAST);
    await openDialog();

    await act(async () => {
      for (const handler of listeners.appState) (handler as (s: string) => void)("background");
      for (const handler of listeners.appState) (handler as (s: string) => void)("active");
    });
    expect(screen.getByTestId("overwrite-dialog")).toBeTruthy();
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("20");
  });
});

describe("OW7·OW9 — 소스 계약", () => {
  const root = join(__dirname, "..", "..");
  const code = (file: string) =>
    readFileSync(join(root, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it("★ OW7 — 대화상자에 일기 본문·진행률·모델 식별자가 들어올 자리가 없다 (012 X1~X3)", () => {
    const source = code("src/ui/OverwriteConfirmDialog.tsx");
    for (const forbidden of ["DiaryEntry", "entry", "%", "progress", "elapsed", "gguf", "kanana"]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it("★ OW9 — 전체 화면 덮어쓰기 확인이 없다", () => {
    expect(existsSync(join(root, "src/ui/OverwriteConfirmScreen.tsx"))).toBe(false);
  });
});

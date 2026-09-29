/**
 * 053 US3 — 재료가 없으면 「상상해서 적어요」를 한 번 더 확인한다
 * (contracts/material.md DLG1~DLG4·DLG6~DLG9, FR-012).
 *
 * **판정은 「셀 수 있는 항목 중 재료가 있는가」 하나다**(`decideMaterial`) — 이 파일은 그 판정이 화면의
 * 「일기 쓰기」에 배선됐는가만 본다(조건표 자체는 material.test.ts DEC1~12). 권한이 없어도 쓸 수 있다(확인만
 * 거친다, FR-012).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { DayPreview } from "../../src/app/state";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { reachPaperEnd } from "./paper-end";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-24T13:00:00");
const DAY = "2026-09-24";

const resolveQuiet = jest.fn((day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
}));

function countingPipeline(): Pipeline & { calls: number } {
  const self = {
    calls: 0,
    run: () => {
      self.calls += 1;
      return new Promise<PipelineResult>(() => {});
    },
  };
  return self;
}

const preview = (
  photos: DayPreview["photos"],
  places: DayPreview["places"],
  photoAccess: DayPreview["photoAccess"] = "ok",
): DayPreview => ({ day: DAY, photos, places, photoAccess });

const WITH_MATERIAL = preview({ kind: "known", count: 3 }, { kind: "known", count: 2 });
const ZERO = preview({ kind: "none" }, { kind: "none" });
const UNSEEN = preview({ kind: "unknown" }, { kind: "unknown" }, "denied");

beforeEach(() => {
  resolveQuiet.mockClear();
  jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation(
      () => ({ remove: () => {} }) as ReturnType<typeof BackHandler.addEventListener>,
    );
});

async function renderHome(opts: {
  pipeline: Pipeline;
  previewDay?: jest.Mock;
  store?: ReturnType<typeof memoryStore>;
  photoAccessPort?: { request: jest.Mock; openSettings: jest.Mock };
}) {
  await renderWithPortal(
    <DiaryHomeScreen
      now={() => NOW}
      photoAccessPort={opts.photoAccessPort}
      pipeline={opts.pipeline}
      previewDay={opts.previewDay}
      resolution={resolved}
      resolve={resolveQuiet}
      store={opts.store ?? memoryStore()}
    />,
  );
  await screen.findByTestId("day-strip");
}

describe("053 DLG — 쓰기 전 확인", () => {
  it("DLG1 — 재료가 있으면 확인 없이 바로 쓴다", async () => {
    const pipeline = countingPipeline();
    await renderHome({ pipeline, previewDay: jest.fn(async () => WITH_MATERIAL) });
    await waitFor(() => expect(screen.getByTestId("signal-photos")).toHaveTextContent("3장"));

    await fireEvent.press(screen.getByTestId("write-button"));

    await waitFor(() => expect(pipeline.calls).toBe(1));
    expect(screen.queryByTestId("material-confirm")).toBeNull();
  });

  it("DLG2 — 관측된 0뿐이면 바로 쓰지 않고 확인 대화상자(「아무 기록도 없어요」)", async () => {
    const pipeline = countingPipeline();
    await renderHome({ pipeline, previewDay: jest.fn(async () => ZERO) });
    await waitFor(() => expect(screen.getByTestId("signal-photos")).toHaveTextContent("0장"));

    await fireEvent.press(screen.getByTestId("write-button"));

    expect(await screen.findByTestId("material-confirm")).toBeTruthy();
    expect(screen.getByText("😢 아무 기록도 없어요")).toBeTruthy();
    expect(screen.getByText("이렇게 작성하면 하루를 상상해서 적어요.")).toBeTruthy();
    expect(pipeline.calls).toBe(0);
  });

  it("DLG3 — 전부 권한 없음이면 제목이 「기록을 볼 수 없어요」다 (설명은 같다)", async () => {
    const pipeline = countingPipeline();
    await renderHome({ pipeline, previewDay: jest.fn(async () => UNSEEN) });
    await screen.findByTestId("signal-photos-permission");

    await fireEvent.press(screen.getByTestId("write-button"));

    expect(await screen.findByTestId("material-confirm")).toBeTruthy();
    expect(screen.getByText("😢 기록을 볼 수 없어요")).toBeTruthy();
    expect(screen.queryByText("😢 아무 기록도 없어요")).toBeNull();
    expect(screen.getByText("이렇게 작성하면 하루를 상상해서 적어요.")).toBeTruthy();
    expect(pipeline.calls).toBe(0);
  });

  it("DLG4·FR-012 — 「확인」이면 쓴다 (권한 요청 통로 0회)", async () => {
    const pipeline = countingPipeline();
    const photoAccessPort = { request: jest.fn(async () => "granted"), openSettings: jest.fn() };
    await renderHome({ pipeline, previewDay: jest.fn(async () => UNSEEN), photoAccessPort });
    await screen.findByTestId("signal-photos-permission");
    await fireEvent.press(screen.getByTestId("write-button"));
    await screen.findByTestId("material-confirm");

    await fireEvent.press(screen.getByTestId("material-confirm-yes"));

    await waitFor(() => expect(pipeline.calls).toBe(1));
    expect(photoAccessPort.request).not.toHaveBeenCalled();
    expect(screen.queryByTestId("material-confirm")).toBeNull();
  });

  it("DLG4 — 「취소」면 닫고 쓰지 않는다. 덮개 누름으로는 안 닫힌다", async () => {
    const pipeline = countingPipeline();
    await renderHome({ pipeline, previewDay: jest.fn(async () => ZERO) });
    await waitFor(() => expect(screen.getByTestId("signal-photos")).toHaveTextContent("0장"));
    await fireEvent.press(screen.getByTestId("write-button"));
    await screen.findByTestId("material-confirm");

    await fireEvent.press(screen.getByTestId("material-confirm-overlay"));
    expect(screen.getByTestId("material-confirm")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("material-confirm-no"));
    await waitFor(() => expect(screen.queryByTestId("material-confirm")).toBeNull());
    expect(pipeline.calls).toBe(0);
    // 화면은 그대로다 — 다시 누르면 다시 묻는다.
    await fireEvent.press(screen.getByTestId("write-button"));
    expect(await screen.findByTestId("material-confirm")).toBeTruthy();
  });

  it("DLG6 — 미리보기가 아직 안 왔으면 누른 순간 신호를 읽어 판정한다 (재료 없음으로 취급하지 않는다)", async () => {
    const pipeline = countingPipeline();
    const resolvers: ((p: DayPreview) => void)[] = [];
    const previewDay = jest.fn(
      () =>
        new Promise<DayPreview>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    await renderHome({ pipeline, previewDay });
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("…");

    await fireEvent.press(screen.getByTestId("write-button"));
    // 읽기가 끝나기 전에는 쓰지도, 묻지도 않는다.
    expect(pipeline.calls).toBe(0);
    expect(screen.queryByTestId("material-confirm")).toBeNull();

    await act(async () => {
      for (const resolve of resolvers) resolve(WITH_MATERIAL);
    });

    await waitFor(() => expect(pipeline.calls).toBe(1));
    expect(screen.queryByTestId("material-confirm")).toBeNull();
  });

  it("DLG7 — 미리보기 통로가 없으면 판정 없이 바로 쓴다", async () => {
    const pipeline = countingPipeline();
    await renderHome({ pipeline });

    await fireEvent.press(screen.getByTestId("write-button"));

    await waitFor(() => expect(pipeline.calls).toBe(1));
    expect(screen.queryByTestId("material-confirm")).toBeNull();
  });

  it("DLG9 — 「확인」으로 쓸 때 캐릭터·날은 누른 순간 resolve가 정한 그대로다", async () => {
    const pipeline = countingPipeline();
    const runSpy = jest.spyOn(pipeline, "run");
    await renderHome({ pipeline, previewDay: jest.fn(async () => ZERO) });
    await waitFor(() => expect(screen.getByTestId("signal-photos")).toHaveTextContent("0장"));
    await fireEvent.press(screen.getByTestId("write-button"));
    await screen.findByTestId("material-confirm");
    // 그 밖의 자리(미리 준비)도 resolve를 부르므로 절대 횟수가 아니라 「확인 전후로 늘지 않음」을 본다.
    const resolvedByPress = resolveQuiet.mock.calls.length;

    await fireEvent.press(screen.getByTestId("material-confirm-yes"));

    await waitFor(() => expect(runSpy).toHaveBeenCalledTimes(1));
    expect(runSpy.mock.calls[0]?.[0]).toMatchObject({ day: DAY, character: "quiet" });
    // 확인 뒤에 resolve를 다시 부르지 않는다.
    expect(resolveQuiet).toHaveBeenCalledTimes(resolvedByPress);
  });
});

describe("053 DLG8 — 다시 쓰기는 재료 판정을 거치지 않는다", () => {
  const signals: DaySignals = {
    date: DAY,
    photos: { kind: "none" },
    places: { kind: "none" },
    steps: { kind: "unknown", reason: "-" },
    battery: { kind: "unknown", reason: "-" },
    connectivity: { kind: "unknown", reason: "-" },
  };
  const entry: DiaryEntry = {
    date: DAY,
    title: "제목",
    text: "본문이다.",
    character: "quiet",
    signalsUsed: signals,
    createdAt: new Date(`${DAY}T12:00:00`),
  };

  it("쓴 날의 「다시 쓰기」는 050 덮어쓰기 확인만 뜬다 (재료 확인이 아니다)", async () => {
    const store = memoryStore();
    await store.save(entry);
    const pipeline = countingPipeline();
    await renderHome({ pipeline, store, previewDay: jest.fn(async () => ZERO) });
    await reachPaperEnd();

    await fireEvent.press(screen.getByTestId("write-button"));

    expect(await screen.findByTestId("overwrite-dialog")).toBeTruthy();
    expect(screen.queryByTestId("material-confirm")).toBeNull();
    expect(pipeline.calls).toBe(0);
  });
});

/**
 * 054 — 제자리 쓰기: 실패하면 쓰기 전 상태의 홈으로 돌아가 토스트 한 줄로 알린다 (US3).
 *
 * 계약: specs/054-in-place-writing/contracts/writing-in-place.md W15, contracts/failure-toast.md T5·T6·T12·T13
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **결과 전체 화면이 없다** — 실패도, 글은 나왔으나 저장하지 못한 경우도(글은 버려진다) 홈으로 돌아와 갈래
 * 문구 한 줄이 뜬다. 이유·모델·오류 코드는 어디에도 보이지 않고, 다시 써도 풀리지 않는 실패에는 「다시 써 볼 수
 * 있어요」라고 하지 않는다(SC-005·SC-006).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { screen, userEvent, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { TOAST_TEXT, type ToastKind } from "../../src/app/failure-toast";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T16:15:00");
const TODAY = "2026-09-28";

const signals: DaySignals = {
  date: TODAY,
  photos: { kind: "none" },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "안드로이드가 기간 걸음 수를 주지 않는다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
};

const generated: DiaryEntry = {
  date: TODAY,
  title: "버려질 제목",
  text: "버려질 본문이다.",
  character: "quiet",
  signalsUsed: signals,
  createdAt: new Date("2026-09-28T16:15:00"),
};

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

const resolveNoReady = (): ResolveOutcome => ({ kind: "no-ready-character" });

/** 부른 순서대로 결과를 준다. 다 쓰면 끝나지 않는다 */
function scriptedPipeline(...results: PipelineResult[]): Pipeline {
  let call = 0;
  return {
    run: () =>
      call < results.length
        ? Promise.resolve(results[call++])
        : new Promise<PipelineResult>(() => {}),
  };
}

async function renderHome(pipeline: Pipeline, resolve = resolveQuiet) {
  const store = memoryStore();
  await renderWithPortal(
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolve}
      store={store}
    />,
  );
  return store;
}

const press = async () => userEvent.press(await screen.findByTestId("write-button"));

const CASES: readonly (readonly [ToastKind, PipelineResult])[] = [
  ["retry", { ok: false, stage: "generation", reason: "rejected: echo" }],
  ["prepare-character", { ok: false, stage: "model-not-ready", reason: "kanana 없음" }],
  ["prepare-vision", { ok: false, stage: "generation", reason: "vision-failed: not-ready" }],
  ["plain", { ok: false, stage: "generation", reason: "backend-unavailable: OOM" }],
  ["save", { ok: false, stage: "storage", reason: "저장 공간이 없다", entry: generated }],
];

describe("W15 — 실패는 쓰기 전 상태의 홈 + 토스트", () => {
  it("★ 갈래를 전부 나열한다(수를 직접 센다)", () => {
    expect(CASES).toHaveLength(5);
  });

  it.each(CASES)("%s — 홈으로 돌아오고 그 갈래의 문구가 뜬다", async (kind, result) => {
    await renderHome(scriptedPipeline(result));
    await press();

    const toast = await screen.findByTestId("failure-toast");
    expect(toast).toHaveTextContent(TOAST_TEXT[kind]);

    // 쓰기 전 상태 그대로다 — 결과 전체 화면이 없다.
    expect(screen.getByTestId("write-button")).toBeTruthy();
    expect(screen.getByTestId("material-paper")).toBeTruthy();
    expect(screen.queryByTestId("stop-button")).toBeNull();
    expect(screen.queryByTestId("unsaved-screen")).toBeNull();
    expect(screen.queryByText("← 일기")).toBeNull();
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("28");
  });

  it("★ SC-005 — 이유·모델·오류 코드가 화면 어디에도 없다", async () => {
    await renderHome(
      scriptedPipeline({ ok: false, stage: "generation", reason: "model-load-failed: kanana OOM" }),
    );
    await press();
    await screen.findByTestId("failure-toast");

    const rendered = JSON.stringify(screen.toJSON());
    for (const leak of ["kanana", "OOM", "model-load-failed", "rejected", "generation"]) {
      expect(rendered).not.toContain(leak);
    }
  });

  it("★ 저장 실패의 글은 화면 어디에도 보이지 않는다 (clarify Q3 — 버린다)", async () => {
    await renderHome(
      scriptedPipeline({
        ok: false,
        stage: "storage",
        reason: "저장 공간이 없다",
        entry: generated,
      }),
    );
    await press();
    await screen.findByTestId("failure-toast");

    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toContain("버려질 본문");
    expect(rendered).not.toContain("버려질 제목");
  });
});

describe("T5·SC-006 — 거짓 안내 금지", () => {
  it.each(CASES.filter(([kind]) => kind !== "retry"))(
    "%s — 화면 어디에도 「다시 써 볼 수 있어요」가 없다",
    async (_kind, result) => {
      await renderHome(scriptedPipeline(result));
      await press();
      await screen.findByTestId("failure-toast");

      expect(JSON.stringify(screen.toJSON())).not.toContain("다시 써 볼 수 있어요");
    },
  );
});

describe("T12 — 교체·정리", () => {
  it("토스트가 뜬 채 새로 쓰기를 시작하면 즉시 사라진다", async () => {
    await renderHome(
      scriptedPipeline({ ok: false, stage: "generation", reason: "rejected: echo" }),
    );
    await press();
    await screen.findByTestId("failure-toast");

    await press(); // 두 번째 호출은 끝나지 않는다 — 쓰는 중
    await screen.findByTestId("stop-button");

    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });

  it("같은 갈래가 연달아 나도 두 번째 토스트가 다시 뜬다", async () => {
    const retry: PipelineResult = { ok: false, stage: "generation", reason: "rejected: echo" };
    await renderHome(scriptedPipeline(retry, retry));

    await press();
    const first = await screen.findByTestId("failure-toast");

    await press();
    await waitFor(() => expect(screen.getByTestId("failure-toast")).toBeTruthy());
    // 사라졌다가 새로 마운트된 토스트다 — 같은 노드가 아니다.
    expect(screen.getByTestId("failure-toast")).not.toBe(first);
  });

  it("날을 바꾸면 토스트가 사라진다 — 새 날에 잘못 붙어 남지 않는다", async () => {
    await renderHome(
      scriptedPipeline({ ok: false, stage: "generation", reason: "rejected: echo" }),
    );
    await press();
    await screen.findByTestId("failure-toast");

    await userEvent.press(await screen.findByTestId("day-2026-09-27"));

    await waitFor(() => expect(screen.queryByTestId("failure-toast")).toBeNull());
  });
});

describe("T13 — 그만두기 뒤에는 토스트가 없다", () => {
  it("스스로 그만두면 토스트가 뜨지 않는다", async () => {
    await renderHome({ run: () => new Promise<PipelineResult>(() => {}) });
    await press();
    await userEvent.press(await screen.findByTestId("stop-button"));
    await screen.findByTestId("material-paper");

    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });
});

describe("FR-024 — 쓰기 시작 전 no-ready-character는 그대로다", () => {
  /*
   * 055 FR-030 — 실패 화면의 길이 「설정에서 작성자 준비하기」에서 「모듈 다시 받기」(첫 실행 다운로드 화면)로 바뀌었다.
   * 설정에 캐릭터 준비가 사라졌기 때문이다(S5). 쓰는 중에 들어가지 않고 토스트가 없다는 054 계약은 그대로다.
   */
  it("쓰는 중에 들어가지 않고 토스트 없이 기존 실패 화면(「모듈 다시 받기」)이다", async () => {
    const onRedownload = jest.fn(async () => false);
    const store = memoryStore();
    await renderWithPortal(
      <DiaryHomeScreen
        now={() => NOW}
        onRedownload={onRedownload}
        pipeline={scriptedPipeline()}
        resolution={resolved}
        resolve={resolveNoReady}
        store={store}
      />,
    );
    await press();

    expect(await screen.findByText("모듈 다시 받기")).toBeTruthy();
    expect(screen.queryByText(/설정에서 작성자 준비하기/)).toBeNull();
    expect(screen.queryByTestId("stop-button")).toBeNull();
    expect(screen.queryByTestId("failure-toast")).toBeNull();

    // ★ D2 — 누르면 onRedownload. 준비가 안 됐으면(false) 안내 화면에 남는다 — 조립부가 다운로드 화면으로 바꿔 끼운다.
    await userEvent.press(screen.getByTestId("redownload-button"));
    expect(onRedownload).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("redownload-button")).toBeTruthy();
  });

  it("★ D2 — 이미 준비돼 있으면(true) 쓰기 전 홈으로 돌아온다", async () => {
    const onRedownload = jest.fn(async () => true);
    await renderWithPortal(
      <DiaryHomeScreen
        now={() => NOW}
        onRedownload={onRedownload}
        pipeline={scriptedPipeline()}
        resolution={resolved}
        resolve={resolveNoReady}
        store={memoryStore()}
      />,
    );
    await press();
    await userEvent.press(await screen.findByTestId("redownload-button"));
    expect(await screen.findByTestId("home-settings")).toBeTruthy();
    expect(screen.queryByTestId("redownload-button")).toBeNull();
  });
});

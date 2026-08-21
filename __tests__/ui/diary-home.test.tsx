/**
 * 일기 홈 화면 — 쓰는 중과 그만두기.
 *
 * 계약: specs/007-diary-ui-refinement/contracts/screens.md §1·§2·§3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **여기가 원칙 IV와 원칙 I이 화면에서 시험받는 자리다.**
 *
 * 30초를 견디게 하려면 진행률을 넣고 싶어지고(원칙 IV), 그만둔 글을 보여주고
 * 싶어진다(원칙 I). 둘 다 **자리를 만들지 않는 것**으로 막는다.
 *
 * ⚠️ `@testing-library/react-native` 14의 `render`는 **Promise를 반환한다**(AGENTS.md).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import type { SelectionState } from "../../src/app/selection";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";

/**
 * **CI에서 기본 5초로는 모자란다**(2026-08-21, PR #13 실패로 확인).
 *
 * 이 파일은 화면을 실제로 그리고 `AppState`·`BackHandler` 구독까지 붙이므로 한
 * 테스트가 무겁다. 로컬(16코어)에서는 12개가 4.3초에 끝나지만 **CI는 `--maxWorkers=2`**라
 * 첫 `render()`가 5초를 넘긴다 — 006이 `--maxWorkers=50%`로 겪은 것과 같은 성질이며
 * **코드 결함이 아니라 워커 경합**이다(AGENTS.md).
 */
jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

// **`unknown`에는 까닭이 붙는다** — 왜 모르는지가 값에 남아야 프롬프트가 그것을 옮긴다.
const unknownSignals: DaySignals = {
  date: "2026-08-19",
  photos: { kind: "unknown", reason: "권한이 없다" },
  places: { kind: "unknown", reason: "위치 권한이 없다" },
  steps: { kind: "unknown", reason: "안드로이드가 기간 걸음 수를 주지 않는다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
};

const entry: DiaryEntry = {
  date: "2026-08-19",
  text: "조용한 하루였다.",
  character: "quiet",
  signalsUsed: unknownSignals,
  createdAt: new Date("2026-08-20T05:00:00Z"),
};

const selected: SelectionState = { kind: "selected", character: "quiet" };

/** 부를 때까지 끝나지 않는 파이프라인. 「쓰는 중」을 붙잡아 둔다 */
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

async function renderHome(
  options: {
    pipeline?: Pipeline;
    stop?: () => Promise<void>;
    selection?: SelectionState;
  } = {},
) {
  const store = memoryStore();
  await render(
    <DiaryHomeScreen
      pipeline={options.pipeline}
      resolution={resolved}
      selection={options.selection ?? selected}
      stop={options.stop}
      store={store}
    />,
  );
  return store;
}

/** 「일기 쓰기」를 눌러 쓰는 중으로 간다 */
async function startWriting(pipeline: Pipeline, stop?: () => Promise<void>) {
  await renderHome({ pipeline, stop });
  await userEvent.press(await screen.findByText("일기 쓰기"));
  await screen.findByText("쓰고 있다");
}

describe("쓰는 중 화면 (007 contracts/screens.md §1)", () => {
  it("1. 회전 표시와 「쓰고 있다」가 보인다(FR-010)", async () => {
    await startWriting(hangingPipeline());

    // 회전 표시는 접근성 이름으로 찾는다 — 스타일에 묶이지 않는다.
    expect(screen.getByLabelText("쓰고 있다")).toBeTruthy();
    expect(screen.getByText("쓰고 있다")).toBeTruthy();
  });

  it("2. 「그만두기」를 누를 수 있다(FR-013)", async () => {
    await startWriting(hangingPipeline());

    expect(screen.getByText("그만두기")).toBeTruthy();
  });

  /**
   * ★ 3. **진행률·시간·토큰·단계 이름이 0건이다**(FR-011·010b, SC-012).
   *
   * 「하루를 살펴보는 중」 같은 단계 표시는 clarify에서 **명시적으로 거부됐다** —
   * 진행 정보를 화면 상태에 담게 되기 때문이다.
   */
  it("3. 숫자·경과 시간·단계 이름이 화면에 없다(FR-011·010b, SC-012)", async () => {
    await startWriting(hangingPipeline());

    const rendered = JSON.stringify(screen.toJSON());
    for (const forbidden of [
      "%",
      "초",
      "토큰",
      "남은",
      "경과",
      "살펴보는",
      "깨우는",
      "단계",
      "신호",
      "저장 중",
    ]) {
      expect(rendered).not.toContain(forbidden);
    }
    // 숫자가 아예 없다 — 진행률이든 초든 담을 자리가 없다.
    expect(rendered).not.toMatch(/\d+\s*(%|초|\/)/);
  });

  it("생성 중인 글이 보이지 않는다(FR-012, SC-013, 원칙 I)", async () => {
    await startWriting(hangingPipeline());

    expect(screen.queryByText(/조용한 하루/)).toBeNull();
  });
});

describe("그만두기 (007 contracts/screens.md §2)", () => {
  it("1·2. stop()이 불리고 목록으로 간다(FR-013·015)", async () => {
    let stopped = false;
    const stop = async () => {
      stopped = true;
    };

    await startWriting(hangingPipeline(), stop);
    await userEvent.press(screen.getByText("그만두기"));

    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
    expect(stopped).toBe(true);
  });

  /**
   * ★ 3. **부분 결과가 화면에 오르지 않는다**(FR-014a, SC-006a).
   *
   * `stopCompletion()`은 생성을 거부시키지 않고 **거기까지 만들어진 글이 담긴 결과로
   * 정상 resolve된다**(2026-08-17 실측). 그래서 「끊었으니 글이 없다」가 성립하지
   * 않으며, 화면이 **명시적으로 버려야** 한다.
   */
  it("★ 3. 그만둔 뒤 늦게 도착한 결과를 화면에 올리지 않는다(FR-014a, SC-006a)", async () => {
    const pipeline = hangingPipeline();
    await startWriting(pipeline, async () => {});

    await userEvent.press(screen.getByText("그만두기"));
    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());

    // **끊긴 생성이 글을 담아 돌아온다.** 판정을 통과하지 않은 글이다.
    await act(async () => {
      pipeline.finish({ ok: true, entry, overwrote: false });
    });

    // 목록에 그대로 있고 그 글은 어디에도 없다.
    expect(screen.getByText("일기 쓰기")).toBeTruthy();
    expect(screen.queryByText(/조용한 하루/)).toBeNull();
  });

  it("4. 그만둔 하루가 목록에 생기지 않는다(FR-014, SC-006)", async () => {
    const pipeline = hangingPipeline();
    const store = await renderHome({ pipeline, stop: async () => {} });

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await screen.findByText("쓰고 있다");
    await userEvent.press(screen.getByText("그만두기"));

    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
    expect(await store.listDays()).toEqual([]);
  });

  it("5. stop이 없어도(데스크톱) 목록으로 간다", async () => {
    await startWriting(hangingPipeline(), undefined);

    await userEvent.press(screen.getByText("그만두기"));

    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
  });

  it("6. stop()이 예외를 던져도 목록으로 간다", async () => {
    const stop = () => Promise.reject(new Error("이미 끝났다"));

    await startWriting(hangingPipeline(), stop);
    await userEvent.press(screen.getByText("그만두기"));

    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
  });
});

describe("하드웨어 뒤로 가기 (007 contracts/screens.md §3, FR-016)", () => {
  /**
   * 등록된 핸들러를 직접 붙잡는다.
   *
   * `BackHandler.mockPressBack()`은 이 jest-expo 판에 없다(2026-08-20 실측).
   * `addEventListener`를 감시해 마지막으로 등록된 핸들러를 부르는 편이
   * **무엇을 검사하는지도 더 분명하다.**
   */
  function captureBackHandler() {
    const handlers: (() => boolean)[] = [];
    const spy = jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation((_event, handler) => {
        handlers.push(handler as () => boolean);
        return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
      });
    return { handlers, spy };
  }

  afterEach(() => jest.restoreAllMocks());

  it("생성 중 뒤로 가기는 그만두기와 같은 결과다", async () => {
    const { handlers } = captureBackHandler();
    let stopped = false;

    await startWriting(hangingPipeline(), async () => {
      stopped = true;
    });

    // 생성 중에 핸들러가 등록됐다 — 목록에서는 등록되지 않는다.
    expect(handlers.length).toBeGreaterThan(0);

    let handled = false;
    await act(async () => {
      handled = handlers[handlers.length - 1]();
    });

    // **true를 돌려주어 기본 동작을 막는다** — 말없이 빠져나가지 않는다.
    expect(handled).toBe(true);
    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
    expect(stopped).toBe(true);
  });

  it("목록에서는 생성 중 핸들러를 등록하지 않는다", async () => {
    const { handlers } = captureBackHandler();

    await renderHome({ pipeline: hangingPipeline() });
    await screen.findByText("일기 쓰기");

    // 목록에서 뒤로 가기는 앱을 닫는 기본 동작이다(006 그대로).
    expect(handlers).toHaveLength(0);
  });
});

describe("고른 것이 없으면 쓰지 않는다 (007 FR-006)", () => {
  it("「캐릭터를 먼저 준비해야 한다」로 막는다", async () => {
    await renderHome({
      pipeline: hangingPipeline(),
      selection: { kind: "none" },
    });

    await userEvent.press(await screen.findByText("일기 쓰기"));

    // **고르지도 않은 캐릭터로 쓰려 들지 않는다** — 006은 "quiet"으로 채웠다.
    expect(await screen.findByText(/준비/)).toBeTruthy();
    expect(screen.queryByText("쓰고 있다")).toBeNull();
  });
});

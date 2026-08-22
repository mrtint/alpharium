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
import type { Pipeline, PipelineInput, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry, VisionSetting } from "../../src/diary/types";
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

/**
 * 009 — 고른 하루가 파이프라인까지 간다 (contracts/write-prompt.md §4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 저장소가 세 번 놓친 자리다.**
 *
 * 006의 `GenerationProbe`(파이프라인을 건너뜀), 007의 끊긴 `stop` 배선, 008의 버려진
 * 반환값 — **전부 조용히 실패했다.** 오류가 나는 것이 아니라 아무 일도 일어나지
 * 않을 뿐이었고, 타입 검사도 화면 테스트도 통과했다.
 *
 * 009의 같은 자리는 `write()`의 `day:` 한 줄이다. **거기가 `latestClosedDay(at)`로
 * 남아 있으면 화면에서 하루를 골라도 언제나 어제가 쓰인다** — 그리고 오류는 나지
 * 않는다. 그래서 **대역 파이프라인이 받은 `day`를 직접 본다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("★ 009 — 고른 하루가 생성까지 간다 (W-T1~W-T4)", () => {
  /** `run()`이 받은 입력을 기록하는 대역 */
  function recordingPipeline(): Pipeline & { days: string[] } {
    const days: string[] = [];
    return {
      days,
      run: (input) => {
        days.push(input.day);
        return Promise.resolve<PipelineResult>({ ok: true, entry, overwrote: false });
      },
    };
  }

  /** 2026-08-20T10:00 기준 고를 수 있는 하루는 [08-19, 08-18, 08-17]이다 */
  const at = () => new Date("2026-08-20T10:00:00");

  async function renderWith(pipeline: Pipeline) {
    const store = memoryStore();
    await render(
      <DiaryHomeScreen
        now={at}
        pipeline={pipeline}
        resolution={resolved}
        selection={selected}
        store={store}
      />,
    );
    return store;
  }

  it("W-T2. 아무것도 고르지 않으면 마지막으로 닫힌 하루가 간다 (FR-007)", async () => {
    const pipeline = recordingPipeline();
    await renderWith(pipeline);

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await waitFor(() => expect(pipeline.days).toHaveLength(1));

    expect(pipeline.days[0]).toBe("2026-08-19");
  });

  /**
   * **★ W-T1이 이 기능에서 가장 중요한 검증이다.**
   *
   * 화면이 하루를 그려도 파이프라인까지 가지 않으면 **아무 일도 일어나지 않고 오류도
   * 안 난다.** 여기가 실패하면 `write()`의 `day:` 줄을 본다.
   */
  it("★ W-T1. 고른 하루가 파이프라인에 그대로 간다 (FR-014·015, W1·W2)", async () => {
    const pipeline = recordingPipeline();
    await renderWith(pipeline);

    // 어제가 아닌 하루를 고른다.
    await userEvent.press(await screen.findByTestId("day-2026-08-17"));
    await userEvent.press(await screen.findByText("일기 쓰기"));
    await waitFor(() => expect(pipeline.days).toHaveLength(1));

    // **어제(08-19)가 아니라 고른 하루(08-17)다.**
    expect(pipeline.days[0]).toBe("2026-08-17");
  });

  it("★ W-T1. 한 번 누르면 하루 하나만 간다 (FR-006a, SC-002a)", async () => {
    const pipeline = recordingPipeline();
    await renderWith(pipeline);

    await userEvent.press(await screen.findByTestId("day-2026-08-18"));
    await userEvent.press(await screen.findByText("일기 쓰기"));
    await waitFor(() => expect(pipeline.days).toHaveLength(1));

    // **「3일」은 고를 수 있는 하루의 개수이지 일기가 덮는 기간이 아니다.**
    expect(pipeline.days).toEqual(["2026-08-18"]);
  });

  /**
   * **★ W-T4 — 007이 하루 하나에 세운 원칙 I의 검증을 셋으로 넓힌다.**
   *
   * 고를 수 있는 하루가 셋이 되면 「이미 있으면 그것을 보여주자」의 유혹도 셋이 된다.
   */
  it("★ W-T4. 이미 일기가 있는 하루를 골라도 확인 후 생성이 실제로 돈다 (FR-019, 원칙 I)", async () => {
    // **012 — 이제 곧바로 생성되지 않고 확인을 한 번 더 거친다**(US3, FR-011).
    // 007이 세운 「곧바로 생성」은 이 검증에서 뒤집혔다 — spec Clarifications의
    // 근거(오늘 쓰기가 열리면 하루에 여러 번 누를 상황이 흔해진다)를 따른다.
    const pipeline = recordingPipeline();
    const store = memoryStore();
    // 그 하루의 일기를 미리 심는다.
    await store.save({ ...entry, date: "2026-08-17" });

    await render(
      <DiaryHomeScreen
        now={at}
        pipeline={pipeline}
        resolution={resolved}
        selection={selected}
        store={store}
      />,
    );

    await userEvent.press(await screen.findByTestId("day-2026-08-17"));
    await userEvent.press(await screen.findByText("일기 쓰기"));

    // 확인 화면이 뜨고, 아직 생성은 시작되지 않았다.
    await screen.findByText("확인");
    expect(pipeline.days).toEqual([]);

    await userEvent.press(screen.getByText("확인"));

    // **저장된 것을 대신 보여주지 않는다** — 실제로 생성이 돌았다.
    await waitFor(() => expect(pipeline.days).toEqual(["2026-08-17"]));
  });

  /**
   * **★ W-T3 — 범위 밖은 조용히 쓰이지 않는다**(FR-017).
   *
   * 04:00을 넘겨 고른 하루가 범위를 벗어난 상황이다. **말없이 다른 하루를 쓰지
   * 않고**, 그렇다고 막다른 길에 세우지도 않는다 — 기본값으로 되돌리고 알린다.
   */
  it("★ W-T3. 범위 밖 하루를 골라 두면 기본값이 간다 (FR-009·017)", async () => {
    const pipeline = recordingPipeline();
    // 「지금」이 하루 뒤로 밀린다 — 고른 08-17이 범위를 벗어난다.
    let current = new Date("2026-08-20T10:00:00");
    const store = memoryStore();

    await render(
      <DiaryHomeScreen
        now={() => current}
        pipeline={pipeline}
        resolution={resolved}
        selection={selected}
        store={store}
      />,
    );

    await userEvent.press(await screen.findByTestId("day-2026-08-17"));

    // 하루가 지났다 — 이제 고를 수 있는 것은 [08-20, 08-19, 08-18]이다.
    current = new Date("2026-08-21T10:00:00");
    // 목록을 다시 그리게 한다.
    await userEvent.press(await screen.findByTestId("day-2026-08-19"));
    await userEvent.press(await screen.findByTestId("day-2026-08-19"));

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await waitFor(() => expect(pipeline.days).toHaveLength(1));

    // 범위 밖(08-17)이 아니다.
    expect(pipeline.days[0]).not.toBe("2026-08-17");
    expect(["2026-08-20", "2026-08-19", "2026-08-18"]).toContain(pipeline.days[0]);
  });
});

/* ═══════════════ 011 — 고른 사진 설정이 파이프라인까지 간다 ═══════════════ */

/**
 * 계약: specs/011-photo-vision-summary/spec.md FR-015·017·018
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이것이 007의 끊긴 `stop`, 009의 `day:` 한 줄과 같은 자리다.**
 *
 * 화면에서 사진 설정을 골라도 **`pipeline.run`에 닿지 않으면 언제나 「보지 않음」이
 * 쓰인다.** 오류가 나지 않고, 화면은 멀쩡히 「고름」을 보이고, 일기도 나온다 —
 * **사진만 안 볼 뿐이다.**
 *
 * 그래서 아래 테스트가 **파이프라인이 받은 `vision`을 직접 읽는다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("011 — 사진 설정이 파이프라인까지 간다", () => {
  /** `run`이 받은 입력을 기록하는 대역 */
  function recordingPipeline(seen: PipelineInput[]): Pipeline {
    return {
      run: async (input) => {
        seen.push(input);
        return { ok: true, entry, overwrote: false };
      },
    };
  }

  async function renderWithVision(vision: VisionSetting, seen: PipelineInput[]) {
    await render(
      <DiaryHomeScreen
        pipeline={recordingPipeline(seen)}
        resolution={resolved}
        selection={selected}
        store={memoryStore()}
        vision={vision}
      />,
    );
  }

  // ★ T039 — 배선 검증.
  it.each(["none", "quick", "detailed"] as const)(
    "★ 고른 설정 %s이 pipeline.run까지 도달한다",
    async (vision) => {
      const seen: PipelineInput[] = [];
      await renderWithVision(vision, seen);

      await userEvent.press(await screen.findByText("일기 쓰기"));

      expect(seen).toHaveLength(1);
      expect(seen[0].vision).toBe(vision);
    },
  );

  it("설정을 넘기지 않으면 「보지 않음」이다 (FR-018)", async () => {
    const seen: PipelineInput[] = [];
    await render(
      <DiaryHomeScreen
        pipeline={recordingPipeline(seen)}
        resolution={resolved}
        selection={selected}
        store={memoryStore()}
      />,
    );

    await userEvent.press(await screen.findByText("일기 쓰기"));

    expect(seen[0].vision).toBe("none");
  });

  it("고르는 자리가 화면에 있다 (FR-015)", async () => {
    await render(
      <DiaryHomeScreen
        onSelectVision={() => {}}
        pipeline={hangingPipeline()}
        resolution={resolved}
        selection={selected}
        store={memoryStore()}
        vision="none"
      />,
    );

    expect(await screen.findByTestId("vision-quick")).toBeTruthy();
  });

  it("고르면 통로로 전달된다", async () => {
    const chosen: VisionSetting[] = [];
    await render(
      <DiaryHomeScreen
        onSelectVision={(v) => chosen.push(v)}
        pipeline={hangingPipeline()}
        resolution={resolved}
        selection={selected}
        store={memoryStore()}
        vision="none"
      />,
    );

    await userEvent.press(await screen.findByTestId("vision-detailed"));
    expect(chosen).toEqual(["detailed"]);
  });

  /**
   * **고를 통로가 없어도 자리는 보이지 않는다** — 009가 하루 셋에서 내린 판단과
   * 반대다. 하루는 「무엇을 쓸지」라 언제나 보여야 하지만, 사진 설정은 **고칠 수 없으면
   * 보여 줄 이유가 없다**(누르면 아무 일도 안 일어나는 자리가 생긴다).
   */
  it("고를 통로가 없으면 자리가 없다", async () => {
    await render(
      <DiaryHomeScreen
        pipeline={hangingPipeline()}
        resolution={resolved}
        selection={selected}
        store={memoryStore()}
        vision="none"
      />,
    );

    await screen.findByText("일기 쓰기");
    expect(screen.queryByTestId("vision-quick")).toBeNull();
  });
});

/* ═══════════════ 011 US4 — 사진을 볼 수 없으면 그렇다고 말한다 ═══════════════ */

/**
 * 계약: specs/011-photo-vision-summary/spec.md FR-021·022·023·024
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **005 FR-022의 판단을 잇는다.**
 *
 * 사용자가 「빠르게 봄」을 골랐는데 사진을 보지 않은 일기가 나오면, **그 일기는
 * 사용자가 요청한 것이 아니다.** 001이 차단된 추론 위치를 바꿔치기하지 않은 것,
 * 003이 없는 모델을 다른 캐릭터로 대체하지 않은 것과 같은 계열이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("011 US4 — 사진을 볼 수 없을 때", () => {
  /** `vision` 단계에서 멈추는 파이프라인 */
  const visionFailure = (reason: string): Pipeline => ({
    run: async () => ({
      ok: false,
      stage: "vision",
      reason: `vision-failed: ${reason}`,
    }),
  });

  async function writeWith(pipeline: Pipeline, onGoToCharacters?: () => void) {
    await render(
      <DiaryHomeScreen
        onGoToCharacters={onGoToCharacters}
        pipeline={pipeline}
        resolution={resolved}
        selection={selected}
        store={memoryStore()}
        vision="quick"
      />,
    );
    await userEvent.press(await screen.findByText("일기 쓰기"));
  }

  // ★ FR-021 — 가짜 일기를 대신 주지 않는다.
  it("★ 사진을 못 보면 일기가 나오지 않는다 (FR-021, SC-005)", async () => {
    await writeWith(visionFailure("not-ready"));

    // 일기 본문이 화면에 없다.
    expect(screen.queryByText(entry.text)).toBeNull();
    expect(await screen.findByText(/사진을 보는 데 필요한 것/)).toBeTruthy();
  });

  it("무엇이 필요한지와 빠져나갈 길을 함께 말한다 (FR-022)", async () => {
    await writeWith(visionFailure("not-ready"));

    const message = await screen.findByText(/사진을 보는 데 필요한 것/);
    // 「준비해야 한다」와 「보지 않고 쓸 수도 있다」가 함께 있다.
    expect(message.props.children).toMatch(/준비/);
    expect(message.props.children).toMatch(/보지 않고/);
  });

  it("준비하러 가는 길이 있다 (FR-022, 003 FR-028)", async () => {
    await writeWith(visionFailure("not-ready"), () => {});

    expect(await screen.findByText(/캐릭터 준비하러 가기/)).toBeTruthy();
  });

  it.each([
    ["not-ready", /필요한 것/],
    ["failed", /문제가 생겼다/],
    ["cancelled", /멈췄다/],
  ])("%s는 서로 다른 말이 된다 (FR-022)", async (reason, pattern) => {
    await writeWith(visionFailure(reason));
    expect(await screen.findByText(pattern)).toBeTruthy();
  });

  // ★ FR-023 — 오류 문구가 원칙 III의 누출 경로다.
  it("★ 안내에 모델 정보가 없다 (FR-023, 원칙 III)", async () => {
    await writeWith(visionFailure("not-ready"));

    const message = await screen.findByText(/사진을 보는 데 필요한 것/);
    expect(String(message.props.children)).not.toMatch(/LFM|SmolVLM|mmproj|gguf|450M/i);
  });

  it("안내에 시간·토큰이 없다 (원칙 IV)", async () => {
    await writeWith(visionFailure("failed"));

    const message = await screen.findByText(/문제가 생겼다/);
    expect(String(message.props.children)).not.toMatch(/\d+초|\d+토큰|ms|%/);
  });

  /**
   * **`generation`과 뭉개지지 않는다** — 사용자가 할 일이 다르다.
   *
   * 「캐릭터를 준비해야 한다」와 「사진 보는 것을 준비해야 한다」는 서로 다른 화면으로
   * 이어지며, 뭉개면 사용자가 엉뚱한 것을 준비한다.
   */
  it("캐릭터 준비 실패와 다른 말이 된다", async () => {
    const characterFailure: Pipeline = {
      run: async () => ({
        ok: false,
        stage: "generation",
        reason: "model-load-failed: not-found",
      }),
    };

    await writeWith(characterFailure);
    const message = await screen.findByText(/준비/);

    expect(String(message.props.children)).toMatch(/캐릭터/);
    expect(String(message.props.children)).not.toMatch(/사진/);
  });
});

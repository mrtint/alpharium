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
import { AppState, BackHandler } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
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

/**
 * 029 — `DiaryHomeScreen`은 이제 `resolve(day)` 콜백으로 생성 파라미터를 받는다.
 * 대부분의 테스트는 quiet·사진 없음·장소명 꺼짐으로 충분하다.
 */
const resolveQuiet =
  (over: Partial<{ vision: VisionSetting; movedFrom: "quiet" | "narrative" }> = {}) =>
  (day: string): ResolveOutcome => ({
    kind: "resolved",
    params: {
      character: "quiet",
      day: day as never,
      vision: over.vision ?? "none",
      geocodingEnabled: false,
      ...(over.movedFrom ? { movedFrom: over.movedFrom } : {}),
    },
  });

/** 준비된 캐릭터가 없는 상태 (029 FR-014). */
const resolveNoReady = (): ResolveOutcome => ({ kind: "no-ready-character" });

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

/**
 * onProgress를 밖에서 호출할 수 있게 노출하는 파이프라인 대역 (branch 포함, 016).
 *
 * 015의 `progressPipeline()`과 같은 패턴이되, `branch` 인자를 함께 나른다 —
 * "016 — 모델 로드 독백"·"016 — 사진 보기 갈래" 두 describe가 공유한다.
 */
function loadProgressPipeline(): Pipeline & {
  onProgress: (stage: string, branch?: string) => void;
  finish: (result: PipelineResult) => void;
} {
  let release: (result: PipelineResult) => void = () => {};
  let sendProgress: (stage: string, branch?: string) => void = () => {};
  return {
    run: (_input, onProgress) =>
      new Promise<PipelineResult>((resolve) => {
        release = resolve;
        sendProgress = (stage, branch) =>
          (onProgress as unknown as (s: string, b?: string) => void)?.(stage, branch);
      }),
    onProgress: (stage, branch) => sendProgress(stage, branch),
    finish: (result) => release(result),
  };
}

async function renderHome(
  options: {
    pipeline?: Pipeline;
    stop?: () => Promise<void>;
    resolve?: (day: string) => ResolveOutcome;
    onGoToSettings?: () => void;
  } = {},
) {
  const store = memoryStore();
  await render(
    <DiaryHomeScreen
      pipeline={options.pipeline}
      resolution={resolved}
      resolve={options.resolve ?? resolveQuiet()}
      stop={options.stop}
      onGoToSettings={options.onGoToSettings}
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
   * ★ 3. **진행률·시간·토큰이 0건이다**(FR-011·010b, SC-012).
   *
   * **015 갱신**: 007은 "단계 표시" 자체를 거부했지만, 015가 그 결정을 뒤집어
   * `onProgress` 신호가 오면 독백 문구를 보여준다(spec 015). 이 테스트는
   * `hangingPipeline()`을 쓰므로 `onProgress`가 한 번도 안 불리고, 그 경우
   * 여전히 어떤 단계 표시도 없어야 한다는 것만 확인한다 — "단계 표시가 절대
   * 없다"가 아니라 "신호가 없으면 아무것도 안 보인다"(FR-011)로 범위가
   * 좁혀졌다. 실제로 문구가 보이는 것은 아래 「015 — 쓰는 중 독백」이 검증한다.
   */
  it("3. 신호가 없으면 숫자·경과 시간·단계 이름이 화면에 없다(FR-011·010b, SC-012)", async () => {
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
      resolve: resolveNoReady,
    });

    await userEvent.press(await screen.findByText("일기 쓰기"));

    // 029 — 자동 판정이 no-ready-character면 생성하지 않고 설정 탭으로 안내한다.
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
        resolve={resolveQuiet()}
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
        resolve={resolveQuiet()}
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
        resolve={resolveQuiet()}
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
 * 쓰인다.** 오류가 나지 않고, 화면은 멀쩡히 「선택」을 보이고, 일기도 나온다 —
 * **사진만 안 볼 뿐이다.**
 *
 * 그래서 아래 테스트가 **파이프라인이 받은 `vision`을 직접 읽는다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("029 — 자동 판정한 사진 설정이 파이프라인까지 간다", () => {
  /** `run`이 받은 입력을 기록하는 대역 */
  function recordingPipeline(seen: PipelineInput[]): Pipeline {
    return {
      run: async (input) => {
        seen.push(input);
        return { ok: true, entry, overwrote: false };
      },
    };
  }

  // ★ 029 — vision은 `resolve(day)`가 정한다(FR-010). 홈에 VisionPicker가 없다(FR-001).
  it.each(["none", "quick", "detailed"] as const)(
    "★ resolve가 정한 %s이 pipeline.run까지 도달한다",
    async (vision) => {
      const seen: PipelineInput[] = [];
      await render(
        <DiaryHomeScreen
          pipeline={recordingPipeline(seen)}
          resolution={resolved}
          resolve={resolveQuiet({ vision })}
          store={memoryStore()}
        />,
      );

      await userEvent.press(await screen.findByText("일기 쓰기"));

      expect(seen).toHaveLength(1);
      expect(seen[0].vision).toBe(vision);
    },
  );

  it("★ 029 — 홈 화면에 사진 설정 선택기가 없다 (FR-001·006)", async () => {
    await render(
      <DiaryHomeScreen
        pipeline={hangingPipeline()}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
      />,
    );

    await screen.findByText("일기 쓰기");
    expect(screen.queryByTestId("vision-quick")).toBeNull();
    expect(screen.queryByTestId("vision-detailed")).toBeNull();
    expect(screen.queryByTestId("geocoding-on")).toBeNull();
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

  async function writeWith(pipeline: Pipeline, onGoToSettings?: () => void) {
    await render(
      <DiaryHomeScreen
        onGoToSettings={onGoToSettings}
        pipeline={pipeline}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
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

    expect(await screen.findByText(/설정에서 작성자 준비하기/)).toBeTruthy();
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

/**
 * 015 — 쓰는 중 독백.
 *
 * 계약: specs/015-writing-monologue/spec.md User Story 1·2
 *       specs/015-writing-monologue/contracts/progress-signal.md
 *
 * `pipeline.run`이 받는 `onProgress`를 직접 붙잡아 화면 밖에서 호출한다 —
 * `hangingPipeline()`처럼 결과를 미완으로 묶어 두되, `onProgress`를 밖으로
 * 노출해 신호를 임의 시점에 보낼 수 있게 한다.
 */
describe("015 — 쓰는 중 독백", () => {
  /** onProgress를 밖에서 호출할 수 있게 노출하는 파이프라인 대역 */
  function progressPipeline(): Pipeline & {
    onProgress: (stage: "signals" | "vision" | "generation") => void;
    finish: (result: PipelineResult) => void;
  } {
    let release: (result: PipelineResult) => void = () => {};
    let sendProgress: (stage: "signals" | "vision" | "generation") => void = () => {};
    return {
      run: (_input, onProgress) =>
        new Promise<PipelineResult>((resolve) => {
          release = resolve;
          sendProgress = (stage) => onProgress?.(stage);
        }),
      onProgress: (stage) => sendProgress(stage),
      finish: (result) => release(result),
    };
  }

  it("pipeline.run이 onProgress와 함께 불린다", async () => {
    let receivedOnProgress: unknown;
    const pipeline: Pipeline = {
      run: (_input, onProgress) => {
        receivedOnProgress = onProgress;
        return new Promise(() => {});
      },
    };

    await startWriting(pipeline);

    expect(typeof receivedOnProgress).toBe("function");
  });

  it("onProgress('vision')이 오면 「쓰고 있다」에서 다른 문구로 바뀐다", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.onProgress("vision"));

    expect(screen.queryByText("쓰고 있다")).toBeNull();
    expect(screen.getByText(/중…/)).toBeTruthy();
  });

  it("onProgress('vision')이 연달아 여러 번 오면 매번 직전과 다른 문구가 보인다 (FR-014)", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);

    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      await act(async () => pipeline.onProgress("vision"));
      const rendered = JSON.stringify(screen.toJSON());
      seen.push(rendered);
      if (i > 0) expect(seen[i]).not.toBe(seen[i - 1]);
    }
  });

  it("vision 신호가 한 번도 안 오면 사진 관련 문구가 렌더되지 않는다 (FR-003, SC-002)", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.onProgress("generation"));

    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toMatch(/사진/);
  });

  it("렌더된 문구 어디에도 숫자가 없다 (FR-004, FR-013)", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);

    // screen.toJSON() 전체(스타일 수치 포함)가 아니라 실제로 보이는 문구만 본다.
    for (const stage of ["signals", "vision", "generation"] as const) {
      await act(async () => pipeline.onProgress(stage));
      const line = screen.getByText(/중…/);
      expect(String(line.props.children)).not.toMatch(/\d/);
    }
  });

  it("첫 신호가 오기 전에는 기존 「쓰고 있다」문구만 보인다 (FR-011)", async () => {
    await startWriting(hangingPipeline());

    expect(screen.getByText("쓰고 있다")).toBeTruthy();
  });

  it("onProgress가 한 번도 안 불려도(즉시 완료) 오류 없이 완료 상태로 전환된다", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.finish({ ok: true, entry, overwrote: false }));

    expect(await screen.findByText("조용한 하루였다.")).toBeTruthy();
  });

  it("마지막으로 받은 stage·line이 실패 화면 전환 후에는 남아있지 않다 (FR-009·011)", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.onProgress("vision"));
    await act(async () => pipeline.finish({ ok: false, stage: "generation", reason: "실패" }));

    await screen.findByText("← 목록");
    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toMatch(/사진을 들여다보는|사진을 살펴보는|눈에 담는/);
  });
});

/**
 * 016 — 모델 로드 독백(콜드/핫 스타트).
 *
 * 계약: specs/016-writing-monologue-expansion/spec.md User Story 1
 *       specs/016-writing-monologue-expansion/contracts/load-signal.md
 *
 * 캐릭터 이름은 화면 문구에 넣지 않는다(2026-08-23 철회) — 콜드/핫이 서로
 * 다른 문구 풀에서 오는지만 확인한다.
 */
describe("016 — 모델 로드 독백", () => {
  it("onProgress('load')(branch 없음)를 받아도 화면 문구가 갱신되지 않는다", async () => {
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.onProgress("vision"));
    const beforeLoad = JSON.stringify(screen.toJSON());

    await act(async () => pipeline.onProgress("load"));
    const afterLoadStart = JSON.stringify(screen.toJSON());

    expect(afterLoadStart).toBe(beforeLoad);
  });

  it("onProgress('load', 'cold')를 받으면 화면 문구가 갱신된다", async () => {
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);
    const beforeLoad = JSON.stringify(screen.toJSON());

    await act(async () => pipeline.onProgress("load", "cold"));

    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toBe(beforeLoad);
  });

  it("onProgress('load', 'hot')를 받으면 화면 문구가 갱신된다", async () => {
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);
    const beforeLoad = JSON.stringify(screen.toJSON());

    await act(async () => pipeline.onProgress("load", "hot"));

    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toBe(beforeLoad);
  });

  it("콜드 스타트 문구와 핫 스타트 문구는 서로 다른 풀에서 온다", async () => {
    let sawDifference = false;
    for (let i = 0; i < 10 && !sawDifference; i++) {
      const c = loadProgressPipeline();
      await startWriting(c);
      await act(async () => c.onProgress("load", "cold"));
      const cr = JSON.stringify(screen.toJSON());

      const h = loadProgressPipeline();
      await startWriting(h);
      await act(async () => h.onProgress("load", "hot"));
      const hr = JSON.stringify(screen.toJSON());

      if (cr !== hr) sawDifference = true;
    }
    expect(sawDifference).toBe(true);
  });

  it("onProgress('generation')을 받으면(로드 단계 다음) 화면이 글쓰기 문구로 전환된다", async () => {
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.onProgress("load", "cold"));
    const loadRendered = JSON.stringify(screen.toJSON());

    await act(async () => pipeline.onProgress("generation"));
    const generationRendered = JSON.stringify(screen.toJSON());

    expect(generationRendered).not.toBe(loadRendered);
  });
});

/**
 * 016 — 사진 보기 갈래(많음/보통).
 *
 * 계약: specs/016-writing-monologue-expansion/spec.md User Story 2·3
 *       specs/016-writing-monologue-expansion/contracts/monologue-branch.md
 */
describe("016 — 사진 보기 갈래(많음/보통)", () => {
  it("onProgress('vision', 'normal')을 받으면 '보통' 갈래 문구가 보인다", async () => {
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.onProgress("vision", "normal"));

    expect(screen.queryByText("쓰고 있다")).toBeNull();
    expect(screen.getByText(/중…/)).toBeTruthy();
  });

  it("onProgress('vision', 'many')를 받으면 '많음' 갈래 문구가 보인다", async () => {
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(async () => pipeline.onProgress("vision", "many"));

    expect(screen.queryByText("쓰고 있다")).toBeNull();
    expect(screen.getByText(/중…/)).toBeTruthy();
  });

  it("렌더된 사진 보기 문구 어디에도 정확한 장수(숫자)가 없다 (FR-007)", async () => {
    for (const branch of ["normal", "many"] as const) {
      const pipeline = loadProgressPipeline();
      await startWriting(pipeline);

      await act(async () => pipeline.onProgress("vision", branch));

      const line = screen.getByText(/중…/);
      expect(String(line.props.children)).not.toMatch(/\d/);
    }
  });
});

/**
 * 018 — 사진 없는 날의 미리 준비 (FR-005, FR-007, FR-008).
 *
 * 계약: specs/018-prompt-prefix-prewarm/contracts/prewarm-engine.md
 */
describe("018 — prepare()/release() 트리거", () => {
  it("사진 없는 날(vision: none)에서 캐릭터가 정해지면 prepare()를 부른다", async () => {
    const prepared: string[] = [];
    await render(
      <DiaryHomeScreen
        pipeline={hangingPipeline()}
        prepare={async (character) => {
          prepared.push(character);
        }}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
      />,
    );

    await screen.findByText("일기 쓰기");
    await waitFor(() => expect(prepared).toEqual(["quiet"]));
  });

  it("사진 있는 날(vision: quick/detailed)에서는 1단계 트리거가 prepare()를 부르지 않는다", async () => {
    const prepared: string[] = [];
    for (const vision of ["quick", "detailed"] as const) {
      await render(
        <DiaryHomeScreen
          pipeline={hangingPipeline()}
          prepare={async (character) => {
            prepared.push(character);
          }}
          resolution={resolved}
          resolve={resolveQuiet({ vision })}
          store={memoryStore()}
        />,
      );
      await screen.findByText("일기 쓰기");
    }

    // 잠시 기다려도(비동기 useEffect가 있다면 반영될 시간) 호출되지 않아야 한다.
    await act(async () => {});
    expect(prepared).toEqual([]);
  });

  it("캐릭터를 고른 적이 없으면 prepare()를 부르지 않는다", async () => {
    const prepared: string[] = [];
    await render(
      <DiaryHomeScreen
        pipeline={hangingPipeline()}
        prepare={async (character) => {
          prepared.push(character);
        }}
        resolution={resolved}
        resolve={resolveNoReady}
        store={memoryStore()}
      />,
    );

    await act(async () => {});
    expect(prepared).toEqual([]);
  });

  it("prepare 통로가 없어도(옵셔널) 화면이 정상 동작한다 — 쓰기를 눌러도 죽지 않는다 (FR-007)", async () => {
    const pipeline: Pipeline = {
      run: async () => ({ ok: true, entry, overwrote: false }),
    };
    await render(
      <DiaryHomeScreen
        pipeline={pipeline}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
      />,
    );

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await screen.findByText(/일기를 작성하는 데|조용한 하루였다/);
  });

  /**
   * **`AppState`는 네이티브 이벤트 이미터라 jest 환경에서 직접 이벤트를 낼 수
   * 없다**(005의 `stop()` 배선도 같은 이유로 실기기에서만 확인됐다,
   * AGENTS.md). 여기서는 `addEventListener`에 등록된 핸들러를 직접 꺼내
   * 불러 로직만(생성 중 여부에 따라 release/stop 중 무엇을 부르는가) 검증한다.
   */
  it("앱이 백그라운드로 가면 생성 중이 아닐 때 release()를 부른다 (FR-008)", async () => {
    const addListenerSpy = jest.spyOn(AppState, "addEventListener");
    let released = false;
    await render(
      <DiaryHomeScreen
        pipeline={hangingPipeline()}
        release={async () => {
          released = true;
        }}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
      />,
    );
    await screen.findByText("일기 쓰기");

    const handler = addListenerSpy.mock.calls
      .filter(([event]) => event === "change")
      .at(-1)?.[1] as (state: string) => void;
    expect(handler).toBeDefined();

    await act(async () => {
      handler("background");
      // 핸들러 안의 release()/stop() 호출이 fire-and-forget(void)이므로
      // 마이크로태스크를 두 번 흘려보내 완료를 기다린다(핸들러 호출 자체와
      // 그 안의 release?.().catch() 체이닝, 두 단계를 거친다).
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(released).toBe(true);
  });

  it("생성이 도는 중에는 release()를 부르지 않는다 (재사용 보존)", async () => {
    const addListenerSpy = jest.spyOn(AppState, "addEventListener");
    let released = false;
    const pipeline = hangingPipeline();
    await render(
      <DiaryHomeScreen
        pipeline={pipeline}
        release={async () => {
          released = true;
        }}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
      />,
    );

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await screen.findByText("쓰고 있다");

    const handler = addListenerSpy.mock.calls
      .filter(([event]) => event === "change")
      .at(-1)?.[1] as (state: string) => void;
    expect(handler).toBeDefined();

    await act(async () => {
      handler("background");
      // 핸들러 안의 release()/stop() 호출이 fire-and-forget(void)이므로
      // 마이크로태스크를 두 번 흘려보내 완료를 기다린다(핸들러 호출 자체와
      // 그 안의 release?.().catch() 체이닝, 두 단계를 거친다).
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(released).toBe(false);
  });
});

/**
 * 018 2단계 — 사진 있는 날의 미리 읽기 (FR-006·006a·009).
 *
 * 계약: specs/018-prompt-prefix-prewarm/contracts/prewarm-engine.md E15·E16
 */
describe("018 — captionDay 순서·재사용·폐기", () => {
  /** run()이 받은 입력을 기록하는 대역 */
  function recordingPipeline(): Pipeline & { inputs: PipelineInput[] } {
    const inputs: PipelineInput[] = [];
    return {
      inputs,
      run: (input) => {
        inputs.push(input);
        return Promise.resolve<PipelineResult>({ ok: true, entry, overwrote: false });
      },
    };
  }

  const at = () => new Date("2026-08-20T10:00:00");

  it("사진이 있는 날에서 캡션이 끝난 뒤에만 prepare()를 부른다 (E1·E15)", async () => {
    const order: string[] = [];
    let releaseCaption: (outcome: unknown) => void = () => {};
    const captionDay = jest.fn(
      () =>
        new Promise((resolve) => {
          releaseCaption = resolve;
        }),
    );
    const prepare = jest.fn(async () => {
      order.push("prepare");
    });

    await render(
      <DiaryHomeScreen
        captionDay={captionDay as never}
        now={at}
        pipeline={recordingPipeline()}
        prepare={prepare}
        resolution={resolved}
        resolve={resolveQuiet({ vision: "quick" })}
        store={memoryStore()}
      />,
    );
    await screen.findByText("일기 쓰기");

    await waitFor(() => expect(captionDay).toHaveBeenCalled());
    expect(prepare).not.toHaveBeenCalled(); // 캡션이 아직 안 끝났다

    await act(async () => {
      releaseCaption({ kind: "no-photos" });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(prepare).toHaveBeenCalledWith("quiet");
  });

  it("캡션 결과(seen)가 pipeline.run()의 PipelineInput.seen으로 전달된다", async () => {
    const seenResult = {
      kind: "seen" as const,
      vision: {
        captions: [{ photoId: "a", takenAt: new Date("2026-08-19T08:00:00"), text: "커피잔" }],
        considered: 1,
        available: 1,
      },
    };
    const captionDay = jest.fn(async () => seenResult);
    const pipeline = recordingPipeline();

    await render(
      <DiaryHomeScreen
        captionDay={captionDay as never}
        now={at}
        pipeline={pipeline}
        resolution={resolved}
        resolve={resolveQuiet({ vision: "quick" })}
        store={memoryStore()}
      />,
    );

    await waitFor(() => expect(captionDay).toHaveBeenCalled());
    await userEvent.press(await screen.findByText("일기 쓰기"));
    await waitFor(() => expect(pipeline.inputs).toHaveLength(1));

    expect(pipeline.inputs[0].seen).toEqual(seenResult.vision);
  });

  it("캡션이 아직 안 끝난 상태에서 쓰기를 누르면, 새로 읽지 않고 끝나기를 기다린다 (FR-006a)", async () => {
    let releaseCaption: (outcome: unknown) => void = () => {};
    const captionDay = jest.fn(
      () =>
        new Promise((resolve) => {
          releaseCaption = resolve;
        }),
    );
    const pipeline = recordingPipeline();

    await render(
      <DiaryHomeScreen
        captionDay={captionDay as never}
        now={at}
        pipeline={pipeline}
        resolution={resolved}
        resolve={resolveQuiet({ vision: "quick" })}
        store={memoryStore()}
      />,
    );
    await waitFor(() => expect(captionDay).toHaveBeenCalledTimes(1));

    // 캡션이 안 끝난 상태에서 곧바로 쓰기를 누른다.
    await userEvent.press(await screen.findByText("일기 쓰기"));

    // 새로 시작된 캡션 호출이 없다 — 여전히 1번뿐이다.
    expect(captionDay).toHaveBeenCalledTimes(1);

    const seenResult = {
      kind: "seen" as const,
      vision: { captions: [], considered: 0, available: 0 },
    };
    await act(async () => {
      releaseCaption(seenResult);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(pipeline.inputs).toHaveLength(1));
    expect(pipeline.inputs[0].seen).toEqual(seenResult.vision);
  });

  it("날짜를 바꾸면 이전 날짜의 캡션이 새 날짜의 일기에 섞이지 않는다 (FR-009)", async () => {
    const calls: string[] = [];
    let releaseFirst: (outcome: unknown) => void = () => {};
    const captionDay = jest.fn((day: string) => {
      calls.push(day);
      if (calls.length === 1) {
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve({
        kind: "seen" as const,
        vision: {
          captions: [{ photoId: "b", takenAt: new Date(), text: "새 날짜 사진" }],
          considered: 1,
          available: 1,
        },
      });
    });
    const pipeline = recordingPipeline();

    await render(
      <DiaryHomeScreen
        captionDay={captionDay as never}
        now={at}
        pipeline={pipeline}
        resolution={resolved}
        resolve={resolveQuiet({ vision: "quick" })}
        store={memoryStore()}
      />,
    );
    await waitFor(() => expect(captionDay).toHaveBeenCalledTimes(1));

    // 아직 첫 캡션이 안 끝난 상태에서 날짜를 바꾼다.
    await userEvent.press(await screen.findByTestId("day-2026-08-18"));
    await waitFor(() => expect(captionDay).toHaveBeenCalledTimes(2));

    // 이제야 첫(이전 날짜) 캡션이 끝난다 — stale한 결과다.
    await act(async () => {
      releaseFirst({
        kind: "seen",
        vision: {
          captions: [{ photoId: "a", takenAt: new Date(), text: "이전 날짜 사진" }],
          considered: 1,
          available: 1,
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await waitFor(() => expect(pipeline.inputs).toHaveLength(1));

    // 새 날짜의 캡션만 실린다 — 이전 날짜의 "이전 날짜 사진"이 섞이지 않는다.
    expect(pipeline.inputs[0].seen?.captions[0]?.text).toBe("새 날짜 사진");
  });
});

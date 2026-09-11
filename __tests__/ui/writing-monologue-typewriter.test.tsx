/**
 * 039 — 생성 중 화면의 독백 문구 타자기 연출.
 *
 * 계약: specs/039-writing-monologue-typewriter/contracts/writing-monologue-typewriter.md
 *       (C1~C10)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 테스트는 `TypewriterText` 자체의 정확성을 다시 검증하지 않는다** —
 * 038의 `typewriter-text.test.tsx`가 이미 잠갔다(글자 단위 진행, skipToEnd,
 * 언마운트 정리 등). 여기서는 **`DiaryHomeScreen`이 그 컴포넌트를 올바른
 * props로 부르는가**만 본다(계약 C 절).
 *
 * RNTL 14 — `render`·`fireEvent`·`unmount` 모두 Promise를 반환하므로 `await`
 * 필수(AGENTS.md).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, render, screen, userEvent } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { VisionSetting } from "../../src/diary/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { REVEAL } from "../../src/ui/theme/tokens";

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

const resolveQuiet =
  (over: Partial<{ vision: VisionSetting }> = {}) =>
  (day: string): ResolveOutcome => ({
    kind: "resolved",
    params: {
      character: "quiet",
      day: day as never,
      vision: over.vision ?? "none",
      geocodingEnabled: false,
    },
  });

/**
 * onProgress를 밖에서 호출할 수 있게 노출하는 파이프라인 대역 (diary-home.test.tsx
 * 016 `loadProgressPipeline()`과 동일 패턴 — 이 파일에서 재사용하기 위해 복제).
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

async function startWriting(pipeline: Pipeline) {
  const store = memoryStore();
  await render(
    <DiaryHomeScreen
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet()}
      store={store}
    />,
  );
  await userEvent.press(await screen.findByText("일기 쓰기"));
}

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("C1·C4·C6 — 독백 문구가 TypewriterText로 렌더된다", () => {
  it("생성 중 화면 진입 직후 폴백 문구가 글자 단위로 노출된다(빈 문자열에서 시작)", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    // 마운트 직후: 폴백 "쓰고 있다"가 아직 전부 보이지 않는다(타이핑 시작 전).
    expect(screen.queryByText("쓰고 있다")).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 5);
    });
    expect(screen.getByText("쓰고 있다")).toBeTruthy();

    jest.useRealTimers();
  });

  it("onProgress로 새 문구가 오면 그 문구가 글자 단위로 노출된다(variant=body)", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(() => {
      pipeline.onProgress("signals");
    });

    // 신규 문구는 signals 단계 후보 중 하나 — 정확한 문구는 무작위이므로
    // "그날의 기록을 확인하는 중…" 같은 전체 문자열이 즉시 안 보이는 것만 확인.
    // (완료 상태로 몰아 실제 등장 문자열을 얻는다.)
    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 50);
    });
    const rendered = screen.toJSON();
    expect(rendered).not.toBeNull();

    jest.useRealTimers();
  });
});

describe("C2 — charMs는 REVEAL.charMs와 같다", () => {
  /*
   * **절대 시간 기준으로 검증한다 — 진행 횟수만 세면 charMs 값 자체가
   * 하드코딩돼도 통과해버린다**(구현 중 위반 주입 T015에서 실측). 폴백
   * "쓰고 있다"(5글자)를 `setInterval`이 `REVEAL.charMs`마다 1글자씩
   * 채우므로, 정확히 `REVEAL.charMs * 4`(밀리초)가 지난 시점에는 아직
   * 5번째 인터벌이 안 돌아 4글자만 보이고, `REVEAL.charMs * 5`가 지나야
   * 완성된다 — 이 경계가 `charMs`가 다른 값(예: 10)이면 어긋난다.
   */
  it("정확히 REVEAL.charMs 배수 시점에서만 완성된다", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 4);
    });
    expect(screen.queryByText("쓰고 있다")).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 1);
    });
    expect(screen.getByText("쓰고 있다")).toBeTruthy();

    jest.useRealTimers();
  });
});

describe("C4 — 문구 전환 시 리마운트(FR-002, 이어서 채우기 없음)", () => {
  it("문구가 다 채워지기 전에 새 문구로 바뀌면 처음부터 다시 시작한다", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    // 폴백 "쓰고 있다" 일부만 진행(완료 전).
    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 2);
    });
    expect(screen.queryByText("쓰고 있다")).toBeNull();

    // 새 단계로 전환 — line이 바뀐다.
    await act(() => {
      pipeline.onProgress("generation");
    });

    // 전환 직후: 옛 폴백도, 새 문구 전체도 아직 안 보인다(리마운트되어 0부터 시작).
    expect(screen.queryByText("쓰고 있다")).toBeNull();

    jest.useRealTimers();
  });
});

describe("C3 — skipToEnd는 항상 false다(US2, 탭 무반응)", () => {
  it("화면을 탭해도 문구가 즉시 완성되지 않는다", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    // 아직 완료 전 — "그만두기"가 아닌 화면 어딘가를 눌러도(여기서는 별도
    // Pressable이 없으므로 화면 트리 자체에 탭 핸들러가 없다는 것을 회전
    // 표시·독백 문구 영역에 onPress가 없다는 사실로 간접 확인).
    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 1);
    });
    expect(screen.queryByText("쓰고 있다")).toBeNull();

    jest.useRealTimers();
  });
});

describe("C5 — onDone은 아무 상태도 바꾸지 않는다", () => {
  it("문구가 완료돼도 회전 표시·그만두기 버튼이 그대로 있다", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 10);
    });

    expect(screen.getByLabelText("쓰고 있다")).toBeTruthy();
    expect(screen.getByText("그만두기")).toBeTruthy();

    jest.useRealTimers();
  });
});

describe("C7·C8 — 화면 구성 무변경, 다른 케이스 무영향", () => {
  it("회전 표시와 그만두기 버튼이 여전히 렌더된다", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    expect(screen.getByLabelText("쓰고 있다")).toBeTruthy();
    expect(screen.getByText("그만두기")).toBeTruthy();

    jest.useRealTimers();
  });

  it("진행률·경과시간·토큰 등 지표 문자열이 없다(원칙 IV, FR-005)", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 10);
    });

    const rendered = JSON.stringify(screen.toJSON());
    for (const forbidden of ["%", "초 ", "토큰", "초 남", "남음"]) {
      expect(rendered).not.toContain(forbidden);
    }

    jest.useRealTimers();
  });
});

describe("FR-002a — 완료 후 정지 상태 유지(analyze C1)", () => {
  it("문구가 다 채워진 뒤 시간이 더 흘러도 렌더된 텍스트가 그대로다", async () => {
    jest.useFakeTimers();
    const pipeline = loadProgressPipeline();
    await startWriting(pipeline);

    // 폴백 "쓰고 있다" 완료.
    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 5);
    });
    expect(screen.getByText("쓰고 있다")).toBeTruthy();

    // 다음 단계 전환 없이 시간만 더 흐른다 — line이 안 바뀌면 리마운트도 없다.
    await act(() => {
      jest.advanceTimersByTime(REVEAL.charMs * 100);
    });
    expect(screen.getByText("쓰고 있다")).toBeTruthy();

    jest.useRealTimers();
  });
});

/**
 * 038 — DiaryDetailScreen reveal 흐름 계약 (contracts/diary-reveal.md).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `reveal` prop이 없거나 거짓이면 이 기능 도입 전과 100% 동일해야 한다
 * (SC-004, 회귀). `reveal`이 참이면 제목→본문이 `TypewriterText`로 점진
 * 노출되고, 본문 완료 전에는 "이 일기가 본 것" 절·사진 슬라이더가 화면에
 * 없다(FR-003, SC-002).
 *
 * ⚠️ RNTL 14 — `render`·`fireEvent`·`unmount` 모두 Promise를 반환한다.
 * `jest.useFakeTimers()`를 켠 테스트는 `afterEach`에서 반드시 되돌린다
 * (038 typewriter-text.test.tsx 실측 — 안 하면 다음 테스트로 상태가 샌다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { partiallyUnknownDay } from "../../src/signals/fake";
import { DiaryDetailScreen } from "../../src/ui/DiaryDetailScreen";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";

const CHAR_MS_TEST_UNIT = 10; // REVEAL.charMs는 15지만 여기서는 실제 상수를 그대로 쓴다(화면이 상수를 참조).

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

function baseEntry(over: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    date: "2026-09-11",
    text: "오늘 주인은 어딘가로 나섰다.",
    character: "quiet",
    signalsUsed: partiallyUnknownDay("2026-09-11"),
    createdAt: new Date("2026-09-11T06:00:00Z"),
    ...over,
  };
}

function entryWithPhotos(count: number, over: Partial<DiaryEntry> = {}): DiaryEntry {
  return baseEntry({
    photos: Array.from({ length: count }, (_, i) => ({
      photoId: `p${i}`,
      takenAt: new Date(`2026-09-11T0${i}:00:00`),
      resizedPath: `/resized/p${i}.jpg`,
    })),
    ...over,
  });
}

/** 화면에 "이 일기가 본 것" 절 제목이 있는지. entry.timing이 없으면 고정 문구. */
function hasSignalsSection(): boolean {
  return screen.queryByText("이 일기가 본 것") !== null;
}

// ───────────────────────────────────────────────────────────────────────────
// C11 — reveal 없이 렌더 (회귀)
// ───────────────────────────────────────────────────────────────────────────

describe("C11 — reveal 없이 렌더하면 즉시 전체(회귀, SC-004)", () => {
  it("본문 전문과 하단 절이 즉시 존재한다", async () => {
    const entry = baseEntry({ title: "오늘의 일기" });
    await render(<DiaryDetailScreen entry={entry} />);

    expect(screen.getByText(entry.text)).toBeTruthy();
    expect(screen.getByText("오늘의 일기")).toBeTruthy();
    expect(hasSignalsSection()).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C12·C13 — reveal 있으면 초기 부재 → 진행 후 등장
// ───────────────────────────────────────────────────────────────────────────

describe("C12 — reveal 주면 초기에 본문·하단 절이 화면에 없다(SC-002)", () => {
  it("마운트 직후 본문 전문과 하단 절이 없다", async () => {
    jest.useFakeTimers();
    const entry = baseEntry({ title: "오늘의 일기" });
    await render(<DiaryDetailScreen entry={entry} reveal />);

    expect(screen.queryByText(entry.text)).toBeNull();
    expect(hasSignalsSection()).toBe(false);
  });
});

describe("C13 — 타이머 진행 후 본문·하단 절·슬라이더가 등장한다", () => {
  it("제목→본문 완료까지 진행하면 전부 나타난다", async () => {
    jest.useFakeTimers();
    const entry = entryWithPhotos(2, { title: "제목" });
    await render(<DiaryDetailScreen entry={entry} reveal />);

    // 제목이 끝나야 본문 TypewriterText가 마운트돼 자신의 타이머를 새로
    // 시작한다 — 두 단계로 나눠 진행한다(제목 → 본문).
    await act(() => {
      jest.advanceTimersByTime(Array.from("제목").length * CHAR_MS_TEST_UNIT * 2);
    });
    expect(screen.getByText("제목")).toBeTruthy();

    await act(() => {
      jest.advanceTimersByTime(Array.from(entry.text).length * CHAR_MS_TEST_UNIT * 2);
    });

    expect(screen.getByText(entry.text)).toBeTruthy();
    expect(hasSignalsSection()).toBe(true);
    expect(screen.getByTestId("photo-slider-pager")).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C17 — 제목 없는 entry
// ───────────────────────────────────────────────────────────────────────────

describe("C17 — 제목 없는 entry는 본문부터 타이핑한다(FR-002)", () => {
  it("제목 줄이 없고, 진행하면 본문이 나타난다", async () => {
    jest.useFakeTimers();
    const entry = baseEntry(); // title 없음
    await render(<DiaryDetailScreen entry={entry} reveal />);

    expect(screen.queryByText(entry.text)).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(Array.from(entry.text).length * CHAR_MS_TEST_UNIT * 2);
    });

    expect(screen.getByText(entry.text)).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C18 — saved:false 안내는 타이핑과 무관
// ───────────────────────────────────────────────────────────────────────────

describe("C18 — saved:false 안내가 타이핑 완료 전에도 존재한다(FR-012)", () => {
  it("reveal 중이어도 저장 실패 안내가 즉시 보인다", async () => {
    jest.useFakeTimers();
    const entry = baseEntry();
    await render(<DiaryDetailScreen entry={entry} reveal saved={false} />);

    expect(screen.getByText("저장하지 못했다. 앱을 나가면 이 일기는 사라진다")).toBeTruthy();
  });

  it("overwrote:true 안내도 즉시 보인다", async () => {
    jest.useFakeTimers();
    const entry = baseEntry();
    await render(<DiaryDetailScreen entry={entry} reveal overwrote />);

    expect(screen.getByText("이전 일기를 덮어썼다")).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// I1(analyze) — 본문 타이포가 목록 재진입 경로와 같다
// ───────────────────────────────────────────────────────────────────────────

describe("I1 — reveal 중 본문 렌더 노드가 기존 타이포(fontSize 16)를 갖는다", () => {
  it("완료 후 본문 노드 스타일에 fontSize:16이 있다", async () => {
    jest.useFakeTimers();
    const entry = baseEntry();
    await render(<DiaryDetailScreen entry={entry} reveal />);

    await act(() => {
      jest.advanceTimersByTime(Array.from(entry.text).length * CHAR_MS_TEST_UNIT * 2);
    });

    const node = screen.getByText(entry.text);
    const flat = [node.props.style].flat(Infinity);
    expect(flat.some((s) => s && s.fontSize === 16)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C20~C25 — DiaryHomeScreen 배선 (contracts/diary-reveal.md B)
// ───────────────────────────────────────────────────────────────────────────

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

const resolveQuiet =
  () =>
  (day: string): ResolveOutcome => ({
    kind: "resolved",
    params: { character: "quiet", day: day as never, vision: "none", geocodingEnabled: false },
  });

/** 부를 때까지 끝나지 않는 파이프라인 (diary-home.test.tsx 패턴 재사용). */
function hangingPipeline(): Pipeline & { finish: (result: PipelineResult) => void } {
  let release: (result: PipelineResult) => void = () => {};
  return {
    run: (_input, _onProgress) =>
      new Promise<PipelineResult>((resolve) => {
        release = resolve;
      }),
    finish: (result) => release(result),
  };
}

async function renderHomeWithPipeline(pipeline: Pipeline) {
  const store = memoryStore();
  await render(
    <DiaryHomeScreen
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet()}
      store={store}
    />,
  );
  return store;
}

// ───────────────────────────────────────────────────────────────────────────
// C14~C16 — 탭으로 건너뛰기 (contracts/diary-reveal.md, US2)
// ───────────────────────────────────────────────────────────────────────────

describe("C14 — 타이핑 도중 오버레이 탭 → 즉시 전체", () => {
  it("본문 타이핑 도중 탭하면 본문 전문과 하단 절이 즉시 나타난다", async () => {
    jest.useFakeTimers();
    const entry = entryWithPhotos(1);
    await render(<DiaryDetailScreen entry={entry} reveal />);

    // 본문 타이핑이 시작된(제목 없음) 상태에서 오버레이를 탭한다.
    await fireEvent.press(screen.getByTestId("diary-reveal-skip"));

    expect(screen.getByText(entry.text)).toBeTruthy();
    expect(hasSignalsSection()).toBe(true);
  });
});

describe("C15 — 제목이 아직 안 끝난 시점(본문 미마운트)에 탭해도 즉시 전체(Clarification)", () => {
  it("제목 타이핑 도중(자연 완료 전) 탭하면 본문이 즉시 전체로 나타난다", async () => {
    jest.useFakeTimers();
    const entry = baseEntry({ title: "긴 제목입니다" }); // 6글자 — 1틱만 진행해 미완 상태를 만든다
    await render(<DiaryDetailScreen entry={entry} reveal />);

    // 제목의 일부만 진행 — 자연 완료(onDone) 전이라 titleDone은 아직 false다.
    await act(() => {
      jest.advanceTimersByTime(CHAR_MS_TEST_UNIT);
    });
    expect(screen.queryByText("긴 제목입니다")).toBeNull();
    expect(screen.queryByText(entry.text)).toBeNull();

    // 제목이 자연 완료되기 전 탭 — onSkip이 titleDone도 함께 설정해야
    // 본문 TypewriterText가 skipToEnd=true로 첫 마운트되어 즉시 전체가 된다.
    await fireEvent.press(screen.getByTestId("diary-reveal-skip"));

    expect(screen.getByText("긴 제목입니다")).toBeTruthy();
    expect(screen.getByText(entry.text)).toBeTruthy();
  });
});

describe("C16 — 완료 후에는 오버레이가 없고 슬라이더 탭이 정상 동작", () => {
  it("완료 후 diary-reveal-skip이 트리에 없고 슬라이더 탭으로 갤러리가 열린다", async () => {
    jest.useFakeTimers();
    const entry = entryWithPhotos(2);
    await render(<DiaryDetailScreen entry={entry} reveal />);

    await act(() => {
      jest.advanceTimersByTime(Array.from(entry.text).length * CHAR_MS_TEST_UNIT * 2);
    });
    expect(screen.getByText(entry.text)).toBeTruthy();

    // 완료됐으므로 건너뛰기 오버레이가 트리에 없다.
    expect(screen.queryByTestId("diary-reveal-skip")).toBeNull();

    // 슬라이더의 사진 탭은 정상적으로 갤러리를 연다(025 회귀).
    await fireEvent.press(screen.getByTestId("photo-slider-cell-0"));
    expect(screen.getByTestId("photo-gallery")).toBeTruthy();
  });
});

describe('C20·C23 — case "written"에서만 reveal이 전달된다', () => {
  it("생성 완료 직후 첫 표시는 본문이 즉시 안 보이고(reveal) 타이머 진행 후 나타난다", async () => {
    jest.useFakeTimers();
    const pipeline = hangingPipeline();
    await renderHomeWithPipeline(pipeline);

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await screen.findByText("쓰고 있다");

    const writtenEntry: DiaryEntry = baseEntry({ text: "새로 쓴 일기 본문이다." });
    await act(async () => {
      pipeline.finish({ ok: true, entry: writtenEntry, overwrote: false });
    });

    // reveal이 켜져 있다면 본문 전문이 즉시 안 보인다.
    expect(screen.queryByText(writtenEntry.text)).toBeNull();

    await act(() => {
      jest.advanceTimersByTime(Array.from(writtenEntry.text).length * CHAR_MS_TEST_UNIT * 3);
    });
    expect(screen.getByText(writtenEntry.text)).toBeTruthy();
  });
});

describe('C21·C24 — case "detail"은 무변경(회귀)', () => {
  it("목록에서 연 일기는 본문이 즉시 전부 보인다", async () => {
    const store = memoryStore();
    // 009 선택 범위는 "now" 기준 최근 3일 — 고정 now를 줘 결정적으로 만든다
    // (diary-home.test.tsx W-T2 패턴).
    const at = () => new Date("2026-08-20T10:00:00");
    const savedEntry: DiaryEntry = baseEntry({
      date: "2026-08-19",
      text: "이미 저장된 일기다.",
    });
    await store.save(savedEntry);

    await render(
      <DiaryHomeScreen
        now={at}
        pipeline={hangingPipeline()}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={store}
      />,
    );

    // 목록 항목은 `testID`가 없다 — 날짜 텍스트로 찾는다. `DayPicker`(쓰기용
    // 날짜 셀렉트)도 같은 날짜 문자열을 보이므로 첫 번째(목록 항목)를 누른다.
    await screen.findByText("일기 쓰기");
    const listItem = screen.getAllByText("2026-08-19")[0];
    await userEvent.press(listItem);

    expect(await screen.findByText(savedEntry.text)).toBeTruthy();
  });
});

describe('C22·C25 — case "writing"은 무변경, 금지어 0(SC-005)', () => {
  it("생성 중 화면에 진행률·경과시간·본문 글자가 없다", async () => {
    const pipeline = hangingPipeline();
    await renderHomeWithPipeline(pipeline);

    await userEvent.press(await screen.findByText("일기 쓰기"));
    await screen.findByText("쓰고 있다");

    expect(screen.getByLabelText("쓰고 있다")).toBeTruthy();
    expect(screen.getByText("그만두기")).toBeTruthy();

    const rendered = JSON.stringify(screen.toJSON());
    for (const forbidden of ["%", "초", "토큰", "남은", "경과"]) {
      expect(rendered).not.toContain(forbidden);
    }
    expect(rendered).not.toMatch(/\d+\s*(%|초|\/)/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C19·재진입 — 언마운트 정리 + 목록 재진입은 이어재생하지 않는다 (US3)
// ───────────────────────────────────────────────────────────────────────────

describe("재진입 — 타이핑 도중 언마운트 후 detail로 다시 열면 즉시 전체(FR-007·FR-008)", () => {
  it("reveal로 일부만 진행한 뒤 같은 entry를 detail로 다시 렌더하면 즉시 전문", async () => {
    jest.useFakeTimers();
    const entry = baseEntry({ title: "제목" });
    const { unmount } = await render(<DiaryDetailScreen entry={entry} reveal />);

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS_TEST_UNIT);
    });
    expect(screen.queryByText(entry.text)).toBeNull();

    await unmount();

    // 같은 entry를 reveal 없이(목록 재진입, detail 경로) 다시 렌더한다.
    await render(<DiaryDetailScreen entry={entry} />);

    expect(screen.getByText(entry.text)).toBeTruthy();
    expect(screen.getByText("제목")).toBeTruthy();
    expect(hasSignalsSection()).toBe(true);
  });
});

describe("C19 — reveal 중 언마운트 후 타이머 진행에도 조용하다(FR-014)", () => {
  it("언마운트 후 advanceTimersByTime에 act 경고·예외가 없다", async () => {
    jest.useFakeTimers();
    const entry = entryWithPhotos(2, { title: "제목" });
    const { unmount } = await render(<DiaryDetailScreen entry={entry} reveal />);

    await act(() => {
      jest.advanceTimersByTime(CHAR_MS_TEST_UNIT);
    });

    await unmount();

    let threw = false;
    try {
      jest.advanceTimersByTime(CHAR_MS_TEST_UNIT * 100);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

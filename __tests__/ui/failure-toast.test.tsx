/**
 * 054 — 실패 토스트 부품의 배선.
 *
 * 계약: specs/054-in-place-writing/contracts/failure-toast.md T8~T11·T14
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * reanimated 목의 `useAnimatedStyle`은 `{}`를 준다 — 슬라이드 인·페이드 아웃·끌기 따라가기의 값은 검사하지
 * 못한다(C9). 여기서 보는 것은 **문구·모양·수명(가짜 시계)·닫기 배선·입력 통과**이고, 움직임의 부드러움·쓸어
 * 닫는 손맛은 실기기 녹화로 본다(quickstart D7·D8).
 *
 * ★ **제스처 배선은 한 렌더에서만 쏜다** — gesture-handler jest 레지스트리는 앞 테스트의 핸들러를 남겨 두므로
 * 같은 파일에서 여러 번 렌더해 쏘면 앞 테스트의 것이 불린다(049 `day-picker.test.tsx`). 문턱 판정은 순수 함수
 * (`shouldDismissToast`)가 `__tests__/app/failure-toast.test.ts`에서 이미 직접 친다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import {
  weekCellsFor,
  writePromptFor,
  type DiaryListItem,
  type WritePrompt,
} from "../../src/app/state";
import { TOAST_TEXT } from "../../src/app/failure-toast";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";
import { FailureToast } from "../../src/ui/FailureToast";
import { COLORS, TOAST, WRITTEN_DAY } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const code = (file: string) =>
  readFileSync(join(__dirname, "../..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

describe("T9·T14 — 모양과 접근성", () => {
  it("한 문장뿐이고 버튼이 없으며 alert·live region이다", async () => {
    await render(<FailureToast bottom={76} onDismiss={jest.fn()} text={TOAST_TEXT.retry} />);

    const toast = screen.getByTestId("failure-toast");
    expect(toast).toHaveTextContent(/^일기를 쓰지 못했어요\.$/);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(toast.props.accessibilityRole).toBe("alert");
    expect(toast.props.accessibilityLiveRegion).toBe("polite");
  });

  it("최소 높이 48·배경 text·글자 bg 14/600·왼쪽 accent 6×6", async () => {
    await render(<FailureToast bottom={76} onDismiss={jest.fn()} text="문장" />);

    expect(screen.getByTestId("failure-toast")).toHaveStyle({
      minHeight: TOAST.minHeight,
      backgroundColor: COLORS.text,
      paddingVertical: 12,
      paddingHorizontal: 16,
    });
    expect(screen.getByText("문장")).toHaveStyle({
      color: COLORS.bg,
      fontSize: 14,
      fontWeight: "600",
    });
    expect(screen.getByTestId("failure-toast-marker")).toHaveStyle({
      width: 6,
      height: 6,
      backgroundColor: COLORS.accent,
    });
  });

  it("색·치수가 tokens에서만 온다 — 소스에 hex 색이 없다", () => {
    expect(code("src/ui/FailureToast.tsx")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("T8 — 위치: 바의 잰 높이 + 12", () => {
  const NOW = new Date("2026-09-28T16:15:00");
  const item = (day: string) =>
    ({ day, readable: true, photos: { kind: "none" } }) as DiaryListItem;

  function props(over: Partial<DiaryListScreenProps> = {}): DiaryListScreenProps {
    const items = [item("2026-09-27")];
    const write: WritePrompt = writePromptFor(items, NOW, "2026-09-28");
    return {
      items,
      write,
      cells: weekCellsFor(items, write, NOW),
      onWrite: jest.fn(),
      toast: { id: 1, text: TOAST_TEXT.retry },
      onDismissToast: jest.fn(),
      ...over,
    };
  }

  const bottomOf = () => screen.getByTestId("failure-toast-slot");

  it("바를 재기 전에는 최소 높이(64) + 12 위다", async () => {
    await render(<DiaryListScreen {...props()} />);
    expect(bottomOf()).toHaveStyle({ bottom: WRITTEN_DAY.bar.minHeight + TOAST.gapAboveBar });
  });

  it("★ 「일기 쓰기」 바의 잰 높이가 더 크면 그만큼 올라간다 — 바를 가리지 않는다", async () => {
    await render(<DiaryListScreen {...props()} />);
    await fireEvent(screen.getByTestId("write-bar"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 90 } },
    });
    expect(bottomOf()).toHaveStyle({ bottom: 90 + TOAST.gapAboveBar });
  });

  it("★ 내려가 있는 「다시 쓰기」 바도 자리 기준이다 — 올라와도 겹치지 않는다", async () => {
    const items = [item("2026-09-27")];
    const write = writePromptFor(items, NOW, "2026-09-27");
    await render(
      <DiaryListScreen
        {...props({
          items,
          write,
          cells: weekCellsFor(items, write, NOW),
          writtenAt: "2시간 15분 전에 작성",
          paper: {
            kind: "readable",
            madeUp: false,
            entry: {
              date: "2026-09-27",
              title: "제목",
              text: "본문",
              character: "quiet",
              signalsUsed: {},
              createdAt: new Date("2026-09-27T14:00:00"),
            } as never,
          },
        })}
      />,
    );
    await fireEvent(screen.getByTestId("rewrite-bar", { includeHiddenElements: true }), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 88 } },
    });
    expect(bottomOf()).toHaveStyle({ bottom: 88 + TOAST.gapAboveBar });
  });

  it("★ T11 — 래퍼가 입력을 통과시키고 하단 바가 눌린다", async () => {
    const p = props();
    await render(<DiaryListScreen {...p} />);

    expect(screen.getByTestId("failure-toast-slot").props.pointerEvents).toBe("box-none");
    await fireEvent.press(screen.getByTestId("write-button"));
    expect(p.onWrite).toHaveBeenCalledTimes(1);
  });

  it("toast가 없으면 그리지 않는다", async () => {
    await render(<DiaryListScreen {...props({ toast: undefined })} />);
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });
});

describe("T10 — 수명 (가짜 시계)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("3초 전에는 닫히지 않고 3초에 한 번 닫힌다", async () => {
    const onDismiss = jest.fn();
    await render(<FailureToast bottom={76} onDismiss={onDismiss} text="문장" />);

    await act(async () => {
      jest.advanceTimersByTime(TOAST.showMs - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(TOAST.showMs * 2);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("★ 아래로 쓸어 닫으면 3초를 기다리지 않고 닫히며, 그 뒤 타이머가 다시 부르지 않는다", async () => {
    const onDismiss = jest.fn();
    await render(<FailureToast bottom={76} onDismiss={onDismiss} text="문장" />);

    await act(async () => {
      fireGestureHandler(getByGestureTestId("failure-toast-pan"), [
        { state: State.BEGAN, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, translationY: 20, velocityY: 0 },
        { state: State.ACTIVE, translationY: 60, velocityY: 0 },
        { state: State.END, translationY: 60, velocityY: 0 },
      ]);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(TOAST.showMs * 2);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

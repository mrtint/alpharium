/**
 * 056 — 매일 쓰는 시각 대화상자 (보드 `6f`, contracts/settings-time-place.md TD1~TD6).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다. 대화상자는 포털로 올라가므로 `renderWithPortal`.
 */

import { act, fireEvent, screen } from "@testing-library/react-native";
import { BackHandler, StyleSheet } from "react-native";

import { TargetHourDialog } from "../../src/ui/TargetHourDialog";
import { COLORS } from "../../src/ui/theme/tokens";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

type BackListener = () => boolean | null | undefined;

function captureBackHandlers(): BackListener[] {
  const handlers: BackListener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    if (event === "hardwareBackPress") handlers.push(handler as BackListener);
    return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
  });
  return handlers;
}

const flat = (node: { props: { style?: unknown } }): Record<string, unknown> =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const TZ = "이 휴대폰의 시간대 · 서울 (GMT+9)";

async function open(over: Partial<Parameters<typeof TargetHourDialog>[0]> = {}) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const handlers = captureBackHandlers();
  await renderWithPortal(
    <TargetHourDialog
      format="h12"
      hour={22}
      onClose={onClose}
      onSelect={onSelect}
      open
      timeZoneLine={TZ}
      {...over}
    />,
  );
  return { onSelect, onClose, handlers };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("TD1 — 열린 모양", () => {
  it("제목·시간대 줄·저장된 시 선택·미리보기·「취소」가 있고 「저장」이 없다", async () => {
    await open();
    expect(screen.getByText("매일 쓰는 시각")).toBeTruthy();
    expect(screen.getByText(TZ)).toBeTruthy();
    expect(screen.getByTestId("target-hour-cell-22").props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId("target-hour-preview")).toHaveTextContent(
      "매일 오후 10시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요.",
    );
    expect(screen.getByTestId("target-hour-cancel")).toBeTruthy();
    expect(screen.queryByText("저장")).toBeNull();
  });

  it("시간대 줄은 13·보조색·줄높이 1.55(보드 body 기본값)", async () => {
    await open();
    expect(flat(screen.getByTestId("target-hour-tz"))).toMatchObject({
      fontSize: 13,
      lineHeight: 13 * 1.55,
      color: COLORS.textMuted,
    });
  });

  it("시간대 줄이 없으면 그리지 않는다(지어내지 않는다)", async () => {
    await open({ timeZoneLine: null });
    expect(screen.queryByText(/이 휴대폰의 시간대/)).toBeNull();
  });

  it("선택 칸은 accent 면 + accent 위 글자색 18/800, 아닌 칸은 투명 18/600", async () => {
    await open();
    expect(flat(screen.getByTestId("target-hour-cell-22"))).toMatchObject({
      height: 52,
      backgroundColor: COLORS.accent,
    });
    expect(flat(screen.getByText("10"))).toMatchObject({
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.accentForeground,
    });
    expect(flat(screen.getByText("3"))).toMatchObject({ fontSize: 18, fontWeight: "600" });
  });
});

describe("TD2 — 형식별 격자", () => {
  it("12시간: 오전/오후 둘 + 칸 12개(12, 1…11)", async () => {
    await open();
    expect(screen.getByTestId("target-hour-am")).toBeTruthy();
    expect(screen.getByTestId("target-hour-pm")).toBeTruthy();
    expect(screen.getAllByTestId(/^target-hour-cell-/)).toHaveLength(12);
    expect(screen.getByTestId("target-hour-pm").props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it("24시간: 오전/오후 없음 + 칸 24개", async () => {
    await open({ format: "h24" });
    expect(screen.queryByTestId("target-hour-am")).toBeNull();
    expect(screen.getAllByTestId(/^target-hour-cell-/)).toHaveLength(24);
    expect(screen.getByTestId("target-hour-preview")).toHaveTextContent(
      "매일 22시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요.",
    );
  });
});

describe("TD3 — 오전/오후는 선택만 바꾼다", () => {
  it("「오전」 → 칸 10 유지, 미리보기 「어제」, onSelect 안 불림", async () => {
    const { onSelect, onClose } = await open();
    await fireEvent.press(screen.getByTestId("target-hour-am"));
    expect(screen.getByTestId("target-hour-cell-10").props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId("target-hour-preview")).toHaveTextContent(
      "매일 오전 10시쯤 어제 일기를 써요. 이미 쓴 날은 건너뛰어요.",
    );
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("TD4·TD6 — 칸 한 번에 적용", () => {
  it("다른 칸 → onSelect(시) 1회", async () => {
    const { onSelect } = await open();
    await fireEvent.press(screen.getByTestId("target-hour-cell-15"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(15);
  });

  it("오전으로 바꾼 뒤 칸 10 → onSelect(10)", async () => {
    const { onSelect } = await open();
    await fireEvent.press(screen.getByTestId("target-hour-am"));
    await fireEvent.press(screen.getByTestId("target-hour-cell-10"));
    expect(onSelect).toHaveBeenCalledWith(10);
  });

  it("저장된 시와 같은 칸 → onClose만", async () => {
    const { onSelect, onClose } = await open();
    await fireEvent.press(screen.getByTestId("target-hour-cell-22"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("★ 연타해도 onSelect는 한 번", async () => {
    const { onSelect } = await open();
    const cell = screen.getByTestId("target-hour-cell-15");
    await fireEvent.press(cell);
    await fireEvent.press(cell);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("TD5 — 취소 세 경로", () => {
  it("「취소」 → onClose만", async () => {
    const { onSelect, onClose } = await open();
    await fireEvent.press(screen.getByTestId("target-hour-am"));
    await fireEvent.press(screen.getByTestId("target-hour-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("바깥 → onClose만", async () => {
    const { onSelect, onClose } = await open();
    await fireEvent.press(screen.getByTestId("target-hour-dialog-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("뒤로 → onClose만", async () => {
    const { onSelect, onClose, handlers } = await open();
    await act(async () => {
      for (const handler of [...handlers].reverse()) if (handler() === true) break;
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

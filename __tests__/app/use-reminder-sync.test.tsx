/**
 * 085 — 앱의 맞추기 배선.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md SY1·SY2·SY3·SY5
 *       spec.md FR-009
 *
 * 등록부는 진짜(`createLiveWrites()`), 맞추기는 호출을 기록하는 대역이다.
 * ⚠️ RNTL 14의 `render`·`rerender`는 Promise다 — await한다. `AppState` 스파이는 복원하지 않는다(AGENTS).
 */

import { act, render } from "@testing-library/react-native";
import { AppState } from "react-native";

import { useReminderSync } from "../../src/app/use-reminder-sync";
import { createLiveWrites, type LiveWrites } from "../../src/diary/live-write";
import type { CustomNames } from "../../src/diary/types";
import type { AutoDiarySettings } from "../../src/schedule/settings";

const handlers = new Set<(state: string) => void>();
beforeAll(() => {
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    event: string,
    handler: (state: string) => void,
  ) => {
    if (event === "change") handlers.add(handler);
    return { remove: () => handlers.delete(handler) };
  }) as never);
});
beforeEach(() => handlers.clear());

type Props = {
  liveWrites: LiveWrites;
  settings: AutoDiarySettings | null;
  names: CustomNames | undefined;
  reconcile: jest.Mock;
};

function Harness(props: Props) {
  useReminderSync(props);
  return null;
}

const ON: AutoDiarySettings = { enabled: true, targetHour: 22 };
const flush = () => act(async () => {});

function setup(over: Partial<Props> = {}): Props {
  return {
    liveWrites: createLiveWrites(),
    settings: ON,
    names: { quiet: "은동" },
    reconcile: jest.fn(async () => {}),
    ...over,
  };
}

describe("SY1 — 부르는 때", () => {
  it("마운트에서 정확히 1번", async () => {
    const props = setup();
    await render(<Harness {...props} />);
    await flush();
    expect(props.reconcile).toHaveBeenCalledTimes(1);
  });

  it("앞으로 돌아오면 1번 더(active만)", async () => {
    const props = setup();
    await render(<Harness {...props} />);
    await act(async () => {
      [...handlers].forEach((h) => h("background"));
    });
    expect(props.reconcile).toHaveBeenCalledTimes(1);
    await act(async () => {
      [...handlers].forEach((h) => h("active"));
    });
    expect(props.reconcile).toHaveBeenCalledTimes(2);
  });

  it("설정 참조·이름이 바뀌면 1번씩 더", async () => {
    const props = setup();
    const view = await render(<Harness {...props} />);
    await view.rerender(<Harness {...props} settings={{ ...ON }} />);
    await flush();
    expect(props.reconcile).toHaveBeenCalledTimes(2);
    await view.rerender(<Harness {...props} settings={props.settings} names={{ quiet: "금동" }} />);
    await flush();
    expect(props.reconcile).toHaveBeenCalledTimes(3);
  });
});

describe("SY1·SY2 — 등록부의 칸이 빌 때만", () => {
  it("쓰기가 시작될 때는 0번, 끝나면 1번", async () => {
    const props = setup();
    await render(<Harness {...props} />);
    await flush();
    props.reconcile.mockClear();

    let handle: ReturnType<LiveWrites["beginWrite"]> = null;
    await act(async () => {
      handle = props.liveWrites.beginWrite({ day: "2026-10-15", owner: "screen" });
    });
    expect(props.reconcile).toHaveBeenCalledTimes(0);
    await act(async () => {
      handle!.end({ ok: true });
    });
    expect(props.reconcile).toHaveBeenCalledTimes(1);
  });

  it("지우기가 끝나도 1번", async () => {
    const props = setup();
    await render(<Harness {...props} />);
    await flush();
    props.reconcile.mockClear();
    let wipe: ReturnType<LiveWrites["beginWipe"]> = null;
    await act(async () => {
      wipe = props.liveWrites.beginWipe();
    });
    expect(props.reconcile).toHaveBeenCalledTimes(0);
    await act(async () => {
      wipe!.end();
    });
    expect(props.reconcile).toHaveBeenCalledTimes(1);
  });
});

describe("SY5 — 이름을 넘긴다", () => {
  it("받은 names가 맞추기 인자에 있다, undefined면 undefined다", async () => {
    const props = setup({ names: { quiet: "은동" } });
    const view = await render(<Harness {...props} />);
    await flush();
    expect(props.reconcile).toHaveBeenLastCalledWith({ quiet: "은동" });

    await view.rerender(<Harness {...props} names={undefined} />);
    await flush();
    expect(props.reconcile).toHaveBeenLastCalledWith(undefined);

    await act(async () => {
      [...handlers].forEach((h) => h("active"));
    });
    expect(props.reconcile).toHaveBeenLastCalledWith(undefined);
  });
});

describe("SY3 — 언마운트하면 끊는다", () => {
  it("언마운트 뒤 쓰기가 끝나도 0번", async () => {
    const props = setup();
    const view = await render(<Harness {...props} />);
    await flush();
    const handle = props.liveWrites.beginWrite({ day: "2026-10-15", owner: "screen" });
    await view.unmount();
    props.reconcile.mockClear();
    handle!.end({ ok: true });
    expect(props.reconcile).toHaveBeenCalledTimes(0);
    expect(handlers.size).toBe(0);
  });
});

describe("실패는 삼킨다", () => {
  it("맞추기가 거부돼도 던지지 않는다", async () => {
    const props = setup({ reconcile: jest.fn(async () => Promise.reject(new Error("x"))) });
    await render(<Harness {...props} />);
    await flush();
    expect(props.reconcile).toHaveBeenCalledTimes(1);
  });
});

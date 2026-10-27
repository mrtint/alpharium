/**
 * 106 — 홈이 합류한 남의 쓰기가 실패로 끝나면 `onJoinedWriteFailed`를 한 번 부른다 (contracts/joined-retry.md JR1~JR3, 080 잔여 ④).
 *
 * 사용자가 그만둔 쓰기(홈의 「그만두기」·지우기가 끊은 것)와 저장된 쓰기는 실패가 아니다. 화면이 사라진 뒤에 온 끝은 버린다(H10).
 * 등록부는 진짜를 쓴다 — 테스트가 「남의 쓰기」를 넣고(`beginWrite`) 손잡이로 끝낸다. ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { act, screen, userEvent, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import { createLiveWrites } from "../../src/diary/live-write";
import type { Pipeline } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

function setup(onJoinedWriteFailed: jest.Mock) {
  const registry = createLiveWrites();
  const handle = registry.beginWrite({ day: TODAY, owner: "background" });
  if (handle === null) throw new Error("칸이 이미 차 있다");
  const pipeline = { run: jest.fn(() => new Promise<never>(() => {})) } as unknown as Pipeline;
  const element = (
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={memoryStore()}
      previewDay={async (day) => ({
        day,
        photos: { kind: "known" as const, count: 3 },
        places: { kind: "unknown" as const },
        photoAccess: "ok" as const,
      })}
      liveWrites={registry}
      onJoinedWriteFailed={onJoinedWriteFailed}
      barLockMs={0}
      chosenDay={TODAY}
    />
  );
  return { handle, element };
}

describe("JR1 — 합류한 쓰기가 실패하면 한 번 부른다", () => {
  it("끝이 ok:false·cancelled:false면 부르고, 홈은 목록으로 돌아온다", async () => {
    const onJoinedWriteFailed = jest.fn();
    const { handle, element } = setup(onJoinedWriteFailed);
    await renderWithPortal(element);
    expect(await screen.findByTestId("writing-paper")).toBeTruthy();

    await act(async () => {
      handle.end({ ok: false });
    });

    await waitFor(() => expect(onJoinedWriteFailed).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
  });
});

describe("JR2 — 사용자가 그만둔 쓰기는 실패가 아니다", () => {
  it("홈의 「그만두기」로 끊은 쓰기가 ok:false로 끝나도 부르지 않는다", async () => {
    const onJoinedWriteFailed = jest.fn();
    const { handle, element } = setup(onJoinedWriteFailed);
    await renderWithPortal(element);
    await screen.findByTestId("writing-paper");

    await userEvent.press(screen.getByTestId("stop-button"));
    await act(async () => {
      handle.end({ ok: false });
    });

    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    expect(onJoinedWriteFailed).not.toHaveBeenCalled();
  });
});

describe("JR3 — 저장된 쓰기는 실패가 아니다", () => {
  it("끝이 ok:true면 부르지 않는다", async () => {
    const onJoinedWriteFailed = jest.fn();
    const { handle, element } = setup(onJoinedWriteFailed);
    await renderWithPortal(element);
    await screen.findByTestId("writing-paper");

    await act(async () => {
      handle.end({ ok: true });
    });

    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    expect(onJoinedWriteFailed).not.toHaveBeenCalled();
  });
});

describe("H10 — 화면이 사라진 뒤에 온 끝은 버린다", () => {
  it("언마운트된 뒤 ok:false로 끝나도 부르지 않는다", async () => {
    const onJoinedWriteFailed = jest.fn();
    const { handle, element } = setup(onJoinedWriteFailed);
    const view = await renderWithPortal(element);
    await screen.findByTestId("writing-paper");

    await view.unmount();
    await act(async () => {
      handle.end({ ok: false });
    });

    expect(onJoinedWriteFailed).not.toHaveBeenCalled();
  });
});

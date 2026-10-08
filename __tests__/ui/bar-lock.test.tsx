/**
 * 하단 바의 잠깐 잠금 — 쓰기와 그만두기를 연달아 누를 수 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 쓰기를 시작한 직후의 「그만두기」, 그만둔 직후의 「일기 쓰기」는 `WRITING.barLockMs` 동안 눌리지 않고, 그 뒤에
 * 다시 눌린다. 다른 스위트는 `barLockMs={0}`으로 잠금을 끄고 본다 — 여기만 잠금을 켠다(짧은 값으로).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { WRITING } from "../../src/ui/theme/tokens";

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T16:15:00");
const LOCK_MS = 300;

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

const hangingPipeline = (): Pipeline => ({ run: () => new Promise<PipelineResult>(() => {}) });

const isDisabled = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState?.disabled === true;

async function renderHome(stop: () => Promise<void>) {
  await render(
    <DiaryHomeScreen
      barLockMs={LOCK_MS}
      now={() => NOW}
      pipeline={hangingPipeline()}
      resolution={resolved}
      resolve={resolveQuiet}
      stop={stop}
      store={memoryStore()}
    />,
  );
}

describe("하단 바의 잠깐 잠금", () => {
  it("기본값은 1~2초다", () => {
    expect(WRITING.barLockMs).toBeGreaterThanOrEqual(1000);
    expect(WRITING.barLockMs).toBeLessThanOrEqual(2000);
  });

  it("★ 쓰기를 시작한 직후의 「그만두기」는 눌리지 않고, 잠금이 풀리면 눌린다", async () => {
    const stop = jest.fn(async () => {});
    await renderHome(stop);
    expect(isDisabled("write-button")).toBe(false);

    await fireEvent.press(await screen.findByTestId("write-button"));
    await screen.findByTestId("stop-button");

    expect(isDisabled("stop-button")).toBe(true);
    await fireEvent.press(screen.getByTestId("stop-button"));
    expect(stop).not.toHaveBeenCalled();

    await waitFor(() => expect(isDisabled("stop-button")).toBe(false));
    await fireEvent.press(screen.getByTestId("stop-button"));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("★ 그만둔 직후의 「일기 쓰기」는 눌리지 않고, 잠금이 풀리면 다시 쓴다", async () => {
    await renderHome(async () => {});
    await fireEvent.press(await screen.findByTestId("write-button"));
    await screen.findByTestId("stop-button");
    await waitFor(() => expect(isDisabled("stop-button")).toBe(false));

    await fireEvent.press(screen.getByTestId("stop-button"));
    await screen.findByTestId("write-button");

    expect(isDisabled("write-button")).toBe(true);
    await fireEvent.press(screen.getByTestId("write-button"));
    expect(screen.queryByTestId("stop-button")).toBeNull();

    await waitFor(() => expect(isDisabled("write-button")).toBe(false));
    await fireEvent.press(screen.getByTestId("write-button"));
    expect(await screen.findByTestId("stop-button")).toBeTruthy();
  });
});

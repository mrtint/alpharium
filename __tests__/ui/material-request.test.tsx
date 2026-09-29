/**
 * 053 US2 — 권한이 없어 셀 수 없는 것을 0과 다르게 보고, 눌러서 요청한다
 * (contracts/material.md GRID4·GRID5, REQ1~REQ6, DLG5).
 *
 * **「권한이 없어요」와 「모름」은 다른 말이다**(원칙 V) — 사진 권한이 없을 때만 두 칸 모두 빨간
 * 「권한이 없어요 ›」이고, 사진 권한이 있는데 장소를 못 읽은 것은 「모름」이며 눌리지 않는다. 누르면
 * 요청하는 것은 사진 권한 하나다(장소 수가 사진 좌표에서 나온다, FR-011).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다. jest-expo의 `AppState` 스파이는
 * 복원하지 않는다(구독 반환값을 잃는다).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AppState, StyleSheet } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { DayPreview } from "../../src/app/state";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { MaterialGrid } from "../../src/ui/MaterialGrid";
import { COLORS, MATERIAL_GRID } from "../../src/ui/theme/tokens";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

const neverPipeline = (): Pipeline => ({
  run: () => new Promise<PipelineResult>(() => {}),
});

const preview = (
  photoAccess: DayPreview["photoAccess"],
  photos: DayPreview["photos"] = { kind: "unknown" },
  places: DayPreview["places"] = { kind: "unknown" },
): DayPreview => ({ day: "2026-09-24", photos, places, photoAccess });

const styleOf = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

async function renderHome(opts: {
  previewDay: jest.Mock;
  photoAccessPort?: { request: jest.Mock; openSettings: jest.Mock };
}) {
  await renderWithPortal(
    <DiaryHomeScreen
      now={() => new Date("2026-09-24T13:00:00")}
      photoAccessPort={opts.photoAccessPort}
      pipeline={neverPipeline()}
      previewDay={opts.previewDay}
      resolution={resolved}
      resolve={resolveQuiet}
      store={memoryStore()}
    />,
  );
  await screen.findByTestId("day-strip");
}

const port = () => ({
  request: jest.fn(async () => "granted"),
  openSettings: jest.fn(async () => {}),
});

describe("053 GRID — 권한 없음 표시", () => {
  it("GRID4 — 사진 권한이 없으면 두 칸 모두 빨간 「권한이 없어요 ›」 (누를 수 있다, 최소 높이 44)", async () => {
    await renderWithPortal(<MaterialGrid onRequestPhoto={() => {}} preview={preview("denied")} />);

    for (const id of ["signal-photos-permission", "signal-places-permission"]) {
      expect(screen.getByTestId(id)).toHaveTextContent("권한이 없어요›");
      expect(screen.getByTestId(id).props.accessibilityRole).toBe("button");
      expect(styleOf(id).minHeight).toBe(MATERIAL_GRID.permissionMinHeight);
    }
    expect(styleOf("signal-photos-permission-label").color).toBe(COLORS.danger);
  });

  it("GRID4 — 큰 글꼴에서 칸 폭을 넘으면 「›」가 아래로 내려온다 (옆 칸으로 새지 않는다, 2.0배 실기기)", async () => {
    await renderWithPortal(<MaterialGrid onRequestPhoto={() => {}} preview={preview("denied")} />);

    expect(styleOf("signal-photos-permission").flexWrap).toBe("wrap");
    expect(styleOf("signal-photos-permission-label").flexShrink).toBe(1);
  });

  it("★ GRID4 — 권한 없음은 0이 아니다 (숫자가 없다)", async () => {
    await renderWithPortal(<MaterialGrid onRequestPhoto={() => {}} preview={preview("blocked")} />);

    expect(screen.queryByTestId("signal-photos-number")).toBeNull();
    expect(screen.queryByTestId("signal-places-number")).toBeNull();
    expect(screen.getByTestId("signal-photos")).not.toHaveTextContent(/0/);
  });

  it("★ GRID5 — 권한이 있는데 장소만 못 읽었으면 「모름」이고 누를 수 없다", async () => {
    await renderWithPortal(
      <MaterialGrid
        onRequestPhoto={() => {}}
        preview={preview("ok", { kind: "known", count: 3 }, { kind: "unknown" })}
      />,
    );

    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
    expect(screen.queryByTestId("signal-places-permission")).toBeNull();
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("3장");
  });

  it("GRID6 — 권한 없음이면 값이 0으로 남아 있어도 안내 한 줄이 없다 (두 칸과 앞뒤가 맞는다)", async () => {
    await renderWithPortal(
      <MaterialGrid
        onRequestPhoto={() => {}}
        preview={preview("denied", { kind: "none" }, { kind: "none" })}
      />,
    );
    expect(screen.getByTestId("signal-photos-permission")).toBeTruthy();
    expect(screen.queryByTestId("material-empty-note")).toBeNull();
  });

  it("GRID6 — 권한 없음이면 안내 한 줄이 없다", async () => {
    await renderWithPortal(<MaterialGrid onRequestPhoto={() => {}} preview={preview("denied")} />);
    expect(screen.queryByTestId("material-empty-note")).toBeNull();
  });
});

describe("053 REQ — 누름과 요청", () => {
  it("REQ1 — denied에서 누르면 요청 1회, 그 뒤 미리보기를 다시 읽는다", async () => {
    const previewDay = jest.fn(async () => preview("denied"));
    const photoAccessPort = port();
    await renderHome({ previewDay, photoAccessPort });
    await screen.findByTestId("signal-photos-permission");
    const before = previewDay.mock.calls.length;

    await fireEvent.press(screen.getByTestId("signal-photos-permission"));

    await waitFor(() => expect(photoAccessPort.request).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(previewDay.mock.calls.length).toBeGreaterThan(before));
    expect(photoAccessPort.openSettings).not.toHaveBeenCalled();
  });

  it("REQ5 — 허용되면 칸이 새 값으로 바뀐다", async () => {
    let granted = false;
    const previewDay = jest.fn(async () =>
      granted
        ? preview("ok", { kind: "known", count: 4 }, { kind: "known", count: 1 })
        : preview("denied"),
    );
    const photoAccessPort = {
      request: jest.fn(async () => {
        granted = true;
        return "granted";
      }),
      openSettings: jest.fn(async () => {}),
    };
    await renderHome({ previewDay, photoAccessPort });
    await fireEvent.press(await screen.findByTestId("signal-photos-permission"));

    await waitFor(() => expect(screen.getByTestId("signal-photos")).toHaveTextContent("4장"));
    expect(screen.getByTestId("signal-places")).toHaveTextContent("1곳");
    expect(screen.queryByTestId("signal-photos-permission")).toBeNull();
  });

  it("REQ6 — 장소 칸을 눌러도 요청하는 것은 사진 권한 하나다", async () => {
    const previewDay = jest.fn(async () => preview("denied"));
    const photoAccessPort = port();
    await renderHome({ previewDay, photoAccessPort });

    await fireEvent.press(await screen.findByTestId("signal-places-permission"));

    await waitFor(() => expect(photoAccessPort.request).toHaveBeenCalledTimes(1));
  });

  it("REQ2 — blocked에서 누르면 요청하지 않고 설정 안내 대화상자가 뜬다", async () => {
    const previewDay = jest.fn(async () => preview("blocked"));
    const photoAccessPort = port();
    await renderHome({ previewDay, photoAccessPort });

    await fireEvent.press(await screen.findByTestId("signal-photos-permission"));

    expect(await screen.findByTestId("settings-prompt")).toBeTruthy();
    expect(screen.getByText("설정에서 사진 접근을 허용해 주세요")).toBeTruthy();
    expect(photoAccessPort.request).not.toHaveBeenCalled();
  });

  it("REQ3 — 「설정 열기」는 설정 통로 1회 뒤 닫히고, 덮개 누름으로는 안 닫힌다", async () => {
    const previewDay = jest.fn(async () => preview("blocked"));
    const photoAccessPort = port();
    await renderHome({ previewDay, photoAccessPort });
    await fireEvent.press(await screen.findByTestId("signal-photos-permission"));
    await screen.findByTestId("settings-prompt");

    await fireEvent.press(screen.getByTestId("settings-prompt-overlay"));
    expect(screen.getByTestId("settings-prompt")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("settings-prompt-open"));
    await waitFor(() => expect(photoAccessPort.openSettings).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByTestId("settings-prompt")).toBeNull());
    expect(photoAccessPort.request).not.toHaveBeenCalled();
  });

  it("REQ3 — 「취소」는 통로를 부르지 않고 닫기만 한다", async () => {
    const previewDay = jest.fn(async () => preview("blocked"));
    const photoAccessPort = port();
    await renderHome({ previewDay, photoAccessPort });
    await fireEvent.press(await screen.findByTestId("signal-photos-permission"));
    await screen.findByTestId("settings-prompt");

    await fireEvent.press(screen.getByTestId("settings-prompt-cancel"));
    await waitFor(() => expect(screen.queryByTestId("settings-prompt")).toBeNull());
    expect(photoAccessPort.openSettings).not.toHaveBeenCalled();
    expect(photoAccessPort.request).not.toHaveBeenCalled();
  });

  it("REQ4 — 앱이 active로 돌아오면 고른 날의 미리보기를 다시 읽는다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const previewDay = jest.fn(async () => preview("denied"));
    await renderHome({ previewDay, photoAccessPort: port() });
    await screen.findByTestId("signal-photos-permission");
    const before = previewDay.mock.calls.length;

    const handlers = spy.mock.calls
      .filter(([event]) => event === "change")
      .map(([, fn]) => fn as (s: string) => void);
    await act(async () => {
      for (const fn of handlers) fn("active");
    });

    await waitFor(() => expect(previewDay.mock.calls.length).toBeGreaterThan(before));
    expect(previewDay).toHaveBeenLastCalledWith("2026-09-24");
    // 복원하지 않는다 — jest-expo의 AppState 목은 복원하면 구독 반환값을 잃는다.
  });

  it("FR-012 — 통로(photoAccessPort)가 없어도 「일기 쓰기」는 눌린다 (권한을 강제하지 않는다)", async () => {
    const previewDay = jest.fn(async () => preview("denied"));
    await renderHome({ previewDay });
    expect(screen.getByTestId("write-button")).toBeTruthy();
  });
});

describe("053 DLG5 — 설정 안내는 050 확인 대화상자 부품이다", () => {
  it("MaterialDialogs.tsx가 ConfirmDialog·DialogActionButton·DialogCancelButton을 쓴다", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/MaterialDialogs.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).toMatch(/ConfirmDialog/);
    expect(code).toMatch(/DialogActionButton/);
    expect(code).toMatch(/DialogCancelButton/);
    expect(code).not.toMatch(/from\s+["']react-native["'][^;]*\bModal\b/);
  });
});

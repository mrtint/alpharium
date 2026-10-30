/**
 * 108 — 홈 조립: 제약 띠와 캐릭터 대체 토스트 (계약 constraint-band.md HP1~HP6).
 *
 * 진짜 `DiaryHomeScreen` + 대역 통로로 띠가 어떻게 그려지고 무엇을 부르는지 본다. 판정(`constraintBandFor`)과 훅(`useConstraintBand`)의
 * 규칙은 각자 테스트가 보고, 여기서는 홈이 종류를 받아 문구·누름 동작으로 옮기는 조립만 본다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import type { ConstraintKind } from "../../src/app/constraint-band";
import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { DayPreview } from "../../src/app/state";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { FUTURE_CHARACTER } from "../future-character";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-24T13:00:00");

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

const neverPipeline = (): Pipeline => ({
  run: () => new Promise<PipelineResult>(() => {}),
});

const preview = (photoAccess: DayPreview["photoAccess"]): DayPreview => ({
  day: "2026-09-24",
  photos: { kind: "known", count: 3 },
  places: { kind: "unknown" },
  photoAccess,
});

async function renderHome(
  opts: {
    constraintKind?: ConstraintKind | null;
    onOpenBatteryConstraint?: () => void;
    onPhotoAccessAsked?: () => void;
    photoAccessPort?: { request: jest.Mock; openSettings: jest.Mock };
    photoAccess?: DayPreview["photoAccess"];
    resolve?: (day: string) => ResolveOutcome;
  } = {},
) {
  await renderWithPortal(
    <DiaryHomeScreen
      constraintKind={opts.constraintKind}
      now={() => NOW}
      onOpenBatteryConstraint={opts.onOpenBatteryConstraint}
      onPhotoAccessAsked={opts.onPhotoAccessAsked}
      photoAccessPort={opts.photoAccessPort}
      pipeline={neverPipeline()}
      previewDay={jest.fn(async () => preview(opts.photoAccess ?? "ok"))}
      resolution={resolved}
      resolve={opts.resolve ?? resolveQuiet}
      store={memoryStore()}
    />,
  );
  await screen.findByTestId("day-strip");
}

const port = () => ({
  request: jest.fn(async () => "granted"),
  openSettings: jest.fn(async () => {}),
});

describe("HP1·HP5 — 사진 권한 띠", () => {
  it("photos면 카탈로그 문구로 띠가 서고 스트립 아래에 안내 줄이 없다", async () => {
    await renderHome({ constraintKind: "photos" });
    expect(screen.getByText("사진 권한이 없어 사진 없이 써요")).toBeTruthy();
    expect(screen.getByText("권한 허용")).toBeTruthy();
    expect(screen.queryByTestId("denied-notices")).toBeNull();
    expect(screen.queryByTestId("home-battery-notice")).toBeNull();
  });

  it("버튼을 누르면 053의 사진 권한 요청이 불린다(다시 물을 수 있을 때)", async () => {
    const photoAccessPort = port();
    await renderHome({ constraintKind: "photos", photoAccessPort, photoAccess: "denied" });
    await fireEvent.press(screen.getByTestId("constraint-band-action"));
    await waitFor(() => expect(photoAccessPort.request).toHaveBeenCalledTimes(1));
  });

  it("요청이 끝나면 조립부가 권한을 다시 읽도록 알린다 — 앱 안의 OS 창은 앱 복귀 신호를 내지 않을 수 있다", async () => {
    const photoAccessPort = port();
    const onPhotoAccessAsked = jest.fn();
    await renderHome({
      constraintKind: "photos",
      photoAccessPort,
      photoAccess: "denied",
      onPhotoAccessAsked,
    });
    await fireEvent.press(screen.getByTestId("constraint-band-action"));
    await waitFor(() => expect(onPhotoAccessAsked).toHaveBeenCalledTimes(1));
  });

  it("다시 물을 수 없으면(blocked) 설정 안내 대화상자가 뜬다", async () => {
    const photoAccessPort = port();
    await renderHome({ constraintKind: "photos", photoAccessPort, photoAccess: "blocked" });
    await fireEvent.press(screen.getByTestId("constraint-band-action"));
    expect(await screen.findByTestId("settings-prompt")).toBeTruthy();
    expect(photoAccessPort.request).not.toHaveBeenCalled();
  });

  it("종류가 null이거나 없으면 띠가 없다 — 권한을 허용하고 돌아오면 사라진다", async () => {
    await renderHome({ constraintKind: null });
    expect(screen.queryByTestId("constraint-band")).toBeNull();
  });
});

describe("HP5 — 배터리 띠", () => {
  it("battery면 배터리 문구로 서고 버튼은 배터리 예외 목록을 연다", async () => {
    const onOpenBatteryConstraint = jest.fn();
    await renderHome({ constraintKind: "battery", onOpenBatteryConstraint });
    expect(screen.getByText("배터리 제한을 풀면 화면이 꺼져도 써 둬요")).toBeTruthy();
    expect(screen.getByText("설정 열기")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("constraint-band-action"));
    expect(onOpenBatteryConstraint).toHaveBeenCalledTimes(1);
  });
});

describe("HP6 — 캐릭터 대체 안내는 토스트다", () => {
  const movedResolve = (day: string): ResolveOutcome => ({
    kind: "resolved",
    params: {
      character: "quiet",
      day: day as never,
      hasPhotos: true,
      geocodingEnabled: false,
      movedFrom: FUTURE_CHARACTER,
    },
  });

  it("옮겨 쓰기가 시작되면 스트립 아래 줄글이 아니라 토스트로 나온다", async () => {
    await renderHome({ resolve: movedResolve });
    await fireEvent.press(await screen.findByTestId("write-button"));
    const confirm = screen.queryByTestId("material-confirm-yes");
    if (confirm !== null) await fireEvent.press(confirm);
    const toast = await screen.findByTestId("failure-toast");
    expect(toast).toHaveTextContent(/바꿨어요/);
  });

  it("토스트가 뜨는 동안 띠는 가려진다", async () => {
    await renderHome({ resolve: movedResolve, constraintKind: "battery" });
    await fireEvent.press(await screen.findByTestId("write-button"));
    const confirm = screen.queryByTestId("material-confirm-yes");
    if (confirm !== null) await fireEvent.press(confirm);
    await screen.findByTestId("failure-toast");
    const band = screen.queryByTestId("constraint-band");
    // 쓰는 중이라 띠 자체가 없거나, 있다면 가려져 있다
    if (band !== null) expect(band.props.style).toEqual(expect.objectContaining({ opacity: 0 }));
  });
});

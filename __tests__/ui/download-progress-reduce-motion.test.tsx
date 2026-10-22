import { act, render } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { DownloadProgressScreen } from "../../src/ui/DownloadProgressScreen";

/**
 * 100 FR-007 — 내려받기 슬라이드의 자동 넘김은 OS 「동작 줄이기」가 켜져 있으면 멈춘다(실측: 안드로이드에서 켜도 약 4.06초마다
 * 넘어갔다 — specs/100-three-measurements/quickstart.md). 손으로 넘기기·순환·간격 같은 나머지 배선은 그대로다(046).
 * 값을 아직 모를 때도 돌리지 않는다 — 읽은 뒤에 켠다.
 */

const mockCarousel = jest.fn((_props: Record<string, unknown>) => null);
jest.mock("react-native-reanimated-carousel", () => ({
  Carousel: (props: Record<string, unknown>) => mockCarousel(props),
}));

const lastProps = () => mockCarousel.mock.calls.at(-1)![0];

function screenOf() {
  return (
    <DownloadProgressScreen
      downloadReady={false}
      downloadFraction={0}
      failed={false}
      onProceed={jest.fn()}
    />
  );
}

describe("100 — 슬라이드 자동 넘김과 동작 줄이기", () => {
  beforeEach(() => {
    mockCarousel.mockClear();
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockReturnValue({ remove: jest.fn() } as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it("동작 줄이기가 꺼져 있으면 종전대로 자동으로 넘어간다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    await render(screenOf());
    await act(async () => {});

    expect(lastProps()).toMatchObject({ autoplay: true, autoplayInterval: 4000, loop: true });
  });

  it("동작 줄이기가 켜져 있으면 자동 넘김만 멈춘다 — 순환·간격은 그대로", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await render(screenOf());
    await act(async () => {});

    expect(lastProps()).toMatchObject({ autoplay: false, autoplayInterval: 4000, loop: true });
  });

  it("값을 읽기 전에는 돌리지 않는다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(new Promise(() => {}));
    await render(screenOf());

    expect(lastProps()).toMatchObject({ autoplay: false });
  });
});

import { fireEvent, render, screen } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DownloadProgressScreen } from "../../src/ui/DownloadProgressScreen";

/**
 * 다운로드 진행 캐러셀 + 프로그레스 바 화면의 계약 테스트 (045, ★ 046이
 * 캐러셀·진행 바·실패 처리 테스트로 재작성).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C9 (완료 게이트 D5는 그대로)
 *       specs/046-download-progress-carousel/contracts/download-progress-carousel.md
 *       D1~D9
 *       spec.md(046) FR-002~FR-014
 *
 * **RNTL 14는 `render`도 `fireEvent`도 Promise를 반환한다** — `await` 없이는
 * 렌더·상태 갱신이 flush되지 않는다(025 실측, 043·044·045가 이어받은 관례).
 *
 * **라이브러리 자체의 제스처 반응(스와이프)은 jest-expo에서 완전히 검증되지
 * 않는다**(033의 reanimated jest mock 함정과 같은 계열) — 이 파일은 화면이
 * 캐러셀에 올바른 props(loop·autoplay 등)를 전달하는지와 배선을 검증하고,
 * 실제 스와이프·자동 전환 동작은 quickstart.md 실기기 검증으로 보완한다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DownloadProgressScreen.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("US1/FR-002~004 — 캐러셀 배선(downloadReady: false)", () => {
  it("캐러셀·프로그레스 바 레이아웃이 렌더된다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        downloadFraction={0}
        failed={false}
        onProceed={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-screen")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-carousel")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-bar")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-complete")).toBeNull();
  });

  it("첫 진입 시 첫 카드(01/04) 순번이 보인다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        downloadFraction={0}
        failed={false}
        onProceed={jest.fn()}
      />,
    );
    expect(screen.queryByText("01 / 04")).not.toBeNull();
  });

  it("무한 순환·자동 전환 설정이 소스에 있다(loop·autoplay)", () => {
    expect(CODE).toMatch(/loop\b/);
    expect(CODE).toMatch(/autoplay\b/);
    expect(CODE).toMatch(/autoplayInterval/);
  });

  it("캐러셀 인덱스 산술을 앱이 직접 하지 않는다 — onSnapToItem에 위임(contracts D9)", () => {
    expect(CODE).toMatch(/onSnapToItem=\{setCarouselIndex\}/);
  });
});

describe("US2/FR-005~007 — 프로그레스 바(contracts D4)", () => {
  it("downloadFraction이 4개 구간으로 렌더된다(progressSegments 사용)", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        downloadFraction={0.62}
        failed={false}
        onProceed={jest.fn()}
      />,
    );
    // 4개 구간 트랙이 렌더되는지 — BAR_SEGMENT_TRACK 컴포넌트 수로 확인.
    const bar = screen.getByTestId("download-progress-bar");
    expect(bar.children).toHaveLength(4);
  });

  it("소스가 progressSegments()를 downloadFraction 하나로만 호출한다(구간 독립성, D4)", () => {
    expect(CODE).toMatch(/progressSegments\(downloadFraction\)/);
    // 캐러셀 인덱스(carouselIndex)를 progressSegments 인자로 섞지 않는다.
    expect(CODE).not.toMatch(/progressSegments\([^)]*carouselIndex/);
  });

  it("채워지는 구간에 애니메이션(withTiming)이 적용된다", () => {
    expect(CODE).toMatch(/withTiming/);
  });
});

describe("US3/FR-008~010 — 완료 화면(downloadReady: true, 045 D5 계승)", () => {
  it("완료 뷰가 렌더되고 캐러셀·진행 바는 없다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={true}
        downloadFraction={1}
        failed={false}
        onProceed={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-complete")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-screen")).toBeNull();
    expect(screen.queryByTestId("download-progress-carousel")).toBeNull();
  });

  it("시작할게요 버튼이 있고 onProceed 콜백이 연결된다", async () => {
    const onProceed = jest.fn();
    await render(
      <DownloadProgressScreen
        downloadReady={true}
        downloadFraction={1}
        failed={false}
        onProceed={onProceed}
      />,
    );
    expect(screen.queryByTestId("download-progress-proceed")).not.toBeNull();
    await fireEvent.press(screen.getByTestId("download-progress-proceed"));
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it("downloadReady: true는 다른 값과 무관하게 완료 뷰를 우선한다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={true}
        downloadFraction={0.3}
        failed={true}
        onProceed={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-complete")).not.toBeNull();
  });
});

describe("US4/FR-011~013 — 실패해도 레이아웃 유지(contracts D6·D7)", () => {
  it("failed: true여도 캐러셀·진행 바 testID가 그대로 렌더된다(레이아웃 유지)", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        downloadFraction={0.3}
        failed={true}
        onProceed={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("download-progress-screen")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-carousel")).not.toBeNull();
    expect(screen.queryByTestId("download-progress-bar")).not.toBeNull();
    // 045의 전용 실패 뷰는 더 이상 존재하지 않는다.
    expect(screen.queryByTestId("download-progress-failed")).toBeNull();
  });

  it("실패 시 안내 문구만 바뀐다(받다가 멈췄어요)", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        downloadFraction={0.3}
        failed={true}
        onProceed={jest.fn()}
      />,
    );
    expect(screen.queryByText("받다가 멈췄어요")).not.toBeNull();
    expect(screen.queryByText("받는 중이에요")).toBeNull();
  });

  it("정상 진행 중에는 실패 문구가 없다", async () => {
    await render(
      <DownloadProgressScreen
        downloadReady={false}
        downloadFraction={0.3}
        failed={false}
        onProceed={jest.fn()}
      />,
    );
    expect(screen.queryByText("받는 중이에요")).not.toBeNull();
    expect(screen.queryByText("받다가 멈췄어요")).toBeNull();
  });

  it("실패 뷰에 오류 원문·모델 식별자가 없다(원칙 III)", () => {
    expect(CODE).not.toMatch(/\b(?:v1|v2|a1|ESSENTIAL_ASSET_KEYS|error\.message|reason)\b/i);
  });
});

describe("FR-014 — 바이트·퍼센트·전송 속도가 소스에 없다 (원칙 IV)", () => {
  it("소스에 바이트·퍼센트·속도 토큰이 없다", () => {
    expect(CODE).not.toMatch(/\b(?:byte|percent|speed|MB|GB)\b/i);
  });

  it("essentialDownloadFraction을 import하지 않는다 — downloadFraction prop으로만 받는다", () => {
    expect(CODE).not.toMatch(/essentialDownloadFraction/);
  });

  it("essential-assets.ts를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*essential-assets["']/);
  });
});

describe("D8 — props 시그니처에 재시도 콜백이 없다(재시도는 조립 계층 책임)", () => {
  it("props 타입에 downloadReady·downloadFraction·onProceed·failed 뿐, onRetry는 없다", () => {
    const start = CODE.indexOf("export type DownloadProgressScreenProps");
    const end = CODE.indexOf("};", start);
    const propsType = CODE.slice(start, end);
    const fields = [...propsType.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    expect(new Set(fields)).toEqual(
      new Set(["downloadReady", "downloadFraction", "onProceed", "failed"]),
    );
    expect(propsType).not.toMatch(/onRetry/);
  });
});

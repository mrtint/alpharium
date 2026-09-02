import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ESSENTIAL_ASSET_KEYS } from "../../src/onboarding/essential-assets";
import { assetFor } from "../../src/models/roster";
import { visionAssets } from "../../src/vision/roster";

/**
 * 필수 에셋 기기 통로의 계약 테스트.
 *
 * 계약: specs/029-writing-flow-simplification/contracts/onboarding-assets.md B
 *       (BR1~BR5)
 *
 * 기기 통로 자체는 실기기에서 확인한다. 여기서는 **상수 정합성(BR5)**과 소스
 * 불변식만 잠근다 — `expo-*`를 지연 import하므로 이 파일을 불러오는 것만으로는
 * 기기 통로가 해석되지 않지만, `expoEssentialAssetsPort()`를 부르면 `expoModelPorts()`가
 * 돌아 테스트 환경에서 터진다. 그래서 팩토리는 부르지 않는다.
 */

describe("BR5 — 상수가 로스터와 어긋나지 않는다", () => {
  it('ESSENTIAL_ASSET_KEYS의 "a1"이 assetFor("quiet").key와 같다', () => {
    expect(assetFor("quiet").key).toBe("a1");
    expect(ESSENTIAL_ASSET_KEYS).toContain(assetFor("quiet").key);
  });

  it("ESSENTIAL_ASSET_KEYS의 v1·v2가 vision roster의 두 자산키와 같다", () => {
    const va = visionAssets();
    expect(va.base.key).toBe("v1");
    expect(va.projector.key).toBe("v2");
    expect(ESSENTIAL_ASSET_KEYS).toEqual(["v1", "v2", "a1"]);
  });
});

describe("소스 불변식", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/app/essential-assets-port.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("011 prepareVision·visionReadiness와 003 createAcquisition을 재사용한다 (새 다운로드 엔진 없음)", () => {
    expect(CODE).toContain("prepareVision");
    expect(CODE).toContain("visionReadiness");
    expect(CODE).toContain("createAcquisition");
  });

  it("합산 진행률은 essentialDownloadFraction을 쓴다 (속도 어휘 없음, 원칙 IV)", () => {
    expect(CODE).toContain("essentialDownloadFraction");
    expect(CODE).not.toMatch(/\b(?:elapsed|bytesPerSecond|throughput|Mbps|kbps)\b/);
  });

  it("공간 판정은 003 SPACE_HEADROOM을 재사용한다", () => {
    expect(CODE).toContain("SPACE_HEADROOM");
  });

  it("src/app/에 있다 — src/onboarding/이 아니다 (checkOnboardingFile 회피)", () => {
    // 이 테스트 파일 자체가 src/app/ 경로를 읽는 것으로 위치를 확인한다.
    expect(SOURCE.length).toBeGreaterThan(0);
  });
});

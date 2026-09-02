import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ESSENTIAL_ASSET_KEYS,
  ONBOARDING_DEFAULT_CHARACTER,
  essentialAssetsReady,
  essentialDownloadFraction,
} from "../../src/onboarding/essential-assets";

/**
 * 필수 에셋 순수 판정의 계약 테스트.
 *
 * 계약: specs/029-writing-flow-simplification/contracts/onboarding-assets.md A
 *       (AR1~AR4)
 *
 * 021의 `requirements.test.ts` 관례대로 소스를 직접 읽어 상수의 `readonly`·
 * 로스터 미의존을 잠근다.
 */

describe("상수 (AR4)", () => {
  it("ESSENTIAL_ASSET_KEYS = [v1, v2, a1]", () => {
    expect(ESSENTIAL_ASSET_KEYS).toEqual(["v1", "v2", "a1"]);
  });

  it("ONBOARDING_DEFAULT_CHARACTER === quiet (FR-018)", () => {
    expect(ONBOARDING_DEFAULT_CHARACTER).toBe("quiet");
  });
});

describe("essentialAssetsReady (AR1)", () => {
  it("세 키 전부 ready면 true", () => {
    expect(
      essentialAssetsReady([
        { key: "v1", ready: true },
        { key: "v2", ready: true },
        { key: "a1", ready: true },
      ]),
    ).toBe(true);
  });

  it("하나라도 ready가 아니면 false", () => {
    expect(
      essentialAssetsReady([
        { key: "v1", ready: true },
        { key: "v2", ready: false },
        { key: "a1", ready: true },
      ]),
    ).toBe(false);
  });

  it("키가 빠져 있으면 false (미조회 = 미준비)", () => {
    expect(
      essentialAssetsReady([
        { key: "v1", ready: true },
        { key: "v2", ready: true },
      ]),
    ).toBe(false);
  });

  it("빈 배열이면 false", () => {
    expect(essentialAssetsReady([])).toBe(false);
  });

  it("관계없는 키가 섞여 있어도 세 키만 본다", () => {
    expect(
      essentialAssetsReady([
        { key: "a2", ready: false },
        { key: "v1", ready: true },
        { key: "v2", ready: true },
        { key: "a1", ready: true },
      ]),
    ).toBe(true);
  });
});

describe("essentialDownloadFraction (AR2)", () => {
  it("합산 비율을 낸다", () => {
    expect(
      essentialDownloadFraction([
        { receivedBytes: 50, totalBytes: 100 },
        { receivedBytes: 50, totalBytes: 100 },
      ]),
    ).toBeCloseTo(0.5);
  });

  it("총 바이트가 0이면 0", () => {
    expect(essentialDownloadFraction([{ receivedBytes: 0, totalBytes: 0 }])).toBe(0);
    expect(essentialDownloadFraction([])).toBe(0);
  });

  it("[0, 1]로 clamp된다", () => {
    expect(essentialDownloadFraction([{ receivedBytes: 200, totalBytes: 100 }])).toBe(1);
    expect(essentialDownloadFraction([{ receivedBytes: -50, totalBytes: 100 }])).toBe(0);
  });

  it("전부 받으면 1", () => {
    expect(
      essentialDownloadFraction([
        { receivedBytes: 480, totalBytes: 480 },
        { receivedBytes: 100, totalBytes: 100 },
      ]),
    ).toBe(1);
  });
});

describe("AR3 — 순수성·로스터 미의존 (소스 검사)", () => {
  const RAW = readFileSync(join(__dirname, "../../src/onboarding/essential-assets.ts"), "utf8");
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("models/·vision/roster·diary/prompt·diary/acceptance·schedule/settings를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*models\//);
    expect(CODE).not.toMatch(/from\s+["'][^"']*vision\/roster["']/);
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\/prompt["']/);
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\/acceptance["']/);
    expect(CODE).not.toMatch(/from\s+["'][^"']*schedule\/settings["']/);
  });

  it("assetFor를 부르지 않는다", () => {
    expect(CODE).not.toMatch(/\bassetFor\b/);
  });

  it("Date·count·history 토큰이 없다 (FLAG_GROWS_HISTORY 취지)", () => {
    expect(CODE).not.toMatch(/\b(?:new Date|Date\.now|timestamp|attemptCount|lastRun)\b/);
  });

  it("ESSENTIAL_ASSET_KEYS·ONBOARDING_DEFAULT_CHARACTER가 const로 선언된다 (let 재할당 없음)", () => {
    expect(CODE).toMatch(/const\s+ESSENTIAL_ASSET_KEYS\s*=/);
    expect(CODE).toMatch(/as const/);
    expect(CODE).toMatch(/const\s+ONBOARDING_DEFAULT_CHARACTER/);
    expect(CODE).not.toMatch(/let\s+ESSENTIAL_ASSET_KEYS/);
    expect(CODE).not.toMatch(/let\s+ONBOARDING_DEFAULT_CHARACTER/);
  });
});

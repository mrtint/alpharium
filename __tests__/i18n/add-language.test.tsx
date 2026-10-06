/* eslint-disable @typescript-eslint/no-require-imports -- 062: jest.isolateModules 안에서 모듈을 새로 불러 언어 결정 캐시를 가른다 */
/**
 * 062 US3 — 언어 하나를 더하는 비용 시연 (contracts X1~X3, spec FR-022·SC-005, research R10).
 *
 * 테스트 전용 가짜 언어 `xx`를 **지원 목록 한 줄 + 카탈로그 하나**로 더한다 — `jest.mock`으로 바꾸는 제품 모듈은
 * `languages`(목록)·`catalogs/index`(카탈로그 표)·`locale-port`(기기가 `xx`를 고른 것처럼) 셋뿐이고, 화면·조립 코드는 그대로다(X3).
 */

import { render, screen } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { languageLine } from "../../src/app/diagnostics-view";
import { buildPrompt } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import { languageResolution } from "../../src/i18n/current";
import { richDay } from "../../src/signals/fake";
import { BuildErrorScreen } from "../../src/ui/BuildErrorScreen";
import { SETTINGS_TEXT } from "../../src/ui/settings-text";

jest.mock("../../src/i18n/languages", () => ({
  SUPPORTED_LANGUAGES: ["ko", "xx"],
  DEFAULT_LANGUAGE: "ko",
}));
jest.mock("../../src/i18n/catalogs", () => {
  const { ko } = jest.requireActual("../../src/i18n/catalogs/ko");
  const { xx } = jest.requireActual("./fixtures/xx");
  return { CATALOGS: { ko, xx } };
});
let mockDetected: readonly string[] = ["xx-YY", "ko-KR"];
jest.mock("../../src/i18n/locale-port", () => ({ readDeviceLocales: () => mockDetected }));

describe("X1 — 감지 → 해석 → 선택 → 표시", () => {
  it("기기의 첫 선호 언어 xx가 골라진다", () => {
    expect(languageResolution()).toEqual({
      detected: ["xx-YY", "ko-KR"],
      chosen: "xx",
      matched: true,
    });
  });

  it("화면이 xx 문구로 그려진다 — 화면 코드는 바꾸지 않았다", async () => {
    await render(<BuildErrorScreen />);
    expect(screen.getByText("[xx] this build is broken")).toBeTruthy();
    expect(screen.queryByText("이 빌드는 잘못 만들어졌다")).toBeNull();
  });

  it("옛 이름의 문구 모음(SETTINGS_TEXT)도 xx 카탈로그를 읽는다", () => {
    expect(SETTINGS_TEXT.title).toBe("[xx] Settings");
  });

  it("진단 언어 줄이 xx 카탈로그의 언어 이름으로 나온다", () => {
    expect(languageLine(languageResolution())).toBe("xx-YY → xx-language");
  });
});

describe("X2 — 화면 언어가 xx여도 프롬프트는 바이트 그대로다 (US4-2, FR-016)", () => {
  it("한국어 화면일 때와 같은 프롬프트", () => {
    const request = buildRequest(richDay("2026-08-16"), "quiet", "quick");
    if (!request.ok) throw new Error("테스트 준비 실패");
    const inXx = buildPrompt(request.request);

    let inKo = "";
    mockDetected = ["ko-KR"];
    jest.isolateModules(() => {
      const current = require("../../src/i18n/current");
      expect(current.languageResolution().chosen).toBe("ko");
      const prompt = require("../../src/diary/prompt");
      const req = require("../../src/diary/request");
      const fake = require("../../src/signals/fake");
      const r = req.buildRequest(fake.richDay("2026-08-16"), "quiet", "quick");
      inKo = prompt.buildPrompt(r.request);
    });
    mockDetected = ["xx-YY", "ko-KR"];
    expect(inXx.length).toBeGreaterThan(0);
    expect(inXx).toBe(inKo);
  });
});

describe("X3 — 바꾼 제품 모듈은 셋뿐이다", () => {
  it("이 파일이 jest.mock하는 제품 경로", () => {
    const source = readFileSync(__filename, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const mocked = [...source.matchAll(/jest\.mock\("([^"]+)"/g)].map((m) => m[1]).sort();
    expect(mocked).toEqual([
      "../../src/i18n/catalogs",
      "../../src/i18n/languages",
      "../../src/i18n/locale-port",
    ]);
    // 가짜 카탈로그는 테스트 폴더에만 있다(B4는 catalog-shape.test.ts)
    expect(join(__dirname, "fixtures", "xx.ts")).toContain("__tests__");
  });
});

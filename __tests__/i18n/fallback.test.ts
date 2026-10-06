/* eslint-disable @typescript-eslint/no-require-imports -- 062: jest.isolateModules 안에서 모듈을 새로 불러 언어 결정 캐시를 가른다 */
/**
 * 062 US2 — 기기 언어가 지원 목록에 없거나 읽지 못해도 한국어로 온전히 떨어진다 (spec SC-006, FR-006~FR-008).
 *
 * 감지 통로만 바꾸고(나머지는 제품 그대로) 매 경우 `current.ts`를 새로 불러 결정 캐시가 섞이지 않게 한다.
 */

import { ko } from "../../src/i18n/catalogs/ko";

type Current = typeof import("../../src/i18n/current");

function decideWith(detected: readonly string[] | null): Current {
  let current!: Current;
  jest.isolateModules(() => {
    jest.doMock("../../src/i18n/locale-port", () => ({ readDeviceLocales: () => detected }));
    current = require("../../src/i18n/current") as Current;
  });
  return current;
}

afterEach(() => jest.dontMock("../../src/i18n/locale-port"));

describe("SC-006 — 감지한 것과 고른 것", () => {
  it.each([
    [["en-US"], false],
    [null, false],
    [["ko-KR"], true],
    [["KO"], true],
    [["fr-FR", "de-DE"], false],
  ])("%j → 한국어 (matched %s), 감지값은 입력 그대로", (detected, matched) => {
    const current = decideWith(detected);
    expect(current.languageResolution()).toEqual({ detected, chosen: "ko", matched });
    // 화면 문구는 한국어 카탈로그 그대로 — 빈 문구·키 이름·섞인 언어가 없다
    // (`isolateModules`라 객체 정체는 다르다 — 내용을 본다)
    expect(JSON.stringify(current.text())).toBe(JSON.stringify(ko));
    expect(current.text().home.dayState.today).toBe("오늘 일기를 쓸 수 있어요");
    expect(current.text().home.writing.byline("금동이")).toBe(
      "금동이가 쓰고 있어요. 진행률은 세지 않아요.",
    );
  });
});

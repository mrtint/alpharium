/* eslint-disable @typescript-eslint/no-require-imports -- 062: jest.isolateModules 안에서 모듈을 새로 불러 언어 결정 캐시를 가른다 */
/**
 * 062 — 프로세스 단위의 언어 결정과 카탈로그 (contracts/i18n.md C1~C3, spec FR-011, Clarification Q1).
 *
 * 매 테스트가 `jest.isolateModules`로 `current.ts`를 새로 불러 결정 캐시가 섞이지 않게 한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type Current = typeof import("../../src/i18n/current");

function freshCurrent(detected: readonly string[] | null): { current: Current; reads: jest.Mock } {
  const reads = jest.fn(() => detected);
  let current!: Current;
  jest.isolateModules(() => {
    jest.doMock("../../src/i18n/locale-port", () => ({ readDeviceLocales: reads }));
    current = require("../../src/i18n/current") as Current;
  });
  return { current, reads };
}

afterEach(() => jest.dontMock("../../src/i18n/locale-port"));

describe("C1 — 처음 한 번만 기기를 읽고 결정을 들고 있다", () => {
  it("불러오기만으로는 읽지 않는다", () => {
    const { reads } = freshCurrent(["ko-KR"]);
    expect(reads).not.toHaveBeenCalled();
  });

  it("text()·languageResolution()을 여러 번 불러도 한 번만 읽는다", () => {
    const { current, reads } = freshCurrent(["en-US"]);
    current.text();
    current.languageResolution();
    current.text();
    expect(reads).toHaveBeenCalledTimes(1);
    expect(current.languageResolution()).toEqual({
      detected: ["en-US"],
      chosen: "ko",
      matched: false,
    });
  });
});

describe("C2 — text()는 같은 객체를 돌려준다", () => {
  it("Object.is", () => {
    const { current } = freshCurrent(["ko-KR"]);
    expect(Object.is(current.text(), current.text())).toBe(true);
  });
});

describe("C3 — 전경 복귀를 보지 않는다", () => {
  it("AppState 참조가 없다", () => {
    const code = readFileSync(join(__dirname, "../../src/i18n/current.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/AppState/);
  });
});

describe("lazyText·lazyList — 읽는 순간에 카탈로그에서 꺼낸다", () => {
  it("모듈을 불러올 때가 아니라 속성을 읽을 때 결정한다", () => {
    const { current, reads } = freshCurrent(["ko-KR"]);
    const settings = current.lazyText((c) => c.settings);
    const weekdays = current.lazyList((c) => c.calendar.weekdayShort);
    expect(reads).not.toHaveBeenCalled();
    expect(settings.title).toBe("설정");
    expect(reads).toHaveBeenCalledTimes(1);
    expect(Array.isArray(weekdays)).toBe(true);
    expect(weekdays.length).toBe(7);
    expect([...weekdays]).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });

  it("키·JSON·toEqual이 원래 객체와 같다", () => {
    const { current } = freshCurrent(null);
    const dateJump = current.lazyText((c) => c.home.dateJump);
    expect(Object.keys(dateJump)).toEqual(["title", "cancel"]);
    expect(JSON.stringify(dateJump)).toBe(JSON.stringify(current.text().home.dateJump));
    expect(dateJump).toEqual({ title: "날짜로 이동", cancel: "취소" });
  });
});

/**
 * 048 — 홈 화면 문구 조립과 홈 화면 소스의 경계.
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md G9·G10, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **시각 숫자는 `Date`에서 온다.** 04와 12는 `day-boundary.ts` 밖으로 나가지 않고
 * (`WRITABLE_FROM_HOUR`·`DAY_STARTS_AT_HOUR`는 export되지 않는다), 화면은
 * `writableAt()`이 준 `Date`를 사람의 말로 옮길 뿐이다. 화면 소스에 「4시」·「12시」·
 * 「정오」를 적으면 새벽·오전 두 구간(Clarification Q1)을 화면이 따로 판정하게 된다.
 *
 * **화면은 신호 원형을 모른다**(009 이후) — 홈 화면 파일들이 `signals/`를 import하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cardDateText,
  dayOfMonthText,
  hourText,
  monthText,
  revertedText,
  weekdayLong,
  weekdayShort,
} from "../../src/ui/home-text";

describe("048 home-text — 날짜 문구", () => {
  it("월 표시는 고른 날의 달이다 (Clarification Q2)", () => {
    expect(monthText("2026-08-31")).toBe("2026년 8월");
    expect(monthText("2026-09-24")).toBe("2026년 9월");
  });

  it("요일 — 긴 이름과 짧은 이름", () => {
    expect(weekdayLong(0)).toBe("일요일");
    expect(weekdayLong(6)).toBe("토요일");
    expect(weekdayShort(4)).toBe("목");
  });

  it("하단 바의 날짜는 「n일」이다", () => {
    expect(dayOfMonthText("2026-09-13")).toBe("13일");
    expect(dayOfMonthText("2026-10-01")).toBe("1일");
  });

  it("카드 날짜는 「YYYY · MM · DD · 요일」이다", () => {
    expect(cardDateText("2026-09-12")).toBe("2026 · 09 · 12 · 토");
  });

  it("되돌림 안내는 해요체다 (FR-015)", () => {
    expect(revertedText("2026-09-10", "2026-09-13")).toBe(
      "9월 10일은 이제 쓸 수 없어 9월 13일로 바꿨어요",
    );
  });
});

describe("048 home-text — 쓸 수 있게 되는 시각의 말", () => {
  it("정오는 「오후 12시」", () => {
    expect(hourText(new Date(2026, 8, 24, 12))).toBe("오후 12시");
  });

  it("04:00은 「오전 4시」", () => {
    expect(hourText(new Date(2026, 8, 25, 4))).toBe("오전 4시");
  });

  it("자정은 「오전 12시」, 오후 3시는 「오후 3시」", () => {
    expect(hourText(new Date(2026, 8, 25, 0))).toBe("오전 12시");
    expect(hourText(new Date(2026, 8, 25, 15))).toBe("오후 3시");
  });
});

describe("★ 048 홈 화면 소스의 경계 (G9·G10)", () => {
  const HOME_FILES = [
    "src/ui/home-text.ts",
    "src/ui/DiaryListScreen.tsx",
    "src/ui/DayPicker.tsx",
    "src/ui/HomeMenu.tsx",
  ];

  /** 주석을 걷어낸다 — 금지어가 설명 안에 정당하게 등장한다(011·035 관례) */
  const stripComments = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const sources = HOME_FILES.filter((f) => existsSync(join(__dirname, "../..", f))).map((f) => ({
    file: f,
    code: stripComments(readFileSync(join(__dirname, "../..", f), "utf8")),
  }));

  it("검사할 파일이 실제로 있다 (조용히 비지 않는다)", () => {
    expect(sources.map((s) => s.file)).toEqual(expect.arrayContaining(HOME_FILES.slice(0, 3)));
  });

  it.each(HOME_FILES)("G9 — %s는 신호 계층을 import하지 않는다", (file) => {
    const found = sources.find((s) => s.file === file);
    if (found === undefined) return;
    expect(found.code).not.toMatch(/from\s+["'][^"']*signals\//);
  });

  it.each(HOME_FILES)("G10 — %s에 시각 숫자 문구·정오·경계 상수 이름이 없다", (file) => {
    const found = sources.find((s) => s.file === file);
    if (found === undefined) return;
    expect(found.code).not.toMatch(/[0-9]+\s*시/);
    expect(found.code).not.toContain("정오");
    expect(found.code).not.toContain("WRITABLE_FROM_HOUR");
    expect(found.code).not.toContain("DAY_STARTS_AT_HOUR");
  });
});

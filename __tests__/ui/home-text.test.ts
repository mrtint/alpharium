/**
 * 048·049 — 홈 화면 문구 조립과 홈 화면 소스의 경계.
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md H4·H5 (문구 원문 잠금, C4)
 *       specs/048-diary-home-modernist/contracts/home-screen.md G9·G10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **049 — 쓸 수 없는 오늘이 없어져 시각 문구(「오후 12시부터」)가 사라졌다.** 그래도 G10은
 * 남긴다 — 화면 소스에 「4시」·「12시」·「정오」가 다시 들어오면 화면이 하루 경계를 따로
 * 판정하기 시작한 것이다.
 *
 * **화면은 신호 원형을 모른다**(009 이후) — 홈 화면 파일들이 `signals/`를 import하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cardDateText,
  dayOfMonthText,
  dayStateText,
  monthText,
  weekdayLong,
  weekdayShort,
} from "../../src/ui/home-text";

/** 주석을 걷어낸다 — 금지어가 설명 안에 정당하게 등장한다(011·035 관례) */
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("048 home-text — 날짜 문구", () => {
  it("H1·H2 — 월 표시는 고른 날의 달이다 (보드 t.monthLabel 형식)", () => {
    expect(monthText("2026-08-31")).toBe("2026년 8월");
    expect(monthText("2026-09-24")).toBe("2026년 9월");
  });

  it("H3 — 요일 — 긴 이름과 짧은 이름 (보드 t.satFull)", () => {
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
});

describe("★ 049 dayStateText — 상태 줄 (H4·H5, 보드 원문 잠금)", () => {
  const item = (day: string, over: { title?: string; readable?: boolean } = {}) => ({
    day,
    readable: over.readable ?? true,
    photos: { kind: "none" as const },
    ...(over.title !== undefined ? { title: over.title } : {}),
  });

  it("일기가 없는 오늘 — 「오늘 일기를 쓸 수 있어요」 (보드 t.dayState)", () => {
    expect(dayStateText(undefined, true)).toBe("오늘 일기를 쓸 수 있어요");
  });

  it("일기가 없는 지난 날 — 「이 날 일기를 쓸 수 있어요」 (보드 m.dayStatePast)", () => {
    expect(dayStateText(undefined, false)).toBe("이 날 일기를 쓸 수 있어요");
  });

  it("일기가 있으면 그 제목", () => {
    expect(dayStateText(item("2026-09-20", { title: "비 오는 토요일" }), false)).toBe(
      "비 오는 토요일",
    );
  });

  it("제목 없이 저장된 일기(014) — 「이 날 일기를 썼어요」", () => {
    expect(dayStateText(item("2026-09-26"), true)).toBe("이 날 일기를 썼어요");
  });

  it("읽을 수 없는 일기 — 「읽을 수 없어요」 (006 FR-017a)", () => {
    expect(dayStateText(item("2026-09-20", { readable: false }), false)).toBe("읽을 수 없어요");
  });
});

describe("049 — 사라진 문구", () => {
  it("되돌림·시각 문구 함수가 없다 (FR-018c·FR-022a)", () => {
    const code = stripComments(readFileSync(join(__dirname, "../../src/ui/home-text.ts"), "utf8"));
    expect(code).not.toContain("hourText");
    expect(code).not.toContain("revertedText");
    expect(code).not.toContain("HALF_DAY_HOURS");
  });
});

describe("★ 048 홈 화면 소스의 경계 (G9·G10)", () => {
  const HOME_FILES = [
    "src/ui/home-text.ts",
    "src/ui/DiaryListScreen.tsx",
    "src/ui/DayPicker.tsx",
    "src/ui/HomeMenu.tsx",
  ];

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

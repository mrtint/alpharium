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
  CALENDAR_WEEKDAYS,
  DATE_JUMP,
  OVERWRITE_CONFIRM,
  WRITTEN_DAY_TEXT,
  calendarMonthText,
  calendarYearText,
  dayOfMonthText,
  dayStateText,
  monthText,
  weekdayLong,
  weekdayShort,
  writtenAtText,
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

/**
 * 050 — 대화상자 문구 (contracts/dialogs.md TXT1·TXT2). 보드 `2d`·`2j` KO 원문을 글자 단위로 잠근다(C4).
 * `todayNote`만 보드 문구표에 없는 사람이 정한 문장이다(Clarifications Q5 — 보드 `2g` 메모에서).
 */
describe("★ 050 대화상자 문구 (TXT1·TXT2)", () => {
  it("TXT1 — 덮어쓰기 확인 (보드 2d h2.confirm*)", () => {
    expect(OVERWRITE_CONFIRM).toEqual({
      title: "일기를 다시 쓸까요?",
      body: "다 쓰면 지금 일기가 새 글로 바뀌어요.",
      todayNote: "지금까지의 하루로 써요.",
      confirm: "다시 쓰기",
      cancel: "취소",
    });
  });

  it("TXT1 — 날짜로 이동 (보드 2j cal.*)", () => {
    expect(DATE_JUMP).toEqual({ title: "날짜로 이동", cancel: "취소" });
    expect(CALENDAR_WEEKDAYS.join(" ")).toBe("일 월 화 수 목 금 토");
  });

  it("TXT2 — 달력 머리의 월·연 (보드 cal.month·cal.year)", () => {
    expect(calendarMonthText({ year: 2026, month: 9 })).toBe("9월");
    expect(calendarMonthText({ year: 2026, month: 12 })).toBe("12월");
    expect(calendarYearText(2026)).toBe("2026년");
  });
});

describe("★ 048 홈 화면 소스의 경계 (G9·G10)", () => {
  const HOME_FILES = [
    "src/ui/home-text.ts",
    "src/ui/DiaryListScreen.tsx",
    "src/ui/DayPicker.tsx",
    // 050 — 홈 위에 뜨는 대화상자도 하루 경계를 따로 판정하지 않는다.
    "src/ui/OverwriteConfirmDialog.tsx",
    "src/ui/DateJumpDialog.tsx",
    // 051 — 쓴 날 지면·캐러셀도 신호·하루 경계를 모른다.
    "src/ui/WrittenDayPaper.tsx",
    "src/ui/PhotoCarousel.tsx",
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

describe("★ 051 쓴 날 문구 — 상대 작성 시각 (TIME1~4, TXT1·2)", () => {
  const at = new Date("2026-09-28T14:00:00");
  const after = (ms: number) => new Date(at.getTime() + ms);
  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;

  it("TIME1 — 1분 미만과 미래(기기 시각을 되돌림)는 「방금 작성」", () => {
    expect(writtenAtText(at, after(0))).toBe("방금 작성");
    expect(writtenAtText(at, after(59 * SEC))).toBe("방금 작성");
    expect(writtenAtText(at, after(-5 * MIN))).toBe("방금 작성");
  });

  it("TIME2 — 1분 이상 1시간 미만은 「N분 전에 작성」, 내림", () => {
    expect(writtenAtText(at, after(60 * SEC))).toBe("1분 전에 작성");
    expect(writtenAtText(at, after(59 * MIN + 59 * SEC))).toBe("59분 전에 작성");
  });

  it("TIME3 — 1시간 이상은 「N시간 M분 전에 작성」, 분이 0이어도 적는다", () => {
    expect(writtenAtText(at, after(HOUR))).toBe("1시간 0분 전에 작성");
    expect(writtenAtText(at, after(2 * HOUR + 15 * MIN + 30 * SEC))).toBe("2시간 15분 전에 작성");
  });

  it("TXT2 — 보드 m.writtenAt13 원문과 글자 단위로 같다", () => {
    expect(writtenAtText(at, after(2 * HOUR + 15 * MIN))).toBe("2시간 15분 전에 작성");
  });

  it("TXT1 — 「다시 쓰기」는 보드 h2.rewrite 원문", () => {
    expect(WRITTEN_DAY_TEXT.rewrite).toBe("다시 쓰기");
  });

  it("051 사람이 정한 문장 — 읽을 수 없음·사진 없음·저장 실패·뒤로 가기", () => {
    expect(WRITTEN_DAY_TEXT.unreadableLines).toEqual([
      "이 날의 일기 파일이 손상됐어요.",
      "다시 쓰면 새로 남아요.",
    ]);
    expect(WRITTEN_DAY_TEXT.photoMissing).toBe("이 사진은 이제 없어요");
    expect(WRITTEN_DAY_TEXT.unsaved).toBe("저장하지 못했어요. 앱을 나가면 이 일기는 사라져요.");
    expect(WRITTEN_DAY_TEXT.backToHome).toBe("← 일기");
  });

  it("TIME4 — 경과 시간은 밀리초 차이만 쓴다 — 하루 경계가 아니다 (049 DB11)", () => {
    const code = stripComments(readFileSync(join(__dirname, "../../src/ui/home-text.ts"), "utf8"));
    expect(code).not.toMatch(/getHours|setHours/);
  });
});

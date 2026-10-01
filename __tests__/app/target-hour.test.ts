/**
 * 056 — 매일 쓰는 시각의 표기·격자·미리보기·시간대 줄 (contracts/settings-time-place.md TH1~TH10).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cellOf,
  formatGmt,
  formatTargetHour,
  hourCells,
  hourFormatFrom,
  hourOfCell,
  meridiemOf,
  previewSentence,
  timeZoneLine,
} from "../../src/app/target-hour";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

describe("TH1 — 행 값 「쯤」 표기", () => {
  it.each([
    [22, "h12", "오후 10시쯤"],
    [0, "h12", "오전 12시쯤"],
    [12, "h12", "오후 12시쯤"],
    [7, "h12", "오전 7시쯤"],
    [13, "h12", "오후 1시쯤"],
    [11, "h12", "오전 11시쯤"],
    [22, "h24", "22시쯤"],
    [0, "h24", "0시쯤"],
  ] as const)("%i시 · %s → %s", (hour, format, text) => {
    expect(formatTargetHour(hour, format)).toBe(text);
  });
});

describe("TH2 — 격자 칸", () => {
  it("12시간은 12, 1…11의 12칸", () => {
    expect(hourCells("h12")).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it("24시간은 0…23의 24칸", () => {
    expect(hourCells("h24")).toEqual(HOURS);
  });
});

describe("TH3 — 칸 + 오전/오후 ↔ 시", () => {
  it("12 칸은 오전 0시·오후 12시, 10 칸은 오전 10시·오후 22시", () => {
    expect(hourOfCell(12, "am")).toBe(0);
    expect(hourOfCell(12, "pm")).toBe(12);
    expect(hourOfCell(10, "am")).toBe(10);
    expect(hourOfCell(10, "pm")).toBe(22);
  });
  it("오전은 0–11, 오후는 12–23", () => {
    expect(meridiemOf(0)).toBe("am");
    expect(meridiemOf(11)).toBe("am");
    expect(meridiemOf(12)).toBe("pm");
    expect(meridiemOf(23)).toBe("pm");
  });
  it.each(HOURS)("%i시 → 칸·오전/오후 → 같은 시", (hour) => {
    expect(hourOfCell(cellOf(hour), meridiemOf(hour))).toBe(hour);
  });
});

describe("TH4 — 오전/오후를 바꿔도 칸은 그대로", () => {
  it("오후 10시(22)에서 오전으로 → 칸 10, 시 10", () => {
    const cell = cellOf(22);
    expect(cell).toBe(10);
    expect(hourOfCell(cell, "am")).toBe(10);
  });
});

describe("TH5 — 미리보기 문장", () => {
  it.each([
    [22, "h12", "매일 오후 10시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요."],
    [7, "h12", "매일 오전 7시쯤 어제 일기를 써요. 이미 쓴 날은 건너뛰어요."],
    [15, "h24", "매일 15시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요."],
    [11, "h12", "매일 오전 11시쯤 어제 일기를 써요. 이미 쓴 날은 건너뛰어요."],
    [12, "h12", "매일 오후 12시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요."],
    [0, "h12", "매일 오전 12시쯤 어제 일기를 써요. 이미 쓴 날은 건너뛰어요."],
    [0, "h24", "매일 0시쯤 어제 일기를 써요. 이미 쓴 날은 건너뛰어요."],
  ] as const)("%i시 · %s", (hour, format, text) => {
    expect(previewSentence(hour, format)).toBe(text);
  });
});

describe("TH6 — GMT", () => {
  it.each([
    [540, "GMT+9"],
    [0, "GMT"],
    [-210, "GMT-3:30"],
    [345, "GMT+5:45"],
    [-240, "GMT-4"],
  ])("%i분 → %s", (offset, text) => {
    expect(formatGmt(offset)).toBe(text);
  });
});

describe("TH7 — 시간대 줄", () => {
  it("표에 있는 도시는 사람이 정한 이름으로", () => {
    expect(timeZoneLine("Asia/Seoul", 540)).toBe("이 휴대폰의 시간대 · 서울 (GMT+9)");
  });
  it("표에 없으면 식별자의 도시 부분, 밑줄은 띄어쓰기", () => {
    expect(timeZoneLine("America/New_York", -240)).toBe("이 휴대폰의 시간대 · New York (GMT-4)");
  });
  it("식별자를 못 읽었으면 줄이 없다(지어내지 않는다)", () => {
    expect(timeZoneLine(null, 540)).toBeNull();
    expect(timeZoneLine("", 540)).toBeNull();
  });
});

describe("TH8 — 시간 형식 판정", () => {
  it.each([
    [{ hourCycle: "h23" }, "h24"],
    [{ hourCycle: "h24" }, "h24"],
    [{ hourCycle: "h12" }, "h12"],
    [{ hourCycle: "h11" }, "h12"],
    [{ hour12: false }, "h24"],
    [{ hour12: true }, "h12"],
    [{}, "h12"],
    [null, "h12"],
  ] as const)("%j → %s", (options, format) => {
    expect(hourFormatFrom(options)).toBe(format);
  });
});

function sourceWithoutComments(): string {
  return readFileSync(join(__dirname, "../../src/app/target-hour.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

describe("TH9 — 순수하다 (소스)", () => {
  it("기기·지금을 읽지 않고 화면 계층에 닿지 않는다", () => {
    const source = sourceWithoutComments();
    expect(source).not.toMatch(/new Date\(/);
    expect(source).not.toMatch(/Intl\./);
    expect(source).not.toMatch(/getTimezoneOffset/);
    expect(source).not.toMatch(/from "\.\.\/ui/);
  });
});

describe("TH10 — 정확한 시각을 약속하지 않는다 (020 FR-002, 056 FR-035)", () => {
  it("소스에 「정각」이 없다", () => {
    expect(sourceWithoutComments()).not.toMatch(/정각/);
  });
  it.each(["h12", "h24"] as const)("%s의 모든 표기·미리보기가 「쯤」을 담는다", (format) => {
    for (const hour of HOURS) {
      expect(formatTargetHour(hour, format)).toMatch(/쯤$/);
      expect(previewSentence(hour, format)).toMatch(/시쯤 /);
    }
  });
});

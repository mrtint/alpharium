/**
 * 051 — 쓴 날 지면 판정 (`paperFor`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md PAP1~PAP6, data-model.md §2
 *
 * **쓴 날인가는 목록 요약이 먼저 정한다**(FR-001) — 파일 읽기를 기다리지 않는다. 읽기 결과는 본문만
 * 채우고, 다른 날의 결과는 버린다(FR-016).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DiaryListItem } from "../../src/app/state";
import { paperFor, reachedEnd } from "../../src/app/written-day";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";

const DAY = "2026-09-26";
const OTHER = "2026-09-25";

const signals: DaySignals = {
  date: DAY,
  photos: { kind: "none" },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "안드로이드가 기간 걸음 수를 주지 않는다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
};

const entry: DiaryEntry = {
  date: DAY,
  text: "조용한 하루였다.",
  title: "조용한 하루",
  character: "quiet",
  signalsUsed: signals,
  createdAt: new Date("2026-09-26T10:00:00"),
};

const item = (over: Partial<DiaryListItem> = {}): DiaryListItem => ({
  day: DAY,
  readable: true,
  photos: { kind: "none" },
  ...over,
});

describe("051 paperFor — 지면 판정표 (data-model §2)", () => {
  it("PAP1 — 목록에 그 날이 없으면 unwritten (읽기 결과가 무엇이든)", () => {
    expect(paperFor(DAY, [], undefined)).toEqual({ kind: "unwritten" });
    expect(paperFor(DAY, [], { day: DAY, entry })).toEqual({ kind: "unwritten" });
    expect(paperFor(DAY, [item({ day: OTHER })], { day: DAY, entry })).toEqual({
      kind: "unwritten",
    });
  });

  it("PAP2 — 목록이 readable:false면 unreadable (읽기 결과가 무엇이든)", () => {
    const items = [item({ readable: false })];
    expect(paperFor(DAY, items, undefined)).toEqual({ kind: "unreadable" });
    expect(paperFor(DAY, items, { day: DAY, entry })).toEqual({ kind: "unreadable" });
  });

  it("PAP3 — 목록 readable + 읽기 결과 없음 또는 다른 날 → loading (늦게 온 결과는 버린다)", () => {
    expect(paperFor(DAY, [item()], undefined)).toEqual({ kind: "loading" });
    expect(paperFor(DAY, [item()], { day: OTHER, entry: { ...entry, date: OTHER } })).toEqual({
      kind: "loading",
    });
  });

  it("PAP4 — 목록 readable + 같은 날 entry null → unreadable (빈 일기를 지어내지 않는다)", () => {
    expect(paperFor(DAY, [item()], { day: DAY, entry: null })).toEqual({ kind: "unreadable" });
  });

  it("PAP5 — 목록 readable + 같은 날 entry → readable (그 entry 그대로)", () => {
    const paper = paperFor(DAY, [item()], { day: DAY, entry });
    expect(paper.kind).toBe("readable");
    if (paper.kind === "readable") expect(paper.entry).toBe(entry);
  });

  it("PAP6 — 순수 함수다: 시계·파일·저장소에 닿지 않는다 (소스 검사)", () => {
    const code = readFileSync(join(__dirname, "../../src/app/written-day.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/new Date\(/);
    expect(code).not.toMatch(/Date\.now\(/);
    expect(code).not.toMatch(/expo-file-system/);
    expect(code).not.toMatch(/\bstore\b/);
  });
});

/**
 * 051 수정 — 쓴 날의 「다시 쓰기」 바는 지면 끝에 닿아야 올라온다(보드 `2c` ④, `5b` 4px). 짧은 본문은
 * 처음부터 끝이다(`2k`). 움직임 자체는 실기기에서 본다(C9).
 */
describe("END — 지면 끝 판정 (reachedEnd)", () => {
  it("END1 — 끝에서 4px 이내면 참, 그보다 위면 거짓", () => {
    expect(reachedEnd(596, 400, 1000)).toBe(true);
    expect(reachedEnd(600, 400, 1000)).toBe(true);
    expect(reachedEnd(595, 400, 1000)).toBe(false);
    expect(reachedEnd(0, 400, 1000)).toBe(false);
  });

  it("END2 — 본문이 화면보다 짧으면 처음부터 끝이다", () => {
    expect(reachedEnd(0, 800, 500)).toBe(true);
  });

  it("END3 — 아직 재지 못했으면(높이 0) 끝이 아니다", () => {
    expect(reachedEnd(0, 0, 500)).toBe(false);
    expect(reachedEnd(0, 800, 0)).toBe(false);
  });
});

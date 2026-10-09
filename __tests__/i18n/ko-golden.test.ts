/**
 * 062 — 한국어 화면 문구가 이관 전과 바이트 동일하다 (contracts/i18n.md G1·G2, spec FR-020·SC-001).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **골든은 이관을 시작하기 전 커밋의 코드에서 만들었다**(tasks T004·T005). 이 파일을 고쳐 골든을 다시 쓰면 「이전」이 사라진다 —
 * `GOLDEN_WRITE=1`로 다시 쓰는 일은 문구를 일부러 바꿀 때만이다(그때는 이 기능의 「변화 0」이 깨진 것이므로 스펙을 먼저 고친다).
 *
 * - **G1** — 화면 문구 리터럴의 집합(중복 제거, `${…}`는 `${}`). 이관 뒤 `src/i18n/catalogs/ko/`에서 뽑은 집합이 골든과 같다.
 *   같은 글자를 두 자리가 따로 갖던 것을 카탈로그 항목 하나로 합치는 것은 문구 변화가 아니라서 집합으로 비교한다.
 * - **G2** — 문구를 만드는 함수·상수의 대표 입력 결과. 상수는 `JSON.stringify`로 키↔값 짝까지 본다(배선이 엇갈리는 것을 잡는다).
 *
 * **명시 차이** (G1 골든을 만들 때 대상에서 뺀 것):
 * - `src/app/failure-text.ts` — 죽은 코드(import하는 곳 0). 화면에 닿지 않아 골든 대상이 아니고 062에서 지운다(research R5).
 * - `src/onboarding/requirements.ts`의 `neededBy` 넷 — 화면에 안 보이는 문서용 필드라 062에서 주석으로 옮긴다.
 * - 새 진단 언어 줄(FR-011b)의 문구는 골든 뒤에 더한 것이라 `ADDED_AFTER_GOLDEN`으로만 허용한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { koLiterals, ROOT } from "./ko-literals";

import { failureLines, probeCells, storageValue } from "../../src/app/diagnostics-view";
import { DIAGNOSTICS_TEXT } from "../../src/app/diagnostics-text";
import { TOAST_TEXT } from "../../src/app/failure-toast";
import { SKIPPED_LINE, skippedLineText } from "../../src/app/skipped-line";
import { formatTargetHour, previewSentence, timeZoneLine } from "../../src/app/target-hour";
import type { DiaryListItem } from "../../src/app/state";
import { pickMonologue } from "../../src/diary/monologue";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import { autoWriteDoneText } from "../../src/schedule/notification-text";
import { emptyDay, richDay } from "../../src/signals/fake";
import { DEVELOPER_TEXT } from "../../src/ui/developer-text";
import {
  CALENDAR_WEEKDAYS,
  DATE_JUMP,
  MATERIAL_TEXT,
  OVERWRITE_CONFIRM,
  WRITING_TEXT,
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
import { BACK_CHEVRON, SETTINGS_TEXT, wipeTitle } from "../../src/ui/settings-text";

const LITERALS_GOLDEN = join(__dirname, "ko-literals.golden.json");
const OUTPUTS_GOLDEN = join(__dirname, "ko-outputs.golden.json");
const WRITE = process.env.GOLDEN_WRITE === "1";

/**
 * G1 골든은 이관 전 화면 문구가 있던 스물두 파일(research R5 「화면 문구」 갈래 — `src/ui/home-text.ts`·`settings-text.ts`·
 * `developer-text.ts`, `src/app/diagnostics-text.ts`·`diagnostics-view.ts`·`failure-toast.ts`·`target-hour.ts`·`skipped-line.ts`,
 * `src/diary/monologue.ts`, `src/onboarding/requirements.ts`, `src/schedule/notification-text.ts`·`notification-port.ts`, 한글 리터럴이
 * 있던 `src/ui/*.tsx` 아홉, `App.tsx`)에서 뽑았다. 이관 뒤에는 그 문구가 전부 `src/i18n/catalogs/ko/`에 있어야 한다(T027) —
 * 카탈로그 밖에 남은 화면 문구는 `boundaries.test.ts`(B1)와 헌법 검사가 잡는다.
 *
 * 골든을 만들 때 뺀 것: `requirements.ts`의 `neededBy` 넷(화면에 안 보이는 문서용 필드 — 062에서 주석으로 옮겼다).
 */

/** 골든 뒤에 더한 문구 — 새 진단 언어 줄(FR-011b), 064 상태 흉내(`catalogs/ko/simulation.ts`), 067 사진 확대 화면(`catalogs/ko/photo-viewer.ts`), 068 iOS 배터리 행(`catalogs/ko/settings-platform.ts`) */
const ADDED_AFTER_GOLDEN: readonly string[] = [
  "언어",
  "한국어",
  "상태 흉내",
  "오늘 날짜",
  "실패 토스트 보기",
  "쓸 재료 0으로 보기",
  "사진 권한 없음으로 보기",
  "상태 흉내가 켜져 있어서 일기를 쓰지 않아요. 개발자 화면에서 끌 수 있어요.",
  "끄기",
  "닫기",
  "사진 크게 보기",
  "저전력 모드를 끄면 제때 써요",
];

/** 한국어 카탈로그 파일 전부 */
function catalogFiles(): string[] {
  const dir = "src/i18n/catalogs/ko";
  return readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => `${dir}/${f}`);
}

function currentLiterals(): string[] {
  const set = new Set(koLiterals(catalogFiles()));
  for (const x of ADDED_AFTER_GOLDEN) set.delete(x);
  return [...set].sort();
}

const item = (over: Partial<DiaryListItem>): DiaryListItem => ({
  day: "2026-09-13",
  readable: true,
  photos: { kind: "unknown" } as DiaryListItem["photos"],
  ...over,
});

/** 단계·갈래마다 후보를 순서대로 전부 꺼낸다 — `random`을 0..1로 쓸어 인덱스를 하나씩 고른다 */
function monologueCandidates(
  stage: Parameters<typeof pickMonologue>[0],
  branch: Parameters<typeof pickMonologue>[1],
): string[] {
  const seen: string[] = [];
  for (let k = 0; k < 200; k += 1) {
    const line = pickMonologue(stage, branch, undefined, undefined, () => (k + 0.5) / 200);
    if (!seen.includes(line)) seen.push(line);
  }
  return seen;
}

function outputs(): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (label: string, value: unknown) => {
    out[label] = typeof value === "string" ? value : JSON.stringify(value);
  };

  // ── 홈 ──
  for (let d = 0; d < 7; d += 1) {
    put(`weekdayLong(${d})`, weekdayLong(d));
    put(`weekdayShort(${d})`, weekdayShort(d));
  }
  put("monthText(2026-08-31)", monthText("2026-08-31"));
  put("dayOfMonthText(2026-08-05)", dayOfMonthText("2026-08-05"));
  put("dayStateText(undefined, today)", dayStateText(undefined, true));
  put("dayStateText(undefined, past)", dayStateText(undefined, false));
  put("dayStateText(unreadable)", dayStateText(item({ readable: false }), false));
  put("dayStateText(title)", dayStateText(item({ title: "비 오는 날" }), false));
  put("dayStateText(no title)", dayStateText(item({}), true));
  put("calendarMonthText(9)", calendarMonthText({ year: 2026, month: 9 } as never));
  put("calendarYearText(2026)", calendarYearText(2026));
  put("CALENDAR_WEEKDAYS", CALENDAR_WEEKDAYS);
  put("OVERWRITE_CONFIRM", OVERWRITE_CONFIRM);
  put("DATE_JUMP", DATE_JUMP);
  put("WRITTEN_DAY_TEXT", WRITTEN_DAY_TEXT);
  put("WRITING_TEXT", WRITING_TEXT);
  put("WRITING_TEXT.byline(금동이)", WRITING_TEXT.byline("금동이"));
  put("WRITING_TEXT.byline(뽀삐)", WRITING_TEXT.byline("뽀삐"));
  put("WRITING_TEXT.byline(Momo)", WRITING_TEXT.byline("Momo"));
  put("MATERIAL_TEXT", MATERIAL_TEXT);
  const now = new Date(2026, 9, 6, 15, 0, 0);
  for (const minutes of [0, 0.5, 5, 59, 60, 135]) {
    put(
      `writtenAtText(-${minutes}m)`,
      writtenAtText(new Date(now.getTime() - minutes * 60_000), now),
    );
  }
  put("writtenAtText(future)", writtenAtText(new Date(now.getTime() + 60_000), now));
  put("TOAST_TEXT", TOAST_TEXT);

  // ── 설정 ──
  put("SETTINGS_TEXT", SETTINGS_TEXT);
  put("wipeTitle(3)", wipeTitle(3));
  put("BACK_CHEVRON", BACK_CHEVRON);
  for (const h of [0, 9, 12, 22]) {
    for (const f of ["h12", "h24"] as const) {
      put(`formatTargetHour(${h},${f})`, formatTargetHour(h, f));
      put(`previewSentence(${h},${f})`, previewSentence(h, f));
    }
  }
  put("timeZoneLine(Seoul)", timeZoneLine("Asia/Seoul", 540));
  put("timeZoneLine(Paris)", timeZoneLine("Europe/Paris", 120));
  put("timeZoneLine(New_York)", timeZoneLine("America/New_York", -240));
  put("timeZoneLine(Kolkata)", timeZoneLine("Asia/Kolkata", 330));
  put("timeZoneLine(null)", timeZoneLine(null, 0));
  put("SKIPPED_LINE", SKIPPED_LINE);
  put("skippedLineText(yesterday)", skippedLineText("2026-10-05", now));
  put("skippedLineText(other)", skippedLineText("2026-09-11", now));

  // ── 알림 ──
  put("autoWriteDoneText(금동이)", autoWriteDoneText("금동이", "2026-10-01"));
  put("autoWriteDoneText(뽀삐)", autoWriteDoneText("뽀삐", "2026-09-30"));
  put("autoWriteDoneText(Momo)", autoWriteDoneText("Momo", "2026-01-05"));

  // ── 혼잣말 ──
  for (const [stage, branch] of [
    ["signals", undefined],
    ["vision", "normal"],
    ["vision", "many"],
    ["load", "cold"],
    ["load", "hot"],
    ["generation", undefined],
  ] as const) {
    put(`monologue(${stage},${branch})`, monologueCandidates(stage, branch as never));
  }

  // ── 온보딩 권한 ──
  for (const r of PERMISSION_REQUIREMENTS) {
    put(`permission(${r.key}).rationale`, r.rationale);
    put(`permission(${r.key}).ifDenied`, r.ifDenied);
  }

  // ── 개발자·진단 ──
  put("DEVELOPER_TEXT", DEVELOPER_TEXT);
  put("DEVELOPER_TEXT.redownloadCellular(2.0GB)", DEVELOPER_TEXT.redownloadCellular("2.0GB"));
  put("DIAGNOSTICS_TEXT", DIAGNOSTICS_TEXT);
  put("DIAGNOSTICS_TEXT.storageOk(11)", DIAGNOSTICS_TEXT.storageOk(11));
  put("DIAGNOSTICS_TEXT.storageBad(13,1)", DIAGNOSTICS_TEXT.storageBad(13, 1));
  put("DIAGNOSTICS_TEXT.previewFailed(x)", DIAGNOSTICS_TEXT.previewFailed("x"));
  put("storageValue(ok)", storageValue({ kind: "done", total: 11, unreadable: 0 }));
  put("storageValue(bad)", storageValue({ kind: "done", total: 13, unreadable: 1 }));
  put("probeCells(rich)", probeCells(richDay("2026-10-05")));
  put("probeCells(empty)", probeCells(emptyDay("2026-10-05")));
  put(
    "failureLines",
    failureLines([
      { reason: "module", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "photos", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "empty", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "save", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "unwritten", at: new Date(2026, 0, 2, 23, 59) },
    ]),
  );
  return out;
}

describe("062 G1 — 화면 문구 리터럴 집합이 이관 전과 같다", () => {
  it("골든과 같다", () => {
    const now = currentLiterals();
    if (WRITE) writeFileSync(LITERALS_GOLDEN, JSON.stringify(now, null, 2) + "\n");
    const golden = JSON.parse(readFileSync(LITERALS_GOLDEN, "utf8")) as string[];
    expect(now).toEqual(golden);
  });
});

describe("062 G2 — 문구 함수·상수의 출력이 이관 전과 바이트 동일하다", () => {
  it("골든과 같다", () => {
    const now = outputs();
    if (WRITE) writeFileSync(OUTPUTS_GOLDEN, JSON.stringify(now, null, 2) + "\n");
    const golden = JSON.parse(readFileSync(OUTPUTS_GOLDEN, "utf8")) as Record<string, string>;
    expect(now).toEqual(golden);
  });
});

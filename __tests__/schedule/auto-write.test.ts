import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { CountHint, DayPreview, PhotoAccess } from "../../src/app/state";
import { decideAutoWrite, resolveAutoWrite } from "../../src/schedule/auto-write";
import type { ScheduleDecision } from "../../src/schedule/decision";
import type { SkipStorePort } from "../../src/schedule/skip-store";

/**
 * 자동 쓰기 판정 (057).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md AW1~AW7
 *       spec.md FR-001~FR-009, Clarifications Q1
 *
 * 판정 순서: 020이 돌 일 없음 → 사진 권한 없음 → 053 재료 판정(있으면 쓴다) → 재료 없음.
 */

const DAY = "2026-09-14";
const ACT: ScheduleDecision = { act: true, day: DAY };

function preview(
  photos: CountHint,
  places: CountHint,
  photoAccess: PhotoAccess = "ok",
): DayPreview {
  return { day: DAY, photos, places, photoAccess };
}

const known = (count: number): CountHint => ({ kind: "known", count });
const NONE: CountHint = { kind: "none" };
const UNKNOWN: CountHint = { kind: "unknown" };

describe("AW1 — 020이 돌 일 없음이면 idle", () => {
  it.each(["disabled", "not-near-target", "all-written"] as const)(
    "%s → idle(이유 보존)",
    (reason) => {
      expect(
        decideAutoWrite({ schedule: { act: false, reason }, preview: preview(known(3), known(1)) }),
      ).toEqual({ kind: "idle", reason });
    },
  );
});

describe("AW2 — 사진 권한이 없으면 먼저 건너뛴다", () => {
  it.each(["denied", "blocked"] as const)("%s → no-photo-access (사진 수와 무관)", (access) => {
    expect(
      decideAutoWrite({ schedule: ACT, preview: preview(known(5), known(2), access) }),
    ).toEqual({ kind: "skip", day: DAY, because: "no-photo-access" });
    expect(decideAutoWrite({ schedule: ACT, preview: preview(UNKNOWN, UNKNOWN, access) })).toEqual({
      kind: "skip",
      day: DAY,
      because: "no-photo-access",
    });
  });
});

describe("AW3 — 재료가 하나라도 있으면 쓴다", () => {
  it("사진 1장 이상", () => {
    expect(decideAutoWrite({ schedule: ACT, preview: preview(known(1), known(0)) })).toEqual({
      kind: "write",
      day: DAY,
    });
  });

  it("위치만 모르고 사진이 있으면 쓴다 (Clarification Q1)", () => {
    expect(decideAutoWrite({ schedule: ACT, preview: preview(known(3), UNKNOWN) })).toEqual({
      kind: "write",
      day: DAY,
    });
  });

  it("사진은 없고 장소가 있으면 쓴다", () => {
    expect(decideAutoWrite({ schedule: ACT, preview: preview(NONE, known(1)) })).toEqual({
      kind: "write",
      day: DAY,
    });
  });
});

describe("AW4 — 관측된 0·셀 수 없음뿐이면 재료 없음", () => {
  it.each([
    ["사진 0·장소 모름", known(0), UNKNOWN],
    ["사진 모름·장소 모름 (권한은 있는데 못 읽음)", UNKNOWN, UNKNOWN],
    ["053 승격된 미리보기 — 사진 none·장소 none (FR-005)", NONE, NONE],
    ["사진 0·장소 0", known(0), known(0)],
  ])("%s → no-material", (_label, photos, places) => {
    expect(decideAutoWrite({ schedule: ACT, preview: preview(photos, places) })).toEqual({
      kind: "skip",
      day: DAY,
      because: "no-material",
    });
  });
});

function memorySkipPort() {
  const saved: string[] = [];
  const port: SkipStorePort = {
    read: async () => null,
    write: async (s) => {
      saved.push(s);
    },
    remove: async () => {},
  };
  return { port, saved };
}

const SETTINGS = { enabled: true, targetHour: 21 };
const NOW = new Date(2026, 8, 14, 21, 30);

describe("AW6 — resolveAutoWrite: 조합과 기록", () => {
  it("돌 일이 없으면 신호를 읽지 않는다", async () => {
    const previewDay = jest.fn();
    const { port, saved } = memorySkipPort();
    const result = await resolveAutoWrite({
      settings: { enabled: false, targetHour: 21 },
      now: NOW,
      listDiaryDays: async () => [],
      previewDay,
      skipPort: port,
    });
    expect(result).toEqual({ kind: "idle", reason: "disabled" });
    expect(previewDay).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it("사진 권한 없음이면 그 날을 한 번 기록한다", async () => {
    const { port, saved } = memorySkipPort();
    const result = await resolveAutoWrite({
      settings: SETTINGS,
      now: NOW,
      listDiaryDays: async () => [],
      previewDay: async (day) => ({ day, photos: UNKNOWN, places: UNKNOWN, photoAccess: "denied" }),
      skipPort: port,
    });
    expect(result).toEqual({ kind: "skip", day: DAY, because: "no-photo-access" });
    expect(saved.map((s) => JSON.parse(s))).toEqual([{ day: DAY }]);
  });

  it("재료 없음·쓰기는 기록하지 않는다", async () => {
    for (const photos of [known(0), known(2)]) {
      const { port, saved } = memorySkipPort();
      await resolveAutoWrite({
        settings: SETTINGS,
        now: NOW,
        listDiaryDays: async () => [],
        previewDay: async (day) => ({ day, photos, places: UNKNOWN, photoAccess: "ok" }),
        skipPort: port,
      });
      expect(saved).toHaveLength(0);
    }
  });

  it("기록이 실패해도 결정은 같다", async () => {
    const port: SkipStorePort = {
      read: async () => null,
      write: () => Promise.reject(new Error("disk")),
      remove: async () => {},
    };
    const result = await resolveAutoWrite({
      settings: SETTINGS,
      now: NOW,
      listDiaryDays: async () => [],
      previewDay: async (day) => ({
        day,
        photos: UNKNOWN,
        places: UNKNOWN,
        photoAccess: "blocked",
      }),
      skipPort: port,
    });
    expect(result).toEqual({ kind: "skip", day: DAY, because: "no-photo-access" });
  });

  it("이미 쓴 날만 남으면 idle(all-written)", async () => {
    const previewDay = jest.fn();
    const result = await resolveAutoWrite({
      settings: SETTINGS,
      now: NOW,
      listDiaryDays: async () => ["2026-09-11", "2026-09-12", "2026-09-13", DAY],
      previewDay,
      skipPort: memorySkipPort().port,
    });
    expect(result).toEqual({ kind: "idle", reason: "all-written" });
    expect(previewDay).not.toHaveBeenCalled();
  });
});

const SOURCE = readFileSync(join(__dirname, "../../src/schedule/auto-write.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("AW5·AW7 — 소스 계약", () => {
  it("053 재료 판정을 그대로 쓴다 — 자기 규칙을 두지 않는다", () => {
    expect(CODE).toMatch(/\bdecideMaterial\b/);
    expect(CODE).toMatch(/\bfromCountHint\b/);
    expect(CODE).not.toMatch(/count\s*>=?/);
  });

  it("AppState·new Date()를 쓰지 않는다 (now를 인자로)", () => {
    expect(CODE).not.toMatch(/\bAppState\b/);
    expect(CODE).not.toMatch(/new Date\(/);
  });
});

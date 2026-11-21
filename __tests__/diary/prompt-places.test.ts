/**
 * 121 — 일기 기록의 장소 줄 (contracts/diary-places.md PL1~PL8, spec FR-005·FR-006).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PromptPlaces } from "../../src/diary/place-lines";
import { buildPrompt } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import type { DiaryRequest } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";

const DAY = "2026-01-15";
const SIGNALS: DaySignals = {
  date: DAY,
  photos: {
    kind: "known",
    value: {
      photos: ["08:10", "13:20", "19:05"].map((t, i) => ({
        id: `p${i}`,
        takenAt: new Date(`${DAY}T${t}:00`),
      })),
      complete: true,
    },
  },
  places: {
    kind: "known",
    value: {
      trace: { visitCount: 3, approximateDistanceMeters: 21000, visits: [] },
      source: "photo-exif",
      photosWithLocation: 3,
      photosConsidered: 3,
    },
  },
  steps: { kind: "unknown", reason: "-" },
  battery: { kind: "unknown", reason: "-" },
  connectivity: { kind: "unknown", reason: "-" },
};

function req(places?: PromptPlaces, character: "quiet" = "quiet"): DiaryRequest {
  const r = buildRequest(SIGNALS, character, "quick", DAY, new Date(`${DAY}T23:59:00`));
  if (!r.ok) throw new Error("준비 실패");
  return places === undefined ? r.request : { ...r.request, places };
}

const lines = (places?: PromptPlaces) => buildPrompt(req(places)).split("\n");

describe("PL1~PL3 — 장소 줄", () => {
  it("PL1 — 한 곳", () => {
    expect(lines({ items: [{ period: "morning", label: "판교역" }], more: 0 })).toContain(
      "사진은 오전에 판교역 근처에서 찍혔어요.",
    );
  });

  it("PL1 — 이름 없는 한 곳은 「근처」를 붙이지 않는다", () => {
    expect(lines({ items: [{ period: "night", label: null }], more: 0 })).toContain(
      "사진은 밤에 이름을 모르는 곳에서 찍혔어요.",
    );
  });

  it("PL2 — 세 곳 시각순", () => {
    expect(
      lines({
        items: [
          { period: "morning", label: "판교역" },
          { period: "afternoon", label: "서울숲" },
          { period: "evening", label: "망원한강공원" },
        ],
        more: 0,
      }),
    ).toContain(
      "사진은 오전에 판교역 근처, 오후에 서울숲 근처, 저녁에 망원한강공원 근처에서 찍혔어요.",
    );
  });

  it("PL3 — 넘친 수", () => {
    const out = lines({
      items: [
        { period: "morning", label: "가" },
        { period: "afternoon", label: null },
        { period: "evening", label: "다" },
      ],
      more: 2,
    });
    const i = out.indexOf(
      "사진은 오전에 가 근처, 오후에 이름을 모르는 곳, 저녁에 다 근처에서 찍혔어요.",
    );
    expect(i).toBeGreaterThan(-1);
    expect(out[i + 1]).toBe("그 밖에 두 곳에서도 찍혔어요.");
  });

  it("장소 줄은 자리 한계 문장 뒤에 온다", () => {
    const out = lines({ items: [{ period: "morning", label: "판교역" }], more: 0 });
    const limit = out.indexOf("이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니에요.");
    expect(limit).toBeGreaterThan(-1);
    expect(out[limit + 1]).toBe("사진은 오전에 판교역 근처에서 찍혔어요.");
  });
});

describe("PL5~PL7", () => {
  it("PL5 — places가 없으면 장소 이름 줄이 없고 자리 수 줄은 그대로", () => {
    const out = lines();
    expect(out.some((l) => l.includes("근처에서 찍혔"))).toBe(false);
    expect(out.some((l) => l.startsWith("자리는 세 곳에 남았고"))).toBe(true);
  });

  const SRC = readFileSync(join(__dirname, "../../src/diary/prompt.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("PL6 — 「다녀온 곳은」이 prompt.ts에 없다", () => {
    expect(SRC).not.toContain("다녀온 곳은");
  });

  it("PL7 — 장소 줄은 갔다·머물렀다·있었다를 사실로 쓰지 않는다", () => {
    const out = lines({
      items: [
        { period: "morning", label: "가" },
        { period: "afternoon", label: "나" },
      ],
      more: 1,
    });
    const placeLines = out.filter((l) => l.includes("찍혔어요") && l.includes("근처"));
    expect(placeLines.length).toBeGreaterThan(0);
    for (const l of [...placeLines, "그 밖에 한 곳에서도 찍혔어요."]) {
      expect(l).not.toMatch(/갔|머물|있었/);
    }
  });
});

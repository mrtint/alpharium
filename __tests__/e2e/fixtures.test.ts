import { existsSync } from "node:fs";
import { join } from "node:path";

import { dayBounds, dayOf } from "../../src/config/day-boundary";
import { deserializeEntry } from "../../src/diary/store";
import {
  FIXTURE_PACKAGE,
  FIXTURES_DIRECTORY,
  buildFixtureDiaries,
  fixturePhotoNames,
} from "../../scripts/layer1/fixtures";

/**
 * 069 — 층 1 픽스처: 오늘부터 연속 사흘의 쓴 날(오늘 1장·어제 3장·그제 1장).
 *
 * 계약: specs/069-e2e-layer1-screen-flows/data-model.md 「쓴 날 픽스처」
 *
 * 가짜 추론이 아니다 — 앱의 **읽기 경로**만 실제 코드를 탄다. 그래서 여기서 실제 `deserializeEntry`를 통과하는지 본다.
 * 저장 형식이 바뀌면 이 테스트가 먼저 깨진다.
 */

const NOW = new Date(2026, 9, 10, 14, 30);
const TODAY = dayOf(NOW);
const files = buildFixtureDiaries(NOW);

const byOffset = (offset: number) => {
  const day = dayOf(new Date(2026, 9, 10 - offset, 12));
  const file = files.find((f) => f.name === `${day}.json`);
  if (file === undefined) throw new Error(`픽스처에 ${day}가 없다`);
  return { day, file, entry: deserializeEntry(file.content) };
};

describe("층 1 픽스처 (069)", () => {
  it("F1 — 오늘·어제·그제 세 편이고 파일 이름이 YYYY-MM-DD.json이다", () => {
    expect(files.map((f) => f.name).sort()).toEqual(
      [0, 1, 2].map((o) => `${dayOf(new Date(2026, 9, 10 - o, 12))}.json`).sort(),
    );
    expect(TODAY).toBe("2026-10-10");
  });

  it.each([
    [0, 1],
    [1, 3],
    [2, 1],
  ])("F2 — %i일 전 일기는 실제 deserializeEntry를 통과하고 사진이 %i장이다", (offset, count) => {
    const { day, entry } = byOffset(offset);
    expect(entry.date).toBe(day);
    expect(entry.character).toBe("quiet");
    expect(entry.text.length).toBeGreaterThan(0);
    expect(entry.photos).toHaveLength(count);
    const observed = entry.signalsUsed.photos;
    expect(observed.kind).toBe("known");
    if (observed.kind === "known") expect(observed.value.photos).toHaveLength(count);
  });

  it("F3 — resizedPath는 앱 절대 경로 형식이고 photoId는 e2e-<날>-<번호>다", () => {
    for (const offset of [0, 1, 2]) {
      const { entry } = byOffset(offset);
      entry.photos?.forEach((photo, index) => {
        expect(photo.photoId).toBe(`e2e-${offset}-${index + 1}`);
        expect(photo.resizedPath).toBe(
          `/data/user/0/${FIXTURE_PACKAGE}/files/vision-cache/${photo.photoId}.jpg`,
        );
      });
    }
  });

  it("F4 — createdAt·takenAt은 각자의 날 안이다 (하루 경계는 day-boundary 하나)", () => {
    for (const offset of [0, 1, 2]) {
      const { day, entry } = byOffset(offset);
      const { startMs, endMs } = dayBounds(day);
      const inside = (d: Date) => d.getTime() >= startMs && d.getTime() < endMs;
      expect(inside(entry.createdAt)).toBe(true);
      entry.photos?.forEach((p) => expect(inside(p.takenAt)).toBe(true));
    }
  });

  it("F5 — 모든 사진 사본 이름이 scripts/e2e-fixtures/photos/ 에 실제로 있다", () => {
    const names = fixturePhotoNames(NOW);
    expect(names).toHaveLength(5);
    for (const name of names) {
      expect(existsSync(join(process.cwd(), FIXTURES_DIRECTORY, "photos", name))).toBe(true);
    }
  });

  it("F6 — 남은 자리표시자가 없다", () => {
    for (const f of files) expect(f.content).not.toMatch(/\{\{|\}\}/);
  });
});

/**
 * T041 ⚖️ 원칙 IV — 로컬 저장·조회 (001 SC-002·SC-008, 005 FR-404·FR-470)
 *
 * - 저장 후 조회 가능
 * - 기기 식별자 미포함 (005 FR-404)
 * - 날짜당 **보이는 일기가 최대 한 편** (001 SC-008)
 */
import { Repository } from "../../src/storage/repository";
import { InMemoryKeyValueStore } from "../../src/storage/kv";
import { createBundle, Visibility } from "../../src/storage/bundle";
import { createDigest } from "../../src/signals/digest";
import { createDiaryEntry } from "../../src/inference/diary";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";
import { STORAGE_FORMAT_VERSION, readFormatVersion } from "../../src/storage/version";

const bundleOn = (date: string, body = "주인은 걸었다.", visibility = Visibility.Visible) =>
  createBundle({
    diary: createDiaryEntry({ date, personaName: "네모", body }),
    digest: createDigest({
      date,
      observedAt: `${date}T18:30:00+09:00`,
      steps: observed(4210),
      activePeriods: observed(["저녁"]),
      stays: observed([{ place: "집", period: observed("저녁") }]),
      moved: observed(true),
      photos: unobserved(),
      events: unobserved(),
      scale: ScaleVerdict.Normal,
    }),
    visibility,
  });

describe("저장 후 조회 (001 SC-002, 005 FR-470)", () => {
  it("저장한 묶음을 날짜로 조회할 수 있다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundleOn("2026-08-02"));

    const found = await repo.findByDate("2026-08-02");
    expect(found?.diary.body).toBe("주인은 걸었다.");
    expect(found?.digest.date).toBe("2026-08-02");
  });

  it("없는 날짜를 조회하면 null이다 — 오류가 아니다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    expect(await repo.findByDate("2026-01-01")).toBeNull();
  });

  it("보이는 기록의 목록을 조회할 수 있다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundleOn("2026-08-01"));
    await repo.save(bundleOn("2026-08-02"));

    const list = await repo.listVisible();
    expect(list).toHaveLength(2);
    expect(list.map((b) => b.diary.date).sort()).toEqual(["2026-08-01", "2026-08-02"]);
  });

  it("기록이 없으면 빈 목록이다 — 오류가 아니다 (006 FR-506)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    expect(await repo.listVisible()).toEqual([]);
  });

  it("일기와 집계가 짝지어진 채로 조회된다 (001 FR-032)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundleOn("2026-08-02"));

    const found = await repo.findByDate("2026-08-02");
    expect(found!.diary.date).toBe(found!.digest.date);
  });
});

describe("기기 식별자를 포함하지 않는다 (005 FR-404)", () => {
  it("저장된 원문에 기기 식별자가 없다", async () => {
    const kv = new InMemoryKeyValueStore();
    const repo = new Repository(kv);
    await repo.save(bundleOn("2026-08-02"));

    const raw = JSON.stringify([...kv.snapshot()]);
    expect(raw).not.toMatch(/deviceId|installationId|androidId|serial|imei/i);
  });

  it("저장 키가 기기에 종속되지 않는다 — 옮기면 그대로 읽힌다 (001 SC-002)", async () => {
    const kv = new InMemoryKeyValueStore();
    await new Repository(kv).save(bundleOn("2026-08-02"));

    // 기기 교체 — 저장된 내용만 옮긴다.
    const onNewDevice = new Repository(new InMemoryKeyValueStore(kv.snapshot()));
    expect((await onNewDevice.findByDate("2026-08-02"))?.diary.body).toBe("주인은 걸었다.");
  });

  it("원본 로그가 저장되지 않는다 (005 FR-402, 001 SC-004)", async () => {
    const kv = new InMemoryKeyValueStore();
    await new Repository(kv).save(bundleOn("2026-08-02"));

    const raw = JSON.stringify([...kv.snapshot()]);
    expect(raw).not.toMatch(/lat|lon|uri|exif|rawLog|attendee/i);
  });
});

describe("날짜당 보이는 일기는 최대 한 편이다 (001 SC-008)", () => {
  it("같은 날짜에 두 번 저장하면 보이는 것은 하나다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundleOn("2026-08-02", "첫 번째다."));
    await repo.save(bundleOn("2026-08-02", "두 번째다."));

    const list = await repo.listVisible();
    expect(list.filter((b) => b.diary.date === "2026-08-02")).toHaveLength(1);
    expect((await repo.findByDate("2026-08-02"))?.diary.body).toBe("두 번째다.");
  });

  it("숨겨진 기록은 목록에 나오지 않는다 (005 FR-470)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundleOn("2026-08-01", "숨겨진 것", Visibility.Hidden));
    await repo.save(bundleOn("2026-08-02", "보이는 것"));

    const list = await repo.listVisible();
    expect(list).toHaveLength(1);
    expect(list[0].diary.body).toBe("보이는 것");
  });

  it("숨겨진 기록이 있어도 그 날짜의 보이는 일기는 최대 한 편이다 (001 FR-030)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundleOn("2026-08-02", "숨겨진 것", Visibility.Hidden));

    // 같은 날짜에 보이는 기록이 새로 생겨도 공존한다.
    expect(await repo.findByDate("2026-08-02")).toBeNull();
  });
});

describe("저장소 형식 버전 (005 FR-403)", () => {
  it("저장하면 형식 버전이 기록된다", async () => {
    const kv = new InMemoryKeyValueStore();
    await new Repository(kv).save(bundleOn("2026-08-02"));
    expect(await readFormatVersion(kv)).toBe(STORAGE_FORMAT_VERSION);
  });
});

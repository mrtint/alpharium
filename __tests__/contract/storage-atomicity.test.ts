/**
 * T039 ⚖️ 원칙 IV — 저장 원자성 (001 FR-032, 005 FR-411·FR-412)
 *
 * 기록 묶음 저장은 **전부 성공하거나 전부 실패**한다. 저장 도중 중단되면 일기와
 * 집계가 **함께 남거나 함께 남지 않는다** — 일기만 있고 근거가 없는 상태를 만들지
 * 않는다.
 */
import { Repository, StorageError } from "../../src/storage/repository";
import { InMemoryKeyValueStore } from "../../src/storage/kv";
import { createBundle } from "../../src/storage/bundle";
import { createDigest } from "../../src/signals/digest";
import { createDiaryEntry } from "../../src/inference/diary";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";

const DATE = "2026-08-02";

const bundle = (body = "주인은 저녁에 걸었다.") =>
  createBundle({
    diary: createDiaryEntry({ date: DATE, personaName: "네모", body }),
    digest: createDigest({
      date: DATE,
      observedAt: "2026-08-02T18:30:00+09:00",
      steps: observed(4210),
      activePeriods: observed(["저녁"]),
      stays: unobserved(),
      moved: observed(true),
      photos: unobserved(),
      events: unobserved(),
      scale: ScaleVerdict.Normal,
    }),
  });

describe("전부 성공하거나 전부 실패한다 (005 FR-411)", () => {
  it("성공하면 일기와 집계가 함께 남는다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundle());

    const found = await repo.findByDate(DATE);
    expect(found?.diary).toBeDefined();
    expect(found?.digest).toBeDefined();
  });

  it("쓰기가 실패하면 아무것도 남지 않는다 (005 FR-412)", async () => {
    const kv = new InMemoryKeyValueStore();
    kv.failNextWrite = true;
    const repo = new Repository(kv);

    await expect(repo.save(bundle())).rejects.toBeInstanceOf(StorageError);

    expect(await repo.findByDate(DATE)).toBeNull();
    expect(await repo.listVisible()).toHaveLength(0);
  });

  it("저장 도중 중단되어도 일기만 남는 상태가 생기지 않는다 (001 FR-032)", async () => {
    const kv = new InMemoryKeyValueStore();
    // 매체가 일부만 쓰고 중단한다.
    kv.interruptWriteAfter = 1;
    const repo = new Repository(kv);

    await expect(repo.save(bundle())).rejects.toBeInstanceOf(StorageError);

    const found = await repo.findByDate(DATE);
    // 함께 남거나 함께 남지 않는다 — 한쪽만 남는 상태가 없다.
    if (found !== null) {
      expect(found.diary).toBeDefined();
      expect(found.digest).toBeDefined();
    } else {
      expect(await repo.listVisible()).toHaveLength(0);
    }
  });

  it("부분적으로 저장된 것을 남기지 않는다 (005 FR-412)", async () => {
    const kv = new InMemoryKeyValueStore();
    // 묶음 키를 쓰기도 전에 중단된다.
    kv.interruptWriteAfter = 0;
    const repo = new Repository(kv);

    await expect(repo.save(bundle())).rejects.toThrow();

    // 조회 경로에 반쪽짜리가 드러나지 않는다.
    expect(await repo.listVisible()).toHaveLength(0);
    expect(await repo.findByDate(DATE)).toBeNull();
  });

  it("어느 지점에서 중단되든 일기만 남는 상태가 없다 (001 FR-032)", async () => {
    // 묶음이 단일 값 하나로 쓰이므로, 중단 지점과 무관하게 일기와 집계가 갈리지 않는다.
    for (const stopAt of [0, 1, 2]) {
      const kv = new InMemoryKeyValueStore();
      kv.interruptWriteAfter = stopAt;
      const repo = new Repository(kv);

      await repo.save(bundle()).catch(() => undefined);

      const found = await repo.findByDate(DATE);
      if (found !== null) {
        expect(found.diary).toBeDefined();
        expect(found.digest).toBeDefined();
      }
    }
  });
});

describe("재저장에서도 원자성이 지켜진다 (001 FR-040b)", () => {
  it("덮어쓰기가 실패하면 이전 묶음이 그대로 남는다", async () => {
    const kv = new InMemoryKeyValueStore();
    const repo = new Repository(kv);
    await repo.save(bundle("첫 번째 본문이다."));

    kv.failNextWrite = true;
    await expect(repo.save(bundle("두 번째 본문이다."))).rejects.toThrow();

    const found = await repo.findByDate(DATE);
    expect(found?.diary.body).toBe("첫 번째 본문이다.");
    expect(found?.digest).toBeDefined();
  });

  it("덮어쓰기가 성공하면 일기와 집계가 함께 대체된다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    await repo.save(bundle("첫 번째 본문이다."));

    const second = createBundle({
      diary: createDiaryEntry({ date: DATE, personaName: "네모", body: "두 번째 본문이다." }),
      digest: createDigest({
        date: DATE,
        observedAt: "2026-08-02T22:00:00+09:00",
        steps: observed(9000),
        activePeriods: observed(["저녁", "밤"]),
        stays: unobserved(),
        moved: observed(true),
        photos: unobserved(),
        events: unobserved(),
        scale: ScaleVerdict.Normal,
      }),
    });
    await repo.save(second);

    const found = await repo.findByDate(DATE);
    expect(found?.diary.body).toBe("두 번째 본문이다.");
    // 001 SC-011 — 두 번째 일기가 두 번째 집계와 짝지어져 있다.
    expect(found?.digest.observedAt).toBe("2026-08-02T22:00:00+09:00");
  });
});

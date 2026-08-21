/**
 * DiaryStore 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/storage.md 「검증 표」
 *
 * 메모리 대역으로 돈다 — 기기가 필요 없다. 파일 구현은 같은 인터페이스를 만족하며,
 * 방식이 맞지 않으면 구현만 갈아끼우고 파이프라인은 그대로 둔다.
 *
 * **직렬화 왕복 테스트가 이 파일에서 가장 중요하다.** `SignalValue`가 합 타입이므로
 * 왕복에서 `unknown`이 `null`로 뭉개지면 "모름"이 "없음"이 되고, 그 순간 헌법 원칙 V가
 * 조용히 깨진다(SC-007).
 */

import {
  deserializeEntry,
  listDiaries,
  memoryStore,
  serializeEntry,
  type DiaryStore,
} from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { emptyDay, partiallyUnknownDay, richDay, unknownDay } from "../../src/signals/fake";
import type { DayDate } from "../../src/config/day-boundary";
import type { DaySignals } from "../../src/signals/types";

function entryFor(date: DayDate, text = `${date}의 일기`): DiaryEntry {
  return {
    date,
    text,
    character: "quiet",
    signalsUsed: partiallyUnknownDay(date),
    createdAt: new Date(`${date}T20:00:00`),
  };
}

describe("DiaryStore — 저장·조회·존재 확인", () => {
  // contracts/storage.md 「검증 표」 8행
  it("그 날짜에 일기 없음 → ok: true, overwrote: false (FR-022)", async () => {
    const store = memoryStore();
    const result = await store.save(entryFor("2026-08-12"));

    expect(result).toEqual({ ok: true, overwrote: false });
  });

  it("그 날짜에 일기 있음 → ok: true, overwrote: true (FR-023, FR-023a)", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-12", "먼저 쓴 일기"));
    const result = await store.save(entryFor("2026-08-12", "나중에 쓴 일기"));

    // 조용히 덮어쓰지 않는다. 덮어썼다는 사실이 호출자에게 드러난다.
    expect(result).toEqual({ ok: true, overwrote: true });
  });

  it("쓰기 실패 → ok: false, reason (FR-024)", async () => {
    const store = memoryStore({ failWith: "저장 공간이 없다" });
    const result = await store.save(entryFor("2026-08-12"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("저장 공간이 없다");
    }
  });

  it("load — 저장한 날짜는 저장한 것과 같은 값 (SC-007)", async () => {
    const store = memoryStore();
    const entry = entryFor("2026-08-12");
    await store.save(entry);

    expect(await store.load("2026-08-12")).toEqual(entry);
  });

  it("load — 없는 날짜는 null", async () => {
    const store = memoryStore();

    expect(await store.load("2026-08-12")).toBeNull();
  });

  it("has — 저장한 날짜는 true (FR-018f)", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-12"));

    expect(await store.has("2026-08-12")).toBe(true);
  });

  it("has — 없는 날짜는 false (FR-018f)", async () => {
    const store = memoryStore();

    expect(await store.has("2026-08-12")).toBe(false);
  });

  it("listDays — 세 날짜 저장하면 세 날짜 (FR-018f, SC-012)", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-10"));
    await store.save(entryFor("2026-08-12"));
    await store.save(entryFor("2026-08-11"));

    expect((await store.listDays()).sort()).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
  });
});

describe("불변식 — 한 날짜에 일기는 하나 (FR-023)", () => {
  it("같은 날짜로 두 번 저장해도 하나만 남는다", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-12", "첫 번째"));
    await store.save(entryFor("2026-08-12", "두 번째"));

    expect(await store.listDays()).toEqual(["2026-08-12"]);
    expect((await store.load("2026-08-12"))?.text).toBe("두 번째");
  });

  it("저장 실패는 기존 일기를 지우지 않는다 (FR-023b)", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-12", "지켜져야 할 일기"));

    store.failNextWith("쓰기 도중 중단됐다");
    const result = await store.save(entryFor("2026-08-12", "실패할 일기"));

    expect(result.ok).toBe(false);
    // 실패한 저장이 기존 일기를 앗아가지 않는다.
    expect((await store.load("2026-08-12"))?.text).toBe("지켜져야 할 일기");
  });

  it("저장 실패가 조용히 넘어가지 않는다 (FR-024)", async () => {
    const store = memoryStore({ failWith: "디스크 오류" });

    // 예외를 삼키지 않고 값으로 드러낸다.
    const result = await store.save(entryFor("2026-08-12"));
    expect(result.ok).toBe(false);
    expect(await store.has("2026-08-12")).toBe(false);
  });
});

describe("직렬화 왕복 — unknown이 살아남는다 (SC-007, 원칙 V)", () => {
  /**
   * ─────────────────────────────────────────────────────────────────────────
   * **이 describe가 이 파일의 방어선이다.**
   *
   * 직렬화가 `{ kind: 'unknown', reason }`을 `null`로 뭉개면 왕복 후 "모름"이 "없음"이
   * 되어버린다. 걸음 수는 안드로이드에서 늘 `unknown`이므로, 이것이 깨지면 저장된 모든
   * 일기가 "걷지 않은 하루"를 근거로 갖게 된다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  it("unknown이 왕복 후에도 unknown이다 — none으로 바뀌지 않는다", () => {
    const entry = entryFor("2026-08-12");
    const restored = deserializeEntry(serializeEntry(entry));

    expect(restored.signalsUsed.steps.kind).toBe("unknown");
    expect(restored.signalsUsed.steps).toEqual(entry.signalsUsed.steps);
  });

  it("unknown의 reason이 왕복에서 사라지지 않는다", () => {
    const entry = entryFor("2026-08-12");
    const restored = deserializeEntry(serializeEntry(entry));

    const steps = restored.signalsUsed.steps;
    expect(steps.kind).toBe("unknown");
    if (steps.kind === "unknown") {
      expect(steps.reason).toContain("안드로이드");
    }
  });

  it("none과 unknown이 왕복 후에도 서로 다르다", () => {
    const allNone = deserializeEntry(
      serializeEntry({ ...entryFor("2026-08-12"), signalsUsed: emptyDay("2026-08-12") }),
    );
    const allUnknown = deserializeEntry(
      serializeEntry({ ...entryFor("2026-08-12"), signalsUsed: unknownDay("2026-08-12") }),
    );

    expect(allNone.signalsUsed.photos.kind).toBe("none");
    expect(allUnknown.signalsUsed.photos.kind).toBe("unknown");
    expect(allNone.signalsUsed).not.toEqual(allUnknown.signalsUsed);
  });

  it("네 가지 신호 모양 모두 왕복에서 그대로다", () => {
    for (const make of [richDay, emptyDay, unknownDay, partiallyUnknownDay]) {
      const entry = { ...entryFor("2026-08-12"), signalsUsed: make("2026-08-12") };
      expect(deserializeEntry(serializeEntry(entry))).toEqual(entry);
    }
  });

  it("Date가 왕복에서 문자열로 바뀌지 않는다", () => {
    const entry = { ...entryFor("2026-08-12"), signalsUsed: richDay("2026-08-12") };
    const restored = deserializeEntry(serializeEntry(entry));

    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.createdAt.getTime()).toBe(entry.createdAt.getTime());

    const photos = restored.signalsUsed.photos;
    expect(photos.kind).toBe("known");
    if (photos.kind === "known") {
      expect(photos.value.photos[0].takenAt).toBeInstanceOf(Date);
      // 004: `complete`도 왕복에서 살아남아야 한다. 여기서 떨어지면 잘린 하루가
      // 온전한 것으로 되살아나고, 그것이 FR-014d가 막으려는 거짓이다.
      expect(photos.value.complete).toBe(true);
    }
  });

  it("잘린 사진 목록의 complete가 왕복에서 살아남는다", () => {
    // 004 FR-014d — 상한에 걸린 하루가 저장을 거쳐 「전부 봤다」로 되살아나면 안 된다.
    const day = richDay("2026-08-12");
    const truncated = {
      ...entryFor("2026-08-12"),
      signalsUsed: {
        ...day,
        photos: { kind: "known" as const, value: { photos: [], complete: false } },
      },
    };

    const restored = deserializeEntry(serializeEntry(truncated));
    const photos = restored.signalsUsed.photos;

    expect(photos.kind).toBe("known");
    if (photos.kind === "known") {
      expect(photos.value.complete).toBe(false);
    }
  });

  it("저장소를 거친 왕복에서도 unknown이 살아 있다", async () => {
    // 직렬화를 실제로 거치는 저장소에서 확인한다.
    const store = memoryStore({ serialized: true });
    const entry = entryFor("2026-08-12");
    await store.save(entry);

    const loaded = await store.load("2026-08-12");
    expect(loaded).toEqual(entry);
    expect(loaded?.signalsUsed.steps.kind).toBe("unknown");
  });
});

describe("저장된 일기에 모델 식별자·측정 지표가 없다 (원칙 III·IV)", () => {
  it("직렬화된 문자열에 모델 이름이 없다", () => {
    const serialized = serializeEntry(entryFor("2026-08-12")).toLowerCase();

    for (const forbidden of ["kanana", "exaone", "qwen", "gemma", "gguf", "llama"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("직렬화된 문자열에 속도·점수가 없다", () => {
    const serialized = serializeEntry(entryFor("2026-08-12")).toLowerCase();

    for (const forbidden of ["elapsed", "tokenspersec", "score", "benchmark"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

/**
 * 006 FR-017a — **목록은 읽을 수 없는 날짜도 잃지 않는다.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 조용히 빼면 「그날 일기가 없다」와 구분이 사라진다(원칙 V). 사용자는 일기를 쓴
 * 기억과 화면이 어긋나는 것을 설명할 방법이 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("listDiaries (006 FR-017·017a)", () => {
  it("저장된 날짜가 전부 나온다", async () => {
    const store = memoryStore();
    for (const day of ["2026-08-10", "2026-08-11", "2026-08-12"]) {
      await store.save(entryFor(day));
    }

    const items = await listDiaries(store);

    expect(items).toHaveLength(3);
    expect(items.every((item) => item.readable)).toBe(true);
  });

  it("최근 것이 먼저 나온다", async () => {
    const store = memoryStore();
    for (const day of ["2026-08-10", "2026-08-12", "2026-08-11"]) {
      await store.save(entryFor(day));
    }

    const items = await listDiaries(store);

    expect(items.map((item) => item.day)).toEqual(["2026-08-12", "2026-08-11", "2026-08-10"]);
  });

  it("일기가 없으면 빈 목록이다", async () => {
    expect(await listDiaries(memoryStore())).toEqual([]);
  });

  it("★ 읽을 수 없는 날짜가 목록에서 사라지지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-11"));
    await store.save(entryFor("2026-08-12"));

    // 한 날짜만 읽히지 않게 만든다 — 파일이 깨진 상황과 같다.
    const broken: DiaryStore = {
      ...store,
      load: async (day) => (day === "2026-08-11" ? null : store.load(day)),
    };

    const items = await listDiaries(broken);

    // **날짜는 남고 「읽을 수 없다」로 표시된다.** 빠지지 않는다.
    expect(items).toHaveLength(2);
    expect(items.find((item) => item.day === "2026-08-11")?.readable).toBe(false);
    expect(items.find((item) => item.day === "2026-08-12")?.readable).toBe(true);
  });

  it("읽다가 예외가 나도 날짜를 잃지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-12"));

    const throwing: DiaryStore = {
      ...store,
      load: async () => {
        throw new Error("읽을 수 없다");
      },
    };

    const items = await listDiaries(throwing);

    // 007: **읽지 못했으면 사진도 「모른다」다**(원칙 V) — 「없었다」가 아니다.
    // 파일을 못 읽었을 뿐이며 그날 사진이 있었는지는 알 수 없다.
    expect(items).toEqual([{ day: "2026-08-12", readable: false, photos: { kind: "unknown" } }]);
  });
});

/**
 * 007 §5 — 목록이 사진 갈래를 실어 준다 (FR-018·019, data-model.md §5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **추가 읽기가 없다.** `listDiaries()`는 `readable`을 판정하려고 **이미 전체를
 * 역직렬화하고 있었고**, 006까지는 그 결과를 버렸다. 버리던 것을 살리는 것뿐이다.
 *
 * **세 갈래가 그대로 온다**(원칙 V). 불리언으로 뭉개면 `none`과 `unknown`이 같아지고,
 * 그것이 004가 값에서 지킨 구분을 화면에서 무너뜨린다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("listDiaries — 사진 갈래 (007 FR-018·019)", () => {
  /** 사진 신호만 갈아끼운 하루 */
  function entryWithPhotos(date: DayDate, photos: DaySignals["photos"]): DiaryEntry {
    return { ...entryFor(date), signalsUsed: { ...partiallyUnknownDay(date), photos } };
  }

  it("사진을 본 날은 장수가 실린다", async () => {
    const store = memoryStore();
    await store.save(
      entryWithPhotos("2026-08-12", {
        kind: "known",
        value: {
          photos: [
            { id: "a", takenAt: new Date("2026-08-12T10:00:00") },
            { id: "b", takenAt: new Date("2026-08-12T11:00:00") },
          ],
          complete: true,
        },
      }),
    );

    const [item] = await listDiaries(store);
    expect(item.photos).toEqual({ kind: "known", count: 2 });
  });

  it("사진이 없던 날은 none이다", async () => {
    const store = memoryStore();
    await store.save(entryWithPhotos("2026-08-12", { kind: "none" }));

    const [item] = await listDiaries(store);
    expect(item.photos).toEqual({ kind: "none" });
  });

  it("★ 사진을 모르는 날은 unknown이며 none과 다르다(원칙 V)", async () => {
    const store = memoryStore();
    await store.save(entryWithPhotos("2026-08-12", { kind: "unknown", reason: "권한이 없다" }));
    await store.save(entryWithPhotos("2026-08-11", { kind: "none" }));

    const items = await listDiaries(store);
    const unknownDay = items.find((i) => i.day === "2026-08-12");
    const noneDay = items.find((i) => i.day === "2026-08-11");

    // **두 날이 서로 다른 값이다.** 뭉개면 「모른다」가 「없었다」로 둔갑한다.
    expect(unknownDay?.photos).toEqual({ kind: "unknown" });
    expect(noneDay?.photos).toEqual({ kind: "none" });
    expect(unknownDay?.photos).not.toEqual(noneDay?.photos);
  });

  it("읽을 수 없는 일기의 사진은 unknown이다 — 「없었다」가 아니다(원칙 V)", async () => {
    const store = memoryStore();
    await store.save(entryFor("2026-08-12"));

    const broken: DiaryStore = { ...store, load: async () => null };
    const [item] = await listDiaries(broken);

    expect(item.readable).toBe(false);
    expect(item.photos).toEqual({ kind: "unknown" });
  });
});

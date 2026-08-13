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

import { deserializeEntry, memoryStore, serializeEntry } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { emptyDay, partiallyUnknownDay, richDay, unknownDay } from "../../src/signals/fake";
import type { DayDate } from "../../src/config/day-boundary";

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
      expect(photos.value[0].takenAt).toBeInstanceOf(Date);
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

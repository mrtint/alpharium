/**
 * T011a ⚖️ 원칙 IV — 엔티티 스키마 검증
 *
 * - 003 FR-244: 집계는 data-model.md 엔티티 2의 **열 항목이 전부**다. 목록 밖 항목이 없다
 * - 004 FR-300·FR-301: 일기는 **날짜·퍼소나 귀속·본문 셋이 전부**다.
 *   제목·태그·기분·재료 요약이 없다
 * - 004 FR-304: 재료 요약은 저장 대상이 아니라 파생값이다
 */
import {
  DIGEST_FIELDS,
  createDigest,
  isDigest,
  emptyDigestFor,
  type DailyDigest,
} from "../../src/signals/digest";
import { DIARY_FIELDS, createDiaryEntry, isDiaryEntry } from "../../src/inference/diary";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";

const sampleDigest = (): DailyDigest =>
  createDigest({
    date: "2026-08-02",
    observedAt: "2026-08-02T18:30:00+09:00",
    steps: observed(4210),
    activePeriods: observed(["아침", "저녁"]),
    stays: unobserved(),
    moved: observed(true),
    photos: unobserved(),
    events: observed([{ title: "치과", period: observed("오후") }]),
    scale: ScaleVerdict.Modest,
  });

describe("일별 집계 — 열 항목이 전부다 (003 FR-244)", () => {
  it("항목 목록이 data-model.md 엔티티 2와 정확히 일치한다", () => {
    expect([...DIGEST_FIELDS].sort()).toEqual(
      [
        "date",
        "observedAt",
        "steps",
        "activePeriods",
        "stays",
        "moved",
        "photos",
        "photoCount",
        "events",
        "scale",
      ].sort(),
    );
    expect(DIGEST_FIELDS).toHaveLength(10);
  });

  it("만들어진 집계에 목록 밖의 항목이 없다", () => {
    expect(Object.keys(sampleDigest()).sort()).toEqual([...DIGEST_FIELDS].sort());
  });

  it("목록 밖의 항목이 섞이면 집계로 인정하지 않는다", () => {
    const withExtra = { ...sampleDigest(), mood: "상쾌함" };
    expect(isDigest(withExtra)).toBe(false);
    expect(isDigest(sampleDigest())).toBe(true);
  });

  it("원시 로그를 담을 자리가 없다 (003 FR-255)", () => {
    const raw = JSON.stringify(sampleDigest());
    expect(raw).not.toMatch(/latitude|longitude|coordinate|uri|exif|rawLog|path/i);
  });

  it("날짜·관측 시점·규모 판정은 항상 존재한다 — 미관측일 수 없다", () => {
    const digest = sampleDigest();
    expect(typeof digest.date).toBe("string");
    expect(typeof digest.observedAt).toBe("string");
    expect(Object.values(ScaleVerdict)).toContain(digest.scale);
  });

  it("사진 총 개수는 파생이다 — 사진 목록이 미관측이면 함께 미관측이다 (003 FR-246a)", () => {
    expect(sampleDigest().photoCount).toEqual(unobserved());

    const withPhotos = createDigest({
      ...sampleDigest(),
      photos: observed([{ period: observed("아침"), place: unobserved(), caption: unobserved() }]),
    });
    expect(withPhotos.photoCount).toEqual(observed(1));
  });

  it("빈 집계도 열 항목을 모두 갖는다 (003 FR-217)", () => {
    const empty = emptyDigestFor("2026-08-02", "2026-08-02T09:00:00+09:00");
    expect(Object.keys(empty).sort()).toEqual([...DIGEST_FIELDS].sort());
    expect(empty.scale).toBe(ScaleVerdict.Empty);
  });
});

describe("일기 — 셋이 전부다 (004 FR-300·FR-301)", () => {
  const sampleDiary = () =>
    createDiaryEntry({ date: "2026-08-02", personaName: "네모", body: "주인은 걸었다." });

  it("항목 목록이 날짜·퍼소나 귀속·본문 셋뿐이다", () => {
    expect([...DIARY_FIELDS].sort()).toEqual(["body", "date", "personaName"]);
    expect(Object.keys(sampleDiary()).sort()).toEqual(["body", "date", "personaName"]);
  });

  it("제목·태그·기분을 두지 않는다", () => {
    const diary = sampleDiary();
    expect(diary).not.toHaveProperty("title");
    expect(diary).not.toHaveProperty("tags");
    expect(diary).not.toHaveProperty("moodTag");
  });

  it("목록 밖의 항목이 섞이면 일기로 인정하지 않는다", () => {
    expect(isDiaryEntry({ ...sampleDiary(), title: "오늘의 일기" })).toBe(false);
    expect(isDiaryEntry(sampleDiary())).toBe(true);
  });

  it("본문은 비어 있지 않다 (004 FR-302)", () => {
    expect(() =>
      createDiaryEntry({ date: "2026-08-02", personaName: "네모", body: "   " }),
    ).toThrow();
  });
});

describe("재료 요약은 저장 대상이 아니다 (004 FR-304)", () => {
  it("일기에 재료 요약을 담을 자리가 없다", () => {
    expect(DIARY_FIELDS).not.toContain("materialSummary");
    expect(createDiaryEntry({ date: "2026-08-02", personaName: "네모", body: "본문" })).not.toHaveProperty(
      "materialSummary",
    );
  });

  it("집계에도 재료 요약을 담을 자리가 없다", () => {
    expect(DIGEST_FIELDS).not.toContain("materialSummary");
  });
});

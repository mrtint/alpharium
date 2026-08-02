/**
 * T013 ⚖️ 원칙 IV — 기록 묶음 구조
 *
 * - 005 FR-402: 원본 로그를 담을 자리가 **타입 수준에서** 없다.
 *   저장 시점 걸러내기로 대신하지 않았음을 확인한다
 * - 001 FR-030: 가시성 상태가 구조에 존재하고 기본값이 「보임」이다
 * - 005 FR-410·FR-411: 일기와 집계가 하나의 조작 단위다
 */
import {
  BUNDLE_FIELDS,
  Visibility,
  createBundle,
  isBundle,
  isVisible,
} from "../../src/storage/bundle";
import { createDigest } from "../../src/signals/digest";
import { createDiaryEntry } from "../../src/inference/diary";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";

const digest = () =>
  createDigest({
    date: "2026-08-02",
    observedAt: "2026-08-02T18:30:00+09:00",
    steps: observed(4210),
    activePeriods: observed(["저녁"]),
    stays: unobserved(),
    moved: observed(true),
    photos: unobserved(),
    events: unobserved(),
    scale: ScaleVerdict.Modest,
  });

const diary = () =>
  createDiaryEntry({ date: "2026-08-02", personaName: "네모", body: "주인은 저녁에 걸었다." });

const bundle = () => createBundle({ diary: diary(), digest: digest() });

describe("기록 묶음 — 일기와 집계가 하나의 조작 단위다 (005 FR-410)", () => {
  it("항목은 일기·집계·가시성 셋뿐이다", () => {
    expect([...BUNDLE_FIELDS].sort()).toEqual(["diary", "digest", "visibility"]);
    expect(Object.keys(bundle()).sort()).toEqual(["diary", "digest", "visibility"]);
  });

  it("일기와 집계를 따로 만들 수 없다 — 짝이 아니면 묶음이 성립하지 않는다", () => {
    expect(() =>
      createBundle({
        diary: createDiaryEntry({ date: "2026-08-01", personaName: "네모", body: "본문" }),
        digest: digest(), // 2026-08-02
      }),
    ).toThrow();
  });
});

describe("원본 로그를 담을 자리가 없다 (005 FR-402)", () => {
  it("묶음의 항목 목록에 원본 로그 자리가 없다", () => {
    for (const forbidden of ["rawLogs", "rawSignals", "sourceLogs", "coordinates", "photoUris"]) {
      expect(BUNDLE_FIELDS).not.toContain(forbidden);
    }
  });

  it("저장 시점 걸러내기로 대신하지 않았다 — 넘겨도 자리가 없어 남지 않는다", () => {
    const withRaw = createBundle({
      diary: diary(),
      digest: digest(),
      // 계약 밖의 값을 억지로 넣어도 묶음에 자리가 없다.
      ...({ rawLogs: [{ lat: 37.5, lon: 127.0 }] } as Record<string, unknown>),
    } as Parameters<typeof createBundle>[0]);

    expect(Object.keys(withRaw).sort()).toEqual(["diary", "digest", "visibility"]);
    expect(JSON.stringify(withRaw)).not.toMatch(/lat|lon|rawLogs/i);
  });

  it("목록 밖의 항목이 섞이면 묶음으로 인정하지 않는다", () => {
    expect(isBundle({ ...bundle(), rawLogs: [] })).toBe(false);
    expect(isBundle(bundle())).toBe(true);
  });

  it("기기 식별자가 없다 (005 FR-404)", () => {
    expect(JSON.stringify(bundle())).not.toMatch(/deviceId|installationId|androidId/i);
  });
});

describe("가시성 상태 (001 FR-030)", () => {
  it("가시성이 구조에 존재한다", () => {
    expect(BUNDLE_FIELDS).toContain("visibility");
  });

  it("기본값이 「보임」이다", () => {
    expect(bundle().visibility).toBe(Visibility.Visible);
    expect(isVisible(bundle())).toBe(true);
  });

  it("숨겨진 묶음도 같은 구조를 갖는다 — 같은 날짜에 공존할 수 있다 (001 FR-030)", () => {
    const hidden = createBundle({ diary: diary(), digest: digest(), visibility: Visibility.Hidden });
    expect(Object.keys(hidden).sort()).toEqual([...BUNDLE_FIELDS].sort());
    expect(isVisible(hidden)).toBe(false);
    expect(hidden.diary.date).toBe(bundle().diary.date);
  });
});

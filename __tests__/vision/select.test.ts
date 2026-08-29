import { readFileSync } from "node:fs";
import { join } from "node:path";

import { reachedVisionLimit, selectForVision } from "../../src/vision/select";
import type { Photo } from "../../src/signals/types";

/**
 * 고르기의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/contracts/selection.md
 *       specs/023-photo-selection-algorithm/contracts/classification.md
 *       specs/023-photo-selection-algorithm/contracts/time-distribution.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **023이 011의 인덱스 균등 선별을 두 단계로 바꿨다**: (1) 파일 경로 폴더
 * 이름으로 잡사진(스크린샷·다운로드·메신저)을 걸러내고, (2) 남은 것을 찍힌
 * 시각 분포로 배분한다("아침만 본 채 하루를 쓴다"를 막는다).
 *
 * **004는 「그날 사진이 몇 장인가」를 세고 이 기능은 「하루가 어떠했는가」를 그린다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SOURCE_PATH = join(__dirname, "../../src/vision/select.ts");

/** 시각만 다른 카메라 사진. `2026-08-20T{hour}:{min}` */
const at = (hour: number, min = 0, id = `p${hour}-${min}`): Photo => ({
  id,
  takenAt: new Date(2026, 7, 20, hour, min, 0),
  folderName: "Camera",
});

/** 폴더를 지정한 사진. */
const inFolder = (
  folderName: string | undefined,
  hour: number,
  id = `${folderName}-${hour}`,
): Photo => ({
  id,
  takenAt: new Date(2026, 7, 20, hour, 0, 0),
  folderName,
});

/**
 * 시각이 하루에 고르게 흩어진 카메라 사진 n장. **id가 서로 다르다.**
 *
 * ⚠️ 하루 경계는 04:00이다 — `collect.ts`가 주는 하루는 `[D 04:00, D+1 04:00)`
 * 구간이다. 그래서 04:00부터 다음날 03:59까지(24시간)에 걸쳐 편다. 04:00 이전
 * 시각을 같은 달력일에 두면 `bucketIndexOf`가 그것을 하루의 끝 칸으로 보므로
 * (정상), 시각 순 정렬이 뒤집힌다.
 *
 * ⚠️ `i % 60`으로 분을 만들면 24장을 넘길 때 같은 시각이 나올 수 있으나 id는
 * 항상 다르다.
 */
const spread = (n: number): Photo[] =>
  Array.from({ length: n }, (_, i) => {
    // 04:00 기준 0..(24h) 사이를 고르게. minutesSince4am = i*1439/(n-1).
    const minutesSince4am = Math.floor((i * 1439) / Math.max(1, n - 1));
    const totalMin = 4 * 60 + minutesSince4am;
    return {
      id: `p${i}`,
      takenAt: new Date(2026, 7, 20, Math.floor(totalMin / 60), totalMin % 60, 0),
      folderName: "Camera" as const,
    };
  });

const hoursOf = (photos: Photo[]): number[] => photos.map((p) => p.takenAt.getHours());
const idsOf = (photos: Photo[]): string[] => photos.map((p) => p.id);

// ─────────────────────────────────────────────────────────────────────────────
// 잡사진 필터링 (US1, contracts/classification.md)
// ─────────────────────────────────────────────────────────────────────────────

describe("US1. 잡사진 필터링 (contracts/classification.md)", () => {
  it("R1 — 상한 이하(8장 이하)면 분류하지 않고 전부 (C5)", () => {
    // Camera 3 + Screenshots 2 = 5장. 상한(8) 이하라 스크린샷도 그대로 온다.
    const photos = [
      inFolder("Camera", 8),
      inFolder("Camera", 12),
      inFolder("Camera", 18),
      inFolder("Screenshots", 10),
      inFolder("Screenshots", 20),
    ];
    expect(selectForVision(photos)).toEqual(photos);
  });

  it("C1·C2 — 카메라 원본이 1장 이상이면 잡사진을 걸러낸다", () => {
    // Camera 6 + Screenshots 4 = 10장(상한 초과) → 스크린샷 제거, Camera 6장만.
    const photos = [
      inFolder("Camera", 5, "c1"),
      inFolder("Camera", 8, "c2"),
      inFolder("Screenshots", 9, "s1"),
      inFolder("Camera", 11, "c3"),
      inFolder("Screenshots", 13, "s2"),
      inFolder("Camera", 15, "c4"),
      inFolder("Screenshots", 17, "s3"),
      inFolder("Camera", 19, "c5"),
      inFolder("Screenshots", 21, "s4"),
      inFolder("Camera", 23, "c6"),
    ];
    const got = selectForVision(photos);

    expect(got.every((p) => p.folderName === "Camera")).toBe(true);
    // 6장 Camera 전부 서로 다른 칸이라 되돌림 없이 그대로 남는다(nonEmpty=6 < 8).
    expect(idsOf(got).sort()).toEqual(["c1", "c2", "c3", "c4", "c5", "c6"]);
  });

  // 하루(04:00~다음날 04:00)에 고르게 흩뿌린 n장 — folderName만 바꿔 쓴다.
  // spread()와 같은 04:00 기준 분포지만 folderName을 인자로 받는다.
  const spreadIn = (folderName: string | undefined, n: number): Photo[] =>
    Array.from({ length: n }, (_, i) => {
      const minutesSince4am = Math.floor((i * 1439) / Math.max(1, n - 1));
      const totalMin = 4 * 60 + minutesSince4am;
      return {
        id: `${folderName ?? "u"}${i}`,
        takenAt: new Date(2026, 7, 20, Math.floor(totalMin / 60), totalMin % 60, 0),
        folderName,
      };
    });

  it("C3 — 전부 잡사진이면 원본으로 되돌린다 (스크린샷만 12장)", () => {
    const got = selectForVision(spreadIn("Screenshots", 12));

    expect(got.length).toBe(8);
    expect(got.every((p) => p.folderName === "Screenshots")).toBe(true);
  });

  it("C2 — 분류 불가(folderName undefined)는 남는다 (12장 전부 undefined)", () => {
    const got = selectForVision(spreadIn(undefined, 12));

    expect(got.length).toBe(8);
    // 전부 unclassifiable → 되돌림과 무관하게 kept에 남고, 시간 분포로 8장.
    expect(got.every((p) => p.folderName === undefined)).toBe(true);
  });

  it("C2 — 목록 밖 폴더 이름은 카메라 원본으로 본다 (OpenCamera 12장)", () => {
    const got = selectForVision(spreadIn("OpenCamera", 12));

    expect(got.length).toBe(8);
    expect(got.every((p) => p.folderName === "OpenCamera")).toBe(true);
  });

  it("C4 — 같은 입력 2회 → 같은 사진이 걸러지고 같은 사진이 선택된다", () => {
    const photos = [
      ...Array.from({ length: 4 }, (_, i) => inFolder("Camera", i * 5 + 6, `c${i}`)),
      ...Array.from({ length: 4 }, (_, i) => inFolder("Screenshots", i * 5 + 7, `s${i}`)),
    ];
    expect(idsOf(selectForVision(photos))).toEqual(idsOf(selectForVision(photos)));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 시간 분포 배분 (US2, contracts/time-distribution.md)
// ─────────────────────────────────────────────────────────────────────────────

describe("US2. 시간 분포 배분 (contracts/time-distribution.md)", () => {
  it("D2 — 상한 이하면 분포 계산 없이 전부 (011 R1 유지)", () => {
    const photos = [at(9), at(13), at(19)];
    expect(selectForVision(photos)).toEqual(photos);
  });

  it("D3·D4 — 몰린 시간대가 선택을 독점하지 않는다", () => {
    // 오전 9시대 20장(칸 08-12), 오후 14시 2장(칸 12-16), 저녁 19시 2장(칸 16-20).
    const morning = Array.from({ length: 20 }, (_, i) => at(9, i, `m${i}`));
    const afternoon = [at(14, 0, "a1"), at(14, 30, "a2")];
    const evening = [at(19, 0, "e1"), at(19, 30, "e2")];
    const got = selectForVision([...morning, ...afternoon, ...evening]);

    expect(got.length).toBe(8);
    // 오후·저녁 칸이 각각 최소 1장씩 대표된다.
    expect(got.some((p) => p.id.startsWith("a"))).toBe(true);
    expect(got.some((p) => p.id.startsWith("e"))).toBe(true);
    // 몰린 오전 칸은 다수(여분이 비례 배분됨) — nonEmpty=3, remaining=5,
    // total=24, ideal m=5*20/24≈4.17 → alloc m=1+4=5, a=1, e=1. 합 7.
    // leftover=1 → 소수부 m(0.17)>a(0.42?)… 실제로는 a 5*2/24=0.417,
    // e 0.417, m 4.17 소수부 0.17. leftover 1 → a에 +1. alloc m5 a2 e1.
    expect(got.filter((p) => p.id.startsWith("m")).length).toBeGreaterThanOrEqual(4);
  });

  it("D5 — 칸 수 > 예산: 시간축 균등으로 8칸 중 골라 양 끝 칸 포함", () => {
    // BUCKET_COUNT는 6이라 "칸 수 > 예산(8)"은 불가능하다. D5 경계(칸 수 ==
    // nonEmpty >= budget)를 보려면 상한이 칸 수보다 커야 하므로, 대신 여기서는
    // **6칸 전부 채운 24장**으로 D3·D4 경로의 "양 끝 칸 포함"을 확인한다.
    // 6칸 각 4장, nonEmpty=6 < budget=8 → 최소 6 + remaining 2 비례 배분.
    const photos = [
      ...Array.from({ length: 4 }, (_, i) => at(5, i, `b0-${i}`)), // 04-08
      ...Array.from({ length: 4 }, (_, i) => at(9, i, `b1-${i}`)), // 08-12
      ...Array.from({ length: 4 }, (_, i) => at(13, i, `b2-${i}`)), // 12-16
      ...Array.from({ length: 4 }, (_, i) => at(17, i, `b3-${i}`)), // 16-20
      ...Array.from({ length: 4 }, (_, i) => at(21, i, `b4-${i}`)), // 20-24
      { id: "b5-0", takenAt: new Date(2026, 7, 21, 1, 0, 0), folderName: "Camera" as const }, // 00-04
      { id: "b5-1", takenAt: new Date(2026, 7, 21, 2, 0, 0), folderName: "Camera" as const },
      { id: "b5-2", takenAt: new Date(2026, 7, 21, 3, 0, 0), folderName: "Camera" as const },
      { id: "b5-3", takenAt: new Date(2026, 7, 21, 3, 30, 0), folderName: "Camera" as const },
    ];
    const got = selectForVision(photos);

    expect(got.length).toBe(8);
    // 011 R3 보정: 첫 칸의 가장 이른 장, 마지막 칸의 가장 늦은 장을 포함.
    expect(got[0].id).toBe("b0-0");
    expect(got[got.length - 1].id).toBe("b5-3");
  });

  it("D5 — 칸 수 == 예산 경계는 BUCKET_COUNT(6) < 상한(8)이라 도달 불가", () => {
    // spec FR-011의 `>=` 경계(nonEmpty == budget)는 칸이 8개는 돼야 하는데
    // BUCKET_COUNT가 6이다 → 이 경로는 현재 상한에서 죽은 가지다. 6칸이 다
    // 차도 nonEmpty(6) < budget(8)이라 언제나 D3·D4로 간다. 죽은 가지임을
    // 명시적으로 못 박아, 상한이 6 이하로 다시 내려갈 때 이 테스트가 깨지며
    // D5 경계 케이스를 되살리라고 알린다.
    const photos = Array.from({ length: 6 }, (_, i) => at(5 + i * 3, 0, `k${i}`)).concat(
      Array.from({ length: 6 }, (_, i) => at(6 + i * 3, 0, `k${i}b`)),
    );
    const got = selectForVision(photos);
    // 6칸 각 2장, nonEmpty=6 < 8 → 최소 6 + remaining 2. 전부 12장 중 8장.
    expect(got.length).toBe(8);
  });

  it("D3+D6 — 전부 한 시간대(20-22시) 12장이면 그 칸에서 011 R2로 8장", () => {
    const photos = Array.from({ length: 12 }, (_, i) => at(20, i * 5, `n${i}`));
    const got = selectForVision(photos);

    expect(got.length).toBe(8);
    // 칸 1개(20-24) → nonEmpty=1 < budget=8 → 최소 1 + 여분 7 = alloc 8.
    // n=12에서 011 R2: round(k*11/7) → 0,2,3,5,6,8,9,11.
    expect(idsOf(got)).toEqual(["n0", "n2", "n3", "n5", "n6", "n8", "n9", "n11"]);
  });

  it("D4 정확값 — contract D4 예시 그대로 (예산 8, 칸 A2·B30·C5·D3)", () => {
    // contract time-distribution.md D4의 예시가 이제 상한 8과 같아 직접 검증된다.
    // A: 04-08(2장), B: 08-12(30장), C: 12-16(5장), D: 16-20(3장). total=40.
    // 최소 커버리지 4, remaining=4. ideal: A 4*2/40=0.20, B 3.00, C 0.50, D 0.30.
    // floor 합 3, leftover=1 → 소수부 C(0.50)>D(0.30)>A(0.20)>B(0.00) → C에 +1.
    // alloc: A1 B4 C2 D1. 합 8.
    const a = [at(5, 0, "A0"), at(6, 0, "A1")];
    const b = Array.from({ length: 30 }, (_, i) => at(9, i, `B${i}`));
    const c = Array.from({ length: 5 }, (_, i) => at(13, i * 5, `C${i}`));
    const d = [at(17, 0, "D0"), at(17, 20, "D1"), at(17, 40, "D2")];

    const got = selectForVision([...a, ...b, ...c, ...d]);
    expect(got.length).toBe(8);
    expect(got.filter((p) => p.id.startsWith("A")).length).toBe(1);
    expect(got.filter((p) => p.id.startsWith("B")).length).toBe(4);
    expect(got.filter((p) => p.id.startsWith("C")).length).toBe(2);
    expect(got.filter((p) => p.id.startsWith("D")).length).toBe(1);
  });

  it("D1 — 시간 칸 경계가 04:00 기준이다 (BUCKET_COUNT=6, 4시간 간격)", () => {
    // 03:59(다음날, 하루 끝 칸)와 04:00(첫 칸)이 서로 다른 칸이라, 양쪽이 모두
    // 대표된다. 6장 ≤ 상한(8)이라 D2로 전부 반환되므로, 잡사진 필터가 도는
    // 상한 초과(칸마다 여러 장)로 만들어 칸 경계 효과를 본다.
    const boundary: Photo[] = [
      { id: "start", takenAt: new Date(2026, 7, 20, 4, 0, 0), folderName: "Camera" },
      { id: "start2", takenAt: new Date(2026, 7, 20, 5, 0, 0), folderName: "Camera" },
      { id: "m1", takenAt: new Date(2026, 7, 20, 7, 59, 0), folderName: "Camera" },
      { id: "m2", takenAt: new Date(2026, 7, 20, 9, 0, 0), folderName: "Camera" },
      { id: "mid1", takenAt: new Date(2026, 7, 20, 12, 0, 0), folderName: "Camera" },
      { id: "mid2", takenAt: new Date(2026, 7, 20, 14, 0, 0), folderName: "Camera" },
      { id: "ev1", takenAt: new Date(2026, 7, 20, 17, 0, 0), folderName: "Camera" },
      { id: "ev2", takenAt: new Date(2026, 7, 20, 20, 0, 0), folderName: "Camera" },
      { id: "lateA", takenAt: new Date(2026, 7, 21, 2, 0, 0), folderName: "Camera" },
      { id: "lateB", takenAt: new Date(2026, 7, 21, 3, 59, 0), folderName: "Camera" },
    ];
    const got = selectForVision(boundary);

    // 10장(상한 초과) → 첫 칸(04-08)의 가장 이른 start, 마지막 칸(00-04)의
    // 가장 늦은 lateB가 포함된다(011 R3 보정).
    expect(got[0].id).toBe("start");
    expect(got[got.length - 1].id).toBe("lateB");
  });

  it("D7 — 고른 목록은 찍힌 시각 오름차순, 중복 없음", () => {
    const photos = spread(15);
    const got = selectForVision(photos);

    const times = got.map((p) => p.takenAt.getTime());
    expect([...times].sort((x, y) => x - y)).toEqual(times);
    expect(new Set(idsOf(got)).size).toBe(got.length);
  });

  it("D8 / SC-004 — 결정적: 몰린 하루로 2회 실행 → 동일 집합", () => {
    const morning = Array.from({ length: 25 }, (_, i) => at(9, i % 60, `m${i}`));
    const rest = [at(15, 0, "x"), at(21, 0, "y")];
    const photos = [...morning, ...rest];

    const first = idsOf(selectForVision(photos));
    for (let i = 0; i < 10; i += 1) {
      expect(idsOf(selectForVision(photos))).toEqual(first);
    }
  });

  it("가장 이른 것과 가장 늦은 것이 들어 있다 (011 R3의 취지 유지)", () => {
    for (const n of [6, 7, 10, 12, 30, 200]) {
      const photos = spread(n);
      const got = selectForVision(photos);
      expect(got[0]).toBe(photos[0]);
      expect(got[got.length - 1]).toBe(photos[n - 1]);
    }
  });

  it("앞에서부터 자르지 않는다 — 004와 다르다", () => {
    const photos = spread(20);
    expect(hoursOf(selectForVision(photos))).not.toEqual(hoursOf(photos.slice(0, 5)));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S1 — 상한·상수가 한 자리에만 있고 인자가 하나 (011 S1, 023 FR-016·FR-022)
// ─────────────────────────────────────────────────────────────────────────────

describe("S1. 상한·상수가 한 자리에만 있다 (011 S1, 023 FR-016)", () => {
  const SOURCE = readFileSync(SOURCE_PATH, "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("인자가 하나뿐이다", () => {
    expect(selectForVision.length).toBe(1);
  });

  it("선언에 둘째 인자가 없다 — 기본값 인자로 우회하지 못한다", () => {
    const declaration = CODE.match(/export function selectForVision\(([^)]*)\)/);
    expect(declaration).not.toBeNull();
    const params = declaration?.[1] ?? "";
    expect(params).not.toContain(",");
    expect(params).not.toContain("=");
  });

  it("상한·칸 개수·폴더 목록을 export 하지 않는다", () => {
    expect(CODE).not.toMatch(/export\s+(?:const|let)\s+\w*(?:LIMIT|MAX|BUCKET_COUNT|NON_CAMERA)/);
    expect(CODE).not.toMatch(
      /export\s+\{[^}]*(?:VISION_PHOTO_LIMIT|BUCKET_COUNT|NON_CAMERA_FOLDERS)/,
    );
  });

  it("상한이 8이다 — 023 quickstart D3 실측으로 5→8 (SM-S901N, 2026-08-29)", () => {
    expect(selectForVision(spread(100))).toHaveLength(8);
  });

  it("reachedVisionLimit이 상한(8)을 기준으로 판정한다 (023 FR-018·FR-021)", () => {
    expect(reachedVisionLimit(7)).toBe(false);
    expect(reachedVisionLimit(8)).toBe(true);
    expect(reachedVisionLimit(9)).toBe(true);
  });

  it("배분 규칙이 상한을 인자로 받는다 — '밀집 가산량'을 별도 상수로 두지 않는다 (023 FR-020)", () => {
    // `distributeByTime(photos, budget)`이 budget을 인자로 받고, `selectForVision`이
    // `VISION_PHOTO_LIMIT`을 넘긴다. 상한이 바뀌면 같은 규칙에 새 상한만 들어간다.
    expect(CODE).toMatch(/function distributeByTime\([^)]*budget[^)]*\)/);
    expect(CODE).toMatch(/distributeByTime\(kept, VISION_PHOTO_LIMIT\)/);
    // "밀집 가산" 전용 상수가 없다(FR-020).
    expect(CODE).not.toMatch(/(?:BONUS|DENSITY|CROWD)_[A-Z]+\s*=/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-022 — 순수 함수: 기기·시각·난수·파일에 닿지 않는다
// ─────────────────────────────────────────────────────────────────────────────

describe("FR-022. 순수 함수 — 기기·시각·난수·파일에 닿지 않는다", () => {
  const SOURCE = readFileSync(SOURCE_PATH, "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("시각·난수를 읽지 않는다 (006 FR-037a)", () => {
    expect(CODE).not.toMatch(/Date\.now|Math\.random|new Date\(\)/);
  });

  it("기기·파일 모듈을 import하지 않는다", () => {
    expect(CODE).not.toMatch(
      /from\s+["'][^"']*(?:signals\/expo-port|expo-|react-native|node:fs|fs["']|expo-file-system|expo-media-library)/,
    );
  });

  it("깊이를 받는 자리가 없다 — 보는 수로 가를 수 없다 (011 US3)", () => {
    const declaration = CODE.match(/export function selectForVision\(([^)]*)\)/);
    const params = declaration?.[1] ?? "";
    expect(params).not.toMatch(/depth|quick|detailed|VisionDepth/);
  });
});

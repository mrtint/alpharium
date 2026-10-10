/**
 * 070 — e2e 표본 표 (정본). 오늘로부터 1~30일 전 30일치 가상의 하루.
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-manifest.md (M-1~M-8)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 표는 사람이 적는다.** 날마다의 기대(사진 몇 장·장소 몇 곳)는 코드가 계산하지 않는다(원칙 IV) — 테스트가 적힌 값이 방문 순서와 안 어긋나는지만
 * 센다. 군집 좌표도 사람이 못 박은 상수이고(023과 같은 방침) 코드가 분포를 보고 정하지 않는다.
 *
 * **「장소 N곳」은 군집 수가 아니라 순차 방문 수다**(`src/signals/places.ts`): 시각순으로 훑으며 직전 자리와 100m를 넘으면 새 자리.
 * 집→직장→집은 3곳이다. 그래서 방문 안 흔들림은 ≤ 40m(한 자리로 묶인다), 군집 사이는 ≥ 1km(확실히 다른 자리)로 둔다.
 *
 * 좌표는 한국 안 공공장소 근처다 — **실제 사는 곳이 아니다.** 사진 내용과 군집이 대놓고 어긋나는 조합(예: 「집」 군집에 에펠탑 사진)은 피하려고
 * 상황마다 군집에 맞는 사진 태그를 고른다.
 *
 * 앱 코드와 무관하다 — `src/`는 이 파일을 모른다(소스 계약 K-1).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Place = "home" | "work" | "cafe" | "weekend";
export type Folder = "Camera" | "Screenshots" | "Download";
/** 사진 목록(photos.json)의 태그. 스크린샷·다운로드 폴더 슬롯도 같은 태그의 사진을 그 폴더에 둔다(023은 폴더 이름만 본다) */
export type PhotoTag = "indoor" | "food" | "document" | "street" | "people" | "landscape" | "night";

export const PHOTO_TAGS: readonly PhotoTag[] = [
  "indoor",
  "food",
  "document",
  "street",
  "people",
  "landscape",
  "night",
];

/** 군집 중심 좌표 — 사람이 못 박은 상수. 이 파일 밖에 좌표를 두지 않는다(M-7) */
export const CLUSTERS: Record<Place, { latitude: number; longitude: number }> = {
  /** 집 — 망원한강공원 근처 */
  home: { latitude: 37.5547, longitude: 126.8977 },
  /** 직장 — 강남역 근처 */
  work: { latitude: 37.4979, longitude: 127.0276 },
  /** 단골 가게 — 서울숲 근처 */
  cafe: { latitude: 37.5444, longitude: 127.0374 },
  /** 주말 나들이 — 양평 두물머리 근처 */
  weekend: { latitude: 37.5446, longitude: 127.3226 },
};

/** 같은 방문 안의 위치 흔들림 상한(m). 100m 규칙(`SAME_PLACE_METERS`) 안이라 한 자리로 묶인다 */
export const JITTER_METERS = 40;

/** 「걸어 다닌 날」에서 연이은 사진 사이의 최소 거리(m). 100m를 넘어 사진마다 다른 자리로 세어진다 */
export const WALK_STEP_MIN_METERS = 150;

export type Slot = {
  /** 그날 로컬 `HH:MM` */
  time: string;
  folder: Folder;
  tag: PhotoTag;
  /** 어느 군집에서 찍혔나. `null`이면 좌표를 넣지 않는다 */
  place: Place | null;
  /** 「걸어 다닌 날」 전용 — 군집 중심에서 북쪽으로 얼마나 떨어졌나(m) */
  walkNorthMeters?: number;
};

export type SituationName =
  | "zero"
  | "single"
  | "few-home"
  | "commute"
  | "full-day-over-limit"
  | "night-only"
  | "noon-only"
  | "no-gps"
  | "clutter"
  | "weekend"
  | "walking"
  | "screenshots-only";

export type Situation = {
  name: SituationName;
  /** 사람이 읽는 한 줄 (문서 `docs/e2e/sample-table.md`에 그대로 실린다) */
  description: string;
  slots: Slot[];
  /**
   * 사람이 적은 **방문 순서** — 앱이 센 장소 하나하나(연속 중복을 뺀 군집 이름). 걸어 다닌 날만 사진마다 한 방문이다.
   * `expectPlaces`는 이것의 길이다.
   */
  visits: Place[];
  expectPlaces: number;
};

function s(
  time: string,
  folder: Folder,
  tag: PhotoTag,
  place: Place | null,
  walkNorthMeters?: number,
): Slot {
  return walkNorthMeters === undefined
    ? { time, folder, tag, place }
    : { time, folder, tag, place, walkNorthMeters };
}

export const SITUATIONS: Situation[] = [
  {
    name: "zero",
    description: "사진 0장 — 사진·장소 모두 관측된 0",
    slots: [],
    visits: [],
    expectPlaces: 0,
  },
  {
    name: "single",
    description: "집에서 점심 한 장",
    slots: [s("12:30", "Camera", "food", "home")],
    visits: ["home"],
    expectPlaces: 1,
  },
  {
    name: "few-home",
    description: "집에서만 세 장 — 장소 1곳",
    slots: [
      s("09:10", "Camera", "indoor", "home"),
      s("13:40", "Camera", "food", "home"),
      s("20:15", "Camera", "indoor", "home"),
    ],
    visits: ["home"],
    expectPlaces: 1,
  },
  {
    name: "commute",
    description: "집→직장→집, 다섯 장 — 장소 3곳",
    slots: [
      s("08:10", "Camera", "food", "home"),
      s("09:20", "Camera", "street", "work"),
      s("12:30", "Camera", "food", "work"),
      s("18:40", "Camera", "document", "work"),
      s("20:30", "Camera", "indoor", "home"),
    ],
    visits: ["home", "work", "home"],
    expectPlaces: 3,
  },
  {
    name: "full-day-over-limit",
    description: "하루 종일 열두 장(상한 8장 초과) — 집→직장→단골 가게→집, 장소 4곳",
    slots: [
      s("07:30", "Camera", "food", "home"),
      s("08:00", "Camera", "indoor", "home"),
      s("09:30", "Camera", "street", "work"),
      s("10:30", "Camera", "document", "work"),
      s("12:15", "Camera", "food", "work"),
      s("14:00", "Camera", "document", "work"),
      s("16:20", "Camera", "indoor", "work"),
      s("17:30", "Camera", "food", "cafe"),
      s("17:50", "Camera", "indoor", "cafe"),
      s("18:10", "Camera", "people", "cafe"),
      s("20:00", "Camera", "indoor", "home"),
      s("22:10", "Camera", "night", "home"),
    ],
    visits: ["home", "work", "cafe", "home"],
    expectPlaces: 4,
  },
  {
    name: "night-only",
    description: "밤에만 세 장 — 장소 1곳",
    slots: [
      s("22:05", "Camera", "night", "home"),
      s("22:40", "Camera", "night", "home"),
      s("23:30", "Camera", "night", "home"),
    ],
    visits: ["home"],
    expectPlaces: 1,
  },
  {
    name: "noon-only",
    description: "점심때만 두 장 — 장소 1곳",
    slots: [s("12:05", "Camera", "food", "work"), s("12:20", "Camera", "street", "work")],
    visits: ["work"],
    expectPlaces: 1,
  },
  {
    name: "no-gps",
    description: "위치 정보 없는 네 장 — 사진은 있고 장소는 관측된 0",
    slots: [
      s("10:00", "Camera", "indoor", null),
      s("12:30", "Camera", "food", null),
      s("15:00", "Camera", "landscape", null),
      s("19:00", "Camera", "people", null),
    ],
    visits: [],
    expectPlaces: 0,
  },
  {
    name: "clutter",
    description: "카메라 3장 + 스크린샷 2장 + 다운로드 1장 — 잡사진은 좌표 없음, 장소 2곳",
    slots: [
      s("09:30", "Camera", "street", "work"),
      s("11:45", "Camera", "document", "work"),
      s("13:10", "Screenshots", "document", null),
      s("14:00", "Screenshots", "street", null),
      s("15:20", "Download", "document", null),
      s("18:30", "Camera", "indoor", "home"),
    ],
    visits: ["work", "home"],
    expectPlaces: 2,
  },
  {
    name: "weekend",
    description: "주말 나들이 여섯 장 — 장소 1곳",
    slots: [
      s("10:30", "Camera", "landscape", "weekend"),
      s("11:15", "Camera", "people", "weekend"),
      s("12:40", "Camera", "food", "weekend"),
      s("14:10", "Camera", "landscape", "weekend"),
      s("15:30", "Camera", "landscape", "weekend"),
      s("17:00", "Camera", "street", "weekend"),
    ],
    visits: ["weekend"],
    expectPlaces: 1,
  },
  {
    name: "walking",
    description: "걸어 다닌 날 — 같은 군집에서 150m씩 떨어져 다섯 장, 장소 5곳(순차 방문 수)",
    slots: [
      s("10:00", "Camera", "street", "home", 0),
      s("11:00", "Camera", "street", "home", 150),
      s("12:00", "Camera", "landscape", "home", 300),
      s("13:00", "Camera", "street", "home", 450),
      s("14:00", "Camera", "landscape", "home", 600),
    ],
    visits: ["home", "home", "home", "home", "home"],
    expectPlaces: 5,
  },
  {
    name: "screenshots-only",
    description: "스크린샷만 세 장 — 좌표 없음, 사진 3장·장소 0곳",
    slots: [
      s("21:00", "Screenshots", "document", null),
      s("21:05", "Screenshots", "document", null),
      s("21:10", "Screenshots", "street", null),
    ],
    visits: [],
    expectPlaces: 0,
  },
];

export type SampleDay = {
  /** 오늘로부터 며칠 전 (1~30) */
  offset: number;
  situation: SituationName;
  /** 대표 날 — `sample-days` 흐름이 이 날로 이동해 사진 칸·장소 칸을 본다 */
  probe?: true;
};

export const DAYS: SampleDay[] = [
  { offset: 1, situation: "commute" },
  { offset: 2, situation: "few-home" },
  { offset: 3, situation: "zero", probe: true },
  { offset: 4, situation: "single", probe: true },
  { offset: 5, situation: "full-day-over-limit", probe: true },
  { offset: 6, situation: "weekend" },
  { offset: 7, situation: "no-gps", probe: true },
  { offset: 8, situation: "clutter", probe: true },
  { offset: 9, situation: "night-only", probe: true },
  { offset: 10, situation: "commute" },
  { offset: 11, situation: "zero" },
  { offset: 12, situation: "walking", probe: true },
  { offset: 13, situation: "few-home" },
  { offset: 14, situation: "noon-only" },
  { offset: 15, situation: "full-day-over-limit" },
  { offset: 16, situation: "weekend" },
  { offset: 17, situation: "single" },
  { offset: 18, situation: "screenshots-only" },
  { offset: 19, situation: "commute" },
  { offset: 20, situation: "zero" },
  { offset: 21, situation: "no-gps" },
  { offset: 22, situation: "clutter" },
  { offset: 23, situation: "night-only" },
  { offset: 24, situation: "few-home" },
  { offset: 25, situation: "full-day-over-limit" },
  { offset: 26, situation: "weekend", probe: true },
  { offset: 27, situation: "commute" },
  { offset: 28, situation: "single" },
  { offset: 29, situation: "walking" },
  { offset: 30, situation: "noon-only" },
];

export function situationOf(name: SituationName): Situation {
  const found = SITUATIONS.find((x) => x.name === name);
  if (found === undefined) throw new Error(`알 수 없는 상황: ${name}`);
  return found;
}

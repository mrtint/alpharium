/**
 * 미리 정해 둔 하루 모양들 (FR-008·008a).
 *
 * 계약: specs/010-synthetic-day-fixture/data-model.md 「하루 모양」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **에이전트가 부르므로 이름이 곧 계약이다** (명확화 Q2).
 *
 * 매번 사진마다 값을 지어내게 하면 검증할 때마다 다른 하루가 만들어지고, 두 번의
 * 검증을 비교할 수 없다. 이름 목록이 `__tests__/seed/shapes.test.ts`에 박혀 있어
 * **말없이 바뀌면 실패한다.**
 *
 * **모양은 004가 가른 갈래와 대응해야 한다**(FR-008a). 임의의 하루를 만드는 것이
 * 아니라, **값에서만 초록불이던 갈래를 실기기로 옮기는 것**이 이 모양들의 목적이다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **`unknown`을 만드는 모양은 없다.** 그것은 권한을 거두어 만드는 것이며 도구가
 * 권한을 건드리지 않는다(FR-014). quickstart B5가 `pm revoke`로 안내한다.
 */

import { dayBounds, type DayDate } from "../../src/config/day-boundary.ts";

/** 심을 사진 하나. `location`이 null이면 좌표를 안 박는다 */
export type PlannedPhoto = {
  takenAtMs: number;
  location: { latitude: number; longitude: number } | null;
  /**
   * 023 — 이 사진을 어느 하위 폴더에 심을지. 없으면 `SEED_FOLDER` 바로 아래
   * (기존 동작). `"Screenshots"`·`"Download"`면 `SEED_FOLDER/<그 이름>/` 아래로
   * 가고, 023의 `folderNameOf()`가 그 이름을 뽑아 잡사진으로 분류한다.
   * `"Camera"`는 명시적으로 카메라 원본임을 나타낸다(생략과 결과는 같다).
   */
  folder?: "Camera" | "Screenshots" | "Download";
};

export type DayShape = {
  name: string;
  /** 사람이 읽는 한 줄. 화면이 아니라 도구의 출력에 쓰인다 */
  description: string;
  build: (day: DayDate) => PlannedPhoto[];
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * **burst — "언제·어디서·무슨 종류·몇 장"의 원자** (023 Phase 8).
 *
 * 010의 `build: (day) => PlannedPhoto[]`는 시각·위치·장수를 통으로 하드코딩해
 * 새 상황마다 함수를 새로 써야 했다. burst는 그 셋을 파라미터로 빼, 하루를
 * **burst들의 조합**으로 기술한다. 다채로움 = burst를 어떻게 쌓느냐다.
 *
 * **순수 함수다.** 기기에 닿지 않고, 결정적이다(같은 입력 → 같은 출력).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type BurstSpec = {
  /** 하루 시작(04:00) 기준 시작 시각 (h) */
  fromHour: number;
  /** 시작~끝 시간 폭 (h). 이 안에 `count`장을 균등 분포. 0이면 전부 같은 시각 */
  spanHours: number;
  count: number;
  /**
   * 심볼릭 위치. `"near-a"`는 `NEAR_A`를 순환, `"b"`는 `PLACE_B`, `null`은 좌표
   * 없음. 좌표를 직접 주려면 `{ latitude, longitude }`.
   */
  location: "near-a" | "b" | null | { latitude: number; longitude: number };
  folder?: PlannedPhoto["folder"];
};

/**
 * 마지막 사진이 하루 시작 + 이 시간을 넘지 않게 clamp한다.
 *
 * **자정을 넘으면 EXIF/GPSDateStamp의 로컬 날짜가 다음날로 바뀌어** 미디어
 * 스캐너가 그 사진을 `day`가 아닌 다음날로 색인한다(011 실측, `spread-day`
 * 주석). 하루는 04:00~익일04:00(24시간)이지만, 04:00 + 20시간 = 로컬 24:00
 * 직전까지만 안전하다.
 */
const MAX_HOURS_INTO_DAY = 19.9;

function coordOf(
  location: BurstSpec["location"],
  index: number,
): { latitude: number; longitude: number } | null {
  if (location === null) return null;
  if (location === "b") return PLACE_B;
  if (location === "near-a") return NEAR_A[index % NEAR_A.length];
  return location;
}

/** burst 하나를 사진들로 편다. */
export function burst(day: DayDate, spec: BurstSpec): PlannedPhoto[] {
  const { count } = spec;
  if (count <= 0) return [];

  // 시작~끝을 자정 앞으로 clamp한다.
  const from = Math.max(0, spec.fromHour);
  const rawEnd = from + Math.max(0, spec.spanHours);
  const end = Math.min(rawEnd, MAX_HOURS_INTO_DAY);
  const span = Math.max(0, end - from);

  return Array.from({ length: count }, (_, i) => {
    // count가 1이면 시작 시각에. 아니면 [from, from+span]에 균등.
    const hour = count === 1 ? from : from + (span * i) / (count - 1);
    return {
      takenAtMs: hoursIntoDay(day, hour),
      location: coordOf(spec.location, i),
      ...(spec.folder !== undefined ? { folder: spec.folder } : {}),
    };
  });
}

/** burst들을 이어붙여 하루를 만든다. 결과는 찍힌 시각 순. */
export function composeDay(day: DayDate, specs: readonly BurstSpec[]): PlannedPhoto[] {
  return specs.flatMap((s) => burst(day, s)).sort((a, b) => a.takenAtMs - b.takenAtMs);
}

/**
 * 좌표 둘. **서로 6km쯤 떨어져 있어 004가 다른 자리로 센다**(`SAME_PLACE_METERS` 100m).
 *
 * 실제 지명은 뜻이 없다 — 004의 판정에서 갈리기만 하면 된다.
 */
const PLACE_A = { latitude: 37.5665, longitude: 126.978 };
const PLACE_B = { latitude: 37.5172, longitude: 127.0473 };

/**
 * `PLACE_A`에서 아주 조금 떨어진 자리들. **100m 안이라 한 자리로 세어진다.**
 *
 * 위도 0.0001° ≈ 11m다. 004의 100m 판정에 걸리지 않을 만큼만 흩뜨린다 —
 * 전부 같은 값으로 두면 「100m 판정」이 아니라 「같은 값」을 보는 것이 된다.
 */
const NEAR_A = [
  { latitude: 37.5665, longitude: 126.978 },
  { latitude: 37.5667, longitude: 126.9782 },
  { latitude: 37.5664, longitude: 126.9778 },
  { latitude: 37.5666, longitude: 126.9781 },
];

/** 그 하루의 시작에서 몇 시간 뒤. 04:00 경계는 `dayBounds()`가 안다 */
function hoursIntoDay(day: DayDate, hours: number): number {
  return dayBounds(day).startMs + hours * 60 * 60 * 1000;
}

const SHAPES: DayShape[] = [
  {
    name: "rich",
    description: "사진 3장, 서로 다른 자리 2곳 — 신호가 있는 하루",
    /**
     * **A → A → B로 둔다. A → B → A가 아니다.**
     *
     * 004의 `tracePlaces()`는 **바로 앞의 자리와만** 비교하므로(places.ts) 되돌아오면
     * 새 자리로 센다 — A→B→A는 `visitCount: 3`이다. 그것이 「머문 자리의 수」라는
     * 004의 뜻에 맞고 결함이 아니다.
     *
     * spec의 US1이 「자리가 2곳」이라고 정했으므로 **모양 쪽을 맞춘다.** 앱의 판정을
     * 고치지 않는다 — 이 도구는 앱을 바꾸지 않는다(FR-004a).
     */
    build: (day) => [
      { takenAtMs: hoursIntoDay(day, 5), location: PLACE_A },
      { takenAtMs: hoursIntoDay(day, 10), location: NEAR_A[1] },
      { takenAtMs: hoursIntoDay(day, 15), location: PLACE_B },
    ],
  },
  {
    name: "empty",
    description: "사진 0장 — 물어봤고 없었던 하루",
    // 빈 배열이 정상이다. 「사진 없음」(none)과 「사진 모름」(unknown)을 가르는 갈래다.
    build: () => [],
  },
  {
    name: "partial-location",
    description: "사진 5장 중 2장에만 좌표 — 한계가 값에 붙어 다니는가",
    build: (day) => [
      { takenAtMs: hoursIntoDay(day, 4), location: PLACE_A },
      { takenAtMs: hoursIntoDay(day, 6), location: null },
      { takenAtMs: hoursIntoDay(day, 9), location: null },
      { takenAtMs: hoursIntoDay(day, 12), location: PLACE_B },
      { takenAtMs: hoursIntoDay(day, 17), location: null },
    ],
  },
  {
    name: "one-place",
    description: "사진 4장, 전부 100m 안 — 하루 종일 한 자리",
    build: (day) =>
      NEAR_A.map((location, i) => ({ takenAtMs: hoursIntoDay(day, 5 + i * 3), location })),
  },
  {
    name: "spread-day",
    description: "사진 12장, 이른 때부터 늦은 때까지 흩어짐 — 다섯 장을 고르는 하루",
    /**
     * **011의 균일 선택(FR-007a)을 실기기에서 보려고 만든 모양이다.**
     *
     * 011은 5장을 넘는 하루에서만 실제로 「고른다」 — 5장 이하는 전부 읽으므로
     * **앞에서부터 잘랐는지 균일하게 골랐는지 구분되지 않는다.** 기존 모양 중
     * 가장 큰 `partial-location`이 정확히 5장이라 쓸 수 없고, `over-limit`(201장)은
     * 010 실측에서 색인이 밀려 실패했다(322초에 150장만 색인).
     *
     * **하루의 이른 때부터 늦은 때까지 벌린다.** 전부 아침에 몰리면 앞에서 자른
     * 결과와 균일하게 고른 결과가 같아져 검증이 아무것도 가르지 못한다.
     *
     * **좌표를 자리별로 나눠 둔다** — 이른 때는 A 근처, 늦은 때는 B다. 그래야
     * 일기에 나온 장면이 하루의 어느 때 것인지 사람이 견줄 실마리가 하나 더 생긴다.
     */
    build: (day) => {
      const count = 12;
      /**
       * **하루(04:00~익일04:00, 24시간)의 끝과 자정(로컬 달력 날짜의 경계)은 다르다.**
       *
       * 처음엔 1시간대부터 1.9시간 간격으로 두어 마지막이 `dayBounds`의 끝(익일 04:00)에
       * 닿지 않게만 신경 썼는데(21.9시간 지점 = 익일 01:54), **그사이에 자정을 넘어간다.**
       * 자정을 넘으면 EXIF/GPSDateStamp의 로컬 날짜가 실제로 다음날로 바뀌어 미디어
       * 스캐너가 그 사진을 `day`가 아닌 다음날로 색인한다(011 실측, verify-mismatch).
       *
       * 그래서 마지막 사진이 **자정 전(04:00부터 20시간 이내 = 로컬 24:00 전)**에 들도록
       * 좁힌다. `stepHours = 1.7`이면 마지막(11칸째)이 04:00+1+18.7=23:42로 여유 있게
       * 자정 앞에 들어온다.
       */
      const firstHour = 1;
      const stepHours = 1.7;

      return Array.from({ length: count }, (_, i) => ({
        takenAtMs: hoursIntoDay(day, firstHour + i * stepHours),
        // 앞 절반은 A 근처, 뒤 절반은 B — 시각과 자리가 함께 움직인다
        location: i < count / 2 ? NEAR_A[i % NEAR_A.length] : PLACE_B,
      }));
    },
  },
  {
    name: "over-limit",
    description: "사진 201장 — 상한에 걸려 잘리는 하루",
    /**
     * **004의 상한이 200이므로 201장을 심는다.**
     *
     * 그 값을 여기서 다시 정하지 않는다 — 앱이 `limit + 1`을 물어 초과를 알고,
     * 우리는 그것을 넘기기만 하면 된다. 200이 바뀌면 이 숫자도 손봐야 하며,
     * `shapes.test.ts`가 `> 200`으로 느슨하게 검사해 그때 알려 준다.
     *
     * ⚠️ **201장을 심는 시간을 아직 재지 않았다**(research.md 짐작 표, 원칙 V).
     */
    build: (day) => {
      const { startMs, endMs } = dayBounds(day);
      const count = 201;
      // 하루 전체에 고르게 흩뿌린다. 마지막이 endMs에 닿지 않게 나눈다.
      const step = Math.floor((endMs - startMs) / (count + 1));

      return Array.from({ length: count }, (_, i) => ({
        takenAtMs: startMs + step * (i + 1),
        // 좌표는 절반에만 — 200장의 좌표를 읽는 시간이 004의 미확인 값이다
        location: i % 2 === 0 ? PLACE_A : null,
      }));
    },
  },
  // ───────────────────── 023 Phase 8 — burst 조합으로 만든 모양 ─────────────────────
  {
    name: "mixed-clutter",
    description: "카메라 6장 + 스크린샷 3장 + 다운로드 1장 — 잡사진 필터링을 보는 하루",
    /**
     * 023의 잡사진 필터링(D1)을 실기기에서 본다. 카메라 원본은 하루에 흩어지고
     * (near-a), 스크린샷·다운로드는 좌표 없이 섞인다. `folderNameOf()`가 각
     * 폴더 이름을 뽑아 스크린샷·다운로드를 캡션 대상에서 뺀다.
     */
    build: (day) =>
      composeDay(day, [
        { fromHour: 1, spanHours: 18, count: 6, location: "near-a", folder: "Camera" },
        { fromHour: 3, spanHours: 14, count: 3, location: null, folder: "Screenshots" },
        { fromHour: 9, spanHours: 0, count: 1, location: null, folder: "Download" },
      ]),
  },
  {
    name: "screenshots-only",
    description: "스크린샷만 5장 — 전부 잡사진일 때 되돌리는지 보는 하루",
    /**
     * 023의 되돌림(D1). 카메라 원본이 0장이면 필터가 아무것도 안 걸러내고
     * 원본(스크린샷들)으로 선별한다 — "사진 없음"이 아니다.
     */
    build: (day) =>
      composeDay(day, [
        { fromHour: 2, spanHours: 15, count: 5, location: null, folder: "Screenshots" },
      ]),
  },
  {
    name: "morning-heavy",
    description: "오전에 15장 몰림 + 낮·저녁 각 2장 — 시간 분포 배분을 보는 하루",
    /**
     * 023의 시간 분포 배분(D2). 오전(04–06시, 023 `BUCKET_COUNT=6` 기준 첫
     * 시간 칸)에 그날 사진의 절반 이상이 몰린다. 선별이 그 칸에서 여러 장을
     * 고르되 낮·저녁 칸도 각각 대표하는지 본다. 전부 Camera(폴더 미지정).
     */
    build: (day) =>
      composeDay(day, [
        { fromHour: 0, spanHours: 2, count: 15, location: "near-a" },
        { fromHour: 6, spanHours: 0, count: 2, location: "b" },
        { fromHour: 12, spanHours: 0, count: 2, location: "b" },
      ]),
  },
  {
    name: "many-camera",
    description: "카메라 12장, 하루에 고르게 — 상한 확장을 보는 하루",
    /**
     * 023의 상한 확장(D3). `over-limit`(201장, 010 실측에서 색인 밀림으로
     * 사망)의 실용 대체. 12장이면 스캐너가 감당하고, 상한(현재 5)을 넘어
     * 선별·분포가 실제로 돈다. 전부 Camera(폴더 미지정).
     */
    build: (day) =>
      composeDay(day, [
        { fromHour: 0, spanHours: MAX_HOURS_INTO_DAY, count: 12, location: "near-a" },
      ]),
  },
];

export function shapeNames(): string[] {
  return SHAPES.map((s) => s.name);
}

/** 없으면 **null이다 — 던지지 않는다.** 실패는 값이어야 결과에 담긴다(FR-018b) */
export function shapeNamed(name: string): DayShape | null {
  return SHAPES.find((s) => s.name === name) ?? null;
}

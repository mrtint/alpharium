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
};

export type DayShape = {
  name: string;
  /** 사람이 읽는 한 줄. 화면이 아니라 도구의 출력에 쓰인다 */
  description: string;
  build: (day: DayDate) => PlannedPhoto[];
};

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
      // 하루 24시간 중 1시간대부터 약 1.9시간 간격 — 마지막이 하루 끝에 닿지 않게 둔다
      const firstHour = 1;
      const stepHours = 1.9;

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
];

export function shapeNames(): string[] {
  return SHAPES.map((s) => s.name);
}

/** 없으면 **null이다 — 던지지 않는다.** 실패는 값이어야 결과에 담긴다(FR-018b) */
export function shapeNamed(name: string): DayShape | null {
  return SHAPES.find((s) => s.name === name) ?? null;
}

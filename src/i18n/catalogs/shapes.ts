/**
 * 카탈로그가 함께 쓰는 길이 있는 모양 (062).
 *
 * `Catalog`는 한국어 카탈로그에서 파생되므로(`typeof ko`) 개수가 중요한 표는 여기의 튜플 타입으로 적어 둔다 —
 * 다른 언어 카탈로그가 요일을 여섯 개만 두거나 혼잣말 후보를 열 개보다 적게 두면 tsc가 짚는다(K2).
 */

/** 일요일부터 토요일까지 — `Date.getDay()` 순서 */
export type Week<T = string> = readonly [T, T, T, T, T, T, T];

/** 최소 10개 원소 — 혼잣말 후보 부족을 컴파일 타임에 막는다(015 FR-009) */
export type AtLeast10 = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  ...string[],
];

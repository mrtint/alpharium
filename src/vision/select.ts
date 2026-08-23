/**
 * 읽을 사진을 고른다.
 *
 * 계약: specs/011-photo-vision-summary/contracts/selection.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 004와 정반대로 자른다. 이것이 이 파일의 전부다.**
 *
 * `src/signals/collect.ts`가 `usable.slice(0, limit)`으로 **이른 시각부터** 자른다.
 * 004에서는 그것이 옳다 — 「그날 사진이 몇 장인가」를 세는 데는 어느 다섯이든 상관없다.
 *
 * **여기서는 틀린다.** 아침 사진 다섯 장만 읽으면 휴대폰이 **아침만 본 채 하루를 쓴다.**
 *
 * **004는 「그날 사진이 몇 장인가」를 세고 이 기능은 「하루가 어떠했는가」를 그린다.**
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **순수 함수다.** 기기를 모르고, 시각을 읽지 않고, 난수를 쓰지 않는다 — 읽으면 같은
 * 하루를 두 번 쓸 때 **다른 사진을 보게 되어** 「신호가 같은데 출력이 다르다」가 된다
 * (006 FR-037a가 경계한 상태).
 */

import type { Photo } from "../signals/types";

/**
 * 하루에서 내용을 읽는 사진의 수.
 *
 * **export 하지 않는다**(contracts/selection.md S1). 하면 테스트가 이 값을 읽어
 * 계산하게 되고, 그때 테스트는 「5장인가」가 아니라 「상수와 같은가」를 보게 된다 —
 * 값을 고치면 검사도 함께 따라가므로 아무것도 지키지 못한다.
 *
 * **이 수에는 실측 근거가 있다**(research.md §6): 옆 저장소가 같은 기기(SM-G986N)에서
 * LFM2.5-VL 450M으로 잰 값이 적재 약 1.0초 + 장당 약 1.9초이며, 5장이면 **약 10초**다.
 * **다만 이 저장소에서 다시 재지 않았다**(quickstart D1이 잰다).
 *
 * **한 자리에만 있다** — 004의 `DEFAULT_PHOTO_LIMIT`와 같은 성격이다.
 *
 * **016이 이 숫자 자체는 export하지 않고, 판정 함수(`selectedAllAvailable`)
 * 만 export한다** — 011의 S1(「export하지 않는다」) 취지를 지키면서도
 * 「상한에 닿았는가」라는 질문에는 답할 수 있게 한다(specs/016 research.md
 * §3 정정 — 처음엔 상수를 직접 export했으나 011의 계약과 충돌해 되돌렸다).
 */
const VISION_PHOTO_LIMIT = 5;

/**
 * 그날 사진 수가 캡션 상한에 닿았는가 — 사진 보기 갈래(많음/보통) 판정
 * (016, spec Clarifications).
 *
 * **"닿았다"는 상한과 같거나 그 이상이라는 뜻이다** — 정확히 5장이어도
 * "많음"이다(`selectForVision()`이 5장 전부를 고르는 것과 별개로, 사용자가
 * 가진 사진 수 자체가 상한과 같다는 사실이 판정 기준이다).
 *
 * **숫자 자체는 이 함수 밖으로 나가지 않는다** — 011의 S1(상한 숫자를
 * export하지 않는다)이 지키려던 것(상수를 다른 파일이 알지 못하게 하는
 * 것)이 그대로 유지된다.
 */
export function reachedVisionLimit(availableCount: number): boolean {
  return availableCount >= VISION_PHOTO_LIMIT;
}

/**
 * 읽을 사진을 고른다.
 *
 * **인자가 하나뿐이다**(S1). 상한을 밖에서 정할 수 있으면 값이 두 곳에 생기고, 부르는
 * 쪽마다 다른 범위를 쓸 수 있다 — 009가 `selectableDays`에서 같은 함정을 겪었다.
 *
 * @param photos 찍힌 시각 순으로 정렬된 목록 (004가 이미 정렬해 준다)
 * @returns 최대 5장. 입력 순서(시각 순)를 유지한다
 */
export function selectForVision(photos: readonly Photo[]): Photo[] {
  // R1. 고를 것이 없다.
  if (photos.length <= VISION_PHOTO_LIMIT) return [...photos];

  // R2·R3. 균등 분위로 고른다.
  //
  // `k=0`이 첫 장을, `k=limit-1`이 마지막 장을 주므로 **양 끝이 자동으로 들어온다** —
  // 그것이 「하루를 그린다」의 핵심이며, 빠지면 하루의 시작이나 끝이 사라진다.
  const last = photos.length - 1;
  const steps = VISION_PHOTO_LIMIT - 1;

  const indices = Array.from({ length: VISION_PHOTO_LIMIT }, (_, k) =>
    Math.round((k * last) / steps),
  );

  // R4. 중복을 만들지 않는다.
  //
  // `photos.length > limit`이면 간격이 1보다 크므로 이론상 겹치지 않는다. 그래도
  // 방어로 걸러내며, **걸러 낸 뒤 개수가 줄면 그것이 결함이므로** 테스트가 개수를
  // 직접 센다(contracts/selection.md R4).
  const unique = [...new Set(indices)];

  // R5. 입력 순서(시각 순)를 유지한다 — 인덱스가 오름차순이므로 그대로 성립한다.
  return unique.map((index) => photos[index]);
}

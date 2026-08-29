/**
 * 하루의 신호를 모은다.
 *
 * 계약: specs/004-photo-signal-collection/contracts/collection.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 V의 방어선이다.**
 *
 * 001의 `policy.ts`가 원칙 I을, 003의 `roster.ts`가 원칙 III을 한 곳에 모은 것과 같은
 * 구조다. 「관측한 것」과 「관측하지 못한 것」이 갈리는 자리가 저장소 전체에서 여기
 * 하나뿐이어야 한다.
 *
 * **여기서 지키는 것**:
 *  1. 권한이 없으면 `unknown`이지 `none`이 아니다(FR-007). 이 한 줄이 무너지면 일기가
 *     "오늘은 사진을 한 장도 찍지 않았다"고 쓴다 — 관측이 아니라 거짓이다
 *  2. 권한을 스스로 요청하지 않는다(FR-011). 조회는 묻기만 한다
 *  3. 어떤 경우에도 던지지 않는다(FR-012). 실패는 값이어야 파이프라인이 어느 단계에서
 *     멈췄는지 말할 수 있다
 *  4. 04:00 경계를 다시 계산하지 않는다(FR-002). `dayBounds()`에서 받는다
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayBounds, type DayDate } from "../config/day-boundary";
import { isUsableCoordinate, tracePlaces, type TimedCoordinate } from "./places";
import type { LocationOutcome, PermissionState, PhotoFacts, PhotoPort } from "./port";
import type { DaySignals, Photo, PhotoObservation, PhotoPlaces, SignalValue } from "./types";

/** 걸음 수를 모르는 까닭. **「못 한다」이지 「안 했다」가 아니다**(FR-015a) */
const STEPS_UNAVAILABLE = "안드로이드가 기간 걸음 수를 제공하지 않는다";
/** 아직 수집하지 않는 신호의 까닭. 위와 달라야 한다(FR-015a) */
const NOT_COLLECTED_YET = "아직 수집하지 않는다";

/** 권한 상태를 「왜 모르는가」로 옮긴다(FR-010). 넷이 서로 달라야 한다 */
function permissionReason(what: string, state: PermissionState): string {
  switch (state) {
    case "limited":
      // 「일부만 허용」에서 얻은 목록은 그날의 전부가 아니다(FR-008).
      return `${what} 일부에만 접근이 허용되어 그날의 전부를 볼 수 없다`;
    case "denied":
      return `${what} 접근 권한이 없다`;
    case "blocked":
      return `${what} 접근 권한이 없고 다시 요청할 수 없다`;
    case "undetermined":
      return `${what} 접근 권한을 아직 묻지 않았다`;
    case "granted":
      // 여기 오면 부르는 쪽이 틀린 것이다. 그래도 던지지 않는다(FR-012).
      return `${what} 접근이 허용되어 있다`;
  }
}

/**
 * 사진을 어느 하루에 넣을 수 있는지 판정해 거른다.
 *
 * **찍힌 시각이 없으면 버린다**(FR-003) — 어느 하루에도 넣을 수 없고, 임의의 날에
 * 배정하면 거짓이 된다. **미래 시각도 버린다**(Edge Cases) — 기기 시계가 어긋났던 흔적이다.
 */
function usablePhotos(facts: PhotoFacts[], endMs: number): Photo[] {
  return (
    facts
      .filter((f): f is PhotoFacts & { takenAtMs: number } => f.takenAtMs !== null)
      .filter((f) => f.takenAtMs < endMs)
      // 023 — `folderName`을 이월한다. `PhotoFacts`가 안 채웠으면 `undefined`로
      // 넘어가며 그것이 "분류 불가"다(select.ts가 판정). 004의 판정은 이 필드를
      // 읽지 않으므로 여기서 옮기는 것만으로 충분하다.
      .map((f) => ({ id: f.id, takenAt: new Date(f.takenAtMs), folderName: f.folderName }))
      .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime())
  );
}

/**
 * 그 하루의 사진을 판정한다.
 *
 * 순서가 계약이다(contracts/collection.md 「photos」): 권한 → 조회 실패 → 0장 → known.
 *
 * **012 — 상한이 없다**(FR-014). 조회에 성공하면 그 구간의 사진 전부가 담기므로
 * `complete`는 언제나 `true`다 — 잘림 판정 자체가 사라졌다(FR-015). 조회가 실패하면
 * `unknown`이며, 부분 결과를 잘라서 `known`으로 돌려주지 않는다(FR-016).
 */
async function collectPhotos(
  port: PhotoPort,
  day: DayDate,
): Promise<SignalValue<PhotoObservation>> {
  let permission: PermissionState;
  try {
    permission = await port.photoPermission();
  } catch (error) {
    return { kind: "unknown", reason: `사진 권한을 확인하지 못했다: ${messageOf(error)}` };
  }

  // 1. 권한이 없으면 unknown이다. **절대 none이 아니다**(FR-007, SC-002).
  if (permission !== "granted") {
    return { kind: "unknown", reason: permissionReason("사진", permission) };
  }

  const { startMs, endMs } = dayBounds(day);

  let facts: PhotoFacts[];
  try {
    facts = await port.photosBetween(startMs, endMs);
  } catch (error) {
    // 2. 조회 실패도 unknown이다(FR-012, FR-016). 던지지 않고, 잘라서 주지 않는다.
    return { kind: "unknown", reason: `사진을 조회하지 못했다: ${messageOf(error)}` };
  }

  const usable = usablePhotos(facts, endMs);

  // 3. 권한이 있는데 없었던 것은 **관측된 사실**이다(FR-009).
  if (usable.length === 0) {
    return { kind: "none" };
  }

  // 4. 상한이 없으므로 조회에 성공하면 언제나 전부를 본 것이다(FR-014·015).
  return { kind: "known", value: { photos: usable, complete: true } };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 사진의 좌표로 자리를 판정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정을 권한이 아니라 「읽어 본 결과」로 한다.**
 *
 * 계약(contracts/collection.md)은 좌표 권한을 먼저 보라고 했지만, 구현에서 확인한 사실이
 * 그것을 막았다: **`expo-media-library 57`은 `ACCESS_MEDIA_LOCATION`을 따로 묻는 함수를
 * 주지 않는다**(설치본 직접 확인, 2026-08-16). 권한 조회는 사진 권한만 답할 수 있다.
 *
 * 그래서 좌표 권한이 있는지는 **실제로 읽어 봐야 안다**. 전부 `failed`면 권한이 없는
 * 것이고(`unknown`), `absent`가 섞여 있으면 읽을 수는 있었는데 좌표가 없던 것이다(`none`).
 *
 * 이것이 사진 권한을 좌표 권한인 척 돌려주는 것보다 정직하다 — 후자는 「좌표 권한이
 * 있다」는 거짓을 신호에 싣는다(헌법 원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function collectPlaces(
  port: PhotoPort,
  photos: SignalValue<PhotoObservation>,
): Promise<SignalValue<PhotoPlaces>> {
  // 1. 사진을 못 봤으면 좌표를 물어볼 대상 자체가 없다.
  //    **순서가 중요하다** — 뒤집으면 "좌표 권한 없음"이 이유로 나가는데 진짜 이유는
  //    사진을 못 본 것이다.
  if (photos.kind !== "known") {
    return { kind: "unknown", reason: "사진을 보지 못해 좌표를 물을 수 없다" };
  }

  const considered = photos.value.photos;
  if (considered.length === 0) {
    return { kind: "none" };
  }

  const points: TimedCoordinate[] = [];
  let failures = 0;
  let lastFailure = "";

  for (const photo of considered) {
    let outcome: LocationOutcome;
    try {
      outcome = await port.locationOf(photo.id);
    } catch (error) {
      // 통로가 계약을 어겨도(던져도) 사진 신호는 살아야 한다(FR-012, FR-013a).
      outcome = { kind: "failed", reason: messageOf(error) };
    }

    if (outcome.kind === "found") {
      // 유효하지 않은 좌표는 자리로 세지 않는다(FR-013d).
      if (isUsableCoordinate(outcome.latitude, outcome.longitude)) {
        points.push({
          latitude: outcome.latitude,
          longitude: outcome.longitude,
          takenAtMs: photo.takenAt.getTime(),
        });
      }
    } else if (outcome.kind === "failed") {
      failures += 1;
      lastFailure = outcome.reason;
    }
  }

  // 2. 하나도 읽지 못했으면 좌표를 볼 수 없는 상태다 — 권한이 없을 때 여기로 온다.
  //    **「없다」가 아니라 「모른다」다.**
  if (failures === considered.length) {
    return { kind: "unknown", reason: `사진의 좌표를 읽지 못했다: ${lastFailure}` };
  }

  // 3. 읽을 수는 있었는데 좌표가 담긴 사진이 없었다 — 관측된 사실이다(FR-013c).
  if (points.length === 0) {
    return { kind: "none" };
  }

  return {
    kind: "known",
    value: {
      trace: tracePlaces(points),
      source: "photo-exif",
      photosWithLocation: points.length,
      photosConsidered: considered.length,
    },
  };
}

/**
 * 하루의 신호를 모은다.
 *
 * **어떤 경우에도 던지지 않는다**(FR-012). 포트가 무너져도 `unknown`이 나간다.
 *
 * **"지금"을 받지 않는다** — 어느 하루를 물을지는 `day`가 정한다. 하루가 닫혔는지는
 * `isDayClosed()`가 따로 답하며 그것은 파이프라인의 몫이다(002 FR-018a).
 */
export async function collectDaySignals(port: PhotoPort, day: DayDate): Promise<DaySignals> {
  const photos = await collectPhotos(port, day);
  // **`photos`를 먼저 정하고 그다음 좌표를 묻는다.** 좌표 단계가 통째로 실패해도
  // `photos`는 이미 손에 있다 — 그것이 FR-013a가 구현에서 성립하는 방식이다.
  const places = await collectPlaces(port, photos);

  return {
    date: day,
    photos,
    places,
    // 이 셋은 004가 끝나도 unknown이며 그것이 결론이다(FR-015).
    steps: { kind: "unknown", reason: STEPS_UNAVAILABLE },
    battery: { kind: "unknown", reason: NOT_COLLECTED_YET },
    connectivity: { kind: "unknown", reason: NOT_COLLECTED_YET },
  };
}

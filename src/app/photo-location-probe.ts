/**
 * 사진의 위치 정보를 읽을 수 있는가 — 사진 한 장의 좌표를 실제로 읽어 본다 (055 FR-021, research R6).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-media-library 57`은 `ACCESS_MEDIA_LOCATION`을 묻는 API를 주지 않는다(AGENTS 실측 규칙). 권한이 없으면 좌표 읽기가
 * `null`이 아니라 **예외**를 던지므로 그것이 유일한 판정 재료다. 021의 `PhotoPort`(`photosBetween`·`locationOf`)를 그대로
 * 쓴다 — `src/signals/expo-port.ts`에 새 메서드를 더하지 않는다(023 `checkPhotoPortFile`).
 *
 * - 사진 권한이 `granted`가 아니면 읽어 보지 않는다(`unknown` — 사진 행은 사진 읽기만으로 정한다).
 * - 최근 `LOOKBACK_DAYS`일에 사진이 없으면 `no-photo`.
 * - 가장 최근 사진의 좌표: 찾음·좌표 없음 → `ok`(권한은 있다), 읽기 실패 → `denied`.
 *
 * **짐작이 섞인다**(원칙 V): 읽기 실패에는 권한 없음 말고도 「그 사진이 막 지워짐」이 들어간다. 한 장만 보므로 드물게
 * 「일부 허용」을 잘못 보일 수 있다 — 미확인 잔여(spec)에 적었다. 사진을 여러 장 훑어 확률을 높이지 않는다(판정을 재는
 * 장치가 된다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PhotoLocationReading } from "./permission-tags";
import type { PhotoPort } from "../signals/port";

/** 위치 정보를 볼 사진을 찾는 거리 — 사람이 정한 값(최근 사진이면 충분하다, 오래된 사진까지 훑지 않는다) */
const LOOKBACK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function photoLocationProbe(
  port: Pick<PhotoPort, "photoPermission" | "photosBetween" | "locationOf">,
  nowMs: number,
): Promise<PhotoLocationReading> {
  try {
    if ((await port.photoPermission()) !== "granted") return "unknown";
    const photos = await port.photosBetween(nowMs - LOOKBACK_DAYS * DAY_MS, nowMs + 1);
    const latest = photos.at(-1);
    if (latest === undefined) return "no-photo";
    const outcome = await port.locationOf(latest.id);
    return outcome.kind === "failed" ? "denied" : "ok";
  } catch {
    return "unknown";
  }
}

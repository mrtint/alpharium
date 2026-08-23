/**
 * 좌표를 사람이 읽는 장소 이름으로 바꾸는 포트.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L5
 *       specs/017-diary-body-screen/research.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`signals/`의 다른 포트(`expo-port.ts`)와 같은 자리다** — 기기에 닿는
 * 유일한 통로이며, 판정하지 않는다.
 *
 * **예외를 던지지 않는다.** 권한 거부·오프라인·API 실패 모두
 * `{ kind: "unknown" }`로 접는다(원칙 IV, research.md §3) — 별도의 "권한 없음"
 * 갈래를 새로 만들지 않는다. 이름을 여러 개 주더라도 이 포트가 사람이 읽을
 * 문자열 하나로 이미 합쳐 돌려준다 — 호출자는 원시 응답 구조를 모른다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type GeocodingResult = { kind: "known"; value: string } | { kind: "unknown" };

export interface GeocodingPort {
  reverseGeocode(coordinate: { latitude: number; longitude: number }): Promise<GeocodingResult>;
}

/**
 * `expo-location`의 결과 한 항목에서 사람이 읽을 문자열 하나를 만든다.
 *
 * **행정구역 단위를 강제하지 않는다**(spec Assumptions) — 기기가 주는 값을
 * 그대로 사람이 읽을 수 있게 옮기는 것으로 충분하다. `district`(구/군) →
 * `city`(시) → `region`(도) 순으로 첫 번째로 있는 것을 쓴다.
 */
function nameFrom(address: {
  district?: string | null;
  city?: string | null;
  region?: string | null;
}): string | null {
  return address.district ?? address.city ?? address.region ?? null;
}

/**
 * 실제 기기의 `expo-location`을 감싼 구현.
 *
 * **지연 import다** — 모듈을 읽는 것만으로 `expo-location`이 해석되면
 * 웹·테스트 환경에서 무너진다(003·005·011·013과 같은 패턴).
 */
export function expoGeocodingPort(): GeocodingPort {
  return {
    async reverseGeocode(coordinate): Promise<GeocodingResult> {
      try {
        const Location = await import("expo-location");
        const results = await Location.reverseGeocodeAsync(coordinate);

        if (results.length === 0) return { kind: "unknown" };

        const name = nameFrom(results[0]);
        return name === null ? { kind: "unknown" } : { kind: "known", value: name };
      } catch {
        // 권한 거부·오프라인·API 실패 모두 같은 결과다(research.md §3) —
        // 별도의 "권한 없음" 갈래를 만들지 않는다(원칙 IV).
        return { kind: "unknown" };
      }
    },
  };
}

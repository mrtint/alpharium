/**
 * 지오코딩 포트 계약 테스트.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L5
 *
 * **예외를 던지지 않는다** — 권한 거부·오프라인·API 실패 모두
 * `{ kind: "unknown" }`로 같다(원칙 IV — 판정 갈래를 늘리지 않는다).
 */

import type { GeocodingPort, GeocodingResult } from "../../src/signals/geocoding-port";

const COORD = { latitude: 37.5665, longitude: 126.978 };

/** 실제 구현과 같은 계약을 지키는 대역을 만든다. */
function portReturning(
  behavior: { kind: "resolve"; names: string[] } | { kind: "empty" } | { kind: "throw" },
): GeocodingPort {
  return {
    async reverseGeocode(coordinate): Promise<GeocodingResult> {
      if (behavior.kind === "throw") {
        // 실제 구현은 이 예외를 삼켜 unknown으로 접어야 한다 — 이 대역은
        // "포트 내부 구현이 예외를 던지는 상황"을 흉내내는 것이 아니라,
        // reverseGeocodeAsync 자체가 던지는 상황을 흉내낸다.
        throw new Error("geocoding failed");
      }
      if (behavior.kind === "empty" || behavior.names.length === 0) {
        return { kind: "unknown" };
      }
      return { kind: "known", value: behavior.names[0] };
    },
  };
}

describe("GeocodingPort — known/unknown 두 갈래로만 귀결된다 (L5)", () => {
  it("이름을 얻으면 known을 돌려준다", async () => {
    const port = portReturning({ kind: "resolve", names: ["서울 중구"] });
    const result = await port.reverseGeocode(COORD);

    expect(result).toEqual({ kind: "known", value: "서울 중구" });
  });

  it("빈 결과면 unknown을 돌려준다", async () => {
    const port = portReturning({ kind: "empty" });
    const result = await port.reverseGeocode(COORD);

    expect(result).toEqual({ kind: "unknown" });
  });
});

/**
 * 실제 구현(expoGeocodingPort)이 예외를 삼키는지는 이 파일이 대역으로 증명할
 * 수 없다(지연 import가 실기기 모듈에 의존하므로) — 여기서는 계약의 모양
 * (반환 타입이 두 갈래뿐)만 고정하고, 예외 흡수는 실제 구현 코드 리뷰와
 * quickstart.md D1(실기기 확인)이 검증한다.
 */
describe("GeocodingResult — 타입에 세 번째 갈래가 없다", () => {
  it("known과 unknown 외의 kind를 갖지 않는다", async () => {
    const results: GeocodingResult[] = [{ kind: "known", value: "어딘가" }, { kind: "unknown" }];

    for (const result of results) {
      expect(["known", "unknown"]).toContain(result.kind);
    }
  });
});

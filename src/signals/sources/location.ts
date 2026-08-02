/**
 * T020 — 위치 소스 어댑터 (003 FR-249·FR-251)
 *
 * 내놓는 것은 **장소 표현 + 시간대의 쌍**과 **이동 여부**뿐이다.
 * **원시 좌표·이동 경로·속도를 담지 않는다** — 좌표는 장소 표현으로 바뀐 뒤 버려지고,
 * 이동은 참·거짓으로만 남는다. 거리도 속도도 내놓지 않는다.
 */
import { observed, unobserved } from "../observation";
import type { StayItem } from "../digest";
import { periodOfHour, type CollectionWindow, type LocationReading } from "./source";
import { log } from "../../logging";

/** 소스가 읽은 머무름 하나. **좌표가 아니라 장소 표현**으로 들어온다. */
export interface StaySample {
  /** 사람이 읽는 장소 표현. 좌표를 여기 넣지 않는다. */
  readonly place: string;
  readonly hour: number;
}

export interface LocationProvider {
  /** 머무른 장소들. 거부·미지원이면 `null`. */
  readStays(window: CollectionWindow): Promise<readonly StaySample[] | null>;
}

export async function readLocation(
  window: CollectionWindow,
  provider: LocationProvider,
): Promise<LocationReading> {
  let samples: readonly StaySample[] | null;
  try {
    samples = await provider.readStays(window);
  } catch (error) {
    log.warn("위치 소스 읽기 실패 — 미관측으로 남긴다", {
      error: error instanceof Error ? error.name : "unknown",
    });
    samples = null;
  }

  if (samples === null) {
    return { stays: unobserved(), moved: unobserved() };
  }

  const stays: readonly StayItem[] = samples.map((s) => ({
    place: s.place,
    period: observed(periodOfHour(s.hour)),
  }));

  // 이동 여부는 참·거짓뿐이다 — 거리·속도를 계산하지도, 내놓지도 않는다 (003 FR-251).
  const distinctPlaces = new Set(samples.map((s) => s.place));

  return { stays: observed(stays), moved: observed(distinctPlaces.size > 1) };
}

/**
 * `expo-location`을 provider로 감싼다. **좌표는 이 함수 밖으로 나가지 않는다** —
 * 역지오코딩으로 장소 표현을 얻은 뒤 좌표를 버린다.
 */
export function deviceLocationProvider(): LocationProvider {
  return {
    async readStays(window) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Location = require("expo-location") as typeof import("expo-location");

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return null;

      const position = await Location.getLastKnownPositionAsync();
      if (position === null) return [];

      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      // 좌표는 여기서 끝난다. 아래로 넘기는 것은 장소 표현과 시각뿐이다.
      const name = place?.name ?? place?.district ?? place?.city;
      if (!name) return [];

      return [{ place: name, hour: new Date(position.timestamp).getHours() }];
    },
  };
}

export type { CollectionWindow };

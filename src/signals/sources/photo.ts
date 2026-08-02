/**
 * T021 — 사진 소스 어댑터 (003 FR-220·FR-235·FR-252)
 *
 * 내놓는 것은 **시각대·장소·캡션 셋만**이다. 원본·경로·기기 정보·좌표를 **전부
 * 버린다** — 아래 변환을 지나면 그것들을 담을 자리가 없다.
 *
 * 사진 항목 **안에서도** 세 항목 각각이 개별적으로 미관측일 수 있다 (003 FR-252).
 * **캡션 생성에 실패하면 지어내지 않고 미관측으로 남긴다** (003 FR-235) — 여기서
 * 그럴듯한 문장을 채우는 것이 헌법 원칙 II가 금지한 자리다.
 */
import { observed, unobserved } from "../observation";
import type { PhotoItem } from "../digest";
import { periodOfHour, type CollectionWindow, type PhotoReading } from "./source";
import { log } from "../../logging";

/** 소스가 읽은 사진 하나. 이 자리에서만 존재하고 집계로 넘어가지 않는다. */
export interface PhotoSample {
  readonly hour: number;
  /** 장소 표현. 좌표가 아니다. 얻지 못했으면 `null`. */
  readonly place: string | null;
  /** 비전 캡션. **생성에 실패했으면 `null`** — 지어내지 않는다 (003 FR-235). */
  readonly caption: string | null;
}

export interface PhotoProvider {
  /** 그날 찍힌 사진들. 거부·미지원이면 `null`. */
  readPhotos(window: CollectionWindow): Promise<readonly PhotoSample[] | null>;
}

/** 셋만 옮긴다. 원본·경로·기기 정보는 이 변환을 통과할 자리가 없다 (003 FR-252). */
function toPhotoItem(sample: PhotoSample): PhotoItem {
  return {
    period: observed(periodOfHour(sample.hour)),
    place: sample.place === null ? unobserved() : observed(sample.place),
    // 캡션 실패는 미관측이다. 대체 문장을 넣지 않는다 (003 FR-235, 헌법 원칙 II).
    caption: sample.caption === null ? unobserved() : observed(sample.caption),
  };
}

export async function readPhotos(
  window: CollectionWindow,
  provider: PhotoProvider,
): Promise<PhotoReading> {
  let samples: readonly PhotoSample[] | null;
  try {
    samples = await provider.readPhotos(window);
  } catch (error) {
    log.warn("사진 소스 읽기 실패 — 미관측으로 남긴다", {
      error: error instanceof Error ? error.name : "unknown",
    });
    samples = null;
  }

  if (samples === null) return { photos: unobserved() };

  return { photos: observed(samples.map(toPhotoItem)) };
}

/**
 * `expo-media-library`를 provider로 감싼다.
 *
 * **사진 원본은 전송되지 않는다** (헌법 원칙 I 개발 예외 조건 2) — 이 자리에서 시각과
 * 장소만 읽고 자산 자체는 밖으로 나가지 않는다. 캡션 생성은 아직 이식되지 않았으므로
 * `null`(미관측)로 남긴다 — 지어내지 않는다.
 */
export function mediaLibraryProvider(): PhotoProvider {
  return {
    async readPhotos(window) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const MediaLibrary = require("expo-media-library") as typeof import("expo-media-library");

      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== "granted") return null;

      const start = new Date(window.observedAt);
      start.setHours(0, 0, 0, 0);

      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        createdAfter: start,
        createdBefore: window.observedAt,
      });

      // 시각만 읽는다. 자산의 uri·id·기기 정보는 여기서 끝난다.
      return assets.map((asset) => ({
        hour: new Date(asset.creationTime).getHours(),
        place: null,
        caption: null,
      }));
    },
  };
}

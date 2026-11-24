/**
 * `expo-media-library` 57로 사진 통로를 구현한다.
 *
 * 계약: specs/004-photo-signal-collection/contracts/photo-port.md
 *
 * **이 파일이 004에서 기기에 닿는 유일한 자리다.** 판정은 `collect.ts`에, 좌표 묶기는
 * `places.ts`에 순수 함수로 떼어 놓았으므로 기기 없이 검증되고, 여기만 실기기에서
 * 확인하면 된다(FR-017).
 *
 * **지연 import 하는 이유**: 001의 on-device 어댑터, 002의 저장, 003의 모델 통로와 같다.
 * 모듈 해석 자체가 실패할 수 있는 환경(웹·테스트)에서 이 파일을 불러오는 것만으로
 * 무너지지 않게 한다.
 */

import type { LocationOutcome, PermissionState, PhotoFacts, PhotoPort } from "./port";
import { readUriWithin } from "./uri-deadline";

/**
 * 이 앱은 **사진만** 본다.
 *
 * `granularPermissions`를 좁히지 않으면 `READ_MEDIA_VIDEO`·`READ_MEDIA_AUDIO`까지
 * 매니페스트에 들어간다(research.md §8) — 쓰지 않는 권한을 사용자에게 요구하는 것이다.
 * `app.json`의 플러그인 설정과 **같은 값이어야 한다.**
 */
const PHOTO_ONLY = ["photo"] as const;

/**
 * 권한 응답을 다섯 갈래로 옮긴다.
 *
 * **`canAskAgain: false`가 `blocked`다**(FR-023) — 안드로이드가 창을 띄우지 않는 상태이며,
 * 진단 화면이 「다시 요청」이 소용없음을 보여야 한다.
 *
 * ⚠️ **`accessPrivileges === "limited"`가 안드로이드에서 오는지 확인되지 않았다**
 * (research.md §2). 타입에 있으나 선택적이고 근거 구현이 iOS였다. 오지 않으면
 * 「일부만 허용」이 `granted`로 보이고 **FR-008을 지킬 수 없다** — 그때는 명세를 고친다
 * (quickstart D1, T043).
 */
function toPermissionState(response: {
  status: string;
  canAskAgain: boolean;
  accessPrivileges?: string;
}): PermissionState {
  if (response.accessPrivileges === "limited") return "limited";
  if (response.status === "granted") return "granted";
  if (response.status === "undetermined") return "undetermined";
  return response.canAskAgain ? "denied" : "blocked";
}

/** 좌표가 실제 좌표인지 본다. `(0,0)`은 좌표를 못 읽었을 때의 채움값일 수 있다(FR-013d) */
function isUsableCoordinate(latitude: number, longitude: number): boolean {
  if (latitude === 0 && longitude === 0) return false;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 129 — 한 번에 받는 사진 수. 사람이 정한 값(하루 사진 수 상한은 없다 — 페이지를 끝까지 넘긴다, 012) */
const PAGE_SIZE = 500;

/** 레거시 `getAssetsAsync`가 주는 사진 하나에서 쓰는 필드 */
type LegacyAsset = {
  id: string;
  filename?: string | null;
  uri?: string | null;
  width?: number | null;
  height?: number | null;
  creationTime?: number | null;
  mediaSubtypes?: readonly string[] | null;
};

/**
 * 129 — 레거시 목록 조회의 사진 하나를 사실로 옮긴다. **판정하지 않는다**(카메라 판정은 `camera-only.ts`).
 *
 * - 안드로이드는 `uri`가 `file://` + 파일 경로(MediaStore `_data`)다 → `localPath`.
 * - iOS는 `uri`가 `ph://`라 폴더 뜻이 없다 → 싣지 않고 `mediaSubtypes`를 싣는다.
 * - 크기 0·`null`은 모르는 것이다 → 싣지 않는다(원칙 V).
 *
 * export하지만 이 파일의 순수 헬퍼다 — 계약 테스트가 직접 검사한다.
 */
/**
 * 129 — 레거시 id를 새 API(`new Asset(id)`·`exeForMetadata`)가 쓰는 id 꼴로 옮긴다.
 *
 * **둘이 다르다**(설치본 직접 확인): 레거시는 안드로이드 MediaStore `_ID`(`"123"`), iOS 맨 `localIdentifier`를 주고,
 * 새 API는 안드로이드 `content://media/external/images/media/123`(`AssetMapper.kt` → `extractAssetContentUri`, 이미지),
 * iOS `ph://<localIdentifier>`(`AssetMapper.swift`)를 쓴다. 옮기지 않으면 `locationOf`·`filePathOf`가 조용히 실패하고
 * 저장된 일기의 사진 id(캐러셀·`vision-cache`)와도 어긋난다.
 *
 * ⚠️ Android 10(API 29)의 새 API는 `external_primary` 볼륨 URI를 쓴다 — 이 앱 대상 기기(Android 14+)에서는 `external`이다.
 */
export function newApiIdOf(legacyId: string, legacyUri: string): string {
  if (legacyUri.startsWith("ph://") || legacyId.startsWith("ph://")) {
    return legacyId.startsWith("ph://") ? legacyId : `ph://${legacyId}`;
  }
  if (/^\d+$/.test(legacyId)) return `${ANDROID_IMAGES_CONTENT_URI}/${legacyId}`;
  return legacyId;
}

/** 새 API가 안드로이드 이미지에 쓰는 기준 URI(`MediaStore.Images.Media.EXTERNAL_CONTENT_URI`) */
const ANDROID_IMAGES_CONTENT_URI = "content://media/external/images/media";

export function factsOfLegacyAsset(asset: LegacyAsset): PhotoFacts {
  const uri = typeof asset.uri === "string" ? asset.uri : "";
  // 레거시 안드로이드는 `_data`가 NULL이면 `"file://null"`을 만든다 — 모르는 것이다(원칙 V)
  const rawPath = uri.startsWith("file://") ? uri.slice("file://".length) : undefined;
  const localPath = rawPath === "null" ? undefined : rawPath;
  const takenAtMs =
    typeof asset.creationTime === "number" && asset.creationTime > 0 ? asset.creationTime : null;
  return {
    id: newApiIdOf(asset.id, uri),
    takenAtMs,
    ...(localPath !== undefined && localPath !== "" ? { localPath } : {}),
    ...(Array.isArray(asset.mediaSubtypes) ? { mediaSubtypes: asset.mediaSubtypes } : {}),
    ...(typeof asset.filename === "string" && asset.filename !== ""
      ? { filename: asset.filename }
      : {}),
    ...(typeof asset.width === "number" && asset.width > 0 ? { width: asset.width } : {}),
    ...(typeof asset.height === "number" && asset.height > 0 ? { height: asset.height } : {}),
  };
}

/** 실제 `expo-media-library`를 쓰는 통로 */
export function expoPhotoPort(): PhotoPort {
  return {
    async photoPermission(): Promise<PermissionState> {
      const lib = await import("expo-media-library");
      return toPermissionState(await lib.getPermissionsAsync(false, [...PHOTO_ONLY]));
    },

    /**
     * 좌표 접근 권한.
     *
     * ─────────────────────────────────────────────────────────────────────────
     * **확인된 제약**: `expo-media-library 57`은 `ACCESS_MEDIA_LOCATION`을 **따로 묻는
     * 함수를 주지 않는다.** 패키지 전체에서 이 권한은 `getLocation()`·`getExif()`의 주석에만
     * 등장하며, 조회 API가 없다(설치본 직접 확인, 2026-08-16).
     *
     * **031 — 온보딩에서는 이 권한을 단계로 묻지 않는다.** 조회할 수 없어 온보딩이
     * 같은 단계를 무한 반복했다(One UI 8.5 실기기). `collect.ts`가 실제 좌표 읽기로
     * 처리하며(`locationOf` → `places`), 이 두 함수는 진단 화면(`PermissionPanel`)만
     * `signals/port.ts`의 `PhotoPort`로 직접 쓴다 — 그래서 남겨 둔다.
     *
     * 그래서 **좌표를 실제로 읽어 보는 것이 유일한 판정 방법이고**, 그 결과는
     * `locationOf()`의 `failed`로 드러난다. `collect.ts`가 그것을 세어 판정한다.
     *
     * **여기서 사진 권한을 좌표 권한인 척 돌려주지 않는다.** 그러면 「좌표 권한이 있다」는
     * 거짓이 신호에 실린다 — 사진 권한이 허용돼도 `ACCESS_MEDIA_LOCATION`은 따로 거절될
     * 수 있기 때문이다(FR-013a). 모르는 것을 아는 척하지 않는 것이 헌법 원칙 V다.
     *
     * 사진 권한이 없으면 좌표도 볼 수 없다는 것만 확실하므로 그것만 반영한다.
     * ─────────────────────────────────────────────────────────────────────────
     */
    async locationPermission(): Promise<PermissionState> {
      const lib = await import("expo-media-library");
      const photo = toPermissionState(await lib.getPermissionsAsync(false, [...PHOTO_ONLY]));

      // 사진을 못 보면 좌표도 확실히 못 본다.
      if (photo !== "granted") return photo;

      // 사진은 보이지만 좌표 권한은 알 수 없다. 읽어 봐야 안다.
      return "undetermined";
    },

    async requestPhotoPermission(): Promise<PermissionState> {
      const lib = await import("expo-media-library");
      return toPermissionState(await lib.requestPermissionsAsync(false, [...PHOTO_ONLY]));
    },

    async requestLocationPermission(): Promise<PermissionState> {
      const lib = await import("expo-media-library");
      return toPermissionState(await lib.requestPermissionsAsync(false, [...PHOTO_ONLY]));
    },

    /**
     * 그 구간의 사진 메타데이터.
     *
     * **129 — 레거시 `getAssetsAsync`를 쓴다.** 새 API의 `exeForMetadata()`는 출처(안드로이드 파일 경로,
     * iOS 종류)를 주지 않는다. 레거시 조회는 한 커서에서 안드로이드 `_data` 경로와 iOS `mediaSubtypes`를
     * 함께 싣는다 — **사진마다 `getUri()`를 부르지 않는다**(SC-004, 2026-11-09 멈춤 호출). `resolveWithFullInfo`는
     * 끈 채다(켜면 EXIF를 연다).
     *
     * 경계는 배타라(`>`·`<`) 시작을 1ms 당긴다. **012 — 상한이 없다**: 페이지를 끝까지 넘긴다.
     */
    async photosBetween(fromMs: number, toMs: number): Promise<PhotoFacts[]> {
      const legacy = await import("expo-media-library/legacy");
      const facts: PhotoFacts[] = [];
      const seen = new Set<string>();
      let after: string | undefined;
      for (;;) {
        const page = await legacy.getAssetsAsync({
          first: PAGE_SIZE,
          ...(after !== undefined ? { after } : {}),
          mediaType: legacy.MediaType.photo,
          createdAfter: fromMs - 1,
          createdBefore: toMs,
          sortBy: [[legacy.SortBy.creationTime, true]],
          resolveWithFullInfo: false,
        });
        // 안드로이드 레거시 커서는 offset이라 조회 중 보관함이 바뀌면 같은 사진이 두 페이지에 올 수 있다 — id로 거른다
        for (const asset of page.assets) {
          const f = factsOfLegacyAsset(asset);
          if (!seen.has(f.id)) {
            seen.add(f.id);
            facts.push(f);
          }
        }
        if (!page.hasNextPage || page.assets.length === 0) break;
        after = page.endCursor;
      }
      return facts;
    },

    /**
     * 사진 하나의 좌표.
     *
     * **반드시 감싼다**(FR-012). `getLocation()`은 안드로이드에서 `ACCESS_MEDIA_LOCATION`이
     * 없으면 **`null`이 아니라 예외를 던진다**(타입 주석 명시, research.md §3). 감싸지
     * 않으면 좌표 권한이 없는 기기에서 **사진 신호 전체가 무너지고**, 「한쪽의 실패가 다른
     * 쪽을 오염시키지 않는다」(FR-013a)가 바로 여기서 깨진다.
     *
     * `getExif()`를 쓰지 않는다 — `{ [key: string]: any }`라 도분초 변환을 우리가 떠안게
     * 되고, 필요 없는 나머지 EXIF까지 읽는다.
     */
    async locationOf(photoId: string): Promise<LocationOutcome> {
      try {
        const lib = await import("expo-media-library");
        const asset = new lib.Asset(photoId);
        const location = await asset.getLocation();
        // 073 — await 완료 시점까지 JS 참조를 유지해 Hermes GC 조기 수거 방지
        if (asset.id === "") return { kind: "absent" };

        if (location === null) return { kind: "absent" };
        if (!isUsableCoordinate(location.latitude, location.longitude)) return { kind: "absent" };

        return { kind: "found", latitude: location.latitude, longitude: location.longitude };
      } catch (error) {
        // 권한 없음·사진 삭제됨·모듈 없음이 모두 여기로 온다. 「없다」가 아니라 「못 읽었다」다.
        return { kind: "failed", reason: messageOf(error) };
      }
    },

    /**
     * 사진 파일의 실제 경로 (011).
     *
     * **`getUri()`를 쓴다.** 설치본 타입이 안드로이드 예시를 직접 적는다:
     * `file:///storage/emulated/0/DCIM/Camera/IMG_20230915_123456.jpg`.
     *
     * **`file://`를 떼어 낸다** — 네이티브(`llama.rn`)가 받는 것은 파일 경로이지 URI가
     * 아니다. 붙은 채로 넘기면 **열지 못하고 빈 캡션이 되며 오류는 나지 않는다.**
     *
     * **반드시 감싼다** — `locationOf()`와 같은 이유다. 사진이 지워졌거나 권한이 없으면
     * 던지며, 그것이 하루 전체를 무너뜨리면 안 된다(FR-005a).
     */
    async filePathOf(photoId: string): Promise<string | null> {
      try {
        const lib = await import("expo-media-library");
        const asset = new lib.Asset(photoId);
        // 2026-11-09 — 콜백이 오지 않는 경우가 있어 한도 안에서만 기다린다(uri-deadline.ts)
        const uri = await readUriWithin(() => asset.getUri());
        // 073 — await 완료 시점까지 JS 참조를 유지해 Hermes GC 조기 수거 방지
        if (asset.id === "") return null;

        if (typeof uri !== "string" || uri === "") return null;
        return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
      } catch {
        // 못 읽은 것이다. 그 장은 읽히지 않고 나머지는 계속 읽는다.
        return null;
      }
    },
  };
}

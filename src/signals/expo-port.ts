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

/**
 * 023 — 파일 경로/URI에서 상위 폴더 이름 하나를 뽑는다.
 *
 * **문자열 처리만 한다.** 그 이름이 스크린샷·다운로드 폴더인지 대조하는 것은
 * `src/vision/select.ts`의 몫이다 — 여기서 `NON_CAMERA_FOLDERS`를 알면 분류가
 * 기기 계층으로 샌 것이다(spec Clarification, 헌법 검사 `checkPhotoPortFile`).
 *
 * - `file:///storage/emulated/0/DCIM/Camera/IMG_1.jpg` → `"Camera"`
 * - `content://media/external/images/media/123` → `undefined` (폴더 구간 없음)
 * - `""` / `null` / `undefined` / 슬래시 없는 문자열 → `undefined`
 *
 * 풀 수 없으면 `undefined`이며 그것이 "분류 불가"다(023 FR-004).
 *
 * **export하지만 이 파일의 순수 헬퍼다** — 계약 테스트(`expo-port.test.ts`)가
 * 문자열 파싱을 직접 검사한다. `getUri()` 호출부는 기기에서만 확인한다(004).
 */
export function folderNameOf(pathOrUri: string | null | undefined): string | undefined {
  if (typeof pathOrUri !== "string" || pathOrUri === "") return undefined;
  if (pathOrUri.startsWith("content://")) return undefined;

  const path = pathOrUri.startsWith("file://") ? pathOrUri.slice("file://".length) : pathOrUri;
  const parts = path.split("/").filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : undefined;
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
     * **`exeForMetadata()`를 쓰고 `exe()`를 쓰지 않는다**(research.md §1). 전자가 돌려주는
     * `AssetMetadata`는 "파일 경로를 풀거나 파일을 열지 않고" 얻어지며(타입 주석 명시),
     * **픽셀에 닿을 문 자체가 없다.** 그것이 FR-005를 계약이 아니라 구조로 보장한다.
     *
     * **012 — `.limit()`을 호출하지 않는다**(FR-014). 그 구간의 사진 전부를 돌려준다 —
     * 상한 자체가 없다.
     */
    async photosBetween(fromMs: number, toMs: number): Promise<PhotoFacts[]> {
      const lib = await import("expo-media-library");
      const { AssetField, MediaType, Query } = lib;

      const metadata = await new Query()
        .gte(AssetField.CREATION_TIME, fromMs)
        .lt(AssetField.CREATION_TIME, toMs)
        .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
        .orderBy(AssetField.CREATION_TIME)
        .exeForMetadata();

      // 023 — 폴더 이름을 여기서 채우지 않는다. `filePathOf()`의 경계를 잇는다
      // (그 주석: "PhotoFacts에 담지 않고 함수로 둔다"). 폴더 이름이 필요한
      // 자리(사진 선별을 실제로 하는 on-device.ts, 상한 초과인 하루)만
      // `folderNamesFor()`를 부른다 — 장수만 세는 004 경로는 `getUri()`를
      // 치르지 않는다.
      return metadata.map((asset) => ({ id: asset.id, takenAtMs: asset.creationTime }));
    },

    /**
     * 023 — 여러 사진의 상위 폴더 이름. `filePathOf()`가 이미 하는
     * `getUri()`를 재사용하되 여러 장을 병렬로 처리한다.
     *
     * **던지지 않는다** — 한 장이 실패하면 그 id는 맵에 `undefined`이고
     * 나머지는 채운다(004 FR-005a).
     */
    async folderNamesFor(photoIds: readonly string[]): Promise<Map<string, string | undefined>> {
      const lib = await import("expo-media-library");
      const entries = await Promise.all(
        photoIds.map(async (id): Promise<[string, string | undefined]> => {
          try {
            return [id, folderNameOf(await new lib.Asset(id).getUri())];
          } catch {
            return [id, undefined];
          }
        }),
      );
      return new Map(entries);
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
        const location = await new lib.Asset(photoId).getLocation();

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
        const uri = await new lib.Asset(photoId).getUri();

        if (typeof uri !== "string" || uri === "") return null;
        return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
      } catch {
        // 못 읽은 것이다. 그 장은 읽히지 않고 나머지는 계속 읽는다.
        return null;
      }
    },
  };
}

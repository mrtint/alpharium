/**
 * 066 — 일기에 저장된 사진 사본 경로를 지금의 앱 디렉터리로 옮긴다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **iOS는 앱을 업데이트하면 데이터 컨테이너 경로가 바뀐다**
 * (`/var/mobile/Containers/Data/Application/<UUID>/` — UUID가 새로 난다). 일기 파일에 절대
 * 경로로 남은 사본 경로(`DiaryEntry.photos[].resizedPath`)는 그 순간 죽은 경로가 되어
 * 캐러셀이 「이 사진은 이제 없어요」를 그린다. 안드로이드는 앱 데이터 경로가 고정이라
 * 드러나지 않았다.
 *
 * **저장 형식은 바꾸지 않는다.** 사본은 늘 `Paths.document/<VISION_CACHE_DIRECTORY>/<파일명>`에
 * 있으므로(013 FR-007) 읽는 쪽이 파일명만 살려 지금의 자리로 옮기면 옛 일기·백그라운드가 쓴
 * 일기 모두 같은 규칙으로 산다. 리사이즈를 건너뛴 원본 경로(013 C1)는 사본 디렉터리 밖이라
 * 손대지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 리사이즈 사본이 놓이는 앱 전용 디렉터리 (013 FR-007). `Paths.document` 아래다 —
 * `Paths.cache`는 OS가 앱 모르게 지울 수 있는 자리다. 058 지우기(`wipe-port.ts`)와
 * `on-device.ts`가 같은 값을 본다.
 */
export const VISION_CACHE_DIRECTORY = "vision-cache";

/** 저장된 사본 경로를 지금의 문서 디렉터리 기준으로 돌려준다. 사본 디렉터리 밖이면 그대로다. */
export function rehomeResizedPath(storedPath: string, documentDirectory: string): string {
  const marker = `/${VISION_CACHE_DIRECTORY}/`;
  const at = storedPath.lastIndexOf(marker);
  if (at < 0) return storedPath;
  const base = documentDirectory.endsWith("/") ? documentDirectory.slice(0, -1) : documentDirectory;
  return `${base}${marker}${storedPath.slice(at + marker.length)}`;
}

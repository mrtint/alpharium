/**
 * 129 — 「카메라로 찍은 사진인가」 판정. **저장소에서 이 판정은 여기 한 곳뿐이다**(FR-001).
 *
 * 계약: specs/129-camera-only-photos/contracts/camera-only.md (CO1~CO6)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 하루의 사진은 카메라로 찍은 것만이다(소유자, 2026-11-24). 화면 캡처·다운로드·메신저·퀵셰어
 * 사진은 처음부터 그 날의 재료가 아니다 — 수집(`collect.ts`)이 이 판정으로 거르고, 장수·첫 일기·
 * 자동 쓰기·장소·선별·캡션은 그 결과만 본다.
 *
 * **모르면 뺀다**(원칙 V) — 카메라로 찍었다고 확인하지 못한 사진을 카메라 사진으로 채우지 않는다.
 *
 * 기준은 전부 **사람이 정한 값이고 측정이 아니다**. export하지 않는다.
 * 기기 계층(`expo-port.ts`)은 사실만 싣고 여기를 import하지 않는다(헌법 검사 `checkPhotoPortFile`).
 * 시딩 폴더 이름은 저장소의 `src/`에서 이 파일에만 있다(헌법 검사 `checkSeedPhotoFile` SP1).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { EnvironmentResolution } from "../config/types";
import type { PhotoFacts } from "./port";

/** 카메라 폴더의 뿌리(1B — 타사 카메라 앱도 대개 여기 아래에 둔다) */
const CAMERA_ROOT = "dcim";

/** `DCIM/` 바로 아래인데 화면 캡처인 폴더(삼성은 스크린샷을 `DCIM/Screenshots`에 둔다) */
const SCREEN_FOLDERS: readonly string[] = ["screenshots", "screen recordings", "screenrecorder"];

/** 시딩 도구(`seed:day`·`sample:seed`)가 사진을 넣는 상대 경로. 개발 환경에서만 인정한다 */
const SEED_RELATIVE = ["pictures", "pocketlogseed"] as const;

/** 시딩 트리 안에서 카메라를 흉내 내는 하위 폴더(`scripts/seed`의 `folder: "Camera"`) */
const SEED_CAMERA_SUBFOLDER = "camera";

/** 128에서 옮겨 온 읽기 전 판정 — 화면 캡처로 볼 세로/가로 하한(폰 화면 ≈2.17, 카메라 ≤1.78) */
const SCREEN_ASPECT_MIN = 2;

/** 128에서 옮겨 온 읽기 전 판정 — 이 접두로 시작하는 파일 이름은 화면 캡처다 */
const SCREENSHOT_NAME_PREFIX = "screenshot";

/** iOS 종류 목록에서 화면 캡처를 뜻하는 값(`PHAssetMediaSubtype.photoScreenshot` → 레거시 `MediaSubtype.screenshot` 원시값, 설치본 `MediaLibraryRecords.swift`) */
const IOS_SCREENSHOT_SUBTYPE = "screenshot";

/**
 * 시딩 사진을 카메라 사진으로 인정해도 되는 환경인가 — **판정에 성공한 개발 환경(local·dev)만**.
 * 배포와 판정 실패는 인정하지 않는다(106 `allowsFastCycle`과 같은 꼴). 조립부(`wiring.ts`)만 부른다(SP2).
 */
export function allowsSeedPhotos(resolution: EnvironmentResolution): boolean {
  return resolution.ok && resolution.environment !== "prod";
}

/** 볼륨 뿌리를 벗긴 상대 경로 구간(소문자). 뿌리를 못 알아보면 `null` */
function relativeSegments(localPath: string): string[] | null {
  const parts = localPath.split("/").filter(Boolean);
  // /storage/emulated/<사용자>/…  ·  /storage/self/primary/…  ·  /storage/<볼륨 id>/…  ·  /sdcard/…
  if (parts[0] === "storage" && parts[1] === "self" && parts[2] === "primary" && parts.length > 3) {
    return parts.slice(3).map((p) => p.toLowerCase());
  }
  if (parts[0] === "storage" && parts[1] === "emulated" && parts.length > 3) {
    return parts.slice(3).map((p) => p.toLowerCase());
  }
  if (parts[0] === "storage" && parts.length > 2) return parts.slice(2).map((p) => p.toLowerCase());
  if (parts[0] === "sdcard" && parts.length > 1) return parts.slice(1).map((p) => p.toLowerCase());
  return null;
}

function looksLikeScreenCapture(facts: PhotoFacts): boolean {
  if (
    facts.filename !== undefined &&
    facts.filename.toLowerCase().startsWith(SCREENSHOT_NAME_PREFIX)
  ) {
    return true;
  }
  if (facts.width !== undefined && facts.height !== undefined && facts.width > 0) {
    return facts.height / facts.width >= SCREEN_ASPECT_MIN;
  }
  return false;
}

function cameraByPath(localPath: string, allowSeed: boolean): boolean {
  const segments = relativeSegments(localPath);
  if (segments === null || segments.length < 2) return false;
  const folders = segments.slice(0, -1); // 마지막은 파일 이름

  if (folders[0] === CAMERA_ROOT) {
    return folders[1] === undefined || !SCREEN_FOLDERS.includes(folders[1]);
  }
  // 시딩 트리는 실제 폴더를 흉내 낸다(`PocketlogSeed/Screenshots`·`Download`) — 바로 아래와 `Camera`만 카메라다.
  return (
    allowSeed &&
    folders[0] === SEED_RELATIVE[0] &&
    folders[1] === SEED_RELATIVE[1] &&
    (folders[2] === undefined || folders[2] === SEED_CAMERA_SUBFOLDER)
  );
}

/**
 * 이 사진이 카메라로 찍은 사진인가(CO1~CO5).
 *
 * - 이름·비율이 화면 캡처면 아니다(CO2).
 * - 파일 경로가 있으면(안드로이드) 경로로 가른다(CO3).
 * - 경로가 없고 종류 목록이 있으면(iOS) 스크린샷만 뺀다(CO4). 사파리·메신저에서 저장한 사진은
 *   iOS에서 카메라 사진과 같은 꼴이라 가르지 못한다 — 기기 정보를 읽는 호출은 11-09 멈춤 호출과
 *   같아 쓰지 않는다(research R2).
 * - 둘 다 없으면 출처를 모른다 — 뺀다(CO5).
 */
export function isCameraPhoto(facts: PhotoFacts, options: { allowSeed: boolean }): boolean {
  if (looksLikeScreenCapture(facts)) return false;
  if (facts.localPath !== undefined) return cameraByPath(facts.localPath, options.allowSeed);
  if (facts.mediaSubtypes !== undefined)
    return !facts.mediaSubtypes.includes(IOS_SCREENSHOT_SUBTYPE);
  return false;
}

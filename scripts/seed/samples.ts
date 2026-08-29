/**
 * 실사 샘플 사진 중 하나를 무작위로 고른다.
 *
 * 계약: scripts/samples/README.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **검증의 성질을 바꾸지 않는다.** 여기서 고르는 것은 EXIF를 패치할 원본 버퍼일
 * 뿐이고, 패치 로직(`exif.ts`)은 그대로다 — 길이를 유지한 자리 교체 원칙은
 * 어떤 사진이 오든 동일하게 적용된다.
 *
 * **폴더가 비어 있으면 검은 단색 템플릿으로 되돌아간다.** 실사 샘플은 선택
 * 사항이지 필수가 아니다 — 이 폴더 없이도 010은 처음부터 동작해 왔다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

import { templatePath } from "./exif.ts";

const SAMPLES_ROOT = join(process.cwd(), "scripts", "samples");

function isPhoto(name: string): boolean {
  return /\.(jpe?g)$/i.test(name);
}

function candidatesIn(subfolder: string): string[] {
  try {
    return readdirSync(join(SAMPLES_ROOT, subfolder))
      .filter(isPhoto)
      .map((name) => join(SAMPLES_ROOT, subfolder, name));
  } catch {
    // 폴더 자체가 없어도 실패가 아니다 — 검은 템플릿으로 되돌아간다
    return [];
  }
}

/**
 * 좌표를 심을 사진 하나의 경로를 고른다. `with-gps/`가 비어 있으면 기존 검은
 * 단색 템플릿(`seed-template.jpg`)을 준다.
 */
export function pickWithGpsSample(): string {
  const candidates = candidatesIn("with-gps");
  if (candidates.length === 0) return templatePath(true);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 좌표 없이 심을 사진 하나의 경로를 고른다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **⚠️ 2026-08-29 실측(023 T035, SM-S901N / Android 16)**: `no-gps/`의 실사
 * 샘플(2017년 Galaxy 사진)은 **patch 여부와 무관하게** 이 기기의 미디어
 * 스캐너가 `datetaken`을 NULL로 둔다 — 원본을 그대로 push해도 그렇다. EXIF에
 * GPS IFD 포인터는 있으나 좌표 데이터가 온전치 않은 것이 원인으로 보인다
 * (확인 안 함, 원칙 V). `mixed-clutter`·`screenshots-only`(Phase 8, 좌표
 * 없는 잡사진) seed가 "색인 6/10"으로 실패했다.
 *
 * `with-gps/` 샘플은 EXIF가 온전해 `patchDate`만 적용해도(`patchLocation`
 * 없이) `datetaken`이 정확히 들어간다 — 실측 확인. 그래서 **`with-gps/`
 * 후보를 먼저 쓴다.** 좌표를 심지 않는 사진에 원본의 GPS 태그가 남지만
 * `patchLocation()`을 부르지 않으므로 좌표는 덮이지 않고, seed는 그 사진을
 * `location: null`로 계획하므로 검증에 영향이 없다(README "no-gps/에 GPS
 * 태그가 있어도 상관없다"와 같은 취지).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function pickNoGpsSample(): string {
  // EXIF가 온전한 with-gps 샘플을 먼저 쓴다(patchLocation은 부르지 않는다).
  const usable = candidatesIn("with-gps");
  if (usable.length > 0) return usable[Math.floor(Math.random() * usable.length)];
  const legacy = candidatesIn("no-gps");
  if (legacy.length > 0) return legacy[Math.floor(Math.random() * legacy.length)];
  return templatePath(false);
}

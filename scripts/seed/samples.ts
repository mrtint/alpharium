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
 * 좌표 없이 심을 사진 하나의 경로를 고른다. `no-gps/`가 비어 있으면 기존 검은
 * 단색 템플릿(`seed-template-nogps.jpg`)을 준다.
 */
export function pickNoGpsSample(): string {
  const candidates = candidatesIn("no-gps");
  if (candidates.length === 0) return templatePath(false);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

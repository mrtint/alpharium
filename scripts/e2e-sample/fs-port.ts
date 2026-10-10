/**
 * 070 — 표본이 개발 기계의 파일에 닿는 자리 (`SampleFs`의 실제 구현).
 *
 * 쓰는 곳은 OS 임시 폴더뿐이고 읽는 곳은 gitignore된 캐시(`scripts/e2e-sample/.cache/`)뿐이다 — 저장소 경로에 사진을 쓰지 않는다(소스 계약 K-4).
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { SampleFs } from "./ensure.ts";

export const CACHE_DIRECTORY = () => join(process.cwd(), "scripts", "e2e-sample", ".cache");

export function realSampleFs(cacheDir: string = CACHE_DIRECTORY()): SampleFs {
  return {
    readCached(file) {
      try {
        return readFileSync(join(cacheDir, file));
      } catch {
        return null;
      }
    },
    makeTempDir() {
      return mkdtempSync(join(tmpdir(), "pocketlog-sample-"));
    },
    writeFile(path, bytes) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, bytes);
    },
    cleanup(dir) {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

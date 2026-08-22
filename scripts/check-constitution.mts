#!/usr/bin/env node
/**
 * 헌법 위반 자동 검사 CLI (FR-026).
 *
 * 판정 규칙은 scripts/constitution-rules.ts에 있다. 이 파일은 저장소를 훑어 그 규칙에
 * 넘기는 껍데기다 — 규칙을 여기에 복제하면 두 곳이 어긋난다.
 *
 * 실행 지점: npm run lint (개발 중), CI의 test 단계 (커밋 시)
 * 종료 코드: 위반 0건이면 0, 1건 이상이면 1 (FR-026)
 *
 * Node 24의 타입 스트리핑으로 빌드 없이 실행된다. CI도 Node 24를 쓴다.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  checkEnvFile,
  checkSeedFile,
  checkSourceFile,
  checkVisionFile,
  formatViolations,
  type Violation,
} from "./constitution-rules.ts";

/** 설정 파일 검사가 보는 자리 — 저장소 루트의 `.env*` */
function checkEnvFiles(root: string): Violation[] {
  const violations: Violation[] = [];

  for (const name of readdirSync(root)) {
    if (!name.startsWith(".env")) continue;
    if (!statSync(join(root, name)).isFile()) continue;
    violations.push(...checkEnvFile(name, readFileSync(join(root, name), "utf8")));
  }

  return violations;
}

/**
 * 소스 검사가 보는 자리 (006 FR-010).
 *
 * **`src/` 아래를 훑는다.** 어느 파일을 실제로 볼지는 `checkSourceFile`이 경로로
 * 정한다 — 여기서 다시 고르면 규칙이 두 곳에 생긴다.
 */
function checkSourceFiles(root: string, relative = "src"): Violation[] {
  const violations: Violation[] = [];
  const absolute = join(root, relative);

  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      violations.push(...checkSourceFiles(root, child));
    } else if (/\.tsx?$/.test(entry.name)) {
      const contents = readFileSync(join(root, child), "utf8");
      violations.push(...checkSourceFile(child, contents));
      // 011 — 사진 읽는 자리. 어느 파일이 대상인지는 checkVisionFile이 경로로 정한다.
      violations.push(...checkVisionFile(child, contents));
    }
  }

  return violations;
}

/**
 * 심는 도구 검사가 보는 자리 (010 FR-022, 원칙 IV).
 *
 * **`scripts/` 아래를 훑는다.** 어느 파일이 심는 도구인지는 `checkSeedFile`이 경로로
 * 정한다 — 위와 같은 이유로 여기서 다시 고르지 않는다.
 *
 * **⚠️ 등록하지 않으면 규칙이 있어도 돌지 않는다.** `run-device-tests.mjs`의 `FLOWS`에
 * 흐름을 등록하지 않으면 파일이 있어도 실행되지 않는 것과 같은 함정이며, 그러면
 * 초록불인데 아무것도 검사되지 않은 상태가 된다(헌법 원칙 V).
 */
function checkSeedFiles(root: string, relative = "scripts"): Violation[] {
  const violations: Violation[] = [];
  const absolute = join(root, relative);

  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      violations.push(...checkSeedFiles(root, child));
    } else if (/\.m?tsx?$/.test(entry.name)) {
      violations.push(...checkSeedFile(child, readFileSync(join(root, child), "utf8")));
    }
  }

  return violations;
}

/** 저장소를 훑는다. 설정과 소스와 심는 도구를 본다. */
function checkRepository(root: string): Violation[] {
  return [...checkEnvFiles(root), ...checkSourceFiles(root), ...checkSeedFiles(root)];
}

const violations = checkRepository(process.cwd());
console.log(formatViolations(violations));
process.exit(violations.length > 0 ? 1 : 0);

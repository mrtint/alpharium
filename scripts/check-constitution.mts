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
  checkSourceFile,
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
      violations.push(...checkSourceFile(child, readFileSync(join(root, child), "utf8")));
    }
  }

  return violations;
}

/** 저장소를 훑는다. 설정과 소스 둘 다 본다. */
function checkRepository(root: string): Violation[] {
  return [...checkEnvFiles(root), ...checkSourceFiles(root)];
}

const violations = checkRepository(process.cwd());
console.log(formatViolations(violations));
process.exit(violations.length > 0 ? 1 : 0);

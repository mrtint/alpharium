/**
 * 릴리스 번호 올림 진입점. 판정은 bump-version.ts(순수)가 하고 이 파일은 app.json만 읽고 쓴다.
 *
 *   npm run version:bump             # 기본(build): 버전 그대로, versionCode·buildNumber만 +1
 *   npm run version:bump -- patch    # 핫픽스: 1.0.0 → 1.0.1
 *   npm run version:bump -- minor    # 기능: 1.0.1 → 1.1.0
 *   npm run version:bump -- major
 *
 * 두 번호는 언제나 함께 오른다. 커밋은 사람이 한다 — 릴리스 노트(release-notes/ko.txt)를 같은 커밋에 고친다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bumpAppJson, type BumpLevel } from "./bump-version.ts";

const APP_JSON = join(dirname(fileURLToPath(import.meta.url)), "../../app.json");
const LEVELS: BumpLevel[] = ["build", "major", "minor", "patch"];

const level = (process.argv[2] ?? "build") as BumpLevel;
if (!LEVELS.includes(level)) {
  console.error("사용법: npm run version:bump [-- <build|patch|minor|major>]");
  process.exit(1);
}

try {
  const { text, before, after } = bumpAppJson(readFileSync(APP_JSON, "utf8"), level);
  writeFileSync(APP_JSON, text);
  console.log(`version     ${before.version} → ${after.version}`);
  console.log(`versionCode ${before.versionCode} → ${after.versionCode}`);
  console.log(`buildNumber ${before.buildNumber} → ${after.buildNumber}`);
  console.log("release-notes/ko.txt를 이번 빌드에 맞게 고쳐 같은 커밋에 넣는다.");
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

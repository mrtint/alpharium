/**
 * 릴리스 노트 점검 — 릴리스 워크플로의 설정 점검 단계가 부른다(비밀이 없는 단계). 14분짜리 빌드를 돌리기 전에 노트가 비었거나
 * 스토어 한도를 넘는 것을 잡는다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/release-notes/check.mts --store play|testflight [--file release-notes/ko.txt]
 */

import { readFileSync } from "node:fs";
import { normalizeNotes, PLAY_NOTES_MAX, TESTFLIGHT_NOTES_MAX } from "./notes.ts";

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
}

const LIMITS: Record<string, number> = { play: PLAY_NOTES_MAX, testflight: TESTFLIGHT_NOTES_MAX };
const store = option("store");
const file = option("file") ?? "release-notes/ko.txt";
if (store === undefined || LIMITS[store] === undefined) {
  console.error("사용법: check.mts --store play|testflight [--file <경로>]");
  process.exit(1);
}

try {
  const text = normalizeNotes(readFileSync(file, "utf8"), LIMITS[store]);
  console.log(`릴리스 노트 ${[...text].length}자 (${store} 한도 ${LIMITS[store]}자)`);
} catch (error) {
  console.error(
    `::error::${error instanceof Error ? error.message : `릴리스 노트를 읽지 못했다: ${file}`}`,
  );
  process.exit(1);
}

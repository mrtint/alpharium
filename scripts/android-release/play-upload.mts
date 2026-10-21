/**
 * 076 — Play 업로드 진입점. 흐름은 play-upload.ts가 하고 이 파일은 환경변수·파일·종료 코드만 만진다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/android-release/play-upload.mts \
 *     --aab <경로> --package <패키지> [--track internal] [--notes <릴리스 노트 파일>]
 *
 * `--notes`를 주면 그 글(한국어, `release-notes/ko.txt`)을 릴리스 노트(ko-KR)로 보낸다. 비었거나 500자를 넘으면 업로드 전에 실패한다.
 *
 * 서비스 계정 JSON은 환경변수 PLAY_SERVICE_ACCOUNT_JSON에서만 읽는다 — 인자·파일로 받지 않는다. 값은 어디에도 출력하지
 * 않고, 실패하면 play-upload.ts가 만든 안전한 문장 하나만 표준 오류에 쓴다.
 */

import { readFileSync } from "node:fs";
import { normalizeNotes, PLAY_NOTES_MAX } from "../release-notes/notes.ts";
import { uploadBundle } from "./play-upload.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
}

const aabPath = option("aab");
const packageName = option("package");
const track = option("track") ?? "internal";
if (!aabPath || !packageName) {
  fail(
    "사용법: play-upload.mts --aab <경로> --package <패키지> [--track internal] [--notes <파일>]",
  );
}

const serviceAccountJson = process.env.PLAY_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) fail("환경변수 PLAY_SERVICE_ACCOUNT_JSON 이 비어 있다");

let aab: Uint8Array;
try {
  aab = readFileSync(aabPath);
} catch {
  fail(`AAB를 읽지 못했다: ${aabPath}`);
}

const notesPath = option("notes");
let releaseNotes: { language: string; text: string }[] | undefined;
if (notesPath !== undefined) {
  try {
    releaseNotes = [
      { language: "ko-KR", text: normalizeNotes(readFileSync(notesPath, "utf8"), PLAY_NOTES_MAX) },
    ];
  } catch (error) {
    fail(error instanceof Error ? error.message : `릴리스 노트를 읽지 못했다: ${notesPath}`);
  }
}

try {
  const { versionCode } = await uploadBundle({
    deps: { fetch: globalThis.fetch, now: () => Date.now() },
    serviceAccountJson,
    packageName,
    track,
    aab,
    releaseNotes,
  });
  console.log(`업로드 완료: versionCode ${versionCode} (트랙 ${track})`);
} catch (error) {
  fail(error instanceof Error ? error.message : "업로드에 실패했다");
}

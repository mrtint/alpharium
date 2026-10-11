/**
 * 076 — Play 업로드 진입점. 흐름은 play-upload.ts가 하고 이 파일은 환경변수·파일·종료 코드만 만진다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/android-release/play-upload.mts \
 *     --aab <경로> --package <패키지> [--track internal]
 *
 * 서비스 계정 JSON은 환경변수 PLAY_SERVICE_ACCOUNT_JSON에서만 읽는다 — 인자·파일로 받지 않는다. 값은 어디에도 출력하지
 * 않고, 실패하면 play-upload.ts가 만든 안전한 문장 하나만 표준 오류에 쓴다.
 */

import { readFileSync } from "node:fs";
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
  fail("사용법: play-upload.mts --aab <경로> --package <패키지> [--track internal]");
}

const serviceAccountJson = process.env.PLAY_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) fail("환경변수 PLAY_SERVICE_ACCOUNT_JSON 이 비어 있다");

let aab: Uint8Array;
try {
  aab = readFileSync(aabPath);
} catch {
  fail(`AAB를 읽지 못했다: ${aabPath}`);
}

try {
  const { versionCode } = await uploadBundle({
    deps: { fetch: globalThis.fetch, now: () => Date.now() },
    serviceAccountJson,
    packageName,
    track,
    aab,
  });
  console.log(`업로드 완료: versionCode ${versionCode} (트랙 ${track})`);
} catch (error) {
  fail(error instanceof Error ? error.message : "업로드에 실패했다");
}

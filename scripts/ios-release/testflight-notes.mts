/**
 * TestFlight 「테스트할 내용」 진입점. 흐름은 testflight-notes.ts가 하고 이 파일은 환경변수·파일·종료 코드만 만진다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/ios-release/testflight-notes.mts \
 *     --notes <릴리스 노트 파일> --bundle <번들 id> --version <버전> --build <빌드 번호> [--locale ko]
 *
 * API 키는 환경변수 ASC_API_KEY_P8(PEM 본문)·ASC_KEY_ID·ASC_ISSUER_ID에서만 읽는다 — 인자·파일로 받지 않는다. 값은 어디에도
 * 출력하지 않고, 실패하면 testflight-notes.ts가 만든 안전한 문장 하나만 표준 오류에 쓴다.
 */

import { readFileSync } from "node:fs";
import { normalizeNotes, TESTFLIGHT_NOTES_MAX } from "../release-notes/notes.ts";
import { publishWhatsNew } from "./testflight-notes.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
}

const notesPath = option("notes");
const bundleId = option("bundle");
const version = option("version");
const buildNumber = option("build");
const locale = option("locale") ?? "ko";
if (!notesPath || !bundleId || !version || !buildNumber) {
  fail(
    "사용법: testflight-notes.mts --notes <파일> --bundle <번들 id> --version <버전> --build <빌드 번호> [--locale ko]",
  );
}

const keyP8 = process.env.ASC_API_KEY_P8;
const keyId = process.env.ASC_KEY_ID;
const issuerId = process.env.ASC_ISSUER_ID;
if (!keyP8 || !keyId || !issuerId) {
  fail("환경변수 ASC_API_KEY_P8·ASC_KEY_ID·ASC_ISSUER_ID 중 비어 있는 것이 있다");
}

let whatsNew: string;
try {
  whatsNew = normalizeNotes(readFileSync(notesPath, "utf8"), TESTFLIGHT_NOTES_MAX);
} catch (error) {
  fail(error instanceof Error ? error.message : `릴리스 노트를 읽지 못했다: ${notesPath}`);
}

try {
  const { buildId, action } = await publishWhatsNew({
    deps: {
      fetch: globalThis.fetch,
      now: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
    keyP8,
    keyId,
    issuerId,
    bundleId,
    version,
    buildNumber,
    locale,
    whatsNew,
  });
  console.log(
    `TestFlight 테스트할 내용 ${action === "created" ? "작성" : "수정"}: 빌드 ${buildId} (${locale})`,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "TestFlight 테스트할 내용을 쓰지 못했다");
}

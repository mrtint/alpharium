/**
 * 096 — 번호 점검 진입점(안드로이드). 판정은 version-check.ts, 조회는 play-upload.ts가 하고 이 파일은 환경변수·파일·종료 코드만 만진다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/android-release/version-check.mts \
 *     --app-json app.json --package <패키지> --commit <커밋 해시>
 *
 * 서비스 계정 JSON은 환경변수 PLAY_SERVICE_ACCOUNT_JSON에서만 읽는다 — 인자·파일로 받지 않는다. 값은 어디에도 출력하지 않는다.
 * 통과하면 `버전 · versionCode · 커밋 · 스토어 마지막` 한 줄을 표준 출력에, 실패하면 `::error::<문장>`을 표준 오류에 쓰고 1로 끝난다.
 */

import { readFileSync } from "node:fs";
import { listBundleVersionCodes } from "./play-upload.ts";
import { decideVersionCode, describeVersionCode } from "./version-check.ts";

function fail(message: string): never {
  // 스토어가 준 사유에 줄바꿈이 섞여도 워크플로 명령(::…::)으로 읽히지 않게 한 줄로 만든다
  console.error(`::error::${message.replace(/[\r\n]+/g, " ")}`);
  process.exit(1);
}

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
}

const appJsonPath = option("app-json");
const packageName = option("package");
const commit = option("commit");
if (!appJsonPath || !packageName || !commit) {
  fail("사용법: version-check.mts --app-json <경로> --package <패키지> --commit <커밋 해시>");
}

const serviceAccountJson = process.env.PLAY_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) fail("환경변수 PLAY_SERVICE_ACCOUNT_JSON 이 비어 있다");

let version: string;
let versionCode: number;
try {
  const expo = (JSON.parse(readFileSync(appJsonPath, "utf8")) as { expo?: Record<string, unknown> })
    .expo;
  const android = expo?.android as { versionCode?: unknown } | undefined;
  if (typeof expo?.version !== "string" || expo.version === "") {
    fail("app.json의 expo.version 이 문자열이 아니다");
  }
  if (typeof android?.versionCode !== "number" || !Number.isInteger(android.versionCode)) {
    fail("app.json의 expo.android.versionCode 가 정수가 아니다");
  }
  version = expo.version;
  versionCode = android.versionCode;
} catch {
  fail(`app.json을 읽지 못했다: ${appJsonPath}`);
}

try {
  const stored = await listBundleVersionCodes({
    deps: { fetch: globalThis.fetch, now: () => Date.now() },
    serviceAccountJson,
    packageName,
  });
  const verdict = decideVersionCode(versionCode, stored);
  if (!verdict.ok) fail(verdict.message);
  console.log(describeVersionCode({ version, current: versionCode, last: verdict.last, commit }));
} catch (error) {
  fail(error instanceof Error ? error.message : "Play의 번들 번호를 읽지 못했다");
}

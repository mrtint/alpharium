/**
 * 096 — 번호 점검 진입점(iOS). 판정은 build-number-check.ts, 조회는 testflight-notes.ts가 하고 이 파일은 환경변수·파일·종료 코드만 만진다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/ios-release/build-number-check.mts \
 *     --app-json app.json --bundle <번들 id> --commit <커밋 해시>
 *
 * API 키는 환경변수 ASC_API_KEY_P8(PEM 본문)·ASC_KEY_ID·ASC_ISSUER_ID에서만 읽는다 — 인자·파일로 받지 않는다. 값은 어디에도 출력하지 않는다.
 * 통과하면 `버전 · 빌드 · 커밋 · 스토어 마지막` 한 줄을 표준 출력에, 실패하면 `::error::<문장>`을 표준 오류에 쓰고 1로 끝난다.
 */

import { readFileSync } from "node:fs";
import { decideBuildNumber, describeBuildNumber } from "./build-number-check.ts";
import { listBuildNumbers } from "./testflight-notes.ts";

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
const bundleId = option("bundle");
const commit = option("commit");
if (!appJsonPath || !bundleId || !commit) {
  fail("사용법: build-number-check.mts --app-json <경로> --bundle <번들 id> --commit <커밋 해시>");
}

const keyP8 = process.env.ASC_API_KEY_P8;
const keyId = process.env.ASC_KEY_ID;
const issuerId = process.env.ASC_ISSUER_ID;
if (!keyP8 || !keyId || !issuerId) {
  fail("환경변수 ASC_API_KEY_P8·ASC_KEY_ID·ASC_ISSUER_ID 중 비어 있는 것이 있다");
}

let version: string;
let buildNumber: string;
try {
  const expo = (JSON.parse(readFileSync(appJsonPath, "utf8")) as { expo?: Record<string, unknown> })
    .expo;
  const ios = expo?.ios as { buildNumber?: unknown } | undefined;
  if (typeof expo?.version !== "string" || expo.version === "") {
    fail("app.json의 expo.version 이 문자열이 아니다");
  }
  if (typeof ios?.buildNumber !== "string" || !/^\d+$/.test(ios.buildNumber)) {
    fail("app.json의 expo.ios.buildNumber 가 정수 문자열이 아니다");
  }
  version = expo.version;
  buildNumber = ios.buildNumber;
} catch {
  fail(`app.json을 읽지 못했다: ${appJsonPath}`);
}

try {
  const stored = await listBuildNumbers({
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
  });
  const verdict = decideBuildNumber(buildNumber, version, stored);
  if (!verdict.ok) fail(verdict.message);
  console.log(
    describeBuildNumber({
      version,
      current: buildNumber,
      last: verdict.last,
      commit,
      ignored: verdict.ignored,
    }),
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "App Store Connect의 빌드 번호를 읽지 못했다");
}

/**
 * 076 — 서명 확인 진입점. 판정은 verify-signature.ts(순수)가 하고 이 파일은 keytool과 파일만 만진다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/android-release/verify-signature.mts <aab> [<기대 지문 파일>]
 *   node … verify-signature.mts --check-expected-only [<기대 지문 파일>]     # 사전 점검: 지문 파일만 본다
 *
 * 통과하면 소유자와 지문을 표준 출력에 한 줄씩 쓰고 0, 실패하면 이유를 표준 오류에 쓰고 1. 비밀을 다루지 않는다.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCertificate, parseExpectedFingerprint, verifySigner } from "./verify-signature.ts";

const DEFAULT_EXPECTED = join(dirname(fileURLToPath(import.meta.url)), "upload-key.sha256");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readExpected(path: string): string | undefined {
  return existsSync(path) ? parseExpectedFingerprint(readFileSync(path, "utf8")) : undefined;
}

const args = process.argv.slice(2);

if (args[0] === "--check-expected-only") {
  const path = args[1] ?? DEFAULT_EXPECTED;
  if (readExpected(path) === undefined) {
    fail(`기대 지문 파일이 없거나 형식이 틀리다: ${path} (AA:BB:… 대문자 16진수 32바이트)`);
  }
  console.log("기대 지문 파일: 형식 정상");
  process.exit(0);
}

const aab = args[0];
if (!aab) fail("사용법: verify-signature.mts <aab> [<기대 지문 파일>]");

let output = "";
try {
  // 영어 로캘을 못 박는다 — 한국어 JDK는 `소유자:`로 찍는다 (LC_ALL=C는 로캘을 못 바꿨다)
  output = execFileSync(
    "keytool",
    ["-J-Duser.language=en", "-J-Duser.country=US", "-printcert", "-jarfile", aab],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (error) {
  // keytool 오류 출력은 서명 없음·파일 없음 같은 안내뿐이라 그대로 보여도 비밀이 아니다
  const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
  fail(`keytool 실행 실패: ${detail}`);
}

const verdict = verifySigner(
  parseCertificate(output),
  readExpected(args[1] ?? DEFAULT_EXPECTED),
);
if (!verdict.ok) fail(verdict.reason);
console.log(`소유자: ${verdict.owner}`);
console.log(`SHA-256: ${verdict.sha256}`);

#!/usr/bin/env node
/**
 * 실기기 자동 테스트 실행기 (FR-021d, FR-021e).
 *
 * 기기가 연결돼 있으면 Maestro로 실기기 테스트를 돌리고, 없으면 건너뛴다.
 * 기기가 없다는 이유로 전체 테스트 실행이 실패하지 않는다(FR-021d).
 *
 * **건너뛴 것을 통과로 보고하지 않는다(FR-021e).**
 * "돌아서 통과함"과 "기기가 없어 돌지 못함"이 결과에서 구분되어야 한다.
 * 헌법 원칙 V — 관측된 것과 관측하지 못한 것을 구분해 적는다.
 *
 * 이 구분이 없으면 기기 없이 돌린 CI가 전부 초록불인데 온디바이스는 한 번도 검증되지
 * 않은 상태가 되고, 그 사실을 아무도 모른다.
 */

import { spawnSync } from "node:child_process";

const FLOW = ".maestro/skeleton.yml";

/** 결과 상태. skipped는 passed가 아니다. */
const PASSED = "passed";
const FAILED = "failed";
const SKIPPED = "skipped";

function has(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: true });
  return result.status === 0 ? result.stdout : null;
}

function connectedDevices() {
  const output = has("adb", ["devices"]);
  if (output === null) return null; // adb 자체가 없다

  return output
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("\tdevice"))
    .map((line) => line.split("\t")[0]);
}

function report(status, reason) {
  const line = {
    [PASSED]: "PASSED  — 실기기 테스트가 돌아서 통과했다",
    [FAILED]: "FAILED  — 실기기 테스트가 돌아서 실패했다",
    [SKIPPED]: "SKIPPED — 실기기 테스트가 돌지 못했다 (통과가 아니다)",
  }[status];

  console.log("");
  console.log(`실기기 테스트: ${line}`);
  if (reason) console.log(`  까닭: ${reason}`);

  if (status === SKIPPED) {
    console.log("");
    console.log("  이 실행은 온디바이스를 검증하지 않았다.");
    console.log("  기능이 끝났다고 말하려면 최소 한 번은 실기기에서 돌아야 한다.");
  }
  console.log("");
}

function main() {
  const devices = connectedDevices();

  if (devices === null) {
    report(SKIPPED, "adb를 찾지 못했다");
    process.exit(0);
  }

  if (devices.length === 0) {
    report(SKIPPED, "연결된 안드로이드 기기가 없다");
    process.exit(0);
  }

  if (has("maestro", ["--version"]) === null) {
    report(SKIPPED, "Maestro가 설치되지 않았다");
    process.exit(0);
  }

  console.log(`기기 ${devices.length}대 연결됨: ${devices.join(", ")}`);
  console.log("");
  console.log("  이 흐름은 앱이 실기기에서 온디바이스로 도는 것을 검증한다.");
  console.log("  앱이 local 환경(데스크톱 서버)으로 떠 있으면 실패한다 — 그것이 옳다.");
  console.log("  실기기 검증은 dev 환경에서 한다: EXPO_PUBLIC_APP_ENV=dev");
  console.log("");

  const run = spawnSync("maestro", ["test", FLOW], { stdio: "inherit", shell: true });

  if (run.status === 0) {
    report(PASSED);
    process.exit(0);
  }

  report(FAILED, `maestro가 종료 코드 ${run.status}로 끝났다`);
  process.exit(1);
}

main();

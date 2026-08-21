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

/**
 * 돌릴 흐름들.
 *
 * **하나라도 실패하면 전체가 실패다.** 일부만 통과한 것을 통과로 보고하면, 기기 없이
 * 초록불인 것과 구분되지 않는다(헌법 원칙 V).
 */
const FLOWS = [
  ".maestro/skeleton.yml",
  ".maestro/model-acquisition.yml",
  // 005 — 생성 패널. **여기 등록하지 않으면 흐름이 있어도 돌지 않고**, 그러면 초록불인데
  // 아무것도 검증되지 않은 상태가 된다(헌법 원칙 V).
  ".maestro/generate-diary.yml",
  // 006 — 사용자 경로. **진단 화면을 거치지 않고 일기에 닿는가**를 본다.
  ".maestro/diary-user-path.yml",
  // 007 — 캐릭터 선택과 그만두기. **누가 쓰는지 고를 수 있는가**와
  // **30초를 견디고 끊을 수 있는가**를 본다.
  ".maestro/diary-character-select.yml",
  // 008 — 내려받기 충돌. **거부가 보이는가**와 **받던 것이 사라지지 않는가**를 본다.
  // ⚠️ 실제 내려받기가 없으면 안쪽 블록이 SKIPPED로 지나간다 — **건너뛴 것은 통과가
  // 아니므로**(원칙 V) 그때는 quickstart.md F1~F4를 손으로 확인한다.
  ".maestro/download-conflict.yml",
];

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

  // Maestro는 JVM이고, 흐름 파일을 **플랫폼 기본 문자셋**으로 읽는다. 한국어 Windows에서는
  // 그것이 CP949라서 UTF-8로 저장된 `assertVisible: "환경"`이 `ȯ��`로 뭉개진 채 기기에
  // 전달된다 — 화면에 "환경"이 멀쩡히 있어도 실패한다.
  //
  // 실측 (2026-08-14): maestro 출력 바이트가 `c8 af b0 e6`이었고, 이것은 "환경"의 CP949
  // 인코딩과 정확히 일치했다. `-Dfile.encoding=UTF-8`을 주면 "환경"으로 바르게 읽힌다.
  //
  // 이 줄이 없으면 **흐름 파일에 한글을 쓸 수 없다.** 검증 문구를 영어로 바꿔 우회하지
  // 않는다 — 화면이 한국어이므로 검증도 한국어여야 하고, 우회하면 같은 함정이 다음 흐름에서
  // 되풀이된다.
  const failed = [];
  for (const flow of FLOWS) {
    console.log(`▶ ${flow}`);
    const run = spawnSync("maestro", ["test", flow], {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8" },
    });
    if (run.status !== 0) failed.push(`${flow} (종료 코드 ${run.status})`);
  }

  if (failed.length === 0) {
    report(PASSED);
    process.exit(0);
  }

  report(FAILED, `실패한 흐름: ${failed.join(", ")}`);
  process.exit(1);
}

main();

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
 *
 * **이 실행기는 dev(debug) 빌드를 전제한다 — release 빌드를 만들지도 요구하지도
 * 않는다.** 실기기 검증의 기본은 dev이며, release 확인은 저장소 소유자가 그 세션에서
 * 명시적으로 요청했을 때만 손으로 한다(2026-09-09 확정, AGENTS.md 「테스트」 절).
 * 아래 주석들이 "release 재확인"을 미검증 항목으로 적은 자리는 **그 스펙 시점의
 * 기록**이지 이 실행기가 해야 할 일이 아니다.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 돌릴 흐름들.
 *
 * **하나라도 실패하면 전체가 실패다.** 일부만 통과한 것을 통과로 보고하면, 기기 없이
 * 초록불인 것과 구분되지 않는다(헌법 원칙 V).
 */
// ★ 051 — 홈의 `⋯` 메뉴를 없앴다(저장소 소유자 지시, 2026-09-28). 메뉴로 설정·개발자에 들어가던 흐름
// 열한 개는 **여기서 뺐다** — 설정 화면 구성과 함께 전면 재개편한다(저장소 소유자 결정). 파일은 `.maestro/`에
// 남아 있으나 돌지 않는다: skeleton, model-acquisition, diary-user-path, diary-character-select,
// download-conflict, photo-vision, diary-body-screen, scheduled-diary-notification, prompt-preview,
// parallel-model-download, welcome-naming.
const FLOWS = [
  // 005 — 생성 패널. **여기 등록하지 않으면 흐름이 있어도 돌지 않고**, 그러면 초록불인데
  // 아무것도 검증되지 않은 상태가 된다(헌법 원칙 V).
  ".maestro/generate-diary.yml",
  // 009 → 049 — 지난 하루를 골라 쓴다. **스트립을 넘겨 사흘 밖(4주 전)에 닿는가**를 본다.
  // ⚠️ 「고른 하루의 날짜로 저장된다」(SC-013)는 여기서 자동화하지 않는다 — 실제 생성이
  // 필요하다. quickstart를 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/past-day-diary.yml",
  // 012 → 049 — 오늘의 일기. **앱을 열면 오늘이 골라져 있고 언제나 쓰기 버튼이 있는가**와
  // **덮어쓰기 확인이 뜨는가**를 본다(049가 정오 제한을 없앴다).
  // ⚠️ **오늘을 실제로 생성하는 것(049 D8)은 여기 없다** — 캐릭터·모델이 필요하다.
  // quickstart를 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/today-diary.yml",
  // 015 — 쓰는 중 독백. **단계별·사진 장별로 서로 다른 문구가 보이는가**를 본다.
  // ⚠️ **정밀 시나리오(A3 실패 유도, A4 그만두기 타이밍)는 여기 없다** — 비행기
  // 모드 전환과 정확한 타이밍은 Maestro로 재현하기 어렵다. quickstart.md A3·A4를
  // 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/writing-monologue.yml",
  // 016 — 쓰는 중 독백 확장. **모델 로드 구간(콜드/핫 스타트)에서 캐릭터
  // 이름이 포함된 문구가 보이는가**를 본다. ⚠️ 장수 갈래(B3)·정직성 경계
  // (B4)·로드 실패(B5)·로드 도중 취소(B6)는 여기 없다 — quickstart.md
  // B3~B6를 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/writing-monologue-expansion.yml",
  // 021 — 통합 권한 온보딩. **새 설치 시 온보딩이 일기 목록보다 먼저 뜨는가**,
  // **전부 건너뛰어도 크래시 없이 진입하는가**, **재실행 시 다시 안 뜨는가**를 본다.
  // ⚠️ **핵심 검증(D0 권한 실측, D2 has_media>0, D3 부분 허용, D5 OS 설정 링크·복귀
  // 갱신, D6 020 배터리 로직 제거·시드, 문안 리뷰)은 여기 없다** — adb 조작·실제
  // 생성·OS 화면 이동·사람의 눈이 필요하다. quickstart.md D0~D6를 손으로 확인한다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/unified-permission-onboarding.yml",
  // 023 — 사진 선별 알고리즘 고도화. `many-camera`(12장, `folder` 미지정) 하루로
  // 「빠르게 봄」 `quiet` 생성을 걸어 **상한 초과 하루의 캡션+생성이 무너지지 않고
  // 완주하는가**를 본다(SEED_DAY로 심은 날짜를 넘긴다 — 선행: `npm run seed:day --
  // many-camera <날짜>`).
  // ⚠️ **핵심 검증은 여기 없다** — 상한 값 실측(T031, `adb logcat`의 캡션·토큰),
  // 시간 분포가 하루에 걸치는가(T036, 캡션된 `takenAt` 읽기), 잡사진 필터링
  // (D1, `mixed-clutter`로 Screenshots·Download 제외 확인)은 사람이 logcat과
  // 저장된 일기를 읽어 판단한다. quickstart.md D1~D4를 손으로 확인한다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/photo-selection-over-limit.yml",
  // 051 — 쓴 날 읽기(홈이 곧 상세). 025 `diary-photo-gallery.yml`을 대체한다(갤러리 없음, 순환).
  // 사진 2장 이상인 쓴 날을 골라 제목·지면·캐러셀 배지·순환·「다시 쓰기」 → 확인 → 취소를 본다.
  // `-e WRITTEN_DAY=<날> -e WRITTEN_DAY_PHOTOS=<장수>`가 필요하다 — 없으면 첫 단계에서 실패한다.
  // ⚠️ 흑백·제스처 분리·작성 시각 갱신은 여기 없다 — 051 quickstart D3·D4·D7을 사람이 본다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/written-day-reading.yml",
  // 029 — 일기 쓰기 흐름 단순화. **홈에서 "일기 쓰기" 한 번 탭으로 생성이
  // 시작되는가**(캐릭터·사진 설정·장소명 위젯이 홈에서 사라졌는가), **최초 실행
  // 시 필수 에셋 다운로드 단계가 권한 뒤에 오고 건너뛸 수 없는가**를 본다.
  // ⚠️ **핵심 검증(Q1 실제 다운로드 완주 → 첫 일기, Q3 마지막 캐릭터로 쓰임,
  // Q4 설정 세 섹션이 자동 판정을 덮어씀, Q5 세션 중 손상 안내)은 여기 없다** —
  // ~2GB 다운로드·실제 생성·모델 파일 조작·사람의 눈이 필요하다. quickstart.md
  // Q1~Q6를 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/writing-flow-simplified.yml",
  // 040 — 초기 권한 획득과 첫 실행 흐름 재설계. **새 설치에서 로고 →
  // 권한 스텝 자동 순차 → 작명 화면(다운로드 대기 없이)까지 크래시
  // 없이 도달하는가**를 본다.
  // ⚠️ **핵심 검증(실제 ~2GB 다운로드 완주 → liveness → 자동 첫 일기
  // 생성, SC-002 체감 시간, 정오 이전 시각, 재시작 이어가기, 기존
  // 사용자 비노출)은 여기 없다** — 실제 다운로드·온디바이스 추론·기기
  // 시각 조작·재실행 타이밍이 필요하다. quickstart.md 1~12번을 손으로
  // 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/first-run-flow.yml",
  // 045 — 다운로드 동의 안내와 진행 슬라이드. **이미 필수 자산이 준비된
  // 기기에서 동의·다운로드 화면이 재노출되지 않는가**(FR-009)와 **모델
  // 정보가 화면에 남아 있지 않은가**(FR-003, 원칙 III)를 본다.
  // ⚠️ **핵심 검증(동의 Dialog 노출·거부 버튼 없음·슬라이드 1~4 순서
  // 전환·완료 화면 버튼·작명 게이트)은 여기 없다** — `pm clear` + 새
  // 다운로드 세션이 필요하다. quickstart.md D1~D5를 손으로 확인한다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/download-consent-flow.yml",
  // 048 — 일기 홈 1d와 화면 이동 구조. **탭 줄 없이 헤더·스트립·신호 줄·하단 바가
  // 보이고, `⋯` 메뉴로 설정에 들어갔다 「← 일기」·뒤로 가기로 돌아오는가**를 본다.
  // ⚠️ **신호 줄 숫자 대조·prod 메뉴는 여기 없다(049 — 정오 전환은 사라졌다)** — 기기
  // 시각·합성 하루·권한 조작·prod Metro가 필요하다. quickstart.md D3~D7을 손으로
  // 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/diary-home-1d.yml",
  // 049 — 주간 스트립. **오른쪽으로 넘기면 이전 주(요일 유지), 오늘이 든 주에서 왼쪽으로
  // 넘기면 그대로(튕김)**인가를 본다.
  // ⚠️ 끌림·튕김·크로스페이드가 실제로 부드럽게 움직이는지는 여기 없다 — 움직임은
  // 판정하지 못한다(C9). quickstart D3~D5를 눈으로 본다. **건너뛴 것은 통과가 아니다**.
  ".maestro/week-strip-swipe.yml",
  // 050 — 대화상자 기반. **덮어쓰기 확인이 홈 위에 뜨고 뒤로 가기·취소가 홈을 그대로 두는가**와
  // **달력으로 이전 달의 날에 뛰어 헤더가 그 날이 되는가**를 본다.
  // ⚠️ 덮어쓰기 블록은 오늘에 일기가 있어야 돈다(없으면 건너뜀). 덮개 누름·다시 쓰기 완주·월·연 목록·
  // 미래 칸은 여기 없다 — quickstart D2·D6·D9·D11을 눈으로 본다. **건너뛴 것은 통과가 아니다**.
  ".maestro/dialog-foundation.yml",
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

  // ── 테스트 전 앱 초기화 루틴 ──────────────────────────────────────────────
  // 버전 확인할 것 없이 테스트를 위한 버전으로 대치(replace: adb install -r),
  // pm clear로 날리고 다시 시작한다.
  const APK_PATH = "android/app/build/outputs/apk/debug/app-debug.apk";
  const PKG = "com.anonymous.alpharium";
  const ACTIVITY = `${PKG}/.MainActivity`;

  console.log("▶ 테스트 전 앱 초기화 루틴 (대치 설치 + pm clear + 재시작)");
  for (const serial of devices) {
    const sArgs = devices.length > 1 ? ["-s", serial] : [];
    if (existsSync(APK_PATH)) {
      console.log(`  - [${serial}] dev 빌드 APK 대치 설치: ${APK_PATH}`);
      spawnSync("adb", [...sArgs, "install", "-r", APK_PATH], { stdio: "inherit", shell: true });
    } else {
      console.log(`  - [${serial}] [안내] ${APK_PATH} 없음 (대치 설치 건너뜀)`);
    }
    console.log(`  - [${serial}] 앱 데이터 초기화: pm clear ${PKG}`);
    spawnSync("adb", [...sArgs, "shell", "pm", "clear", PKG], { stdio: "inherit", shell: true });
    console.log(`  - [${serial}] 앱 다시 시작: ${ACTIVITY}`);
    spawnSync("adb", [...sArgs, "shell", "am", "start", "-n", ACTIVITY], {
      stdio: "inherit",
      shell: true,
    });
  }
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
  //
  // ★ 흐름 전부를 `maestro test` **한 번**에 넘긴다(048 실측, SM-S901N). 흐름마다 따로 부르면
  // 그때마다 JVM 기동 + 기기 드라이버 재설치·연결로 약 35초씩 기기가 멈춰 있었다 — 흐름
  // 하나의 명령 실행이 약 40초인데 그만큼을 대기로 더 썼다. 한 번에 넘기면 기동은 한 번이고,
  // 한 흐름이 실패해도 Maestro가 다음 흐름으로 넘어간다. 드라이버는 이미 깔려 있으면 다시
  // 깔지 않는다(`--no-reinstall-driver`).
  //
  // 인자로 흐름 파일을 주면 그것만 돈다: `node scripts/run-device-tests.mjs .maestro/a.yml`
  const requested = process.argv.slice(2);
  const flows = requested.length > 0 ? requested : FLOWS;
  const junit = join(mkdtempSync(join(tmpdir(), "alpharium-maestro-")), "report.xml");

  console.log(`▶ 흐름 ${flows.length}개를 한 번에 실행`);
  const run = spawnSync(
    "maestro",
    ["test", "--no-reinstall-driver", "--format", "junit", "--output", junit, ...flows],
    {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8" },
    },
  );

  if (run.status === 0) {
    report(PASSED);
    process.exit(0);
  }

  report(FAILED, `실패한 흐름: ${failedFlows(junit) ?? `알 수 없음 (종료 코드 ${run.status})`}`);
  process.exit(1);
}

/** JUnit 보고서에서 실패한 흐름 이름을 모은다. 보고서가 없으면 null. */
function failedFlows(path) {
  if (!existsSync(path)) return null;
  const xml = readFileSync(path, "utf8");
  const names = [
    ...xml.matchAll(/<testcase\b[^>]*\bname="([^"]*)"[^>]*>(?:(?!<\/testcase>)[\s\S])*<failure/g),
  ].map((m) => m[1]);
  return names.length > 0 ? names.join(", ") : null;
}

main();

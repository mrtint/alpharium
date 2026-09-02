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
  // 009 — 지난 하루를 골라 쓴다. **고를 수 있는 하루가 셋으로 늘었는가**를 본다.
  // ⚠️ 되돌림(FR-009)과 「고른 하루의 날짜로 저장된다」(SC-013)는 여기서 자동화하지
  // 않는다 — 04:00을 기다려야 하고 기기 날짜를 바꿀 수 없다. quickstart B2·B3을
  // 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/past-day-diary.yml",
  // 011 — 사진의 내용을 본다. **고르는 자리가 있는가**와 **모델이 드러나지 않는가**를 본다.
  // ⚠️ **이 기능의 핵심 검증(D2)은 여기 없다** — 같은 하루를 「보지 않음」과 「빠르게 봄」
  // 으로 각각 써서 **전문을 견주어야** 하고, 「일기가 나왔다」는 「사진을 봤다」의 증거가
  // 아니므로 자동으로 판정할 수 없다. quickstart D1~D8을 손으로 확인한다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/photo-vision.yml",
  // 012 — 오늘의 일기. **정오 이후 오늘이 고르는 자리에 있는가**와 **덮어쓰기 확인이
  // 뜨는가**를 본다.
  // ⚠️ **이 기능의 핵심 검증(D2, 정오 이후 오늘의 실제 생성)은 여기 없다** — 기기의
  // 지금 시각이 실제로 정오 이후여야 하고 캐릭터·모델이 필요하다. quickstart B2
  // D1~D13을 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
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
  // 017 — 일기 본문 화면 개선. **저장된 일기의 사진·소요 시간 표시**와
  // **장소명 설정 토글·고지 문구**를 본다.
  // ⚠️ **이 기능의 핵심 검증(D2 원본 삭제 후 유지, D3a 제목 사람 검수, D4
  // 콜드 스타트 체감, D5 실제 생성·본문 일치, D6 로스터 전수)은 여기 없다**
  // — 실제 생성과 사람의 눈이 필요하다. quickstart.md D1~D6를 손으로
  // 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/diary-body-screen.yml",
  // 020 — 시간대 지정 자동 일기 + 완성 알림. **자동 생성 설정 화면에
  // 목표 시각·토글이 있는가**, **근사치 안내와 배터리 예외 링크가
  // 보이는가**, **정밀도를 암시하는 문구가 없는가**를 본다.
  // ⚠️ **이 기능의 핵심 검증(실제 백그라운드 트리거, 알림 발생·탭
  // 라우팅, SC-002 24h 소크, SC-003 배터리 예외 라운드, 경합 재현,
  // release 재확인)은 여기 없다** — 기기 시각 조작·장시간 방치·실제
  // 생성 완료가 필요하다. quickstart.md §2·§3·§4·§6를 손으로 확인한다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/scheduled-diary-notification.yml",
  // 021 — 통합 권한 온보딩. **새 설치 시 온보딩이 일기 목록보다 먼저 뜨는가**,
  // **전부 건너뛰어도 크래시 없이 진입하는가**, **재실행 시 다시 안 뜨는가**를 본다.
  // ⚠️ **핵심 검증(D0 권한 실측, D2 has_media>0, D3 부분 허용, D5 OS 설정 링크·복귀
  // 갱신, D6 020 배터리 로직 제거·시드, 문안 리뷰)은 여기 없다** — adb 조작·실제
  // 생성·OS 화면 이동·사람의 눈이 필요하다. quickstart.md D0~D6를 손으로 확인한다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/unified-permission-onboarding.yml",
  // 022 — 개발자 탭 입력 프롬프트 미리보기. **캐릭터별 프롬프트 원본이 buildPrompt()의
  // 출력 그대로 렌더되는가**(화자 규칙 첫 줄·언어 지시 줄), **두 프리셋이 보이는가**,
  // **근사 크기가 "실측 토큰 아님" 라벨과 함께 보이는가**(원칙 IV)를 본다.
  // ⚠️ D4(스크롤·복사)·D5(사용자 화면 무노출)·D6(prod 게이트)는 여기 없다 —
  // 사람의 눈·prod 빌드가 필요하다. quickstart.md D1~D6를 손으로 확인한다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/prompt-preview.yml",
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
  // 025 — 일기 본문 사진 슬라이더 & 풀스크린 갤러리. 사진 2장 이상인 저장된
  // 일기를 열어 슬라이더·위치 표시가 뜨고, 탭하면 갤러리가 그 순번에서 열리며
  // 닫기 버튼으로 상세 화면에 돌아오는가를 본다.
  // ⚠️ **가로 스와이프 갱신·순환 없음·회전 유지(FR-015a)·집합 일치(SC-003)는
  // 여기 없다** — 사람이 quickstart.md §2에서 확인한다(원칙 V).
  ".maestro/diary-photo-gallery.yml",
  // 026 — 모델 병렬·동시 내려받기. **캐릭터 두 개를 동시에 받을 수 있는가**,
  // **하나를 멈춰도 나머지가 계속되는가**, **탭 복귀 시 전부 복원되는가**를 본다.
  // ⚠️ **핵심 검증(세그먼트 병렬 속도 대조, HF CDN Range 유지, 세그먼트 이어받기,
  // 폴백 완주)은 여기 없다** — adb logcat·state.json·probeRange 강제 조작이
  // 필요하다. quickstart.md Q0~Q6를 손으로 확인한다. **건너뛴 것은 통과가
  // 아니다**(원칙 V).
  ".maestro/parallel-model-download.yml",
  // 029 — 일기 쓰기 흐름 단순화. **홈에서 "일기 쓰기" 한 번 탭으로 생성이
  // 시작되는가**(캐릭터·사진 설정·장소명 위젯이 홈에서 사라졌는가), **최초 실행
  // 시 필수 에셋 다운로드 단계가 권한 뒤에 오고 건너뛸 수 없는가**를 본다.
  // ⚠️ **핵심 검증(Q1 실제 다운로드 완주 → 첫 일기, Q3 마지막 캐릭터로 쓰임,
  // Q4 설정 세 섹션이 자동 판정을 덮어씀, Q5 세션 중 손상 안내)은 여기 없다** —
  // ~2GB 다운로드·실제 생성·모델 파일 조작·사람의 눈이 필요하다. quickstart.md
  // Q1~Q6를 손으로 확인한다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/writing-flow-simplified.yml",
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

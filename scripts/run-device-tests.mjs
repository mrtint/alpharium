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
// ★ 059 — 051이 홈의 `⋯` 메뉴를 없애며 FLOWS 밖으로 뺐던 흐름 열한 개를 하나씩 정했다. **되살린 넷**(아래 등록): skeleton·prompt-preview·
// diary-body-screen·scheduled-diary-notification — 새 진입(점 셋 → 설정 → 「개발자」 행 → 「진단」 행, 개발 환경은 7번 탭 없이 처음부터 켜짐)으로 고쳤다.
// **폐기한 일곱**(파일 삭제 — 검증 대상이 제품에서 사라졌다):
//  - model-acquisition·download-conflict·parallel-model-download: 설정의 캐릭터 목록·내려받기 화면이 없다(055 S5). 로스터가 하나이고(037) 다시 받기는
//    개발자 화면의 「모듈 다시 받기」 한 경로다 — 그 경로는 059 quickstart를 사람이 본다.
//  - diary-character-select·welcome-naming: 설정의 「일기 작성자」 고르기·이름 줄이 없다(이름 바꾸기는 설정 「이름」 행 + 이름 바꾸기 화면, 첫 실행 작명은
//    first-run-flow가 본다).
//  - photo-vision: 사진 보기 설정(보지 않음·빠르게·자세히)이 042에서 없어졌다 — 사진은 늘 본다(헌법 v1.7.0).
//  - diary-user-path: 「⋯」 메뉴 경로였다. 진단을 거치지 않고 일기에 닿는 길은 generate-diary·today-diary가 본다.
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
  // 073 — 홈에서 「일기」 글자가 사라진 것(055)만 고쳤다(홈이 떴는가는 `day-strip`이 정한다). 온보딩이 끝난 기준 상태가 전제라 층 1로 돈다(`NEEDS_LAYER1_BASELINE`).
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
  // ⚠️ 사진 색·배지 추종·제스처 분리·작성 시각 갱신은 여기 없다 — 051 quickstart D3·D4·D7을 사람이 본다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/written-day-reading.yml",
  // 052 — 읽기 스크롤. **긴 본문의 쓴 날을 읽으면 스트립이 접히는가**, **끝에서 「다시 쓰기」가 올라오는가**,
  // **맨 위까지 올리면 펼쳐지는가**를 본다(접힘 표시·펴는 누름은 없다). 051처럼
  // `-e WRITTEN_DAY=<화면보다 긴 본문의 쓴 날>`이 필요하다 — 없으면 첫 단계에서 실패한다.
  // ⚠️ 접힘의 움직임(240ms·되튐 없음)·접힘 경계의 반복 여부·캐러셀 제스처 분리는 여기 없다 — 052 quickstart
  // D2·D3·D12·SC-006을 사람이 본다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/reading-scroll.yml",
  // 053 — 쓸 재료. **권한을 회수한 채로 열면 두 칸이 「권한이 없어요 ›」인가**, **그때 「일기 쓰기」가 「기록을
  // 볼 수 없어요」 확인을 먼저 띄우고 취소하면 그대로인가**를 본다(`launchApp`이 `permissions: {all: deny}`를
  // 준다 — 이 흐름은 회수한 채로 끝난다).
  // ⚠️ OS 권한 창에서 허용·「다시 묻지 않음」의 설정 안내·설정에서 돌아온 재조회·관측된 0의 회색 숫자와 안내 한 줄·
  // 「지어낸 하루」 표시·큰 글꼴은 여기 없다 — 053 quickstart D2·D4~D6·D8~D11을 사람이 본다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/writing-material.yml",
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
  // 054 — 제자리 쓰기. **쓰는 동안 홈을 떠나지 않고(헤더 「쓰는 중」·검정 「그만두기」 바), 스트립·헤더 날짜가
  // 잠기며, 그만두면 쓰기 전 상태로 돌아오는가**를 본다.
  // ⚠️ 혼잣말 페이드·실패 토스트(위치·3초·쓸어 닫기)·큰 글꼴은 여기 없다 — 움직임과 실패 유도가 필요하다.
  // 054 quickstart D3·D7~D10을 사람이 화면 녹화로 본다. 모델이 없으면 쓰는 중 블록이 SKIPPED다.
  // **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/in-place-writing.yml",
  // 056 — 매일 쓰는 시각과 장소 이름. **자동으로 쓰기가 켜져 있으면 시각 행이 있고, 행 → 시 격자 대화상자에서 칸 한 번에
  // 값이 바뀌며(「…시쯤」), 「취소」는 바꾸지 않고, 장소 이름 행 → 세 갈래 대화상자도 칸 한 번에 바뀌는가**를 본다.
  // 끝에서 시각을 오후 10시·장소를 「자동」으로 둔다(기기 설정을 바꾼다). 12시간 형식(ko) 기기를 가정한다.
  // ⚠️ 펼침 움직임·다시 예약·바깥 누름·뒤로·「켬」의 권한 창·두 번째 열기의 읽는 중 없음·토글 꺼짐 손잡이·큰 글꼴은 여기
  // 없다 — 056 quickstart Q1·Q3·Q4·Q6~Q9를 사람이 본다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/settings-time-place.yml",
  // 059 → 073 — 개발자 화면 → 진단(개발 환경 전용). **환경·추론 위치(기기 · CPU)·저장 점검(N편 · 정상)이 보이는가**를 본다. 설정 → 「개발자」 행 → 「진단」 행이 닿는 길이다.
  // 073 — 060이 진단을 일곱 묶음으로 바꿔 옛 줄(「모듈 상태」·「loaded」·「on-device」)이 사라져 고쳤다. 네이티브 추론 모듈의 실제 적재는 층 2(실제 모델로 쓰기)가 본다.
  // ⚠️ 배포 환경(7번 탭으로 켜기·진단 그룹 없음)·모듈 다시 받기·온보딩부터 다시는 여기 없다 — 059 quickstart를 사람이 본다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/skeleton.yml",
  // 022 → 059 → 073 — 진단의 입력 프롬프트 미리보기. 프리셋 둘이 눌러 바뀌고 본문 상자·근사 크기 라벨이 보이는가(프롬프트 문안 글자는 단언하지 않는다 — 문안은 prompt.ts에서 바뀌고 바이트 동일성은 기기 없는 테스트가 잠근다). 진입은 skeleton과 같다.
  ".maestro/prompt-preview.yml",
  // 017 → 051 → 059 — 쓴 날 본문과 장소 이름 대화상자. 설정의 「장소 이름으로 보기」 행이 새 자리다.
  ".maestro/diary-body-screen.yml",
  // 020 → 056 → 059 — 설정의 자동 쓰기·시각·배터리 행과 개발자 → 진단의 「지금 자동 생성」 버튼.
  // ⚠️ 끝에서 기기의 자동 쓰기 설정이 바뀔 수 있다 — 실행 전에 원래 값을 읽어 둔다.
  ".maestro/scheduled-diary-notification.yml",
  // 064 — 상태 흉내(개발 환경 전용). **흉내를 하나 켜면 홈에 DEV가 서고, 쓰기 바가 차단 토스트만 띄우며, 끄면 DEV가 사라지는가**를 본다.
  // 흉내를 끈 채로 끝낸다. ⚠️ 날짜 흉내·실패 토스트·권한 없음 칸·진단 두 버튼·헤드리스 자동 쓰기·재시작 유지·메뉴 끄기는 여기 없다 —
  // 064 quickstart를 사람이 본다. **건너뛴 것은 통과가 아니다**(원칙 V).
  ".maestro/state-simulation.yml",
  // 069 — 층 1(생성 없는 화면 흐름) 새 흐름 셋. `--layer1`이 만드는 기준 상태(오늘부터 사흘 쓴 날, 자동 쓰기 꺼짐)를 전제한다 — 일반 실행(`pm clear`)에서는
  // 쓴 날이 없어 실패한다. 근거와 단언은 각 파일 머리, 기능별 대응은 docs/e2e/feature-flow-map.md.
  ".maestro/restart-persistence.yml",
  ".maestro/single-photo-swipe.yml",
  ".maestro/settings-developer-sweep.yml",
  // 070 — 30일치 표본(MediaStore 사진)을 전제한다. `--layer1`의 「표본 보장」 단계가 심고 대표 날 값을 `-e`로 넘긴다 — 일반 실행(`pm clear`)에서는 표본도 값도 없어 실패한다.
  ".maestro/sample-days.yml",
  // 073 — 층 2(실제 모델로 쓰는 스모크) 넷. `--layer2`가 흐름마다 기준 상태를 만들고 따로 부른다 — 일반 실행(`pm clear` 뒤)에서는 돌지 않는다(`LAYER2_FLOWS`). 근거와 단언은 각 파일 머리, 기능별 대응은 docs/e2e/feature-flow-map.md.
  ".maestro/layer2-write-and-read.yml",
  ".maestro/layer2-open-app-writes.yml",
  ".maestro/layer2-diagnostics-try-write.yml",
  ".maestro/layer2-first-run-auto-diary.yml",
];

/**
 * 069 — 층 1: 일기를 쓰지 않고 끝나는 화면 흐름. `--layer1`로만 돈다(`pm clear` 없이 `scripts/layer1/runner.ts`가 기준 상태를 만든다).
 * **여기 있는 흐름은 모두 위 `FLOWS`에도 있어야 한다** — 등록하지 않은 흐름은 초록불인데 아무것도 검증하지 않는다.
 * 기능 → 흐름 대응표(어느 흐름이 무엇을 지키는가, 왜 층 1이 아닌가)의 정본은 `docs/e2e/feature-flow-map.md`다 — 표를 여기 복제하지 않는다.
 */
const LAYER1_FLOWS = [
  // 069 새 흐름 — 기준 상태(쓴 날 픽스처)를 전제한다
  ".maestro/restart-persistence.yml",
  ".maestro/single-photo-swipe.yml",
  ".maestro/settings-developer-sweep.yml",
  // 기존 흐름 중 생성 없이, 수정 없이 기준 상태에서 통과한 것(2026-10-10 실기기). 못 넣은 흐름과 이유는 대응표에 있다.
  ".maestro/dialog-foundation.yml",
  ".maestro/diary-home-1d.yml",
  ".maestro/week-strip-swipe.yml",
  ".maestro/diary-body-screen.yml",
  // 073 — 낡은 흐름 셋을 현재 화면에 맞게 고쳤고(생성 없음) 기준 상태에서 통과했다 — 위반 주입으로 실패도 확인(2026-10-10)
  ".maestro/skeleton.yml",
  ".maestro/prompt-preview.yml",
  ".maestro/today-diary.yml",
  // 상태 흉내를 켰다 끄므로 마지막에 둔다 — 중간에 실패해도 다음 실행의 기준 상태 복원이 흉내 기록을 지운다
  ".maestro/state-simulation.yml",
  // 070 — 표본 위에서 날마다 다른 상황의 사진·장소 칸을 본다(대표 날 값은 실행기가 만든다)
  ".maestro/sample-days.yml",
];

/**
 * 069 — 층 1 기준 상태(쓴 날 픽스처)를 전제하는 흐름. **일반 실행(`pm clear` 뒤라 쓴 날이 없다)에서는 돌리지 않는다** — 돌리면 전제가 없어 실패한다.
 * 위 `FLOWS`에는 등록돼 있다(등록이 없으면 아무것도 검증하지 않는 초록불이다). `--layer1`로 돈다.
 */
const NEEDS_LAYER1_BASELINE = [
  ".maestro/restart-persistence.yml",
  ".maestro/single-photo-swipe.yml",
  ".maestro/settings-developer-sweep.yml",
  // 073 — 온보딩이 끝난 기준 상태가 전제다(`pm clear` 뒤에는 첫 실행 화면이 홈을 가린다)
  ".maestro/skeleton.yml",
  ".maestro/prompt-preview.yml",
  ".maestro/today-diary.yml",
  // 070 — 기준 상태에 더해 30일치 표본과 실행기가 넘기는 `-e` 값이 필요하다
  ".maestro/sample-days.yml",
];

/**
 * 073 — 층 2: 실제 모델로 일기를 쓰는 스모크 흐름. `--layer2`로만 돈다(흐름마다 기준 상태를 다시 만들고 따로 부른다 — `scripts/layer2/runner.ts`).
 * **여기 있는 흐름은 모두 위 `FLOWS`에도 있어야 한다**(등록하지 않은 흐름은 초록불인데 아무것도 검증하지 않는다) 그리고 `scripts/layer2/flows.ts`의 표와 같아야 한다 —
 * 일반 실행(`pm clear` 뒤라 쓴 날 픽스처·표본이 없다)에서는 돌리지 않는다. 기능 → 흐름 대응은 docs/e2e/feature-flow-map.md.
 */
const LAYER2_FLOWS = [
  ".maestro/layer2-write-and-read.yml",
  ".maestro/layer2-open-app-writes.yml",
  ".maestro/layer2-diagnostics-try-write.yml",
  ".maestro/layer2-first-run-auto-diary.yml",
];

/** 결과 상태. skipped는 passed가 아니다. */
const PASSED = "passed";
const FAILED = "failed";
const SKIPPED = "skipped";
const ABORTED = "aborted";

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
    [ABORTED]: "ABORTED — 기준 상태를 만들지 못해 흐름을 돌리지 않았다 (통과가 아니다)",
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

async function runLayer2Mode() {
  const { adbDevice } = await import("./layer1/device.ts");
  const { runLayer2WithSample } = await import("./layer2/with-sample.ts");
  const { LAYER2_FLOWS: table } = await import("./layer2/flows.ts");
  const { realSampleStep } = await import("./e2e-sample/layer1-step.ts");
  const requested = process.argv.slice(2).filter((arg) => arg !== "--layer2");
  const flows = requested.length > 0 ? table.filter((f) => requested.includes(f.file)) : table;
  const log = (line) => console.log(line);
  const result = await runLayer2WithSample({ device: adbDevice(), flows, log }, realSampleStep(log));
  const collected = result.perFlow.filter((f) => f.collected !== undefined);
  if (collected.length > 0) {
    console.log("");
    console.log("사람이 읽을 일기 (자동 채점은 없다):");
    for (const f of collected) console.log("  " + f.collected);
  }
  if (result.status === PASSED) {
    report(PASSED);
    process.exit(0);
  }
  if (result.status === SKIPPED) {
    report(SKIPPED, result.reason);
    process.exit(0);
  }
  report(result.status === ABORTED ? ABORTED : FAILED, result.reason);
  process.exit(1);
}

async function runLayer1Mode() {
  const { adbDevice } = await import("./layer1/device.ts");
  const { runLayer1WithSample } = await import("./layer1/with-sample.ts");
  const { realSampleStep } = await import("./e2e-sample/layer1-step.ts");
  const requested = process.argv.slice(2).filter((arg) => arg !== "--layer1");
  const flows = requested.length > 0 ? requested : LAYER1_FLOWS;
  const log = (line) => console.log(line);
  // 070 — 흐름 앞에 30일치 표본을 보장하고(없거나 낡았으면 s30- 사진만 지우고 다시 심는다) 대표 날 값을 `-e`로 넘긴다.
  const result = await runLayer1WithSample({ device: adbDevice(), flows, log }, realSampleStep(log));
  if (result.status === PASSED) {
    report(PASSED);
    process.exit(0);
  }
  if (result.status === SKIPPED) {
    report(SKIPPED, result.reason);
    process.exit(0);
  }
  // aborted(기준 상태를 못 만듦)·failed 모두 통과가 아니다 — 앞의 것은 흐름을 돌리지 않았으므로 문구가 다르다
  report(result.status === ABORTED ? ABORTED : FAILED, result.reason);
  process.exit(1);
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
  const PKG = "com.a810labs.pocketlog";
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
  const skippedForBaseline = FLOWS.filter((f) => NEEDS_LAYER1_BASELINE.includes(f) || LAYER2_FLOWS.includes(f));
  const flows = requested.length > 0 ? requested : FLOWS.filter((f) => !skippedForBaseline.includes(f));
  if (requested.length === 0 && skippedForBaseline.length > 0) {
    console.log(`  (층 1 기준 상태나 층 2가 필요한 흐름 ${skippedForBaseline.length}개는 여기서 돌지 않는다 — npm run test:layer1 / npm run test:layer2)`);
  }
  const junit = join(mkdtempSync(join(tmpdir(), "pocketlog-maestro-")), "report.xml");

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
  // 069 — 자기 닫힘 `<testcase .../>`를 건너뛴다. 옛 정규식은 통과한 흐름의 태그에서 시작해 다음 흐름의 `<failure`까지 먹어 통과한 흐름을 실패로 보고했다.
  // 같은 규칙이 scripts/layer1/junit.ts(테스트 있음)에 있다 — 이 파일은 `.ts`를 정적으로 불러오지 않는다(경고).
  const names = [];
  for (const match of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    if (match[2] === undefined || !/<failure\b/.test(match[2])) continue;
    const name = /\bname="([^"]*)"/.exec(match[1]);
    if (name !== null) names.push(name[1]);
  }
  return names.length > 0 ? names.join(", ") : null;
}

if (process.argv.includes("--layer2")) {
  await runLayer2Mode();
} else if (process.argv.includes("--layer1")) {
  await runLayer1Mode();
} else {
  main();
}

/**
 * 진단의 「자동 쓰기 지금 실행」이 설정 입력을 바꾸는 자리 (060, research R5).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md AR1~AR3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **설정 입력 둘만 덮는다** — 켜짐 → 참, 목표 시각 → 지금 시. 그러면 `decideSchedule`이 시도 창(`not-near-target`)과 토글(`disabled`)을
 * 통과시킨다. 판정 함수(`decideSchedule`·`resolveAutoWrite`·`selectableDays`)는 한 줄도 바꾸지 않는다 — 이미 쓴 날·재료 없음·사진 권한
 * 없음·정오 규칙(049)은 그대로 따른다. 백그라운드 경로 옆에 우회로를 만들지 않으려고 판정이 아니라 입력을 바꾼다.
 *
 * `getHours()`는 하루 기준을 옮기는 계산이 아니라 목표 시각을 「지금 시」로 두는 것이다(DB11 허용 목록에 이 파일을 이유와 함께 올렸다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AutoDiarySettings } from "./settings";

export function manualSettings(settings: AutoDiarySettings, now: Date): AutoDiarySettings {
  return { ...settings, enabled: true, targetHour: now.getHours() };
}

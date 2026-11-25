/**
 * 131 — 자동 쓰기 설정 창(안내 규칙 G4)의 판정과 「켜기」 조립. 순수하다 — 기기·시각을 읽지 않는다.
 *
 * 계약: specs/131-auto-write-setup-sheet/contracts/auto-write-setup.md
 *
 * 창은 새 설치의 첫 실행이 끝난 뒤 **한 번** 뜬다. 대기 비트(`OnboardingFlag.autoWriteSetupPending`)가 기기에 남아 있어
 * 첫 일기 흐름 도중 앱이 죽어도 다음 실행에서 묻는다. 쓰는 중에는 띄우지 않는다(R8).
 */

import type { AutoDiarySettings } from "../schedule/settings";

export type AutoWriteSetupInput = {
  /** 첫 실행 단계가 끝나 홈이 보인다 */
  homeReady: boolean;
  /** 온보딩 플래그를 읽었다 */
  flagLoaded: boolean;
  /** 아직 묻지 않았다(`autoWriteSetupPending`) */
  pending: boolean;
  /** 이번 실행에서 첫 일기 흐름에 들어갔다 */
  firstDiaryEntered: boolean;
  /** 첫 일기 흐름이 끝났다(`step === "done"`) */
  firstDiaryDone: boolean;
  /** 프로세스 안에 살아 있는 쓰기·지우기가 있다 */
  writing: boolean;
  /** 다른 확인 질문이 떠 있다 */
  otherDialogOpen: boolean;
};

export function shouldShowAutoWriteSetup(input: AutoWriteSetupInput): boolean {
  return (
    input.homeReady &&
    input.flagLoaded &&
    input.pending &&
    (!input.firstDiaryEntered || input.firstDiaryDone) &&
    !input.writing &&
    !input.otherDialogOpen
  );
}

export type AutoWriteSetupChoice = { enabled: boolean; targetHour: number };

/** 설정 화면과 같은 효과 함수(`settings-effects.ts`)를 받는다 — 저장 순서·예약이 같다 */
export type AutoWriteSetupDeps = {
  applyTargetHour(current: AutoDiarySettings, hour: number): Promise<AutoDiarySettings>;
  applyToggleOn(current: AutoDiarySettings): Promise<{ settings: AutoDiarySettings }>;
  applyToggleOff(current: AutoDiarySettings): Promise<AutoDiarySettings>;
  /** 대기 비트를 지운다(`autoWriteSetupPending: false` 저장) */
  clearPending(): Promise<void>;
};

/**
 * 「켜기」. 시각이 바뀌었으면 먼저 저장하고(켬 뒤 다시 예약이 새 시각을 보게), 창의 토글대로 켜거나 끈다. 끝나면 대기를 지운다 —
 * 지우기에 실패해도 던지지 않는다(다음 실행에 다시 뜰 수 있다).
 */
export async function confirmAutoWriteSetup(
  choice: AutoWriteSetupChoice,
  current: AutoDiarySettings,
  deps: AutoWriteSetupDeps,
): Promise<AutoDiarySettings> {
  let next = current;
  if (choice.targetHour !== next.targetHour) {
    next = await deps.applyTargetHour(next, choice.targetHour);
  }
  if (choice.enabled) {
    next = (await deps.applyToggleOn(next)).settings;
  } else if (next.enabled) {
    next = await deps.applyToggleOff(next);
  }
  await deps.clearPending().catch(() => {});
  return next;
}

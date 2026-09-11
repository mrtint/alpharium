/**
 * 첫 실행 단계 판정 — **순수 함수** (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/data-model.md `FirstRunStage`
 *       contracts/first-run-gate.md G1·G2·G4·G5
 *       spec.md FR-005~FR-008·FR-011
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 021(`onboarding/decision.ts`)·035(`welcome/decision.ts`)가 각자 내는 판정을
 * 조합해 "다음에 무엇을 보여줄지"만 답하는 조율 계층이다. 기기에 닿지 않고
 * `Date.now()`·난수·파일을 읽지 않는다.
 *
 * **새 영구 저장 파일이 없다**(research.md #3·#6) — 이 타입 자체는 아무것도
 * 저장하지 않는다. 입력(`onboardingNeeded`·`namingDone`·`downloadReady`·
 * `livenessOutcome`)은 전부 021/029/035 판정 함수가 실시간으로 내는 값이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { LivenessOutcome } from "../welcome/liveness";

/**
 * 세션 진행 상태. 파일에 저장하지 않고 매번 실시간 입력으로부터 재판정한다
 * (spec Key Entity "첫 실행 진행 상태").
 */
export type FirstRunStage =
  | "logo" // 온보딩이 필요하고 아직 스텝이 시작 안 됨
  | "onboarding" // 021 권한 스텝 진행 중
  | "naming" // 035 작명 화면, 다운로드 상태 무관
  | "waiting-for-download" // 작명 완료, 다운로드 미완료
  | "liveness" // 작명+다운로드 완료, liveness 확인 중/실패
  | "done"; // 탭 UI로 진입 가능

/**
 * 다음에 무엇을 보여줄지 (data-model.md 순서, G1·G2·G4·G5).
 *
 * 우선순위(첫 매치):
 * 1. `onboardingNeeded && !onboardingStarted` → `"logo"`
 * 2. `onboardingNeeded` → `"onboarding"`
 * 3. `!namingDone` → `"naming"` (다운로드 상태 무관, FR-005)
 * 4. `namingDone && !downloadReady` → `"waiting-for-download"` (FR-006)
 * 5. `namingDone && downloadReady && livenessOutcome !== "ok"` → `"liveness"` (FR-007/FR-008)
 * 6. 그 외 → `"done"`
 *
 * **`"done"`이 되면 이후 재계산에서 `"logo"`·`"onboarding"`으로 되돌아가지
 * 않는다**(G2) — `onboardingNeeded`가 021의 `completed` 플래그에 묶여 있고
 * 그 플래그는 한 번 true가 되면 되돌리는 코드가 없기 때문에 구조적으로 성립한다.
 */
export function resolveFirstRunStage(input: {
  onboardingNeeded: boolean;
  onboardingStarted: boolean;
  namingDone: boolean;
  downloadReady: boolean;
  livenessOutcome: LivenessOutcome | "pending" | null;
}): FirstRunStage {
  if (input.onboardingNeeded && !input.onboardingStarted) return "logo";
  if (input.onboardingNeeded) return "onboarding";
  if (!input.namingDone) return "naming";
  if (!input.downloadReady) return "waiting-for-download";
  if (input.livenessOutcome !== "ok") return "liveness";
  return "done";
}

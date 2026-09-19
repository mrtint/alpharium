/**
 * 첫 실행 단계 판정 — **순수 함수** (040, ★ 045가 우선순위를 재작성).
 *
 * 계약: specs/040-onboarding-parallel-setup/data-model.md `FirstRunStage`
 *       (역사적 기록 — 040 우선순위 자체는 045가 대체)
 *       specs/045-onboarding-download-consent/data-model.md `FirstRunStage 확장`
 *       specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C1~C4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 021(`onboarding/decision.ts`)·035(`welcome/decision.ts`)가 각자 내는 판정을
 * 조합해 "다음에 무엇을 보여줄지"만 답하는 조율 계층이다. 기기에 닿지 않고
 * `Date.now()`·난수·파일을 읽지 않는다.
 *
 * **새 영구 저장 파일이 없다**(040 research.md #3·#6) — 이 타입 자체는 아무것도
 * 저장하지 않는다. 입력(`onboardingNeeded`·`downloadConsented`·`downloadReady`·
 * `namingDone`·`livenessOutcome`)은 전부 021/029/035/045 판정 함수가 실시간으로
 * 내는 값이다.
 *
 * **★ 045 — 순서를 되돌렸다.** 040은 "작명이 다운로드를 기다리지 않는다"(G4)로
 * 설계했으나, 저장소 소유자가 그 순서를 명시적으로 되돌렸다 — 이제 다운로드
 * 동의·완료가 작명보다 먼저다(C2). `"waiting-for-download"`(040이 작명 완료
 * 후에만 조건부로 쓰던 화면)는 제거하고, 그 대신 다운로드 자체가 하나의
 * 단계(`"downloading"`)로 승격됐다.
 *
 * **`downloadProceedConfirmed`(구현 중 발견, spec 갭 보강)** — `downloadReady`가
 * `true`가 되는 즉시 `"naming"`으로 넘어가면 `DownloadProgressScreen`의 완료
 * 화면("시작할게요" 버튼)이 사용자가 누를 틈도 없이 사라진다(FR-007 위반).
 * `namingDone`과 같은 패턴으로 "완료 화면에서 버튼을 눌렀다"는 사실을 별도
 * 세션 로컬 입력으로 받아, 그것이 `true`가 되기 전까지는 `downloadReady`가
 * 참이어도 여전히 `"downloading"`(완료 화면)에 머무른다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { LivenessOutcome } from "../welcome/liveness";

/**
 * 세션 진행 상태. 파일에 저장하지 않고 매번 실시간 입력으로부터 재판정한다
 * (040 spec Key Entity "첫 실행 진행 상태").
 */
export type FirstRunStage =
  | "logo" // 온보딩이 필요하고 아직 스텝이 시작 안 됨
  | "onboarding" // 021 권한 스텝 진행 중
  | "download-consent" // 045 — 다운로드 동의 안내, 필수 자산 미준비
  | "downloading" // 045 — 동의 완료, 다운로드 진행 슬라이드
  | "naming" // 035 작명 화면, 다운로드는 이미 완료된 상태
  | "liveness" // 작명 완료, liveness 확인 중/실패
  | "done"; // 탭 UI로 진입 가능

/**
 * 다음에 무엇을 보여줄지 (045 data-model.md 순서, C1~C4).
 *
 * 우선순위(첫 매치):
 * 1. `onboardingNeeded && !onboardingStarted` → `"logo"`
 * 2. `onboardingNeeded` → `"onboarding"`
 * 3. `!downloadConsented && !downloadReady` → `"download-consent"` (C2)
 * 4. `!downloadReady || !downloadProceedConfirmed` → `"downloading"`
 *    (동의는 했지만 아직 다운로드 중이거나, 다 받았어도 완료 화면의
 *    버튼을 아직 안 눌렀다)
 * 5. `!namingDone` → `"naming"` (이 시점에서 downloadReady·
 *    downloadProceedConfirmed는 항상 참, C4)
 * 6. `livenessOutcome !== "ok"` → `"liveness"`
 * 7. 그 외 → `"done"`
 *
 * **이미 준비된 사용자(`downloadReady: true`)는 3단계를 건너뛴다**(C3) —
 * `downloadConsented` 값과 무관하게 동의 화면을 보지 않는다. 다만
 * `downloadProceedConfirmed`가 아직 `false`면(이 세션에서 완료 화면을
 * 아직 안 지났다면) 여전히 `"downloading"`(완료 뷰)에서 멈춘다 —
 * FR-009("동의·슬라이드 화면 생략")는 4장 슬라이드 자체를 건너뛰는
 * 것이지 완료 확인 자체를 생략하는 것이 아니다.
 *
 * **`"done"`이 되면 이후 재계산에서 `"logo"`·`"onboarding"`으로 되돌아가지
 * 않는다**(040 G2 계승) — `onboardingNeeded`가 021의 `completed` 플래그에
 * 묶여 있고 그 플래그는 한 번 true가 되면 되돌리는 코드가 없기 때문에
 * 구조적으로 성립한다.
 */
export function resolveFirstRunStage(input: {
  onboardingNeeded: boolean;
  onboardingStarted: boolean;
  downloadConsented: boolean;
  downloadReady: boolean;
  downloadProceedConfirmed: boolean;
  namingDone: boolean;
  livenessOutcome: LivenessOutcome | "pending" | null;
}): FirstRunStage {
  if (input.onboardingNeeded && !input.onboardingStarted) return "logo";
  if (input.onboardingNeeded) return "onboarding";
  if (!input.downloadConsented && !input.downloadReady) return "download-consent";
  if (!input.downloadReady || !input.downloadProceedConfirmed) return "downloading";
  if (!input.namingDone) return "naming";
  if (input.livenessOutcome !== "ok") return "liveness";
  return "done";
}

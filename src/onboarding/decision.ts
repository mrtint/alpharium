/**
 * 온보딩 진행 판정 — **순수 함수** (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-decision.md
 *       spec.md FR-005·FR-006·FR-008·FR-013·FR-015·FR-016, spec Clarifications
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 기기에 닿지 않는다. (플래그, 권한 상태, 플랫폼)의 함수이며 `new Date()`를
 * 부르지 않는다(`day-boundary.ts`·`schedule/decision.ts`와 같은 규칙).
 *
 * **단계 완료 여부는 저장하지 않는다**(spec Clarifications) — `planOnboardingSteps`가
 * 매번 실시간 권한 상태로 재판정한다. 뒤로 가기가 없으므로 단계 상태를 저장할 이유가
 * 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PermissionState } from "../signals/port";

import type { OnboardingFlag } from "./flag";
import type { PermissionKey, PermissionRequirement } from "./requirements";

export type { OnboardingFlag };

/**
 * 한 단계의 상태.
 *
 * - `satisfied`        — granted 또는 limited (통과, FR-015)
 * - `actionable`       — undetermined 또는 denied (인앱 "허용" 버튼이 유효)
 * - `blocked`          — blocked (OS 설정으로만, 인앱 버튼 무효, FR-016)
 * - `skipped-eligible` — 사용자가 이 세션에서 "건너뛰기"를 눌렀다 (재조회 전까지)
 */
export type StepStatus = "satisfied" | "actionable" | "blocked" | "skipped-eligible";

export type OnboardingStep = {
  requirement: PermissionRequirement;
  status: StepStatus;
};

/**
 * 온보딩을 띄워야 하는가 (D2).
 *
 * `completed` 하나만 본다 — `batteryNoticeShown`은 온보딩 재노출과 무관.
 */
export function shouldShowOnboarding(flag: OnboardingFlag): boolean {
  return flag.completed !== true;
}

/** 권한 상태 하나를 StepStatus로 (D3). `battery-exception`은 여기 오지 않는다. */
function statusOf(state: PermissionState | undefined, skipped: boolean): StepStatus {
  // blocked는 건너뜀 여부와 무관하게 blocked — 인앱 버튼이 무효라는 사실이 우선.
  if (state === "blocked") return "blocked";
  if (skipped) return "skipped-eligible";
  if (state === "granted" || state === "limited") return "satisfied";
  // undetermined·denied·미조회(undefined) → 사용자가 볼 수 있게 actionable.
  return "actionable";
}

export function planOnboardingSteps(input: {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  states: Partial<Record<PermissionKey, PermissionState>>;
  batteryNoticeShown: boolean;
  skippedThisSession: readonly PermissionKey[];
}): OnboardingStep[] {
  const skipped = new Set(input.skippedThisSession);

  return input.requirements
    .filter((req) => req.platforms.includes(input.platform))
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((requirement) => {
      if (requirement.key === "battery-exception") {
        if (input.batteryNoticeShown) {
          return { requirement, status: "satisfied" as const };
        }
        if (skipped.has("battery-exception")) {
          return { requirement, status: "skipped-eligible" as const };
        }
        return { requirement, status: "actionable" as const };
      }
      return {
        requirement,
        status: statusOf(input.states[requirement.key], skipped.has(requirement.key)),
      };
    });
}

/**
 * 다음에 제시할 단계 (D5).
 *
 * `actionable` 또는 `blocked`인 첫(order 순) 항목. `blocked`도 "다음 단계"로 제시된다
 * — 사용자가 그 화면에서 OS 설정 링크를 보고 건너뛸 수 있어야 하므로(막다른 길 금지,
 * 원칙 II). 전부 `satisfied`/`skipped-eligible`이면 `null` → [시작하기] 활성화.
 */
export function nextStep(steps: readonly OnboardingStep[]): OnboardingStep | null {
  for (const step of steps) {
    if (step.status === "actionable" || step.status === "blocked") return step;
  }
  return null;
}

/**
 * 부분 사진 접근 안내 판정 (data-model.md §2, FR-015).
 *
 * research.md §3의 실측(T031)에서 안드로이드가 `accessPrivileges: "limited"`를 주지
 * 않으면 `PermissionState`로 부분 허용을 트리거할 수 없다 — 그때는 첫 사진 조회 결과
 * (`visiblePhotoCount`)로 갈음한다.
 *
 * - `state === "limited"`                              → `"partial"` (limited가 오는 기기)
 * - `state === "granted"` && `visiblePhotoCount === 0` → `"partial"` (선택한 사진 0장)
 * - `state === "granted"`                              → `"full"`
 * - 그 외                                              → `"unknown"`
 *
 * **추정하지 않고 사실만** — `"partial"`은 `limited`이거나 볼 수 있는 사진이 정말 0장일
 * 때뿐이다.
 */
export function describePhotoAccessLimit(input: {
  state: PermissionState;
  visiblePhotoCount: number | null;
}): "full" | "partial" | "unknown" {
  if (input.state === "limited") return "partial";
  if (input.state === "granted") {
    return input.visiblePhotoCount === 0 ? "partial" : "full";
  }
  return "unknown";
}

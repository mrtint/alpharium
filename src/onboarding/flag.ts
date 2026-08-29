/**
 * 온보딩 완료 플래그의 영속화 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-flag.md
 *       F1·F3·F4
 *       spec.md FR-009·FR-010·FR-010a·FR-011·FR-012, data-model.md §3, 원칙 IV
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 020의 `notified-store.ts`·`settings.ts`와 같은 모양(순수 로드/세이브 + 기기 통로).
 *
 * **필드는 boolean 2개뿐이다**(원칙 IV) — 020의 `AutoDiarySettings`가 "필드는 셋뿐"을
 * 못 박은 것과 같은 이유. 타임스탬프·시도 횟수·단계별 상태를 넣으면 "언제 온보딩을
 * 봤나"를 재는 측정 장치가 된다. `checkOnboardingFile`이 이 파일에서 `Date`·`count`
 * 같은 토큰을 발견하면 위반으로 잡는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { OnboardingFlagPort } from "./flag-port";

export type { OnboardingFlagPort };

export type OnboardingFlag = {
  /** 사용자가 온보딩을 끝냈거나 건너뛰었다. true면 자동 재노출 안 함 (FR-011). */
  completed: boolean;
  /** 배터리 예외 안내를 1회 제시했다. true면 다시 자동 요청 안 함 (FR-009). */
  batteryNoticeShown: boolean;
};

/** 파일 없음·손상 시의 값. */
export const DEFAULT_ONBOARDING_FLAG: OnboardingFlag = {
  completed: false,
  batteryNoticeShown: false,
};

/** 옛 `auto-diary.json`에서 배터리 안내 제시 여부를 시드한다 (FR-010a). */
function seedFromAutoDiary(raw: string | null): OnboardingFlag {
  if (raw === null) return { ...DEFAULT_ONBOARDING_FLAG };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Record<string, unknown>).batteryExceptionPrompted === true
    ) {
      // 020에서 이미 배터리 예외를 거부·수락한 사용자를 다시 요청하지 않는다.
      return { completed: false, batteryNoticeShown: true };
    }
  } catch {
    // 시드는 편의다 — 깨진 파일이면 기본값.
  }
  return { ...DEFAULT_ONBOARDING_FLAG };
}

/**
 * 온보딩 플래그를 읽는다 (F3·F4).
 *
 * **항상 `OnboardingFlag`를 돌려준다** — 파일 없음·깨짐·통로 예외 전부
 * `DEFAULT_ONBOARDING_FLAG`(또는 시드값)로 귀결된다.
 *
 * `onboarding.json`이 없을 때만 옛 `auto-diary.json`을 1회 읽어 시드한다 —
 * 파일에 쓰지는 않는다(다음 `saveOnboardingFlag`에서 기록).
 */
export async function loadOnboardingFlag(port: OnboardingFlagPort): Promise<OnboardingFlag> {
  try {
    const raw = await port.read();
    if (raw === null) {
      return seedFromAutoDiary(await port.readAutoDiaryRaw());
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_ONBOARDING_FLAG };
    }

    const obj = parsed as Record<string, unknown>;
    return {
      completed: typeof obj.completed === "boolean" ? obj.completed : false,
      batteryNoticeShown:
        typeof obj.batteryNoticeShown === "boolean" ? obj.batteryNoticeShown : false,
    };
  } catch {
    return { ...DEFAULT_ONBOARDING_FLAG };
  }
}

/**
 * 온보딩 플래그를 담는다 (F3).
 *
 * **두 필드만 직렬화한다** — 여분 필드는 버린다.
 */
export async function saveOnboardingFlag(
  port: OnboardingFlagPort,
  flag: OnboardingFlag,
): Promise<void> {
  await port.write(
    JSON.stringify({
      completed: flag.completed,
      batteryNoticeShown: flag.batteryNoticeShown,
    }),
  );
}

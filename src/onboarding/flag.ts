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
 * **필드는 boolean 3개뿐이다**(원칙 IV) — 020의 `AutoDiarySettings`가 "필드는 셋뿐"을
 * 못 박은 것과 같은 이유. 타임스탬프·시도 횟수·단계별 상태를 넣으면 "언제 온보딩을
 * 봤나"를 재는 측정 장치가 된다. `checkOnboardingFile`이 이 파일에서 `Date`·`count`
 * 같은 토큰을 발견하면 위반으로 잡는다.
 *
 * **035에서 `welcomeShown`이 셋째로 더해졌다.** 최초 실행 흐름은
 * 온보딩 → 에셋 다운로드 → **환영 연출** → 홈이며, 연출은 그 흐름의 마지막
 * 단계다. 별도 파일을 만들면 진입 게이트가 읽을 파일이 하나 더 늘 뿐 얻는 것이
 * 없다. **진행 중 상태(어느 단계인가, 확인을 몇 번 했나)는 담지 않는다**
 * (035 W7, FR-009) — 저장된 진행 상태는 곧 거짓이 되고, 그것이 009가 "고른
 * 하루를 파일에 남기지 않는다"로 배운 것이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { OnboardingFlagPort } from "./flag-port";

export type { OnboardingFlagPort };

export type OnboardingFlag = {
  /** 사용자가 온보딩을 끝냈거나 건너뛰었다. true면 자동 재노출 안 함 (FR-011). */
  completed: boolean;
  /** 배터리 예외 안내를 1회 제시했다. true면 다시 자동 요청 안 함 (FR-009). */
  batteryNoticeShown: boolean;
  /**
   * 환영 연출을 통과했다 (035 FR-008).
   *
   * **`true`가 되는 경로는 셋이고 전부 사용자의 행동이다**(035 W9): 이름을 지어
   * 확정 / 작명 건너뛰기 / 확인 실패 화면에서 건너뛰기. **[다시 시도]는 이 값을
   * 쓰지 않는다** — 아직 통과하지 않았다.
   *
   * **되돌아가지 않는다**(W10). 옛 파일에 이 키가 없으면 `false`로 읽히므로
   * 021·029 시절 사용자는 연출을 한 번 본다 — 해가 없고 작명 기회를 준다.
   */
  welcomeShown: boolean;
};

/** 파일 없음·손상 시의 값. */
export const DEFAULT_ONBOARDING_FLAG: OnboardingFlag = {
  completed: false,
  batteryNoticeShown: false,
  welcomeShown: false,
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
      // 연출은 아직 안 봤다 — 035 이전 사용자이므로 한 번 본다.
      return { completed: false, batteryNoticeShown: true, welcomeShown: false };
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
      // 035 — 키가 없는 옛 파일은 「연출을 아직 안 봤다」다.
      welcomeShown: typeof obj.welcomeShown === "boolean" ? obj.welcomeShown : false,
    };
  } catch {
    return { ...DEFAULT_ONBOARDING_FLAG };
  }
}

/**
 * 온보딩 플래그를 담는다 (F3).
 *
 * **세 필드만 직렬화한다** — 여분 필드는 버린다.
 */
export async function saveOnboardingFlag(
  port: OnboardingFlagPort,
  flag: OnboardingFlag,
): Promise<void> {
  await port.write(
    JSON.stringify({
      completed: flag.completed,
      batteryNoticeShown: flag.batteryNoticeShown,
      welcomeShown: flag.welcomeShown,
    }),
  );
}

/**
 * 환영 연출 진입 판정 — **순수 함수** (035).
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/welcome-gate.md W1~W6
 *       spec.md FR-002·FR-002a
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **진입 게이트의 세 번째 단이다.**
 *
 *   1. shouldShowOnboarding(flag, essentialsReady)  → OnboardingScreen  (021·029)
 *   2. shouldShowWelcome({ ... })                   → WelcomeScreen     (035) ★
 *   3. 그 외                                         → 탭 UI (홈)
 *
 * 021의 `onboarding/decision.ts`, 020의 `schedule/decision.ts`가 세운 관례를
 * 그대로 잇는다 — 기기에 닿지 않고 `new Date()`를 부르지 않는다(W4).
 *
 * **`onboardingNeeded`를 인자로 받는 것이 설계다**(W2). 호출 순서에만 의존하면
 * 나중에 누군가 순서를 바꿔도 조용히 통과한다 — 온보딩이 필요한 상태에서는 환영을
 * 절대 띄우지 않는다는 것이 **규칙 자체에 드러나야** 한다.
 *
 * **캐릭터를 받지 않는다**(W6, FR-002a). 연출 대상은 첫 실행의 기본 캐릭터
 * 하나뿐이다. 캐릭터를 받으면 「어느 캐릭터의 연출인가」를 정하는 로직이 생기고,
 * 그것이 추가 캐릭터로 확장되는 문턱이 된다 — 설정 탭에서 새로 받은 캐릭터의
 * 작명은 「일기 작성자」 섹션의 이름 편집이 담당한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 환영 연출을 띄워야 하는가 (W3).
 *
 * 셋이 **전부** 참이어야 한다:
 *  - 온보딩이 끝났다 (`onboardingNeeded === false`)
 *  - 필수 에셋이 준비됐다 — 확인할 모델이 실제로 있어야 한다
 *  - 아직 연출을 보지 않았다
 *
 * `welcomeShown`은 `onboarding.json`에서 온다. **없으면(옛 사용자) 「안 봤다」이며**
 * 부르는 쪽이 `flag.welcomeShown === true`로 좁혀 넘긴다.
 */
export function shouldShowWelcome(input: {
  onboardingNeeded: boolean;
  essentialAssetsReady: boolean;
  welcomeShown: boolean;
}): boolean {
  // 온보딩이 먼저다 — 나머지와 무관하게 막는다(W2).
  if (input.onboardingNeeded) return false;
  // 확인할 모델이 없으면 연출할 것도 없다.
  if (!input.essentialAssetsReady) return false;
  return !input.welcomeShown;
}

# Contract: 진입 게이트와 환영 연출 흐름

FR-002, FR-002a, FR-005, FR-007, FR-008, FR-009, FR-014, FR-027의 계약이다.
021의 `onboarding-decision.md`(D2)와 029의 DR1~DR3를 잇는 세 번째 단이다.

## 계약 시그니처

```ts
// src/welcome/decision.ts (신규) — 순수 함수
export function shouldShowWelcome(input: {
  onboardingNeeded: boolean;
  essentialAssetsReady: boolean;
  welcomeShown: boolean;
}): boolean;

// src/onboarding/flag.ts (수정)
export type OnboardingFlag = {
  completed?: boolean;
  batteryNoticeShown?: boolean;
  welcomeShown?: boolean;    // ★ 035
};
```

## 불변식

**W1. 게이트는 3단이고 순서가 고정이다** (FR-002).

```
1. shouldShowOnboarding(flag, essentialsReady)  → OnboardingScreen
2. shouldShowWelcome({ onboardingNeeded, ... }) → WelcomeScreen      ★ 신규
3. 그 외                                         → 탭 UI (홈)
```

**W2. `shouldShowWelcome()`은 `onboardingNeeded`를 인자로 받는다** (W1 강제).
`true`면 무조건 `false`를 반환한다 — 온보딩이 필요한 상태에서는 환영을 절대
띄우지 않는다는 것이 **타입과 규칙에 드러난다.** 호출 순서에만 의존하면 나중에
누군가 순서를 바꿔도 조용히 통과한다.

**W3. 판정 규칙**:

| `onboardingNeeded` | `essentialAssetsReady` | `welcomeShown` | 결과 |
|---|---|---|---|
| `true` | 무관 | 무관 | `false` |
| `false` | `false` | 무관 | `false` |
| `false` | `true` | `true` | `false` |
| `false` | `true` | `false` | **`true`** |

> **★ 040 예외**(2026-09-11, `specs/040-onboarding-parallel-setup/research.md`
> #3) — 위 둘째 행("에셋 미준비 → false")은 040에서 완화됐다. 040은 작명
> 화면을 모델 다운로드와 **병렬로** 보여주므로(다운로드 완료를 기다리지
> 않는다), 지금 판정은 `essentialAssetsReady`를 더 이상 보지 않는다 — 결과는
> `onboardingNeeded === false && welcomeShown === false`뿐이다. liveness
> 확인(원래 이 게이트의 다음 단계)은 040에서 `src/firstrun/progress.ts`의
> `resolveFirstRunStage`가 작명 **완료** + 다운로드 **완료** 이후로 미뤄
> 대신 수행한다. `essentialAssetsReady` 인자 자체는 시그니처 호환을 위해
> 남아 있으나 판정에 쓰이지 않는다. 상세는 040
> `contracts/first-run-gate.md` G4·G5.

**W4. `shouldShowWelcome()`은 순수 함수다** (021·029 관례).
`new Date()`·파일·권한을 읽지 않는다. `day-boundary.ts`·`schedule/decision.ts`·
`onboarding/decision.ts`가 전부 이 규칙을 지킨다.

**W5. 환영 연출은 진입 게이트에서만 트리거된다** (FR-002a).
설정 탭·캐릭터 목록·다운로드 완료 콜백 어디에도 `WelcomeScreen`을 띄우는 경로가
없다. 계약 테스트가 소스를 읽어 `WelcomeScreen` 참조가 `App.tsx`의 게이트
자리에만 있는지 확인한다.

**W6. 연출 대상은 기본 캐릭터 하나뿐이다** (FR-002a, liveness.md L13).
`shouldShowWelcome()`이 캐릭터를 인자로 받지 않는다 — 받으면 "어느 캐릭터의
연출인가"를 정하는 로직이 생기고, 그것이 추가 캐릭터로 확장되는 문턱이 된다.

**W7. 진행 중 상태는 저장하지 않는다** (FR-009).
`OnboardingFlag`에 `welcomeStep`·`livenessChecked` 같은 필드를 두지 않는다.
연출 도중 앱이 죽으면 다음 진입에서 확인부터 다시 한다 — 009의 "고른 하루를
파일에 남기지 않는다"와 같은 판단(저장된 진행 상태는 곧 거짓이 된다).

**W8. `welcomeShown`은 옵셔널이고 기본값은 "안 봤다"** (data-model §2).
필드가 없는 기존 사용자(021·029 시절 `onboarding.json`)는 연출을 한 번 본다.
`loadOnboardingFlag`가 없는 필드를 `undefined`로 두고, `shouldShowWelcome`이
`welcomeShown !== true`로 판정한다.

**W9. `welcomeShown = true`가 되는 경로는 셋이고 전부 사용자의 행동이다**
(FR-008·FR-014·FR-007):
- 이름을 지어 확정
- 작명을 건너뜀
- 확인 실패 화면에서 건너뜀

**"다시 시도"는 플래그를 쓰지 않는다** — 아직 통과하지 않았다.

**W10. `welcomeShown`은 되돌아가지 않는다** (FR-008). `true`에서 `false`로
바꾸는 코드가 제품 경로에 없다. (021의 [권한 안내 다시 보기]가
`forceOnboarding` 상태로 `completed`를 건드리지 않은 것과 같은 방식으로,
필요하면 별도 상태를 쓴다.)

**W11. 연출은 건너뛸 수 있다** (원칙 I, FR-014·FR-007).
모든 단계에 [건너뛰기]가 있고, 실패 화면에도 [다시 시도]와 [건너뛰기]가 함께
있다. **막다른 길을 만들지 않는다**(원칙 II) — 021 온보딩이 세운 규칙을 그대로
잇는다.

## 화면 계약 (`WelcomeScreen`)

**W12. 화면은 문자열과 콜백만 받는다** (FR-027, 원칙 III).

```ts
export type WelcomeScreenProps = {
  phase: "checking" | "welcome" | "failed";
  /** 지금 이 캐릭터를 뭐라 부르는가 (조립부가 displayNameOf로 만든 문자열) */
  characterName: string;
  onSubmitName: (name: string) => void;
  onSkip: () => void;
  onRetry: () => void;
};
```

**W13. 화면이 받지 않는 것** (FR-027, FR-004):
`Character` 심볼, 모델 식별자·자산 키·파라미터 수·양자화·파일 크기·경로,
`RunResult`·`text`·`Ending`, 경과 시간·토큰 수, `LivenessOutcome`.

`AuthorPicker`가 `AuthorOption`(name·tagline·ready·selected)만 받는 034의
구조와 같다.

**W14. 화면은 `src/welcome/`를 import하지 않는다.**
`validateCharacterName()`의 결과(유효/무효)는 조립부가 판정해 넘기거나, 화면이
입력 길이 제한(`maxLength`)만 UI 속성으로 쓴다. `checkSourceFile`에
`src/ui/` → `src/welcome/` 차단 규칙을 더한다 — 022가 `UI_TOUCHES_PROMPT`를
더한 것과 같은 자리.

**W15. 문구는 사람이 쓴 고정 상수다** (FR-004·FR-005, liveness.md L16).
캐릭터 이름만 문자열 보간으로 들어간다. 추론 생성 텍스트를 섞지 않는다.

**W16. 실패 화면에 오류 사유를 표시하지 않는다** (FR-006, 원칙 III).
"아직 준비 중이에요" 수준의 고정 안내뿐이다. 모델 오류 메시지에는 파일 경로가
들어 있고 경로에는 자산 키가 들어 있다(003 `readiness.ts`의 `REASON`이 같은
이유로 사람이 쓴 고정 문구만 쓴다).

## 설정 탭 이름 편집 (`AuthorPicker`, US3)

**W17. 준비된 캐릭터만 편집 가능하다** (FR-022·FR-023).
`AuthorOption.ready === false`인 행은 현행 "아직 준비되지 않음 — 아래에서
내려받으세요" 표시를 그대로 유지하고 편집 진입점을 노출하지 않는다.

**W18. 편집도 같은 검증을 쓴다** (FR-024).
`validateCharacterName()` 하나를 첫 만남과 설정이 공유한다 — 두 자리에 각각
검증을 두면 규칙이 갈라진다.

**W19. 이름을 비우면 기본 이름으로 되돌아간다** (FR-025).
빈 문자열을 저장하는 것이 아니라 **그 캐릭터의 키를 `CustomNames`에서
제거한다** — `{ quiet: "" }`가 저장되면 `displayNameOf`의 N3 방어에 의존하게
되고, 파일에 의미 없는 값이 남는다.

**W20. 이름 변경은 저장된 일기를 건드리지 않는다**
(FR-026, character-name.md N11). 변경 경로가 `DiaryStore.save()`·`load()`를
부르지 않는다.

## 테스트로 확인해야 하는 것

`__tests__/welcome/decision.test.ts`:
- W3: 진리표 네 줄 전부
- W2: `onboardingNeeded: true`면 나머지 인자와 무관하게 `false` (조합 4가지)
- W4: `new Date()`를 부르지 않음 — 소스를 읽어 `Date` 토큰 부재 확인
- W6: `shouldShowWelcome`의 인자에 `Character`가 없음 (소스 시그니처 읽기)

`__tests__/onboarding/flag.test.ts` (기존 확장):
- W8: `welcomeShown`이 없는 옛 파일을 읽으면 `undefined`, 게이트는 연출을 띄움
- W8: `completed`·`batteryNoticeShown`이 여전히 정상 파싱됨 (021 회귀)
- 직렬화 왕복에서 `welcomeShown`이 보존됨

`__tests__/ui/welcome-screen.test.tsx`:
- W12: 세 `phase`가 각각 다른 것을 그림
- W13: props 타입에 금지 필드가 없음 (소스 읽기)
- W11: 세 phase 전부에서 건너뛰기 경로가 있음
- FR-012: 빈 입력·공백만 입력에서 확정이 안 됨
- FR-013: `maxLength`가 12
- W15/W16: 화면 소스에 모델 식별자·`ms`·`token` 토큰이 없음

`__tests__/welcome/welcome-boundary.test.ts`:
- W5: `WelcomeScreen` 참조가 `App.tsx`에만 있음 (소스 grep)
- W14: `checkSourceFile`이 `src/ui/` → `src/welcome/` import를 잡음 (위반 주입)

## 위반 주입 (방어 검증)

| 주입 | 잡아야 하는 것 |
|---|---|
| `shouldShowWelcome`에서 `onboardingNeeded` 무시 | W2 테스트 FAIL |
| `OnboardingFlag`에 `welcomeStep?: string` 추가 | W7 필드 검사 FAIL |
| `WelcomeScreen`에 `character: Character` prop 추가 | W13 소스 검사 FAIL |
| `src/ui/WelcomeScreen.tsx`에 `import { LIVENESS_INPUT }` | `checkSourceFile` 위반 |
| 설정 탭에서 `WelcomeScreen` 렌더 | W5 참조 위치 검사 FAIL |
| 이름 비우기가 `{ quiet: "" }`를 저장 | W19 테스트 FAIL |

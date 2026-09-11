# 데이터 모델: 초기 권한 획득과 첫 실행 흐름 재설계

새 영구 저장 파일은 없다(research.md #3, #6). 이 스펙이 정의하는 것은
기존 값들을 조합해 "다음에 무엇을 보여줄지" 판정하는 순수 타입/함수다.

## FirstRunStage (신규, `src/firstrun/progress.ts`)

세션 진행 상태를 나타내는 값. 파일에 저장하지 않고 매번 실시간 입력으로부터
재판정한다(spec Key Entity "첫 실행 진행 상태"에 대응).

```ts
type FirstRunStage =
  | "logo"                  // 온보딩이 필요하고 아직 스텝이 시작 안 됨
  | "onboarding"             // 021 권한 스텝 진행 중
  | "naming"                 // 035 작명 화면, 다운로드 상태 무관
  | "waiting-for-download"   // 작명 완료, 다운로드 미완료
  | "liveness"                // 작명+다운로드 완료, liveness 확인 중/실패
  | "auto-generating"         // liveness 통과, 자동 생성 시도 중(선택적 표시)
  | "done";                   // 탭 UI로 진입 가능
```

**불변식**:
- 입력(`onboardingNeeded`·`namingDone`·`downloadReady`·`livenessOutcome`)은
  전부 기존 021/029/035 판정 함수가 실시간으로 내는 값이며, 이 타입 자체는
  아무것도 저장하지 않는다.
- `"done"`이 되면 이후 재계산에서 `"logo"`나 `"onboarding"`으로 되돌아가지
  않는다(FR-010 — `onboardingFlag.completed === true`가 되돌아감을
  구조적으로 막는다. 021의 기존 게이트가 이미 이 성질을 가진다).

## resolveFirstRunStage (순수 함수)

```ts
function resolveFirstRunStage(input: {
  onboardingNeeded: boolean;       // 021 shouldShowOnboarding()
  onboardingStarted: boolean;      // 세션 로컬 — 로고를 이미 지났는가
  namingDone: boolean;             // 035 welcomeShown 또는 이름 확정 여부
  downloadReady: boolean;          // 029 essentialAssetsReady()
  livenessOutcome: LivenessOutcome | "pending" | null;
}): FirstRunStage
```

우선순위(첫 매치):
1. `onboardingNeeded && !onboardingStarted` → `"logo"`
2. `onboardingNeeded` → `"onboarding"`
3. `!namingDone` → `"naming"`
4. `namingDone && !downloadReady` → `"waiting-for-download"`
5. `namingDone && downloadReady && livenessOutcome !== "ok"` → `"liveness"`
6. 그 외 → `"done"`(자동 생성은 `"done"` 진입 시 1회 부수 효과로 트리거,
   FirstRunStage 자체의 갈래는 아님 — auto-diary.ts가 별도로 판정)

## AutoDiaryAttempt (신규, `src/firstrun/auto-diary.ts`, 저장하지 않음)

```ts
function shouldAutoGenerate(input: {
  livenessOutcome: LivenessOutcome;  // "ok" | "failed" (035 계약)
  dayWritable: boolean;               // config/day-boundary isDayWritable(now)
}): boolean
```

반환값은 `livenessOutcome === "ok" && dayWritable`. 결과를 저장하지 않는다
— 트리거는 세션 안에서 최대 1회만 시도하도록 `app/wiring.ts`가 모듈
스코프의 "이번 세션에 이미 시도했는가" 불리언(비영구)으로 중복 호출만
막는다(재시도는 기존 "일기 쓰기" 수동 경로로, FR-009).

## 재사용 타입 (변경 없음, 참고용)

| 타입 | 출처 | 역할 |
|---|---|---|
| `OnboardingFlag` | `src/onboarding/flag.ts` | `completed`·`batteryNoticeShown`·`welcomeShown` 3 boolean |
| `StepStatus` | `src/onboarding/decision.ts` | 021 권한 스텝 판정 4갈래 |
| `LivenessOutcome` | `src/welcome/liveness.ts` | `"ok" \| "failed"`, payload 없음 |
| `EssentialAssetsFacts` | `src/onboarding/essential-assets.ts` | 029 필수 에셋 준비 상태 |
| `CustomNames` | `src/welcome/names-port.ts` | 캐릭터별 사용자 지정 이름 |

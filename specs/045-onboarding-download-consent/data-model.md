# Phase 1 Data Model: 필수 자산 다운로드 동의 안내와 진행 슬라이드

## OnboardingFlag (확장)

기존 `src/onboarding/flag.ts`의 `OnboardingFlag`에 필드 하나를 추가한다.

```ts
export type OnboardingFlag = {
  completed: boolean;
  batteryNoticeShown: boolean;
  welcomeShown: boolean;
  downloadConsented: boolean; // 신규 (045)
};
```

| 필드 | 타입 | 기본값 | 되돌아가는가 | 근거 |
|------|------|--------|--------------|------|
| `downloadConsented` | `boolean` | `false` | 아니오 — 한 번 `true`가 되면 앱 재설치 전까지 유지 | 사용자가 동의 Dialog에서 [확인/시작]을 눌렀다는 1회성 사실만 기록(FR-002a, R1) |

**옛 파일 호환**: 키가 없는 옛 `onboarding.json`은 `false`로 읽는다
(`welcomeShown`이 035에서 추가됐을 때와 같은 패턴) — 021·035·040 시절
사용자는 이 스펙 적용 후 첫 실행에서 한 번 동의 Dialog를 보게 되지만,
`essentialsReady`가 이미 `true`인 기존 사용자는 R2의 우선순위 3·4단계를
건너뛰므로 실질적으로 아무것도 보지 않는다(FR-009).

**필드가 boolean 하나뿐인 이유**: `flag.ts`의 기존 규율(원칙 IV) — 언제
동의했는지, 몇 번 다시 봤는지는 담지 않는다. 그런 값은 측정 장치로 가는
길이다.

## FirstRunStage (확장)

기존 `src/firstrun/progress.ts`의 유니온에 값 둘을 추가한다.

```ts
export type FirstRunStage =
  | "logo"
  | "onboarding"
  | "download-consent"   // 신규 — 동의 Dialog를 보일 차례
  | "downloading"         // 신규 — 슬라이드 진행 화면을 보일 차례
  | "naming"
  | "liveness"
  | "done";
  // "waiting-for-download" 제거 (R4 — DownloadProgressScreen이 대체)
```

**판정 함수 시그니처 변경**:

```ts
export function resolveFirstRunStage(input: {
  onboardingNeeded: boolean;
  onboardingStarted: boolean;
  downloadConsented: boolean; // 신규
  downloadReady: boolean;
  namingDone: boolean;
  livenessOutcome: LivenessOutcome | "pending" | null;
}): FirstRunStage;
```

우선순위(R2, 첫 매치):

1. `onboardingNeeded && !onboardingStarted` → `"logo"`
2. `onboardingNeeded` → `"onboarding"`
3. `!downloadConsented && !downloadReady` → `"download-consent"`
4. `!downloadReady` → `"downloading"` (이 시점에서 `downloadConsented`는 참)
5. `!namingDone` → `"naming"`
6. `livenessOutcome !== "ok"` → `"liveness"`
7. 그 외 → `"done"`

**여전히 순수 함수다** — `Date.now()`·난수·파일을 읽지 않는다(040 원 설계
유지).

## SlideStage (신규 — 순수 판정, 파일에 저장하지 않음)

```ts
export type SlideStage =
  | { kind: "slide"; index: 0 | 1 | 2 | 3 } // 슬라이드 1~4
  | { kind: "complete" };                    // 1q 완료 화면

export function resolveSlideStage(input: {
  downloadReady: boolean;
  elapsedMs: number; // downloading 상태 진입 후 경과 시간
}): SlideStage;
```

**동작**(R3):
- `downloadReady === true` → `{ kind: "complete" }` (경과 시간 무관)
- 그 외 → `{ kind: "slide", index: min(3, floor(elapsedMs / 4000)) }`

**저장하지 않는다** — 041 재개 시 항상 슬라이드 1(index 0)부터 다시
계산된다(spec Clarifications, `elapsedMs`가 0부터 다시 시작하므로 자연히
성립).

## Key Entities (spec.md 대응)

| spec.md 엔티티 | 코드 대응 | 비고 |
|----------------|-----------|------|
| 다운로드 동의 상태 | `OnboardingFlag.downloadConsented` | 파일 영속(R1) |
| 다운로드 진행 슬라이드 단계 | `SlideStage`(순수 판정) | 파일 비영속(R3) |

## 상태 전이 다이어그램 (FirstRunStage 부분)

```
onboarding ──(권한 결정 완료)──▶ download-consent ──([확인/시작])──▶ downloading
                                                                          │
                                                            (essentialsReady === true)
                                                                          ▼
                                                                       naming ──▶ liveness ──▶ done
```

`downloadReady`가 이미 `true`인 업그레이드 사용자는 `onboarding` 다음
곧바로 `naming`(또는 이미 `namingDone`이면 `liveness`/`done`)으로
건너뛴다 — `download-consent`·`downloading` 노드를 거치지 않는다(FR-009).

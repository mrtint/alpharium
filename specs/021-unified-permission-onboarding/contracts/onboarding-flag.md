# Contract: 온보딩 완료 플래그 (`src/onboarding/flag.ts`, `flag-port.ts`)

`files/preferences/onboarding.json`의 영속화. 020의 `notified-store.ts`·`settings.ts`와
같은 모양(순수 로드/세이브 + 기기 통로). 관련: FR-009·010·010a·011·012, 원칙 IV.

## F1 — `OnboardingFlag` 타입

```ts
export type OnboardingFlag = {
  completed: boolean;
  batteryNoticeShown: boolean;
};
export const DEFAULT_ONBOARDING_FLAG: OnboardingFlag = {
  completed: false,
  batteryNoticeShown: false,
};
```

- **필드는 둘뿐**(원칙 IV). 타임스탬프·시도 횟수·단계별 상태·마지막 실행을 두지
  않는다. `checkOnboardingFile`이 `flag.ts`에서 `Date|timestamp|history|attemptCount|
  lastRun|count` 토큰(주석 제외)을 발견하면 위반.

## F2 — `FlagPort`

```ts
export interface OnboardingFlagPort {
  read(): Promise<string | null>;              // onboarding.json 원문
  write(serialized: string): Promise<void>;
  readAutoDiaryRaw(): Promise<string | null>;  // 시드용 auto-diary.json 원문 (F4)
}
```

- `read`/`write`: `notified-store.ts`의 원자적 쓰기(`.writing` → move) 복제.
- `readAutoDiaryRaw`: `files/preferences/auto-diary.json`을 **경로 하드코딩으로** 직접
  읽는다. `schedule/settings.ts`를 import하지 않는다(`onboarding/` → `schedule/` 의존
  금지). 파일이 없으면 `null`.

## F3 — `loadOnboardingFlag` / `saveOnboardingFlag`

```ts
export async function loadOnboardingFlag(port: OnboardingFlagPort): Promise<OnboardingFlag>;
export async function saveOnboardingFlag(port: OnboardingFlagPort, flag: OnboardingFlag): Promise<void>;
```

- `loadOnboardingFlag`:
  - `port.read()`가 유효 JSON이면 파싱. 부분 손상 관대 — `completed`/`batteryNoticeShown`
    이 boolean이 아니면 그 필드만 `false`(020 `settings.ts` 방식).
  - `port.read()`가 `null`이면 **F4 시드 로직** 수행.
  - 통로 예외·JSON 깨짐 → `DEFAULT_ONBOARDING_FLAG`.
- `saveOnboardingFlag`: `JSON.stringify({ completed, batteryNoticeShown })`만 직렬화
  (다른 필드 무시).

## F4 — 시드 (FR-010a)

`onboarding.json`이 없을 때(최초 1회):

```
raw = await port.readAutoDiaryRaw()
try {
  parsed = JSON.parse(raw)
  if (parsed?.batteryExceptionPrompted === true)
    return { completed: false, batteryNoticeShown: true }
} catch { /* 무시 */ }
return DEFAULT_ONBOARDING_FLAG
```

- 파일에 쓰지 않는다 — 다음 `saveOnboardingFlag` 호출 때 기록된다.
- `auto-diary.json` 읽기/파싱 실패는 전부 조용히 기본값(시드는 편의).
- **1회성**: `onboarding.json`이 한 번 생기면 `readAutoDiaryRaw`를 다시 부르지 않는다
  (`port.read()`가 non-null이므로 F4 분기에 안 들어감).

## F5 — 계약 테스트 (`__tests__/onboarding-flag.test.ts`)

1. `read`가 `null` + `readAutoDiaryRaw`가 `{"batteryExceptionPrompted":true,...}` →
   `{ completed: false, batteryNoticeShown: true }`.
2. `read`가 `null` + `readAutoDiaryRaw`가 `null` → `DEFAULT_ONBOARDING_FLAG`.
3. `read`가 `null` + `readAutoDiaryRaw`가 `batteryExceptionPrompted: false` → 기본값.
4. `read`가 `null` + `readAutoDiaryRaw`가 깨진 JSON → 기본값(예외 안 던짐).
5. `read`가 `{"completed":true,"batteryNoticeShown":false}` → 그대로. (시드 안 함 —
   `readAutoDiaryRaw` 호출 안 됨을 mock으로 확인).
6. `read`가 `{"completed":"yes"}` (타입 깨짐) → `{ completed: false,
   batteryNoticeShown: false }`.
7. `saveOnboardingFlag` 후 `read`가 정확히 두 필드만 직렬화.
8. **소스 읽기 계약**: `flag.ts`에 금지 토큰(`Date`, `timestamp`, `history`, `count`,
   `lastRun`) 없음. `flag.ts`/`flag-port.ts`가 `schedule/`를 import하지 않음.

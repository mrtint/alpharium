# Contract: 필수 에셋 다운로드 + 온보딩 완료 게이트

관련 요구사항: FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-021, FR-022.

---

## A. `src/onboarding/essential-assets.ts` — 순수 판정·상수

**로스터를 import하지 않는다** (`checkOnboardingFile`의 `ONBOARDING_TOUCHES_PRODUCT_LAYER`).
`Character` 타입만 `../diary/types`에서.

```ts
import type { Character } from "../diary/types";

/**
 * 최초 실행에 반드시 받아야 하는 자산의 키 — 사람이 못 박은 상수 (FR-015·018).
 *
 * v1·v2 = 011 vision roster(사진 보는 공용 모델), a1 = quiet 캐릭터 자산키.
 * **로스터를 import하지 않고 여기 직접 적는다** — 021 PERMISSION_REQUIREMENTS,
 * 012 USER_VISIBLE_SIGNAL_AXES 선례. 값이 로스터와 어긋나면
 * essential-assets-port.ts 쪽 계약 테스트가 잡는다.
 */
export const ESSENTIAL_ASSET_KEYS = ["v1", "v2", "a1"] as const;

/** 온보딩 기본 캐릭터 — 고정값 (FR-018). 018·023·024 실측: 가장 빠르고 안정적. */
export const ONBOARDING_DEFAULT_CHARACTER: Character = "quiet";

/** 필수 자산 전부가 준비됐는가 (FR-019). facts는 port가 실시간 조회로 만든다. */
export function essentialAssetsReady(
  facts: readonly { key: string; ready: boolean }[],
): boolean;

/** 합산 진행률 — 하나의 바 (FR-017). total 0이면 0. 026 병렬성 미노출(원칙 IV). */
export function essentialDownloadFraction(
  parts: readonly { receivedBytes: number; totalBytes: number }[],
): number;
```

### 규칙

- **AR1**: `essentialAssetsReady` — `ESSENTIAL_ASSET_KEYS`의 모든 키가 `facts`에서
  `ready: true`일 때만 `true`. 키가 `facts`에 없으면 `false`(미조회 = 미준비).
- **AR2**: `essentialDownloadFraction` — `sum(receivedBytes)/sum(totalBytes)`.
  `sum(totalBytes) === 0` → `0`. 결과는 `[0, 1]`로 clamp.
- **AR3**: 소스에 `from "../models/` / `from "../vision/roster"` / `diary/prompt` /
  `diary/acceptance` / `schedule/settings` import 없음. `Date`·`count`·`history`
  토큰 없음(`checkOnboardingFile` `FLAG_GROWS_HISTORY` — 이 파일엔 원래 없어야
  하지만 확인).
- **AR4**: `ESSENTIAL_ASSET_KEYS`·`ONBOARDING_DEFAULT_CHARACTER`는 `as const` /
  `readonly` — 계약 테스트가 소스에서 `let`·재할당 없음 확인.

---

## B. `src/app/essential-assets-port.ts` — 기기 통로

`src/app/`에 둔다 (research §5 — `checkSourceFile`의 `UI_TOUCHES_MODEL`은
`src/ui/`만 대상, `src/app/`은 조립이라 로스터 접근 허용). `App.tsx`가 만들어
`OnboardingScreen`에 주입 (021 `OnboardingPorts` 패턴).

```ts
export type EssentialAssetsPort = {
  /** 필수 자산 3개의 준비 상태를 실시간 조회 (FR-019·020). */
  readFacts(): Promise<{ key: string; ready: boolean }[]>;
  /**
   * 필수 자산을 받는다 (FR-015). 011 prepareVision + 003 prepare("quiet")를
   * 부르고, 두 진행을 합산해 하나의 fraction으로 onProgress에 넘긴다 (FR-017).
   * 이미 받은 부분은 이어받는다 (FR-021 — 026 세그먼트 이어받기 자동).
   */
  downloadEssentials(onProgress: (fraction: number) => void): Promise<
    | { ok: true }
    | { ok: false; reason: "insufficient-space" | "network" | "unknown" }
  >;
  /** 받기 전 공간이 충분한지 (FR-022). 003 SPACE_HEADROOM 재사용. */
  hasSpaceForEssentials(): Promise<boolean>;
};

export function expoEssentialAssetsPort(): EssentialAssetsPort;
```

### 규칙

- **BR1**: `readFacts` — `visionReadiness(ports)`(011) 결과를 `v1`·`v2` 두 키로,
  **`ports.files.facts(assetFor("quiet").key)` + `verdictFor(state, key)`**(003·026
  `storage.ts` 헬퍼, `App.tsx`의 `refreshReady`가 쓰는 바로 그 조합)를 `a1` 키로
  매핑. `ready` = readiness가 `ready`|`verified`. **003에 새 `characterReadiness`
  export를 만들지 않는다** — 기존 헬퍼 조합으로 충분.
- **BR2**: `downloadEssentials` — `prepareVision`과 `createAcquisition(ports).prepare("quiet", …)`
  를 병렬 또는 순차로 호출. 각 콜백의 `receivedBytes/totalBytes`를 모아
  `essentialDownloadFraction`으로 하나의 `fraction`. **구간 개수·속도를 콜백 밖으로
  내보내지 않는다** (원칙 IV).
- **BR3**: 실패 매핑 — `DownloadFailure`가 공간 부족류면 `"insufficient-space"`,
  네트워크류면 `"network"`, 그 외 `"unknown"`.
- **BR4**: `assetFor("quiet")` 호출은 허용(`src/app/`) — 단 그 결과(URL·바이트)를
  `OnboardingScreen`으로 넘기지 않는다. 화면은 `fraction`과 `ready`만 받는다
  (원칙 III).
- **BR5** (계약 테스트): `ESSENTIAL_ASSET_KEYS`의 `a1`이 `assetFor("quiet").key`와
  실제로 같은지 이 포트의 테스트가 대조한다 (상수가 로스터와 안 어긋나게).

---

## C. `src/onboarding/decision.ts` — 완료 게이트 (021 확장)

```ts
/**
 * 온보딩을 띄워야 하는가 (021 D2 확장, 029 FR-019·020).
 *
 * 진입 시점(cold start·resume)에만 호출된다. 세션 중 캐릭터 손상은
 * FR-014가 다룬다(설정 탭 안내, 온보딩 재노출 아님).
 */
export function shouldShowOnboarding(
  flag: OnboardingFlag,
  essentialAssetsReady: boolean,
): boolean;
```

### 규칙

- **DR1**: `flag.completed !== true` → `true` (기존 021 동작).
- **DR2**: `flag.completed === true && essentialAssetsReady === false` → `true`
  (029 FR-020 — model-not-ready 재발 방지).
- **DR3**: `flag.completed === true && essentialAssetsReady === true` → `false`
  (홈으로).
- **DR4**: 시그니처가 인자 2개 — 계약 테스트가 소스에서 확인(021 테스트는 1개
  인자였으므로 그 테스트도 갱신).

### 계약 테스트 (`__tests__/onboarding/decision.test.ts` 확장)

| # | completed | essentialAssetsReady | 기대 |
|---|---|---|---|
| D1 | false | false | true (DR1) |
| D2 | false | true | true (DR1 — completed가 우선) |
| D3 | true | false | true (DR2 — FR-020) |
| D4 | true | true | false (DR3) |

---

## D. `OnboardingScreen.tsx` — assets 단계 (021 확장)

### 규칙

- **SR1** (FR-015): 권한 단계들이 전부 `satisfied`/`skipped-eligible`이 된 **뒤**
  `assets` 단계가 `current`가 된다. `nextStep`이 권한 단계를 먼저 소진.
- **SR2** (FR-016): `assets` 단계에는 **[건너뛰기] 버튼이 없다**. `testID`로
  `onboarding-skip`이 이 단계에서 렌더되지 않음을 계약 테스트가 확인.
- **SR3** (FR-017): 진행률 바 **하나**. `testID="onboarding-assets-progress"`.
  `essentialAssetsReady`가 false인 동안 [시작하기](`onboarding-start`) 비활성/미렌더.
- **SR4** (FR-017): `essentialAssetsReady` true → [시작하기] 활성. 누르면
  `onComplete({ completed: true, batteryNoticeShown })` (021 그대로).
- **SR5** (FR-022): `downloadEssentials`가 `{ ok: false, reason }` →
  `status: "failed"`, 안내 문구(공간/네트워크별) + [다시 시도]
  (`testID="onboarding-assets-retry"`). [시작하기]는 계속 비활성.
- **SR6** (FR-021): [다시 시도] 또는 `AppState active` 복귀 시 `downloadEssentials`
  재호출 — 026이 이어받기를 자동 처리하므로 이미 받은 부분은 유지.
- **SR7** (SC-006 정신, 021 선례): `AppState change → active`에서 `readFacts`
  재조회 — 다른 경로로 이미 받아졌으면 즉시 `ready`.
- **SR8** (원칙 III): `OnboardingScreen.tsx`는 `src/ui/`에 있어 `checkSourceFile`
  `UI_TOUCHES_MODEL`의 대상이다. `essentialAssetsReady`·`essentialDownloadFraction`
  은 `../onboarding/essential-assets`에서만, `EssentialAssetsPort` **타입**은
  주입받은 것만 쓴다 — `models/*`·`vision/roster`를 import하지 않는다. 계약
  테스트가 소스에서 확인.

### 화면 테스트 (`__tests__/ui/onboarding-screen.test.tsx` 확장)

| # | 상황 | 기대 |
|---|---|---|
| OS1 | 권한 전부 satisfied, assets downloading | assets 진행률 바 보임, [건너뛰기] 없음, [시작하기] 비활성 |
| OS2 | assets ready | [시작하기] 활성 |
| OS3 | assets failed (space) | 공간 안내 + [다시 시도], [시작하기] 비활성 |
| OS4 | [다시 시도] 탭 | `downloadEssentials` 재호출 |

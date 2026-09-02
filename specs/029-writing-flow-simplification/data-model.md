# Phase 1 — Data Model: 일기 쓰기 흐름 단순화 + 최초 실행 필수 에셋 다운로드

새 저장 계층은 없다. 기존 파일에 얹는 필드와, 저장되지 않는 계산 결과만 정리한다.

---

## §1. Settings Preferences (기존 파일 확장)

### `files/preferences/selected-character.json` (007 재사용)

| 필드 | 타입 | 비고 |
|---|---|---|
| `character` | `Character` (로스터 밖이면 로드 시 `null`) | 의미가 **"다음 일기를 쓸 캐릭터"**로 좁혀짐 (029) |

- **읽기**: `loadSelection(port)` → `Character | null`. 변경 없음.
- **쓰기 주체 변경**:
  - 제거 — 홈 `CharacterPicker`의 `onSelectCharacter`
  - 추가 — 생성 성공 직후 (`pipeline.run()` 성공, 일기 저장됨) 그 캐릭터를 기록
  - 추가 — 설정 탭 "일기 작성자" 고정 선택 시
- **상태**: `null`(고른 적 없음 / 파일 없음·깨짐) → 자동 판정이 `onboardingDefault`
  ("quiet") 사용.

### `files/preferences/vision-setting.json` (011 확장)

| 필드 | 타입 | 비고 |
|---|---|---|
| `auto` | `true` (선택적) | 있으면 "자동" 상태. `vision`과 상호배타 |
| `vision` | `"none" \| "quick" \| "detailed"` (선택적) | 명시적 고정값 |

- **읽기**: `loadVisionSetting(port)` → `"auto" \| VisionSetting`.
  - 파일 없음·깨짐 → `"auto"` (029가 011의 `null` 해석을 **바꾼다** — 기본이 "자동")
  - `{ auto: true }` → `"auto"`
  - `{ vision: "none" }` → `"none"` (사용자가 명시적으로 "보지 않음" 선택)
- **쓰기**: `saveVisionSetting(port, "auto")` → `{ auto: true }`;
  `saveVisionSetting(port, "quick")` → `{ vision: "quick" }`.
- **VisionSetting 타입 자체(none/quick/detailed)는 불변** (원칙 II — spec Assumptions).

### `files/preferences/geocoding-setting.json` (017 확장)

| 필드 | 타입 | 비고 |
|---|---|---|
| `mode` | `"auto" \| "on" \| "off"` | 3-상태. 기존 `{ enabled: boolean }`을 대체 |

- **읽기**: `loadGeocodingSetting(port)` → `"auto" \| "on" \| "off"`.
  - 파일 없음·깨짐 → `"auto"` (FR-025 기본값)
  - 구형 `{ enabled: true }` → `"on"`, `{ enabled: false }` → `"off"` (마이그레이션)
- **쓰기**: `saveGeocodingSetting(port, "auto"|"on"|"off")` → `{ mode }`.
- **017 FR-005 정신**: `"auto"` + 위치 권한 없음 = 이 기능 이전과 동일(꺼짐).

---

## §2. Resolved Generation Params (저장 안 됨 — 계산 결과)

`src/app/resolve-generation.ts`의 순수 함수 출력. `prompt.ts`로 넘어가기 직전 값.

```
type ResolvedParams = {
  character: Character;         // FR-008·012·014
  day: DayDate;                 // FR-009 (= 입력 chosenDay, 재판정은 호출자)
  vision: VisionSetting;        // "none" | "quick" | "detailed" — FR-010·012
  geocodingEnabled: boolean;    // FR-011·012
  movedFrom?: Character;        // FR-014 — 캐릭터가 옮겨졌으면 알릴 것
};

type ResolveOutcome = ResolvedParams | { kind: "no-ready-character" };
```

### 판정 규칙

| 출력 필드 | 규칙 |
|---|---|
| `character` | (1) `fixedAuthor`가 있고 준비됨 → 그 값. (2) 없거나 미준비 → `lastCharacter ?? onboardingDefault`를 후보로 `resolveSelection(candidate, readyCharacters)` 적용. (3) `resolveSelection`이 `{kind:"none"}` → `{ kind: "no-ready-character" }` |
| `movedFrom` | `resolveSelection` 결과에 `movedFrom`이 있으면 그대로 전달 |
| `day` | 입력 `chosenDay` 그대로 (재판정은 009 `writePromptFor`/`selectableDays`가 호출 전에) |
| `vision` | `visionPreference !== "auto"` → 그 값. `"auto"` → `photoSignalPresent ? "quick" : "none"` (FR-010, 임계값 없음) |
| `geocodingEnabled` | `geocodingPreference === "on"` → `true`. `"off"` → `false`. `"auto"` → `locationPermission` |

- **`new Date()` 미사용** — `chosenDay`·`photoSignalPresent`·`locationPermission`
  전부 인자로 받는다.
- **신호 타입 미import** — `photoSignalPresent: boolean`은 호출자가 계산.
- **로스터 미import** — `Character`(diary/types), `resolveSelection`(app/selection),
  `VisionSetting`(diary/types)만.

---

## §3. Essential Assets (온보딩 필수 에셋)

### 상수 — `src/onboarding/essential-assets.ts` (순수, 로스터 미import)

| 상수 | 값 | 근거 |
|---|---|---|
| `ESSENTIAL_ASSET_KEYS` | `["v1", "v2", "a1"]` (readonly) | 사람이 못 박음. `v1`·`v2` = 011 vision roster, `a1` = quiet 캐릭터 자산키. **로스터를 import하지 않고 사람이 적는다** (`checkOnboardingFile`). 값이 로스터와 어긋나면 계약 테스트가 잡도록 `essential-assets-port.ts` 쪽에서 대조 |
| `ONBOARDING_DEFAULT_CHARACTER` | `"quiet"` (`Character`) | FR-018. 018·023·024 실측(가장 빠르고 안정적). narrative는 024·028이 부적합 확정 |

### 순수 판정 함수

```
essentialAssetsReady(
  facts: readonly { key: string; ready: boolean }[]
): boolean
// ESSENTIAL_ASSET_KEYS 전부가 facts에서 ready:true 인가 (FR-019)

essentialDownloadFraction(
  parts: readonly { receivedBytes: number; totalBytes: number }[]
): number
// 합산: sum(received) / sum(total). total이 0이면 0. (FR-017 — 하나의 바)
```

### 준비 상태 (실시간 조회, 저장 안 됨)

`src/app/essential-assets-port.ts`가 `visionReadiness(ports)`(011) +
`characterReadiness(ports, "quiet")`(003, 또는 `ports.files.facts(assetFor("quiet").key)`)
를 묶어 `facts[]`를 만든다.

| readiness | `ready` |
|---|---|
| `ready` / `verified` | `true` |
| `not-downloaded` / `partial` / `paused` / `segmentedResume` / `corrupt` | `false` |

---

## §4. Onboarding Flag (021, 변경 없음)

| 필드 | 타입 | 비고 |
|---|---|---|
| `completed` | `boolean` | 변경 없음 |
| `batteryNoticeShown` | `boolean` | 변경 없음 |

- **"필수 에셋 준비됨"은 이 파일에 저장하지 않는다** (§3 — 실시간 조회).
  `checkOnboardingFile`의 `FLAG_GROWS_HISTORY`와 021의 "boolean 2개뿐"을 유지.

---

## §5. Onboarding Step (021 확장)

`src/onboarding/decision.ts`:

```
type OnboardingStep =
  | { requirement: PermissionRequirement; status: StepStatus }   // 기존 (권한)
  | { kind: "assets"; status: "downloading" | "ready" | "failed"; fraction: number }  // 신규
```

- 권한 단계들(`planOnboardingSteps`) **다음에** `assets` 단계가 온다.
- `assets` 단계는 `status`:
  - `downloading` — 진행 중, `fraction` 표시, [시작하기] 비활성, **[건너뛰기]
    없음** (FR-016)
  - `ready` — `essentialAssetsReady` true, [시작하기] 활성 (FR-017)
  - `failed` — 공간 부족·네트워크 실패, 안내 문구 + [다시 시도] (FR-022)
- **완료 게이트**: `shouldShowOnboarding(flag, essentialAssetsReady)`:
  - `flag.completed !== true` → 온보딩 (기존)
  - `flag.completed === true && !essentialAssetsReady` → 온보딩 (029, FR-020)
  - 둘 다 만족 → 홈

### 상태 전이

```
[앱 진입]
  ├─ flag.completed !== true ────────────────→ 온보딩 (권한 → assets → 시작하기)
  ├─ flag.completed && !essentialAssetsReady ─→ 온보딩 (assets 단계로 바로, FR-020)
  └─ flag.completed && essentialAssetsReady ──→ 홈

[온보딩 assets 단계]
  downloading ──(essentialAssetsReady)──→ ready ──[시작하기]──→ flag.completed=true → 홈
  downloading ──(공간부족/네트워크)────→ failed ──[다시 시도]──→ downloading

[홈, 세션 중]
  "일기 쓰기" + 자동판정 no-ready-character ─→ 설정 탭 "일기 작성자" 안내 (FR-014)
                                              (온보딩 재노출 아님 — 진입 게이트만)
```

---

## §6. 영향받는 화면 props (요약 — 상세는 contracts/)

| 화면 | 제거되는 props | 추가/변경 |
|---|---|---|
| `DiaryHomeScreen` | `characters`, `onSelectCharacter`, `vision`, `onSelectVision`, `onToggleGeocoding`, `geocodingEnabled` | `resolved: ResolveOutcome` (상위가 계산해 넘김) 또는 `onWrite`가 자동판정 결과를 받음 |
| `DiaryListScreen` | 위와 동일 | 날짜 셀렉트·"일기 쓰기"·목록만 |
| `OnboardingScreen` | — | `assetsPort`, `onAssetsProgress`; `assets` 단계 렌더 |
| `AutoDiarySettingsScreen` | — | `authorSection`·`visionSection`·`geocodingSection` props + 콜백 (또는 별도 컴포넌트 합성) |
| `App.tsx` | "캐릭터" 탭, `DiarySection`의 `vision`/`geocoding` state | 진입 게이트에 `essentialAssetsReady`, 설정 탭에 세 섹션 |

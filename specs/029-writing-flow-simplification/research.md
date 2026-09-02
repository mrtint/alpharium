# Phase 0 — Research: 일기 쓰기 흐름 단순화 + 최초 실행 필수 에셋 다운로드

이 스펙은 새 기능이 아니라 **재배치·재사용**이므로, 조사는 "무엇을 새로
만드는가"가 아니라 "기존 어느 경계를 어떻게 다시 쓰는가"에 집중한다.

---

## §1. 자동 판정을 어디에 두는가

### Decision

`src/app/resolve-generation.ts` — **순수 함수 하나**. 007 `src/app/selection.ts`가
같은 디렉터리에 순수 판정(`resolveSelection`)을 둔 선례를 그대로 따른다.

시그니처(계약은 `contracts/resolve-generation.md`):

```
resolveGenerationParams(input: {
  lastCharacter: Character | null;          // selected-character.json (FR-008)
  onboardingDefault: Character;              // 고정값 "quiet" (FR-018)
  readyCharacters: readonly Character[];     // 003 readiness (FR-014)
  fixedAuthor: Character | null;             // 설정 탭 "일기 작성자" 고정 (FR-012)
  chosenDay: DayDate;                        // 홈 셀렉트 (재판정 후) (FR-009)
  photoSignalPresent: boolean;              // 그 날 사진 ≥ 1장인가 (FR-010)
  locationPermission: boolean;              // 위치 권한 (FR-011)
  visionPreference: "auto" | VisionSetting; // 설정 탭 "사진 보기" (FR-012·024)
  geocodingPreference: "auto" | boolean;    // 설정 탭 "장소명" (FR-012·025)
}): ResolvedParams | { kind: "no-ready-character" }
```

`ResolvedParams = { character, day, vision, geocodingEnabled, movedFrom? }` —
`prompt.ts`로 넘어가기 직전의 값. 어디에도 저장하지 않는다.

### Rationale

- **화면이 아니다**(FR-007 MUST). spec이 "배선 계층에서 계산 — 화면 아님"을 명시.
  `DiaryHomeScreen`은 결과(`ResolvedParams`)만 받아 `pipeline.run()`에 넘긴다.
- **`new Date()`를 부르지 않는다** — `day-boundary.ts`·`schedule/decision.ts`·
  `onboarding/decision.ts`의 공통 규칙. `chosenDay`는 이미 재판정된 값으로 받는다
  (재판정은 009 `writePromptFor` / `selectableDays`가 계속 담당).
- **캐릭터 폴백은 007 `resolveSelection()`을 재사용**한다(FR-014). `fixedAuthor` →
  `lastCharacter` → `onboardingDefault` 순으로 후보를 만들고, 그 후보가
  `readyCharacters`에 없으면 `resolveSelection(candidate, ready)`가 옮길 곳을
  정한다. 옮길 준비된 캐릭터가 하나도 없으면 `{ kind: "no-ready-character" }`.
- **사진 신호는 "0장인가"만**(FR-010) — 임계값 없음(원칙 V). `photoSignalPresent`는
  호출자가 그 날 신호에서 계산해 넘긴다. `resolve-generation.ts`는 신호 타입을
  import하지 않는다(경계 혼동 방지 — 022 `SIGNAL_PRESETS`가 `fake.ts`·`collect.ts`를
  안 가져온 것과 같은 판단).

### Alternatives considered

- **`wiring.ts` 안에 인라인**: `createAppPipeline`이 이미 배선 자리이지만, 자동
  판정은 렌더마다 다시 돌아야 하고(날짜 셀렉트·권한 상태가 바뀜) `useMemo` 의존성이
  많아진다. 순수 함수로 떼면 계약 테스트가 조합을 직접 넣어 검증한다(007 선례).
- **화면 상태로**: FR-007 MUST NOT 위반.

---

## §2. "마지막에 쓴 캐릭터"를 어떻게 기록하는가

### Decision

007 `selected-character.json`(preferences)을 **재사용**하되, 갱신 주체를 바꾼다:
- **제거**: `DiaryHomeScreen`의 `onSelectCharacter` → `saveSelection()` 경로(홈
  CharacterPicker가 사라지므로).
- **추가**: `pipeline.run()`이 성공(일기가 저장됨)한 직후 그 캐릭터를
  `saveSelection(port, character)`로 기록. 배선 계층(`wiring.ts` 또는
  `DiarySection`의 생성 성공 콜백)에서 한다 — `pipeline.ts` 자체는
  `expo-file-system`을 import하지 않으므로(020 유지) 통로를 주입받거나 상위에서
  호출한다.
- **설정 탭 "일기 작성자" 고정 선택**도 같은 파일에 `saveSelection()`.

### Rationale

- **한 파일, 한 의미**: `selected-character.json`의 의미가 "사용자가 마지막으로
  고른 캐릭터" → "다음 일기를 쓸 캐릭터"로 좁혀진다(clarification 2026-09-02).
  `loadSelection()`은 그대로 — 로스터 밖 이름·깨진 파일이면 `null`.
- **새 파일 없음**(FR-008a MUST NOT). `last-written-character.json` 같은 별도
  파일을 만들면 자동 판정이 두 파일을 합쳐 읽어야 하고, 그 병합 규칙이 또 하나의
  판정 자리가 된다.
- **고정 선택과 생성 기록이 같은 파일이어도 충돌 없음**: 고정값이 있으면
  `resolveGenerationParams`가 항상 그 값을 쓰므로(FR-012), 생성 성공 후 되쓰는
  것은 같은 값을 되쓰는 no-op다. 고정값이 없으면 마지막 생성 캐릭터가 남는다.

### Alternatives considered

- **가장 최근 `DiaryEntry`의 캐릭터를 읽기**(clarification 옵션 C): 목록을 매번
  읽어 정렬해야 하고, `DiaryEntry`에 캐릭터가 저장돼 있는지 확인 필요. 파일 하나
  읽기(`selected-character.json`)가 더 싸고 007 계약을 그대로 잇는다.
- **별도 파일**(옵션 B): 위 Rationale 참조 — 병합 규칙이 새 판정 자리가 된다.

---

## §3. "사진 보기"·"장소명"의 "자동" 상태 저장

### Decision

기존 파일에 **"자동" 상태를 얹는다** — 새 파일 없음(FR-026).

- **`vision-setting.json`** (011): 현재 `{ vision: "none"|"quick"|"detailed" }`.
  `loadVisionSetting()`이 `null`을 돌려주는 것이 이미 "고른 적 없음"이다. 029는
  이 `null`을 **"자동"으로 해석**한다 — 화면은 "자동/보지 않음/빠르게 봄/자세히
  봄" 4개를 보이고, "자동"을 고르면 `vision-setting.json`을 삭제하거나
  `{ vision: null }`을 쓴다(둘 중 하나로 계약 고정 — 아래 결정).
  - **계약: `{ auto: true }` 또는 `{ vision: <VisionSetting> }`.** `loadVisionSetting`
    파싱을 확장해 `auto` 필드를 인식하고, `auto: true`면 `"auto"` 센티넬을
    돌려준다. VisionSetting 타입 자체(none/quick/detailed)는 불변.
- **`geocoding-setting.json`** (017): 현재 `{ enabled: boolean }`.
  `loadGeocodingSetting()`이 항상 `boolean`(파일 없음 → `false`). 029는 3-상태
  (`"auto"`/`true`/`false`)로 확장 — `{ mode: "auto"|"on"|"off" }`. 파일 없음 →
  `"auto"`(FR-025 기본값). **017 FR-005 정신 유지**: "자동" + 위치 권한 없음 =
  이 기능 이전과 동일(꺼짐).

### Rationale

- 007 `selection-store`가 "고른 적 없음"을 `null`로 둔 판단과 같다 — "자동"은
  "아직 명시적으로 고르지 않았다 / 앱이 알아서"라는 하나의 상태다.
- `geocoding`은 017이 `null`을 구분하지 않기로 했으므로(꺼짐이 기본), 3-상태로
  가려면 명시적 `mode` 필드가 필요하다. `vision`은 이미 `null`을 구분하므로
  최소 변경으로 `auto` 센티넬만 추가.

### Alternatives considered

- **새 preferences 파일 하나에 세 값 모으기**: 007이 "한 파일에 둘을 담으면
  한쪽 고칠 때 다른 쪽이 지워진다"고 경고한 자리. 기존 3파일 유지가 안전.
- **`vision-setting.json`에서 `null` = "보지 않음"** (현재 App.tsx 동작): 029는
  이 해석을 **바꾼다** — `null`(파일 없음) = "자동". 최초 사용자가 사진 있는 날에
  자동으로 "빠르게 봄"이 되게 하려면 기본이 "자동"이어야 한다(FR-024). 명시적으로
  "보지 않음"을 고른 사용자는 `{ vision: "none" }`이 저장돼 있으므로 구분된다.

---

## §4. 필수 에셋 다운로드 — 온보딩이 011·003·026을 어떻게 부르는가

### Decision

- **`src/onboarding/essential-assets.ts`** (신규 순수 함수):
  - `ESSENTIAL_ASSET_KEYS: readonly string[]` — 사람이 못 박은 상수. `["v1", "v2",
    "a1"]` (VLM 본체·프로젝터 + quiet 캐릭터). `a1`은 `assetFor("quiet").key`와
    같아야 하지만, **이 상수는 로스터를 import하지 않고 사람이 직접 적는다**
    (`checkOnboardingFile`이 `models/roster` import를 막음 — §5).
  - `ONBOARDING_DEFAULT_CHARACTER: Character = "quiet"` — 고정값(FR-018). `Character`
    타입만 `diary/types`에서 온다(로스터 아님).
  - `essentialAssetsReady(facts: readonly { key: string; ready: boolean }[]): boolean`
    — 순수 판정. `ESSENTIAL_ASSET_KEYS` 전부가 `ready: true`인가. (FR-019)
  - `essentialDownloadTotal / essentialDownloadReceived` — 합산 진행률 계산 순수
    함수 (FR-017, 하나의 바). 입력은 `{ key, receivedBytes, totalBytes }[]`.
- **`src/onboarding/essential-assets-port.ts`** (신규, 기기에 닿는 자리):
  - `visionReadiness()` (011) + 003 캐릭터 준비 조회를 묶어 `facts[]`를 만든다.
  - `downloadEssentials(onProgress)` — `prepareVision(ports, cb)`(011)와
    `createAcquisition(ports).prepare("quiet", cb)`(003)를 부른다. 두 진행 콜백을
    합산해 하나의 `fraction`으로 `onProgress`에 넘긴다.
  - **이 파일이 `models/roster`·`vision/roster`를 import해야 하는가?** →
    `visionReadiness`·`prepareVision`은 `vision/roster`를 이미 내부에서 부르므로
    포트는 그 함수만 부르면 된다. 003 캐릭터 쪽은 `assetFor("quiet")`가 필요 —
    이것이 `checkOnboardingFile`에 걸린다(§5).
- **`OnboardingScreen.tsx`**: 권한 단계 뒤에 `kind: "assets"` 단계를 더한다.
  진행률 바 하나 + "시작하기"는 `essentialAssetsReady`가 true일 때만 활성
  (FR-017). **[건너뛰기] 버튼 없음**(FR-016). 공간 부족·네트워크 실패 시 안내
  문구 + [다시 시도](FR-022, Edge Cases).

### Rationale

- 순수 판정(`essential-assets.ts`)과 기기 통로(`essential-assets-port.ts`)를
  나누는 것은 020 `schedule/` + `schedule/*-port`, 021 `onboarding/` +
  `onboarding/*-port`의 확립된 패턴.
- **새 다운로드 엔진 0개**: 011 `prepareVision`, 003 `createAcquisition().prepare`,
  026 세그먼트 병렬(둘 다 `DownloadPort` 뒤에서 자동으로 얻음)을 그대로 부른다.
- 합산 진행률은 두 콜백의 `receivedBytes / totalBytes`를 더해 하나의 `fraction`
  으로 — 026의 병렬성·구간·속도를 화면에 노출하지 않는다(원칙 IV).

### Alternatives considered

- **온보딩이 `createAcquisition`을 직접 조립**: `App.tsx`의 `ModelSection`이 이미
  하는 일. 온보딩에서 재조립하면 통로 생성 자리가 둘이 된다 —
  `essential-assets-port.ts` 하나로 모은다.
- **"필수 에셋 준비됨"을 `onboarding.json`에 boolean으로 저장**: `checkOnboardingFile`
  의 `FLAG_GROWS_HISTORY`가 막지는 않지만, 021이 "필드는 boolean 2개뿐"으로 못
  박았다. 준비 여부는 파일이 아니라 003 readiness 실시간 조회(FR-019) — 파일이
  거짓말할 수 없다(모델을 지우면 즉시 false).

---

## §5. `checkOnboardingFile` 규칙과의 충돌 — `essential-assets-port.ts`의
     `models/roster` import

### Decision

`checkOnboardingFile`의 `ONBOARDING_TOUCHES_PRODUCT_LAYER`는
`models/roster`·`diary/prompt`·`diary/acceptance`·`schedule/settings` import와
`backend.generate()` 호출을 막는다. `essential-assets-port.ts`가
`assetFor("quiet")`(= `models/roster`)를 부르면 **이 규칙에 걸린다.**

**해결**: `essential-assets-port.ts`는 `models/roster`를 **import하지 않는다.**
대신:
- 003이 이미 `expoModelPorts()` + `createAcquisition(ports).prepare(character, cb)`
  를 제공하며, `prepare()`는 내부에서 `assetFor(character)`를 부른다. 포트는
  `character` 심볼(`"quiet"`, `diary/types`의 `Character`)만 넘기면 된다 —
  자산키·URL·바이트에 닿지 않는다.
- 준비 조회도 `App.tsx`의 `refreshReady` 패턴처럼 `ports.files.facts(key)`가
  필요한데, 여기서 `key`는 `assetFor("quiet").key`. **이 한 줄이 문제.**
  - **선택지 A**: `essential-assets-port.ts`를 `src/onboarding/`이 아니라
    `src/app/`에 둔다 — `src/app/`은 `checkSourceFile` 대상이지만 그 규칙
    (`UI_TOUCHES_MODEL`)은 `src/ui/`에만 적용된다(주석 명시: "화면만 검사한다.
    `src/app/`은 조립이므로 준비 상태를 읽을 수 있다"). `src/app/`은
    `models/roster` import가 허용된다.
  - **선택지 B**: 003이 캐릭터 심볼만으로 준비를 조회하는 함수를 노출
    (`characterReadiness(ports, character)` — 내부에서 `assetFor`). 011의
    `visionReadiness(ports)`와 대칭.

**채택: 선택지 A + B 병행.** 포트 파일을 `src/app/essential-assets-port.ts`로
두고(A — `src/app/`은 로스터 접근 허용), 그 안에서 003·011 함수를 부른다. 순수
판정 `essential-assets.ts`는 `src/onboarding/`에 남긴다(로스터 안 건드림, `Character`
타입만). `App.tsx`가 포트를 만들어 `OnboardingScreen`에 주입 — 021의
`OnboardingPorts` 주입 패턴 그대로.

### Rationale

- `src/app/`이 "조립"이고 로스터 접근이 허용된다는 것은 `checkSourceFile` 주석과
  `wiring.ts`가 이미 `models/*`를 쓰는 것으로 확립됨.
- `essential-assets.ts`(순수 판정, 상수)만 `src/onboarding/`에 두면
  `checkOnboardingFile`의 취지(온보딩 판정이 로스터를 모른다)가 지켜진다 —
  그 파일은 `Character` 타입과 문자열 상수뿐.

### Alternatives considered

- **`checkOnboardingFile` 규칙 완화**: 온보딩이 로스터를 알아도 된다고 풀면 021의
  경계가 흐려진다. 포트를 `src/app/`으로 옮기는 편이 규칙을 안 건드린다.

---

## §6. 온보딩 완료 게이트에 "필수 에셋 준비됨" AND 추가

### Decision

`src/onboarding/decision.ts`에 순수 판정 추가:

```
shouldShowOnboarding(flag: OnboardingFlag, essentialAssetsReady: boolean): boolean
```

- 현재: `flag.completed !== true`
- 변경: `flag.completed !== true || !essentialAssetsReady` (FR-019 AND → 진입
  게이트는 OR로 "둘 중 하나라도 안 되면 온보딩")
- `App.tsx`의 `AppFrame`이 `onboarding.json` 로드와 함께 `essentialAssetsReady`를
  003·011 readiness 조회로 계산해 이 함수에 넘긴다.
- **세션 중 캐릭터 손상은 FR-014가 다룬다** — `shouldShowOnboarding`은 앱 진입
  시점(cold start·resume)에만 판정된다(clarification 2026-09-02). `AppState`
  `change → active`에서 재조회하되, 이미 홈에 들어와 있으면 "일기 쓰기" 실패는
  설정 탭 안내 경로(FR-014)로 흐른다.

### Rationale

- `shouldShowOnboarding`은 이미 순수 함수 — 인자를 하나 더 받는 것이 최소 변경.
- 021이 "`completed` 하나만 본다"고 한 것을 029가 확장하는 근거가 spec FR-019.
- 실시간 조회(파일 아님)라 모델을 지우면 즉시 온보딩 재노출 — 028 결함의 방어.

### Alternatives considered

- **`onboarding.json`에 `assetsReady: boolean` 저장**: §4 Rationale — 파일이
  거짓말할 수 있다(모델 삭제). 실시간 조회가 옳다.

---

## §7. 홈 화면에서 위젯 4개 제거 — 무엇을 어떻게 걷어내는가

### Decision

- **`DiaryHomeScreen.tsx`**: `characters`·`onSelectCharacter`·`vision`·
  `onSelectVision`·`onToggleGeocoding`·`geocodingEnabled` props 제거. `selection`
  prop은 유지(생성 시 캐릭터가 필요) — 단 `SelectionState`가 아니라 자동 판정
  결과를 상위에서 받는다. 날짜 셀렉트(`chosenDay` + `setChosenDay`)와 012 정오
  게이트 안내(`todayNotYetWritable`)는 유지(FR-002·005).
- **`DiaryListScreen.tsx`**: 위 props를 넘기던 자리 제거. `CharacterPicker`·
  `VisionPicker`·`GeocodingSettingToggle` 렌더 삭제. "일기 쓰기" 버튼 + 날짜
  셀렉트 + 목록만.
- **`App.tsx` `DiarySection`**: `vision`·`geocodingEnabled` state와 그 로드/저장
  `useEffect`를 제거(설정 탭으로 이동). `selection` 관련은 자동 판정으로 대체 —
  `resolveGenerationParams`를 호출해 `pipeline.run()`에 넘길 값을 만든다.
- **`write()` 핸들러**(`DiaryHomeScreen`): `selection.kind === "none"` 체크를
  자동 판정 결과의 `{ kind: "no-ready-character" }` 체크로 교체(FR-014).

### Rationale

- spec FR-001 MUST NOT: 홈에 위젯·안내 문구 없음. FR-006 MUST NOT: 홈이 파라미터를
  묻지 않음.
- 009의 날짜 셀렉트·재판정(`writePromptFor`, 파일 저장 안 함)은 유지(FR-002·003).
- 012의 `isDayWritable`·정오 게이트 안내 유지(FR-005).

### Alternatives considered

- **컴포넌트 파일 물리 삭제 vs 설정 탭에서 재사용**: spec Assumptions가
  "구현 단계 판단"으로 남김. `CharacterPicker`·`VisionPicker`는 설정 탭 섹션에서
  형태를 바꿔 재사용(props 계약이 이미 "모델 모름")하고, `GeocodingSettingToggle`은
  3-상태로 개편. `CharacterListScreen`은 설정 탭 "일기 작성자" 섹션으로 흡수
  (Q1=A) — 파일은 남기되 `App.tsx`에서 탭이 아니라 섹션으로 렌더하거나, 내용을
  새 `AuthorSection` 컴포넌트로 옮긴다.

---

## §8. 헌법 개정 (v1.2.0 → v1.3.0)

### Decision

`.specify/memory/constitution.md`:
- **버전**: `1.2.0` → `1.3.0` (MINOR — 기존 MUST를 완화하되 새 MUST NOT·MAY·MUST를
  더한다. BREAKING이 아닌 이유: "다섯 개 다 받기 금지"라는 핵심 제약이 유지되고,
  완화되는 것은 "최초 실행 시 기본 하나"라는 좁은 예외뿐).
- **로스터 절**의 `- 로스터는 켜고 끌 수 있다(MUST)` 다음 문장:
  - 기존: "사용자가 고른 캐릭터의 모델만 내려받는 구조여야 한다(MUST)."
  - 개정: "사용자가 고르지 않은 캐릭터의 모델은 내려받지 않는다(MUST NOT). 단, 앱은
    최소 하나의 캐릭터 없이 동작할 수 없으므로 최초 실행 시 기본 캐릭터 하나를
    자동으로 내려받는 것은 허용한다(MAY) — 사용자는 이후 설정에서 다른 캐릭터로
    바꾸거나 추가할 수 있어야 한다(MUST). '다섯 개를 다 받기'는 여전히 금지한다
    (MUST NOT)."
- **파일 상단 Amendment 블록**에 1.3.0 항목 추가(무엇이·왜·MINOR 근거, Governance
  "개정할 때는 무엇이 왜 바뀌었는지 기록한다").
- **하단 `**Version**: 1.2.0 | ... | **Last Amended**: 2026-08-23`** →
  `1.3.0 | ... | 2026-09-02`.

### Rationale

- Governance: "원칙을 어기려면 헌법을 먼저 고친다. 예외를 코드에 몰래 두지
  않는다(MUST NOT)." → 코드보다 먼저 커밋(FR-032, SC-007).
- `AGENTS.md`의 "지금도 유효한 실측 규칙"이나 다른 문서는 헌법을 요약하지 않으므로
  동기화 대상 아님. `roster.ts`·`acquisition.ts` 주석의 "사용자가 고른 캐릭터의
  모델만"은 코드 변경 시 함께 갱신(태스크에 포함).

### Alternatives considered

- **PATCH로**: 규범 조항(MUST)이 실제로 완화되므로 PATCH를 넘는다. 1.1.0이
  "MUST/MUST NOT 조항이 늘면 MINOR"로 정한 선례.
- **개정 없이 코드만**: Governance 정면 위반.

---

## §9. 테스트 전략

- **계약 테스트(기기 불필요, `test:logic`)**:
  - `resolve-generation.test.ts` — FR-007~012·014의 조합. 소스를 `readFileSync`로
    읽어 `new Date()` 미사용·신호 타입 미import 확인(007·012 관례).
  - `essential-assets.test.ts` — `ESSENTIAL_ASSET_KEYS` 상수·`ONBOARDING_DEFAULT_
    CHARACTER = "quiet"`·`essentialAssetsReady` 판정·합산 진행률. 소스에
    `models/roster` import 없음 확인.
  - `onboarding/decision.test.ts` — `shouldShowOnboarding(flag, ready)` AND 갈래.
  - `vision-setting-store.test.ts`·`geocoding-setting-store.test.ts` — "자동"
    상태 로드/세이브, 파일 없음 → "자동".
- **화면 테스트(`test:ui`)**: `DiaryHomeScreen`·`DiaryListScreen`에 위젯이 없음,
  "일기 쓰기" 1탭으로 생성 트리거, `OnboardingScreen` 에셋 단계 건너뛰기 불가.
- **위반 주입**(저장소 관례): 자동 판정에 사진 임계값 상수를 넣어 계약 테스트가
  잡는지 / `essential-assets.ts`에 `models/roster` import를 넣어
  `checkOnboardingFile`이 잡는지 / `resolve-generation.ts`에 `new Date()`를 넣어
  계약 테스트가 잡는지.
- **Maestro(실기기)**: 최초 실행 흐름(`pm clear` → 온보딩 → 에셋 다운로드 →
  첫 일기 1탭), 기존 사용자 흐름(홈 1탭), 설정 탭 세 섹션. 기존 흐름 중 위젯·
  "캐릭터" 탭을 참조하던 것 갱신(`generate-diary.yml`·`diary-character-select.yml`
  등 — 023이 이미 stale 고친 것들).
- **release 재확인**: 불필요(012 기준 — 새 네이티브 모듈·빌드 설정 없음).

---

## 열린 결정 — 전부 해소됨

| 항목 | 해소 |
|---|---|
| 자동 판정 위치 | §1 — `src/app/resolve-generation.ts` 순수 함수 |
| "마지막 캐릭터" 저장 | §2 — `selected-character.json` 재사용, 생성 성공 시 기록 |
| "자동" 상태 저장 | §3 — 기존 2파일에 센티넬/`mode` 필드 추가 |
| 필수 에셋 조립 | §4 — `essential-assets.ts`(순수) + `src/app/essential-assets-port.ts`(통로) |
| `checkOnboardingFile` 충돌 | §5 — 포트를 `src/app/`에 둠(로스터 접근 허용 자리) |
| 완료 게이트 AND | §6 — `shouldShowOnboarding(flag, ready)` |
| 홈 위젯 제거 범위 | §7 — props·렌더·state 제거, 컴포넌트는 설정 탭에서 재사용 |
| 헌법 개정 | §8 — v1.3.0 MINOR, 코드보다 먼저 |
| `checkOnboardingFile`/`checkSourceFile` 규칙 변경 필요? | 불필요 — §5의 배치로 회피. 단 태스크에서 위반 주입으로 재확인 |

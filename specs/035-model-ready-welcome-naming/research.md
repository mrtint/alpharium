# Research: 모델 준비 완료 연출 + 캐릭터 작명

**스펙**: [spec.md](./spec.md) | **날짜**: 2026-09-07

이 문서는 `/speckit-plan` Phase 0의 산출물이다. spec이 계획 단계로 넘긴 결정
(FR-020의 접두사-프리필 처리, 확인 상한 시간, 글자 수 상한, 이름 흐름 경로)을
**저장소의 실제 코드를 읽어** 확정한다.

---

## §1. 사용자 지정 이름이 흐르는 경로 — `personaOf()`의 6개 호출처

### 실측 (2026-09-07, `grep -rn "personaOf" src/ App.tsx`)

| 파일 | 줄 | 쓰는 것 |
|---|---|---|
| `src/diary/prompt.ts` | 145 | `name` — `nameLine()`의 호칭 줄 |
| `src/ui/CharacterListScreen.tsx` | 270-271 | `name`·`tagline` |
| `src/ui/CharacterPicker.tsx` | 78-79 | `name`·`tagline` |
| `src/ui/DiaryDetailScreen.tsx` | 146 | `name` |
| `src/ui/DiaryHomeScreen.tsx` | 298, 339-340 | `name` (생성 중 화면, 캐릭터 이동 안내) |
| `App.tsx` | 1162-1163 | `name`·`tagline` (`AuthorPicker` options 조립) |

`personaOf()`는 `Character` 하나만 받는 **순수 동기 함수**다. 사용자 지정 이름은
파일에서 읽어야 하므로(비동기) 이 시그니처에 그대로 얹을 수 없다.

### Decision: `persona.ts`는 손대지 않고, **이름 해석을 별도 순수 함수로 둔다**

```ts
// src/diary/persona.ts — 무변경. PERSONAS 상수·personaOf()가 기본값의 자리로 남는다.

// src/diary/character-name.ts (신규) — 순수 함수 하나
export type CustomNames = Partial<Record<Character, string>>;
export function displayNameOf(character: Character, custom: CustomNames): string;
```

`displayNameOf()`가 **FR-017이 요구한 단일 통과 지점**이다. 규칙은 한 곳뿐:
"`custom[character]`가 있으면 그것, 없으면 `personaOf(character).name`".

**Rationale**:
- `personaOf()`를 비동기로 바꾸면 6개 호출처와 `prompt.ts`가 전부 async로 전염되고,
  `buildPrompt()`가 **결정적 순수 함수**여야 한다는 005 계약 P6이 깨진다. 이것이
  가장 큰 제약이었다.
- 파일 읽기는 화면·조립부(`App.tsx`)가 이미 하는 일이다(007 `loadSelection`, 029
  `vision-setting-store`의 선례). 읽은 값을 **props로 흘려보내면** 화면은 여전히
  파일을 모르고 `prompt.ts`는 여전히 순수하다.
- `persona.ts`가 기본값 상수의 자리로 남는 것이 014 계약 P2("`roster.ts`를
  import하지 않는다")를 그대로 보존한다.

**Alternatives considered**:
- **`personaOf(character, custom?)`로 인자 추가**: 6개 호출처가 전부 `custom`을
  구해야 하고, 안 넘기면 조용히 기본 이름이 나온다 — "잊으면 조용히 틀리는" 결함
  (011 `has_media=0`, 013 URI 계약 불일치와 같은 계열)이라 배제.
- **모듈 전역 캐시에 이름을 담고 `personaOf()`가 읽기**: 시그니처는 유지되나
  `prompt.ts`가 암묵 전역 상태에 의존하게 되어 `buildPrompt()`의 결정성(P6)이
  테스트에서 재현 불가능해진다. 배제.

---

## §2. FR-020 — 접두사(`promptPrefix`)와 KV 캐시 프리필(`prewarm`)의 상호작용

### 실측 — 프리필이 실제로 도는 방식

`src/inference/llama-port.ts:165-183`:

```ts
async prewarm(character: Character): Promise<void> {
  if (context === null || openFor !== character) return;
  await context.completion({
    messages: [{ role: "user", content: promptPrefix(character) }],  // ← 여기
    jinja: true, ..., n_predict: 1,
  });
}
```

`src/inference/on-device.ts:335-342`의 `prepare()`가 `load()` → `prewarm()`을
부르고 **`unload()`하지 않는다**(E12) — 열린 네이티브 컨텍스트에 KV 캐시가 남아
뒤이은 `run()`이 재사용한다.

### 핵심 관측: **KV 캐시는 열린 컨텍스트에 종속되고, 캐시 키는 프롬프트 문자열 자체다**

`llama.cpp`의 프리필 재사용은 "이전에 넣은 토큰 열과 이번 프롬프트의 **공통
접두사**를 그대로 쓴다"는 방식이다. 즉:

- 접두사가 바뀌면 → 공통 부분까지만 재사용되고 나머지는 다시 계산된다.
  **틀린 글이 나오지 않는다.** 느려질 뿐이다.
- 018 계약 E10·FR-007이 이미 이것을 명시한다: "프리워밍 실패는 알릴 것이 없다 —
  다음 `run()`이 그냥 느릴 뿐 **틀리지 않는다**".

### Decision: **호칭 줄을 접두사에 그대로 둔다. 이름 변경 시 프리필 무효화도 두지 않는다.**

`prewarm()`과 `run()`이 **같은 `displayNameOf()` 결과를 보게 배선하는 것**으로
충분하다. 구체적으로:

1. `promptPrefix(character, customNames)` / `buildPrompt(request, vision)`이 모두
   같은 이름 값을 쓴다 (`fixedHead()` 한 배열에서 나오는 018 P9 구조 유지).
2. `llama-port.ts`의 `prewarm()`은 이름을 **인자로 받는다** — `promptPrefix()`를
   스스로 부르지 않고, 부르는 쪽(`on-device.ts`)이 만든 접두사 문자열을 받는다.

**Rationale**:
- **"이름이 바뀌면 프리필이 빗나간다"는 정확히 018이 이미 허용한 상태다.** 사용자가
  이름을 바꾸는 것은 드문 일이고, 바꾼 직후 한 번의 생성이 조금 느린 것이 전부다.
  무효화 로직을 새로 만들면 "언제 무효화하는가"를 판정하는 코드가 생기고, 그것을
  검증하려면 시간을 재야 한다 — **원칙 IV로 가는 길**이다.
- 호칭 줄을 접두사에서 빼는 대안은 **018 계약 P11(캐릭터별 접두사 유일성)을
  직접 깬다**: 이름과 언어가 접두사에 있어서 다섯 캐릭터의 접두사가 서로 달랐는데,
  이름을 빼면 `quiet`·`narrative`·`imaginative` 셋이 **전부 같은 접두사**가 된다
  (셋 다 한국어). 그러면 캐릭터를 바꿔도 이전 캐릭터의 캐시를 재사용하게 되어
  P11이 막으려던 바로 그 상황이 된다.
- `prewarm()`이 접두사 문자열을 인자로 받게 하면 **`llama-port.ts`가 `prompt.ts`를
  import하지 않게 되어** 경계가 오히려 깨끗해진다(현행은 포트가 프롬프트 모듈을
  직접 부른다).

**018 계약에 미치는 영향**: P8·P9·P10·P12는 그대로 유지된다. P11은 "캐릭터마다
접두사가 서로 다르다"에서 **"(캐릭터, 이름) 조합마다 접두사가 서로 다르다"**로
읽되, 기본 이름 상태에서는 기존 P11이 그대로 성립한다 — 계약 테스트는 기본
이름으로 P11을 계속 검사하고, 사용자 지정 이름이 접두사에 반영되는지는 별도
케이스로 잠근다.

**Alternatives considered**:
- **이름 변경 시 명시적 프리필 무효화**(캐시 버전 카운터 등): 무효화 시점 판정
  코드 + 상태 하나가 늘고, 얻는 것은 "이름 바꾼 직후 한 번의 생성이 덜 느림"뿐.
  비용 대비 이득이 없고 원칙 IV 경계에 접근한다. 배제.
- **호칭 줄을 접두사 밖(가변부)으로 이동**: 위 P11 위반. 배제.

---

## §3. 정상 동작 확인(liveness check)의 형태

### 실측 — 쓸 수 있는 계약

`src/inference/engine-port.ts`의 `GenerationEngine`:
- `load(character): Promise<LoadResult>` — `{ ok, warm }` 또는 `{ ok: false, reason }`
- `prewarm(character): Promise<void>` — **반환값 없음**(E6·FR-007). 성공/실패 판정 불가
- `run(prompt, limits): Promise<RunResult>` — `{ text, ending }`
- `unload(): Promise<void>`

### Decision: **`load()` + `run(LIVENESS_INPUT, { timeoutMs })`로 판정하고, 응답 텍스트는 즉시 버린다**

판정 규칙(순수 함수로 분리):

```ts
// src/welcome/liveness.ts — 순수 함수, 기기에 안 닿는다
export const LIVENESS_INPUT = "안녕?";   // FR-003a 고정 상수
export type LivenessOutcome = "ok" | "failed";
export function judgeLiveness(input: {
  loaded: boolean;
  text: string;
  ending: Ending;
}): LivenessOutcome;
```

- `loaded === false` → `failed`
- `text.trim() === ""` → `failed` (응답이 오지 않았다)
- `ending.kind === "timeout"` → `failed`
- 그 외 → `ok`

**`text`의 내용은 보지 않는다** — 길이·언어·품질을 재지 않고 **비었는가만** 본다.
판정 후 `text`는 어디에도 저장되지 않는다(FR-004a).

**Rationale**:
- `prewarm()`은 반환값이 없어 성공/실패를 알 수 없다(E6). FR-003이 "응답이
  오는가를 판정"하라고 요구하므로 `prewarm()`만으로는 불가능하다.
- `run()`은 이미 있는 계약이고 `RunResult`가 `{ text, ending }`뿐이라 **경계를
  넓히지 않는다**(FR-028). 소요 시간·토큰 수를 담을 자리가 애초에 없다.
- 005의 `judge()`(4갈래)와 **다른 함수**다 — 일기 판정 갈래를 늘리지 않는다
  (005 FR-018b). `judgeLiveness()`는 2갈래이고 일기 텍스트를 판정하지 않는다.

**Alternatives considered**:
- **`prewarm()`으로 갈음**: 성공/실패를 알 수 없어 FR-006(실패 시 환영 화면 미표시)을
  구현할 수 없다. 배제.
- **`prewarm()` 시그니처를 `Promise<boolean>`으로 변경**: 018 계약 E6("반환값이
  없다 — 알 수 있게 하면 얼마나 걸렸나를 담고 싶어진다")을 정면으로 깬다. 배제.
- **`judge()` 재사용**: 일기 판정 갈래를 확인 경로에 끌어들이면 "안녕?"의 응답이
  `echo`/`language`로 거부될 수 있고, 그것은 모델이 죽었다는 뜻이 아니다. 배제.

### 상한 시간 (FR-010)

**Decision: `LIVENESS_TIMEOUT_MS = 60_000` (60초).**

**Rationale** (실측 근거):
- `GENERATION_TIMEOUT_MS = 180_000`은 **일기 한 편**(수백 토큰)의 한도다.
- 024 §1 실측: `quiet` 콜드 `writingMs` 54.1초, 웜 37.6초 — 이것은 **일기 전체**
  생성 시간이다. `n_predict`를 짧게 준 "안녕?" 응답은 이보다 훨씬 짧다.
- 019 §9 실측: 헤드리스 `quiet` 콜드 `writingMs` 158.5초(포그라운드의 ~3배).
  이 확인은 **포그라운드 전용**(진입 게이트)이므로 그 배수가 적용되지 않는다.
- 60초는 콜드 로드 + 짧은 응답에 충분하고, 실패 시 사용자를 1분 넘게 붙잡지
  않는다. `GENERATION_TIMEOUT_MS`의 1/3.
- **`engine.load()` 시간은 이 한도에 포함하지 않는다** — 023이 확인한
  `runWithTimeout()`의 관례(모델 적재 시간을 재지 않고 `engine.run()` 구간만
  잰다)를 그대로 따른다.

**미확인으로 남기는 것**: 이 값이 실기기에서 충분한지는 US1 검증에서 관측한다.
`narrative`(exaone)는 024 T034가 헤드리스 완주 불가를 확정했으나, 이 확인의
대상은 **기본 캐릭터 `quiet`뿐**(FR-002a)이므로 해당하지 않는다.

---

## §4. 작명 UI 제약 (FR-013 글자 수 상한)

**Decision: `NAME_MAX_LENGTH = 12` (자바스크립트 문자열 길이 기준).**

**Rationale**:
- 현행 기본 이름: 금동이(3), 루이(2), 오드(2), 샤오바이(4), 모카(2) — 전부 2~4자.
- `AuthorPicker`의 행은 이름 + tagline이 한 줄에 들어가는 구조다(034에서 확인).
  12자를 넘으면 `DiaryHomeScreen:339`의 "○○을(를) 쓸 수 없어 ○○(으)로 옮겼다"
  같은 조합 문구가 두 줄로 넘칠 위험이 있다.
- 12자는 한글 이름으로 넉넉하고("우리집똑똑이" 6자), 레이아웃을 지킨다.
- **사람이 정한 상수**다(012 `USER_VISIBLE_SIGNAL_AXES`, 021
  `PERMISSION_REQUIREMENTS`, 023 `BUCKET_COUNT` 선례) — 코드가 화면 폭을 재서
  정하지 않는다(원칙 V).

검증 규칙(순수 함수):

```ts
// src/welcome/naming.ts
export const NAME_MAX_LENGTH = 12;
export type NameValidation = { ok: true; value: string } | { ok: false; reason: "empty" | "too-long" };
export function validateCharacterName(raw: string): NameValidation;
```

- `raw.trim()`이 빈 문자열 → `{ ok: false, reason: "empty" }` (FR-012)
- `raw.trim().length > 12` → `{ ok: false, reason: "too-long" }` (FR-013)
- 그 외 → `{ ok: true, value: raw.trim() }` (FR-016 앞뒤 공백 제거)

**모델 식별자 필터링 없음**(FR-021 확정) — 이 함수는 `Character`도 로스터도
import하지 않는다. 계약 테스트가 소스를 읽어 확인한다.

---

## §5. 이름 스냅샷의 저장 자리 (FR-026a·b·c)

### 실측 — `DiaryEntry`의 옵셔널 필드 선례

`src/diary/types.ts:91-133`이 이미 네 개의 옵셔널 필드를 후속 스펙에서 차례로
더했다: `title?`(014), `photos?`(017), `timing?`(017), `placeName?`(017).

`src/diary/store.ts:54`의 `serializeEntry()`는 `JSON.stringify(entry)` 하나다 —
**새 옵셔널 필드가 자동으로 직렬화된다.** `reviveDates()`는 `Date` 필드만
복원하므로 문자열 필드는 손댈 것이 없다.

`src/diary/pipeline.ts:312-322`가 조립 자리이며, 조건부 스프레드
(`...(title !== undefined ? { title } : {})`) 패턴이 확립돼 있다.

### Decision: `DiaryEntry.authorName?: string` 추가

```ts
// src/diary/types.ts
/** 생성 시점의 작성자 표시 이름 (035 FR-026a). 옵셔널 — 옛 일기에는 없다. */
authorName?: string;
```

`pipeline.ts`가 조립 시 `displayNameOf(character, customNames)`의 결과를 담는다.
파이프라인은 이름을 **주입받는다**(`PipelineInput`에 옵셔널 필드 추가) — 018이
`seen?`을 같은 방식으로 더한 선례를 따른다.

**표시 규칙**(FR-026b 폴백):

```
entry.authorName ?? displayNameOf(entry.character, customNames)
```

**Rationale**:
- 저장 스키마 변경이 **필드 하나 추가**로 끝난다. 마이그레이션 코드 없음
  (FR-026b가 소급 생성을 금지).
- `serializeEntry`/`deserializeEntry` 무변경 — 옛 파일에 키가 없으면 `undefined`로
  읽히고 폴백이 작동한다.
- 문자열 하나뿐이라 모델 식별자·이력·변경 시각이 들어갈 자리가 없다(FR-026c,
  원칙 III·IV의 "자리가 없으면 담을 수 없다" 방어 — `RunResult`와 같은 구조).

---

## §6. 저장 자리 — 사용자 지정 이름과 환영 연출 플래그

### 실측 — `preferences/` 선례

| 파일 | 스펙 | 내용 |
|---|---|---|
| `preferences/selected-character.json` | 007 | `{ character }` |
| `preferences/vision-setting.json` | 029 | 시각 설정 |
| `preferences/auto-diary.json` | 020 | 자동 생성 설정 |
| `onboarding.json` | 021 | `{ completed, batteryNoticeShown }` |

`src/app/selection-store.ts:80-81`이 `DIRECTORY = "preferences"`,
`SELECTION_FILE = "selected-character.json"`을 두고, 지연 import
(`await import("expo-file-system")`) + 임시 파일 쓰고 옮기기 패턴을 쓴다.

### Decision: 파일 둘

1. **`preferences/character-names.json`** — `{ names: { quiet: "복실이", ... } }`
   - 캐릭터별 사용자 지정 이름. 없는 캐릭터는 키 자체가 없다.
   - 읽기 실패·깨진 파일·로스터 밖 키 → **그 항목은 없는 것으로**(007 선례,
     원칙 V "지어내지 않는다"). 앱을 죽이지 않는다.
2. **환영 연출 완료 플래그는 `onboarding.json`에 필드 추가** —
   `{ completed, batteryNoticeShown, welcomeShown? }`

**Rationale (2번)**:
- 021의 `onboarding.json`이 이미 "최초 실행 흐름의 진행 상태"를 담는 파일이고,
  환영 연출은 **그 흐름의 마지막 단계**다(온보딩 → 에셋 → 환영 → 홈).
- 파일을 새로 만들면 진입 게이트가 파일 세 개(온보딩 플래그, 에셋 준비, 환영
  플래그)를 각각 읽어야 하고, `App.tsx`의 게이트 로직이 한 겹 더 복잡해진다.
- 021 `flag.ts`가 이미 옵셔널 필드 추가·시드 패턴을 갖고 있다
  (`batteryNoticeShown`을 구형 `auto-diary.json`에서 시드한 선례).
- `welcomeShown`이 없는 기존 사용자는 `undefined` → 연출을 한 번 본다. 이미
  모델을 갖고 잘 쓰던 사용자에게 환영 화면이 한 번 뜨는 것은 해가 없고, 오히려
  작명 기회를 준다(로드맵 19번의 의도에 부합).

**Alternatives considered**:
- **별도 `welcome.json`**: 게이트가 읽을 파일이 늘고 얻는 것이 없다. 배제.
- **이름과 플래그를 한 파일에**: 이름은 설정 탭에서 수시로 바뀌고 플래그는 한 번
  쓰이고 안 바뀐다. 성격이 달라 같이 두면 이름 저장 실패가 게이트를 흔들 수 있다.
  배제.

---

## §7. 진입 게이트 — `shouldShowOnboarding` 다음 자리

### 실측

`App.tsx:371-381`:

```ts
if (shouldShowOnboarding(onboardingFlag, essentialsReady) || forceOnboarding) {
  return <OnboardingScreen ... />;
}
```

`src/onboarding/decision.ts:53-56`의 `shouldShowOnboarding(flag, essentialAssetsReady)`
는 순수 함수이며 021·029가 이 자리를 두 번 확장했다(DR1·DR2·DR3).

### Decision: **순수 함수 하나를 더해 게이트를 3단으로**

```ts
// src/welcome/decision.ts (신규) — 순수 함수
export function shouldShowWelcome(input: {
  onboardingNeeded: boolean;   // shouldShowOnboarding()의 결과
  essentialAssetsReady: boolean;
  welcomeShown: boolean;
}): boolean;
```

규칙: `onboardingNeeded === false && essentialAssetsReady === true &&
welcomeShown === false` → `true`.

`App.tsx`의 게이트:

```
1. shouldShowOnboarding(...)  → OnboardingScreen
2. shouldShowWelcome(...)     → WelcomeScreen      ← 신규
3. 그 외                       → 탭 UI (홈)
```

**Rationale**:
- 021·029가 확립한 "진입 게이트 판정은 순수 함수로 뗀다" 관례를 그대로 잇는다.
- `onboardingNeeded`를 인자로 받아 **순서 의존을 명시**한다 — 온보딩이 필요한
  상태에서는 환영을 절대 띄우지 않는다는 것이 타입에 드러난다.
- FR-002a("게이트 밖 트리거 금지")가 이 함수 하나로 강제된다. 설정 탭에는
  환영 연출을 띄우는 경로가 아예 없다.

---

## §8. 새 경계 `src/welcome/` — 헌법 검사 규칙

### 실측 — 선례

`scripts/constitution-rules.ts`에 이미 축별 검사가 있다:
`checkVisionFile`(011), `checkScheduleFile`(020), `checkOnboardingFile`(021),
`checkSegmentedFile`(026), `checkPhotoPortFile`(023).

### Decision: `checkWelcomeFile` 추가

`src/welcome/`가 다음에 닿지 못하게 막는다:

| 금지 | 이유 |
|---|---|
| `models/roster`·`ModelAsset`·자산 키 | 원칙 III — 연출·작명 계층이 모델을 알면 안 된다 |
| `diary/prompt` | 확인용 입력이 일기 프롬프트 통과 지점을 부르지 않는다(FR-003b) |
| `diary/acceptance`(`judge`) | 일기 판정 4갈래를 확인 경로에 끌어들이지 않는다 |
| `diary/store` | 연출 품질을 일기 저장소로 재지 않는다(011 `checkVisionFile` 선례) |
| `Date`·`timings`·`tokens`·`ms` 토큰 | 원칙 IV — 확인 결과에 시간·지표가 섞이지 않는다 |

그리고 **역방향**: `src/diary/prompt.ts`가 `welcome/`의 `LIVENESS_INPUT`을
참조하지 못하게 막는다(FR-003b의 "서로를 모른다").

**위반 주입으로 검증한다**(007~034 전체의 관례): 각 규칙마다 실제로 어겨 보고
검사가 잡는지 확인한다.

---

## §9. 화면 계층 — `src/ui/`가 받는 것

`checkSourceFile`의 기존 규칙 `UI_TOUCHES_MODEL`(`src/ui/` → `models/roster` 차단)과
022의 `UI_TOUCHES_PROMPT`(`src/ui/` → `diary/prompt` 차단)가 이미 있다.

**Decision**: 새 화면 둘(`WelcomeScreen`, 작명 입력)은 **문자열과 콜백만 받는다**.

- 환영·대기·실패 문구: 사람이 쓴 고정 상수. 캐릭터별로 다르지 않다(spec Assumptions).
- 캐릭터 이름: `displayNameOf()` 결과 문자열 하나.
- 확인 상태: `"checking" | "ok" | "failed"` 갈래 하나. **텍스트를 담지 않는다**.
- 콜백: `onSubmitName(name)`, `onSkip()`, `onRetry()`.

`src/ui/`가 `welcome/liveness`를 import하지 않아도 되도록 상태 갈래만 넘긴다 —
`AuthorPicker`가 `AuthorOption`(name·tagline·ready·selected)만 받는 034의 구조와
같다.

---

## §10. 요약 — 계획 단계에서 확정된 값

| 항목 | 값 | 근거 |
|---|---|---|
| 이름 해석 | `displayNameOf(character, custom)` 순수 함수 (신규 `src/diary/character-name.ts`) | §1 — `buildPrompt()` 결정성(P6) 보존 |
| FR-020 접두사 처리 | **호칭 줄 유지 + 무효화 없음.** `prewarm()`이 접두사를 인자로 받는다 | §2 — P11 보존, 018 E10이 이미 허용 |
| 확인 방식 | `load()` + `run(LIVENESS_INPUT)` + `judgeLiveness()` 2갈래 | §3 — `prewarm()`은 반환값이 없어 불가 |
| 확인 상한 | `LIVENESS_TIMEOUT_MS = 60_000` | §3 — 024 실측 54초 대비 여유, 180초의 1/3 |
| 이름 글자 수 상한 | `NAME_MAX_LENGTH = 12` | §4 — 현행 이름 2~4자, 레이아웃 보존 |
| 이름 스냅샷 | `DiaryEntry.authorName?: string` | §5 — `title?` 등 네 선례, 직렬화 무변경 |
| 이름 저장 | `preferences/character-names.json` | §6 — 007·029 선례 |
| 연출 플래그 | `onboarding.json`의 `welcomeShown?` | §6 — 021 흐름의 마지막 단계 |
| 게이트 | `shouldShowWelcome()` 순수 함수, 3단 | §7 — 021·029 관례 |
| 헌법 검사 | `checkWelcomeFile` 신규 + 역방향 차단 | §8 |

**NEEDS CLARIFICATION 잔여: 없음.**

# Data Model: 모델 준비 완료 연출 + 캐릭터 작명

**스펙**: [spec.md](./spec.md) | **연구**: [research.md](./research.md)

이 기능이 더하는 데이터는 **문자열 셋과 불리언 하나**뿐이다. 새 저장 계층을
만들지 않고, 기존 세 자리(`preferences/`, `onboarding.json`, `DiaryEntry`)에
얹는다.

---

## §1. 사용자 지정 캐릭터 이름 — `preferences/character-names.json`

### 모양

```ts
// src/welcome/names-port.ts
export type CustomNames = Partial<Record<Character, string>>;
```

파일 내용:

```json
{ "names": { "quiet": "복실이", "narrative": "이야기꾼" } }
```

- **키가 없는 캐릭터는 사용자 지정 이름이 없다** — `null`이나 `""`로 채우지
  않는다(원칙 V: 모르는 것을 기본값으로 채우지 않는다).
- 값은 **검증을 통과한 문자열**이다(`validateCharacterName()` 결과). 앞뒤 공백이
  제거돼 있고, 1자 이상 `NAME_MAX_LENGTH`(12)자 이하다.

### 읽기 규칙 (007 `loadSelection` 선례)

`loadCustomNames(port): Promise<CustomNames>` — **어떤 실패에서도 예외를 던지지
않고 부분적으로 살린다**:

| 상황 | 결과 |
|---|---|
| 파일 없음 | `{}` |
| JSON 파싱 실패 | `{}` |
| `names`가 객체가 아님 | `{}` |
| 로스터 밖 키(`"foo": "x"`) | **그 키만 버리고 나머지는 살린다** |
| 값이 문자열이 아님 | 그 키만 버린다 |
| 값이 빈 문자열·공백만 | 그 키만 버린다 (저장돼선 안 되지만 방어) |
| 값이 상한 초과 | 그 키만 버린다 |

**부분 복구가 007과 다른 점**: `selected-character.json`은 값이 하나라 "깨지면
없는 것"으로 충분했다. 여기는 캐릭터 다섯 개의 이름이 한 파일에 있으므로, 하나가
깨졌다고 나머지 넷을 버리면 사용자가 지은 이름을 이유 없이 잃는다.

### 쓰기 규칙

`saveCustomNames(port, names): Promise<void>` — 007과 같은 **임시 파일에 쓰고
옮기기**(`.writing` 접미사). 쓰다가 앱이 죽어도 반쯤 쓰인 파일이 제자리에 남지
않는다.

### 담지 않는 것 (MUST NOT)

모델 식별자·자산 키·파일 경로·바이트 수·이름 변경 시각·이름 이력. **자리가 없으면
담을 수 없다** — `RunResult`가 둘뿐인 것과 같은 방어(007 `saveSelection`이
`{ character }` 하나만 담은 것과 같은 판단).

---

## §2. 환영 연출 완료 플래그 — `onboarding.json`의 필드 추가

### 현행 (021)

```ts
// src/onboarding/flag.ts
export type OnboardingFlag = {
  completed?: boolean;
  batteryNoticeShown?: boolean;
};
```

### 추가

```ts
export type OnboardingFlag = {
  completed?: boolean;
  batteryNoticeShown?: boolean;
  /** 035 — 환영 연출을 통과했는가. 없으면(옛 사용자) 한 번 본다. */
  welcomeShown?: boolean;
};
```

- **옵셔널이며 기본값은 "안 봤다"** — 필드가 없는 기존 사용자는 연출을 한 번
  본다. 이미 모델을 갖고 잘 쓰던 사용자에게 환영 화면이 한 번 뜨는 것은 해가
  없고, 오히려 작명 기회를 준다(로드맵 19번 의도).
- **진행 중 상태는 담지 않는다**(FR-009) — "확인 중", "작명 입력 중" 같은 값이
  들어갈 자리가 없다. 연출 도중 앱이 죽으면 다음 진입에서 처음부터 다시 한다.
- 021의 `flag.ts`가 이미 옵셔널 필드 추가 패턴(`batteryNoticeShown` 시드)을
  갖고 있어 파싱·직렬화 확장이 기계적이다.

### 상태 전이

```
welcomeShown 없음/false ──[사용자가 환영 화면 통과]──> true
                          (이름 지음 / 건너뜀 / 실패 후 건너뜀 — 셋 다 true)
                                                        │
                                                        ▼
                                                   되돌아가지 않는다
```

**실패(FR-006) 후 "다시 시도"는 플래그를 쓰지 않는다** — 아직 통과하지 않았으므로
`false` 그대로다. "건너뛰기"를 눌러야 `true`가 된다.

---

## §3. 일기의 작성자 이름 스냅샷 — `DiaryEntry.authorName?`

### 현행 (`src/diary/types.ts:91-133`)

`DiaryEntry`는 이미 옵셔널 필드 넷을 후속 스펙에서 더했다: `title?`(014),
`photos?`(017), `timing?`(017), `placeName?`(017).

### 추가

```ts
export type DiaryEntry = {
  date: DayDate;
  text: string;
  title?: string;
  character: Character;
  /**
   * 생성 시점의 작성자 표시 이름 (035 FR-026a).
   *
   * **생성 시점의 사실이며 이후 갱신되지 않는다.** 사용자가 이름을 바꿔도
   * 이미 저장된 일기의 이 값은 그대로다 — 그때 그 이름으로 쓴 것이 사실이다.
   *
   * **옵셔널이며 옛 일기에는 없다.** 없으면 현재 이름 규칙으로 폴백한다
   * (FR-026b). 소급 생성하지 않는다 — 그 시점 이름은 관측된 적이 없다(원칙 V).
   */
  authorName?: string;
  signalsUsed: DaySignals;
  createdAt: Date;
  photos?: { photoId: string; takenAt: Date; resizedPath: string }[];
  timing?: { visionMs?: number; writingMs: number };
  placeName?: { kind: "known"; value: string } | { kind: "unknown" };
};
```

### 직렬화 — **무변경**

`src/diary/store.ts:54`의 `serializeEntry()`는 `JSON.stringify(entry)` 하나이므로
새 문자열 필드가 자동으로 담긴다. `reviveDates()`는 `Date` 필드만 복원하므로
손댈 것이 없다.

옛 파일에 키가 없으면 `JSON.parse` 결과에서 `undefined`이고, 폴백이 작동한다.
**마이그레이션 코드를 만들지 않는다**(FR-026b).

### 조립 자리 (`src/diary/pipeline.ts:312-322`)

```ts
const entry: DiaryEntry = {
  date: input.day,
  text: body,
  ...(title !== undefined ? { title } : {}),
  character: request.request.character,
  ...(input.authorName !== undefined ? { authorName: input.authorName } : {}),  // ★ 추가
  signalsUsed: signals,
  createdAt: input.now,
  ...
};
```

`PipelineInput`에 `authorName?: string`을 더해 **주입받는다** — 018이 `seen?`을
같은 방식으로 더한 선례. 파이프라인이 파일을 읽지 않는다.

### 표시 규칙 (FR-026b)

```
표시 이름 = entry.authorName ?? displayNameOf(entry.character, customNames)
```

이 폴백은 **화면이 아니라 조립부**에서 계산해 문자열로 넘긴다 — 화면이 두 값을
받아 스스로 고르면 폴백 로직이 화면마다 흩어진다(FR-017 위반).

---

## §4. 정상 동작 확인 결과 — 영속하지 않는 세션 상태

```ts
// src/welcome/liveness.ts
export type LivenessOutcome = "ok" | "failed";
```

화면이 받는 갈래(조립부가 만든다):

```ts
type WelcomePhase = "checking" | "welcome" | "failed";
```

- **파일에 저장하지 않는다**(FR-009). 앱을 다시 켜면 다시 확인한다.
- **텍스트를 담지 않는다**(FR-004a·FR-006). `"failed"`에 `reason: string`을
  더하지 않는다 — 더하면 모델 오류 메시지가 새고, 그 안에 파일 경로·자산 키가
  들어 있다(003 `readiness.ts`의 `REASON` 상수가 같은 이유로 사람이 쓴 고정
  문구만 쓴다).
- **시간·토큰을 담지 않는다**(원칙 IV). 갈래 이름 두 개가 전부다.

---

## §5. 엔티티 관계 요약

```
┌─────────────────────────────┐
│ onboarding.json             │   진입 게이트가 읽는다
│  completed?                 │   ──> shouldShowOnboarding()
│  batteryNoticeShown?        │
│  welcomeShown?         ★035 │   ──> shouldShowWelcome()
└─────────────────────────────┘

┌─────────────────────────────┐
│ preferences/                │   조립부가 읽어 문자열로 흘린다
│   character-names.json ★035 │
│   { names: { quiet: "..." }}│──┐
└─────────────────────────────┘  │
                                  ▼
                    displayNameOf(character, custom)     ← FR-017 단일 통과 지점
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        ▼                         ▼                          ▼
   화면 표시 문자열        prompt.ts nameLine()      pipeline authorName
   (목록·상세·설정·진단)    "너는 '복실이'라 불린다"    (생성 시점 스냅샷)
                                  │                          │
                                  ▼                          ▼
                          promptPrefix(character, name)  ┌──────────────┐
                                  │                       │ DiaryEntry   │
                                  ▼                       │  authorName? │
                          prewarm(character, prefix)      └──────────────┘
                                                          저장 후 불변
```

**폴백 사슬**: `entry.authorName` → `custom[character]` → `PERSONAS[character].name`.
빈 문자열이 어느 단계에서도 나오지 않는다(SC-005).

---

## §6. 이 기능이 만들지 않는 것

| 안 만드는 것 | 이유 |
|---|---|
| 이름 변경 이력·시각 | 원칙 IV — 비교·추적의 씨앗 |
| 옛 일기 스냅샷 마이그레이션 | 원칙 V — 관측된 적 없는 값을 지어내지 않는다(FR-026b) |
| 확인 결과 영속·진단 노출 | 원칙 IV — 여러 실행 비교로 이어진다 |
| 캐릭터별 환영 문구 | spec Assumptions — 캐릭터 무관 고정 문구 |
| 이름 중복 검사 | 이름은 호칭이지 식별자가 아니다(spec Edge Cases) |
| 모델 식별자 필터 목록 | FR-021 — 필터가 로스터를 알아야 해서 원칙 III 경계가 오염된다 |

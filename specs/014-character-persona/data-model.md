# Data Model: 캐릭터 페르소나

## Persona (신규, `src/diary/persona.ts`)

```ts
export type Persona = {
  name: string;      // 사람이 지은 이름. 예: "금동이"
  tagline: string;    // 한 줄 소개. 예: "군더더기 없이 담백하게 적어요"
};

const PERSONAS: Readonly<Record<Character, Persona>> = { ... };

export function personaOf(character: Character): Persona;
```

**불변식**:
- `Character` 다섯 값 전부에 항목이 있다 — `CHARACTERS.every(c => PERSONAS[c] !== undefined)`가
  테스트로 못 박힌다(누락되면 화면에서 그 캐릭터만 조용히 빈 이름이 뜨는 조용한 실패를
  막는다).
- `ModelAsset`을 import하지 않는다 — 헌법 검사가 아니라 이 파일 자체의 구조가 그렇다
  (`roster.ts`를 import하지 않으므로 애초에 접근 경로가 없다).
- `name`·`tagline` 둘 다 빈 문자열이 아니다.

## Title (신규, `src/diary/title.ts`)

```ts
export type TitleExtraction = {
  title?: string;
  body: string;
};

export function extractTitle(text: string): TitleExtraction;
```

**불변식**:
- 입력 `text`가 통째로 사라지지 않는다 — `title`이 있든 없든 `body`는 원문의 의미
  있는 내용을 전부 담는다(제목으로 채택된 첫 줄과 그 뒤의 빈 줄만 제거된다).
- 시간·신뢰도·파싱 방식 등 지표 필드가 없다(원칙 IV) — `{ title?, body }` 둘뿐이다.
- **예외를 던지지 않는다** — 어떤 입력에도 값을 반환한다(005의 `judge()`, 011의
  `resizePhoto()`가 세운 "경계 함수는 계약을 지키되 예외로 호출자를 놀라게 하지
  않는다" 관례를 따른다).
- 순수 함수다 — 같은 입력에 항상 같은 출력.

**판정 규칙** (research.md R2):
1. `text`를 첫 빈 줄(`\n\s*\n`)에서 앞/뒤로 나눈다.
2. 앞부분이 정확히 한 줄이고 40자 이하이면 → 그것을 `title`, 나머지를 `body`.
3. 그렇지 않으면(빈 줄이 없거나, 앞부분이 여러 줄이거나, 40자 초과) → `title`은
   `undefined`, `body`는 원문 그대로.

## DiaryEntry (수정, `src/diary/types.ts`)

```ts
export type DiaryEntry = {
  date: DayDate;
  text: string;        // 변경 없음 — 본문만 담는다(제목 분리 후의 body)
  title?: string;       // 신규, 옵셔널
  character: Character;
  signalsUsed: DaySignals;
  createdAt: Date;
};
```

**불변식** (기존 유지 + 추가):
1. 모델 식별자를 담지 않는다(변경 없음).
2. 추론 속도·품질 지표를 담지 않는다(변경 없음).
3. 실패는 `DiaryEntry`가 되지 않는다(변경 없음).
4. **`title`이 있으면 그것은 판정을 통과한 `text` 전체에서 사후 분리된 것이지, 별도로
   생성되거나 검증되지 않는다**(신규 — FR-007).
5. 기존(이 기능 이전) 파일에는 `title` 필드가 JSON에 없다 — `title: undefined`로
   읽힌다. 마이그레이션 코드를 두지 않는다(FR-010).

## DiaryListItem (수정, `src/diary/store.ts`)

```ts
export type DiaryListItem = {
  day: DayDate;
  readable: boolean;
  photos: PhotoHint;
  title?: string;   // 신규
};
```

`titleOf(entry: DiaryEntry): string | undefined`가 `photoHintOf()`와 같은 자리·같은
패턴으로 추가된다 — `listDiaries()`가 이미 전체를 역직렬화하므로 추가 읽기가 없다
(006·007이 세운 관례).

## DiagnosticReport (수정, `src/diagnostics/types.ts`)

```ts
export type DiagnosticReport = {
  environment: EnvironmentResolution;
  inferenceLocation: LocationSelection;
  moduleStatus: ModuleStatus;
  storage: StorageCheck;
  characterModels: Readonly<Record<Character, string>>;  // 신규
  failures: Failure[];
};
```

**불변식**: 이 필드는 진단 전용이며 `DiagnosticsScreen`이 배포 빌드에서 노출되지
않는 것과 동일한 보장(001 SC-013)을 그대로 물려받는다 — 이 필드만을 위한 별도 게이트가
필요 없다.

## roster.ts 추가 (수정, `src/models/roster.ts`)

```ts
export function displayName(character: Character): string;
```

**불변식**: 화면(`src/ui/`)에서 import될 수 없다(007 헌법 검사가 `roster.ts`로부터의
모든 import를 막으므로, 이 함수 하나만 예외로 허용하는 별도 규칙을 두지 않는다 —
`diagnostics/report.ts`를 통해서만 화면에 도달한다).

## SPEAKER_RULES 확장 (수정, `src/diary/prompt.ts`)

기존 상수 배열에 두 가지가 추가된다:

1. **이름 한 줄**: `buildPrompt()`가 `personaOf(character).name`을 읽어 "너는
   ${name}이라 불린다."류의 한 줄을 프롬프트에 삽입한다. **성격 서술이 아니라
   호칭 정보 하나뿐이다**(FR-015).
2. **짐작 어미 지시**: research.md R3의 새 규칙 한 줄. 기존 `SPEAKER_RULES`
   배열의 마지막에 추가되며, `instructionLines()`가 그대로 되뱉기 판정에 사용한다
   (기존 메커니즘 재사용, 새 매개변수 없음).

**불변식**: 이 두 줄 다 캐릭터별로 값이 다를 수 있는 것(이름)과 모든 캐릭터에
공통인 것(짐작 어미 지시)이 섞이지만, 어느 쪽도 "성격"(상상력이 풍부하다 등)을
지시하지 않는다 — `LANGUAGE`처럼 캐릭터에서 오는 것은 이름·언어뿐이라는 기존
불변식(FR-014a, 005 계약)이 유지된다.

# Phase 1 Data Model: 개발자 탭 내 입력 프롬프트 모니터링

새 저장 스키마 없음(휘발성). 아래는 타입 추가/확장.

## 1. `SignalPreset` — 신호 프리셋 (신규, `src/diagnostics/prompt-preview.ts`)

사람이 상수로 못 박은 대표 신호 조합.

```
type SignalPreset = {
  id: string;              // 안정적 식별자. 화면·테스트가 이걸로 참조 (예: "empty", "photos")
  label: string;           // 화면에 보일 한국어 이름 (예: "신호 없음", "사진 있음")
  signals: DaySignals;     // src/signals/types.ts의 DaySignals. buildRequest에 그대로 들어감
};

const SIGNAL_PRESETS: readonly SignalPreset[];
```

**규칙**:
- `readonly` 배열. 런타임에 바뀌지 않는다. 계약 테스트가 소스를 `readFileSync`로 읽어
  `readonly`·최소 2개·`id` 유일성을 검사한다.
- `signals.date`는 고정 문자열 상수(`PREVIEW_DATE = "2026-01-15"` 등). 미리보기는 날짜
  자체를 검증 대상으로 삼지 않는다.
- **코드가 신호 값을 보고 프리셋을 만들지 않는다**(원칙 V). 배열 리터럴로 직접 쓴다.
- 최소 구성:

| id | label | photos | places | steps/battery/connectivity |
|---|---|---|---|---|
| `empty` | 신호 없음 | `{ kind: "none" }` | `{ kind: "none" }` | 전부 `{ kind: "unknown", reason: "..." }` |
| `photos` | 사진 있음 | `known`: 2장(다른 시각), `complete: true` | `known`: `visitCount 2`, 거리, `photosWithLocation 2`, `photosConsidered 2`, `source "photo-exif"` | 전부 `unknown` |

## 2. `PromptPreview` — 미리보기 하나의 결과 (신규, `src/diagnostics/types.ts`)

```
type PromptPreview =
  | { ok: true; text: string; approxChars: number }
  | { ok: false; reason: string };
```

- `text`: `buildPrompt(request)`의 출력 그대로. 잘리지 않는다.
- `approxChars`: `text.length`. **조립 시점 근사치이며 실측 토큰 수가 아니다** — 화면이
  라벨로 그 사실을 붙인다(FR-011).
- `{ ok: false }`: `buildRequest()`가 `no-character`를 반환한 경우(실사용에서는 `character`를
  항상 채워 부르므로 발생하지 않으나 계약상 갈래를 남긴다 — 003·017 관례).

## 3. `PromptPreviewSet` — 한 캐릭터의 모든 프리셋 (신규, `src/diagnostics/types.ts`)

```
type PromptPreviewSet = Readonly<Record<string, PromptPreview>>;
// key = SignalPreset.id
```

## 4. `DiagnosticReport` 확장 (`src/diagnostics/types.ts`)

```
export type DiagnosticReport = {
  environment: EnvironmentResolution;
  inferenceLocation: LocationSelection;
  moduleStatus: ModuleStatus;
  storage: StorageCheck;
  characterModels: Readonly<Record<Character, string>>;   // 014
  promptPreviews: Readonly<Record<Character, PromptPreviewSet>>;  // ★ 이 기능
  failures: Failure[];
};
```

- `characterModels` 바로 옆에 둔다. 같은 성격(local·dev 전용 진단 정보, 화면은 문자열만
  받음). 원칙 III·IV 주석을 `types.ts` 파일 상단에 한 줄 보강.

## 5. `collectPromptPreviews()` (신규, `src/diagnostics/prompt-preview.ts`)

```
function buildPreview(character: Character, preset: SignalPreset): PromptPreview;
// buildRequest(preset.signals, character, "none", preset.signals.date, PREVIEW_NOW)
//   → ok=false 이면 { ok:false, reason }
//   → ok=true 이면 buildPrompt(request) → { ok:true, text, approxChars: text.length }

function collectPromptPreviews(): Readonly<Record<Character, PromptPreviewSet>>;
// CHARACTERS.map(c => [c, Object.fromEntries(SIGNAL_PRESETS.map(p => [p.id, buildPreview(c, p)]))])
```

- `PREVIEW_NOW`: 고정 `Date` 상수. `buildRequest`의 `now`는 `dayStillOpen` 계산에만 쓰이며,
  `PREVIEW_DATE`가 과거로 고정이라 `dayStillOpen: false`로 결정된다(오늘이 아님). 미리보기가
  "아직 안 끝난 하루" 문장을 보이려면 별도 프리셋이 필요하나 이번 스코프 아님.
- `vision` 인자는 넘기지 않는다(VLM 미실행, research.md R1).
- **`llama.rn`·`initLlama`·`completion`을 부르지 않는다.** 순수 문자열 조립뿐.

## 6. `collectReport()` 수정 (`src/diagnostics/report.ts`)

`collectCharacterModels()`를 부르는 두 자리(early return + 정상 return) 각각에
`promptPreviews: collectPromptPreviews()`를 추가. 다른 로직 불변.

## 7. 헌법 검사 규칙 추가 (`scripts/constitution-rules.ts`)

```
const UI_TOUCHES_PROMPT  = /\bfrom\s+["'][^"']*diary\/prompt["']/;
const UI_TOUCHES_SIGNALS = /\bfrom\s+["'][^"']*signals\/(?:types|collect|fake)["']/;
```

`checkSourceFile()`에서 `normalized.startsWith("src/ui/")`일 때 위 두 정규식에 걸리면 위반:
- rule: `"화면이 프롬프트 조립/신호 타입에 닿는다 — 진단 리포트의 문자열만 받아야 한다 (022 FR-008, 원칙 II·III)"`

`signals/expo-port`는 **제외** — `DiagnosticsScreen.tsx`가 `PermissionPanel`용으로 이미
정당하게 import 중.

## 상태 전이

없음. 모든 값이 `collectReport()` 호출마다 새로 조립되는 순수 파생값.

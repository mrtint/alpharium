# Contract: `src/app/resolve-generation.ts` — 생성 파라미터 자동 판정

**순수 함수.** 파일·`Date`·난수·기기에 닿지 않는다. 007 `selection.ts` 선례.

관련 요구사항: FR-007, FR-008, FR-008a, FR-009, FR-010, FR-011, FR-012, FR-014.

---

## 시그니처

```ts
import type { Character, VisionSetting } from "../diary/types";
import type { DayDate } from "../config/day-boundary";
import { resolveSelection } from "./selection";

export type ResolveInput = {
  /** selected-character.json 로드값. 로스터 밖·파일 없음이면 null (FR-008) */
  lastCharacter: Character | null;
  /** 사람이 못 박은 고정값 "quiet" (FR-018). 호출자가 essential-assets.ts에서 가져와 넘김 */
  onboardingDefault: Character;
  /** 003 readiness가 ready/verified인 캐릭터들 (FR-014) */
  readyCharacters: readonly Character[];
  /** 설정 탭 "일기 작성자" 고정. 없으면 null (FR-012) */
  fixedAuthor: Character | null;
  /** 홈 날짜 셀렉트의 재판정된 값 (FR-009). 재판정은 호출 전에 009가 함 */
  chosenDay: DayDate;
  /** 그 날 사진 신호가 1장 이상인가 (FR-010). 호출자가 신호에서 계산 */
  photoSignalPresent: boolean;
  /** 위치 런타임 권한이 부여됐는가 (FR-011) */
  locationPermission: boolean;
  /** 설정 탭 "사진 보기" (FR-012·024) */
  visionPreference: "auto" | VisionSetting;
  /** 설정 탭 "장소명" (FR-012·025) */
  geocodingPreference: "auto" | "on" | "off";
};

export type ResolvedParams = {
  character: Character;
  day: DayDate;
  vision: VisionSetting;
  geocodingEnabled: boolean;
  /** 캐릭터가 준비 잃어 옮겨졌으면 (FR-014). 화면이 알린다 */
  movedFrom?: Character;
};

export type ResolveOutcome =
  | { kind: "resolved"; params: ResolvedParams }
  | { kind: "no-ready-character" };

export function resolveGenerationParams(input: ResolveInput): ResolveOutcome;
```

---

## 규칙 (R = rule, 계약 테스트가 각각을 직접 검증)

### R1 — 캐릭터: 고정값 우선

- `fixedAuthor !== null && readyCharacters.includes(fixedAuthor)` →
  `character = fixedAuthor`, `movedFrom` 없음.

### R2 — 캐릭터: 고정값 없음/미준비 → 마지막 → 온보딩 기본, 007 폴백

- 후보 `c = fixedAuthor ?? lastCharacter ?? onboardingDefault`.
- `resolveSelection(c, readyCharacters)` 적용:
  - `{ kind: "selected", character, movedFrom? }` → 그대로 `ResolvedParams`에 매핑.
  - `{ kind: "none" }` → `{ kind: "no-ready-character" }` (FR-014 마지막 갈래).
- **주의**: `resolveSelection`은 `stored === null`이면 `{kind:"none"}`을 준다.
  여기서는 `c`가 절대 `null`이 아니다(`onboardingDefault`가 항상 있음) — 그러나
  `c`가 준비 안 됐고 `readyCharacters`가 비었으면 `resolveSelection`의
  `moveTo === undefined` 갈래로 `{kind:"none"}` → `no-ready-character`.

### R3 — 캐릭터: fixedAuthor가 미준비면 lastCharacter로 폴백

- `fixedAuthor !== null && !readyCharacters.includes(fixedAuthor)`:
  후보를 `lastCharacter ?? onboardingDefault`로 바꿔 R2 적용.
  `movedFrom`은 `resolveSelection`이 낸 값(원래 후보 기준).

### R4 — day: 그대로 통과

- `day = input.chosenDay`. 이 함수는 하루를 재계산하지 않는다(009 W1·W2).

### R5 — vision: 고정값 우선, 자동은 사진 유무

- `visionPreference !== "auto"` → `vision = visionPreference`.
- `visionPreference === "auto"` → `vision = photoSignalPresent ? "quick" : "none"`.
- **임계값 없음** (FR-010, 원칙 V) — `photoSignalPresent`는 boolean 하나.

### R6 — geocodingEnabled: 3-상태

- `"on"` → `true`; `"off"` → `false`; `"auto"` → `locationPermission`.

### R7 — 소스 불변식 (계약 테스트가 `readFileSync`로 확인)

- `resolve-generation.ts`에 `new Date(` 문자열 없음.
- `from "../signals/` import 없음 (신호 타입 미의존).
- `from "../models/` import 없음 (로스터 미의존).
- `from "../diary/prompt"` import 없음 (프롬프트 조립 미의존, 원칙 II).

---

## 계약 테스트 표 (`__tests__/app/resolve-generation.test.ts`)

| # | lastChar | fixedAuthor | ready | photoPresent | locPerm | visionPref | geoPref | 기대 |
|---|---|---|---|---|---|---|---|---|
| C1 | narrative | null | [narrative,quiet] | — | — | auto | auto | character=narrative |
| C2 | null | null | [quiet] | — | — | auto | auto | character=quiet (onboardingDefault) |
| C3 | quiet | imaginative | [quiet,imaginative] | — | — | auto | auto | character=imaginative (R1) |
| C4 | narrative | null | [quiet] | — | — | auto | auto | character=quiet, movedFrom=narrative (R2) |
| C5 | narrative | null | [] | — | — | auto | auto | kind="no-ready-character" |
| C6 | quiet | imaginative | [quiet] (imaginative 미준비) | — | — | auto | auto | character=quiet (R3, fixedAuthor 폴백) |
| C7 | quiet | null | [quiet] | true | — | auto | — | vision="quick" (R5) |
| C8 | quiet | null | [quiet] | false | — | auto | — | vision="none" (R5) |
| C9 | quiet | null | [quiet] | true | — | none | — | vision="none" (고정값 우선) |
| C10 | quiet | null | [quiet] | false | — | detailed | — | vision="detailed" |
| C11 | quiet | null | [quiet] | — | false | auto | auto | geocodingEnabled=false (R6) |
| C12 | quiet | null | [quiet] | — | true | auto | auto | geocodingEnabled=true |
| C13 | quiet | null | [quiet] | — | false | auto | on | geocodingEnabled=true (고정 on) |
| C14 | quiet | null | [quiet] | — | true | auto | off | geocodingEnabled=false (고정 off) |
| C15 | quiet | null | [quiet] | — | — | auto | auto | day === input.chosenDay (R4) |

---

## 위반 주입 (방어 확인)

| 주입 | 잡히는 곳 |
|---|---|
| `photoSignalPresent` 대신 `photoCount >= 2` 임계값 상수 도입 | 계약 테스트 R5(C7 `photoCount=1` 케이스 추가), 소스 검사 R7 |
| `new Date()`로 오늘 계산 | 계약 테스트 R7 (소스 문자열) |
| `import { assetFor } from "../models/roster"` | 계약 테스트 R7 + `checkSourceFile`(src/app/는 UI_TOUCHES_MODEL 대상 아님 — 그래도 R7이 잡음) |
| `resolveSelection` 대신 자체 폴백 로직 | 계약 테스트 C4·C6 (movedFrom 전파 깨짐) |

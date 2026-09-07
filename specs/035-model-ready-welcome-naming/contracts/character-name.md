# Contract: 사용자 지정 캐릭터 이름

FR-011~FR-021, FR-024~FR-026c의 계약이다. 018의 `prompt-prefix.md`(P8~P12)와
직접 맞물린다 — 이름이 접두사에 들어가므로 그 계약의 해석이 여기서 확장된다.

## 계약 시그니처

```ts
// src/diary/character-name.ts (신규)
export type CustomNames = Partial<Record<Character, string>>;
export function displayNameOf(character: Character, custom: CustomNames): string;

// src/welcome/naming.ts (신규)
export const NAME_MAX_LENGTH = 12;
export type NameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "too-long" };
export function validateCharacterName(raw: string): NameValidation;

// src/welcome/names-port.ts (신규)
export interface CharacterNamesPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}
export function loadCustomNames(port: CharacterNamesPort): Promise<CustomNames>;
export function saveCustomNames(port: CharacterNamesPort, names: CustomNames): Promise<void>;
export function expoCharacterNamesPort(): CharacterNamesPort;
```

## 불변식

**N1. `displayNameOf()`가 표시 이름의 유일한 통과 지점이다** (FR-017).
규칙은 한 곳뿐: `custom[character]`가 있으면 그것, 없으면
`personaOf(character).name`. 화면·프롬프트·파이프라인 어디에도 자체 폴백
로직(`?? PERSONAS[...]`, `|| "금동이"` 등)을 두지 않는다.

**N2. `displayNameOf()`는 순수 함수다.** `Character`와 `CustomNames`만 받고,
파일·시각·난수를 읽지 않는다. 그래야 `buildPrompt()`가 결정적으로 남는다
(005 P6, 018 P12).

**N3. `displayNameOf()`는 절대 빈 문자열을 반환하지 않는다** (SC-005).
`custom[character]`가 빈 문자열이거나 공백만이면 **없는 것으로 보고** 기본
이름으로 폴백한다 — 저장 단계에서 막지만(N5) 읽기 단계에서도 방어한다.

**N4. `persona.ts`는 이 기능에서 수정되지 않는다.** `PERSONAS` 상수와
`personaOf()`가 기본값의 자리로 그대로 남는다 — 014 계약 P2(`roster.ts`를
import하지 않는다)·P3(실측 근거를 코드에 남긴다)·P4(tagline은 프롬프트에 안
들어간다)가 전부 보존된다.

**N5. `validateCharacterName()`은 검사를 둘만 한다** (FR-012·FR-013·FR-021).
빈 문자열/공백만(`empty`)과 길이 초과(`too-long`). **세 번째 갈래를 만들지
않는다** — 금칙어·패턴·모델 식별자 필터를 더하는 순간 이 함수가 로스터나
식별자 목록을 알아야 하고, 그것이 원칙 III 경계의 오염이다.

**N6. `validateCharacterName()`은 `Character`도 로스터도 import하지 않는다**
(FR-021). 이 함수는 문자열 하나를 받아 문자열 하나를 검사할 뿐 캐릭터를 모른다.
계약 테스트가 소스를 `readFileSync`로 읽어 확인한다.

**N7. 저장되는 이름은 앞뒤 공백이 제거돼 있다** (FR-016).
`validateCharacterName()`이 `{ ok: true, value }`로 돌려주는 `value`가
`raw.trim()`이며, 저장은 이 값만 쓴다. 원본 `raw`를 저장하지 않는다.

**N8. `loadCustomNames()`는 예외를 던지지 않고 부분적으로 살린다**
(data-model §1). 파일 없음·JSON 깨짐·`names`가 객체 아님 → `{}`. 개별 키가
로스터 밖이거나 값이 문자열이 아니거나 검증을 통과 못 하면 **그 키만 버리고
나머지는 살린다.** 하나가 깨졌다고 사용자가 지은 나머지 이름을 잃지 않는다.

**N9. 저장 파일은 이름 말고 아무것도 담지 않는다** (FR-026c 연장).
모델 식별자·자산 키·경로·바이트·변경 시각·이력이 들어갈 자리가 없다.
007 `saveSelection`이 `{ character }` 하나만 담은 것과 같은 방어.

**N10. `DiaryEntry.authorName`은 옵셔널 문자열 하나다** (FR-026a·c).
객체(`{ name, changedAt }`)도 배열(이력)도 아니다. 있으면 그 일기가 생성될 때의
표시 이름이고, 없으면 옛 일기다.

**N11. 저장된 `authorName`은 갱신되지 않는다** (FR-026). 사용자가 이름을 바꿔도
이미 저장된 일기의 이 값을 다시 쓰는 코드가 없어야 한다. 이름 변경 경로가
`DiaryStore.save()`를 부르지 않는다.

**N12. 옛 일기의 `authorName`을 소급 생성하지 않는다** (FR-026b, 원칙 V).
마이그레이션 함수·백필 스크립트를 만들지 않는다. 없으면 현재 이름으로 폴백할
뿐이다.

**N13. 폴백은 조립부에서 계산해 문자열로 화면에 넘긴다** (FR-017).
`entry.authorName ?? displayNameOf(entry.character, custom)`을 화면이 직접
계산하지 않는다 — 화면이 두 값을 받아 스스로 고르면 폴백이 화면마다 흩어진다.

## 018 계약(P8~P12)과의 상호작용

**N14. `promptPrefix()`와 `buildPrompt()`가 같은 이름 값을 본다** (FR-020,
018 P8·P9). 이름이 `fixedHead()`의 `nameLine()`에 들어가므로 접두사에 포함된다.
둘이 같은 배열(`fixedHead()`)에서 나오는 018 P9 구조가 유지되면 P8("`buildPrompt()`의
결과는 언제나 `promptPrefix(...)`로 시작한다")도 자동으로 유지된다.

**N15. 018 P10(접두사에 날마다 바뀌는 것이 없다)은 그대로다.** 이름은 날마다
바뀌지 않는다 — 사용자가 바꿀 때만 바뀌며, 그것은 "날마다"가 아니다.

**N16. 018 P11(캐릭터별 접두사 유일성)의 해석이 확장된다.**
기존: "다섯 캐릭터의 접두사가 서로 다르다".
확장: "**(캐릭터, 표시 이름) 조합**마다 접두사가 다르다".
- 기본 이름 상태에서는 기존 P11이 그대로 성립한다(다섯 이름이 서로 다르므로).
- **호칭 줄을 접두사에서 빼는 것은 금지다** — 빼면 `quiet`·`narrative`·
  `imaginative` 셋이 전부 같은 접두사가 되어(셋 다 한국어) P11이 막으려던
  상황이 정확히 발생한다.

**N17. 이름 변경 시 프리필 무효화 로직을 만들지 않는다** (FR-020, research §2).
이름이 바뀌면 접두사가 바뀌고 KV 캐시가 부분적으로만 재사용된다 — **느려질 뿐
틀리지 않는다.** 이것은 018 계약 E10·FR-007이 이미 명시적으로 허용한 상태다
("프리워밍 실패는 알릴 것이 없다 — 다음 `run()`이 그냥 느릴 뿐 틀리지 않는다").
무효화 판정 코드를 넣으면 "언제 무효화하는가"를 검증하려고 시간을 재게 되고,
그것이 원칙 IV로 가는 길이다.

**N18. `llama-port.ts`는 `prompt.ts`를 import하지 않는다** (research §2).
`prewarm()`이 접두사 문자열을 **인자로 받는다**. 현행은 포트가
`promptPrefix(character)`를 직접 부르는데, 이름이 인자가 되면서 포트가 이름까지
알아야 하는 문제가 생긴다 — 접두사를 통째로 받으면 포트는 문자열 하나만 알면
된다. 경계가 오히려 깨끗해진다.

## 테스트로 확인해야 하는 것

`__tests__/diary/character-name.test.ts`:
- N1: `displayNameOf`가 `custom`에 값이 있으면 그것, 없으면 `PERSONAS`의 이름
- N3: `custom[c]`가 `""`·`"   "`이면 기본 이름으로 폴백 (빈 문자열 반환 0건)
- N2: 같은 인자로 여러 번 불러도 같은 값 (순수성)
- 다섯 캐릭터 전부에 대해 기본 이름이 `PERSONAS`와 일치

`__tests__/welcome/naming.test.ts`:
- N5: 반환 갈래가 정확히 3개(`ok:true` / `empty` / `too-long`) — **개수를 직접
  센다**(005 `acceptance.ts`가 4갈래를 세는 것과 같은 방어)
- N7: `"  복실이  "` → `{ ok: true, value: "복실이" }`
- 경계: 12자 통과, 13자 `too-long`, `""`·`"   "` `empty`
- **N6: 소스를 `readFileSync`로 읽어** `Character`·`CHARACTERS`·`roster`·
  `PERSONAS` 문자열이 `naming.ts`에 없는지 확인
- FR-021: `"kanana"`·`"exaone-3.5"`가 `{ ok: true }`로 통과하는지

`__tests__/welcome/names-store.test.ts`:
- N8: 깨진 JSON → `{}`, 로스터 밖 키 하나 + 정상 키 하나 → 정상 키만 살아남음
- N8: 빈 문자열 값·상한 초과 값이 섞이면 그 키만 버려짐
- N9: 저장된 JSON에 `character`·`asset`·`path`·`bytes`·`at` 키가 없는지

`__tests__/diary/prompt.test.ts` (기존 확장):
- N14/018 P8: 모든 캐릭터 × 사용자 지정 이름 있음/없음 조합에서
  `buildPrompt(...).startsWith(promptPrefix(...))`
- N16/018 P11: 기본 이름 상태에서 다섯 접두사가 서로 다름 (기존 테스트 유지)
- N16 확장: 같은 캐릭터라도 이름이 다르면 접두사가 다름
- 018 P10: 접두사에 날짜 형식·"에 네가 본 것"·"사진"이 없음 (기존 유지)
- FR-019: 접두사·프롬프트 어디에도 `tagline` 문구가 없음 (014 P4 유지)

`__tests__/diary/pipeline.test.ts` (기존 확장):
- N10: `authorName`이 주입되면 저장된 엔트리에 담김
- N10: 주입되지 않으면 키 자체가 없음(`undefined`가 아니라 키 부재)
- N11: 이름 변경 경로가 `store.save()`를 부르지 않음 (소스 읽기로 확인)

## 위반 주입 (방어 검증)

| 주입 | 잡아야 하는 것 |
|---|---|
| `displayNameOf`가 `custom[c] ?? ""` 반환 | N3 테스트 FAIL |
| `naming.ts`에 `import { CHARACTERS }` 추가 | N6 소스 검사 FAIL |
| `validateCharacterName`에 금칙어 갈래 추가 | N5 갈래 개수 테스트 FAIL |
| 호칭 줄을 `fixedHead()`에서 제거 | 018 P11 테스트 FAIL (한국어 셋이 같아짐) |
| `loadCustomNames`가 키 하나 깨지면 `{}` 반환 | N8 부분 복구 테스트 FAIL |
| `pipeline`이 `authorName`을 항상 담음(undefined도) | N10 키 부재 테스트 FAIL |

/**
 * 캐릭터 → 지금 이 캐릭터를 뭐라 부르는가.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/character-name.md N1~N4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **표시 이름의 유일한 통과 지점이다**(N1, FR-017).
 *
 * 014의 `persona.ts`가 캐릭터→**기본** 이름의 통과 지점이라면, 여기는 그 위에
 * 사용자가 지은 이름을 얹는 자리다. 규칙은 한 곳뿐이다 — **사용자 지정 이름이
 * 있으면 그것, 없으면 `personaOf().name`**. 화면·프롬프트·파이프라인 어디에도
 * 자체 폴백(`?? PERSONAS[...]`, `|| "금동이"`)을 두지 않는다.
 *
 * **왜 `personaOf()`를 고치지 않고 함수를 하나 더 두는가**: 사용자 지정 이름은
 * 파일에서 읽어야 하므로(비동기) `personaOf(character)`의 동기 시그니처에 그대로
 * 얹을 수 없다. 비동기로 바꾸면 6개 호출처와 `prompt.ts`가 전부 async로 전염되고,
 * **`buildPrompt()`가 결정적 순수 함수여야 한다는 005 계약 P6이 깨진다.**
 * 그래서 파일 읽기는 조립부(`App.tsx`)가 하고, 읽은 값을 이 함수에 넘긴다.
 *
 * **헌법 1.4.0이 이것을 허용한다**(원칙 III 「씨앗과 페르소나」) — 이름은 호칭이지
 * 씨앗의 서술이 아니므로 씨앗과 어긋날 수 없다. 말투·소개(`tagline`)·성격 지시는
 * 여전히 코드 안 고정이며 사용자가 바꿀 수 없다.
 *
 * **`roster.ts`도 `ModelAsset`도 import하지 않는다**(N4, 원칙 III) — `persona.ts`가
 * 그 경로를 애초에 열지 않으므로 이 파일이 그것을 거쳐도 모델 자산에 이를 수 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { personaOf } from "./persona";
import type { Character, CustomNames } from "./types";

/**
 * 사용자가 지은 이름들. **타입은 `types.ts`에 있다**(`DiaryRequest`가 쓰므로
 * 여기 두면 순환 import가 된다). 해석은 아래 `displayNameOf()` 하나뿐이다.
 */
export type { CustomNames };

/**
 * 지금 이 캐릭터를 뭐라 부르는가 (N1).
 *
 * **순수 함수다**(N2) — 파일·시각·난수를 읽지 않는다.
 *
 * **절대 빈 문자열을 반환하지 않는다**(N3, SC-005). 저장 단계
 * (`validateCharacterName`)가 빈 이름을 막지만, 읽기 단계에서도 방어한다 —
 * 파일이 손으로 편집됐거나 옛 버전이 남긴 값일 수 있다.
 */
export function displayNameOf(character: Character, custom: CustomNames): string {
  const chosen = custom[character]?.trim();
  // 빈 문자열·공백만은 「없는 것」이다 — 이름이 아니다.
  return chosen !== undefined && chosen !== "" ? chosen : personaOf(character).name;
}

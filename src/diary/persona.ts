/**
 * 캐릭터 → 이름·한 줄 소개.
 *
 * 계약: specs/014-character-persona/contracts/persona.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 캐릭터 내부 식별자와 사용자가 보는 이름 사이의 유일한 통과 지점이다.**
 *
 * 003의 `roster.ts`가 캐릭터→모델 파일의 유일한 통과 지점이듯, 여기는 캐릭터→
 * 사람이 읽는 이름의 유일한 통과 지점이다. 화면(`CharacterListScreen`·
 * `CharacterPicker`)과 프롬프트(`prompt.ts`)가 전부 이 파일 하나를 통해 이름을
 * 얻는다.
 *
 * **`roster.ts`도 `ModelAsset`도 import하지 않는다**(계약 P2, 원칙 III). 007이
 * `src/ui/`의 `roster.ts` 직접 접근을 헌법 검사로 막았는데, 이 파일이 애초에 그
 * 경로를 열지 않으므로 화면이 이 파일을 거쳐도 모델 자산에 이를 수 없다 —
 * 조심해서 안 쓰는 것이 아니라 쓸 수 없다.
 *
 * **소개는 실측 근거를 코드에 남긴다**(계약 P3). 이 값들은 새로 지은 것이 아니라
 * `docs/roadmap/README.md`가 005~012의 실기기 관측을 사람 말로 옮겨 이미 확정해
 * 둔 것을 그대로 옮긴다.
 *
 * **소개는 프롬프트에 들어가지 않는다**(계약 P4). `prompt.ts`가 이 파일에서
 * 가져가는 것은 `name`뿐이다 — `tagline`은 사용자에게 보이는 문구이지 모델에게
 * 주는 지시문이 아니다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Character } from "./types";

export type Persona = {
  name: string;
  tagline: string;
};

/**
 * 다섯 캐릭터의 이름·한 줄 소개.
 *
 * 로드맵 문서(`docs/roadmap/README.md` 「캐릭터 페르소나」 「페르소나 (확정)」)가
 * 이미 사람이 정한 값이다. 이 파일은 그 값을 코드로 옮길 뿐 새로 짓지 않는다.
 */
const PERSONAS: Readonly<Record<Character, Persona>> = {
  // 금동이(quiet, kanana-1.5-2.1b) — 짧고 정확하다, 한국어가 가장 깨끗하다
  // (006 실측: 지어낸 것 0건. 007 실측: 같은 캐릭터가 알람·침대·이메일을
  // 단언한 적도 있다 — 로드맵 「「담백하다」를 「정확하다」로 읽지 않는다」).
  quiet: { name: "금동이", tagline: "군더더기 없이 담백하게 적어요" },
  // 루이(narrative, exaone-3.5-2.4b) — 길게 쓰고 감정을 얹어 서사를 만든다,
  // 가장 느리다(007 실측: 콜드 242초, 웜 26초 — 금동이의 100배).
  narrative: { name: "루이", tagline: "하루를 이야기처럼 풀어내요" },
  // 오드(imaginative, hyperclovax-seed-1.5b) — 상상을 많이 섞는다. 헌법
  // 로스터가 이 성질의 고지를 MUST로 요구한다 — CharacterPicker의
  // IMAGINATIVE_NOTICE가 그 고지를 별도로 유지한다. tagline은 그 고지와
  // 겹치지 않도록 「사실보다 느낌」 쪽(헌법 로스터 원문)을 다른 말로 옮긴다.
  imaginative: { name: "오드", tagline: "느낌으로 하루를 그려요" },
  // 샤오바이(chinese, qwen3-1.7b) — 중국어로 시적이고 짧게 쓴다.
  chinese: { name: "샤오바이", tagline: "짧은 글에 여운을 담아요" },
  // 모카(english, gemma3-1b) — 영어로 차분한 관찰체로 길게 쓴다.
  english: { name: "모카", tagline: "차분한 눈으로 오래 바라봐요" },
};

/** 캐릭터의 페르소나를 찾는다. */
export function personaOf(character: Character): Persona {
  return PERSONAS[character];
}

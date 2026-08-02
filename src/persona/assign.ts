/**
 * T008a — 퍼소나 최초 부여 (001 FR-002, 002 FR-140)
 *
 * 퍼소나가 없는 상태에서 **앱이** 이름과 성격 식별자를 부여한다. 사용자가 고르는 것이
 * 아니다. 이름 **변경**은 US3 범위이므로 여기 넣지 않는다.
 */
import { TRAIT_CATALOG } from "./catalog";
import { createPersona, type Persona } from "./persona";

/**
 * 부여 후보 이름. 휴대폰이 스스로를 부르는 이름이므로 사람 이름을 쓰지 않는다
 * (헌법 원칙 0 — 화자는 휴대폰이다).
 */
const NAME_POOL: readonly string[] = Object.freeze([
  "네모",
  "손바닥",
  "주머니",
  "여섯시",
  "깜빡이",
  "얇은귀",
  "밝기",
  "진동",
]);

const pick = <T>(pool: readonly T[]): T => pool[Math.floor(Math.random() * pool.length)];

export function assignPersona(): Persona {
  return createPersona({ name: pick(NAME_POOL), traitId: pick(TRAIT_CATALOG).id });
}

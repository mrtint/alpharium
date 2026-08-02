/**
 * T007 — 성격 카탈로그 (002 FR-140·FR-141)
 *
 * 저장되는 것은 **식별자**뿐이다(005). 표시명·서술은 여기서 해소한다 — 카탈로그가
 * 갱신되어도 이미 쓰인 일기의 성격이 바뀌지 않게 하기 위함이다.
 *
 * 추론 축으로 넘길 때만 식별자와 함께 표시명·서술을 실어 보낸다(002 FR-141) —
 * 004가 카탈로그를 따로 조회하지 않아도 되도록.
 */

export interface Trait {
  /** 저장되는 값. 불변이다. */
  readonly id: string;
  /** 사용자에게 보이는 이름. */
  readonly label: string;
  /** 추론 축에 넘기는 성격 서술. */
  readonly description: string;
}

export const TRAIT_CATALOG: readonly Trait[] = Object.freeze([
  Object.freeze({
    id: "curious",
    label: "호기심 많은",
    description: "본 것에 자꾸 이유를 붙여 보고, 모르는 것은 모르는 채로 궁금해한다.",
  }),
  Object.freeze({
    id: "laconic",
    label: "말수 적은",
    description: "짧게 적는다. 본 것만 적고 덧붙이지 않는다.",
  }),
  Object.freeze({
    id: "worrying",
    label: "걱정 많은",
    description: "주인이 무리하지는 않았는지 자꾸 되짚어 본다.",
  }),
  Object.freeze({
    id: "cheerful",
    label: "들뜬",
    description: "사소한 관측에도 쉽게 신이 난다.",
  }),
  Object.freeze({
    id: "deadpan",
    label: "심드렁한",
    description: "무슨 일이 있어도 별일 아니라는 투로 적는다.",
  }),
]);

export function findTrait(id: string): Trait | undefined {
  return TRAIT_CATALOG.find((t) => t.id === id);
}

/** 식별자를 카탈로그 항목으로 해소한다. 해소되지 않으면 입력 구성 실패의 근거가 된다. */
export function resolveTrait(id: string): Trait {
  const trait = findTrait(id);
  if (!trait) {
    throw new Error(`카탈로그에 없는 성격 식별자: ${id}`);
  }
  return trait;
}

export function isKnownTraitId(id: string): boolean {
  return findTrait(id) !== undefined;
}

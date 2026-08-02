/**
 * T008 — 퍼소나 엔티티 (001 FR-005·FR-006, 002 FR-140, 005 FR-404)
 *
 * 보유하는 것은 **이름과 성격 식별자 둘뿐**이다.
 *
 * 두지 않는 것: 기기 식별자(001 FR-005, 005 FR-404), 관측 환경(001 FR-006),
 * 이름 변경 이력(002 FR-142), 누적 경험. 담을 자리를 만들지 않는 것이 구조적 보장이다.
 */
import { isKnownTraitId } from "./catalog";

export const PERSONA_NAME_MIN_LENGTH = 1;
export const PERSONA_NAME_MAX_LENGTH = 20;

export interface Persona {
  /** 1~20자. 사용자 변경 가능하나 변경 자체는 US3 범위다. */
  readonly name: string;
  /** 카탈로그 항목의 식별자. 부여 후 변하지 않는다 (001 FR-004a). */
  readonly traitId: string;
}

export function createPersona(input: { name: string; traitId: string }): Persona {
  const name = input.name;
  if (name.length < PERSONA_NAME_MIN_LENGTH || name.length > PERSONA_NAME_MAX_LENGTH) {
    throw new Error(
      `퍼소나 이름은 ${PERSONA_NAME_MIN_LENGTH}~${PERSONA_NAME_MAX_LENGTH}자여야 한다: ${name.length}자`,
    );
  }
  if (!isKnownTraitId(input.traitId)) {
    throw new Error(`카탈로그에 없는 성격 식별자: ${input.traitId}`);
  }
  return { name, traitId: input.traitId };
}

/** 저장·전송된 값이 퍼소나의 형태인지 확인한다. 목록 밖의 항목이 있으면 거부한다. */
export function isPersona(value: unknown): value is Persona {
  if (typeof value !== "object" || value === null) return false;
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== "name" || keys[1] !== "traitId") return false;
  const { name, traitId } = value as Record<string, unknown>;
  return typeof name === "string" && typeof traitId === "string";
}

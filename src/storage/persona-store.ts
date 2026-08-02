/**
 * T008b — 퍼소나 저장·조회 (001 FR-005·FR-007, 005 FR-404)
 *
 * - 기기 식별자에 종속시키지 않는다. 키에도 값에도 기기 식별자가 관여하지 않으므로,
 *   저장된 내용만 옮기면 새 기기에서 같은 이름·성격이 이어진다 (001 SC-005).
 * - 동시에 **하나만** 활성으로 유지한다 (001 FR-007) — 키가 하나뿐인 것이 그 보장이다.
 * - 관측 환경·이름 변경 이력을 담을 자리를 두지 않는다 (001 FR-006, 002 FR-142).
 */
import { isPersona, type Persona } from "../persona/persona";
import type { KeyValueStore } from "./kv";

/** 기기 식별자가 섞이지 않는 고정 키. 활성 퍼소나는 이 자리 하나뿐이다. */
export const ACTIVE_PERSONA_KEY = "alpharium/persona/active";

export class PersonaStore {
  constructor(private readonly kv: KeyValueStore) {}

  async saveActive(persona: Persona): Promise<void> {
    // 이름·성격 식별자 둘만 직렬화한다 — 넘어온 객체를 그대로 쓰지 않는다.
    const payload = JSON.stringify({ name: persona.name, traitId: persona.traitId });
    await this.kv.setMany([[ACTIVE_PERSONA_KEY, payload]]);
  }

  async loadActive(): Promise<Persona | null> {
    const raw = await this.kv.get(ACTIVE_PERSONA_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isPersona(parsed)) {
      throw new Error("저장된 퍼소나의 형태가 계약과 다르다");
    }
    return parsed;
  }

  /** 활성 퍼소나의 수. 계약상 0 또는 1이다 (001 FR-007). */
  async countActive(): Promise<number> {
    const keys = await this.kv.keys();
    return keys.filter((k) => k === ACTIVE_PERSONA_KEY).length;
  }

  /** 전수 조사용 — 저장된 원문 그대로를 돌려준다 (quickstart 시나리오 5). */
  async dumpRaw(): Promise<Record<string, string>> {
    const keys = await this.kv.keys();
    const out: Record<string, string> = {};
    for (const key of keys) {
      const value = await this.kv.get(key);
      if (value !== null) out[key] = value;
    }
    return out;
  }
}

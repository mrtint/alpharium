/**
 * 저장 매체 경계 (research.md 결정 4)
 *
 * 005 FR-406이 매체 선택을 구현 단계에 넘겼다. 여기서 고정하는 것은 **묶음 하나를
 * 단일 쓰기 단위로 다룰 수 있어야 한다**는 조건(005 FR-411)뿐이며, 인덱스 설계·쿼리
 * 최적화는 ROADMAP이 「파기 신호」로 지목한 자리이므로 들어가지 않는다.
 */

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  /** 여러 키를 한 번에 쓴다. 하나라도 실패하면 전체가 실패한다 (005 FR-411). */
  setMany(entries: readonly (readonly [string, string])[]): Promise<void>;
  removeMany(keys: readonly string[]): Promise<void>;
  keys(): Promise<readonly string[]>;
}

/** 테스트와 기본 구현이 공유하는 메모리 저장소. */
export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly map: Map<string, string>;
  /** 쓰기 실패를 강제하기 위한 자리 — 시나리오 6의 저장 실패 재현에 쓴다. */
  failNextWrite = false;
  /** setMany 도중 몇 번째 항목에서 중단할지. 원자성 검사에 쓴다. */
  interruptWriteAfter: number | null = null;

  constructor(initial?: ReadonlyMap<string, string>) {
    this.map = new Map(initial ?? []);
  }

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async setMany(entries: readonly (readonly [string, string])[]): Promise<void> {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("저장 실패");
    }
    if (this.interruptWriteAfter !== null) {
      const stopAt = this.interruptWriteAfter;
      this.interruptWriteAfter = null;
      // 매체가 일부만 쓰고 중단한 상황. 호출자가 원자성을 보장해야 한다.
      entries.slice(0, stopAt).forEach(([k, v]) => this.map.set(k, v));
      throw new Error("저장 도중 중단");
    }
    entries.forEach(([k, v]) => this.map.set(k, v));
  }

  async removeMany(keys: readonly string[]): Promise<void> {
    keys.forEach((k) => this.map.delete(k));
  }

  async keys(): Promise<readonly string[]> {
    return [...this.map.keys()];
  }

  snapshot(): ReadonlyMap<string, string> {
    return new Map(this.map);
  }
}

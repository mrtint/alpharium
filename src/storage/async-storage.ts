/**
 * 기기 로컬 저장 매체 (005 FR-400, research.md 결정 4)
 *
 * 묶음 하나를 **단일 쓰기 단위**로 다룰 수 있어야 한다는 조건(005 FR-411)만 만족하면
 * 되므로, 인덱스 설계·쿼리 최적화에 들어가지 않는다 — ROADMAP이 그것을 「파기 신호」로
 * 지목했다.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStore } from "./kv";

export class AsyncStorageKeyValueStore implements KeyValueStore {
  get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setMany(entries: readonly (readonly [string, string])[]): Promise<void> {
    await AsyncStorage.multiSet(entries.map(([k, v]) => [k, v]));
  }

  async removeMany(keys: readonly string[]): Promise<void> {
    await AsyncStorage.multiRemove([...keys]);
  }

  async keys(): Promise<readonly string[]> {
    return AsyncStorage.getAllKeys();
  }
}

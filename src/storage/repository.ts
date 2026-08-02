/**
 * T038 — 기록 묶음 저장 (001 FR-032, 005 FR-411)
 * T040 — 조회 (005 FR-470)
 * T042 — 저장 실패 처리 (005 FR-412)
 *
 * **전부 성공하거나 전부 실패한다.** 일기만 있고 근거가 없는 상태를 만들지 않는다.
 * 보장 방식: 묶음 하나를 **단일 키의 단일 값**으로 쓴다 — 일기와 집계가 서로 다른
 * 쓰기로 갈리지 않으므로, 중단이 한쪽만 남기는 상태를 만들 수 없다 (research.md 결정 4).
 *
 * 실패 시 **부분적으로 저장된 것을 남기지 않으며** 사용자에게 알린다 (005 FR-412) —
 * 오류를 던지는 것이 그 통로이고, 삼키지 않는 것이 헌법 원칙 II다.
 */
import { isBundle, isVisible, type RecordBundle } from "./bundle";
import type { KeyValueStore } from "./kv";
import { STORAGE_FORMAT_VERSION, STORAGE_VERSION_KEY } from "./version";
import { log } from "../logging";

/** 저장 실패 (005 FR-412). 삼키지 않는다 — 006 FR-528이 이것을 표시한다. */
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

const BUNDLE_PREFIX = "alpharium/bundle/";

/** 기기 식별자가 섞이지 않는 키. 날짜만으로 정해진다 (005 FR-404). */
const keyFor = (date: string) => `${BUNDLE_PREFIX}${date}`;

export class Repository {
  constructor(private readonly kv: KeyValueStore) {}

  /**
   * 묶음을 저장한다. **단일 값 하나로 쓰므로** 일기와 집계가 함께 남거나 함께 남지
   * 않는다 (005 FR-411). 형식 버전은 별개의 표식이며 묶음의 짝을 가르지 않는다.
   */
  async save(bundle: RecordBundle): Promise<void> {
    try {
      await this.kv.setMany([
        [keyFor(bundle.diary.date), JSON.stringify(bundle)],
        [STORAGE_VERSION_KEY, String(STORAGE_FORMAT_VERSION)],
      ]);
    } catch (error) {
      log.error("기록 묶음 저장 실패", { date: bundle.diary.date });
      throw new StorageError("기록을 저장하지 못했다", { cause: error });
    }
  }

  /** 그 날짜의 **보이는** 기록 묶음. 없거나 숨겨져 있으면 `null`이다. */
  async findByDate(date: string): Promise<RecordBundle | null> {
    const bundle = await this.read(keyFor(date));
    return bundle !== null && isVisible(bundle) ? bundle : null;
  }

  /** 보이는 기록의 목록 (005 FR-470). 없으면 빈 목록이며 오류가 아니다. */
  async listVisible(): Promise<readonly RecordBundle[]> {
    const keys = (await this.kv.keys()).filter((k) => k.startsWith(BUNDLE_PREFIX));

    const bundles: RecordBundle[] = [];
    for (const key of keys) {
      const bundle = await this.read(key);
      if (bundle !== null && isVisible(bundle)) bundles.push(bundle);
    }
    return bundles;
  }

  /** 전수 조사용 — 저장된 원문 그대로 (quickstart 시나리오 5). */
  async dumpRaw(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const key of await this.kv.keys()) {
      const value = await this.kv.get(key);
      if (value !== null) out[key] = value;
    }
    return out;
  }

  /**
   * 저장된 값을 읽는다. 형태가 계약과 다르면 **반쪽짜리로 드러내지 않고** `null`로
   * 다룬다 — 중단된 쓰기가 남긴 것이 조회 경로에 나오지 않게 한다 (005 FR-412).
   */
  private async read(key: string): Promise<RecordBundle | null> {
    const raw = await this.kv.get(key);
    if (raw === null) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      return isBundle(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

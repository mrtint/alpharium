/**
 * T018 — 저장소 형식 버전 식별 (005 FR-403, 001 FR-036)
 *
 * 저장소가 **자신의 형식 버전을 식별**할 수 있게 한다. **이행(마이그레이션) 절차
 * 자체는 005의 몫이며 US1 범위 밖이다** — 여기서는 나중에 이행이 가능하도록 버전을
 * 읽고 쓸 수 있게만 한다.
 */
import type { KeyValueStore } from "./kv";

export const STORAGE_FORMAT_VERSION = 1;

export const STORAGE_VERSION_KEY = "alpharium/storage/version";

/** 저장소에 기록된 형식 버전. 아직 쓰인 적이 없으면 `null`이다. */
export async function readFormatVersion(kv: KeyValueStore): Promise<number | null> {
  const raw = await kv.get(STORAGE_VERSION_KEY);
  if (raw === null) return null;

  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function writeFormatVersion(kv: KeyValueStore, version: number): Promise<void> {
  await kv.setMany([[STORAGE_VERSION_KEY, String(version)]]);
}

/** 현재 코드가 읽을 수 있는 형식인가. 아직 버전이 없으면 새 저장소이므로 참이다. */
export async function isReadableFormat(kv: KeyValueStore): Promise<boolean> {
  const version = await readFormatVersion(kv);
  return version === null || version === STORAGE_FORMAT_VERSION;
}

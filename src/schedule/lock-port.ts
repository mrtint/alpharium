/**
 * 경합 잠금 파일 통로 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/generation-lock.md
 *       L3
 *       spec.md FR-008
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **잠금 파일은 `diary/` 밖에 둔다** — `locks/diary-generation.lock`. 007이
 * `preferences/`를 밖에 둔 이유와 같다: `listDays()`가 잠금 파일을 일기로
 * 오인하지 않게 한다.
 *
 * `write()`는 `store.ts`의 `.writing` + `moveSync` 패턴을 쓴다 — "존재 확인
 * 후 쓰기" 사이의 경합 창을 좁힌다(research.md §4 남는 위험).
 *
 * 지연 import: `expo-file-system`을 메서드 안에서 `await import`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { LockPort, LockRecord } from "./lock";

const DIRECTORY = "locks";
const LOCK_FILE = "diary-generation.lock";

/** 잠금 디렉터리를 연다. **지연 import다** — 웹·테스트 환경에서 무너지지 않게 한다. */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 읽은 값이 `LockRecord` 모양인가. 깨졌으면 null 취급. */
function parseRecord(raw: string): LockRecord | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.owner !== "screen" && obj.owner !== "background") return null;
    if (typeof obj.acquiredAtMs !== "number" || !Number.isFinite(obj.acquiredAtMs)) return null;
    return { owner: obj.owner, acquiredAtMs: obj.acquiredAtMs };
  } catch {
    return null;
  }
}

/**
 * 기기의 잠금 파일 통로.
 */
export function expoLockPort(): LockPort {
  return {
    async read() {
      try {
        const { dir, File } = await openDirectory();
        const file = new File(dir, LOCK_FILE);
        if (!file.exists) return null;
        return parseRecord(await file.text());
      } catch {
        // 읽지 못하면 "잠금 없음"으로 다룬다 — stale 타임아웃이 최악을 회복한다.
        return null;
      }
    },

    /** 임시 파일에 쓰고 제자리로 옮긴다 — 쓰는 도중 죽어도 반쯤 쓰인 파일이 안 남는다. */
    async write(record) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${LOCK_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(JSON.stringify(record));

      const target = new File(dir, LOCK_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },

    async clear() {
      try {
        const { dir, File } = await openDirectory();
        const file = new File(dir, LOCK_FILE);
        if (file.exists) file.delete();
      } catch {
        // 없어도 예외를 던지지 않는다(L3).
      }
    },
  };
}

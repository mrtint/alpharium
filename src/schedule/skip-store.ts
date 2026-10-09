/**
 * 사진 권한 때문에 자동 쓰기를 건너뛴 가장 최근 날 (057, 보드 `6g`).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md SK1~SK4, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **날짜 하나뿐이다.** 설정의 사진 행이 「어제/M월 d일 자동 쓰기를 건너뛰었어요」 한 줄을 그리는 데 필요한 것은
 * 건너뛴 날뿐이다. 언제 건너뛰었는지·몇 번 건너뛰었는지·왜 건너뛰었는지를 담으면 실행 이력 로그로 자란다(원칙 IV,
 * 분해 설계 D3). 이유도 담지 않는다 — 기록되는 건너뜀은 사진 권한 하나뿐이다(재료 없음은 기록하지 않는다, FR-009).
 *
 * **자동 쓰기 설정 파일과 다른 파일이다**(020 S7 — 그 파일의 필드는 둘뿐이다). 새 건너뜀이 이전 것을 덮는다(가장
 * 최근 한 번). 사진 권한이 허용된 것을 앱이 읽으면 지운다(FR-012 — 지우는 자리는 조립부).
 *
 * `notified-store.ts`와 같은 모양이다 — 판정하지 않고 담고 꺼내기만 한다. 읽기는 던지지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";

/** 기록이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface SkipStorePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  remove(): Promise<void>;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 건너뛴 날을 읽는다. 없음·깨짐·모양이 다름·통로 예외는 전부 `null`이다. */
export async function loadSkippedDay(port: SkipStorePort): Promise<DayDate | null> {
  try {
    const raw = await port.read();
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const day = (parsed as { day?: unknown }).day;
    return typeof day === "string" && DAY_PATTERN.test(day) ? day : null;
  } catch {
    return null;
  }
}

/** 건너뛴 날을 담는다 — 이전 기록을 덮는다. */
export async function saveSkippedDay(port: SkipStorePort, day: DayDate): Promise<void> {
  await port.write(JSON.stringify({ day }));
}

/** 기록을 지운다. */
export async function clearSkippedDay(port: SkipStorePort): Promise<void> {
  await port.remove();
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const SKIP_FILE = "auto-write-skipped.json";

/** 디렉터리를 연다. **지연 import다.** */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/**
 * 기기의 건너뜀 기록 통로. `preferences/` 아래 — `diary/` 밖이라 일기 목록이 건드리지 않는다.
 */
export function expoSkipStorePort(): SkipStorePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SKIP_FILE);
      return file.exists ? file.textSync() : null;
    },

    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${SKIP_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, SKIP_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },

    async remove() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SKIP_FILE);
      if (file.exists) file.delete();
    },
  };
}

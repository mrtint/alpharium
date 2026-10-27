/**
 * 창 밖 따라잡기 기록 (078) — 「오늘 창 밖에서 한 번 판정했다」는 날짜 하나.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜**: 시도 창(목표 시각 +3시간)은 재시도의 유일한 상한이었다. 078이 지난 날을 창 밖에서도 쓰게 하면서 그 상한이 사라져, 계속
 * 실패하는 지난 날(저장 실패·사진 읽기 실패·헤드리스 시간 초과)을 백그라운드가 15분마다 온종일 다시 돌릴 수 있었다 — 모델을 올리고
 * 추론하는 일을 하루 종일 되풀이한다. 그래서 **창 밖의 따라잡기는 백그라운드에서 하루에 한 번만 판정한다**(`task.ts`).
 *
 * 057 건너뜀 기록(`skip-store.ts`)과 같은 꼴이다 — 날짜 하나, 횟수도 시각도 세지 않는다(원칙 IV). 못 읽으면 「쓴 적 없음」이다
 * (막지 않는 쪽 — 기록이 깨졌다고 자동 쓰기가 멈추면 안 된다). 앱을 열 때의 자동 쓰기(057)는 이 기록을 보지 않는다 — 그 경로는
 * 한 실행에 한 번이고 화면이 보인다. 058 지우기·059 끄기는 이 파일을 건드리지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";

export interface CatchUpStorePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  /** 106 — 기록을 지운다. 없어도 던지지 않는다 */
  remove(): Promise<void>;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 창 밖 따라잡기를 판정한 날. 없거나 못 읽으면 `null`. */
export async function loadCatchUpDay(port: CatchUpStorePort): Promise<DayDate | null> {
  try {
    const raw = await port.read();
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const on = (parsed as { on?: unknown }).on;
    return typeof on === "string" && DAY_PATTERN.test(on) ? on : null;
  } catch {
    return null;
  }
}

export async function saveCatchUpDay(port: CatchUpStorePort, on: DayDate): Promise<void> {
  await port.write(JSON.stringify({ on }));
}

/** 106 — 기록을 지운다(빠른 주기 리셋: 새 주기에는 창 밖 몫도 새로 시작한다). */
export async function clearCatchUpDay(port: CatchUpStorePort): Promise<void> {
  await port.remove();
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const CATCH_UP_FILE = "auto-write-catch-up.json";

async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** `preferences/auto-write-catch-up.json`. 짧게 사는 `File`에는 `*Sync()`만 쓴다(AGENTS). */
export function expoCatchUpStorePort(): CatchUpStorePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, CATCH_UP_FILE);
      return file.exists ? file.textSync() : null;
    },
    async write(serialized) {
      const { dir, File } = await openDirectory();
      const temporary = new File(dir, `${CATCH_UP_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);
      const target = new File(dir, CATCH_UP_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
    async remove() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, CATCH_UP_FILE);
      if (file.exists) file.delete();
    },
  };
}

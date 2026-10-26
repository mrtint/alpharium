/**
 * 빠른 주기 기록 (106, 개발 빌드 전용).
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/fast-cycle.md FC3 · data-model「빠른 주기 설정」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **별도 파일이다** — `auto-diary.json`(020 S7)·`developer-menu.json`(059)에 필드를 더하지 않는다. 켜짐일 때만 파일이 있고
 * 꺼지면 지운다(「파일 없음 = 꺼짐」). `app/simulation-store.ts`(064)와 같은 모양 — **판정하지 않고 담고 꺼내기만 한다.**
 * 읽기는 던지지 않고, 없거나 깨졌거나 모양이 다르면 꺼짐(`null`)이다 — 켜짐으로 채우지 않는다(원칙 V).
 *
 * **이 파일의 `loadFastCycle`은 가드가 없다**(환경을 모른다). 개발 환경에서만 읽는다는 약속은 `timing-source.ts`의
 * `loadFastCycleRecord`가 지키고, 그 밖에서 이 함수를 import하지 못하게 헌법 검사가 잠근다(FL1).
 *
 * 담는 것은 둘뿐이다 — 주기 분과 마지막으로 리셋한 주기 id. 시각·횟수·이력은 담지 않는다(원칙 IV).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { MAX_PERIOD_MINUTES, MIN_PERIOD_MINUTES } from "./timing";

export type FastCycleRecord = {
  /** 5~180의 정수 분 */
  periodMinutes: number;
  /** 마지막으로 리셋한 주기 id(`YYYY-MM-DD#순번`) */
  resetCycle: string;
};

/** 기록이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface FastCyclePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  remove(): Promise<void>;
}

/** 문자열 → 기록. 유효하지 않으면 `null`(꺼짐). 알 수 없는 필드는 무시한다. */
export function parseFastCycle(raw: string | null): FastCycleRecord | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const { periodMinutes, resetCycle } = record;
  if (
    typeof periodMinutes !== "number" ||
    !Number.isInteger(periodMinutes) ||
    periodMinutes < MIN_PERIOD_MINUTES ||
    periodMinutes > MAX_PERIOD_MINUTES
  ) {
    return null;
  }
  if (typeof resetCycle !== "string") return null;
  return { periodMinutes, resetCycle };
}

export function serializeFastCycle(record: FastCycleRecord): string {
  return JSON.stringify({ periodMinutes: record.periodMinutes, resetCycle: record.resetCycle });
}

/** 기록. 없음·깨짐·통로 예외는 전부 `null`(꺼짐)이다. 던지지 않는다. */
export async function loadFastCycle(port: FastCyclePort): Promise<FastCycleRecord | null> {
  try {
    return parseFastCycle(await port.read());
  } catch {
    return null;
  }
}

export async function saveFastCycle(port: FastCyclePort, record: FastCycleRecord): Promise<void> {
  await port.write(serializeFastCycle(record));
}

/** 기록을 지운다 — 모드를 끌 때, 개발자 메뉴를 끌 때 */
export async function clearFastCycle(port: FastCyclePort): Promise<void> {
  await port.remove();
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const FAST_CYCLE_FILE = "dev-fast-cycle.json";

/** 디렉터리를 연다. **지연 import다** — 웹·테스트 환경에서 무너지지 않게 한다. */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** `preferences/dev-fast-cycle.json`. 짧게 사는 `File`에는 `*Sync()`만 쓴다(AGENTS). */
export function expoFastCyclePort(): FastCyclePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, FAST_CYCLE_FILE);
      return file.exists ? file.textSync() : null;
    },

    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${FAST_CYCLE_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, FAST_CYCLE_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },

    async remove() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, FAST_CYCLE_FILE);
      if (file.exists) file.delete();
    },
  };
}

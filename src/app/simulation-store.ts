/**
 * 상태 흉내 기록 (064, 보드 `6e` ③ 「값은 앱을 껐다 켜도 유지(끄기 전까지)」).
 *
 * 계약: specs/064-state-simulation/contracts/simulation.md SS1~SS3, data-model §1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **별도 파일이다** — `developer-menu.json`(059 DS1 「켜짐 하나뿐」)·`auto-diary.json`(020 S7)에 필드를 더하지 않는다(D3). 흉내가
 * 하나라도 켜졌을 때만 파일이 있고 모두 꺼지면 지운다(「파일 없음 = 꺼짐」). 헤드리스 자동 쓰기(`schedule/task.ts`)도 이 파일을 읽는다
 * — 그쪽에는 화면이 없다.
 *
 * `developer-menu-store.ts`(059)와 같은 모양이다 — 판정하지 않고 담고 꺼내기만 한다. 읽기는 던지지 않고 모르면 꺼짐이다(원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { OFF, parseSimulation, serializeSimulation, type SimulationState } from "./simulation";

/** 기록이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface SimulationStorePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  remove(): Promise<void>;
}

/** 흉내 상태. 없음·깨짐·통로 예외는 전부 꺼짐이다(SS1) */
export async function loadSimulation(port: SimulationStorePort): Promise<SimulationState> {
  try {
    return parseSimulation(await port.read());
  } catch {
    return OFF;
  }
}

/** 담는다. 모두 꺼졌으면 지운다(SS2) */
export async function saveSimulation(
  port: SimulationStorePort,
  state: SimulationState,
): Promise<void> {
  const serialized = serializeSimulation(state);
  if (serialized === null) await port.remove();
  else await port.write(serialized);
}

/** 기록을 지운다 — 개발자 메뉴를 끌 때(보드 `6e` ⑤) */
export async function clearSimulation(port: SimulationStorePort): Promise<void> {
  await port.remove();
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const SIMULATION_FILE = "simulation.json";

/** 디렉터리를 연다. **지연 import다.** */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 기기의 흉내 기록 통로. `preferences/` 아래 — `diary/` 밖이라 일기 목록이 건드리지 않는다(SS3). */
export function expoSimulationStorePort(): SimulationStorePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SIMULATION_FILE);
      return file.exists ? file.text() : null;
    },

    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${SIMULATION_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, SIMULATION_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },

    async remove() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SIMULATION_FILE);
      if (file.exists) file.delete();
    },
  };
}

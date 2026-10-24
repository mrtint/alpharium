/**
 * 홈 배터리 안내를 닫은 시각 (104, 계약 home-notice.md BS1~BS3).
 *
 * **시각 하나뿐이다.** 닫은 횟수·이유·이력을 담으면 실행 이력 로그로 자란다(원칙 IV). 새 닫음이 이전 것을 덮는다. 예외 상태는 저장하지
 * 않는다(읽을 때마다 읽는다).
 *
 * 읽기는 던지지 않고 **세 갈래를 가른다**: 시각 / 기록 없음·깨짐(`null` — 닫은 적 없는 것으로 보고, 다음에 닫으면 깨진 파일을 덮는다) /
 * 통로 예외(`"unreadable"` — 모르는 것이라 안내하지 않는다, 원칙 V). `schedule/skip-store.ts`와 같은 모양이다.
 */

/** 기록이 담기는 통로. 테스트가 기기 없이 갈아끼운다 */
export interface BatteryNoticeStorePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 닫은 시각(epoch ms) / 닫은 적 없음 / 읽지 못함 */
export type DismissedAt = number | null | "unreadable";

export async function loadDismissedAt(port: BatteryNoticeStorePort): Promise<DismissedAt> {
  let raw: string | null;
  try {
    raw = await port.read();
  } catch {
    return "unreadable";
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const at = (parsed as { at?: unknown }).at;
    return typeof at === "number" && Number.isFinite(at) && at >= 0 ? at : null;
  } catch {
    return null;
  }
}

/** 닫은 시각을 담는다 — 이전 기록을 덮는다 */
export async function saveDismissedAt(port: BatteryNoticeStorePort, at: number): Promise<void> {
  await port.write(JSON.stringify({ at }));
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const NOTICE_FILE = "battery-notice-dismissed.json";

/** 디렉터리를 연다. **지연 import다.** */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 기기의 닫은 시각 기록 통로. `preferences/` 아래 — `diary/` 밖이라 일기 목록이 건드리지 않는다 */
export function expoBatteryNoticeStorePort(): BatteryNoticeStorePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, NOTICE_FILE);
      return file.exists ? file.textSync() : null;
    },

    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${NOTICE_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, NOTICE_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}

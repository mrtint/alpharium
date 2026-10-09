/**
 * 개발자 메뉴 켜짐 기록 (059, 보드 `6d` ① 「켜진 상태는 이 기기에 저장」).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md DS1~DS4, data-model §1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **켜짐 여부 하나뿐이다.** 켠 시각·탭 횟수·끈 횟수를 담으면 실행 이력 로그로 자란다(원칙 IV, 분해 설계 D3). **다른 설정 파일에 필드를
 * 더하지 않는다** — `auto-diary.json`(020 S7)·`onboarding.json`(021 `FLAG_GROWS_HISTORY`)이 막은 패턴이다. 켜짐일 때만 파일이 있고
 * 끄면 파일을 지운다(`false`를 쓰지 않는다 — 「파일 없음 = 꺼짐」).
 *
 * `skip-store.ts`(057)와 같은 모양이다 — 판정하지 않고 담고 꺼내기만 한다. 읽기는 던지지 않고 모르면 꺼짐이다(원칙 V).
 * **개발 환경은 이 파일과 무관하게 켜짐**이고 그 끄기는 세션 상태다(`use-developer-menu.ts`) — 개발 환경에서는 이 파일을 건드리지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 기록이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface DeveloperMenuStorePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  remove(): Promise<void>;
}

/** 켜짐이면 `true`. 없음·깨짐·모양이 다름·통로 예외는 전부 `false`다. */
export async function loadDeveloperMenu(port: DeveloperMenuStorePort): Promise<boolean> {
  try {
    const raw = await port.read();
    if (raw === null) return false;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return false;
    return (parsed as { enabled?: unknown }).enabled === true;
  } catch {
    return false;
  }
}

/** 켜짐을 담는다. */
export async function saveDeveloperMenu(port: DeveloperMenuStorePort): Promise<void> {
  await port.write(JSON.stringify({ enabled: true }));
}

/** 기록을 지운다(꺼짐). */
export async function clearDeveloperMenu(port: DeveloperMenuStorePort): Promise<void> {
  await port.remove();
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const MENU_FILE = "developer-menu.json";

/** 디렉터리를 연다. **지연 import다.** */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 기기의 켜짐 기록 통로. `preferences/` 아래 — `diary/` 밖이라 일기 목록이 건드리지 않는다. */
export function expoDeveloperMenuStorePort(): DeveloperMenuStorePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, MENU_FILE);
      return file.exists ? file.textSync() : null;
    },

    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${MENU_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, MENU_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },

    async remove() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, MENU_FILE);
      if (file.exists) file.delete();
    },
  };
}

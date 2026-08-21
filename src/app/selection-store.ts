/**
 * 고른 캐릭터의 영속화.
 *
 * 계약: specs/007-diary-ui-refinement/contracts/selection.md §2,
 *       data-model.md §1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **기기에 닿는 유일한 자리다.** 판정은 `selection.ts`가 하고 여기서는 담고 꺼낸다 —
 * 002의 `FileSystemPort`, 003의 `MetadataPort`와 같은 구조이며 통로를 주입받는다.
 *
 * **왜 `AsyncStorage`가 아닌가**(research.md §2): 그 패키지가 **의존에 없다.**
 * 들이면 새 의존이 생겨 SC-015를 어긴다. `expo-file-system`은 이미 의존이고,
 * 실기기 왕복(2026-08-13)과 release의 R8 통과(2026-08-20)가 확인됐다.
 *
 * **읽지 못하면 「고른 것 없음」이다**(원칙 V). 깨진 파일에서 캐릭터를 지어내지 않고,
 * 앱이 뜨지 못하게 만들지도 않는다 — 사용자가 다시 고르면 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CHARACTERS, type Character } from "../diary/types";

/**
 * 선택이 담기는 통로. 테스트가 기기 없이 갈아끼운다.
 *
 * **`read()`가 없으면 `null`이다** — 예외가 아니다. 003의 `MetadataPort`와 같은 모양.
 */
export interface SelectionPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 로스터 안의 이름인가. **밖의 것은 캐릭터가 아니다**(원칙 V) */
function isCharacter(value: unknown): value is Character {
  return typeof value === "string" && (CHARACTERS as readonly string[]).includes(value);
}

/**
 * 고른 캐릭터를 읽는다.
 *
 * **모르면 `null`이다.** 파일이 없든, 깨졌든, 로스터 밖 이름이 들었든, 통로가 예외를
 * 던지든 결과가 같다 — 어느 경우에도 **캐릭터를 지어내지 않는다.**
 */
export async function loadSelection(port: SelectionPort): Promise<Character | null> {
  try {
    const raw = await port.read();
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const character = (parsed as { character?: unknown }).character;
    return isCharacter(character) ? character : null;
  } catch {
    // 깨진 파일도 없는 통로도 「모른다」로 같다. 앱을 죽이지 않는다.
    return null;
  }
}

/**
 * 고른 캐릭터를 담는다.
 *
 * **캐릭터 말고 아무것도 담지 않는다**(원칙 III). 파일 이름·자산 키·바이트가 들어가면
 * 그것이 모델 정보가 새는 경로가 된다 — data-model.md §1이 필드를 하나로 둔 이유다.
 *
 * **준비 상태를 담지 않는다.** 저장된 준비 상태는 곧 거짓이 된다(사용자가 캐릭터를
 * 지울 수 있다). 준비는 언제나 003의 `readinessOf()`에서 새로 읽는다.
 */
export async function saveSelection(port: SelectionPort, character: Character): Promise<void> {
  await port.write(JSON.stringify({ character }));
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

/**
 * 선택이 놓이는 자리.
 *
 * **일기 디렉터리(`diary/`) 밖이다**(data-model.md §1). 안에 두면 002의 `listDays()`가
 * 이 파일을 날짜로 파싱하려 들고, 목록에 정체불명의 줄이 생긴다.
 */
const DIRECTORY = "preferences";
const SELECTION_FILE = "selected-character.json";

/**
 * 디렉터리를 연다. **지연 import다.**
 *
 * 모듈을 읽는 것만으로 `expo-file-system`이 해석되면 웹·테스트 환경에서 무너진다 —
 * 003의 `expo-port.ts`, 006의 `wiring.ts`와 같은 판단이다.
 */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/**
 * 기기의 선택 통로 (research.md §2).
 *
 * **`expo-file-system`을 쓴다** — 새 의존이 없고(SC-015), 실기기 왕복과 release의
 * R8 통과가 이미 확인된 통로다.
 */
export function expoSelectionPort(): SelectionPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SELECTION_FILE);
      return file.exists ? file.text() : null;
    },

    /**
     * 임시 파일에 쓰고 제자리로 옮긴다.
     *
     * 바로 덮어쓰면 쓰는 도중 앱이 죽었을 때 반쯤 쓰인 파일이 남는다 — 003의
     * `expoMetadataPort`와 같은 방식이다. **그때도 `loadSelection()`이 `null`로
     * 떨어지므로 앱은 뜨지만**, 애초에 그 상태를 만들지 않는 편이 낫다.
     */
    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${SELECTION_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, SELECTION_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}

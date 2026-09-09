/**
 * 사용자 지정 캐릭터 이름의 영속화 (035).
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/character-name.md N8·N9
 *       data-model.md §1, spec.md FR-015·FR-029
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **기기에 닿는 유일한 자리다.** 해석은 `diary/character-name.ts`의
 * `displayNameOf()`가 하고 여기서는 담고 꺼낸다 — 007의 `selection-store.ts`,
 * 029의 `vision-setting-store.ts`와 같은 구조이며 통로를 주입받는다.
 *
 * **`expo-file-system`을 쓴다** — 새 의존이 없고, 실기기 왕복과 release의 R8
 * 통과가 이미 확인된 통로다(007에서 확립).
 *
 * **읽지 못하면 「없는 것」이다**(원칙 V). 깨진 파일에서 이름을 지어내지 않고,
 * 앱이 뜨지 못하게 만들지도 않는다 — 사용자가 다시 지으면 된다.
 *
 * **다만 007과 다른 점이 하나 있다**: `selected-character.json`은 값이 하나라
 * 「깨지면 없는 것」으로 충분했다. 여기는 로스터 캐릭터의 이름이 한 파일에 있으므로,
 * 하나가 깨졌다고 나머지 넷을 버리면 **사용자가 지은 이름을 이유 없이 잃는다.**
 * 그래서 **키 단위로 살린다**(N8).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CustomNames } from "../diary/character-name";
import { CHARACTERS, type Character } from "../diary/types";

import { validateCharacterName } from "./naming";

export type { CustomNames };

/**
 * 이름이 담기는 통로. 테스트가 기기 없이 갈아끼운다.
 *
 * **`read()`가 없으면 `null`이다** — 예외가 아니다. 007의 `SelectionPort`와 같은 모양.
 */
export interface CharacterNamesPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 로스터 안의 이름인가. **밖의 것은 캐릭터가 아니다**(원칙 V) */
function isCharacter(value: unknown): value is Character {
  return typeof value === "string" && (CHARACTERS as readonly string[]).includes(value);
}

/**
 * 사용자가 지은 이름들을 읽는다 (N8).
 *
 * **어떤 실패에서도 예외를 던지지 않고 살릴 수 있는 것은 살린다.**
 *
 * | 상황 | 결과 |
 * |---|---|
 * | 파일 없음·JSON 깨짐·`names`가 객체 아님 | `{}` |
 * | 로스터 밖 키 | 그 키만 버린다 |
 * | 값이 문자열이 아님 / 빈 문자열 / 상한 초과 | 그 키만 버린다 |
 *
 * 검증은 **저장할 때와 같은 함수**(`validateCharacterName`)를 쓴다 — 두 자리에
 * 각각 규칙을 두면 저장은 되는데 읽히지 않는 값이 생긴다.
 */
export async function loadCustomNames(port: CharacterNamesPort): Promise<CustomNames> {
  try {
    const raw = await port.read();
    if (raw === null) return {};

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const names = (parsed as { names?: unknown }).names;
    if (typeof names !== "object" || names === null || Array.isArray(names)) return {};

    const result: CustomNames = {};
    for (const [key, value] of Object.entries(names as Record<string, unknown>)) {
      if (!isCharacter(key)) continue; // 로스터 밖 키는 캐릭터가 아니다.
      if (typeof value !== "string") continue;

      const validated = validateCharacterName(value);
      if (validated.ok) result[key] = validated.value;
    }
    return result;
  } catch {
    // 깨진 파일도 없는 통로도 「모른다」로 같다. 앱을 죽이지 않는다.
    return {};
  }
}

/**
 * 사용자가 지은 이름들을 담는다.
 *
 * **이름 말고 아무것도 담지 않는다**(N9, 원칙 III·IV). 모델 식별자·자산 키·경로·
 * 바이트·변경 시각·이력이 들어갈 자리가 없다 — 007의 `saveSelection`이
 * `{ character }` 하나만 담은 것과 같은 방어.
 *
 * **빈 값은 키째 빠진다**(W19) — `{ quiet: "" }`가 저장되면 파일에 뜻 없는 값이
 * 남고, 읽는 쪽이 `displayNameOf()`의 방어에 기대게 된다.
 */
export async function saveCustomNames(port: CharacterNamesPort, names: CustomNames): Promise<void> {
  const cleaned: CustomNames = {};
  for (const character of CHARACTERS) {
    const value = names[character];
    if (typeof value !== "string") continue;

    const validated = validateCharacterName(value);
    if (validated.ok) cleaned[character] = validated.value;
  }

  await port.write(JSON.stringify({ names: cleaned }));
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

/**
 * 이름이 놓이는 자리.
 *
 * **일기 디렉터리(`diary/`) 밖이다**(FR-029) — 안에 두면 002의 `listDays()`가 이
 * 파일을 날짜로 파싱하려 들고, 목록에 정체불명의 줄이 생긴다.
 */
const DIRECTORY = "preferences";
const NAMES_FILE = "character-names.json";

/**
 * 디렉터리를 연다. **지연 import다.**
 *
 * 모듈을 읽는 것만으로 `expo-file-system`이 해석되면 웹·테스트 환경에서 무너진다 —
 * 003의 `expo-port.ts`, 007의 `selection-store.ts`와 같은 판단이다.
 */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 기기의 이름 통로 (007 `expoSelectionPort` 패턴). */
export function expoCharacterNamesPort(): CharacterNamesPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, NAMES_FILE);
      return file.exists ? file.text() : null;
    },

    /**
     * 임시 파일에 쓰고 제자리로 옮긴다.
     *
     * 바로 덮어쓰면 쓰는 도중 앱이 죽었을 때 반쯤 쓰인 파일이 남는다 — 003의
     * `expoMetadataPort`, 007의 `expoSelectionPort`와 같은 방식이다.
     */
    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${NAMES_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, NAMES_FILE);
      if (target.exists) target.delete();
      temporary.move(target);
    },
  };
}

/**
 * 고른 사진 설정의 영속화.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-017·018
 *       specs/029-writing-flow-simplification/contracts/settings-sections.md S2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **007의 `selection-store.ts`와 같은 구조다.** 기기에 닿는 자리이며 판정을 하지 않는다.
 *
 * **`AsyncStorage`가 아니라 `expo-file-system`을 쓴다** — 그 패키지가 의존에 없고,
 * 이것은 이미 의존이며 실기기 왕복과 release의 R8 통과가 확인됐다. **새 의존 0개.**
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **★ 029에서 기본값이 「보지 않음」에서 「자동」으로 바뀌었다.** 홈의 사진 설정 위젯이
 * 사라지고(FR-001) 배선 계층이 자동 판정하므로(FR-010), 사용자가 명시적으로 고른 적이
 * 없으면 "자동"(사진 있으면 빠르게 봄, 없으면 보지 않음)이 자연스러운 기본이다. 명시적
 * "보지 않음"은 `{vision:"none"}`으로 저장돼 "자동"과 구분된다.
 *
 * **`VisionSetting` 타입(none/quick/detailed)은 불변이다**(원칙 II) — "auto"는 이
 * 스토어의 반환 유니온일 뿐 `src/diary/types.ts`의 타입에 추가되지 않는다.
 */

import { VISION_SETTINGS, type VisionSetting } from "../diary/types";

/** 스토어가 돌려주는 값. "auto"이거나 세 설정 중 하나. */
export type VisionPreference = "auto" | VisionSetting;

/**
 * 설정이 담기는 통로. 테스트가 기기 없이 갈아끼운다.
 *
 * **`read()`가 없으면 `null`이다** — 예외가 아니다. 007의 `SelectionPort`와 같은 모양.
 */
export interface VisionSettingPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 셋 중 하나인가. **밖의 것은 설정이 아니다**(원칙 V) */
function isVisionSetting(value: unknown): value is VisionSetting {
  return typeof value === "string" && (VISION_SETTINGS as readonly string[]).includes(value);
}

/**
 * 사진 설정을 읽는다.
 *
 * **모르면 `"auto"`다** — 파일이 없든, 깨졌든, `{auto:true}`든, 셋 밖의 값이 들었든,
 * 통로가 예외를 던지든. 명시적으로 고른 `{vision:"none"|"quick"|"detailed"}`만 그
 * 값으로 돌아온다.
 */
export async function loadVisionSetting(port: VisionSettingPort): Promise<VisionPreference> {
  try {
    const raw = await port.read();
    if (raw === null) return "auto";

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return "auto";

    if ((parsed as { auto?: unknown }).auto === true) return "auto";

    const vision = (parsed as { vision?: unknown }).vision;
    return isVisionSetting(vision) ? vision : "auto";
  } catch {
    // 깨진 파일도 없는 통로도 「자동」으로 같다. 앱을 죽이지 않는다.
    return "auto";
  }
}

/**
 * 사진 설정을 담는다.
 *
 * **설정 말고 아무것도 담지 않는다**(원칙 III·IV). `"auto"`는 `{auto:true}`로,
 * 세 설정은 `{vision:<값>}`으로 — 자리 하나뿐.
 */
export async function saveVisionSetting(
  port: VisionSettingPort,
  preference: VisionPreference,
): Promise<void> {
  const payload = preference === "auto" ? { auto: true } : { vision: preference };
  await port.write(JSON.stringify(payload));
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

/**
 * 설정이 놓이는 자리.
 *
 * **007의 캐릭터 선택과 같은 디렉터리, 다른 파일이다.** 한 파일에 둘을 담으면 한쪽을
 * 고칠 때 다른 쪽이 함께 지워질 수 있고, 그때 사용자는 고른 적 없는 캐릭터로 돌아간다.
 */
const DIRECTORY = "preferences";
const SETTING_FILE = "vision-setting.json";

/**
 * 디렉터리를 연다. **지연 import다.**
 *
 * 모듈을 읽는 것만으로 `expo-file-system`이 해석되면 웹·테스트 환경에서 무너진다.
 */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 기기의 설정 통로. 007의 `expoSelectionPort`와 같은 방식이다 */
export function expoVisionSettingPort(): VisionSettingPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SETTING_FILE);
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

      const temporary = new File(dir, `${SETTING_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, SETTING_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}

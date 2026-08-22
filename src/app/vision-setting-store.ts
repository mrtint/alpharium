/**
 * 고른 사진 설정의 영속화.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-017·018
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **007의 `selection-store.ts`와 같은 구조다.** 기기에 닿는 자리이며 판정을 하지 않는다.
 *
 * **`AsyncStorage`가 아니라 `expo-file-system`을 쓴다** — 그 패키지가 의존에 없고,
 * 이것은 이미 의존이며 실기기 왕복과 release의 R8 통과가 확인됐다. **새 의존 0개.**
 *
 * **읽지 못하면 「보지 않음」이다**(FR-018, 원칙 V). 깨진 파일에서 설정을 지어내지 않고,
 * 앱이 뜨지 못하게 만들지도 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **★ 왜 기본값이 「보지 않음」인가**: 007이 「고른 적이 없으면 준비된 것이 있어도
 * 고르지 않는다」(FR-008)로 정한 것과 같은 판단이다. 사진을 보는 것은 **10초를 더 쓰고
 * 모델을 하나 더 받아야 하는 일**이므로, 사용자가 고르지 않았는데 그것을 시작하면
 * 말없이 그의 시간과 저장 공간을 쓰는 것이다.
 */

import { VISION_SETTINGS, type VisionSetting } from "../diary/types";

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
 * 고른 사진 설정을 읽는다.
 *
 * **모르면 `null`이다.** 파일이 없든, 깨졌든, 셋 밖의 값이 들었든, 통로가 예외를
 * 던지든 결과가 같다 — 어느 경우에도 **설정을 지어내지 않는다.**
 *
 * **`null`을 「보지 않음」으로 여기 옮기지 않는다.** 「고른 적이 없다」와 「보지 않음을
 * 골랐다」는 다른 사실이며, 화면이 그것을 구분해 그릴 수 있어야 한다 — 004가
 * `none`/`unknown`을 가른 것과 같은 판단이다.
 */
export async function loadVisionSetting(port: VisionSettingPort): Promise<VisionSetting | null> {
  try {
    const raw = await port.read();
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const vision = (parsed as { vision?: unknown }).vision;
    return isVisionSetting(vision) ? vision : null;
  } catch {
    // 깨진 파일도 없는 통로도 「모른다」로 같다. 앱을 죽이지 않는다.
    return null;
  }
}

/**
 * 고른 사진 설정을 담는다.
 *
 * **설정 말고 아무것도 담지 않는다**(원칙 III·IV). 모델 이름·깊이의 토큰 수·마지막으로
 * 쓴 시각이 들어가면 그것이 새는 경로가 된다.
 */
export async function saveVisionSetting(
  port: VisionSettingPort,
  vision: VisionSetting,
): Promise<void> {
  await port.write(JSON.stringify({ vision }));
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

/**
 * 장소 이름 설정의 영속화.
 *
 * 계약: specs/121-richer-day-places/contracts/diary-places.md ST1
 *       (017 contracts/place-name.md L1, 029 contracts/settings-sections.md S3를 이었다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`vision-setting-store.ts`와 같은 모양이다** — 기기에 닿는 자리이며
 * 판정을 하지 않는다. `expo-file-system`을 쓴다(새 의존 0개).
 *
 * **★ 121에서 세 갈래(`auto`/`on`/`off`)가 두 갈래(`on`/`off`)로 줄었다.** 장소 이름을 앱에 든 데이터에서 찾으므로
 * 위치 권한도 좌표 전송도 없다. 옛 `"auto"`와 구형 `{enabled:true}`는 `"on"`으로 읽는다. 파일 이름은 017 그대로다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 스토어가 돌려주는 값 (121 — 두 갈래).
 *
 * 이름은 017 그대로 두었다(조립부 여러 곳이 쓴다). 장소 이름은 이제 기기 안 데이터에서 찾고 좌표를 보내지 않는다 —
 * 029의 `"auto"`(위치 권한이 있을 때만)가 막던 이유가 사라져 「켬」으로 옮긴다.
 */
export type GeocodingPreference = "on" | "off";

/** 처음 값 — 파일이 없거나 읽지 못했을 때 (121 ST1) */
const DEFAULT_PREFERENCE: GeocodingPreference = "on";

/** 설정이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface GeocodingSettingPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/**
 * 장소 이름 설정을 읽는다.
 *
 * **파일 없음·깨짐·통로 예외 전부 처음 값 `"on"`이다.** 옛 `"auto"`는 `"on"`, 구형 `{enabled:true}`는
 * `"on"`, `{enabled:false}`는 `"off"`로 옮긴다.
 */
export async function loadGeocodingSetting(
  port: GeocodingSettingPort,
): Promise<GeocodingPreference> {
  try {
    const raw = await port.read();
    if (raw === null) return DEFAULT_PREFERENCE;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFERENCE;

    const mode = (parsed as { mode?: unknown }).mode;
    if (mode === "on" || mode === "off") return mode;
    if (mode === "auto") return "on";

    // 구형 {enabled:boolean} 마이그레이션.
    const enabled = (parsed as { enabled?: unknown }).enabled;
    if (typeof enabled === "boolean") return enabled ? "on" : "off";

    return DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/**
 * 장소명 설정을 담는다.
 *
 * **설정 말고 아무것도 담지 않는다**(원칙 III·IV) — 좌표·장소 이름은 이
 * 파일이 아니라 각 일기(`DiaryEntry.places`)에 담긴다. `{mode}` 자리 하나뿐.
 */
export async function saveGeocodingSetting(
  port: GeocodingSettingPort,
  mode: GeocodingPreference,
): Promise<void> {
  await port.write(JSON.stringify({ mode }));
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const SETTING_FILE = "geocoding-setting.json";

/** 디렉터리를 연다. **지연 import다** — 웹·테스트 환경에서 무너지지 않게 한다. */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 기기의 설정 통로. `vision-setting-store.ts`의 `expoVisionSettingPort`와 같은 방식이다 */
export function expoGeocodingSettingPort(): GeocodingSettingPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SETTING_FILE);
      return file.exists ? file.textSync() : null;
    },

    /** 임시 파일에 쓰고 제자리로 옮긴다 — 쓰는 도중 죽어도 반쯤 쓰인 파일이 안 남는다. */
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

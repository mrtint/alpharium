/**
 * 장소명 설정의 영속화.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L1
 *       specs/017-diary-body-screen/data-model.md §7
 *       specs/029-writing-flow-simplification/contracts/settings-sections.md S3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`vision-setting-store.ts`와 같은 모양이다** — 기기에 닿는 자리이며
 * 판정을 하지 않는다. `expo-file-system`을 쓴다(새 의존 0개).
 *
 * **★ 029에서 2-상태(boolean)에서 3-상태로 바뀌었다.** 홈의 장소명 토글이
 * 사라지고(FR-001) 배선 계층이 자동 판정하므로(FR-011), `"auto"`(위치 권한
 * 있으면 켬)가 기본이다. `"on"`/`"off"`는 사용자가 명시적으로 고른 고정값.
 * 구형 `{enabled:boolean}` 파일은 읽을 때 `"on"`/`"off"`로 마이그레이션한다.
 *
 * **017 FR-005 정신 유지**: `"auto"` + 위치 권한 없음 = 이 기능 이전과 동일(꺼짐).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 스토어가 돌려주는 값. */
export type GeocodingPreference = "auto" | "on" | "off";

/** 설정이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface GeocodingSettingPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/**
 * 장소명 설정을 읽는다.
 *
 * **파일 없음·깨짐·통로 예외 전부 `"auto"`로 귀결된다.** 구형 `{enabled:true}`는
 * `"on"`, `{enabled:false}`는 `"off"`로 마이그레이션한다.
 */
export async function loadGeocodingSetting(
  port: GeocodingSettingPort,
): Promise<GeocodingPreference> {
  try {
    const raw = await port.read();
    if (raw === null) return "auto";

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return "auto";

    const mode = (parsed as { mode?: unknown }).mode;
    if (mode === "auto" || mode === "on" || mode === "off") return mode;

    // 구형 {enabled:boolean} 마이그레이션.
    const enabled = (parsed as { enabled?: unknown }).enabled;
    if (typeof enabled === "boolean") return enabled ? "on" : "off";

    return "auto";
  } catch {
    return "auto";
  }
}

/**
 * 장소명 설정을 담는다.
 *
 * **설정 말고 아무것도 담지 않는다**(원칙 III·IV) — 좌표·장소 이름은 이
 * 파일이 아니라 각 일기(`DiaryEntry.placeName`)에 담긴다. `{mode}` 자리 하나뿐.
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
      return file.exists ? file.text() : null;
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

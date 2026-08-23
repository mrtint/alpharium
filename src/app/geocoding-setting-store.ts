/**
 * 장소명 설정의 영속화.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L1
 *       specs/017-diary-body-screen/data-model.md §7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`vision-setting-store.ts`와 같은 모양이다** — 기기에 닿는 자리이며
 * 판정을 하지 않는다. `expo-file-system`을 쓴다(새 의존 0개).
 *
 * **`vision-setting`과 다른 점**: 장소명은 「고른 적 없음」과 「껐음」을
 * 화면에서 구분해 보여줄 이유가 없다 — 꺼짐이 기본값이므로(FR-004), 꺼짐
 * 화면은 이 기능 이전과 완전히 같아야 한다(FR-005). 그래서 `null`이 아니라
 * `boolean`을 돌려준다 — 읽기 실패도 꺼짐으로 귀결된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 설정이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface GeocodingSettingPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/**
 * 장소명 설정을 읽는다.
 *
 * **파일 없음·깨짐·통로 예외 전부 꺼짐(`false`)으로 귀결된다.** 설정을
 * 지어내지 않으면서도, 「고른 적 없음」을 화면에서 별도로 표시할 필요가
 * 없으므로 이 단순화가 안전하다(vision-setting과 다른 판단).
 */
export async function loadGeocodingSetting(port: GeocodingSettingPort): Promise<boolean> {
  try {
    const raw = await port.read();
    if (raw === null) return false;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return false;

    const enabled = (parsed as { enabled?: unknown }).enabled;
    return typeof enabled === "boolean" ? enabled : false;
  } catch {
    return false;
  }
}

/**
 * 장소명 설정을 담는다.
 *
 * **설정 말고 아무것도 담지 않는다**(원칙 III·IV) — 좌표·장소 이름은 이
 * 파일이 아니라 각 일기(`DiaryEntry.placeName`)에 담긴다.
 */
export async function saveGeocodingSetting(
  port: GeocodingSettingPort,
  enabled: boolean,
): Promise<void> {
  await port.write(JSON.stringify({ enabled }));
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

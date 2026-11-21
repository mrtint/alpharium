import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadGeocodingSetting,
  saveGeocodingSetting,
  type GeocodingPreference,
  type GeocodingSettingPort,
} from "../../src/app/geocoding-setting-store";

/**
 * 장소 이름 설정 영속화의 계약 테스트.
 *
 * 계약: specs/121-richer-day-places/contracts/diary-places.md ST1 (017 L1, 029 S3를 이었다)
 *
 * 121에서 두 갈래(`"on"|"off"`)로 줄었다 — 장소 이름을 기기 안에서 찾아 위치 권한을 볼 이유가 없어졌다. 파일 없음·깨짐
 * → `"on"`. 옛 `"auto"` → `"on"`. 구형 `{enabled:boolean}` → `"on"`/`"off"`.
 */

function memoryPort(
  initial: string | null = null,
): GeocodingSettingPort & { stored: string | null } {
  return {
    stored: initial,
    async read() {
      return this.stored;
    },
    async write(serialized: string) {
      this.stored = serialized;
    },
  };
}

describe("왕복 — 담고 꺼낸다 (L1, ST2)", () => {
  it.each(["on", "off"] as const)("%s를 담고 그대로 꺼낸다", async (mode) => {
    const port = memoryPort();
    await saveGeocodingSetting(port, mode);

    expect(await loadGeocodingSetting(port)).toBe(mode);
  });

  it("나중에 담은 것이 남는다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, "on");
    await saveGeocodingSetting(port, "off");

    expect(await loadGeocodingSetting(port)).toBe("off");
  });
});

/**
 * ★ 읽기 실패·파일 없음 → `"on"` (121 ST1 — 처음 값이 「켬」이다).
 */
describe('읽기 실패는 "on"이다 (ST1)', () => {
  it('담은 적이 없으면 "on"', async () => {
    expect(await loadGeocodingSetting(memoryPort())).toBe("on");
  });

  it('옛 "auto"는 "on"으로 옮긴다', async () => {
    expect(await loadGeocodingSetting(memoryPort('{"mode":"auto"}'))).toBe("on");
  });

  it.each([
    ["깨진 JSON", "{{{"],
    ["빈 문자열", ""],
    ["객체가 아님", '"on"'],
    ["null", "null"],
    ["자리가 없음", "{}"],
    ["mode가 둘 밖", '{"mode":"maybe"}'],
    ["mode가 숫자", '{"mode":1}'],
  ])('%s이면 처음 값 "on"', async (_label, raw) => {
    expect(await loadGeocodingSetting(memoryPort(raw))).toBe("on");
  });

  it('통로가 던져도 "on"이며 앱을 죽이지 않는다', async () => {
    const broken: GeocodingSettingPort = {
      async read() {
        throw new Error("읽지 못했다");
      },
      async write() {},
    };

    await expect(loadGeocodingSetting(broken)).resolves.toBe("on");
  });
});

/**
 * ★ 구형 {enabled:boolean} 마이그레이션 (SS10).
 */
describe("구형 파일 마이그레이션 (SS10)", () => {
  it('{"enabled":true} → "on"', async () => {
    expect(await loadGeocodingSetting(memoryPort('{"enabled":true}'))).toBe("on");
  });

  it('{"enabled":false} → "off"', async () => {
    expect(await loadGeocodingSetting(memoryPort('{"enabled":false}'))).toBe("off");
  });

  it('{"enabled":"true"} (문자열) → 처음 값 "on"', async () => {
    expect(await loadGeocodingSetting(memoryPort('{"enabled":"true"}'))).toBe("on");
  });
});

describe("설정 말고 아무것도 담지 않는다 (원칙 III·IV)", () => {
  it("담긴 것이 mode 자리 하나뿐이다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, "on");

    const parsed = JSON.parse(port.stored ?? "{}");
    expect(Object.keys(parsed)).toEqual(["mode"]);
  });

  it("좌표·장소 이름이 담기지 않는다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, "on");

    expect(port.stored).not.toMatch(/latitude|longitude|placeName/i);
  });
});

describe("vision-setting과 섞이지 않는다", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/app/geocoding-setting-store.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("파일 이름이 다르다", () => {
    expect(CODE).toContain("geocoding-setting.json");
    expect(CODE).not.toContain("vision-setting.json");
  });

  it("expo-file-system을 쓴다 — AsyncStorage가 아니다", () => {
    expect(CODE).toContain("expo-file-system");
    expect(CODE).not.toMatch(/AsyncStorage|async-storage/);
  });
});

// 타입 존재 확인 (tsc).
const _pref: GeocodingPreference = "on";
void _pref;

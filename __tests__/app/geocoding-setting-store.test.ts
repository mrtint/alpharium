import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadGeocodingSetting,
  saveGeocodingSetting,
  type GeocodingPreference,
  type GeocodingSettingPort,
} from "../../src/app/geocoding-setting-store";

/**
 * 장소명 설정 영속화의 계약 테스트.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L1
 *       specs/029-writing-flow-simplification/contracts/settings-sections.md S3 (ST2)
 *
 * 029에서 2-상태(boolean)에서 3-상태(`"auto"|"on"|"off"`)로 바뀌었다. 파일
 * 없음·깨짐 → `"auto"`. 구형 `{enabled:boolean}` → `"on"`/`"off"` 마이그레이션.
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
  it.each(["auto", "on", "off"] as const)("%s를 담고 그대로 꺼낸다", async (mode) => {
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
 * ★ 읽기 실패·파일 없음 → `"auto"` (029, S3/SS10).
 */
describe('읽기 실패는 "auto"다 (SS10)', () => {
  it('담은 적이 없으면 "auto"', async () => {
    expect(await loadGeocodingSetting(memoryPort())).toBe("auto");
  });

  it.each([
    ["깨진 JSON", "{{{"],
    ["빈 문자열", ""],
    ["객체가 아님", '"on"'],
    ["null", "null"],
    ["자리가 없음", "{}"],
    ["mode가 셋 밖", '{"mode":"maybe"}'],
    ["mode가 숫자", '{"mode":1}'],
  ])('%s이면 "auto" — 설정을 지어내지 않는다', async (_label, raw) => {
    expect(await loadGeocodingSetting(memoryPort(raw))).toBe("auto");
  });

  it('통로가 던져도 "auto"이며 앱을 죽이지 않는다', async () => {
    const broken: GeocodingSettingPort = {
      async read() {
        throw new Error("읽지 못했다");
      },
      async write() {},
    };

    await expect(loadGeocodingSetting(broken)).resolves.toBe("auto");
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

  it('{"enabled":"true"} (문자열) → "auto"', async () => {
    expect(await loadGeocodingSetting(memoryPort('{"enabled":"true"}'))).toBe("auto");
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
const _pref: GeocodingPreference = "auto";
void _pref;

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadGeocodingSetting,
  saveGeocodingSetting,
  type GeocodingSettingPort,
} from "../../src/app/geocoding-setting-store";

/**
 * 장소명 설정 영속화의 계약 테스트.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L1
 *       specs/017-diary-body-screen/data-model.md §7
 *
 * **`vision-setting-store.test.ts`와 같은 구조다** — 다만 장소명은
 * 「고른 적 없음」과 「껐음」을 화면에서 구분해 보여줄 이유가 없다(꺼짐이
 * 기본값이므로, data-model.md §7). 그래서 `loadVisionSetting`처럼
 * `null`을 돌려주지 않고 `boolean`을 돌려준다.
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

describe("왕복 — 담고 꺼낸다 (L1)", () => {
  it("켜짐을 담고 그대로 꺼낸다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, true);

    expect(await loadGeocodingSetting(port)).toBe(true);
  });

  it("꺼짐을 담고 그대로 꺼낸다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, false);

    expect(await loadGeocodingSetting(port)).toBe(false);
  });

  it("나중에 담은 것이 남는다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, true);
    await saveGeocodingSetting(port, false);

    expect(await loadGeocodingSetting(port)).toBe(false);
  });
});

/**
 * ★ 읽기 실패(파일 없음·깨짐)는 꺼짐으로 귀결된다 (L1, FR-004).
 *
 * **`loadVisionSetting()`과 다른 점**: 장소명은 「고른 적 없음」과 「껐음」을
 * 화면에서 구분해 보여줄 이유가 없다 — 꺼짐 화면은 이 기능 이전과 완전히
 * 같아야 하기 때문이다(FR-005).
 */
describe("읽기 실패는 꺼짐이다 (L1)", () => {
  it("담은 적이 없으면 꺼짐(false)", async () => {
    expect(await loadGeocodingSetting(memoryPort())).toBe(false);
  });

  it.each([
    ["깨진 JSON", "{{{"],
    ["빈 문자열", ""],
    ["객체가 아님", '"true"'],
    ["null", "null"],
    ["자리가 없음", "{}"],
    ["값이 문자열", '{"enabled":"true"}'],
  ])("%s이면 꺼짐 — 설정을 지어내지 않는다", async (_label, raw) => {
    expect(await loadGeocodingSetting(memoryPort(raw))).toBe(false);
  });

  it("통로가 던져도 꺼짐이며 앱을 죽이지 않는다", async () => {
    const broken: GeocodingSettingPort = {
      async read() {
        throw new Error("읽지 못했다");
      },
      async write() {},
    };

    await expect(loadGeocodingSetting(broken)).resolves.toBe(false);
  });
});

describe("설정 말고 아무것도 담지 않는다 (원칙 III·IV)", () => {
  it("담긴 것이 자리 하나뿐이다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, true);

    const parsed = JSON.parse(port.stored ?? "{}");
    expect(Object.keys(parsed)).toEqual(["enabled"]);
  });

  it("좌표·장소 이름이 담기지 않는다", async () => {
    const port = memoryPort();
    await saveGeocodingSetting(port, true);

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

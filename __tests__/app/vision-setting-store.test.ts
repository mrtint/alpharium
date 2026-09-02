import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadVisionSetting,
  saveVisionSetting,
  type VisionPreference,
  type VisionSettingPort,
} from "../../src/app/vision-setting-store";
import { VISION_SETTINGS } from "../../src/diary/types";

/**
 * 사진 설정 영속화의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-017·018
 *       specs/029-writing-flow-simplification/contracts/settings-sections.md S2 (ST1)
 *
 * 029에서 기본값이 「보지 않음(null)」에서 「자동」으로 바뀌었다. 반환 타입은
 * `"auto" | VisionSetting` — 명시적으로 고른 값만 그대로, 나머지는 전부 "auto".
 */

/** 메모리 통로. 기기 없이 왕복을 검증한다 */
function memoryPort(initial: string | null = null): VisionSettingPort & { stored: string | null } {
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

describe("왕복 — 담고 꺼낸다 (FR-017, ST1)", () => {
  it.each(VISION_SETTINGS)("%s를 담고 그대로 꺼낸다", async (setting) => {
    const port = memoryPort();
    await saveVisionSetting(port, setting);

    expect(await loadVisionSetting(port)).toBe(setting);
  });

  it('"auto"를 담고 그대로 꺼낸다', async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "auto");

    expect(await loadVisionSetting(port)).toBe("auto");
  });

  it("나중에 담은 것이 남는다", async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "quick");
    await saveVisionSetting(port, "detailed");

    expect(await loadVisionSetting(port)).toBe("detailed");
  });

  it('"auto"에서 고정값으로, 다시 "auto"로 왕복된다', async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "none");
    expect(await loadVisionSetting(port)).toBe("none");
    await saveVisionSetting(port, "auto");
    expect(await loadVisionSetting(port)).toBe("auto");
  });
});

/**
 * ★ 고른 적이 없으면 `"auto"`다 (029, S2/SS6).
 *
 * 「보지 않음」을 명시적으로 고른 것(`{vision:"none"}`)과 고른 적 없는 것("auto")은
 * 여전히 구분된다 — 004가 `none`/`unknown`을 가른 것과 같은 판단이다.
 */
describe('모르면 "auto"다 (원칙 V, SS6)', () => {
  it('담은 적이 없으면 "auto"', async () => {
    expect(await loadVisionSetting(memoryPort())).toBe("auto");
  });

  it('{auto:true}면 "auto"', async () => {
    expect(await loadVisionSetting(memoryPort('{"auto":true}'))).toBe("auto");
  });

  it('「보지 않음」을 고른 것과 "auto"가 구분된다', async () => {
    const chosen = memoryPort();
    await saveVisionSetting(chosen, "none");

    expect(await loadVisionSetting(chosen)).toBe("none");
    expect(await loadVisionSetting(memoryPort())).toBe("auto");
  });

  it.each([
    ["깨진 JSON", "{{{"],
    ["빈 문자열", ""],
    ["객체가 아님", '"quick"'],
    ["null", "null"],
    ["자리가 없음", "{}"],
    ["셋 밖의 값", '{"vision":"deep"}'],
    ["값이 숫자", '{"vision":1}'],
    ["다른 자리", '{"character":"quiet"}'],
    ["auto가 false", '{"auto":false}'],
  ])('%s이면 "auto" — 설정을 지어내지 않는다', async (_label, raw) => {
    expect(await loadVisionSetting(memoryPort(raw))).toBe("auto");
  });

  it('통로가 던져도 "auto"이며 앱을 죽이지 않는다', async () => {
    const broken: VisionSettingPort = {
      async read() {
        throw new Error("읽지 못했다");
      },
      async write() {},
    };

    await expect(loadVisionSetting(broken)).resolves.toBe("auto");
  });
});

/**
 * 원칙 III·IV — 담기는 것이 설정 하나뿐이다.
 */
describe("설정 말고 아무것도 담지 않는다 (원칙 III·IV)", () => {
  it("고정값은 vision 자리 하나뿐이다", async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "quick");

    const parsed = JSON.parse(port.stored ?? "{}");
    expect(Object.keys(parsed)).toEqual(["vision"]);
  });

  it('"auto"는 auto 자리 하나뿐이다', async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "auto");

    const parsed = JSON.parse(port.stored ?? "{}");
    expect(Object.keys(parsed)).toEqual(["auto"]);
  });

  it("모델 정보·시간·토큰 수가 담기지 않는다", async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "detailed");

    expect(port.stored).not.toMatch(/LFM|mmproj|gguf|token|ms|elapsed|1024|256/i);
  });

  it("담긴 것이 짧다 — 한 줄이다", async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "quick");

    expect(port.stored).toBe('{"vision":"quick"}');
  });
});

describe("007의 캐릭터 선택과 섞이지 않는다 + 타입 불변 (S5·ST6)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/app/vision-setting-store.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const TYPES = readFileSync(join(__dirname, "../../src/diary/types.ts"), "utf8");

  it("파일 이름이 다르다 — 한쪽을 고칠 때 다른 쪽이 지워지지 않는다", () => {
    expect(CODE).toContain("vision-setting.json");
    expect(CODE).not.toContain("selected-character.json");
  });

  it("캐릭터에 닿지 않는다", () => {
    expect(CODE).not.toMatch(/\bCharacter\b/);
    expect(CODE).not.toMatch(/quiet|narrative|imaginative/);
  });

  // SC-015 — 새 의존을 들이지 않는다.
  it("expo-file-system을 쓴다 — AsyncStorage가 아니다", () => {
    expect(CODE).toContain("expo-file-system");
    expect(CODE).not.toMatch(/AsyncStorage|async-storage/);
  });

  // ST6 — VisionSetting 타입에 "auto"가 추가되지 않는다 (원칙 II).
  it('VISION_SETTINGS에 "auto"가 없다', () => {
    const line = TYPES.split(/\r?\n/).find((l) => l.includes("VISION_SETTINGS"));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/auto/);
    expect(TYPES).not.toMatch(/VisionSetting\s*=\s*[^;]*"auto"/);
  });
});

// 타입이 존재하는지 (컴파일 타임 확인 — tsc가 잡는다).
const _pref: VisionPreference = "auto";
void _pref;

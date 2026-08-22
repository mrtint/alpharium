import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadVisionSetting,
  saveVisionSetting,
  type VisionSettingPort,
} from "../../src/app/vision-setting-store";
import { VISION_SETTINGS } from "../../src/diary/types";

/**
 * 사진 설정 영속화의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-017·018
 *
 * 007의 `selection-store.test.ts`와 같은 구조다.
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

describe("왕복 — 담고 꺼낸다 (FR-017)", () => {
  it.each(VISION_SETTINGS)("%s를 담고 그대로 꺼낸다", async (setting) => {
    const port = memoryPort();
    await saveVisionSetting(port, setting);

    expect(await loadVisionSetting(port)).toBe(setting);
  });

  it("나중에 담은 것이 남는다", async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "quick");
    await saveVisionSetting(port, "detailed");

    expect(await loadVisionSetting(port)).toBe("detailed");
  });
});

/**
 * ★ 고른 적이 없으면 `null`이다 (FR-018).
 *
 * **「보지 않음」으로 여기서 바꾸지 않는다.** 「고른 적이 없다」와 「보지 않음을 골랐다」는
 * 다른 사실이며, 화면이 그것을 구분할 수 있어야 한다 — 004가 `none`/`unknown`을 가른
 * 것과 같은 판단이다.
 */
describe("모르면 null이다 (원칙 V)", () => {
  it("담은 적이 없으면 null", async () => {
    expect(await loadVisionSetting(memoryPort())).toBeNull();
  });

  it("「보지 않음」을 고른 것과 고른 적 없는 것이 구분된다", async () => {
    const chosen = memoryPort();
    await saveVisionSetting(chosen, "none");

    expect(await loadVisionSetting(chosen)).toBe("none");
    expect(await loadVisionSetting(memoryPort())).toBeNull();
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
  ])("%s이면 null — 설정을 지어내지 않는다", async (_label, raw) => {
    expect(await loadVisionSetting(memoryPort(raw))).toBeNull();
  });

  it("통로가 던져도 null이며 앱을 죽이지 않는다", async () => {
    const broken: VisionSettingPort = {
      async read() {
        throw new Error("읽지 못했다");
      },
      async write() {},
    };

    await expect(loadVisionSetting(broken)).resolves.toBeNull();
  });
});

/**
 * 원칙 III·IV — 담기는 것이 설정 하나뿐이다.
 *
 * 007의 캐릭터 선택 파일이 `{"character":"quiet"}` 한 줄뿐인 것과 같다.
 */
describe("설정 말고 아무것도 담지 않는다 (원칙 III·IV)", () => {
  it("담긴 것이 자리 하나뿐이다", async () => {
    const port = memoryPort();
    await saveVisionSetting(port, "quick");

    const parsed = JSON.parse(port.stored ?? "{}");
    expect(Object.keys(parsed)).toEqual(["vision"]);
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

describe("007의 캐릭터 선택과 섞이지 않는다", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/app/vision-setting-store.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

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
});

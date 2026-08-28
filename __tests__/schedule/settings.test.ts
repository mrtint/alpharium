import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_AUTO_DIARY_SETTINGS,
  loadAutoDiarySettings,
  saveAutoDiarySettings,
  type AutoDiarySettings,
  type AutoDiarySettingsPort,
} from "../../src/schedule/settings";

/**
 * 자동 생성 설정 영속화의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S1·S3·S4·S7·S8
 *       specs/020-scheduled-diary-notification/data-model.md §1
 *
 * **007의 `selection-store.test.ts`·017의 `geocoding-setting-store.test.ts`와
 * 같은 구조다** — 다만 자동 생성 설정은 「고른 적 없음」을 화면에서 구분해
 * 보여줄 이유가 없다(꺼짐이 기본값). 그래서 `loadSelection`처럼 `null`을
 * 돌려주지 않고 **항상 `AutoDiarySettings`를 돌려준다**(S3).
 */

function memoryPort(
  initial: string | null = null,
): AutoDiarySettingsPort & { stored: string | null } {
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

describe("왕복 — 담고 꺼낸다 (S3)", () => {
  it("설정을 담고 그대로 꺼낸다", async () => {
    const port = memoryPort();
    const settings: AutoDiarySettings = {
      enabled: true,
      targetHour: 9,
      batteryExceptionPrompted: true,
    };
    await saveAutoDiarySettings(port, settings);

    expect(await loadAutoDiarySettings(port)).toEqual(settings);
  });

  it("나중에 담은 것이 남는다", async () => {
    const port = memoryPort();
    await saveAutoDiarySettings(port, {
      enabled: true,
      targetHour: 7,
      batteryExceptionPrompted: false,
    });
    await saveAutoDiarySettings(port, {
      enabled: false,
      targetHour: 22,
      batteryExceptionPrompted: true,
    });

    expect(await loadAutoDiarySettings(port)).toEqual({
      enabled: false,
      targetHour: 22,
      batteryExceptionPrompted: true,
    });
  });
});

/**
 * ★ load는 항상 값을 돌려준다 — never null (S3).
 *
 * 007의 `loadSelection()`이 "모르면 null"인 것과 다르다. geocoding 설정처럼
 * 명시적 기본값이 있는 설정이다.
 */
describe("읽기 실패는 기본값이다 (S3)", () => {
  it("기본값이 { enabled: false, targetHour: 7, batteryExceptionPrompted: false }", () => {
    expect(DEFAULT_AUTO_DIARY_SETTINGS).toEqual({
      enabled: false,
      targetHour: 7,
      batteryExceptionPrompted: false,
    });
  });

  it("담은 적이 없으면 기본값", async () => {
    expect(await loadAutoDiarySettings(memoryPort())).toEqual(DEFAULT_AUTO_DIARY_SETTINGS);
  });

  it.each([
    ["깨진 JSON", "{{{"],
    ["빈 문자열", ""],
    ["객체가 아님", '"true"'],
    ["null", "null"],
  ])("%s이면 기본값 — 설정을 지어내지 않는다", async (_label, raw) => {
    expect(await loadAutoDiarySettings(memoryPort(raw))).toEqual(DEFAULT_AUTO_DIARY_SETTINGS);
  });

  it("통로가 던져도 기본값이며 앱을 죽이지 않는다", async () => {
    const broken: AutoDiarySettingsPort = {
      async read() {
        throw new Error("읽지 못했다");
      },
      async write() {},
    };
    await expect(loadAutoDiarySettings(broken)).resolves.toEqual(DEFAULT_AUTO_DIARY_SETTINGS);
  });
});

/**
 * ★ 부분 손상에 관대하다 (S3).
 *
 * `targetHour`가 0–23 정수가 아니면 그 필드만 7로, 나머지는 살린다.
 * `enabled`/`batteryExceptionPrompted`가 boolean이 아니면 false.
 */
describe("부분 손상 — 나쁜 필드만 대체하고 나머지는 살린다 (S3)", () => {
  it.each([
    ["25 (범위 밖)", 25],
    ["-1 (음수)", -1],
    ["7.5 (정수 아님)", 7.5],
    ['"7" (문자열)', "7"],
    ["null", null],
  ])("targetHour가 %s이면 7로 대체, enabled는 살린다", async (_label, badHour) => {
    const raw = JSON.stringify({
      enabled: true,
      targetHour: badHour,
      batteryExceptionPrompted: true,
    });
    const loaded = await loadAutoDiarySettings(memoryPort(raw));
    expect(loaded.targetHour).toBe(7);
    expect(loaded.enabled).toBe(true);
    expect(loaded.batteryExceptionPrompted).toBe(true);
  });

  it.each([
    ['"true" (문자열)', "true"],
    ["1 (숫자)", 1],
    ["null", null],
  ])("enabled가 %s이면 false로 대체, targetHour는 살린다", async (_label, badEnabled) => {
    const raw = JSON.stringify({
      enabled: badEnabled,
      targetHour: 9,
      batteryExceptionPrompted: true,
    });
    const loaded = await loadAutoDiarySettings(memoryPort(raw));
    expect(loaded.enabled).toBe(false);
    expect(loaded.targetHour).toBe(9);
  });

  it("batteryExceptionPrompted가 boolean이 아니면 false", async () => {
    const raw = JSON.stringify({ enabled: true, targetHour: 8, batteryExceptionPrompted: "yes" });
    const loaded = await loadAutoDiarySettings(memoryPort(raw));
    expect(loaded.batteryExceptionPrompted).toBe(false);
  });

  it("targetHour 경계값 0과 23은 그대로 유지된다", async () => {
    for (const hour of [0, 23]) {
      const raw = JSON.stringify({
        enabled: true,
        targetHour: hour,
        batteryExceptionPrompted: false,
      });
      expect((await loadAutoDiarySettings(memoryPort(raw))).targetHour).toBe(hour);
    }
  });
});

/**
 * ★ 소스 검사 — 실행 이력 필드를 두지 않는다 (S7, 원칙 IV).
 *
 * `lastRunAt` 같은 "마지막 실행 시각" 필드가 생기는 순간 실행 이력 로그로
 * 자란다. 스케줄 판정은 매번 `store.listDays()`(일기 존재 여부)로 충분하다.
 */
describe("실행 이력을 담지 않는다 (S7, 원칙 IV)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/settings.ts"), "utf8");

  it("소스에 lastRunAt / lastRun / ranAt 류 필드가 없다", () => {
    expect(SOURCE).not.toMatch(/lastRunAt|lastRun\b|ranAt|lastTriggeredAt|runHistory/i);
  });

  it("저장된 설정에 필드가 셋뿐이다", async () => {
    const port = memoryPort();
    await saveAutoDiarySettings(port, {
      enabled: true,
      targetHour: 7,
      batteryExceptionPrompted: false,
    });
    const parsed = JSON.parse(port.stored ?? "{}");
    expect(Object.keys(parsed).sort()).toEqual([
      "batteryExceptionPrompted",
      "enabled",
      "targetHour",
    ]);
  });

  it("캐릭터·모델 정보가 담기지 않는다 (원칙 III)", async () => {
    const port = memoryPort();
    await saveAutoDiarySettings(port, {
      enabled: true,
      targetHour: 7,
      batteryExceptionPrompted: false,
    });
    expect(port.stored).not.toMatch(/character|model|gguf|kanana|exaone/i);
  });
});

describe("기기 통로 — 007·017과 같은 자리 (S4)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/settings.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("preferences/auto-diary.json에 둔다 — selection-store와 같은 디렉터리", () => {
    expect(CODE).toContain("preferences");
    expect(CODE).toContain("auto-diary.json");
  });

  it("expo-file-system을 쓴다 — AsyncStorage가 아니다", () => {
    expect(CODE).toContain("expo-file-system");
    expect(CODE).not.toMatch(/AsyncStorage|async-storage/);
  });

  it(".writing 임시 파일 + moveSync 패턴을 쓴다", () => {
    expect(CODE).toMatch(/\.writing/);
    expect(CODE).toContain("moveSync");
  });
});

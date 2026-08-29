import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_ONBOARDING_FLAG,
  loadOnboardingFlag,
  saveOnboardingFlag,
  type OnboardingFlagPort,
} from "../../src/onboarding/flag";

/**
 * 온보딩 완료 플래그의 계약 테스트.
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-flag.md
 *       F1·F3·F4·F5
 *       spec.md FR-009·FR-010·FR-010a·FR-011·FR-012, 원칙 IV
 *
 * 020의 `notified-store.ts`·`settings.ts`와 같은 모양(순수 로드/세이브 + 기기 통로).
 */

/** 메모리 통로. read/write에 더해 시드용 readAutoDiaryRaw를 갖는다. */
function memoryPort(
  initial: string | null,
  autoDiaryRaw: string | null,
): OnboardingFlagPort & { stored: string | null; autoDiaryReads: number } {
  const box = { stored: initial, autoDiaryReads: 0 };
  return {
    stored: box.stored,
    get autoDiaryReads() {
      return box.autoDiaryReads;
    },
    async read() {
      return box.stored;
    },
    async write(serialized: string) {
      box.stored = serialized;
      this.stored = serialized;
    },
    async readAutoDiaryRaw() {
      box.autoDiaryReads += 1;
      return autoDiaryRaw;
    },
  };
}

describe("F4 — 시드 (FR-010a)", () => {
  it("onboarding.json 없음 + auto-diary batteryExceptionPrompted:true → batteryNoticeShown:true", async () => {
    const port = memoryPort(
      null,
      JSON.stringify({ enabled: false, targetHour: 7, batteryExceptionPrompted: true }),
    );
    const flag = await loadOnboardingFlag(port);
    expect(flag).toEqual({ completed: false, batteryNoticeShown: true });
  });

  it("onboarding.json 없음 + auto-diary 없음 → 기본값", async () => {
    const port = memoryPort(null, null);
    expect(await loadOnboardingFlag(port)).toEqual(DEFAULT_ONBOARDING_FLAG);
  });

  it("onboarding.json 없음 + batteryExceptionPrompted:false → 기본값", async () => {
    const port = memoryPort(
      null,
      JSON.stringify({ enabled: true, targetHour: 9, batteryExceptionPrompted: false }),
    );
    expect(await loadOnboardingFlag(port)).toEqual(DEFAULT_ONBOARDING_FLAG);
  });

  it("onboarding.json 없음 + auto-diary가 깨진 JSON → 기본값 (예외 안 던짐)", async () => {
    const port = memoryPort(null, "{not json");
    expect(await loadOnboardingFlag(port)).toEqual(DEFAULT_ONBOARDING_FLAG);
  });

  it("onboarding.json 있으면 auto-diary를 읽지 않는다 (1회성)", async () => {
    const port = memoryPort(
      JSON.stringify({ completed: true, batteryNoticeShown: false }),
      JSON.stringify({ batteryExceptionPrompted: true }),
    );
    const flag = await loadOnboardingFlag(port);
    expect(flag).toEqual({ completed: true, batteryNoticeShown: false });
    expect(port.autoDiaryReads).toBe(0);
  });
});

describe("F3 — loadOnboardingFlag 부분 손상 관대", () => {
  it("completed가 boolean이 아니면 그 필드만 false", async () => {
    const port = memoryPort(JSON.stringify({ completed: "yes", batteryNoticeShown: true }), null);
    expect(await loadOnboardingFlag(port)).toEqual({ completed: false, batteryNoticeShown: true });
  });

  it("깨진 JSON → 기본값", async () => {
    const port = memoryPort("{{{", null);
    expect(await loadOnboardingFlag(port)).toEqual(DEFAULT_ONBOARDING_FLAG);
  });

  it("배열이면 → 기본값", async () => {
    const port = memoryPort("[]", null);
    expect(await loadOnboardingFlag(port)).toEqual(DEFAULT_ONBOARDING_FLAG);
  });
});

describe("F3 — saveOnboardingFlag", () => {
  it("두 필드만 직렬화한다", async () => {
    const port = memoryPort(null, null);
    await saveOnboardingFlag(port, {
      completed: true,
      batteryNoticeShown: true,
      // @ts-expect-error — 여분 필드는 버려져야 한다
      extra: 1,
    });
    expect(JSON.parse(port.stored!)).toEqual({ completed: true, batteryNoticeShown: true });
  });

  it("save 후 load하면 같은 값이 나온다", async () => {
    const port = memoryPort(null, null);
    await saveOnboardingFlag(port, { completed: true, batteryNoticeShown: false });
    expect(await loadOnboardingFlag(port)).toEqual({ completed: true, batteryNoticeShown: false });
  });
});

describe("F5 — 소스 검사 (원칙 IV 경계)", () => {
  const FLAG_SRC = readFileSync(join(__dirname, "../../src/onboarding/flag.ts"), "utf8");
  const FLAG_CODE = FLAG_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const PORT_SRC = readFileSync(join(__dirname, "../../src/onboarding/flag-port.ts"), "utf8");
  const PORT_CODE = PORT_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("flag.ts에 이력 토큰(Date·timestamp·history·count·lastRun)이 없다", () => {
    expect(FLAG_CODE).not.toMatch(/\b(?:Date|timestamp|history|attemptCount|lastRun|count)\b/);
  });

  it("flag.ts·flag-port.ts가 schedule/를 import하지 않는다", () => {
    expect(FLAG_CODE).not.toMatch(/from\s+["'][^"']*schedule\//);
    expect(PORT_CODE).not.toMatch(/from\s+["'][^"']*schedule\//);
  });

  it("flag-port.ts가 auto-diary.json을 경로 하드코딩으로 읽는다", () => {
    expect(PORT_CODE).toContain("auto-diary.json");
    expect(PORT_CODE).toContain("preferences");
  });

  it("flag-port.ts가 expo-file-system을 쓴다 (AsyncStorage 아님)", () => {
    expect(PORT_CODE).toContain("expo-file-system");
    expect(PORT_CODE).not.toMatch(/AsyncStorage|async-storage/);
  });
});

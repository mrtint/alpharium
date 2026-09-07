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
    expect(flag).toEqual({ completed: false, batteryNoticeShown: true, welcomeShown: false });
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
      JSON.stringify({ completed: true, batteryNoticeShown: false, welcomeShown: false }),
      JSON.stringify({ batteryExceptionPrompted: true }),
    );
    const flag = await loadOnboardingFlag(port);
    expect(flag).toEqual({ completed: true, batteryNoticeShown: false, welcomeShown: false });
    expect(port.autoDiaryReads).toBe(0);
  });
});

describe("F3 — loadOnboardingFlag 부분 손상 관대", () => {
  it("completed가 boolean이 아니면 그 필드만 false", async () => {
    const port = memoryPort(JSON.stringify({ completed: "yes", batteryNoticeShown: true }), null);
    expect(await loadOnboardingFlag(port)).toEqual({
      completed: false,
      batteryNoticeShown: true,
      welcomeShown: false,
    });
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
  it("세 필드만 직렬화한다 (035에서 welcomeShown이 더해졌다)", async () => {
    const port = memoryPort(null, null);
    await saveOnboardingFlag(port, {
      completed: true,
      batteryNoticeShown: true,
      welcomeShown: true,
      // @ts-expect-error — 여분 필드는 버려져야 한다
      extra: 1,
    });
    expect(JSON.parse(port.stored!)).toEqual({
      completed: true,
      batteryNoticeShown: true,
      welcomeShown: true,
    });
  });

  it("save 후 load하면 같은 값이 나온다", async () => {
    const port = memoryPort(null, null);
    await saveOnboardingFlag(port, {
      completed: true,
      batteryNoticeShown: false,
      welcomeShown: false,
    });
    expect(await loadOnboardingFlag(port)).toEqual({
      completed: true,
      batteryNoticeShown: false,
      welcomeShown: false,
    });
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

/* ──────────────── 035 — 환영 연출 플래그 (welcome-gate.md W7·W8·W10) ──────────────── */

describe("W8 — welcomeShown이 없는 옛 파일은 「아직 안 봤다」", () => {
  it("021·029 시절 파일(키 없음)을 읽으면 false다", async () => {
    const port = memoryPort(JSON.stringify({ completed: true, batteryNoticeShown: true }), null);
    const flag = await loadOnboardingFlag(port);
    expect(flag.welcomeShown).toBe(false);
  });

  it("021 회귀 — 옛 필드 둘은 그대로 파싱된다", async () => {
    const port = memoryPort(JSON.stringify({ completed: true, batteryNoticeShown: true }), null);
    const flag = await loadOnboardingFlag(port);
    expect(flag.completed).toBe(true);
    expect(flag.batteryNoticeShown).toBe(true);
  });

  it("boolean이 아니면 그 필드만 false다 (부분 손상 관대)", async () => {
    const port = memoryPort(
      JSON.stringify({ completed: true, batteryNoticeShown: true, welcomeShown: "yes" }),
      null,
    );
    expect(await loadOnboardingFlag(port)).toEqual({
      completed: true,
      batteryNoticeShown: true,
      welcomeShown: false,
    });
  });

  it("기본값은 「안 봤다」다", () => {
    expect(DEFAULT_ONBOARDING_FLAG.welcomeShown).toBe(false);
  });

  it("auto-diary 시드 경로에서도 연출은 아직 안 본 것이다", async () => {
    const port = memoryPort(null, JSON.stringify({ batteryExceptionPrompted: true }));
    const flag = await loadOnboardingFlag(port);
    expect(flag).toEqual({ completed: false, batteryNoticeShown: true, welcomeShown: false });
  });

  it("직렬화 왕복에서 보존된다", async () => {
    const port = memoryPort(null, null);
    await saveOnboardingFlag(port, {
      completed: true,
      batteryNoticeShown: false,
      welcomeShown: true,
    });
    expect((await loadOnboardingFlag(port)).welcomeShown).toBe(true);
  });
});

describe("W7 — 진행 중 상태를 담지 않는다 (FR-009)", () => {
  const FLAG_CODE = readFileSync(join(__dirname, "../../src/onboarding/flag.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("단계·시도 상태 필드가 없다", () => {
    // 저장된 진행 상태는 곧 거짓이 된다(009가 「고른 하루를 파일에 남기지
    // 않는다」로 배운 것). 연출 도중 앱이 죽으면 처음부터 다시 한다.
    expect(FLAG_CODE).not.toMatch(
      /\b(?:welcomeStep|livenessChecked|checkAttempts|welcomePhase|retries)\b/,
    );
  });

  it("필드가 정확히 셋이다", () => {
    const declaration = FLAG_CODE.slice(
      FLAG_CODE.indexOf("export type OnboardingFlag"),
      FLAG_CODE.indexOf("export const DEFAULT_ONBOARDING_FLAG"),
    );
    const fields = [...declaration.matchAll(/^\s*(\w+):\s*boolean;/gm)].map((m) => m[1]);
    expect(new Set(fields)).toEqual(new Set(["completed", "batteryNoticeShown", "welcomeShown"]));
  });
});

describe("W10 — welcomeShown은 되돌아가지 않는다", () => {
  it("저장된 true는 다시 읽어도 true다", async () => {
    const port = memoryPort(
      JSON.stringify({ completed: true, batteryNoticeShown: true, welcomeShown: true }),
      null,
    );
    expect((await loadOnboardingFlag(port)).welcomeShown).toBe(true);
  });

  it("★ 온보딩을 다시 해도 welcomeShown이 유지된다", async () => {
    // 021의 [권한 안내 다시 보기]는 `completed`를 건드리지 않고 별도 상태
    // (`forceOnboarding`)를 쓴다. 그 경로로 온보딩을 다시 끝내도 이미 본
    // 연출이 되살아나면 안 된다 — OnboardingScreen이 flag.welcomeShown을
    // 그대로 넘기는 것이 그 방어다.
    const port = memoryPort(null, null);
    await saveOnboardingFlag(port, {
      completed: true,
      batteryNoticeShown: true,
      welcomeShown: true,
    });
    const reloaded = await loadOnboardingFlag(port);

    // 온보딩을 다시 끝낸 상황을 흉내 낸다(completed를 다시 true로 쓴다).
    await saveOnboardingFlag(port, { ...reloaded, completed: true });
    expect((await loadOnboardingFlag(port)).welcomeShown).toBe(true);
  });

  it("OnboardingScreen이 welcomeShown을 스스로 정하지 않는다", () => {
    // 온보딩을 끝냈다고 연출을 본 것이 아니다 — 순서가 온보딩 → 에셋 → 연출이다.
    const screen = readFileSync(join(__dirname, "../../src/ui/OnboardingScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(screen).toMatch(/welcomeShown:\s*flag\.welcomeShown/);
    expect(screen).not.toMatch(/welcomeShown:\s*(?:true|false)/);
  });
});

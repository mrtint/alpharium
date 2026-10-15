/**
 * 085 — 맞추기의 기본 조립.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RD1~RD4, RC7·FX3(`reminder-deps.ts` 몫)
 *       research R18·R19
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expoReminderDeps } from "../../src/schedule/reminder-deps";
import type { ReminderPort } from "../../src/schedule/reminder-port";

const port: ReminderPort = {
  scheduled: async () => [],
  schedule: async () => {},
  cancel: async () => {},
  presented: async () => [],
  dismiss: async () => {},
};

const settingsPort = (read: () => Promise<string | null>) => ({ read, write: async () => {} });
const namesPort = (read: () => Promise<string | null>) => ({
  read: jest.fn(read),
  write: async () => {},
});

describe("RD1 — prepare는 채널 보장이다", () => {
  it("ensureChannel을 부른다", async () => {
    const ensureChannel = jest.fn(async () => {});
    await expoReminderDeps({ reminderPort: port, notificationPort: { ensureChannel } }).prepare();
    expect(ensureChannel).toHaveBeenCalledTimes(1);
  });
});

describe("RD2 — 설정: 읽지 못함과 없음을 가른다", () => {
  it("read()가 던지면 던진다", async () => {
    const deps = expoReminderDeps({
      reminderPort: port,
      settingsPort: settingsPort(async () => {
        throw new Error("io");
      }),
    });
    await expect(deps.loadSettings()).rejects.toThrow();
  });

  it("깨진 JSON이면 던진다", async () => {
    const deps = expoReminderDeps({
      reminderPort: port,
      settingsPort: settingsPort(async () => "{nope"),
    });
    await expect(deps.loadSettings()).rejects.toThrow();
  });

  it("파일이 없으면 기본값(꺼짐, 22시)", async () => {
    const deps = expoReminderDeps({
      reminderPort: port,
      settingsPort: settingsPort(async () => null),
    });
    await expect(deps.loadSettings()).resolves.toEqual({ enabled: false, targetHour: 22 });
  });

  it("저장된 값을 읽는다", async () => {
    const deps = expoReminderDeps({
      reminderPort: port,
      settingsPort: settingsPort(async () => JSON.stringify({ enabled: true, targetHour: 7 })),
    });
    await expect(deps.loadSettings()).resolves.toEqual({ enabled: true, targetHour: 7 });
  });
});

describe("RD3 — 일기 목록", () => {
  it("store.listDays를 쓰고 실패는 던진다", async () => {
    const ok = expoReminderDeps({
      reminderPort: port,
      store: { listDays: async () => ["2026-10-14"] },
    });
    await expect(ok.listDiaryDays()).resolves.toEqual(["2026-10-14"]);
    const bad = expoReminderDeps({
      reminderPort: port,
      store: {
        listDays: async () => {
          throw new Error("io");
        },
      },
    });
    await expect(bad.listDiaryDays()).rejects.toThrow();
  });
});

describe("RD4 — 표시 이름", () => {
  const selection = (character: string | null) => ({
    read: async () => (character === null ? null : JSON.stringify({ character })),
    write: async () => {},
  });

  it("고른 캐릭터가 아직 없으면 홈과 같이 첫 실행 기본 캐릭터의 이름이다 (085 실기기 — 홈은 기본 캐릭터로 쓴다)", async () => {
    const deps = expoReminderDeps({
      reminderPort: port,
      selectionPort: selection(null),
      names: { quiet: "은동" },
    });
    await expect(deps.loadName()).resolves.toBe("은동");
  });

  it("names가 주어지면 이름 파일을 읽지 않는다", async () => {
    const names = namesPort(async () => JSON.stringify({ names: { quiet: "파일 이름" } }));
    const deps = expoReminderDeps({
      reminderPort: port,
      selectionPort: selection("quiet"),
      namesPort: names,
      names: { quiet: "은동" },
    });
    await expect(deps.loadName()).resolves.toBe("은동");
    expect(names.read).not.toHaveBeenCalled();
  });

  it("names가 undefined면 파일을 읽는다", async () => {
    const names = namesPort(async () => JSON.stringify({ names: { quiet: "은동" } }));
    const deps = expoReminderDeps({
      reminderPort: port,
      selectionPort: selection("quiet"),
      namesPort: names,
      names: undefined,
    });
    await expect(deps.loadName()).resolves.toBe("은동");
    expect(names.read).toHaveBeenCalled();
  });

  it("이름 파일 읽기가 던지면 기본 이름이다", async () => {
    const deps = expoReminderDeps({
      reminderPort: port,
      selectionPort: selection("quiet"),
      namesPort: namesPort(async () => {
        throw new Error("io");
      }),
    });
    const name = await deps.loadName();
    expect(typeof name).toBe("string");
    expect(name!.length).toBeGreaterThan(0);
  });
});

describe("RC7·FX3 — reminder-deps.ts 몫", () => {
  it("AppState·react-native·알림 권한 조회가 없다", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src/schedule/reminder-deps.ts"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/\bAppState\b/);
    expect(source).not.toMatch(/["']react-native["']/);
    expect(source).not.toMatch(/getPermission|getPermissionsAsync/);
  });
});

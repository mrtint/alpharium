import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadNotifiedState,
  pruneNotified,
  saveNotifiedState,
  type NotifiedState,
  type NotifiedStorePort,
} from "../../src/schedule/notified-store";

/**
 * 날짜별 알림 상태 저장의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S5·S8
 *       specs/020-scheduled-diary-notification/data-model.md §2
 *
 * **`DiaryEntry`와 분리된 상태다**(research.md §6, 원칙 III·IV 경계).
 * 이 상태는 일기의 속성이 아니라 이 기능의 UX 상태다.
 */

function memoryPort(initial: string | null = null): NotifiedStorePort & { stored: string | null } {
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

describe("왕복 — 담고 꺼낸다 (S5)", () => {
  it("상태를 담고 그대로 꺼낸다", async () => {
    const port = memoryPort();
    const state: NotifiedState = {
      "2026-08-27": {
        sentAt: "2026-08-28T07:10:00.000Z",
        acknowledged: false,
        notificationId: "n1",
      },
    };
    await saveNotifiedState(port, state);

    expect(await loadNotifiedState(port)).toEqual(state);
  });

  it("없으면 빈 맵이다", async () => {
    expect(await loadNotifiedState(memoryPort())).toEqual({});
  });

  it.each([
    ["깨진 JSON", "{{{"],
    ["빈 문자열", ""],
    ["배열", "[]"],
    ["null", "null"],
  ])("%s이면 빈 맵 — 상태를 지어내지 않는다", async (_label, raw) => {
    expect(await loadNotifiedState(memoryPort(raw))).toEqual({});
  });

  it("통로가 던져도 빈 맵이며 앱을 죽이지 않는다", async () => {
    const broken: NotifiedStorePort = {
      async read() {
        throw new Error("읽지 못했다");
      },
      async write() {},
    };
    await expect(loadNotifiedState(broken)).resolves.toEqual({});
  });
});

/**
 * ★ 손상된 엔트리는 무시한다 — 그 날짜는 "알린 적 없음" (S5).
 * 한 줄 손상이 전체를 막지 않는다.
 */
describe("손상된 엔트리는 무시한다 (S5)", () => {
  it("모양이 안 맞는 엔트리만 빠지고 나머지는 살아남는다", async () => {
    const raw = JSON.stringify({
      "2026-08-25": { sentAt: "2026-08-26T07:00:00.000Z", acknowledged: true, notificationId: "a" },
      "2026-08-26": { sentAt: 12345, acknowledged: "yes" }, // 손상
      "2026-08-27": "not-an-object", // 손상
    });
    const loaded = await loadNotifiedState(memoryPort(raw));
    expect(Object.keys(loaded)).toEqual(["2026-08-25"]);
  });
});

/**
 * ★ pruneNotified — 순수 함수, 날짜 문자열 비교만 (S5, 원칙 IV).
 *
 * `keepFrom`보다 사전순으로 작은(= 더 오래된) 날짜 엔트리를 잘라낸다.
 * **값이나 시간을 보지 않는다** — 날짜 문자열 비교만.
 */
describe("pruneNotified — 날짜 문자열만 본다 (S5, 원칙 IV)", () => {
  const state: NotifiedState = {
    "2026-08-01": { sentAt: "2026-08-02T07:00:00.000Z", acknowledged: true, notificationId: "old" },
    "2026-08-25": { sentAt: "2026-08-26T07:00:00.000Z", acknowledged: false, notificationId: "b" },
    "2026-08-27": { sentAt: "2026-08-28T07:00:00.000Z", acknowledged: false, notificationId: "c" },
  };

  it("keepFrom보다 오래된 날짜를 잘라낸다", () => {
    const pruned = pruneNotified(state, "2026-08-25");
    expect(Object.keys(pruned).sort()).toEqual(["2026-08-25", "2026-08-27"]);
  });

  it("keepFrom과 같은 날짜는 유지된다 (경계 포함)", () => {
    const pruned = pruneNotified(state, "2026-08-27");
    expect(Object.keys(pruned)).toEqual(["2026-08-27"]);
  });

  it("전부 keepFrom 이상이면 그대로다", () => {
    expect(pruneNotified(state, "2026-08-01")).toEqual(state);
  });

  it("원본을 변형하지 않는다 (순수)", () => {
    const before = JSON.stringify(state);
    pruneNotified(state, "2026-08-25");
    expect(JSON.stringify(state)).toBe(before);
  });

  it("소스가 엔트리 값(sentAt/acknowledged)을 보고 자르지 않는다", () => {
    const SOURCE = readFileSync(join(__dirname, "../../src/schedule/notified-store.ts"), "utf8");
    // pruneNotified 함수 본문만 뽑아 검사
    const fnMatch = SOURCE.match(/export function pruneNotified[\s\S]*?\n}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch?.[0] ?? "";
    expect(body).not.toMatch(/\.sentAt|\.acknowledged|Date\.|getTime|\.notificationId/);
  });
});

describe("기기 통로 — preferences/notified.json (S5)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/notified-store.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("preferences/notified.json에 둔다 — diary/ 밖", () => {
    expect(CODE).toContain("preferences");
    expect(CODE).toContain("notified.json");
    expect(CODE).not.toMatch(/["']diary["']/);
  });

  it("expo-file-system을 쓴다", () => {
    expect(CODE).toContain("expo-file-system");
    expect(CODE).not.toMatch(/AsyncStorage|async-storage/);
  });
});

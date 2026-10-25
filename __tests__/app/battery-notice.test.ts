/**
 * 104 — 홈 배터리 안내를 보일지 정하는 판정 (순수).
 *
 * 계약: specs/104-battery-exception-awareness/contracts/home-notice.md BN1~BN4
 *       spec.md FR-011·FR-012
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BATTERY_NOTICE_HIDE_MS, shouldShowBatteryNotice } from "../../src/app/battery-notice";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 24, 12, 0);
const base = {
  platform: "android" as const,
  status: "restricted" as const,
  dismissedAt: null,
  now: NOW,
};

describe("BN1 — 숨기는 기간은 7일이다", () => {
  it("밀리초로 7일", () => {
    expect(BATTERY_NOTICE_HIDE_MS).toBe(7 * DAY);
  });
});

describe("BN2 — 안드로이드 && restricted && 닫은 적 없거나 7일 이상 지났을 때만", () => {
  it("닫은 적 없으면 보인다", () => {
    expect(shouldShowBatteryNotice(base)).toBe(true);
  });

  it("7일 안에 닫았으면 숨기고, 정확히 7일이면 다시 보인다", () => {
    const at = (offset: number) => NOW.getTime() - offset;
    expect(shouldShowBatteryNotice({ ...base, dismissedAt: at(1) })).toBe(false);
    expect(shouldShowBatteryNotice({ ...base, dismissedAt: at(7 * DAY - 1) })).toBe(false);
    expect(shouldShowBatteryNotice({ ...base, dismissedAt: at(7 * DAY) })).toBe(true);
    expect(shouldShowBatteryNotice({ ...base, dismissedAt: at(30 * DAY) })).toBe(true);
  });

  it("닫은 시각이 미래이면(시계가 뒤로 갔다) 모르는 것으로 보고 숨긴다", () => {
    expect(shouldShowBatteryNotice({ ...base, dismissedAt: NOW.getTime() + 1 })).toBe(false);
  });

  it("기록을 읽지 못했으면(unreadable) 보이지 않는다 — 닫지 않았음으로 채우지 않는다", () => {
    expect(shouldShowBatteryNotice({ ...base, dismissedAt: "unreadable" })).toBe(false);
  });
});

describe("BN3 — restricted가 아니거나 안드로이드가 아니면 언제나 거짓", () => {
  it.each(["exempt", "unknown"] as const)("%s", (status) => {
    expect(shouldShowBatteryNotice({ ...base, status })).toBe(false);
  });

  it("iOS", () => {
    expect(shouldShowBatteryNotice({ ...base, platform: "ios" })).toBe(false);
    expect(shouldShowBatteryNotice({ ...base, platform: "ios", status: "exempt" })).toBe(false);
  });
});

describe("BN4 — 하루 경계(자정)를 쓰지 않는다", () => {
  const code = readFileSync(join(__dirname, "../../src/app/battery-notice.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("getHours·dayOf·day-boundary를 쓰지 않고 new Date()를 인자 없이 부르지 않는다", () => {
    expect(code).not.toMatch(/getHours|dayOf|day-boundary/);
    expect(code).not.toMatch(/new Date\(\s*\)|Date\.now\(\)/);
  });
});

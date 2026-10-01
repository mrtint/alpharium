/**
 * 056 — 기기 시계 읽기 (contracts/settings-time-place.md DC1·DC2).
 */

import { readDeviceClock } from "../../src/app/device-clock";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("DC1 — 던지지 않는다", () => {
  it("Intl이 던지면 12시간·시간대 없음", () => {
    jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("no intl");
    });
    const clock = readDeviceClock(new Date(2026, 9, 1, 12));
    expect(clock.format).toBe("h12");
    expect(clock.timeZoneId).toBeNull();
  });

  it("Intl이 정상이면 형식과 시간대 식별자를 준다", () => {
    const clock = readDeviceClock(new Date(2026, 9, 1, 12));
    expect(["h12", "h24"]).toContain(clock.format);
    expect(typeof clock.timeZoneId === "string" || clock.timeZoneId === null).toBe(true);
  });
});

describe("DC2 — 시차는 getTimezoneOffset의 부호를 뒤집은 값", () => {
  it("동쪽이 양수", () => {
    const now = new Date(2026, 9, 1, 12);
    expect(readDeviceClock(now).offsetMinutes).toBe(-now.getTimezoneOffset());
  });
});

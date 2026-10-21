/**
 * 090 EX4 — 로컬 모듈이 expo의 만료 알림과 같은 이름을 듣고, JS 통로와 같은 모듈·이벤트 이름을 쓴다.
 * 이름 하나만 어긋나도 오류 없이 만료가 영영 안 온다(조용한 실패) — jest에는 네이티브가 없어 소스를 대조하는 것이 유일한 방어다.
 * expo-background-task를 올리면 이 테스트가 알림 이름이 바뀌었는지 짚는다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BG_EXPIRY_EVENT,
  BG_EXPIRY_MODULE_NAME,
  expiryTimeOf,
  readWakeKind,
} from "../../src/app/bg-expiry-port";

const ROOT = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const SWIFT = read("modules/pocketlog-bg-expiry/ios/PocketlogBgExpiryModule.swift");

describe("EX4 — 로컬 만료 모듈의 이름 대조", () => {
  it("듣는 알림 이름이 expo-background-task가 게시하는 이름과 같다", () => {
    const expo = read("node_modules/expo-background-task/ios/BackgroundTaskModule.swift");
    const posted = expo.match(/private let onTasksExpired = "([^"]+)"/)?.[1];
    expect(posted).toBe("onTasksExpired");
    expect(SWIFT).toContain(`Notification.Name("${posted}")`);
    // expo가 그 이름으로 게시하는 자리(만료 처리기)도 그대로인가
    expect(read("node_modules/expo-background-task/ios/BackgroundTaskAppDelegate.swift")).toMatch(
      /expirationHandler[\s\S]*NotificationCenter\.default\.post\(name: onTasksExpiredNotification/,
    );
  });

  it("모듈·이벤트 이름이 JS 통로와 같다", () => {
    expect(SWIFT).toContain(`Name("${BG_EXPIRY_MODULE_NAME}")`);
    expect(SWIFT).toContain(`Events("${BG_EXPIRY_EVENT}")`);
    expect(SWIFT).toContain(`sendEvent("${BG_EXPIRY_EVENT}"`);
    // 만료 시각은 네이티브에서 잰다 — JS는 앱이 다시 깨어날 때에야 이벤트를 처리한다(코드 리뷰 I1)
    expect(SWIFT).toMatch(
      /sendEvent\("onExpired", \["at": Date\(\)\.timeIntervalSince1970 \* 1000\]\)/,
    );
    const config = JSON.parse(read("modules/pocketlog-bg-expiry/expo-module.config.json")) as {
      platforms: string[];
      apple: { modules: string[] };
    };
    expect(config.platforms).toEqual(["apple"]);
    expect(config.apple.modules).toEqual(["PocketlogBgExpiryModule"]);
    expect(SWIFT).toContain("public class PocketlogBgExpiryModule: Module");
  });
});

describe("EX5 — 만료 시각은 네이티브가 넘긴 값", () => {
  const RECEIVED = new Date("2026-10-18T09:00:00.000Z");
  it("밀리초 epoch를 그대로 쓴다", () => {
    expect(expiryTimeOf({ at: Date.UTC(2026, 9, 18, 2, 0) }, RECEIVED).toISOString()).toBe(
      "2026-10-18T02:00:00.000Z",
    );
  });
  it.each([[undefined], [null], [{}], [{ at: "x" }], [{ at: Number.NaN }]])(
    "값이 없거나 깨졌으면(%p) 받은 순간이다",
    (payload) => {
      expect(expiryTimeOf(payload, RECEIVED)).toBe(RECEIVED);
    },
  );
});

describe("091 WK1 — 깬 요청 읽기", () => {
  it("Swift가 패치와 같은 키·식별자로 읽는다", () => {
    const constants = read("node_modules/expo-background-task/ios/BackgroundTaskConstants.swift");
    for (const value of [
      "pocketlog.bgWakeIdentifier",
      "com.expo.modules.backgroundtask.processing.battery",
      "com.expo.modules.backgroundtask.processing",
    ]) {
      expect(constants).toContain(`"${value}"`);
      expect(SWIFT).toContain(`"${value}"`);
    }
    expect(SWIFT).toContain('Function("wakeKind")');
  });

  it.each([
    ["battery", "battery"],
    ["power", "power"],
    [null, undefined],
    ["x", undefined],
  ])("네이티브 %p → %p", (value, expected) => {
    expect(
      readWakeKind(() => ({ addListener: () => ({ remove() {} }), wakeKind: () => value })),
    ).toBe(expected);
  });

  it("모듈이 없거나 던지면 undefined", () => {
    expect(readWakeKind(() => null)).toBeUndefined();
    expect(
      readWakeKind(() => {
        throw new Error("x");
      }),
    ).toBeUndefined();
  });
});

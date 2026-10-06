/* eslint-disable @typescript-eslint/no-require-imports -- 062: jest.isolateModules 안에서 모듈을 새로 불러 언어 결정 캐시를 가른다 */
/**
 * 062 US2-4 — 헤드리스 완성 알림도 같은 해석으로 언어를 정한다 (spec FR-010, contracts C5).
 *
 * 백그라운드 태스크에는 React 트리가 없다. 알림 문구는 화면 쪽 상태가 아니라 `src/i18n/current.ts`의 같은 함수로 언어를 정해야 한다.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type NotificationText = typeof import("../../src/schedule/notification-text");

function notificationTextWith(detected: readonly string[] | null): NotificationText {
  let mod!: NotificationText;
  jest.isolateModules(() => {
    jest.doMock("../../src/i18n/locale-port", () => ({ readDeviceLocales: () => detected }));
    mod = require("../../src/schedule/notification-text") as NotificationText;
  });
  return mod;
}

afterEach(() => jest.dontMock("../../src/i18n/locale-port"));

const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("US2-4 — 영어 기기에서도 완성 알림은 한국어 그대로다", () => {
  it.each([[["en-US"]], [null], [["ko-KR"]]])("감지 %j", (detected) => {
    const { autoWriteDoneText } = notificationTextWith(detected);
    expect(autoWriteDoneText("금동이", "2026-10-01")).toBe("금동이가 10월 1일 일기를 다 썼어요");
    expect(autoWriteDoneText("은동", "2026-09-30")).toBe("은동이 9월 30일 일기를 다 썼어요");
  });
});

describe("C5 — 알림 문구와 채널 이름이 카탈로그에서 온다", () => {
  it("notification-text·notification-port가 text().notification을 읽는다", () => {
    const text = strip(
      readFileSync(join(__dirname, "../../src/schedule/notification-text.ts"), "utf8"),
    );
    const port = strip(
      readFileSync(join(__dirname, "../../src/schedule/notification-port.ts"), "utf8"),
    );
    expect(text).toMatch(/text\(\)\.notification\.autoWriteDone\(/);
    expect(port).toMatch(/text\(\)\.notification\.channelName/);
  });

  it("src/schedule/은 화면 계층(src/ui/)을 import하지 않는다 — 화면 상태에 기대지 않는다", () => {
    const dir = join(__dirname, "../../src/schedule");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
      expect(strip(readFileSync(join(dir, file), "utf8"))).not.toMatch(/from\s+["'][^"']*\/ui\//);
    }
  });
});

/**
 * 102 — 앱은 iPhone 전용이다(D5). iPad 지원이 켜지면 iPad 화면이 깨져 심사 거부 사유가 된다.
 * iPad에서는 호환 모드(확대된 iPhone 화면)로만 돈다 — 점검 기록은 specs/102-app-icon-store-assets/ipad-compat.md.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const appJson = (): { expo: { ios: { supportsTablet?: boolean } } } =>
  JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8"));

describe("102 iPhone 전용 선언", () => {
  it("I7: ios.supportsTablet은 false다", () => {
    expect(appJson().expo.ios.supportsTablet).toBe(false);
  });

  it("위반 주입: true로 바꾸면 검사가 실패한다", () => {
    const injected = readFileSync(join(ROOT, "app.json"), "utf8").replace(
      '"supportsTablet": false',
      '"supportsTablet": true',
    );
    expect(injected).toContain('"supportsTablet": true'); // 치환이 적용됐다
    expect((JSON.parse(injected) as ReturnType<typeof appJson>).expo.ios.supportsTablet).not.toBe(
      false,
    );
  });
});

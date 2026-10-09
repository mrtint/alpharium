/**
 * 068 — 설정 「배터리」 행의 플랫폼별 안내 (contracts/ios-settings.md C1, spec FR-003).
 *
 * iOS에는 배터리 최적화 예외가 없다 — 안드로이드의 「제한 없음으로 두면」 대신 iOS에서 실제로 제때 쓰는 데 영향을 주는 저전력 모드를 말한다.
 * 안드로이드 문구는 한 글자도 바뀌지 않는다(바이트 동일).
 */

import { appPlatform } from "../../src/app/platform";
import { batteryRowHint } from "../../src/app/battery-row";
import { SETTINGS_TEXT } from "../../src/ui/settings-text";

describe("068 C1 — batteryRowHint", () => {
  it("iOS는 저전력 모드 안내다", () => {
    expect(batteryRowHint("ios")).toBe("저전력 모드를 끄면 제때 써요");
  });

  it("안드로이드는 기존 문구와 바이트 동일하다", () => {
    expect(batteryRowHint("android")).toBe(SETTINGS_TEXT.permBatteryHint);
    expect(batteryRowHint("android")).toBe("배터리 사용 · 제한 없음으로 두면 제때 써요");
  });

  it("두 플랫폼의 문구가 다르다(iOS가 안드로이드 설명을 그대로 쓰지 않는다)", () => {
    expect(batteryRowHint("ios")).not.toBe(batteryRowHint("android"));
  });
});

describe("068 FR-007 — 플랫폼 값은 한 곳에서 만든다", () => {
  it('appPlatform은 "ios"만 ios로, 나머지는 android로 옮긴다', () => {
    expect(appPlatform("ios")).toBe("ios");
    expect(appPlatform("android")).toBe("android");
    expect(appPlatform("web")).toBe("android");
  });
});

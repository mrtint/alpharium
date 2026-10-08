/**
 * 066 — iOS 푸시 entitlement(`aps-environment`)를 걷는다.
 *
 * `expo-notifications`의 config plugin이 `aps-environment`를 entitlements에 넣는데(원격 푸시용), 이 앱은
 * 완성 알림을 기기 안에서만 예약한다(로컬 알림) — 서버도 푸시도 없다. 배포 프로파일(`Pocketlog App Store`)에
 * Push Notifications 기능이 없어 그 키가 남아 있으면 아카이브가 서명 단계에서 실패한다
 * (`doesn't include the aps-environment entitlement`, 2026-10-08 실측).
 *
 * `with-force-light-theme.test.ts`와 같은 패턴 — prebuild 없이 순수 함수로 갈래를 본다. 실제로 걷혔는가는
 * prebuild 뒤 `ios/Pocketlog/Pocketlog.entitlements`를 읽어 확인한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../../plugins/with-no-push-entitlement");

const removePushEntitlement: (e: Record<string, unknown>) => Record<string, unknown> =
  plugin.removePushEntitlement;

describe("066 — removePushEntitlement", () => {
  it("aps-environment를 지우고 나머지는 그대로 둔다", () => {
    const out = removePushEntitlement({
      "aps-environment": "development",
      "com.apple.developer.kernel.increased-memory-limit": true,
    });
    expect(out).toEqual({ "com.apple.developer.kernel.increased-memory-limit": true });
  });

  it("없으면 아무것도 바꾸지 않는다", () => {
    const input = { "com.apple.developer.kernel.increased-memory-limit": true };
    expect(removePushEntitlement({ ...input })).toEqual(input);
  });
});

describe("066 — 등록", () => {
  it("app.json plugins의 마지막 항목이다 (다른 플러그인이 넣은 뒤에 걷어야 한다)", () => {
    const app = JSON.parse(readFileSync(join(__dirname, "../../app.json"), "utf8")) as {
      expo: { plugins: (string | [string, unknown])[] };
    };
    const last = app.expo.plugins[app.expo.plugins.length - 1];
    expect(last).toBe("./plugins/with-no-push-entitlement");
  });

  it("앱 코드는 원격 푸시 API를 쓰지 않는다 (걷어도 되는 근거)", () => {
    const files = ["App.tsx", "src/schedule/notification-port.ts"].map((f) =>
      readFileSync(join(__dirname, "../..", f), "utf8"),
    );
    for (const code of files) {
      expect(code).not.toMatch(
        /getDevicePushTokenAsync|getExpoPushTokenAsync|addPushTokenListener/,
      );
    }
  });
});

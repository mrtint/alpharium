import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 065 — Google Play에 올리는 매니페스트에서 걷는 권한.
 *
 * - `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` — Play가 메신저·자동화·운동·기기 연결·안전·VPN에만 허용한다
 *   (자세한 근거는 `battery-exception-port.test.ts`).
 * - `SYSTEM_ALERT_WINDOW`(다른 앱 위에 그리기) — Expo 템플릿의 기본 매니페스트가 넣을 뿐 앱이 쓰는 곳이 없다.
 *   개발 메뉴용으로 debug 매니페스트에는 남는다(`src/debug/AndroidManifest.xml`은 prebuild가 만든다).
 */

const app = JSON.parse(readFileSync(join(__dirname, "../../app.json"), "utf8")) as {
  expo: { android: { blockedPermissions?: string[]; permissions?: string[] } };
};

describe("065 — Play 매니페스트에서 걷는 권한", () => {
  it.each([
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    "android.permission.SYSTEM_ALERT_WINDOW",
  ])("%s를 blockedPermissions로 걷고 permissions에 두지 않는다", (permission) => {
    expect(app.expo.android.blockedPermissions).toContain(permission);
    expect(app.expo.android.permissions).not.toContain(permission);
  });
});

/**
 * 031 — OB6: 온보딩·설정 화면에서 photo-location 단계/항목을 빼더라도
 * `ACCESS_MEDIA_LOCATION` 매니페스트 선언과 플러그인 설정은 유지된다 (FR-011).
 *
 * 계약: specs/031-oneui85-fixes/contracts/onboarding-steps.md OB6
 *
 * 화면에서 단계를 빼는 것과 앱이 그 권한을 선언·사용하는 것은 별개다.
 * `collect.ts`가 사진 좌표를 실제로 읽는 경로(021 FR-013a)는 이 권한이 있어야
 * 돈다 — 매니페스트에서 빠지면 좌표를 못 읽는다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_JSON = JSON.parse(readFileSync(join(__dirname, "../../app.json"), "utf8"));

describe("OB6 — ACCESS_MEDIA_LOCATION 선언 유지", () => {
  it("android.permissions에 ACCESS_MEDIA_LOCATION이 있다", () => {
    const perms: string[] = APP_JSON.expo.android.permissions;
    expect(perms).toContain("android.permission.ACCESS_MEDIA_LOCATION");
  });

  it("expo-media-library 플러그인의 isAccessMediaLocationEnabled가 true다", () => {
    const plugins: unknown[] = APP_JSON.expo.plugins;
    const mediaLib = plugins.find(
      (p): p is [string, Record<string, unknown>] =>
        Array.isArray(p) && p[0] === "expo-media-library",
    );
    expect(mediaLib).toBeDefined();
    expect(mediaLib?.[1]?.isAccessMediaLocationEnabled).toBe(true);
  });
});

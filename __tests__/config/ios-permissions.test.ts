/**
 * 066 — iOS 권한 문구는 사람이 읽는 한국어여야 한다.
 *
 * Expo 플러그인의 기본값("Allow $(PRODUCT_NAME) to access your photos")이 그대로 `Info.plist`에
 * 들어가면 iOS 시뮬레이터의 권한 창에 영어 한 줄이 뜬다(2026-10-08 관측). App Store 심사는 권한
 * 문구가 쓰임새를 설명하지 않으면 거부한다. `ios/`는 생성물이라 `app.json`이 유일한 선언 자리다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type Plugin = string | [string, Record<string, unknown>];

const APP = JSON.parse(readFileSync(join(__dirname, "../../app.json"), "utf8")) as {
  expo: { plugins: Plugin[]; ios: { infoPlist?: Record<string, unknown> } };
};

function optionsOf(name: string): Record<string, unknown> {
  const found = APP.expo.plugins.find((p) => Array.isArray(p) && p[0] === name);
  if (!Array.isArray(found)) throw new Error(`${name} 플러그인이 app.json에 없다`);
  return found[1];
}

const HANGUL = /[가-힣]/;

describe("066 — iOS 권한 문구", () => {
  it("사진 권한 문구가 한국어로 선언돼 있다 (expo-media-library photosPermission)", () => {
    expect(optionsOf("expo-media-library").photosPermission).toMatch(HANGUL);
  });

  it("사진 저장 권한은 쓰지 않으므로 문구를 넣지 않는다 (savePhotosPermission: false)", () => {
    expect(optionsOf("expo-media-library").savePhotosPermission).toBe(false);
  });

  it("위치 권한은 「앱을 사용하는 동안」 하나뿐이다 — 항상·모션 문구는 넣지 않는다", () => {
    const location = optionsOf("expo-location");
    expect(location.locationWhenInUsePermission).toMatch(HANGUL);
    expect(location.locationAlwaysAndWhenInUsePermission).toBe(false);
    expect(location.locationAlwaysPermission).toBe(false);
    expect(location.motionUsagePermission).toBe(false);
  });
});

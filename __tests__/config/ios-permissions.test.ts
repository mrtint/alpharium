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
  expo: {
    plugins: Plugin[];
    ios: {
      appleTeamId?: string;
      buildNumber?: string;
      infoPlist?: Record<string, unknown>;
      entitlements?: Record<string, unknown>;
    };
  };
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

  // 121 — 위치 권한을 걷었다(장소 이름을 앱에 든 데이터에서 찾는다). `expo-location` 플러그인과 위치 문구가 없다(NX2·NX6).
  it("121 — 위치 플러그인·위치 문구가 없다", () => {
    expect(APP.expo.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === "expo-location")).toBe(
      false,
    );
    expect(JSON.stringify(APP.expo)).not.toMatch(/NSLocation|locationWhenInUsePermission/);
  });

  // 066 빌드 1이 ITMS-90683으로 거부됐다 — 그때는 `expo-location`이 CoreMotion API를 참조했다. 121에서 그 모듈을 걷었지만
  // 정적 검사가 다른 데서 걸릴 수 있어(확인하지 않았다) 모션 문구는 `infoPlist`에 직접 남긴다. 빼려면 업로드로 먼저 확인한다.
  it("모션 문구는 한국어로 남아 있다 — ITMS-90683 대비", () => {
    expect(APP.expo.ios.infoPlist?.NSMotionUsageDescription).toMatch(HANGUL);
  });

  it("086 — 사진 문구는 그대로다(사진 파일은 휴대폰 밖으로 나가지 않는다)", () => {
    expect(optionsOf("expo-media-library").photosPermission).toBe(
      "그날 찍힌 사진을 읽어 하루를 일기로 씁니다. 사진은 휴대폰 밖으로 나가지 않습니다.",
    );
  });
});

/**
 * 066 — TestFlight에 올릴 때마다 `ios.buildNumber`를 1 올린다(안드로이드 `versionCode`와 같은 규칙).
 * 같은 번호는 App Store Connect가 거부한다. 암호화 수출 문항은 앱이 자체 암호화를 쓰지 않으므로
 * `ITSAppUsesNonExemptEncryption: false`로 미리 답해 둔다(없으면 빌드마다 App Store Connect에서 손으로 답해야 한다).
 */
describe("066 — TestFlight 업로드 선언", () => {
  it("ios.buildNumber가 양의 정수 문자열이다", () => {
    expect(APP.expo.ios.buildNumber).toMatch(/^[1-9]\d*$/);
  });

  it("ITSAppUsesNonExemptEncryption이 false다", () => {
    expect(APP.expo.ios.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });
});

/**
 * 066 — 서명 주체는 Hyunmin Lee 님의 개인 Apple Developer 계정(팀 `PGNGG84B39`)이다. 인증서·App Store
 * 프로파일(`Pocketlog App Store`)은 그 계정이 만들어 줬고 `~/.pocketlog-signing/ios/`에 있다 — 저장소에는 없다.
 * 프로파일이 허용하는 entitlement는 `increased-memory-limit` 하나뿐이라, llama.rn 플러그인의
 * `enableEntitlements`(extended-virtual-addressing까지 둘을 넣는다)는 꺼 두고 하나만 직접 선언한다 —
 * 앱의 entitlements에 프로파일에 없는 키가 있으면 서명이 실패한다.
 */
describe("066 — iOS 서명 선언", () => {
  it("appleTeamId가 프로파일의 팀(PGNGG84B39)이다", () => {
    expect(APP.expo.ios.appleTeamId).toBe("PGNGG84B39");
  });

  it("increased-memory-limit entitlement를 app.json이 직접 선언한다 (2GB 모델 적재)", () => {
    expect(APP.expo.ios.entitlements?.["com.apple.developer.kernel.increased-memory-limit"]).toBe(
      true,
    );
  });

  it("llama.rn 플러그인의 enableEntitlements는 꺼져 있다 (프로파일에 없는 키를 넣는다)", () => {
    expect(optionsOf("llama.rn").enableEntitlements).toBe(false);
  });
});

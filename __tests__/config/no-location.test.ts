/**
 * 121 — 좌표를 휴대폰 밖으로 보내지 않고 위치 권한을 묻지 않는다 (contracts/diary-places.md NX1~NX6, spec SC-003).
 *
 * 장소 이름은 앱에 든 OpenStreetMap 데이터에서 찾는다(`src/signals/place-names.ts`). 017의 OS 역지오코딩과 021의 위치 권한
 * 단계를 걷었다 — 다시 들어오면 방침(「사진의 좌표도 휴대폰 밖으로 나가지 않습니다」)과 스토어 선언이 거짓이 된다.
 * 주석을 걷고 소스를 읽는다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import { OUTBOUND } from "../privacy/outbound";

const ROOT = join(__dirname, "..", "..");
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...filesUnder(rel));
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

const SOURCES = [...filesUnder("src"), "App.tsx"].map(
  (path) => [path, strip(readFileSync(join(ROOT, path), "utf8"))] as const,
);
const APP = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8")) as {
  expo: {
    plugins: (string | [string, unknown])[];
    android: { permissions?: string[]; blockedPermissions?: string[] };
  };
};
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};

describe("121 — 바깥 전송·위치 권한 0건", () => {
  it("NX1 — 앱 소스에 위치 모듈·역지오코딩·위치 권한 호출이 없다", () => {
    const FORBIDDEN =
      /expo-location|reverseGeocodeAsync|getForegroundPermissionsAsync|requestForegroundPermissionsAsync/;
    const hits = SOURCES.filter(([, code]) => FORBIDDEN.test(code)).map(([path]) => path);
    expect(hits).toEqual([]);
  });

  it("NX2 — 의존성과 플러그인에 expo-location이 없다", () => {
    expect(Object.keys(PKG.dependencies)).not.toContain("expo-location");
    const names = APP.expo.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names).not.toContain("expo-location");
  });

  it("NX3 — 안드로이드 위치 권한 셋이 차단 목록에 있고 선언 목록에 없다", () => {
    const LOCATION = [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
    ];
    for (const p of LOCATION) {
      expect(APP.expo.android.blockedPermissions).toContain(p);
      expect(APP.expo.android.permissions ?? []).not.toContain(p);
    }
    // 사진 좌표는 사진 권한에 묶인 ACCESS_MEDIA_LOCATION으로 읽는다 — 이것은 남는다.
    expect(APP.expo.android.permissions).toContain("android.permission.ACCESS_MEDIA_LOCATION");
  });

  it("NX4 — 첫 실행 권한 목록에 위치가 없다", () => {
    expect(PERMISSION_REQUIREMENTS.map((r) => r.key as string)).not.toContain("location");
  });

  it("NX5 — 바깥 전송 표에 장소 이름 전송이 없다", () => {
    expect(OUTBOUND.map((e) => e.id)).not.toContain("place-name");
    expect(readFileSync(join(ROOT, "site/privacy/index.html"), "utf8")).not.toContain(
      'data-outbound="place-name"',
    );
  });

  it("NX6 — 앱 설정에 iOS 위치 문구가 없다", () => {
    expect(JSON.stringify(APP.expo)).not.toMatch(/NSLocation|locationWhenInUsePermission/);
  });
});

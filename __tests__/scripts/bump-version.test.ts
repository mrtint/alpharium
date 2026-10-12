/**
 * 릴리스 번호 올림(`scripts/release/bump-version.ts`) — 사람이 보는 버전과 스토어 번호를 한 번에 올린다.
 *
 * 2026-10-12: 077을 versionCode 11로 올렸지만 `expo.version`이 1.0.0 그대로라 기기 설정의 「버전」만으로는
 * 새 빌드가 깔렸는지 가를 수 없었다. 그래서 세 값(버전·versionCode·buildNumber)을 늘 함께 올린다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bumpAppJson, bumpSemver } from "../../scripts/release/bump-version.ts";

const APP_JSON = `{
  "expo": {
    "name": "Pocketlog",
    "version": "1.0.0",
    "ios": {
      "buildNumber": "5",
      "infoPlist": { "ITSAppUsesNonExemptEncryption": false }
    },
    "android": {
      "versionCode": 11,
      "permissions": ["android.permission.READ_MEDIA_IMAGES"]
    },
    "plugins": [["expo-build-properties", { "android": { "minSdkVersion": 26 } }]]
  }
}
`;

describe("bumpSemver", () => {
  it("patch는 셋째 자리만 올린다", () => {
    expect(bumpSemver("1.0.0", "patch")).toBe("1.0.1");
  });

  it("minor는 둘째 자리를 올리고 셋째를 0으로", () => {
    expect(bumpSemver("1.2.7", "minor")).toBe("1.3.0");
  });

  it("major는 첫째를 올리고 나머지를 0으로", () => {
    expect(bumpSemver("1.2.7", "major")).toBe("2.0.0");
  });

  it("x.y.z 꼴이 아니면 던진다", () => {
    expect(() => bumpSemver("1.0", "patch")).toThrow();
    expect(() => bumpSemver("1.0.0-beta", "patch")).toThrow();
  });
});

describe("bumpAppJson", () => {
  it("버전·versionCode·buildNumber 셋을 함께 올린다", () => {
    const { text, before, after } = bumpAppJson(APP_JSON, "patch");
    expect(before).toEqual({ version: "1.0.0", versionCode: 11, buildNumber: "5" });
    expect(after).toEqual({ version: "1.0.1", versionCode: 12, buildNumber: "6" });
    const expo = JSON.parse(text).expo;
    expect(expo.version).toBe("1.0.1");
    expect(expo.android.versionCode).toBe(12);
    expect(expo.ios.buildNumber).toBe("6");
  });

  it("세 줄 밖은 한 글자도 바꾸지 않는다 (서식 보존)", () => {
    const { text } = bumpAppJson(APP_JSON, "minor");
    const expected = APP_JSON.replace('"version": "1.0.0"', '"version": "1.1.0"')
      .replace('"versionCode": 11', '"versionCode": 12')
      .replace('"buildNumber": "5"', '"buildNumber": "6"');
    expect(text).toBe(expected);
  });

  it("buildNumber는 문자열로 남는다 (Expo가 문자열을 요구한다)", () => {
    const { text } = bumpAppJson(APP_JSON, "patch");
    expect(text).toContain('"buildNumber": "6"');
  });

  it("세 키 중 하나가 없으면 던진다 — 조용히 둘만 올리지 않는다", () => {
    expect(() => bumpAppJson(APP_JSON.replace('"versionCode": 11,', ""), "patch")).toThrow();
    expect(() => bumpAppJson(APP_JSON.replace('"buildNumber": "5",', ""), "patch")).toThrow();
  });

  it("같은 키가 두 번 나오면 던진다 — 어느 것을 고칠지 짐작하지 않는다", () => {
    const twice = APP_JSON.replace(
      '"name": "Pocketlog",',
      '"name": "Pocketlog", "x": { "versionCode": 3 },',
    );
    expect(() => bumpAppJson(twice, "patch")).toThrow();
  });

  it("실제 app.json에도 적용된다", () => {
    const real = readFileSync(join(__dirname, "../../app.json"), "utf8");
    const { after, before } = bumpAppJson(real, "patch");
    expect(after.versionCode).toBe(before.versionCode + 1);
    expect(Number(after.buildNumber)).toBe(Number(before.buildNumber) + 1);
  });
});

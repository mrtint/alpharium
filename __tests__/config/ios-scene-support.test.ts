/**
 * 094 — Xcode 27(iOS 27 SDK)로 빌드한 앱이 UIScene 미채택으로 실행 즉시 죽지 않게 한다.
 *
 * `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` SIGTRAP은 오류 없이 열자마자 죽는다 — CI(Xcode 26.6)는 못 잡는다.
 * 설정이 조용히 빠지면(플러그인 항목 삭제·expo 되돌림) 러너가 Xcode 27로 올라가는 순간 TestFlight 빌드가 죽으므로 소스를 읽어 잠근다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

type PackageJson = { dependencies: Record<string, string> };
type AppJson = {
  expo: {
    ios: { buildNumber: string };
    android: { versionCode: number };
    plugins: unknown[];
  };
};

const pkg = JSON.parse(read("package.json")) as PackageJson;
const app = JSON.parse(read("app.json")) as AppJson;

describe("094 — UIScene 대응 설정", () => {
  it("C1: expo는 SDK 57의 장면 지원 패치(57.0.23 이상)다", () => {
    const match = /^~?57\.0\.(\d+)$/.exec(pkg.dependencies.expo);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(23);
  });

  it("C2: expo-build-properties가 정식 의존성이다", () => {
    expect(pkg.dependencies["expo-build-properties"]).toMatch(/^~?57\.0\.\d+$/);
  });

  it("C3: app.json이 ios.enableSceneSupport를 켜고 안드로이드 속성은 건드리지 않는다", () => {
    const entries = app.expo.plugins.filter(
      (p): p is [string, Record<string, unknown>] =>
        Array.isArray(p) && p[0] === "expo-build-properties",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0][1]).toEqual({ ios: { enableSceneSupport: true } });
  });

  it("C3b: with-no-push-entitlement가 plugins의 맨 끝이다(그 뒤에 더하면 aps-environment가 되살아난다)", () => {
    expect(app.expo.plugins[app.expo.plugins.length - 1]).toBe(
      "./plugins/with-no-push-entitlement",
    );
  });

  it("C4: expo-background-task는 패치와 같은 정확한 버전이다", () => {
    expect(pkg.dependencies["expo-background-task"]).toBe("57.0.21");
    expect(read("patches/expo-background-task+57.0.21.patch")).toContain(
      "BackgroundTaskAppDelegate.swift",
    );
  });

  it("C5: ios-release.yml은 Xcode를 고정하지 않고 26 미만만 막는다", () => {
    const yml = read(".github/workflows/ios-release.yml");
    expect(yml).toMatch(/\[ "\$xcode_major" -lt 26 \]/);
    expect(yml).not.toMatch(/xcode-select|setup-xcode|DEVELOPER_DIR=\/Applications\/Xcode_/);
  });

  it("C6: AGENTS.md에 UIScene 임시 우회 경고가 남지 않는다", () => {
    const agents = stripComments(read("AGENTS.md"));
    expect(agents).not.toMatch(/UIScene 미채택 앱이 실행 즉시 죽는다/);
    expect(agents).not.toMatch(/커밋 없이 넣고 했다/);
  });

  it("C7: 이 기능은 빌드 번호를 올리지 않는다", () => {
    expect(app.expo.ios.buildNumber).toBe("13");
    expect(app.expo.android.versionCode).toBe(13);
  });
});

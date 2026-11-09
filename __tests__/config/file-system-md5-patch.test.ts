/**
 * 110 — iOS의 모델 검증이 파일 크기만큼 메모리를 먹지 않게 expo-file-system의 MD5 루프를 patch-package로 고친다.
 *
 * iPhone 13 mini(2026-11-01)가 언어 모델을 합친 직후 메모리 한도로 죽었다(약 2.4GB). 같은 루프를 맥에서 1.5GB 파일로 돌리면 풀 없이 약 1.3GB,
 * 풀을 넣으면 2MB다. 패치가 조용히 빠지거나 iOS 빌드가 미리 컴파일된 꾸러미를 쓰면 오류 없이 다시 죽을 수 있다 — 설치된 파일과 설정을 읽어 잠근다.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const installed = (path: string) => readFileSync(join(ROOT, "node_modules", path), "utf8");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  expo: { autolinking: { ios: { buildFromSource: string[] } } };
};

describe("110 — expo-file-system MD5 패치", () => {
  it("설치된 iOS 소스가 읽을 때마다 풀을 비운다", () => {
    const swift = strip(installed("expo-file-system/ios/FileSystemFile.swift"));
    const md5 = swift.slice(swift.indexOf("var md5: String"), swift.indexOf("var size: Int64"));

    expect(md5).toMatch(/autoreleasepool\s*\{[^}]*handle\.read\(upToCount/);
    expect(md5).not.toMatch(/while let chunk = try handle\.read/);
  });

  it("패치 파일이 설치된 버전과 짝이고 버전이 고정돼 있다", () => {
    const { version } = JSON.parse(installed("expo-file-system/package.json")) as {
      version: string;
    };

    expect(readdirSync(join(ROOT, "patches"))).toContain(`expo-file-system+${version}.patch`);
    expect(pkg.dependencies["expo-file-system"]).toBe(version);
    expect(pkg.scripts.postinstall).toBe("patch-package --error-on-fail");
  });

  it("iOS가 미리 컴파일된 꾸러미 대신 패치한 소스를 빌드한다", () => {
    expect(pkg.expo.autolinking.ios.buildFromSource).toContain("expo-file-system");
  });
});

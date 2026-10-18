/**
 * 090 — iOS 백그라운드 처리 요청의 조건을 patch-package로 고친다.
 *
 * 실기기(2026-10-18 iPhone 14): OS가 깨운 백그라운드 쓰기가 사진을 읽는 중 51초 만에 `cpu_resource_fatal`(「80% cpu over 60 seconds」 —
 * Action taken: Process killed)로 죽었다. 외부 전원을 요구하는 처리 작업만 iOS CPU 감시에서 빠진다(WWDC19 「Advances in App Background
 * Execution」). 추론은 기기 안에서 하므로 네트워크 조건은 깨움만 줄인다. 이 값은 expo 소스에 박혀 있어 패치 말고는 바꿀 길이 없다.
 *
 * 패치가 조용히 빠지면(postinstall이 안 돌았다·expo를 올려 패치가 안 맞는다) 오류 없이 다시 죽는다 — 설치된 파일을 읽어 잠근다.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const strip = (code: string) => code.replace(/\/\/.*$/gm, "");

describe("090 — BGProcessingTaskRequest 조건 패치", () => {
  it("설치된 expo-background-task가 외부 전원을 요구하고 네트워크를 요구하지 않는다", () => {
    const swift = strip(
      readFileSync(
        join(ROOT, "node_modules/expo-background-task/ios/BackgroundTaskScheduler.swift"),
        "utf8",
      ),
    );
    expect(swift).toMatch(/request\.requiresExternalPower = true/);
    expect(swift).toMatch(/request\.requiresNetworkConnectivity = false/);
    expect(swift).not.toMatch(/request\.requiresExternalPower = false/);
    expect(swift).not.toMatch(/request\.requiresNetworkConnectivity = true/);
  });

  it("패치 파일이 설치된 버전과 짝이고 postinstall이 적용한다", () => {
    const version = (
      JSON.parse(
        readFileSync(join(ROOT, "node_modules/expo-background-task/package.json"), "utf8"),
      ) as { version: string }
    ).version;
    expect(readdirSync(join(ROOT, "patches"))).toContain(`expo-background-task+${version}.patch`);
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
      dependencies: Record<string, string>;
    };
    // 패치가 안 맞으면 설치가 실패해야 한다(조용히 빠지면 CPU 감시가 다시 죽인다) — 패치는 한 버전에 묶이므로 버전도 고정한다(코드 리뷰 I2)
    expect(pkg.scripts.postinstall).toBe("patch-package --error-on-fail");
    expect(pkg.dependencies["expo-background-task"]).toBe(version);
    expect(pkg.devDependencies["patch-package"]).toBeDefined();
  });
});

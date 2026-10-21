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
    // 충전 요청(091부터 둘 중 하나 — 배터리 요청은 아래 RQ1)
    expect(swift).toMatch(/\brequest\.requiresExternalPower = true/);
    expect(swift).toMatch(/\brequest\.requiresNetworkConnectivity = false/);
    expect(swift).not.toMatch(/\brequest\.requiresExternalPower = false/);
    expect(swift).not.toMatch(/requiresNetworkConnectivity = true/);
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

/**
 * 091 — 요청 둘: 충전 요청(090 그대로, CPU 감시 없음)과 배터리 요청(외부 전원·네트워크 불요 — 느린 쓰기). 처리기는 깬 식별자를
 * `UserDefaults`의 `pocketlog.bgWakeIdentifier`에 남기고, 로컬 모듈이 그것을 읽어 태스크가 느린 쓰기를 고른다.
 */
describe("091 RQ1 — 백그라운드 요청 둘", () => {
  const read = (rel: string) => strip(readFileSync(join(ROOT, rel), "utf8"));
  const SCHEDULER = read("node_modules/expo-background-task/ios/BackgroundTaskScheduler.swift");
  const DELEGATE = read("node_modules/expo-background-task/ios/BackgroundTaskAppDelegate.swift");
  const CONSTANTS = read("node_modules/expo-background-task/ios/BackgroundTaskConstants.swift");

  it("식별자 둘 — 배터리 식별자는 기존 식별자 뒤에 .battery", () => {
    expect(CONSTANTS).toContain(
      'BackgroundWorkerIdentifier = "com.expo.modules.backgroundtask.processing"',
    );
    expect(CONSTANTS).toContain(
      'BatteryWorkerIdentifier = "com.expo.modules.backgroundtask.processing.battery"',
    );
    expect(CONSTANTS).toContain('WakeIdentifierDefaultsKey = "pocketlog.bgWakeIdentifier"');
  });

  it("요청 둘을 낸다 — 충전: 외부 전원 요구, 배터리: 요구 안 함, 둘 다 네트워크 불요", () => {
    expect(SCHEDULER).toMatch(
      /BGProcessingTaskRequest\(identifier: BackgroundTaskConstants\.BackgroundWorkerIdentifier\)[\s\S]*?requiresExternalPower = true/,
    );
    expect(SCHEDULER).toMatch(
      /BGProcessingTaskRequest\(identifier: BackgroundTaskConstants\.BatteryWorkerIdentifier\)[\s\S]*?requiresExternalPower = false/,
    );
    expect(SCHEDULER.match(/requiresNetworkConnectivity = false/g)).toHaveLength(2);
    expect(SCHEDULER).not.toMatch(/requiresNetworkConnectivity = true/);
    // 취소도 둘 다
    expect(SCHEDULER).toMatch(
      /cancel\(taskRequestWithIdentifier: BackgroundTaskConstants\.BatteryWorkerIdentifier\)/,
    );
  });

  it("처리기가 두 식별자를 등록하고 깬 식별자를 UserDefaults에 남긴다", () => {
    expect(DELEGATE).toMatch(/BackgroundTaskConstants\.BatteryWorkerIdentifier/);
    expect(DELEGATE).toMatch(
      /UserDefaults\.standard\.set\(task\.identifier, forKey: BackgroundTaskConstants\.WakeIdentifierDefaultsKey\)/,
    );
  });

  it("Info.plist에 두 식별자를 허용한다 (config plugin, app.json에 등록)", () => {
    const plugin = readFileSync(join(ROOT, "plugins/with-battery-bg-task.js"), "utf8");
    expect(plugin).toContain("com.expo.modules.backgroundtask.processing.battery");
    expect(plugin).toContain("BGTaskSchedulerPermittedIdentifiers");
    const app = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8")) as {
      expo: { plugins: (string | unknown[])[] };
    };
    const names = app.expo.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names.indexOf("./plugins/with-battery-bg-task")).toBeGreaterThan(
      names.indexOf("expo-background-task"),
    );
  });

  it("plugin은 이미 있으면 다시 넣지 않는다", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { addBatteryIdentifier } = require("../../plugins/with-battery-bg-task") as {
      addBatteryIdentifier(plist: Record<string, unknown>): Record<string, unknown>;
    };
    const once = addBatteryIdentifier({
      BGTaskSchedulerPermittedIdentifiers: ["com.expo.modules.backgroundtask.processing"],
    });
    expect(addBatteryIdentifier(once).BGTaskSchedulerPermittedIdentifiers).toEqual([
      "com.expo.modules.backgroundtask.processing",
      "com.expo.modules.backgroundtask.processing.battery",
    ]);
    expect(addBatteryIdentifier({}).BGTaskSchedulerPermittedIdentifiers).toEqual([
      "com.expo.modules.backgroundtask.processing.battery",
    ]);
  });
});

/**
 * 091 코드 리뷰 C1 — 두 요청이 함께 깨면 처음 것만 JS 일을 돌리고 나머지는 같은 무리로 기다렸다 함께 끝난다. 처리기마다 `runTasks`를
 * 부르면 expo의 태스크 서비스가 같은 JS 태스크를 두 번 돌리고, 먼저 끝난 쪽(등록부에 막혀 곧바로 건너뜀)이 두 BGTask를 모두 끝내
 * 진짜 쓰기 도중 iOS가 앱을 멈춘다.
 */
describe("091 C1 — 함께 깬 BGTask는 한 무리로", () => {
  const DELEGATE = strip(
    readFileSync(
      join(ROOT, "node_modules/expo-background-task/ios/BackgroundTaskAppDelegate.swift"),
      "utf8",
    ),
  );

  it("처음 것만 runTasks를 부르고, 깬 식별자도 처음 것만 남긴다", () => {
    const guardAt = DELEGATE.indexOf("guard BackgroundTaskGroup.shared.join(task) else");
    expect(guardAt).toBeGreaterThan(-1);
    expect(DELEGATE.indexOf("runTasks(")).toBeGreaterThan(guardAt);
    expect(DELEGATE.indexOf("UserDefaults.standard.set(task.identifier")).toBeGreaterThan(guardAt);
  });

  it("끝·만료·실패는 무리 전체를 끝낸다 — 처리기가 task 하나만 끝내지 않는다", () => {
    expect(
      DELEGATE.match(/BackgroundTaskGroup\.shared\.finishAll\(success: (true|false)\)/g),
    ).toHaveLength(3);
    // 무리에 들어간 것의 만료만 자기 하나를 끝낸다
    expect(DELEGATE.match(/task\.setTaskCompleted\(success: false\)/g)).toHaveLength(1);
    expect(DELEGATE).toMatch(
      /BackgroundTaskGroup\.shared\.leave\(task\)\s*task\.setTaskCompleted\(success: false\)/,
    );
    expect(DELEGATE).not.toMatch(/task\.setTaskCompleted\(success: true\)/);
    expect(DELEGATE).toMatch(/final class BackgroundTaskGroup[\s\S]*NSLock/);
  });
});

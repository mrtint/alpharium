/**
 * 092 CW1 — 이어 쓰기 로컬 모듈의 소스 계약.
 *
 * jest에는 네이티브가 없어 이름 하나만 어긋나도 오류 없이 이어 하기가 영영 거절된다(조용한 실패) — 소스를 대조하는 것이 유일한 방어다
 * (090 EX4와 같은 방식). API 세부는 Xcode SDK 헤더(`BackgroundTasks.framework/Headers/BGTask.h`·`BGTaskRequest.h`·`BGTaskScheduler.h`,
 * iPhoneOS27.1.sdk)와 Apple DTS 답(developer.apple.com/forums/thread/799126)으로 확인했다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONTINUED_WRITE_EVENT,
  CONTINUED_WRITE_MODULE_NAME,
} from "../../src/app/continued-write-port";

const ROOT = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/** 주석을 걷어낸 소스(AGENTS 「계약 테스트는 주석을 먼저 걷어내고」) */
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const SWIFT_PATH = "modules/pocketlog-continued-write/ios/PocketlogContinuedWriteModule.swift";
const SWIFT = strip(read(SWIFT_PATH));

const WILDCARD = "com.a810labs.pocketlog.write.*";

describe("092 CW1 — 모듈 이름·함수·이벤트", () => {
  it("모듈·이벤트 이름이 JS 통로와 같다", () => {
    expect(SWIFT).toContain(`Name("${CONTINUED_WRITE_MODULE_NAME}")`);
    expect(SWIFT).toContain(`Events("${CONTINUED_WRITE_EVENT}")`);
    expect(SWIFT).toContain(`sendEvent("${CONTINUED_WRITE_EVENT}"`);
    expect(SWIFT).toContain("public class PocketlogContinuedWriteModule: Module");
    const config = JSON.parse(
      read("modules/pocketlog-continued-write/expo-module.config.json"),
    ) as {
      platforms: string[];
      apple: { modules: string[] };
    };
    expect(config.platforms).toEqual(["apple"]);
    expect(config.apple.modules).toEqual(["PocketlogContinuedWriteModule"]);
  });

  it("begin은 비동기(제출 결과를 기다린다), report·finish는 동기다", () => {
    expect(SWIFT).toMatch(
      /AsyncFunction\("begin"\) \{ \(title: String, subtitle: String\) async -> String\? in/,
    );
    expect(SWIFT).toMatch(
      /Function\("report"\) \{ \(subtitle: String, completed: Double, total: Double\) in/,
    );
    expect(SWIFT).toMatch(/Function\("finish"\) \{ \(success: Bool\) in/);
  });

  it("iOS 26 미만이면 begin은 nil이다(JS에서 거절)", () => {
    expect(SWIFT).toMatch(/guard #available\(iOS 26, \*\) else \{ return nil \}/);
  });
});

describe("092 CW1 — 신청·처리기", () => {
  it("곧바로 못 돌면 실패하는 전략(.fail)으로 제출한다 — 기본값은 .queue다(BGTaskRequest.h)", () => {
    expect(SWIFT).toContain(
      "BGContinuedProcessingTaskRequest(identifier: identifier, title: title, subtitle: subtitle)",
    );
    expect(SWIFT).toMatch(/request\.strategy = \.fail/);
  });

  it("처리기는 꼬리를 붙인 온전한 식별자로 등록한다 — 와일드카드로 등록하지 않는다(Apple DTS)", () => {
    const prefix = SWIFT.match(/private let identifierPrefix = "([^"]+)"/)?.[1];
    expect(`${prefix}*`).toBe(WILDCARD);
    expect(SWIFT).toMatch(/let identifier = identifierPrefix \+ UUID\(\)\.uuidString/);
    expect(SWIFT).toMatch(/register\(forTaskWithIdentifier: identifier, using: nil\)/);
    expect(SWIFT).not.toMatch(/register\(forTaskWithIdentifier: "[^"]*\*"/);
  });

  it("iOS 27부터는 모든 제출 오류를 받는 비동기 제출을 쓴다(헤더의 deprecation)", () => {
    expect(SWIFT).toMatch(
      /#available\(iOS 27, \*\)[\s\S]*try await BGTaskScheduler\.shared\.submitTaskRequest\(request\)/,
    );
    expect(SWIFT).toMatch(/try BGTaskScheduler\.shared\.submit\(request\)/);
  });

  it("비동기 제출은 Swift 6.4(iOS 27 SDK) 컴파일러에서만 컴파일된다 — 26 SDK에는 그 이름이 없다 (CI의 Xcode 26.6이 막혔다)", () => {
    // `#available`은 런타임 분기일 뿐 26 SDK에서도 이름을 해석하려 해 컴파일이 실패한다 → 컴파일 시점 분기가 감싼다
    expect(SWIFT).toMatch(
      /#if compiler\(>=6\.4\)[\s\S]*submitTaskRequest\(request\)[\s\S]*#else[\s\S]*try BGTaskScheduler\.shared\.submit\(request\)[\s\S]*#endif/,
    );
  });

  it("진행은 task.progress로, 보조 줄은 updateTitle로 보고하고 만료 처리기를 단다", () => {
    expect(SWIFT).toMatch(/\.progress\.totalUnitCount = /);
    expect(SWIFT).toMatch(/\.progress\.completedUnitCount = /);
    expect(SWIFT).toMatch(/\.updateTitle\(.*, subtitle: /);
    expect(SWIFT).toMatch(/\.expirationHandler = /);
    expect(SWIFT).toMatch(/setTaskCompleted\(success: /);
  });

  it("만료 처리기는 처리기 안에서 가장 먼저 달고, 만료 이벤트에 신청 식별자를 싣는다(코드 리뷰)", () => {
    expect(SWIFT).toMatch(
      /register\(forTaskWithIdentifier: identifier, using: nil\) \{[\s\S]*?task\.expirationHandler = [\s\S]*?self\.attach\(task, to: session\)/,
    );
    expect(SWIFT).toContain('sendEvent("onExpired", ["identifier": session.identifier])');
    expect(SWIFT).toMatch(/return identifier\n/);
  });
});

describe("092 CW1 — Info.plist 와일드카드", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const plugin = require("../../plugins/with-battery-bg-task") as {
    addBatteryIdentifier(plist: Record<string, unknown>): Record<string, unknown>;
    addContinuedWriteIdentifier(plist: Record<string, unknown>): Record<string, unknown>;
    CONTINUED_WRITE_IDENTIFIER: string;
  };

  it("plugin이 와일드카드를 한 번만 더한다", () => {
    expect(plugin.CONTINUED_WRITE_IDENTIFIER).toBe(WILDCARD);
    const once = plugin.addContinuedWriteIdentifier({
      BGTaskSchedulerPermittedIdentifiers: ["com.expo.modules.backgroundtask.processing"],
    });
    expect(plugin.addContinuedWriteIdentifier(once).BGTaskSchedulerPermittedIdentifiers).toEqual([
      "com.expo.modules.backgroundtask.processing",
      WILDCARD,
    ]);
    expect(plugin.addContinuedWriteIdentifier({}).BGTaskSchedulerPermittedIdentifiers).toEqual([
      WILDCARD,
    ]);
  });

  it("plugin 본체가 배터리 식별자와 와일드카드를 함께 더한다", () => {
    const source = strip(read("plugins/with-battery-bg-task.js"));
    expect(source).toMatch(
      /addContinuedWriteIdentifier\(addBatteryIdentifier\(mod\.modResults\)\)/,
    );
  });
});

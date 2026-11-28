/**
 * 139 IW1~IW4 — iPad 창 모드 로컬 모듈. 클래스·셀렉터 이름이 하나만 어긋나도 메서드가 붙지 않거나 불리지 않고, 창 조절 점이 다시 뒤로 가기를
 * 덮는다(조용한 실패 — 빌드도 앱도 오류를 내지 않는다). jest에는 네이티브가 없어 소스를 대조한다. 시뮬레이터 확인은
 * specs/139-ipad-window-controls/quickstart.md.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const DIR = "modules/pocketlog-ipad-window";
const SWIFT = () => code(read(`${DIR}/ios/PocketlogIpadWindowSubscriber.swift`));
const EXPO_SCENE = () =>
  code(read("node_modules/expo/ios/AppDelegates/ExpoAppSceneDelegate.swift"));

const SELECTORS = [
  "preferredWindowingControlStyleForScene:",
  "supportedInterfaceOrientationsForWindowScene:",
];

describe("IW1 — 모듈이 앱 시작에 불린다", () => {
  it("expo-module.config.json은 apple 전용이고 앱 대리자 구독자를 가리킨다", () => {
    const config = JSON.parse(read(`${DIR}/expo-module.config.json`)) as {
      platforms: string[];
      apple: { appDelegateSubscribers: string[] };
    };
    expect(config.platforms).toEqual(["apple"]);
    expect(config.apple.appDelegateSubscribers).toEqual(["PocketlogIpadWindowSubscriber"]);
  });

  it("구독자 클래스가 didFinishLaunching에서 붙인다(장면이 붙기 전)", () => {
    expect(SWIFT()).toContain(
      "public class PocketlogIpadWindowSubscriber: ExpoAppDelegateSubscriber",
    );
    expect(SWIFT()).toContain("didFinishLaunchingWithOptions");
  });

  it("podspec이 있고 ExpoModulesCore에 의존한다", () => {
    const podspec = read(`${DIR}/ios/PocketlogIpadWindow.podspec`);
    expect(podspec).toContain("s.name           = 'PocketlogIpadWindow'");
    expect(podspec).toContain("s.dependency 'ExpoModulesCore'");
  });
});

describe("IW2 — iPhone은 바뀌지 않는다", () => {
  it("메서드를 붙이기 전에 iPad가 아니면 돌아간다", () => {
    const swift = SWIFT();
    // 붙이는 함수 안에서 본다 — 파일 어딘가의 다른 guard로 만족되면 안 된다
    const start = swift.indexOf("private static func adaptSceneDelegateForPad");
    expect(start).toBeGreaterThan(-1);
    const attach = swift.slice(start);
    // 호환 모드의 userInterfaceIdiom은 iPad에서도 phone이라 model로 가른다(139 실측)
    const guard = attach.search(/guard UIDevice\.current\.model\.hasPrefix\("iPad"\) else/);
    expect(guard).toBeGreaterThan(-1);
    expect(attach.indexOf("class_addMethod")).toBeGreaterThan(guard);
    expect(swift).not.toContain("userInterfaceIdiom");
  });
});

describe("IW3 — 붙이는 대상과 값", () => {
  it("expo 장면 대리자의 실행 시 이름을 쓴다", () => {
    expect(SWIFT()).toContain('NSClassFromString("EXExpoAppSceneDelegate")');
    expect(EXPO_SCENE()).toContain("@objc(EXExpoAppSceneDelegate)");
  });

  it("창 조절 점은 최소 모양, 회전은 네 방향이다", () => {
    const swift = SWIFT();
    for (const selector of SELECTORS) expect(swift).toContain(`"${selector}"`);
    expect(swift).toContain("UIWindowScene.WindowingControlStyle.minimal");
    expect(swift).toContain("UIInterfaceOrientationMask.all");
  });
});

describe("IW5 — 전체 화면 앱에서는 회전을 늘리지 않는다", () => {
  // 전체 화면 호환 실행은 앱에게 iPhone 크기의 화면(실측 667×375)을 준다. 거기서 네 방향을 답하면 낮고 넓은 가로 화면이 되어
  // 홈 재료 칸이 잘렸다 — 원래는 가로에서도 세로 화면이 바로 섰다(139 실측).
  it("화면의 짧은 변이 iPad 크기일 때만 네 방향, 아니면 Info.plist와 같은 세로 둘", () => {
    const swift = SWIFT();
    expect(swift).toMatch(/let realPadScreenShortSide: CGFloat = 700\b/);
    expect(swift).toMatch(/min\(bounds\.width, bounds\.height\) >= realPadScreenShortSide/);
    expect(swift).toMatch(/UIInterfaceOrientationMask = \[\.portrait, \.portraitUpsideDown\]/);
  });

  it("Info.plist의 방향은 app.json의 portrait다(위 세로 둘의 근거)", () => {
    const appJson = JSON.parse(read("app.json")) as { expo: { orientation: string } };
    expect(appJson.expo.orientation).toBe("portrait");
  });
});

describe("IW6 — 설정을 바꾸고 돌아오면 다시 묻게 한다", () => {
  // 전체 화면 앱 → 윈도우형으로 바꾼 뒤 켜져 있던 앱은 옛 답(세로만)을 계속 써 가로에서 누웠다(139 실측)
  it("앞으로 올 때 iPad에서만 지원 방향을 다시 묻게 한다", () => {
    const swift = SWIFT();
    const active = swift.slice(swift.indexOf("func applicationDidBecomeActive"));
    expect(swift).toContain("func applicationDidBecomeActive");
    const guard = active.search(/guard UIDevice\.current\.model\.hasPrefix\("iPad"\) else/);
    expect(guard).toBeGreaterThan(-1);
    expect(active.indexOf("setNeedsUpdateOfSupportedInterfaceOrientations()")).toBeGreaterThan(
      guard,
    );
  });

  it("expo 장면 대리자가 앞으로 올 때를 앱 대리자 구독자에게 넘긴다", () => {
    expect(EXPO_SCENE()).toContain("forwarder.didBecomeActive()");
    expect(code(read("node_modules/expo/ios/AppDelegates/SceneEventForwarder.swift"))).toContain(
      "applicationDidBecomeActive(UIApplication.shared)",
    );
  });
});

describe("IW4 — expo가 같은 메서드를 갖게 되면 알아챈다", () => {
  it("expo 장면 대리자는 두 메서드를 구현하지 않는다(구현하면 class_addMethod가 조용히 진다)", () => {
    const expo = EXPO_SCENE();
    expect(expo).not.toContain("preferredWindowingControlStyle");
    expect(expo).not.toContain("supportedInterfaceOrientations");
  });
});

/**
 * 031 — 다크 모드에서도 라이트 고정 (①) 계약 테스트.
 *
 * 계약: specs/031-oneui85-fixes/contracts/dark-mode.md DM1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **prebuild를 돌리지 않고 검증한다.** plugin이 하는 일은 `styles.xml`(xml2js로
 * 파싱된 JSON)에 item 하나를 더하는 것뿐이므로 순수 함수로 떼어 놓으면 기기도
 * 빌드도 없이 갈래를 볼 수 있다. `with-release-signing.test.ts`가 같은 패턴이다.
 *
 * **이것이 통과해도 다크 모드가 실제로 막혔다는 뜻은 아니다**(원칙 V). 실제 확인은
 * One UI 8.5 기기에서 `adb shell "cmd uimode night yes"` 후 화면을 눈으로 본다
 * (quickstart T021·T025).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../../plugins/with-force-light-theme");

type StyleItem = { $: { name: string }; _?: string };
type Style = { $: { name: string; parent?: string }; item: StyleItem[] };
type Styles = { resources: { style: Style[] } };

const addForceLightItem: (xml: Styles) => Styles = plugin.addForceLightItem;

/** Expo 템플릿이 만드는 styles.xml 모양 (xml2js 파싱 결과). 실제 `styles.xml`에서 옮겨 왔다. */
function templateStyles(): Styles {
  return {
    resources: {
      style: [
        {
          $: { name: "AppTheme", parent: "Theme.AppCompat.DayNight.NoActionBar" },
          item: [{ $: { name: "colorPrimary" }, _: "@color/colorPrimary" }],
        },
        {
          $: { name: "Theme.App.SplashScreen", parent: "AppTheme" },
          item: [{ $: { name: "android:windowBackground" }, _: "@drawable/splashscreen_logo" }],
        },
      ],
    },
  };
}

function appThemeItems(xml: Styles): StyleItem[] {
  return xml.resources.style.find((s) => s.$.name === "AppTheme")!.item;
}

describe("DM1a·b — addForceLightItem", () => {
  it("순수 함수 addForceLightItem이 export된다", () => {
    expect(typeof addForceLightItem).toBe("function");
  });

  it("★ AppTheme에 android:forceDarkAllowed=false item을 더한다", () => {
    // **이것이 이 plugin의 존재 이유다.** 이 item이 없으면 One UI 8.5가 흰 배경
    // 뷰에 force-dark를 씌워 화면이 회색~검정으로 보인다(031 실기기 조사).
    const out = addForceLightItem(templateStyles());
    const item = appThemeItems(out).find((i) => i.$.name === "android:forceDarkAllowed");

    expect(item).toBeDefined();
    expect(item?._).toBe("false");
  });
});

describe("DM1c — 중복 미추가", () => {
  it("이미 forceDarkAllowed item이 있으면 하나만 남는다 (prebuild 여러 번)", () => {
    const seeded = templateStyles();
    appThemeItems(seeded).push({ $: { name: "android:forceDarkAllowed" }, _: "true" });

    const out = addForceLightItem(seeded);
    const matches = appThemeItems(out).filter((i) => i.$.name === "android:forceDarkAllowed");

    expect(matches).toHaveLength(1);
    expect(matches[0]._).toBe("false"); // 우리 값으로 덮어쓴다
  });
});

describe("DM1d — SplashScreen 테마에도 넣는다 (MainActivity 매니페스트 theme)", () => {
  it("Theme.App.SplashScreen에도 forceDarkAllowed=false가 붙는다", () => {
    // MainActivity의 매니페스트 android:theme가 Theme.App.SplashScreen이고,
    // 윈도우 데코가 읽는 건 상속 체인이 아니라 이 스타일의 자기 속성이다.
    const out = addForceLightItem(templateStyles());
    const splash = out.resources.style.find((s) => s.$.name === "Theme.App.SplashScreen")!;

    const item = splash.item.find((i) => i.$.name === "android:forceDarkAllowed");
    expect(item?._).toBe("false");
    // 기존 windowBackground는 그대로.
    expect(splash.item.some((i) => i.$.name === "android:windowBackground")).toBe(true);
  });

  it("Base.* 등 관계없는 style은 건드리지 않는다", () => {
    const seeded = templateStyles();
    seeded.resources.style.push({ $: { name: "Base.AlertDialog.AppCompat" }, item: [] });
    const out = addForceLightItem(seeded);
    const base = out.resources.style.find((s) => s.$.name === "Base.AlertDialog.AppCompat")!;
    expect(base.item).toHaveLength(0);
  });
});

describe("DM1e·f·g — 설정 소스 검사", () => {
  const APP_JSON = JSON.parse(readFileSync(join(__dirname, "../../app.json"), "utf8"));
  const PKG = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));

  it("DM1e — app.json plugins에 ./plugins/with-force-light-theme가 있다", () => {
    const plugins: unknown[] = APP_JSON.expo.plugins;
    const names = plugins.map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names).toContain("./plugins/with-force-light-theme");
  });

  it("DM1f — app.json userInterfaceStyle이 'light'다 (회귀 방지)", () => {
    // 누가 automatic으로 바꾸면 다크 모드에서 앱이 시스템을 따라간다.
    expect(APP_JSON.expo.userInterfaceStyle).toBe("light");
  });

  it("DM1g — package.json dependencies에 expo-system-ui가 있다", () => {
    // 없으면 userInterfaceStyle이 Android에서 무시된다(@expo/prebuild-config 설치본 확인).
    expect(PKG.dependencies["expo-system-ui"]).toBeDefined();
  });
});

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
const LIGHT_PARENT: string = plugin.LIGHT_PARENT;

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

  it("★ AppTheme의 parent를 DayNight → Light로 바꾼다", () => {
    // **이것이 이 plugin의 진짜 수정이다**(031 실기기 조사, 2026-09-03 SM-S928N).
    // DayNight 부모면 시스템 night 모드에서 윈도우 배경이 #303030(background_material_dark)
    // 으로 칠해진다 — expo-system-ui의 MODE_NIGHT_NO는 리소스 계층만 되돌리고
    // 이미 만들어진 윈도우 데코 배경은 못 고친다(uiMode가 configChanges에 있어
    // Activity 재생성도 안 됨). Light 부모면 night 모드와 무관하게 라이트로 해석된다.
    const out = addForceLightItem(templateStyles());
    const appTheme = out.resources.style.find((s) => s.$.name === "AppTheme")!;

    expect(appTheme.$.parent).toBe(LIGHT_PARENT);
    expect(LIGHT_PARENT).toBe("Theme.AppCompat.Light.NoActionBar");
  });

  it("AppTheme에 android:forceDarkAllowed=false item을 더한다 (제조사 force-dark 방어)", () => {
    // Light 테마에도 force-dark를 씌우는 제조사 대비 무해한 이중 방어.
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

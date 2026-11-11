/**
 * 116 — 안드로이드 3버튼 내비게이션 바의 대비 막(scrim)을 끈다.
 *
 * 하단 바(115)는 내비게이션 바 밑까지 색을 채우지만, 시스템이 투명 내비게이션 바에
 * 덧씌우는 막(`enforceNavigationBarContrast`, API 29+ 기본 true)이 그 자리를 옅게 바꾼다
 * (SM-S901N 실측: 빨강 → 분홍). prebuild 없이 순수 함수로 갈래를 본다
 * (`force-light-theme.test.ts`와 같은 패턴). 이것이 통과해도 기기에서 막이 사라졌다는 뜻은 아니다 —
 * 그건 `quickstart.md`의 기기 실측이다(원칙 V).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../../plugins/with-nav-bar-contrast");

type StyleItem = { $: { name: string }; _?: string };
type Style = { $: { name: string; parent?: string }; item: StyleItem[] };
type Styles = { resources: { style: Style[] } };

const addNavBarContrastItem: (xml: Styles) => Styles = plugin.addNavBarContrastItem;

function templateStyles(): Styles {
  return {
    resources: {
      style: [
        {
          $: { name: "AppTheme", parent: "Theme.AppCompat.Light.NoActionBar" },
          item: [{ $: { name: "android:navigationBarColor" }, _: "@android:color/transparent" }],
        },
        {
          $: { name: "Theme.App.SplashScreen", parent: "AppTheme" },
          item: [{ $: { name: "android:windowBackground" }, _: "@drawable/splashscreen_logo" }],
        },
      ],
    },
  };
}

const itemsOf = (xml: Styles, name: string) =>
  xml.resources.style.find((s) => s.$.name === name)!.item;

describe("NC1 — addNavBarContrastItem", () => {
  it("AppTheme에 enforceNavigationBarContrast=false를 더한다", () => {
    const out = addNavBarContrastItem(templateStyles());
    const hit = itemsOf(out, "AppTheme").filter(
      (i) => i.$.name === "android:enforceNavigationBarContrast",
    );
    expect(hit).toHaveLength(1);
    expect(hit[0]._).toBe("false");
  });

  it("두 번 적용해도 한 줄이다(멱등)", () => {
    const out = addNavBarContrastItem(addNavBarContrastItem(templateStyles()));
    expect(
      itemsOf(out, "AppTheme").filter((i) => i.$.name === "android:enforceNavigationBarContrast"),
    ).toHaveLength(1);
  });

  it("다른 item·다른 스타일은 건드리지 않는다", () => {
    const out = addNavBarContrastItem(templateStyles());
    expect(itemsOf(out, "AppTheme").some((i) => i.$.name === "android:navigationBarColor")).toBe(
      true,
    );
    expect(itemsOf(out, "Theme.App.SplashScreen")).toHaveLength(1);
  });
});

describe("NC2 — app.json", () => {
  it("plugins에 ./plugins/with-nav-bar-contrast가 있다", () => {
    const app = JSON.parse(readFileSync(join(__dirname, "../../app.json"), "utf8"));
    const names = (app.expo.plugins as unknown[]).map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names).toContain("./plugins/with-nav-bar-contrast");
  });
});

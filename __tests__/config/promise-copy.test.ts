/**
 * 085 — 설정·온보딩이 「그 시각에 쓴다」를 약속하지 않는다, 그리고 들이지 않은 권한·의존성.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md ST3~ST6·FX1
 *       spec.md SC-005·FR-013·FR-014·FR-019·FR-024
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { batteryRowHint } from "../../src/app/battery-row";
import { previewSentence } from "../../src/app/target-hour";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";

const ROOT = join(__dirname, "..", "..");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const read = (file: string) => strip(readFileSync(join(ROOT, file), "utf8"));

describe("ST3 — 시각 미리보기", () => {
  it("오후·오전", () => {
    expect(previewSentence(22, "h12")).toBe(
      "매일 오후 10시쯤 그날 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.",
    );
    expect(previewSentence(7, "h12")).toBe(
      "매일 오전 7시쯤 어제 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.",
    );
  });
});

describe("ST4 — 배터리 행", () => {
  it("안드로이드·iOS", () => {
    expect(batteryRowHint("android")).toBe("제한 없음이면 열지 않아도 먼저 써 둘 때가 있어요");
    expect(batteryRowHint("ios")).toBe("충전 중이면 먼저 써 둬요. 아니면 알림을 눌러 시작해요");
  });
});

describe("ST5 — 온보딩 알림·배터리 안내", () => {
  it("넷이 승인 문구다", () => {
    const by = Object.fromEntries(PERMISSION_REQUIREMENTS.map((r) => [r.key, r]));
    expect(by.notifications!.rationale).toBe("쓸 차례와 다 쓴 일기를 알려 드리기 위해 씁니다.");
    expect(by.notifications!.ifDenied).toBe("쓸 차례도, 다 쓴 일기도 알려 드리지 못해요.");
    expect(by["battery-exception"]!.rationale).toBe(
      "휴대폰이 절전에 들어가도 열지 않아도 먼저 써 둘 수 있게 허용을 요청합니다.",
    );
    expect(by["battery-exception"]!.ifDenied).toBe("앱을 열 때까지 쓰지 못할 수 있어요.");
  });
});

describe("ST6 — 약속하는 문장이 없다 (SC-005)", () => {
  it.each([
    "src/i18n/catalogs/ko/settings.ts",
    "src/i18n/catalogs/ko/settings-platform.ts",
    "src/i18n/catalogs/ko/onboarding.ts",
  ])("%s", (file) => {
    const code = read(file);
    expect(code).not.toMatch(/제때 써요|일기를 써요\.|정한 시간대에/);
  });
});

describe("FX1 — 들이지 않은 것 (FR-019)", () => {
  it("정확 알람 권한을 선언하지 않는다", () => {
    const files = ["app.json", ...readdirSync(join(ROOT, "plugins")).map((f) => `plugins/${f}`)];
    for (const file of files) {
      const code = file.endsWith(".json") ? readFileSync(join(ROOT, file), "utf8") : read(file);
      expect({ file, hit: /SCHEDULE_EXACT_ALARM|USE_EXACT_ALARM/.test(code) }).toEqual({
        file,
        hit: false,
      });
    }
  });

  it("배터리 예외 요청 권한은 blockedPermissions에만 있다", () => {
    const app = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8")) as {
      expo: { android: { permissions?: string[]; blockedPermissions?: string[] } };
    };
    expect(app.expo.android.blockedPermissions).toContain(
      "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    );
    expect(app.expo.android.permissions ?? []).not.toContain(
      "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    );
    for (const f of readdirSync(join(ROOT, "plugins"))) {
      expect(read(`plugins/${f}`)).not.toMatch(/REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
    }
  });

  // 104 — 085 FR-019의 「예외 여부를 읽는 통로를 들이지 않는다」를 뒤집었다(소유자 결정 2026-10-15). 대신 읽는 곳을 하나로 잠근다.
  it("expo-battery는 예외 읽기 통로 한 파일에서만 부른다", () => {
    const callers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name) && /expo-battery/.test(read(rel))) callers.push(rel);
      }
    };
    walk("src");
    expect(callers).toEqual(["src/schedule/battery-exception-port.ts"]);
  });
});

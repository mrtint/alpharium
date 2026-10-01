/**
 * 056 — 설정 조립의 소스 계약 (contracts/settings-time-place.md AS1~AS5).
 *
 * `App.tsx`의 조립은 기기 통로(`expo-*`)를 만들어 jest에서 그대로 그릴 수 없다 — 배선이 지켜야 할 자리를 소스로 잠근다.
 * 주석은 걷어 내고 센다(이 저장소의 주석은 금지하는 것을 설명하느라 그 낱말을 담는다).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const APP = stripComments(readFileSync(join(ROOT, "App.tsx"), "utf8"));

/** `function <name>(` 부터 다음 최상위 `function ` 앞까지 */
function bodyOf(name: string): string {
  const start = APP.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = APP.indexOf("\nfunction ", start + 1);
  return APP.slice(start, next === -1 ? undefined : next);
}

describe("AS3 — 설정 값은 AppFrame이 들고 있다 (056 FR-030·T3)", () => {
  it("SettingsSection은 설정 파일을 직접 읽지 않는다", () => {
    const section = bodyOf("SettingsSection");
    expect(section).not.toMatch(/loadAutoDiarySettings\(/);
    expect(section).not.toMatch(/loadGeocodingSetting\(/);
  });

  it("AppFrame이 두 파일을 읽는다", () => {
    const frame = bodyOf("AppFrame");
    expect(frame).toMatch(/loadAutoDiarySettings\(/);
    expect(frame).toMatch(/loadGeocodingSetting\(/);
  });

  it("「설정을 읽는 중…」은 값이 아직 없을 때만이다 (FR-031)", () => {
    const section = bodyOf("SettingsSection");
    expect(section).toMatch(/values === null/);
    expect(section).toMatch(/설정을 읽는 중…/);
  });
});

describe("AS4 — 켜짐이면 재등록하는 effect가 AppFrame에 있다 (020 B5, research R5)", () => {
  it("register()가 SettingsSection이 아니라 AppFrame에 있다", () => {
    expect(bodyOf("SettingsSection")).not.toMatch(/\.register\(\)/);
    expect(bodyOf("AppFrame")).toMatch(/\.register\(\)/);
  });
});

describe("AS1·AS2 — 두 대화상자의 배선", () => {
  it("시각은 applyTargetHour의 반환값으로 갱신한다(저장 실패면 그대로, SE2)", () => {
    const section = bodyOf("SettingsSection");
    expect(section).toMatch(/applyTargetHour\(/);
    expect(section).toMatch(/<TargetHourDialog/);
  });

  it("장소는 저장이 성공한 뒤에만 값을 바꾸고, 「켬」으로 바뀔 때만 위치 권한을 요청한다", () => {
    const section = bodyOf("SettingsSection");
    expect(section).toMatch(/<PlaceNameDialog/);
    expect(section).toMatch(/saveGeocodingSetting\(/);
    expect(section).toMatch(/requestForegroundPermissionsAsync/);
  });

  it("열린 대화상자만 그린다 — 열 때마다 새로 마운트된다 (FR-017)", () => {
    const section = bodyOf("SettingsSection");
    expect(section).toMatch(/openDialog === "time" &&/);
    expect(section).toMatch(/openDialog === "place" &&/);
  });
});

describe("AS5 — 옛 임시 자리를 걷었다 (056 FR-032·FR-033)", () => {
  it("옛 화면 파일과 import가 없다", () => {
    expect(existsSync(join(ROOT, "src/ui/AutoDiarySettingsScreen.tsx"))).toBe(false);
    expect(existsSync(join(ROOT, "src/ui/GeocodingSettingToggle.tsx"))).toBe(false);
    expect(APP).not.toMatch(/AutoDiarySettingsScreen|GeocodingSettingToggle/);
  });

  it("알림 거부 안내 상태가 없다", () => {
    expect(bodyOf("SettingsSection")).not.toMatch(/notificationDenied/);
  });
});

describe("R8 — src/app의 새 모듈은 화면 계층을 import하지 않는다", () => {
  it.each(["src/app/target-hour.ts", "src/app/device-clock.ts"])("%s", (file) => {
    const source = stripComments(readFileSync(join(ROOT, file), "utf8"));
    expect(source).not.toMatch(/from "\.\.\/ui/);
  });
});

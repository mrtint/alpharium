/**
 * 068 — `react-native`를 `await import`하지 않는다 (contracts/ios-settings.md C3, spec FR-006).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Metro의 동적 import는 index의 모든 export getter를 훑는다(`metroImportAll`). iOS에서 `PushNotificationIOS` getter가 네이티브 모듈 없이
 * `new NativeEventEmitter()`를 만들다 던지고(`Invariant Violation: new NativeEventEmitter() requires a non-null argument`), 그 예외는 호출부의
 * try/catch를 지나친다 — 배포 빌드에서 앱이 종료된다(066, TestFlight 빌드 2). 2026-10-09 iOS 시뮬레이터에서 수정 전 코드로 재현했다.
 * jest는 이 getter를 훑지 않으므로 기기 없는 테스트가 못 잡는다 — 소스를 읽는 것이 유일한 방어다.
 *
 * `expo-*`·`llama.rn`의 동적 import는 이 규칙이 아니다(훑는 대상이 `react-native` index다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const strip = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const FILES = [...sourceFiles(join(ROOT, "src")), join(ROOT, "App.tsx")];
const read = (rel: string) => strip(readFileSync(join(ROOT, rel), "utf8"));

describe("068 C3 — react-native 동적 import 금지", () => {
  it("소스 파일이 실제로 읽힌다(빈 목록이면 아래 단언이 헛돈다)", () => {
    expect(FILES.length).toBeGreaterThan(50);
  });

  it('src/·App.tsx 어디에도 `import("react-native")`가 없다', () => {
    const offenders = FILES.filter((f) =>
      /import\(\s*["']react-native["']\s*\)/.test(strip(readFileSync(f, "utf8"))),
    );
    expect(offenders).toEqual([]);
  });

  it('os-settings-port.ts는 `require("react-native")`를 openAppSettings 안에서 호출한다', () => {
    const code = read("src/onboarding/os-settings-port.ts");
    const body = code.slice(code.indexOf("async openAppSettings"));
    expect(body).toMatch(/require\(\s*["']react-native["']\s*\)/);
    expect(code.slice(0, code.indexOf("async openAppSettings"))).not.toMatch(
      /require\(\s*["']react-native["']\s*\)/,
    );
  });

  it("battery-exception-port.ts의 앱 설정 대체 경로도 호출 시점 require다", () => {
    const code = read("src/schedule/battery-exception-port.ts");
    const fn = code.slice(code.indexOf("async function openAppSettingsFallback"));
    expect(fn).toMatch(/require\(\s*["']react-native["']\s*\)/);
    expect(code.slice(0, code.indexOf("async function openAppSettingsFallback"))).not.toMatch(
      /require\(\s*["']react-native["']\s*\)/,
    );
  });
});

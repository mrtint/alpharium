/**
 * 059 — `App.tsx` 개발자 메뉴 조립의 소스 계약.
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md DV11·OF1·DG1·DG2·BD3·RD6, research R6~R8
 *
 * 조립부는 기기 통로와 화면 겹이 얽혀 jest로 그리기 어렵다 — 「무엇을 어떤 순서·조건에서 하는가」를 소스에서 잠근다(주석을 걷은 뒤).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const APP = strip(readFileSync(join(ROOT, "App.tsx"), "utf8"));

function body(start: string, end: string): string {
  const from = APP.indexOf(start);
  expect(from).toBeGreaterThan(0);
  const to = APP.indexOf(end, from + start.length);
  expect(to).toBeGreaterThan(from);
  return APP.slice(from, to);
}

/** 앵커(`title={...}`)가 속한 `<StackLayer ...>` 여는 태그(속성까지)를 돌려준다 — 공백·줄바꿈에 흔들리지 않게 한 줄로 접는다 */
function layerOpening(anchor: string): string {
  const at = APP.indexOf(anchor);
  expect(at).toBeGreaterThan(0);
  const start = APP.lastIndexOf("<StackLayer", at);
  expect(start).toBeGreaterThan(0);
  const end = APP.indexOf(">", start);
  return APP.slice(start, end + 1).replace(/\s+/g, " ");
}

describe("DV11 — 개발자는 설정 위에 쌓인다", () => {
  it("설정 겹의 open 은 개발자가 열린 동안에도 참이고 active 는 그동안 거짓이다", () => {
    const layer = layerOpening("title={SETTINGS_TEXT.title}");
    expect(layer).toMatch(/route === "settings" \|\| route === "developer"/);
    expect(layer).toMatch(/route !== "developer"/);
  });

  it("개발자 겹은 설정 겹보다 뒤에 그려지고 닫으면 설정으로 돌아간다(홈이 아니다)", () => {
    const settings = APP.indexOf("title={SETTINGS_TEXT.title}");
    const developer = APP.indexOf("title={DEVELOPER_TEXT.title}");
    expect(settings).toBeGreaterThan(0);
    expect(developer).toBeGreaterThan(settings);
    expect(layerOpening("title={DEVELOPER_TEXT.title}")).toMatch(/onClose=\{backToSettings\}/);
    expect(APP).toMatch(
      /const backToSettings = useCallback\(\(\) => \{[\s\S]*?setRoute\("settings"\)/,
    );
  });

  it("개발자 겹의 open 은 켜짐 상태를 본다", () => {
    expect(layerOpening("title={DEVELOPER_TEXT.title}")).toMatch(
      /developer\.enabled && route === "developer"/,
    );
  });
});

describe("DG2·BD3 — 진단은 한 자리에서 showsDiagnostics 로 막는다", () => {
  it("DiagnosticsLayer 는 한 번만 쓰이고 그것을 그리는 겹이 showsDiagnostics 로 감싸여 있다", () => {
    // 060 — 값·핸들러를 만드는 조립 컴포넌트(`DiagnosticsLayer`)가 겹 안에서 한 번 그려지고, 화면(`DiagnosticsScreen`)은 그 안에서만 쓰인다.
    expect(APP.match(/<DiagnosticsLayer/g)).toHaveLength(1);
    expect(APP.match(/<DiagnosticsScreen/g)).toHaveLength(1);
    const at = APP.indexOf("<DiagnosticsLayer");
    const guard = APP.lastIndexOf("{showsDiagnostics && (", at);
    expect(guard).toBeGreaterThan(0);
    expect(APP.indexOf("</StackLayer>", at)).toBeGreaterThan(at);
    // 가드와 화면 사이에 다른 가드 닫힘(`)}`)이 없다
    expect(APP.slice(guard, at)).not.toMatch(/\)\}/);
  });

  it("showsOnScreen( 을 부르는 곳이 한 곳이다", () => {
    expect(APP.match(/showsOnScreen\(/g)).toHaveLength(1);
  });

  it("DeveloperScreen 에 진단 진입은 showsDiagnostics 일 때만 넘긴다", () => {
    expect(APP).toMatch(/showsDiagnostics=\{showsDiagnostics\}/);
    expect(APP).toMatch(/onOpenDiagnostics=\{showsDiagnostics \? openDiagnostics : undefined\}/);
  });
});

describe("OF1 — 끄기", () => {
  it("disable() 뒤 진단 겹을 닫고 설정으로 돌아간다", () => {
    const fn = body("const onDisableDeveloper = useCallback(", "}, [");
    expect(fn).toMatch(/developer\.disable\(\)/);
    expect(fn).toMatch(/setDiagnosing\(false\)/);
    expect(fn).toMatch(/setRoute\("settings"\)/);
  });
});

describe("RD6 — 다시 받기는 쓰는 중인 홈을 멈춘 뒤에만 시작하고 파일을 지우지 않는다", () => {
  it("확정: await stopHome() → onRedownload() → goHome() 순서다", () => {
    const fn = body("const onConfirmRedownload = useCallback(", "}, [");
    const stop = fn.indexOf("await stopHome()");
    const redownload = fn.indexOf("await onRedownload()");
    const home = fn.indexOf("goHome()");
    expect(stop).toBeGreaterThan(0);
    expect(redownload).toBeGreaterThan(stop);
    expect(home).toBeGreaterThan(redownload);
  });

  it("다시 받기 핸들러에 지우기 어휘가 없다(037)", () => {
    const request = body("const onRequestRedownload = useCallback(", "}, [");
    const confirm = body("const onConfirmRedownload = useCallback(", "}, [");
    for (const fn of [request, confirm]) {
      expect(fn).not.toMatch(/\.remove\(|\.delete\(|removeAll|unlink/);
    }
  });

  it("받을 것이 없으면 allReady 토스트이고 읽다 던지면 allReady 가 아니다", () => {
    const request = body("const onRequestRedownload = useCallback(", "}, [");
    expect(request).toMatch(/plan\.kind === "nothing"/);
    expect(request).toMatch(/DEVELOPER_TEXT\.allReady/);
    expect(request).toMatch(/planRedownload\(/);
  });
});

describe("CL1 — 059가 지운 옛 화면을 아무도 import 하지 않는다", () => {
  const DELETED = [
    "CharacterListScreen",
    "PermissionsSection",
    "AuthorPicker",
    "CharacterPicker",
    "ListRow",
    "SelectRow",
  ];

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx|mts)$/.test(name)) out.push(full);
    }
    return out;
  }

  it("파일이 없고, src·__tests__·scripts·App.tsx 어디에도 그 이름으로 import 하는 곳이 없다", () => {
    const files = [
      ...walk(join(ROOT, "src")),
      ...walk(join(ROOT, "__tests__")),
      ...walk(join(ROOT, "scripts")),
      join(ROOT, "App.tsx"),
    ].filter((file) => !file.endsWith("app-developer-source.test.ts"));
    for (const file of files) {
      const code = strip(readFileSync(file, "utf8"));
      for (const name of DELETED) {
        expect(code).not.toMatch(new RegExp(`from\s+["'][^"']*/${name}["']`));
      }
    }
    for (const name of [
      "CharacterListScreen",
      "PermissionsSection",
      "AuthorPicker",
      "CharacterPicker",
    ]) {
      expect(existsSync(join(ROOT, "src", "ui", `${name}.tsx`))).toBe(false);
    }
    for (const name of ["ListRow", "SelectRow"]) {
      expect(existsSync(join(ROOT, "src", "ui", "components", `${name}.tsx`))).toBe(false);
    }
  });
});

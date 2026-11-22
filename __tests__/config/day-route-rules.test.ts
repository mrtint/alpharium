/**
 * 125 — 동선 도식의 경계 (소스 계약).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DB1~DB5, DR9, DU1·DU6, spec FR-004·FR-007·FR-008·FR-012
 *
 * ─────────────────────────────────────────────
 * 이 도식이 지도 대신 점·선으로 그려진 까닭은 **위치가 휴대폰 밖으로 나가지 않고, 일기 파일에 새로 저장되지 않고,
 * 새 권한이 없기 때문**이다. 이 약속은 동작 테스트로는 닿지 않는 자리(네트워크 호출·라이브러리·의존성)가 많아 소스를
 * 읽어 잠근다. 소스를 읽는 검사는 주석을 먼저 걷어낸다 — 이 저장소의 주석은 무엇을 왜 금지하는지 적으므로 금지어가
 * 설명 안에 정당하게 나온다(011·035 관례).
 * ─────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");

const raw = (file: string) => readFileSync(join(ROOT, file), "utf8");
const code = (file: string) =>
  raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const ROUTE_FILES = [
  "src/app/day-route.ts",
  "src/ui/DayRouteSection.tsx",
  // 126 — 지도 층·라벨 배치. `react-native-svg`는 `RouteMapLayer` 한 곳에서만 쓰고(dialog-foundation-deps DEP1) 지도 라이브러리는 아니다
  "src/ui/RouteMapLayer.tsx",
  "src/ui/label-placement.ts",
] as const;
/** 좌표·신호를 몰라야 하는 화면 파일 — 도식 부품과 그것을 지면까지 나르는 두 곳 */
const SCREEN_FILES = [
  "src/ui/DayRouteSection.tsx",
  "src/ui/WrittenDayPaper.tsx",
  "src/ui/DiaryListScreen.tsx",
  "src/ui/RouteMapLayer.tsx", // 126
  "src/ui/label-placement.ts", // 126
] as const;

describe("DB1 — 지도·네트워크가 없다", () => {
  it.each(ROUTE_FILES)("%s에 지도·위치 라이브러리와 네트워크 호출이 없다", (file) => {
    const src = code(file);
    expect(src).not.toMatch(/react-native-maps|maplibre|mapbox|expo-location|google-maps|leaflet/i);
    expect(src).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|axios|\.sendBeacon/);
  });

  it("★ 의존성에 지도·위치 라이브러리가 없다 (package.json)", () => {
    const pkg = JSON.parse(raw("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const banned = names.filter((n) =>
      /react-native-maps|maplibre|mapbox|expo-location|leaflet|google-maps/i.test(n),
    );
    expect(banned).toEqual([]);
  });
});

describe("DB2·FR-004 — 화면은 좌표·신호를 모른다", () => {
  it.each(SCREEN_FILES)("%s는 signals를 import하지 않고 좌표 이름을 쓰지 않는다", (file) => {
    const src = code(file);
    expect(src).not.toMatch(/from\s+["'][./]*\/signals\//);
    expect(src).not.toMatch(/\bPlaceVisit\b|\bCoordinate\b|\bPhotoPlaces\b|\bDaySignals\b/);
    expect(src).not.toMatch(/\blatitude\b|\blongitude\b/);
  });

  it("DU1 — 도식 부품은 app/의 DayRoute 모양만 import한다", () => {
    const src = code("src/ui/DayRouteSection.tsx");
    const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    expect(imports.filter((p) => p!.includes("app/"))).toEqual(["../app/day-route"]);
    expect(src).not.toMatch(/import\s+\{[^}]*\bbuildDayRoute\b/);
  });
});

describe("DR9 — 변환은 순수하다", () => {
  it("day-route.ts는 파일·기기·네트워크·화면을 import하지 않는다", () => {
    const src = code("src/app/day-route.ts");
    const imports = [...new Set([...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]!))];
    // 126 — 이미 읽은 지도 파일의 해석(`../map/map-file`, 타입)과 지도 렌더 위임(`./day-map`)이 더해졌다. 좌표 계산(`signals/places`)은 걷었다.
    expect(imports.sort()).toEqual(
      ["../diary/place-lines", "../map/map-file", "../signals/types", "./day-map"].sort(),
    );
    expect(src).not.toMatch(/\bDate\.now\b|new Date\(\)|Math\.random|process\.env|require\(/);
  });
});

describe("DB3·FR-007 — routeDay는 일기 저장소를 건드리지 않는다", () => {
  /** `routeDay: async (…) => { … },` 본문 */
  const routeDayBody = () => {
    const match = /routeDay:\s*async[\s\S]*?\n {4}\},\n {2}\};/.exec(code("src/app/wiring.ts"));
    expect(match).not.toBeNull();
    return match![0];
  };

  it("본문에 저장소 접근(save·load·remove·has·listDays)이 없다", () => {
    const body = routeDayBody();
    expect(body).not.toMatch(/\bstore\b/);
    expect(body).not.toMatch(/\.(save|load|has|listDays|removeAll|removeDay)\s*\(/);
    expect(body).not.toMatch(/writeFile|FileSystem|AsyncStorage|setItem/);
  });

  it("같은 loadSignals를 쓴다 — 새 수집 경로가 아니다", () => {
    expect(routeDayBody()).toMatch(/\bloadSignals\(day\)/);
  });
});

describe("DB4·FR-012 — 모르는 것을 기본값으로 채우지 않는다", () => {
  it("day-route.ts는 좌표를 기본값(`?? 0`·`|| 0`)으로 채우지 않는다", () => {
    const src = code("src/app/day-route.ts");
    expect(src).not.toMatch(/(latitude|longitude)\s*(\?\?|\|\|)/);
    // 126 — 위치를 0.5로 채우는 리터럴(`x: 0.5,`)이 없다. 한 곳뿐인 날의 가운데 위치는 투영 결과이지 기본값이 아니다.
    expect(src).not.toMatch(/\bx\s*:\s*0\.5\s*[,}]|\by\s*:\s*0\.5\s*[,}]/);
  });

  it("좌표를 모르는 경우(저장된 좌표도 다시 읽은 좌표도 없음)는 투영보다 먼저 목록으로 돌아간다", () => {
    const src = code("src/app/day-route.ts");
    const guard = src.indexOf("coordinates === null");
    const projection = src.indexOf("projectFrame(coordinates");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(projection);
    // 다시 읽은 좌표는 읽었고(null 아님) 저장된 자리와 같을 때만 쓴다
    expect(src).toMatch(/visits\s*!==\s*null\s*&&\s*sameVisits\(/);
  });
});

describe("DB5·FR-008 — 새 권한이 없다", () => {
  const app = (
    JSON.parse(raw("app.json")) as {
      expo: {
        android?: { permissions?: string[]; blockedPermissions?: string[] };
        ios?: { infoPlist?: Record<string, unknown> };
      };
    }
  ).expo;

  it("요청하는 안드로이드 권한에 기기 위치가 없다(`ACCESS_MEDIA_LOCATION`은 사진 EXIF 좌표를 읽는 것이라 다르다)", () => {
    const requested = app.android?.permissions ?? [];
    const device = requested.filter((p) => /LOCATION/.test(p) && !/MEDIA_LOCATION/.test(p));
    expect(device).toEqual([]);
  });

  it("기기 위치 권한은 계속 제외 목록(blockedPermissions)에 있다 — 의존성이 끌고 들어오지 못한다", () => {
    const blocked = app.android?.blockedPermissions ?? [];
    for (const name of [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
    ]) {
      expect(blocked).toContain(`android.permission.${name}`);
    }
  });

  it("iOS 안내 문구(infoPlist)에 위치 키가 없다", () => {
    const keys = Object.keys(app.ios?.infoPlist ?? {});
    expect(keys.filter((k) => /^NSLocation/.test(k))).toEqual([]);
  });
});

describe("DB6 — 상태 흉내 중에는 실제 사진을 읽지 않는다", () => {
  it("App.tsx는 흉내(homePreviewDay)가 없고 조립이 성공했을 때만 routeDay를 홈에 넘긴다", () => {
    const src = code("App.tsx").replace(/\s+/g, " ");
    expect(src).toContain(
      "routeDay={homePreviewDay === undefined && wiring.ok ? wiring.routeDay : undefined}",
    );
  });
});

describe("DU6 — 색은 토큰만, 모서리·그림자 없음", () => {
  it("DayRouteSection.tsx에 16진수 색·반경·그림자·그라데이션이 없다", () => {
    const src = code("src/ui/DayRouteSection.tsx");
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/\bborderRadius\b|\bshadow\w*\b|\belevation\b|gradient/i);
    expect(src).toMatch(/\bCOLORS\./);
  });
});

describe("126 DM22 — 좌표는 일기를 쓸 때만 저장한다(지면을 열어 보는 동작은 일기를 고쳐 쓰지 않는다)", () => {
  it("routeDay·day-route는 저장소를 쓰거나 좌표 필드를 채우지 않는다 — 옛 일기에 좌표를 채우는 이행 코드가 없다", () => {
    const wiring = code("src/app/wiring.ts");
    const body = /routeDay:\s*async[\s\S]*?\n {4}\},\n {2}\};/.exec(wiring)![0];
    expect(body).not.toMatch(/\bstore\b|\.save\(|latE5\s*[:=]|lonE5\s*[:=]/);
    expect(code("src/app/day-route.ts")).not.toMatch(/latE5\s*[:=]|lonE5\s*[:=]/);
  });

  it("latE5·lonE5 값을 만드는 곳은 `savedPlacesOf`(일기를 쓸 때) 하나다 — 다른 소스 파일은 읽기만 한다", () => {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const walk = (dir: string): string[] =>
      readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(`${dir}/${e.name}`)
          : /\.tsx?$/.test(e.name)
            ? [`${dir}/${e.name}`]
            : [],
      );
    const writers = walk("src").filter((f) => /\blatE5\s*:\s*Math\.round/.test(code(f)));
    expect(writers).toEqual(["src/diary/place-lines.ts"]);
  });
});

/**
 * 126 — 동선 지도의 경계 계약 (contracts/day-map.md DM16~DM18). 규칙은 `scripts/constitution-rules.ts` `checkMapFile`이고,
 * 이 테스트는 (1) 규칙이 위반을 실제로 잡는지(위반 주입) (2) 실제 소스가 규칙을 지키는지를 함께 본다.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { checkMapFile } from "../../scripts/constitution-rules";

const ROOT = join(__dirname, "..", "..");

describe("126 checkMapFile — 위반 주입", () => {
  it("MP1 — src/ui/가 src/map/을 import하면 잡는다", () => {
    const v = checkMapFile(
      "src/ui/RouteMapLayer.tsx",
      'import { renderMap } from "../map/render";',
    );
    expect(v.map((x) => x.key)).toContain("ui→map");
  });

  it("MP1 — 타입을 app/day-route.ts에서 가져오는 것은 통과한다", () => {
    expect(
      checkMapFile("src/ui/RouteMapLayer.tsx", 'import type { RouteMap } from "../app/day-route";'),
    ).toEqual([]);
  });

  it("MP2 — src/map/이 src/app/·src/ui/를 import하면 잡는다", () => {
    expect(
      checkMapFile("src/map/render.ts", 'import { X } from "../app/day-map";').map((x) => x.key),
    ).toContain("map→app/ui");
    expect(
      checkMapFile("src/map/render.ts", 'import { X } from "../ui/theme/tokens";').map(
        (x) => x.key,
      ),
    ).toContain("map→app/ui");
  });

  it("MP3 — map-port.ts 밖의 src/map/이 expo·react-native를 import하면 잡고, 포트는 통과한다", () => {
    expect(
      checkMapFile("src/map/render.ts", 'import { View } from "react-native";').map((x) => x.key),
    ).toContain("map→device");
    expect(
      checkMapFile("src/map/map-file.ts", 'const a = await import("expo-asset");').map(
        (x) => x.key,
      ),
    ).toContain("map→device");
    expect(
      checkMapFile("src/map/map-port.ts", 'const { Asset } = await import("expo-asset");'),
    ).toEqual([]);
  });

  it("MP4 — 지도 코드의 외부 요청·지도 라이브러리를 잡는다", () => {
    expect(checkMapFile("src/map/render.ts", "await fetch(url)").map((x) => x.key)).toContain(
      "network",
    );
    expect(
      checkMapFile("src/app/day-route.ts", "new XMLHttpRequest()").map((x) => x.key),
    ).toContain("network");
    expect(
      checkMapFile("src/ui/DayRouteSection.tsx", 'import M from "react-native-maps";').map(
        (x) => x.key,
      ),
    ).toContain("map-lib");
  });

  it("주석에 적은 설명은 위반으로 잡지 않는다", () => {
    expect(
      checkMapFile(
        "src/map/render.ts",
        '// fetch( 를 쓰지 않는다 — react-native-maps 도\n/* import from "../app/x" */',
      ),
    ).toEqual([]);
  });

  it("지도와 상관없는 파일은 보지 않는다", () => {
    expect(checkMapFile("src/diary/pipeline.ts", "await fetch(url)")).toEqual([]);
  });
});

describe("126 실제 소스 — 지도 경계를 지킨다", () => {
  const files = [
    "src/map/map-file.ts",
    "src/map/render.ts",
    "src/map/map-port.ts",
    "src/app/day-route.ts",
    "src/app/day-map.ts",
    "src/ui/DayRouteSection.tsx",
    "src/ui/RouteMapLayer.tsx",
  ];
  it.each(files)("%s", (file) => {
    if (!existsSync(join(ROOT, file))) return; // 아직 만들지 않은 파일은 건너뛴다(만들어지면 검사된다)
    expect(checkMapFile(file, readFileSync(join(ROOT, file), "utf8"))).toEqual([]);
  });

  it("DM18 — app.json의 권한·플러그인 목록에 지도 때문에 늘어난 것이 없다(react-native-svg는 플러그인이 필요 없다)", () => {
    const app = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8")) as {
      expo: { plugins?: unknown[] };
    };
    const text = JSON.stringify(app.expo.plugins ?? []);
    expect(text).not.toContain("react-native-svg");
    expect(text).not.toMatch(/maps|maplibre|mapbox/i);
  });
});

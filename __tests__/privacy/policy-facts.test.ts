/**
 * 086 — 방침이 기대는 코드의 사실 (contracts/policy-facts.md F1~F6).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 방침(`site/privacy/index.html`)은 「분석·크래시 SDK가 없다」「앱이 접속하는 곳은 모듈 내려받기뿐이다」「좌표는 장소 이름을 얻을
 * 때 하나만 나간다」를 말한다. 그 문장이 출시 뒤 조용히 거짓이 되면 스토어 허위 신고다(헌법 원칙 V). 이 테스트는 그 사실을
 * 소스에서 잠근다 — 실패하면 코드를 되돌리거나, 방침·선언 초안·표(`outbound.ts`)를 함께 고친다.
 *
 * **범위: 소스에서 보이는 것만 본다.** 네이티브 라이브러리가 스스로 하는 통신, OS 백업, OS 지오코더 뒤의 서버는 보지 못한다 —
 * 초록이 「방침이 참」을 뜻하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { ALLOWED_HOSTS, FIX_POLICY, FORBIDDEN_SDKS, OUTBOUND, URL_SCAN_EXCLUDED } from "./outbound";
import { ROOT } from "./read-site";

/** 블록·줄 주석을 걷는다 — `https://`의 `//`는 줄 주석으로 보지 않는다(no-react-native-dynamic-import.test.ts와 같은 식) */
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

/** 앱 소스 — `src/` 전부와 `App.tsx`(저장소 기준 경로 → 주석을 걷은 코드) */
function appSources(): Map<string, string> {
  const files = [...sourceFiles(join(ROOT, "src")), join(ROOT, "App.tsx")];
  return new Map(files.map((f) => [relative(ROOT, f), strip(readFileSync(f, "utf8"))]));
}

describe("086 F — 방침이 기대는 코드의 사실 (소스에서 보이는 것만)", () => {
  const sources = appSources();

  it("소스 파일이 실제로 읽힌다(빈 목록이면 아래 단언이 헛돈다)", () => {
    expect(sources.size).toBeGreaterThan(50);
  });

  it("F1 — 앱에 실리는 의존성에 금지 SDK(분석·크래시·광고·원격 푸시·원격 업데이트)가 없다", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const hits = Object.keys(pkg.dependencies).filter((name) =>
      FORBIDDEN_SDKS.some((f) => (f.endsWith("/") ? name.startsWith(f) : name === f)),
    );
    expect({ hits, fix: FIX_POLICY }).toEqual({ hits: [], fix: FIX_POLICY });
  });

  it("F2 — 푸시 토큰을 받는 호출이 없다(expo-notifications는 로컬 알림에만 쓴다)", () => {
    const hits = [...sources]
      .filter(([, code]) => /\b(getExpoPushTokenAsync|getDevicePushTokenAsync)\b/.test(code))
      .map(([path]) => path);
    expect({ hits, fix: FIX_POLICY }).toEqual({ hits: [], fix: FIX_POLICY });
  });

  // F3는 소스에 리터럴로 쓴 주소만 본다 — 조립한 주소(`${base}/x`)는 못 잡는다(데스크톱 서버가 그 꼴이고 local 전용이다).
  it("F3 — 앱 소스의 외부 주소는 허용 목록의 호스트뿐이다(주석·빼는 파일 제외)", () => {
    const excluded = new Set(URL_SCAN_EXCLUDED.map((e) => e.path));
    const allowed = new Set(ALLOWED_HOSTS.map((h) => h.host));
    const offenders: string[] = [];
    for (const [path, code] of sources) {
      if (excluded.has(path)) continue;
      for (const m of code.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
        let host: string;
        try {
          host = new URL(m[0]).hostname;
        } catch {
          host = m[0];
        }
        if (!allowed.has(host)) offenders.push(`${path}: ${m[0]}`);
      }
    }
    expect({ offenders, fix: FIX_POLICY }).toEqual({ offenders: [], fix: FIX_POLICY });
  });

  it("F4 — reverseGeocodeAsync 호출은 src/signals/geocoding-port.ts 한 곳, 한 번뿐이다", () => {
    const calls = [...sources].flatMap(([path, code]) =>
      [...code.matchAll(/\breverseGeocodeAsync\s*\(/g)].map(() => path),
    );
    expect({ calls, fix: FIX_POLICY }).toEqual({
      calls: ["src/signals/geocoding-port.ts"],
      fix: FIX_POLICY,
    });
  });

  it("F7 — 기기의 현재 위치를 읽거나 주소 문자열을 지오코딩하는 호출이 없다(방침 「현재 위치를 읽지 않습니다」)", () => {
    const LOCATION_READS =
      /\b(getCurrentPositionAsync|getLastKnownPositionAsync|watchPositionAsync|startLocationUpdatesAsync|watchHeadingAsync|startGeofencingAsync|geocodeAsync)\s*\(/g;
    const hits = [...sources].flatMap(([path, code]) =>
      [...code.matchAll(LOCATION_READS)].map((m) => `${path}: ${m[1]}`),
    );
    expect({ hits, fix: FIX_POLICY }).toEqual({ hits: [], fix: FIX_POLICY });
  });

  it("F5 — 허용 목록의 호스트는 모두 소스에 실제로 나온다(낡은 허용 0)", () => {
    const all = [...sources.values()].join("\n");
    const stale = ALLOWED_HOSTS.filter((h) => !all.includes(`//${h.host}/`)).map((h) => h.host);
    expect({ stale, fix: FIX_POLICY }).toEqual({ stale: [], fix: FIX_POLICY });
  });

  it("F6 — 외부 전송 목록의 코드 근거 파일이 있다", () => {
    const missing = OUTBOUND.flatMap((e) =>
      e.evidence.kind === "code" ? e.evidence.paths.filter((p) => !existsSync(join(ROOT, p))) : [],
    );
    expect({ missing, fix: FIX_POLICY }).toEqual({ missing: [], fix: FIX_POLICY });
  });
});

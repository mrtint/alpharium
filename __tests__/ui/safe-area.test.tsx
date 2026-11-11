/**
 * 시스템 막대와 화면이 겹치지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 렌더가 아니라 소스를 보는가**
 *
 * 겹침은 **실제 인셋 값이 있어야 드러나는 것**이고 그 값은 기기에서 온다. 테스트
 * 환경의 인셋은 0이라 겹쳐도 겹치지 않아도 똑같이 그려진다 — 즉 **렌더 테스트로는
 * 이 버그를 잡을 수 없다.**
 *
 * 잡을 수 있는 것은 「어느 `SafeAreaView`를 쓰는가」다. `react-native`의 것은
 * **안드로이드에서 아무 일도 하지 않으므로**(iOS 전용) 그것을 쓰는 순간 겹친다.
 * 그것은 소스에 드러나 있고 기기 없이 볼 수 있다.
 *
 * **이것이 통과해도 눈으로 본 것은 아니다**(원칙 V) — 실제 확인은 기기 화면이다.
 * 이 테스트가 막는 것은 「되돌아가는 것」이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_SOURCE = readFileSync(join(__dirname, "../../App.tsx"), "utf8");

describe("★ 상태 표시줄과 겹치지 않는다", () => {
  it("`react-native`의 SafeAreaView를 쓰지 않는다", () => {
    // **iOS 전용이라 안드로이드에서 조용히 아무 일도 하지 않는다.**
    // 그 결과가 시계·배터리와 탭이 겹쳐 보이는 것이었다.
    const reactNativeImport = APP_SOURCE.match(/import \{([^}]*)\} from "react-native";/);

    expect(reactNativeImport).not.toBeNull();
    expect(reactNativeImport?.[1]).not.toMatch(/\bSafeAreaView\b/);
  });

  it("`react-native-safe-area-context`에서 가져온다", () => {
    expect(APP_SOURCE).toMatch(
      /import \{[^}]*\bSafeAreaView\b[^}]*\} from "react-native-safe-area-context";/,
    );
  });

  it("SafeAreaProvider가 감싼다", () => {
    // 이것이 없으면 `SafeAreaView`가 잴 값을 얻지 못해 인셋이 0이 된다 —
    // **고친 것처럼 보이지만 그대로 겹친다.**
    expect(APP_SOURCE).toMatch(
      /import \{[^}]*\bSafeAreaProvider\b[^}]*\} from "react-native-safe-area-context";/,
    );
    expect(APP_SOURCE).toContain("<SafeAreaProvider>");
  });

  it("위쪽 인셋을 피한다", () => {
    // 상태 표시줄이 있는 쪽이다. `edges`를 좁혀 `top`을 빼면 다시 겹친다.
    expect(APP_SOURCE).toMatch(/edges=\{\[[^\]]*"top"/);
  });
});

/**
 * 115 — 홈은 루트에서 아래 안전 영역을 비우지 않는다(하단 바 면이 맨 아래까지 간다). 그 대신 겹·바·토스트가 각자 비킨다.
 * 첫 실행 화면은 자기 `SafeAreaView`가 따로 있어 아래 인셋을 그대로 비킨다. 소스 계약이다(인셋은 기기에서 온다).
 */
describe("115 S1·S2·S3 — 아래 인셋을 누가 비키는가", () => {
  const strip = (file: string) =>
    readFileSync(join(__dirname, "../..", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
  const app = strip("App.tsx");
  const edgesOf = (source: string) =>
    [...source.matchAll(/<SafeAreaView[^>]*edges=\{\[([^\]]*)\]\}/g)].map((m) => m[1] ?? "");

  it("S1 — 홈(마지막 SafeAreaView)은 bottom을 비우지 않고 top·left·right를 비운다", () => {
    const all = edgesOf(app);
    const home = all.at(-1) ?? "";
    expect(home).not.toMatch(/"bottom"/);
    for (const edge of ["top", "left", "right"]) expect(home).toContain(`"${edge}"`);
  });

  it("S1 — 첫 실행 화면들의 SafeAreaView는 모두 bottom을 비운다", () => {
    const all = edgesOf(app);
    expect(all.length).toBeGreaterThan(1);
    for (const edges of all.slice(0, -1)) expect(edges).toContain('"bottom"');
  });

  it("S2 — StackLayer가 아래 인셋 훅을 읽어 안쪽 여백을 둔다", () => {
    const layer = strip("src/ui/StackLayer.tsx");
    expect(layer).toContain("useBottomInset()");
    expect(layer).toMatch(/paddingBottom/);
  });

  it("S3 — 앱 토스트 바닥에 인셋을 더한다", () => {
    expect(app).toContain("useBottomInset()");
    expect(app).toMatch(/toastBottom\s*=[^;]*\+\s*bottomInset;/);
  });

  it("S4 — 인셋은 SafeAreaInsetsContext로 읽는다(useSafeAreaInsets는 제공자 없는 렌더에서 던진다)", () => {
    const hook = strip("src/ui/safe-bottom.ts");
    expect(hook).toContain("SafeAreaInsetsContext");
    expect(hook).not.toContain("useSafeAreaInsets");
  });
});

/**
 * **의존성이 선언되어 있는가.**
 *
 * `expo install`이 SDK 57에 맞는 판을 골라 넣었다. 선언이 빠지면 다른 사람의
 * `npm ci`에서 빌드가 깨진다.
 */
describe("의존성", () => {
  it("react-native-safe-area-context가 선언돼 있다", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("../../package.json");

    expect(pkg.dependencies["react-native-safe-area-context"]).toBeDefined();
  });
});

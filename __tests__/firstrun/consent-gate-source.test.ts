import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 074 — 동의 게이트의 소스 계약.
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG14·CG17·CG18, spec FR-009·FR-010·FR-012
 *
 * 소스를 읽는 테스트라 주석을 먼저 걷는다 — 이 저장소의 주석은 무엇을 왜 금지하는지를 적으므로 금지어가 설명 안에 정당하게 나온다.
 */

const ROOT = join(__dirname, "../..");

const code = (file: string) =>
  readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe("CG14 — 연결 조회는 app 계층에서만 import된다", () => {
  it("src/ui/ 어느 파일도 network-port·expo-network를 import하지 않는다", () => {
    const offenders = sourceFiles("src/ui").filter((f) =>
      /from\s+["'][^"']*(network-port|expo-network)["']|import\(["']expo-network["']\)/.test(
        code(f),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("expo-network를 import하는 파일은 network-port.ts 하나다(059 유지)", () => {
    const importers = sourceFiles("src").filter((f) =>
      /from\s+["']expo-network["']|import\(["']expo-network["']\)|require\(["']expo-network["']\)/.test(
        code(f),
      ),
    );
    expect(importers).toEqual(["src/app/network-port.ts"]);
  });
});

describe("CG18·FR-009 — 첫 실행 단계 판정은 이 기능을 모른다", () => {
  it("progress.ts에 모바일·대기 어휘가 없다 — 단계값과 우선순위가 045 그대로다", () => {
    expect(code("src/firstrun/progress.ts")).not.toMatch(
      /cellular|deferred|consent-gate|Connection/i,
    );
  });

  it("resolveFirstRunStage의 입력 필드는 045와 같은 일곱이다", () => {
    const src = code("src/firstrun/progress.ts");
    const input = src.slice(
      src.indexOf("export function resolveFirstRunStage"),
      src.indexOf("}): FirstRunStage"),
    );
    const fields = [...input.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    expect(fields).toEqual([
      "onboardingNeeded",
      "onboardingStarted",
      "downloadConsented",
      "downloadReady",
      "downloadProceedConfirmed",
      "namingDone",
      "livenessOutcome",
    ]);
  });
});

describe("CG17·FR-012 — 「나중에 받기」는 저장하지 않는다", () => {
  it("flag.ts에 새 필드가 없다 — 모바일·대기 관련 이름이 없다", () => {
    expect(code("src/onboarding/flag.ts")).not.toMatch(/deferred|cellular|later|defer/i);
  });

  it("훅과 게이트 컴포넌트는 파일 시스템·플래그 저장 통로를 모른다", () => {
    for (const f of ["src/app/use-consent-gate.ts", "src/ui/DownloadConsentGate.tsx"]) {
      expect(code(f)).not.toMatch(
        /expo-file-system|saveOnboardingFlag|onboarding\/flag|AsyncStorage/,
      );
    }
  });
});

describe("FR-010 — 모듈 다시 받기(059)는 이 기능을 거치지 않는다", () => {
  it("redownload-plan.ts는 게이트 모듈을 import하지 않는다", () => {
    expect(code("src/app/redownload-plan.ts")).not.toMatch(/consent-gate/);
  });
});

/**
 * 075 — iOS 릴리스 워크플로(`.github/workflows/ios-release.yml`)의 계약.
 *
 * 이 워크플로는 서명 키를 들고 퍼블릭 저장소의 러너에서 돈다. jest는 그것을 돌릴 수 없으므로 파일 텍스트를 읽어
 * 「비밀이 새는 길」(자동 트리거, 허용 밖 비밀, 결과물 업로드, 명령 추적, 정리 누락)을 잠근다. 규칙 번호(W1~)는
 * `specs/075-ios-cloud-release/contracts/workflow-contract.md`의 표와 같다. 읽을 때 주석을 먼저 걷어낸다 —
 * 이 저장소의 주석은 무엇을 왜 금지하는지 적으므로 금지어가 설명 안에 정당하게 나온다(072와 같은 방식).
 *
 * Environment 보호 규칙(필수 리뷰어·배포 브랜치 main)은 저장소 설정이라 파일에 없다 — 이 테스트가 못 잡는다.
 * 설정 화면을 눈으로 확인한다(quickstart §2).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const WORKFLOW = join(ROOT, ".github/workflows/ios-release.yml");
const EXPORT_OPTIONS = join(ROOT, "scripts/ios/ExportOptions.plist");

/** 허용된 비밀 여섯 (data-model.md) */
const ALLOWED_SECRETS = [
  "ASC_API_KEY_P8",
  "ASC_ISSUER_ID",
  "ASC_KEY_ID",
  "IOS_DIST_P12_BASE64",
  "IOS_DIST_P12_PASSWORD",
  "IOS_PROFILE_BASE64",
];

function read(): string {
  if (!existsSync(WORKFLOW)) throw new Error(`${WORKFLOW} 가 없다`);
  return readFileSync(WORKFLOW, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .map((line) => line.replace(/\s+#.*$/, ""))
    .join("\n");
}

/** 들여쓰기가 `indent`칸인 키 `key:` 아래의 블록(다음 같은 깊이 키 전까지)을 돌려준다 */
function section(text: string, key: string, indent: number): string {
  const lines = text.split("\n");
  const pad = " ".repeat(indent);
  const start = lines.findIndex((l) => l.startsWith(`${pad}${key}:`));
  if (start === -1) return "";
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() !== "" && line.length - line.trimStart().length <= indent) break;
    out.push(line);
  }
  return out.join("\n");
}

/** `- name: <이름>` 으로 시작하는 단계 하나의 텍스트(다음 `- ` 단계 전까지) */
function step(text: string, name: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^\\s+- name:\\s*${name}\\s*$`).test(l));
  if (start === -1) return "";
  const indent = lines[start].length - lines[start].trimStart().length;
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() !== "" && line.length - line.trimStart().length <= indent) break;
    out.push(line);
  }
  return out.join("\n");
}

describe("075 ios-release 워크플로", () => {
  it("W1 파일이 있다", () => {
    expect(existsSync(WORKFLOW)).toBe(true);
    expect(read().length).toBeGreaterThan(0);
  });

  describe("트리거·권한 (FR-002·003)", () => {
    it("W2 시작 방법은 workflow_dispatch 하나뿐이다", () => {
      const on = section(read(), "on", 0);
      const triggers = [...on.matchAll(/^ {2}([\w-]+):/gm)].map((m) => m[1]);
      expect(triggers).toEqual(["workflow_dispatch"]);
    });

    it("W3 잡은 하나이고 보호 환경 ios-release의 macos-latest에서 돈다", () => {
      const jobs = section(read(), "jobs", 0);
      const names = [...jobs.matchAll(/^ {2}([\w-]+):/gm)].map((m) => m[1]);
      expect(names).toHaveLength(1);
      expect(jobs).toMatch(/^ {4}environment:\s*ios-release\s*$/m);
      expect(jobs).toMatch(/^ {4}runs-on:\s*macos-latest\s*$/m);
    });

    it("W4 권한은 contents: read 하나뿐이다 (잡 수준 권한도 없다)", () => {
      const top = section(read(), "permissions", 0)
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");
      expect(top).toEqual(["permissions:", "contents: read"]);
      expect(section(read(), "jobs", 0)).not.toMatch(/^\s+permissions:/m);
    });

    it("W14 시간 제한이 있다", () => {
      expect(section(read(), "jobs", 0)).toMatch(/timeout-minutes:\s*\d+/);
    });
  });

  describe("비밀 (FR-004·005)", () => {
    it("W5 비밀 참조는 허용 여섯뿐이고 env 값 자리에서만, 같은 이름의 키로 나온다", () => {
      const text = read();
      const refs = [...text.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
      expect(refs.length).toBeGreaterThan(0);
      for (const name of new Set(refs)) expect(ALLOWED_SECRETS).toContain(name);
      // 모든 `secrets.` 참조 줄은 `NAME: ${{ secrets.NAME }}` 꼴이다 — run 본문에 직접 보간하지 않는다
      for (const line of text.split("\n").filter((l) => l.includes("secrets."))) {
        const m = /^\s+([A-Z0-9_]+):\s*\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}\s*$/.exec(line);
        expect(m).not.toBeNull();
        expect(m![1]).toBe(m![2]);
      }
      // `${{ … secrets … }}` 식은 전부 위의 정해진 꼴이어야 한다 — toJSON(secrets)·secrets['X'] 같은 다른 쓰임을 막는다
      const exprs = text.match(/\$\{\{[^}]*\bsecrets\b[^}]*\}\}/g) ?? [];
      const proper = text.match(/\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}/g) ?? [];
      expect(exprs).toHaveLength(proper.length);
      // 비밀 줄은 단계의 env 깊이(10칸)에만 있다 — 잡·워크플로 수준 env는 모든 단계(npm ci, pod install)에 비밀을 싣는다
      for (const line of text.split("\n").filter((l) => /\$\{\{[^}]*\bsecrets\b/.test(l))) {
        expect(line.length - line.trimStart().length).toBe(10);
      }
      // 여섯 모두 쓰인다 — 쓰이지 않는 비밀은 계약 문서와 어긋난 것이다
      expect([...new Set(refs)].sort()).toEqual(ALLOWED_SECRETS);
    });

    it("W7 명령 추적을 켜지 않고 비밀 변수를 출력하지 않는다", () => {
      const text = read();
      expect(text).not.toMatch(/set\s+-[a-z]*x/);
      expect(text).not.toMatch(/xtrace/);
      const names = ALLOWED_SECRETS.join("|");
      for (const line of text.split("\n")) {
        if (new RegExp(`\\b(echo|cat|printenv)\\b.*\\$\\{?(${names})\\b`).test(line)) {
          throw new Error(`비밀 변수를 출력하는 줄: ${line.trim()}`);
        }
      }
    });

    it("W11 업로드는 API 키로 한다 (앱 암호를 쓰지 않는다)", () => {
      const text = read();
      expect(text).toMatch(/altool --upload-app/);
      expect(text).toMatch(/--apiKey/);
      expect(text).toMatch(/--apiIssuer/);
      expect(text).not.toMatch(/--username|--password|@keychain:/);
    });
  });

  describe("결과물·캐시 (FR-008·010)", () => {
    it("W6 아티팩트 업로드와 캐시가 없다", () => {
      const text = read();
      expect(text).not.toMatch(/upload-artifact/);
      expect(text).not.toMatch(/actions\/cache/);
    });

    it("W9 동시에 하나만 돌고 진행 중인 실행을 취소하지 않는다", () => {
      const c = section(read(), "concurrency", 0);
      expect(c).toMatch(/group:/);
      expect(c).toMatch(/cancel-in-progress:\s*false/);
    });

    it("W10 continue-on-error가 없다", () => {
      expect(read()).not.toMatch(/continue-on-error/);
    });
  });

  describe("정리 (FR-006)", () => {
    it("W8 정리 단계가 if: always()이고 키체인·프로파일·API 키 파일을 지운다", () => {
      const cleanup = step(read(), "정리");
      expect(cleanup).not.toBe("");
      expect(cleanup).toMatch(/if:\s*always\(\)/);
      expect(cleanup).toMatch(/security delete-keychain/);
      expect(cleanup).toMatch(/rm -f[^\n]*PROFILE_PATH/);
      expect(cleanup).toMatch(/AuthKey_/);
      expect(cleanup).toMatch(/distribution\.p12/);
    });

    it("정리 단계는 마지막 단계다 — 뒤에 비밀을 쓰는 단계가 남지 않는다", () => {
      const text = read();
      const idx = text.indexOf("- name: 정리");
      expect(idx).toBeGreaterThan(0);
      // 이름 없는 단계(`- run:`·`- if:`)도 막는다 — 모든 단계 시작을 본다
      expect(text.slice(idx + 1)).not.toMatch(/^\s+- /m);
    });

    it("checkout이 토큰을 남기지 않는다 — 서명 키가 열린 빌드 중에 도는 스크립트가 읽지 못하게", () => {
      const text = read();
      const at = text.indexOf("actions/checkout");
      expect(at).toBeGreaterThan(0);
      expect(text.slice(at, at + 120)).toMatch(/persist-credentials:\s*false/);
    });

    it("러너의 Xcode가 26 미만이면 사전 점검에서 실패한다", () => {
      const check = step(read(), "사전 점검");
      expect(check).toMatch(/xcodebuild -version/);
      expect(check).toMatch(/-lt 26/);
    });

    it("프로파일을 해독하지 못하면 조용히 넘어가지 않는다", () => {
      const install = step(read(), "프로파일 설치");
      expect(install).toMatch(/if \[ -z "\$uuid" \]/);
      expect(install).toMatch(/exit 1/);
    });
  });

  describe("서명·내보내기 (FR-006·007)", () => {
    it("W12 서명 인자가 066 절차와 같다", () => {
      const text = read();
      expect(text).toMatch(/CODE_SIGN_STYLE=Manual/);
      expect(text).toMatch(/DEVELOPMENT_TEAM=PGNGG84B39/);
      expect(text).toMatch(/PROVISIONING_PROFILE_SPECIFIER="Pocketlog App Store"/);
      expect(text).toMatch(/CODE_SIGN_IDENTITY="Apple Distribution"/);
      expect(text).toMatch(/-configuration Release/);
      expect(text).toMatch(/-exportOptionsPlist scripts\/ios\/ExportOptions\.plist/);
    });

    it("W16 내보내기 설정은 IPA까지만 만든다 (업로드는 altool이 맡는다)", () => {
      const plist = readFileSync(EXPORT_OPTIONS, "utf8");
      expect(plist).toMatch(/<key>destination<\/key>\s*<string>export<\/string>/);
    });
  });

  describe("사전 점검 (FR-009)", () => {
    it("W13 사전 점검이 prebuild보다 앞이고 여섯 이름과 buildNumber를 본다", () => {
      const text = read();
      const check = step(text, "사전 점검");
      expect(check).not.toBe("");
      expect(text.indexOf("- name: 사전 점검")).toBeLessThan(text.indexOf("expo prebuild"));
      for (const name of ALLOWED_SECRETS) expect(check).toContain(name);
      expect(check).toMatch(/buildNumber/);
      expect(check).toMatch(/::error::/);
      // 값이 아니라 이름만 밝힌다 — 간접 참조(${!name})는 비었는지 검사에만 쓰고 출력하지 않는다
      expect(check).not.toMatch(/echo[^\n]*\$\{!name\}/);
    });
  });

  describe("기록 (FR-011)", () => {
    it("W15 Xcode 버전과 단계별 시간을 실행 요약에 적는다", () => {
      const text = read();
      expect(text).toMatch(/GITHUB_STEP_SUMMARY/);
      expect(text).toMatch(/xcodebuild -version/);
      expect(text.match(/start=\$\(date \+%s\)/g)?.length).toBeGreaterThanOrEqual(5);
      expect(
        text.match(/trap '[^']*GITHUB_STEP_SUMMARY[^']*' EXIT/g)?.length,
      ).toBeGreaterThanOrEqual(5);
    });
  });
});

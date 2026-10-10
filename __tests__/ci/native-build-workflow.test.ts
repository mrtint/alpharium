/**
 * 072 — 네이티브 빌드 확인 워크플로(`.github/workflows/native-build.yml`)의 계약.
 *
 * 이 워크플로는 러너에서만 돌고 jest는 그것을 돌릴 수 없다. 그래서 파일 텍스트를 읽어 「되살리면
 * 안 되는 것」(PR 전체 트리거, `continue-on-error`, 여러 ABI, 비밀값, 결과물 업로드)을 잠근다.
 * YAML 파서는 직접 의존성이 아니라 쓰지 않는다. 읽을 때 주석을 먼저 걷어낸다 — 이 저장소의
 * 주석은 무엇을 왜 금지하는지 적으므로 금지어가 설명 안에 정당하게 나온다.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW = join(__dirname, "../../.github/workflows/native-build.yml");

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

/** 블록 목록(`- 값`)의 값들. 따옴표는 벗긴다 */
function listItems(block: string): string[] {
  return [...block.matchAll(/^\s*-\s+(.+?)\s*$/gm)].map((m) => m[1].replace(/^["']|["']$/g, ""));
}

/** 네이티브 빌드의 입력 — 이 중 하나라도 바뀐 PR에서만 PR 실행이 돈다(FR-001b·FR-003) */
const NATIVE_INPUTS = [
  "package.json",
  "package-lock.json",
  "app.json",
  "plugins/**",
  ".github/workflows/native-build.yml",
];

describe("072 native-build 워크플로", () => {
  it("파일이 있다", () => {
    expect(existsSync(WORKFLOW)).toBe(true);
    expect(read().length).toBeGreaterThan(0);
  });

  describe("트리거 (FR-001·001b·002·003)", () => {
    it("PR 실행은 네이티브 입력 다섯 경로에서만 돈다", () => {
      const pr = section(section(read(), "on", 0), "pull_request", 2);
      expect(pr).not.toBe("");
      expect(listItems(section(pr, "paths", 4)).sort()).toEqual([...NATIVE_INPUTS].sort());
    });

    it("main push는 경로 필터 없이 돈다", () => {
      const push = section(section(read(), "on", 0), "push", 2);
      expect(push).toMatch(/branches:\s*\[\s*main\s*\]/);
      expect(push).not.toMatch(/paths/);
    });

    it("수동 실행이 있다", () => {
      expect(section(read(), "on", 0)).toMatch(/^ {2}workflow_dispatch:/m);
    });

    it("pull_request_target·schedule 같은 다른 트리거가 없다", () => {
      const on = section(read(), "on", 0);
      expect(on).not.toMatch(/pull_request_target/);
      expect(on).not.toMatch(/schedule/);
      const triggers = [...on.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]).sort();
      expect(triggers).toEqual(["pull_request", "push", "workflow_dispatch"]);
    });
  });

  describe("동시성·실패 처리 (FR-001a·007)", () => {
    it("같은 ref의 앞선 실행을 취소한다", () => {
      const c = section(read(), "concurrency", 0);
      expect(c).toMatch(/group:.*github\.ref/);
      expect(c).toMatch(/cancel-in-progress:\s*true/);
    });

    it("어느 단계에도 continue-on-error가 없다", () => {
      expect(read()).not.toMatch(/continue-on-error/);
    });
  });

  describe("잡 (FR-004·005·006)", () => {
    const jobs = () => section(read(), "jobs", 0);
    const android = () => section(jobs(), "android", 2);
    const ios = () => section(jobs(), "ios", 2);

    it("잡은 android와 ios 둘뿐이고 서로 의존하지 않는다", () => {
      const names = [...jobs().matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]).sort();
      expect(names).toEqual(["android", "ios"]);
      expect(read()).not.toMatch(/^\s*needs:/m);
    });

    it("안드로이드: 새로 prebuild하고 arm64 하나로 debug 빌드한다", () => {
      const a = android();
      expect(a).toMatch(/runs-on:\s*ubuntu-latest/);
      expect(a).toMatch(/expo prebuild --platform android --clean/);
      expect(a).toMatch(/\.\/gradlew assembleDebug/);
      expect(a).toMatch(/-PreactNativeArchitectures=arm64-v8a/);
      expect(a).not.toMatch(/armeabi|x86/);
    });

    it("iOS: macOS 러너에서 prebuild·pod install 뒤 서명 없이 시뮬레이터로 빌드한다", () => {
      const i = ios();
      expect(i).toMatch(/runs-on:\s*macos-latest/);
      expect(i).toMatch(/expo prebuild --platform ios --clean/);
      expect(i).toMatch(/pod install/);
      expect(i).toMatch(/-sdk iphonesimulator/);
      expect(i).toMatch(/CODE_SIGNING_ALLOWED=NO/);
    });

    it("두 잡 모두 시간 제한이 있다 — 러너가 죽이면 실패로 표시된다", () => {
      expect(android()).toMatch(/timeout-minutes:\s*\d+/);
      expect(ios()).toMatch(/timeout-minutes:\s*\d+/);
    });
  });

  describe("시간·메모리 기록 (FR-009)", () => {
    const jobs = () => section(read(), "jobs", 0);

    it("시간을 재는 단계마다 실패해도 요약에 쓰도록 trap을 쓴다 (안드로이드 2단계, iOS 3단계)", () => {
      const expected = { android: 2, ios: 3 };
      for (const [name, steps] of Object.entries(expected)) {
        const job = section(jobs(), name, 2);
        expect(job).toMatch(/GITHUB_STEP_SUMMARY/);
        expect(job.match(/start=\$\(date \+%s\)/g)?.length).toBe(steps);
        expect(job.match(/trap '[^']*GITHUB_STEP_SUMMARY[^']*' EXIT/g)?.length).toBe(steps);
      }
    });

    it("안드로이드는 /proc/meminfo를 샘플링하고 최대값을 항상(실패해도) 요약에 쓴다", () => {
      const a = section(jobs(), "android", 2);
      expect(a).toMatch(/\/proc\/meminfo/);
      const step = /- name: 최대 메모리 사용량\n\s+if: always\(\)/;
      expect(a).toMatch(step);
    });
  });

  describe("서명·결과물 금지 (FR-008)", () => {
    it("비밀값·키스토어·서명 설정·결과물 업로드가 없다", () => {
      const text = read();
      expect(text).not.toMatch(/secrets\./);
      expect(text).not.toMatch(/upload-artifact/);
      expect(text).not.toMatch(/\.jks|keystore|signingConfig/i);
    });

    it("안드로이드는 release 빌드를 하지 않는다", () => {
      expect(read()).not.toMatch(/assembleRelease|bundleRelease/);
    });
  });
});

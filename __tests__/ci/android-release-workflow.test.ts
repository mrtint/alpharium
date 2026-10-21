/**
 * 076 — 안드로이드 릴리스 워크플로(`.github/workflows/android-release.yml`)의 계약.
 *
 * 이 워크플로는 업로드 키와 Play 배포 권한을 들고 퍼블릭 저장소의 러너에서 돈다. jest는 그것을 돌릴 수 없으므로
 * 파일 텍스트를 읽어 「비밀이 새는 길」(자동 트리거, 허용 밖 비밀, 결과물 업로드, 명령 추적, 정리 누락)을 잠근다.
 * 규칙 번호(W1~)는 `specs/076-android-release-ci/contracts/workflow-contract.md`의 표와 같다. 읽을 때 주석을 먼저
 * 걷는다 — 이 저장소의 주석은 무엇을 왜 금지하는지 적으므로 금지어가 설명 안에 정당하게 나온다(072·075와 같은 방식).
 *
 * Environment 보호 규칙(필수 리뷰어·배포 브랜치 main)은 저장소 설정이라 파일에 없다 — 이 테스트가 못 잡는다.
 * 설정 화면을 눈으로 확인한다(quickstart §2).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const WORKFLOW = join(ROOT, ".github/workflows/android-release.yml");

/** 두 비밀번호는 gradle이 읽는 환경변수 이름(ORG_GRADLE_PROJECT_<속성>)으로 받는다 — 그 밖의 비밀은 같은 이름으로 받는다 */
const ENV_KEY_FOR: Record<string, string> = {
  ANDROID_KEYSTORE_PASSWORD: "ORG_GRADLE_PROJECT_POCKETLOG_STORE_PASSWORD",
  ANDROID_KEY_PASSWORD: "ORG_GRADLE_PROJECT_POCKETLOG_KEY_PASSWORD",
};

/** 허용된 비밀 넷 (data-model.md) */
const ALLOWED_SECRETS = [
  "ANDROID_KEYSTORE_BASE64",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_PASSWORD",
  "PLAY_SERVICE_ACCOUNT_JSON",
];

function read(): string {
  if (!existsSync(WORKFLOW)) throw new Error(`${WORKFLOW} 가 없다`);
  return (
    readFileSync(WORKFLOW, "utf8")
      .replace(/\r\n/g, "\n")
      .split("\n")
      // 줄 전체가 주석인 줄만 걷는다. 줄 끝 ` #...`는 걷지 않는다 — 따옴표 안의 `#`에서 잘리면 실행되는 코드(예: 비밀을 찍는 echo)가
      // 테스트에서 보이지 않게 된다.
      .filter((line) => !/^\s*#/.test(line))
      .join("\n")
  );
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

describe("076 android-release 워크플로", () => {
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

    it("W3 잡은 하나이고 보호 환경 android-release의 ubuntu-latest에서 돈다", () => {
      const jobs = section(read(), "jobs", 0);
      const names = [...jobs.matchAll(/^ {2}([\w-]+):/gm)].map((m) => m[1]);
      expect(names).toHaveLength(1);
      expect(jobs).toMatch(/^ {4}environment:\s*android-release\s*$/m);
      expect(jobs).toMatch(/^ {4}runs-on:\s*ubuntu-latest\s*$/m);
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

    it("W18 checkout이 토큰을 남기지 않는다 — 키스토어가 열린 빌드 중에 도는 스크립트가 읽지 못하게", () => {
      const text = read();
      const at = text.indexOf("actions/checkout");
      expect(at).toBeGreaterThan(0);
      expect(text.slice(at, at + 120)).toMatch(/persist-credentials:\s*false/);
    });
  });

  describe("비밀 (FR-004·005)", () => {
    it("W5 비밀 참조는 허용 넷뿐이고 모두 `KEY: ${{ secrets.NAME }}` 꼴(KEY는 NAME 또는 gradle 환경변수 별칭)이다", () => {
      const text = read();
      const refs = [...text.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
      expect(refs.length).toBeGreaterThan(0);
      for (const name of new Set(refs)) expect(ALLOWED_SECRETS).toContain(name);
      // 모든 `secrets.` 참조 줄은 `KEY: ${{ secrets.NAME }}` 꼴이다 — run 본문에 직접 보간하지 않는다
      for (const line of text.split("\n").filter((l) => l.includes("secrets."))) {
        const m = /^\s+([A-Z0-9_]+):\s*\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}\s*$/.exec(line);
        expect(m).not.toBeNull();
        expect([m![2], ENV_KEY_FOR[m![2]]]).toContain(m![1]);
      }
      // `${{ … secrets … }}` 식은 전부 위의 정해진 꼴이어야 한다 — toJSON(secrets)·secrets['X'] 같은 다른 쓰임을 막는다
      const exprs = text.match(/\$\{\{[^}]*\bsecrets\b[^}]*\}\}/g) ?? [];
      const proper = text.match(/\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}/g) ?? [];
      expect(exprs).toHaveLength(proper.length);
      // 넷 모두 쓰인다 — 쓰이지 않는 비밀은 계약 문서와 어긋난 것이다
      expect([...new Set(refs)].sort()).toEqual([...ALLOWED_SECRETS].sort());
    });

    // 이 검사는 증명이 아니라 경보선이다: 같은 줄의 echo|cat|printenv만 보고 printf·env·curl -d나 다른 줄의 참조는 못 잡는다.
    // 워크플로를 고칠 때는 비밀이 어디로 흐르는지 읽는다(계약 문서 「한계」).
    it("W7 명령 추적을 켜지 않고 비밀 변수를 출력하지 않는다", () => {
      const text = read();
      expect(text).not.toMatch(/set\s+-[a-z]*x/);
      expect(text).not.toMatch(/xtrace/);
      const names = [
        ...ALLOWED_SECRETS,
        "ORG_GRADLE_PROJECT_POCKETLOG_STORE_PASSWORD",
        "ORG_GRADLE_PROJECT_POCKETLOG_KEY_PASSWORD",
      ].join("|");
      for (const line of text.split("\n")) {
        if (new RegExp(`\\b(echo|cat|printenv)\\b.*\\$\\{?(${names})\\b`).test(line)) {
          throw new Error(`비밀 변수를 출력하는 줄: ${line.trim()}`);
        }
      }
    });

    it("W5a 비밀 참조는 단계 env 깊이(10칸)에만 있다 — 잡·워크플로 수준 env나 with:는 모든 단계에 비밀을 싣는다", () => {
      const lines = read()
        .split("\n")
        .filter((l) => /\$\{\{[^}]*\bsecrets\b/.test(l));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) expect(line.length - line.trimStart().length).toBe(10);
    });

    it("W5b 각 비밀은 쓰는 단계와 사전 점검에서만 나온다", () => {
      const text = read();
      const precheck = step(text, "사전 점검");
      const where: Record<string, string> = {
        ANDROID_KEYSTORE_BASE64: "키스토어 복원",
        ANDROID_KEYSTORE_PASSWORD: "gradle bundleRelease",
        ANDROID_KEY_PASSWORD: "gradle bundleRelease",
        PLAY_SERVICE_ACCOUNT_JSON: "Play 업로드",
      };
      for (const [secret, stepName] of Object.entries(where)) {
        const count = (text.match(new RegExp(`secrets\\.${secret}\\b`, "g")) ?? []).length;
        const inStep = (step(text, stepName).match(new RegExp(`secrets\\.${secret}\\b`, "g")) ?? [])
          .length;
        expect(count).toBe(2);
        expect(inStep).toBe(1);
        expect(precheck.match(new RegExp(`secrets\\.${secret}\\b`, "g"))).toHaveLength(1);
      }
      // 두 비밀번호는 gradle이 읽는 환경변수 이름으로만 받는다
      const build = step(text, "gradle bundleRelease");
      expect(build).toMatch(
        /ORG_GRADLE_PROJECT_POCKETLOG_STORE_PASSWORD:\s*\$\{\{\s*secrets\.ANDROID_KEYSTORE_PASSWORD\s*\}\}/,
      );
      expect(build).toMatch(
        /ORG_GRADLE_PROJECT_POCKETLOG_KEY_PASSWORD:\s*\$\{\{\s*secrets\.ANDROID_KEY_PASSWORD\s*\}\}/,
      );
    });

    it("W11 외부 Action은 actions/* 뿐이다", () => {
      const uses = [...read().matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1]);
      expect(uses.length).toBeGreaterThan(0);
      for (const u of uses) expect(u).toMatch(/^actions\//);
    });
  });

  describe("결과물·캐시 (FR-008·010)", () => {
    it("W6 아티팩트 업로드와 캐시가 없다", () => {
      const text = read();
      expect(text).not.toMatch(/upload-artifact/);
      expect(text).not.toMatch(/actions\/cache/);
      // setup-node 의 `cache:` 도 캐시 복원이다 — 키스토어가 열리는 잡에서는 쓰지 않는다 (FR-008)
      expect(text).not.toMatch(/^\s+cache:/m);
      // setup-node v5는 packageManager 필드가 있으면 캐시를 자동으로 켠다 — 기본값에 기대지 않고 끈다
      expect(text).toMatch(/^\s+package-manager-cache:\s*false\s*$/m);
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

  describe("정리 (FR-005·SC-006)", () => {
    it("W8 정리 단계가 if: always()이고 키스토어와 AAB를 지운다", () => {
      const cleanup = step(read(), "정리");
      expect(cleanup).not.toBe("");
      expect(cleanup).toMatch(/if:\s*always\(\)/);
      expect(cleanup).toMatch(/rm -f[^\n]*pocketlog\.jks/);
      expect(cleanup).toMatch(/app-release\.aab/);
    });

    it("정리 단계는 마지막 단계다 — 뒤에 비밀을 쓰는 단계가 남지 않는다", () => {
      const text = read();
      const idx = text.indexOf("- name: 정리");
      expect(idx).toBeGreaterThan(0);
      // 이름 없는 단계(`- run:`·`- if:`)도 막는다 — 모든 단계 시작을 본다
      expect(text.slice(idx + 1)).not.toMatch(/^\s+- /m);
    });
  });

  describe("빌드·서명·업로드 (FR-001·006·007·012)", () => {
    it("W12 release AAB를 arm64 하나로 빌드하고 NODE_ENV=production을 그 단계에 준다", () => {
      const text = read();
      const build = step(text, "gradle bundleRelease");
      expect(build).not.toBe("");
      expect(build).toMatch(/\.\/gradlew bundleRelease/);
      expect(build).toMatch(/-PreactNativeArchitectures=arm64-v8a/);
      expect(build).toMatch(/^\s+NODE_ENV:\s*production\s*$/m);
      expect(text).not.toMatch(/assembleRelease/);
      expect(text).not.toMatch(/\.apk\b/);
    });

    it("W16 서명 확인과 Play 업로드는 직접 쓴 스크립트를 부른다", () => {
      const text = read();
      expect(step(text, "서명 확인")).toMatch(/scripts\/android-release\/verify-signature\.mts/);
      const upload = step(text, "Play 업로드");
      expect(upload).toMatch(/scripts\/android-release\/play-upload\.mts/);
      expect(upload).toMatch(/--package com\.a810labs\.pocketlog/);
      expect(upload).toMatch(/--track internal/);
    });

    it("W19 android/ 의 생성물을 직접 고치지 않는다 (서명 선언은 플러그인이 한다)", () => {
      expect(read()).not.toMatch(/build\.gradle|gradle\.properties/);
    });
  });

  describe("사전 점검 (FR-009)", () => {
    it("W13 단계 순서: 사전 점검 < prebuild < 키스토어 복원 < bundleRelease < 서명 확인 < Play 업로드 < 정리", () => {
      const text = read();
      const order = [
        "- name: 사전 점검",
        "- name: 설정 점검",
        "- name: expo prebuild",
        "- name: 키스토어 복원",
        "- name: gradle bundleRelease",
        "- name: 서명 확인",
        "- name: Play 업로드",
        "- name: 정리",
      ].map((s) => text.indexOf(s));
      for (const at of order) expect(at).toBeGreaterThan(-1);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it("W17a 설정 점검은 versionCode와 기대 지문 파일을 보고 비밀을 env에 받지 않는다", () => {
      const text = read();
      const check = step(text, "설정 점검");
      expect(check).not.toBe("");
      expect(check).toMatch(/android\.versionCode/);
      expect(check).toMatch(/verify-signature\.mts --check-expected-only/);
      expect(check).toMatch(/::error::/);
      expect(check).not.toMatch(/secrets\./);
      expect(check).not.toMatch(/^\s+env:/m);
      expect(text.indexOf("- name: 설정 점검")).toBeLessThan(text.indexOf("- run: npm ci"));
    });

    it("사전 점검은 npm ci보다 앞이다 — 비밀이 빈 것을 의존성 설치 전에 알린다 (SC-003)", () => {
      const text = read();
      const check = text.indexOf("- name: 사전 점검");
      const install = text.indexOf("- run: npm ci");
      expect(check).toBeGreaterThan(-1);
      expect(install).toBeGreaterThan(-1);
      expect(check).toBeLessThan(install);
    });

    it("W17 사전 점검은 비밀 넷이 비었는지만 보고 이름만 밝히며 저장소 코드를 부르지 않는다", () => {
      const check = step(read(), "사전 점검");
      expect(check).not.toBe("");
      for (const name of ALLOWED_SECRETS) expect(check).toContain(name);
      expect(check).toMatch(/::error::/);
      // 비밀이 env에 있는 단계에서 저장소 코드(node·npm·gradle)를 돌리지 않는다
      expect(check).not.toMatch(/\b(node|npm|npx|\.\/gradlew)\b/);
      // 값이 아니라 이름만 밝힌다 — 간접 참조(${!name})는 비었는지 검사에만 쓰고 출력하지 않는다
      expect(check).not.toMatch(/echo[^\n]*\$\{!name\}/);
    });
  });

  describe("기록 (FR-011)", () => {
    it("W15 러너 사양과 단계별 시간·최대 메모리·AAB 크기를 실행 요약에 적는다", () => {
      const text = read();
      expect(text).toMatch(/GITHUB_STEP_SUMMARY/);
      const spec = step(text, "러너 사양");
      expect(spec).toMatch(/nproc/);
      expect(spec).toMatch(/free -m/);
      expect(spec).toMatch(/java -version/);
      for (const name of ["expo prebuild", "gradle bundleRelease", "Play 업로드"]) {
        const body = step(text, name);
        expect(body).toMatch(/start=\$\(date \+%s\)/);
        expect(body).toMatch(/trap '[^']*GITHUB_STEP_SUMMARY[^']*' EXIT/);
      }
      const memory = step(text, "최대 메모리 사용량");
      expect(memory).toMatch(/if:\s*always\(\)/);
      expect(memory).toMatch(/GITHUB_STEP_SUMMARY/);
      const verify = step(text, "서명 확인");
      expect(verify).toMatch(/stat /);
      expect(verify).toMatch(/GITHUB_STEP_SUMMARY/);
    });
  });

  describe("릴리스 노트 → Play 출시 노하우", () => {
    it("설정 점검이 500자 한도를 본다 — 긴 빌드 전에 끝난다", () => {
      const check = step(read(), "설정 점검");
      expect(check).toMatch(/release-notes\/check\.mts --store play/);
      expect(check).not.toMatch(/secrets\./);
    });

    it("Play 업로드가 release-notes/ko.txt를 --notes로 넘긴다", () => {
      const upload = step(read(), "Play 업로드");
      expect(upload).toMatch(/--notes release-notes\/ko\.txt/);
    });
  });
});

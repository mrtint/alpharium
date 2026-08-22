/**
 * 테스트가 두 프로젝트로 갈리는데 **하나도 빠지지 않는다.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 이 검사가 필요한가** (2026-08-22):
 *
 * `package.json`의 jest 설정이 `projects` 둘로 나뉘어 있다 — 화면 테스트만 React
 * Native 런타임을 지고 가도록. 가르는 기준은 **확장자**다: `.tsx`면 화면, `.ts`면
 * 순수 로직이다.
 *
 * **그런데 `testMatch`가 어긋나면 스위트가 어느 쪽에도 안 잡히고, 그때 jest는
 * 오류를 내지 않는다.** 그냥 그 파일을 안 돌릴 뿐이다 — 초록불인데 아무것도
 * 검증되지 않은 상태이며, 이 저장소가 반복해서 당한 조용한 실패와 같은 종류다
 * (`FLOWS` 미등록, 006의 `GenerationProbe`, 009의 `day:` 한 줄).
 *
 * 그래서 **파일 수를 직접 세어 맞춰 본다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** `__tests__/` 아래의 모든 테스트 파일을 훑는다 */
function testFilesUnder(relative: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(process.cwd(), relative), { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) found.push(...testFilesUnder(child));
    else if (/\.test\.tsx?$/.test(entry.name)) found.push(child);
  }
  return found;
}

type Project = { displayName: string; testMatch: string[] };

const projects: Project[] = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"))
  .jest.projects;

const allTests = testFilesUnder("__tests__");

/** 이 파일 자신. 아래 「양쪽에 잡힌다」 검사가 쓴다 */
const SELF = "__tests__/jest-projects.test.ts";

/** `<rootDir>/__tests__/ ** / *.test.ts` 꼴을 실제 경로와 맞춰 본다 */
function matches(pattern: string, file: string): boolean {
  const regex = new RegExp(
    `^${pattern
      .replace("<rootDir>/", "")
      .replace(/\./g, "\\.")
      .replace(/\*\*\//g, "(?:.*/)?")
      .replace(/\*/g, "[^/]*")}$`,
  );
  return regex.test(file);
}

describe("테스트가 두 프로젝트로 갈린다", () => {
  it("프로젝트가 logic과 ui 둘이다", () => {
    expect(projects.map((p) => p.displayName).sort()).toEqual(["logic", "ui"]);
  });

  /**
   * **★ 이것이 이 파일의 핵심이다.**
   *
   * 어느 쪽에도 안 잡힌 스위트가 있으면 **그 파일은 영영 돌지 않는다.** jest는
   * 그것을 알려 주지 않는다.
   */
  it("모든 테스트 파일이 정확히 한 프로젝트에 잡힌다", () => {
    const unmatched: string[] = [];
    const doubled: string[] = [];

    for (const file of allTests) {
      if (file === SELF) continue; // 아래 참조 — 이 파일만 일부러 양쪽에 있다
      const hits = projects.filter((p) => p.testMatch.some((m) => matches(m, file)));
      if (hits.length === 0) unmatched.push(file);
      if (hits.length > 1) doubled.push(file);
    }

    expect(unmatched).toEqual([]);
    expect(doubled).toEqual([]);
  });

  /**
   * **★ 이 파일 자신은 일부러 양쪽 프로젝트에 들어 있다.**
   *
   * 처음에는 logic에만 두었는데, **`logic`의 `testMatch`를 좁히는 위반을 주입해 보니
   * 가드 자신이 함께 사라져 아무 말도 못 했다.** 지키려는 것과 함께 없어지는 것은
   * 가드가 아니다.
   *
   * 양쪽에 두면 한쪽 패턴이 망가져도 **다른 쪽이 살아남아 알린다.**
   */
  it("이 가드가 두 프로젝트 모두에 잡힌다 — 한쪽이 망가져도 살아남는다", () => {
    const hits = projects.filter((p) => p.testMatch.some((m) => matches(m, SELF)));

    expect(hits.map((p) => p.displayName).sort()).toEqual(["logic", "ui"]);
  });

  it("테스트 파일이 실제로 존재한다 — 훑기가 빈 목록을 주지 않는다", () => {
    // 훑기가 고장 나면 위 검사가 「위반 0건」으로 통과한다. 그것을 막는다.
    expect(allTests.length).toBeGreaterThan(40);
  });

  /**
   * **화면 스위트는 `.tsx`여야 한다.**
   *
   * `.ts`로 만들면 logic 프로젝트(node 환경)에 잡혀 `render()`가 없다고 실패한다.
   * 그 오류는 원인을 가리키므로 조용한 실패는 아니지만, 왜 그런지 여기 적어 둔다.
   */
  it("화면 라이브러리를 import 하는 스위트는 전부 .tsx다", () => {
    // **import 문만 본다.** 008의 교훈 — 설명이 위반으로 잡히면 아무도 설명을 쓰지
    // 않는다. 실제로 이 파일 자신이 그 이름을 글로 담고 있어 처음엔 스스로 걸렸다.
    const importsRtl = /^\s*import\s[^;]*["']@testing-library\//m;

    const wrong = allTests
      .filter((f) => f.endsWith(".test.ts"))
      .filter((f) => importsRtl.test(readFileSync(join(process.cwd(), f), "utf8")));

    expect(wrong).toEqual([]);
  });
});

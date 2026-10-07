/**
 * 062 — 카탈로그 경계 (contracts/i18n.md B2·B3·B5·B6·C4).
 *
 * 헌법 검사(`checkI18nFile`)가 B1·K5·K6·D4·B2를 줄 단위로 본다. 여기는 줄 하나로는 못 보는 것 — 「화면이 내부 이유 문자열을 그리지
 * 않는다」(B3), 「문구로 분기하지 않는다」(B5), 「모듈을 불러올 때 text()를 평가하지 않는다」(C4), 「저장된 데이터에 문구가 없다」(B6).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(join(ROOT, rel), "utf8"));

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...filesUnder(rel));
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

const SCREEN_FILES = [...filesUnder("src/ui"), ...filesUnder("src/app"), "App.tsx"];

describe("B2 — 모델 입력·생성 경로는 화면 언어를 모른다 (FR-016)", () => {
  const MODEL_FILES = [
    "src/diary/prompt.ts",
    "src/diary/pipeline.ts",
    ...filesUnder("src/inference"),
    ...filesUnder("src/signals"),
    ...filesUnder("src/vision"),
  ];

  it.each(MODEL_FILES)("%s", (file) => {
    expect(read(file)).not.toMatch(/from\s+["'][^"']*\/i18n\//);
  });
});

/**
 * B3 — 화면 계층에서 `.reason`·`.detail`을 읽는 자리는 아래뿐이다. 모두 **갈래(enum)를 보거나 갈래로 옮기는** 자리이고,
 * 신호의 「모른다」 까닭·준비 상태 reason·파이프라인 detail 문자열을 화면에 그리지 않는다(research R5).
 *
 * 하나의 예외 — 진단 프롬프트 미리보기의 「조립할 수 없음: {이유}」는 이유 원문을 그대로 보인다(060, 원칙 I: 실패가 텍스트를 지어내지 않는다).
 * 개발 빌드 전용 화면이고 원문은 진단 계층(`prompt-preview.ts`)의 내부 값이다 — 번역 대상이 아님을 알고 둔다.
 */
const READS_REASON: Readonly<Record<string, string>> = {
  "src/app/diagnostics-view.ts": "쓰기 실패 기록의 갈래(enum) → 문구",
  "src/app/failure-toast.ts": "파이프라인 이유의 앞 토큰(kind)만 본다",
  "src/app/write-failures.ts": "파이프라인 이유의 앞 토큰을 갈래로 옮긴다",
  "src/app/wiring.ts": "실패를 위로 넘긴다(그리지 않는다)",
  "src/ui/DiagnosticsParts.tsx": "프롬프트 미리보기 조립 실패 원문 — 위 예외",
  "src/ui/OnboardingScreen.tsx": "내려받기 실패 갈래(enum)",
  "App.tsx": "liveness 판정 갈래(enum) 비교",
};

describe("B3 — 화면이 내부 이유 문자열을 그리지 않는다", () => {
  it.each(SCREEN_FILES)("%s", (file) => {
    const reads = /\.(?:reason|detail)\b/.test(read(file));
    if (reads) expect(Object.keys(READS_REASON)).toContain(file);
  });

  it("목록의 파일이 모두 있고 실제로 읽는다(사라진 경로를 가리키지 않는다)", () => {
    for (const file of Object.keys(READS_REASON)) {
      expect(read(file)).toMatch(/\.(?:reason|detail)\b/);
    }
  });
});

describe("B5 — 한글 문구로 분기하지 않는다 (research R8)", () => {
  const BRANCH_ON_TEXT =
    /\/[^/\n]*[가-힣][^/\n]*\/\.test\(|(?:includes|startsWith|endsWith)\(\s*["'`][^"'`]*[가-힣]|[!=]==\s*["'`][^"'`]*[가-힣]|["'`][^"'`]*[가-힣][^"'`]*["'`]\s*[!=]==/;

  it.each([...SCREEN_FILES, ...filesUnder("src/schedule"), ...filesUnder("src/onboarding")])(
    "%s",
    (file) => {
      expect(read(file)).not.toMatch(BRANCH_ON_TEXT);
    },
  );
});

describe("C4 — 모듈을 불러올 때 text()를 평가하지 않는다", () => {
  const TEXT_CALLERS = [
    ...SCREEN_FILES,
    ...filesUnder("src/schedule"),
    ...filesUnder("src/onboarding"),
    "src/diary/monologue.ts",
  ];

  it.each(TEXT_CALLERS)("%s", (file) => {
    // 들여쓰기 없는 선언·식에서 text()를 부르는 줄 — 함수 본문 안이 아니라 모듈 최상단이다
    for (const line of read(file).split(/\r?\n/)) {
      if (/^\S/.test(line)) expect(line).not.toMatch(/\btext\(\)/);
    }
  });
});

describe("B6 — 저장된 데이터에 화면 문구가 없다 (research R13)", () => {
  it("DiaryEntry 필드 목록이 확인한 것과 같다 — 새 필드는 문구를 저장하는지 다시 본다", () => {
    const types = readFileSync(join(ROOT, "src/diary/types.ts"), "utf8");
    const block = types.slice(types.indexOf("export type DiaryEntry = {"));
    const body = block.slice(0, block.indexOf("\n};"));
    const fields = [...body.matchAll(/^ {2}([a-zA-Z]+)\??:/gm)].map((m) => m[1]);
    expect(fields).toEqual([
      "date",
      "text",
      "title",
      "character",
      "authorName",
      "signalsUsed",
      "createdAt",
      "photos",
      "timing",
      "placeName",
    ]);
  });

  it("기기에 쓰는 설정 파일 목록이 확인한 것과 같다", () => {
    const names = new Set<string>();
    for (const file of filesUnder("src")) {
      for (const m of read(file).matchAll(/const [A-Z_]+_FILE = "([a-z-]+\.json)"/g))
        names.add(m[1]);
    }
    expect([...names].sort()).toEqual([
      "auto-diary.json",
      "auto-write-skipped.json",
      "character-names.json",
      "developer-menu.json",
      "geocoding-setting.json",
      "notified.json",
      "onboarding.json",
      "selected-character.json",
      // 064 — 상태 흉내 기록(날짜·토글 셋, 화면 문구 없음)
      "simulation.json",
      "state.json",
      "write-failures.json",
    ]);
  });
});

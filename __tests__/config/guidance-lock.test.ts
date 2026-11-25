/**
 * 132 — 안내 규칙을 문구에서 잠근다 (G6, contracts/lock-rules.md GL1~GL3, 규칙 문서 K1·K3·K4).
 *
 * - GL1(K1·R3): 시각·보장을 단정하는 낱말을 사용자에게 보이는 문구에 쓰지 않는다.
 * - GL2(K3·R6): iOS 전용 문구에는 안드로이드 짝이 있거나, 말하지 않는 까닭이 허용 목록에 있다.
 * - GL3(K4·4-5①): 첫 실행 문구가 자동 쓰기를 약속하면 같은 단위에 「켜 두면/켜면」 조건이 있다(자동으로 쓰기는 기본 꺼짐).
 *
 * 허용 목록을 늘릴 때는 까닭을 함께 적는다. 위반 주입 기록은 specs/132-guidance-lock-g6/quickstart.md 「기록」.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ko } from "../../src/i18n/catalogs/ko";
import { koLiteralsOf, stripComments } from "../i18n/ko-literals";

const ROOT = join(__dirname, "../..");
const CATALOG_DIR = "src/i18n/catalogs/ko";
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

/** 개발 빌드 전용 화면의 문구 — 규칙 문서 A1·4장 범위 밖 (research R2) */
const DEV_ONLY_CATALOGS = new Set([
  "developer.ts",
  "diagnostics.ts",
  "attempts.ts",
  "failures.ts",
  "fast-cycle.ts",
  "simulation.ts",
]);

const userCatalogFiles = readdirSync(join(ROOT, CATALOG_DIR))
  .filter((f) => f.endsWith(".ts") && f !== "index.ts" && !DEV_ONLY_CATALOGS.has(f))
  .map((f) => `${CATALOG_DIR}/${f}`);

const webFiles = [
  "site/index.html",
  "site/privacy/index.html",
  "site/support/index.html",
  "site/licenses/index.html",
];
const storeFiles = readdirSync(join(ROOT, "store/ko"))
  .filter((f) => f.endsWith(".txt"))
  .map((f) => `store/ko/${f}`);

/** 검사할 (파일, 문장) 목록 */
function sentencesOf(file: string): string[] {
  const src = read(file);
  if (file.endsWith(".ts")) return koLiteralsOf(src);
  const text = file.endsWith(".html")
    ? src
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/&nbsp;|&#160;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    : src;
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── GL1 ────────────────────────────────────────────────────────────────

const FORBIDDEN = /항상|반드시|보장|제때|정각|(?<![가-힣])꼭(?![가-힣])/g;

/** (파일, 문장 조각) — 이 조각을 품은 문장의 금지 낱말은 허용 */
const GL1_ALLOW: readonly { file: string; fragment: string; why: string }[] = [
  {
    file: "site/privacy/index.html",
    fragment: "보장하지 않습니다",
    why: "백업 복원을 약속하지 않는다는 말(099)",
  },
  {
    file: "site/support/index.html",
    fragment: "보장하지 않습니다",
    why: "백업 복원을 약속하지 않는다는 말(099)",
  },
];

describe("GL1(K1) — 금지 낱말", () => {
  it("검사 대상이 비어 있지 않다", () => {
    expect(userCatalogFiles.length).toBeGreaterThan(10);
    expect(storeFiles.length).toBeGreaterThan(0);
  });

  it.each([...userCatalogFiles, ...webFiles, ...storeFiles])("%s", (file) => {
    const hits = sentencesOf(file)
      // 허용 조각만 지우고 문장의 나머지는 그대로 검사한다
      .map((s) =>
        GL1_ALLOW.filter((a) => a.file === file).reduce((t, a) => t.split(a.fragment).join(""), s),
      )
      .flatMap((s) => [...s.matchAll(FORBIDDEN)].map((m) => `「${m[0]}」 in: ${s}`));
    expect(hits).toEqual([]);
  });
});

// ── GL2 ────────────────────────────────────────────────────────────────

/** iOS 키 → 안드로이드 짝 (영역.키). 짝 이름이 규칙적이지 않은 것만 적는다 (research R5) */
const IOS_PAIRS: Record<string, string> = {
  permBatteryHintIos: "settings.permBatteryHint",
  previewIos: "targetHour.preview",
  conditionIos: "home.autoWriteSetup.conditionAndroid",
};

/** 짝이 없는 iOS 키와 말하지 않는 까닭 */
const IOS_UNPAIRED: Record<string, string> = {
  writingLeaveNoteIos:
    "안드로이드는 앞을 벗어나면 쓰기가 멈추는데, 그 사실을 말할 문구를 아직 정하지 않았다(규칙 문서 R6)",
};

function hasPath(path: string): boolean {
  let cur: unknown = ko;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !(part in cur)) return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur !== undefined;
}

describe("GL2(K3) — 플랫폼 짝", () => {
  const iosKeys = [
    ...new Set(
      readdirSync(join(ROOT, CATALOG_DIR))
        .filter((f) => f.endsWith(".ts"))
        .flatMap((f) =>
          [...stripComments(read(`${CATALOG_DIR}/${f}`)).matchAll(/\b(\w+Ios)\s*:/g)].map(
            (m) => m[1],
          ),
        ),
    ),
  ];

  it("iOS 전용 키가 있다(검사가 빈 목록을 돌지 않는다)", () => {
    expect(iosKeys.length).toBeGreaterThan(0);
  });

  it.each(iosKeys)("%s에 안드로이드 짝 또는 까닭이 있다", (key) => {
    if (IOS_UNPAIRED[key] !== undefined) {
      expect(IOS_UNPAIRED[key].length).toBeGreaterThan(10);
      return;
    }
    const pair = IOS_PAIRS[key];
    expect(pair).toBeDefined();
    expect(hasPath(pair)).toBe(true);
  });
});

// ── GL3 ────────────────────────────────────────────────────────────────

/** 자동 쓰기·알림 약속 — 「알려야」(빌드 오류 화면의 개발자 안내)처럼 약속이 아닌 꼴은 뺀다 */
const PROMISE = /먼저 써|써 드릴|알려요|알려 ?드/;
const CONDITION = /켜 두면|켜면/;

/** 첫 실행 문구의 한 단위 — 이름과 그 안의 문장들 */
function firstRunUnits(): { name: string; text: string }[] {
  const units = ko.download.slides.map((s, i) => ({
    name: `download.slides[${i}]`,
    text: `${s.title} ${s.body}`,
  }));
  for (const [key, p] of Object.entries(ko.onboarding.permissions)) {
    units.push({ name: `onboarding.permissions.${key}`, text: `${p.rationale} ${p.ifDenied}` });
  }
  for (const [key, value] of Object.entries(ko.welcome)) {
    if (typeof value === "string") units.push({ name: `welcome.${key}`, text: value });
  }
  return units;
}

/** 조건 없이 약속해도 되는 단위와 까닭 */
const GL3_ALLOW: Record<string, string> = {
  "welcome.welcomeBody": "소유자 문구 결정 대기(규칙 문서 4-5①, 2026-11-25 A안)",
  "onboarding.permissions.battery-exception":
    "첫 실행 권한 단계에서 뺐다(131 U1, `decision.ts`가 거른다) — 첫 실행 화면에 나오지 않는다",
  // 「알려 드리지 못해요」 — 거부했을 때 알림이 없다는 말이라 약속이 아니다
};

describe("GL3(K4) — 첫 실행 자동 쓰기 약속의 조건", () => {
  it("약속하는 단위가 하나 이상 있다(빈 검사로 통과하지 않는다)", () => {
    expect(firstRunUnits().filter((u) => PROMISE.test(u.text)).length).toBeGreaterThan(0);
  });

  it.each(firstRunUnits().map((u) => [u.name, u.text]))("%s", (name, text) => {
    if (GL3_ALLOW[name] !== undefined) return;
    if (PROMISE.test(text)) expect(text).toMatch(CONDITION);
  });
});

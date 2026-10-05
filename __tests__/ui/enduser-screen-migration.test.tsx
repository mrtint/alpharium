/**
 * 034 — 엔드유저 화면 이관 계약 (contracts/enduser-screen-migration.md ES1~ES14).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **1차 계약은 이 파일이 아니라 기존 `.tsx` 테스트가 무수정 통과하는
 * 것이다**(spec SC-002): `build-error`·`overwrite-confirm`. 이 파일은 그 위에 더하는
 * 명시 불변식이며, 032가 SM1~SM5, 033이 CS1~CS10에 적은 것을 이 스펙의 화면에 적용한다.
 *
 * ★ 059 — 개발자 메뉴 조각이 `AuthorPicker`·`PermissionsSection`(055가 설정 조립에서 걷은 것)을 지웠다. 그 둘의 단언(ES1 일부·
 * ES9 `theme/tokens` import·ES10·ES13·ES14·ES2/ES3)도 함께 지웠다 — 남은 화면에 걸린 불변식은 그대로다.
 *
 * **소스를 직접 읽는 이유**: jest는 타입을 지우고, 렌더 테스트는 조건 분기를
 * 다 밟지 못한다(007·009·012·022·033 반복 확인). 문안·경계 검사는
 * `readFileSync`가 유일하게 확실한 통로다. NativeWind `className`도 Metro
 * 시점 변환이라 jest 런타임에 없다 — 소스에 문자열로 있는지만 볼 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = {
  build: "../../src/ui/BuildErrorScreen.tsx",
  // 050 — 012의 전체 화면 확인(`OverwriteConfirmScreen`)이 홈 위 대화상자로 바뀌었다. 같은 방어(공용
  // 부품 사용, 색 리터럴 없음, 일기 본문 없음)를 새 파일에 건다.
  overwrite: "../../src/ui/OverwriteConfirmDialog.tsx",
  dialog: "../../src/ui/components/Dialog.tsx",
} as const;

/** 원문(문안 검사) + 주석 제거본(경계 검사) 쌍. */
function load(rel: string) {
  const src = readFileSync(join(__dirname, rel), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  return { src, code };
}

const BUILD = load(FILES.build);
const OVERWRITE = load(FILES.overwrite);
const DIALOG = load(FILES.dialog);
const ALL = [
  ["BuildErrorScreen", BUILD],
  ["OverwriteConfirmDialog", OVERWRITE],
] as const;

// ───────────────────────────────────────────────────────────────────────────
// ES7 — 원시 색값이 0개다 (spec SC-001)
// ───────────────────────────────────────────────────────────────────────────
describe("ES7 — 원시 hex 리터럴이 없다", () => {
  it.each(ALL)("%s 소스에 #rrggbb 리터럴이 없다", (_name, { code }) => {
    expect(code).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES9 — className + 토큰 style 병행 (spec SC-003)
// ───────────────────────────────────────────────────────────────────────────
describe("ES9 — className 문자열과 토큰 참조 style을 함께 쓴다", () => {
  // 050 — 덮어쓰기 확인의 className·style 병행은 공용 `components/Dialog.tsx`가 한다(대화상자 파일은
  // 그것을 조립만 한다).
  it.each([
    ["BuildErrorScreen", BUILD],
    ["components/Dialog (OverwriteConfirmDialog가 쓴다)", DIALOG],
  ] as const)("%s 소스에 className= 이 있다", (_name, { code }) => {
    expect(code).toMatch(/className=/);
  });

  it.each(ALL)("%s 가 재사용 컴포넌트(AppText 등)를 import 한다", (_name, { code }) => {
    // 화면 코드가 색·타이포를 직접 안 만지고 재사용 컴포넌트로 넘긴다(FR-003).
    expect(code).toMatch(/from\s+["']\.\/components\//);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES8 — 032 경계: dark: variant / useColorScheme / Appearance 미사용
// ───────────────────────────────────────────────────────────────────────────
describe("ES8 — 032 경계 (031 라이트 고정)", () => {
  it.each(ALL)("%s 가 dark: variant className 을 쓰지 않는다", (_name, { src }) => {
    expect(src).not.toMatch(/className=["'`][^"'`]*\bdark:/);
  });

  it.each(ALL)("%s 가 useColorScheme·Appearance 를 쓰지 않는다", (_name, { code }) => {
    expect(code).not.toMatch(/\buseColorScheme\b/);
    expect(code).not.toMatch(/\bAppearance\./);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES5 — 원칙 III: 모델·프롬프트·페르소나에 닿지 않는다
// ───────────────────────────────────────────────────────────────────────────
describe("ES5 — 원칙 III: 모델에 닿는 경로가 없다", () => {
  it.each(ALL)(
    "%s 가 models/*·diary/prompt·diary/persona 를 import 하지 않는다",
    (_name, { code }) => {
      expect(code).not.toMatch(/from\s+["'][^"']*models\/(?:roster|assets|expo-port|storage)["']/);
      expect(code).not.toMatch(/from\s+["'][^"']*diary\/prompt["']/);
      expect(code).not.toMatch(/from\s+["'][^"']*diary\/persona["']/);
    },
  );

  it.each(ALL)("%s 에 ModelAsset·assetFor·allAssets 식별자가 없다", (_name, { code }) => {
    expect(code).not.toMatch(/\b(?:ModelAsset|assetFor|allAssets)\b/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES1 — 사용자가 읽는 문장이 문자 그대로 같다
// ───────────────────────────────────────────────────────────────────────────
describe("ES1 — 문안이 바이트 그대로다", () => {
  it.each([["이 빌드는 잘못 만들어졌다"], ["이 앱을 만든 사람에게 알려야"]])(
    "BuildErrorScreen: %s",
    (literal) => {
      expect(BUILD.src).toContain(literal);
    },
  );

  // 050 — 덮어쓰기 문구는 보드 `2d` 원문으로 바뀌었고 `home-text.ts`에서만 온다(contracts TXT1·TXT3).
  // 원문 자체는 `home-text.test.ts`가 글자 단위로 잠근다.
  it("OverwriteConfirmDialog: 문구를 home-text의 OVERWRITE_CONFIRM에서 가져온다", () => {
    expect(OVERWRITE.code).toMatch(
      /import\s*\{[^}]*OVERWRITE_CONFIRM[^}]*\}\s*from\s*["']\.\/home-text["']/,
    );
    expect(OVERWRITE.code).not.toContain("다시 쓰기");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES11 — OverwriteConfirmDialog(050): 공용 대화상자 부품 + StyleSheet.create 없음
// ───────────────────────────────────────────────────────────────────────────
describe("ES11 — OverwriteConfirmDialog 고유", () => {
  it("components/Dialog 를 import 하고 <ConfirmDialog 를 쓴다", () => {
    expect(OVERWRITE.code).toMatch(/from\s+["']\.\/components\/Dialog["']/);
    expect(OVERWRITE.code).toMatch(/<ConfirmDialog\b/);
  });

  it("StyleSheet.create 가 없다", () => {
    expect(OVERWRITE.code).not.toMatch(/StyleSheet\.create/);
  });

  it("props 타입에 entry 가 없다 (원칙 I, X1)", () => {
    // OverwriteConfirmDialogProps 선언부에 entry 필드가 없다.
    const propsBlock = OVERWRITE.code.match(/OverwriteConfirmDialogProps\s*=\s*\{[\s\S]*?\}/);
    expect(propsBlock).not.toBeNull();
    expect(propsBlock?.[0]).not.toMatch(/\bentry\b/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES12 — BuildErrorScreen: Text·StyleSheet RN import 제거
// ───────────────────────────────────────────────────────────────────────────
describe("ES12 — BuildErrorScreen 고유", () => {
  it("react-native 에서 Text·StyleSheet 를 import 하지 않는다", () => {
    const rnImport = BUILD.code.match(/import\s+\{([^}]*)\}\s+from\s+["']react-native["']/);
    expect(rnImport).not.toBeNull();
    expect(rnImport?.[1]).not.toMatch(/\bText\b/);
    expect(rnImport?.[1]).not.toMatch(/\bStyleSheet\b/);
  });

  it("StyleSheet.create 가 없다", () => {
    expect(BUILD.code).not.toMatch(/StyleSheet\.create/);
  });

  it("AppText 를 쓴다", () => {
    expect(BUILD.code).toMatch(/from\s+["']\.\/components\/Text["']/);
  });

  it("환경 변수 이름·값이 소스에 없다 (원칙 III, S10)", () => {
    for (const leaked of ["EXPO_PUBLIC", "APP_ENV", "NODE_ENV"]) {
      expect(BUILD.code).not.toContain(leaked);
    }
  });
});

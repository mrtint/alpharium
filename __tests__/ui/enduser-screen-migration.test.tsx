/**
 * 034 — 엔드유저 화면 이관 계약 (contracts/enduser-screen-migration.md ES1~ES14).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **1차 계약은 이 파일이 아니라 기존 4개 `.tsx` 테스트가 무수정 통과하는
 * 것이다**(spec SC-002): `author-picker`·`build-error`·`overwrite-confirm`·
 * `permissions-section`. 이 파일은 그 위에 더하는 명시 불변식이며, 032가
 * SM1~SM5, 033이 CS1~CS10에 적은 것을 이 스펙의 4개 화면에 적용한다.
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
  author: "../../src/ui/AuthorPicker.tsx",
  build: "../../src/ui/BuildErrorScreen.tsx",
  overwrite: "../../src/ui/OverwriteConfirmScreen.tsx",
  permissions: "../../src/ui/PermissionsSection.tsx",
} as const;

/** 원문(문안 검사) + 주석 제거본(경계 검사) 쌍. */
function load(rel: string) {
  const src = readFileSync(join(__dirname, rel), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  return { src, code };
}

const AUTHOR = load(FILES.author);
const BUILD = load(FILES.build);
const OVERWRITE = load(FILES.overwrite);
const PERMISSIONS = load(FILES.permissions);
const ALL = [
  ["AuthorPicker", AUTHOR],
  ["BuildErrorScreen", BUILD],
  ["OverwriteConfirmScreen", OVERWRITE],
  ["PermissionsSection", PERMISSIONS],
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
  it.each(ALL)("%s 소스에 className= 이 있다", (_name, { code }) => {
    expect(code).toMatch(/className=/);
  });

  it.each(ALL)("%s 가 재사용 컴포넌트(AppText 등)를 import 한다", (_name, { code }) => {
    // 화면 코드가 색·타이포를 직접 안 만지고 재사용 컴포넌트로 넘긴다(FR-003).
    expect(code).toMatch(/from\s+["']\.\/components\//);
  });

  // AuthorPicker·PermissionsSection은 자체 `COLORS.*` 참조(테두리·선택 강조 등)가
  // 남아 있어 `theme/tokens`를 직접 import한다. 전면 교체된 두 화면은 `AppText`·
  // `Button`이 병행을 내부에서 하므로 직접 import가 필요 없다.
  it.each([
    ["AuthorPicker", AUTHOR],
    ["PermissionsSection", PERMISSIONS],
  ] as const)("%s 가 theme/tokens 를 직접 import 한다", (_name, { code }) => {
    expect(code).toMatch(/from\s+["'][^"']*theme\/tokens["']/);
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
  it.each([["일기 작성자"], ["작성자"], ["아직 준비되지 않음 — 아래에서 내려받으세요"]])(
    "AuthorPicker: %s",
    (literal) => {
      expect(AUTHOR.src).toContain(literal);
    },
  );

  it.each([["이 빌드는 잘못 만들어졌다"], ["이 앱을 만든 사람에게 알려야"]])(
    "BuildErrorScreen: %s",
    (literal) => {
      expect(BUILD.src).toContain(literal);
    },
  );

  it.each([["이 날의 일기가 이미 있다. 덮어쓸지 확인이 필요하다"], ["취소"], ["확인"]])(
    "OverwriteConfirmScreen: %s",
    (literal) => {
      expect(OVERWRITE.src).toContain(literal);
    },
  );

  it.each([
    ["권한"],
    ["권한 안내 다시 보기"],
    ["배터리 예외 설정"],
    ["설정 열기"],
    ["전체 허용"],
    ["그날의 사진 전부를 보지 못할 수 있어요."],
    ["확인 중…"],
    ["허용됨"],
    ["일부만 허용됨"],
    ["거부됨 — 다시 요청할 수 있어요"],
    ["거부됨 — 설정에서 직접 바꿔야 해요"],
    ["아직 묻지 않음"],
  ])("PermissionsSection: %s", (literal) => {
    expect(PERMISSIONS.src).toContain(literal);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES10 — AuthorPicker: SelectRow 미사용 + StyleSheet.create 제거
// ───────────────────────────────────────────────────────────────────────────
describe("ES10 — AuthorPicker 고유", () => {
  it("SelectRow 를 import 하지 않는다 (research R2 — '작성자'≠'선택')", () => {
    expect(AUTHOR.code).not.toMatch(/from\s+["'][^"']*SelectRow["']/);
    expect(AUTHOR.code).not.toMatch(/<SelectRow\b/);
  });

  it("StyleSheet.create 가 없다 — 토큰·모듈 상수로 이관됐다", () => {
    expect(AUTHOR.code).not.toMatch(/StyleSheet\.create/);
  });

  it("AppText 를 쓴다", () => {
    expect(AUTHOR.code).toMatch(/from\s+["']\.\/components\/Text["']/);
  });

  it("testID author-picker·author-option 이 그대로다", () => {
    expect(AUTHOR.code).toContain("author-picker");
    expect(AUTHOR.code).toMatch(/author-option-\$\{index\}/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES11 — OverwriteConfirmScreen: 공용 Button + StyleSheet.create 제거
// ───────────────────────────────────────────────────────────────────────────
describe("ES11 — OverwriteConfirmScreen 고유", () => {
  it("components/Button 을 import 하고 <Button 을 쓴다", () => {
    expect(OVERWRITE.code).toMatch(/from\s+["']\.\/components\/Button["']/);
    expect(OVERWRITE.code).toMatch(/<Button\b/);
  });

  it("StyleSheet.create 가 없다", () => {
    expect(OVERWRITE.code).not.toMatch(/StyleSheet\.create/);
  });

  it("props 타입에 entry 가 없다 (원칙 I, X1)", () => {
    // OverwriteConfirmScreenProps 선언부에 entry 필드가 없다.
    const propsBlock = OVERWRITE.code.match(/OverwriteConfirmScreenProps\s*=\s*\{[\s\S]*?\}/);
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

// ───────────────────────────────────────────────────────────────────────────
// ES13 — PermissionsSection: Card + SectionHeader 사용, Section 미사용
// ───────────────────────────────────────────────────────────────────────────
describe("ES13 — PermissionsSection: Card·SectionHeader 실제 사용 (OQ-3/R3)", () => {
  it("components/Card 를 import 하고 <Card 로 권한 행을 감싼다", () => {
    expect(PERMISSIONS.code).toMatch(/from\s+["']\.\/components\/Card["']/);
    expect(PERMISSIONS.code).toMatch(/<Card\b/);
  });

  it("<Section 을 쓰지 않는다 (섹션 전체 Card 래핑 금지 — R3)", () => {
    expect(PERMISSIONS.code).not.toMatch(/<Section\b/);
  });

  it("SectionHeader 를 import 하고 머리글에 쓴다", () => {
    expect(PERMISSIONS.code).toMatch(/from\s+["']\.\/components\/SectionHeader["']/);
    expect(PERMISSIONS.code).toMatch(/<SectionHeader\b/);
  });

  it("Toggle 을 쓰지 않는다 (on/off 성격 행 없음)", () => {
    expect(PERMISSIONS.code).not.toMatch(/from\s+["'][^"']*components\/Toggle["']/);
    expect(PERMISSIONS.code).not.toMatch(/<Toggle\b/);
  });

  it("Card 에 permission-row-<key> testID 가 붙는다 (033 CS4)", () => {
    expect(PERMISSIONS.code).toMatch(
      /<Card[\s\S]{0,300}?testID=\{`permission-row-\$\{req\.key\}`\}/,
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES14 — PermissionsSection: 좌우 여백을 App.tsx 가 소유 (OQ-2/R4)
// ───────────────────────────────────────────────────────────────────────────
describe("ES14 — PermissionsSection 좌우 padding 이 없다", () => {
  it("section 스타일에 좌우·상하 padding 이 없다 (gap 만)", () => {
    // 섹션 컨테이너의 style 객체(모듈 상수 `SECTION` 또는 `styles.section`)를 본다.
    // Card 의 style={{ padding: 12 }} 는 행 단위라 별개(허용).
    const sectionBlock = PERMISSIONS.code.match(/\b(?:SECTION|section)\s*[:=]\s*\{[^}]*\}/);
    expect(sectionBlock).not.toBeNull();
    expect(sectionBlock?.[0]).not.toMatch(/paddingHorizontal\s*:/);
    expect(sectionBlock?.[0]).not.toMatch(/\bpadding\s*:\s*\d/);
    // App.tsx 가 settingsSection 래퍼로 감싼다.
    const appSrc = readFileSync(join(__dirname, "../../App.tsx"), "utf8");
    expect(appSrc).toMatch(/settingsSection[\s\S]{0,160}?<PermissionsSection/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ES2/ES3 — 순수 함수·props 타입 불변 (소스에 존재 확인 — tsc 가 시그니처 보증)
// ───────────────────────────────────────────────────────────────────────────
describe("ES2/ES3 — 로직·타입 불변", () => {
  it("AuthorPicker onSelect(index) 시그니처", () => {
    expect(AUTHOR.code).toMatch(/onSelect:\s*\(index:\s*number\)\s*=>/);
  });

  it("PermissionsSection 순수 함수·재조회가 그대로다", () => {
    expect(PERMISSIONS.code).toMatch(/function\s+readStates\b/);
    expect(PERMISSIONS.code).toMatch(/function\s+describe\b/);
    expect(PERMISSIONS.code).toMatch(/AppState\.addEventListener\(\s*["']change["']/);
    expect(PERMISSIONS.code).toMatch(/describePhotoAccessLimit\(/);
  });
});

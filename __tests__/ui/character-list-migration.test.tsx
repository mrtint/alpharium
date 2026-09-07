/**
 * 033 — 캐릭터 화면 이관 계약 (contracts/character-screen-migration.md CS1~CS9).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **1차 계약은 이 파일이 아니라 `character-list.test.tsx`가 무수정 통과하는
 * 것이다**(spec SC-002). 이 파일은 그 위에 더하는 명시 불변식이며, 032가
 * SM1~SM5에 적은 것을 이 화면(SM6에 해당)에 적용한다.
 *
 * **소스를 직접 읽는 이유**: jest는 타입을 지우고, 렌더 테스트는 조건 분기를
 * 다 밟지 못한다. 007·009·012·022가 반복 확인한 대로 문안·경계 검사는
 * `readFileSync`가 유일하게 확실한 통로다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(join(__dirname, "../../src/ui/CharacterListScreen.tsx"), "utf8");
/** 주석을 걷어낸 코드 — 문안 검사는 원문, 경계 검사는 이것으로 한다. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

describe("CS1 — 사용자가 읽는 문장이 문자 그대로 같다", () => {
  it.each([
    ["화면 제목", "캐릭터"],
    ["상태 ready", "쓸 수 있음"],
    ["상태 not-downloaded", "받아야 함"],
    ["상태 partial resumable", "받다 멈춤 — 이어받을 수 있음"],
    ["상태 partial", "받다 멈춤"],
    ["상태 unusable", "다시 받아야 함"],
    ["동작 지우기", "지우기"],
    ["동작 이어받기", "이어받기"],
    ["동작 다시 받기", "다시 받기"],
    ["동작 준비하기", "준비하기"],
    ["동작 멈추기", "멈추기"],
    ["동작 닫기", "닫기"],
    ["진행 미상", "받는 중…"],
    ["사진 모델 줄", "사진을 보는 데 필요한 것"],
  ])("%s — %p 가 문자 그대로 있다", (_label, literal) => {
    expect(SRC).toContain(literal);
  });

  it("진행률 문장이 그대로다 (003 — 다운로드 상태이지 생성 지표가 아니다)", () => {
    expect(SRC).toContain("받는 중… ${Math.round(fraction * 100)}%");
  });

  it("거부 안내 문장이 그대로다 (008 FR-003)", () => {
    // ★ 「거부됨」만 말하고 빠져나갈 길을 말하지 않으면 사용자는 여전히 갇힌다 —
    //   003 FR-020a가 막으려던 상태다. 두 조각이 모두 있어야 한다.
    //   JSX가 문장 중간에서 줄바꿈하므로 공백을 유연하게 본다.
    const flat = SRC.replace(/\s+/g, " ");
    expect(flat).toContain("을(를) 받는 중이라 지금은 받을 수 없다.");
    expect(flat).toContain("을(를) 멈추면 받을 수 있다.");
  });
});

describe("CS2 — 순수 함수 넷의 로직이 불변이다", () => {
  it.each(["statusText", "actionLabel", "progressText", "formatBytes"])(
    "%s 가 여전히 선언돼 있다",
    (fn) => {
      expect(CODE).toMatch(new RegExp(`function ${fn}\\(`));
    },
  );

  it("★ 진행률에 '모름'을 지어내지 않는다 (원칙 V)", () => {
    // 총량을 모르면 백분율이 없고, 그때 그럴듯한 숫자를 만들지 않는다.
    expect(CODE).toMatch(/fraction === null/);
  });
});

describe("CS6 — 원칙 III: 모델에 닿는 경로가 없다", () => {
  it("★ models/roster·assets·expo-port·storage를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*models\/(roster|assets|expo-port|storage)["']/);
  });

  it("★ ModelAsset·assetFor·allAssets 식별자가 없다", () => {
    for (const id of ["ModelAsset", "assetFor", "allAssets"]) {
      expect(CODE).not.toMatch(new RegExp(`\\b${id}\\b`));
    }
  });

  it("models/types(상태 타입)만 계속 쓴다 — 자산이 아니다", () => {
    expect(CODE).toMatch(/from\s+["'][^"']*models\/types["']/);
  });
});

describe("CS7 — 원칙 III: 이름·소개를 짓지 않는다", () => {
  it("★ persona에서만 이름·소개가 온다", () => {
    expect(CODE).toMatch(/personaOf\(character\)\.name/);
    expect(CODE).toMatch(/personaOf\(character\)\.tagline/);
  });
});

describe("CS8 — 원칙 III: 크기·규모가 안 드러나고, 추천이 없다", () => {
  it("★ 모델 식별자·규모 어휘가 없다", () => {
    const lowered = CODE.toLowerCase();
    for (const word of [
      "gguf",
      "kanana",
      "exaone",
      "hyperclova",
      "qwen",
      "gemma",
      "q4",
      "양자화",
    ]) {
      expect(lowered).not.toContain(word.toLowerCase());
    }
  });

  it("★ 추천·권장 표식이 없다 — 다섯이 같은 자격이다 (FR-008)", () => {
    expect(CODE).not.toMatch(/추천|권장|기본값으로|먼저 골라/);
  });

  it("저장 공간은 캐릭터 단위 합산 하나다 (파일 개수가 안 드러난다)", () => {
    expect(CODE).toMatch(/formatBytes\(/);
    expect(CODE).not.toMatch(/파일\s*\d|첫 번째 파일|두 파일/);
  });
});

describe("CS9 — 원시 색값이 0개다 (SC-001)", () => {
  it("★ #rrggbb 리터럴이 없다", () => {
    expect(CODE).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it("★ StyleSheet.create를 쓰지 않는다 — 토큰·공용 컴포넌트로 이관됐다", () => {
    expect(CODE).not.toMatch(/StyleSheet\.create/);
  });

  it("★ 공용 컴포넌트를 실제로 쓴다 (FR-009 — 032가 만들고 안 쓰던 것)", () => {
    expect(CODE).toMatch(/from\s+["']\.\/components\/ListRow["']/);
    expect(CODE).toMatch(/from\s+["']\.\/components\/Button["']/);
    expect(CODE).toMatch(/<ListRow\b/);
    expect(CODE).toMatch(/<Button\b/);
  });

  it("★ 색은 토큰에서만 온다", () => {
    expect(CODE).toMatch(/from\s+["']\.\/theme\/tokens["']/);
  });
});

describe("CS4 — testID 7종이 그대로다", () => {
  it.each([
    "character-row-",
    "action-",
    "pause-",
    "action-vision",
    "vision-row",
    "download-notice",
    "dismiss-notice",
  ])("%s 가 소스에 있다", (id) => {
    expect(CODE).toContain(id);
  });

  it("★ 동작 버튼의 testID가 Button에 직접 붙는다 (008 실측)", () => {
    // Maestro는 좌표상 행 안의 버튼을 접근성 트리에서 형제로 평탄화해 본다 —
    // childOf로 좁힐 수 없으므로 버튼 자신이 이름을 가져야 한다.
    expect(CODE).toMatch(/<Button[\s\S]{0,400}?testID=\{`action-\$\{character\}`\}/);
    expect(CODE).toMatch(/<Button[\s\S]{0,400}?testID=\{`pause-\$\{character\}`\}/);
  });
});

describe("CS10 — 행 높이가 자동화의 스크롤 도달을 깨뜨리지 않는다", () => {
  it("★ ListRow에 세로 여백을 현행(12)으로 넘긴다", () => {
    // ListRow 기본값은 14다. 다섯 행 + 사진 모델 행이 2px씩 커지면 누적 12px이
    // 밀리고, 025가 실측한 scrollUntilVisible 성질과 겹치면 그 아래 버튼이
    // 화면 밖에 남는다 — 문안·testID가 전부 불변인데도 깨지는 경로다.
    expect(CODE).toMatch(/paddingVertical:\s*12/);
  });
});

describe("032 경계 유지", () => {
  it("dark: variant를 쓰지 않는다 (031 라이트 고정)", () => {
    expect(CODE).not.toMatch(/\bdark:/);
  });

  it("useColorScheme·Appearance를 쓰지 않는다", () => {
    expect(CODE).not.toMatch(/\buseColorScheme\b/);
    expect(CODE).not.toMatch(/\bAppearance\./);
  });

  it("diary/prompt에 닿지 않는다 (022 UI_TOUCHES_PROMPT)", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\/prompt["']/);
  });
});

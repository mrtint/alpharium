import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 표시 이름이 흐르는 자리의 계약 테스트 (035 Phase 8 수렴).
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/character-name.md N1·N13
 *       spec.md FR-017·FR-018·FR-026b, SC-003·SC-005a
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 테스트가 없어서 결함이 초록불로 빠져나갔다.**
 *
 * 035 Phase 4가 이름 흐름을 배선했지만 `DiaryDetailScreen`·`CharacterListScreen`
 * 둘을 빠뜨렸다. 기기 없는 테스트 2562개가 전부 통과하는 상태로:
 *
 *  - `DiaryEntry.authorName`이 저장되는데 **읽는 곳이 하나도 없었다** — 스냅샷
 *    기능 전체가 화면에서 무효였다(FR-026b).
 *  - 설정 탭 한 화면 안에서 `AuthorPicker`는 "복실이", 그 아래
 *    `CharacterListScreen`은 "금동이"로 **이름이 갈려 보였다**.
 *
 * 011의 `has_media=0`, 013의 URI 계약 불일치와 같은 계열 — **오류 없이 "아무 일도
 * 일어나지 않는" 실패**다. `/speckit-converge`가 잡았고, 다시 빠져나가지 못하게
 * 여기서 잠근다.
 *
 * **`tagline`은 검사 대상이 아니다** — 헌법 1.4.0이 연 것은 이름뿐이고, 소개는
 * 코드 안 고정값 그대로다(사용자가 바꿀 수 없다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const UI_DIR = join(__dirname, "../../src/ui");

/** 주석을 걷어낸 코드만 검사한다 (011 `vision/engine.test.ts` 관례). */
function codeOf(file: string): string {
  return readFileSync(join(UI_DIR, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/**
 * `personaOf(...).name`을 **폴백으로도** 쓰지 않는 화면 — 사람이 못 박은 목록이다
 * (012 `USER_VISIBLE_SIGNAL_AXES`, 021 `PERMISSION_REQUIREMENTS` 선례).
 *
 * 코드가 "이 파일은 예외로 하자"를 스스로 정하지 않는다(원칙 V). 여기 넣으려면
 * **왜 이름을 아예 안 그리는지**를 함께 적어야 한다.
 */
const NO_NAME_RENDERING: Readonly<Record<string, string>> = {
  // 029가 홈에서 걷어낸 뒤 어디서도 렌더되지 않는다(주석에만 남음). 살아 있는
  // 화면이 아니므로 이름이 갈릴 자리가 없다 — 지우는 것은 035의 범위 밖이다.
  "CharacterPicker.tsx": "029 이후 렌더되지 않는 죽은 화면",
};

/**
 * **검사하는 것은 「부르는가」가 아니라 「그것만 쓰는가」다.**
 *
 * `personaOf(...).name`은 **마지막 폴백으로는 정당하다** — 주입값이 없는 옛
 * 호출자·테스트에서 빈 이름이 나오면 안 되기 때문이다(SC-005). 금지되는 것은
 * **주입받은 이름을 무시하고 그것만 쓰는 것**이며, 그것이 수렴 검사가 잡은
 * F2·F3(사용자가 이름을 바꿔도 화면이 옛 이름을 보임)의 정체다.
 *
 * 그래서 `??` 왼쪽에 주입값이 있는지를 본다.
 */
function usesPersonaNameAsOnlySource(code: string): boolean {
  const calls = [...code.matchAll(/personaOf\([^)]*\)\.name/g)];
  if (calls.length === 0) return false;

  // 각 호출 앞에 `?? `가 있으면 폴백이다(`<주입값> ?? personaOf(...).name`).
  return calls.some((match) => {
    const before = code.slice(Math.max(0, match.index - 40), match.index);
    return !/\?\?\s*$/.test(before);
  });
}

describe("FR-017·FR-018 — 화면이 주입받은 이름을 무시하지 않는다", () => {
  const screens = readdirSync(UI_DIR).filter((f) => f.endsWith(".tsx"));

  it("검사할 화면이 실제로 있다 (glob이 빈 배열이면 이 테스트는 아무것도 안 한다)", () => {
    expect(screens.length).toBeGreaterThan(5);
  });

  it.each(screens)("%s 가 persona 기본 이름을 유일한 출처로 쓰지 않는다", (file) => {
    if (file in NO_NAME_RENDERING) {
      // 예외 목록에 있는 파일은 이름을 안 그린다 — 다만 이유가 위에 적혀 있어야 한다.
      expect(NO_NAME_RENDERING[file]).toBeTruthy();
      return;
    }

    expect(usesPersonaNameAsOnlySource(codeOf(file))).toBe(false);
  });

  it("★ 위반 주입 — 폴백 없이 부르면 잡는다", () => {
    // 이 검사가 실제로 무언가를 잡는다는 증명(007~034 관례).
    expect(usesPersonaNameAsOnlySource("const name = personaOf(c).name;")).toBe(true);
    expect(usesPersonaNameAsOnlySource("const name = injected ?? personaOf(c).name;")).toBe(false);
  });

  it("tagline은 여전히 personaOf에서 온다 (헌법 1.4.0 — 이름만 사용자가 짓는다)", () => {
    // 소개까지 주입으로 바꾸면 사용자가 말투를 바꿀 수 있게 되고, 그것이
    // 원칙 III가 계속 막는 것이다.
    const list = codeOf("CharacterListScreen.tsx");
    expect(list).toMatch(/personaOf\([^)]*\)\.tagline/);
  });
});

describe("FR-026b — 저장된 작성자 이름을 읽는 곳이 있다", () => {
  it("★ authorName을 소비하는 화면이 존재한다", () => {
    // 저장만 하고 읽지 않으면 스냅샷 기능이 화면에서 무효다 —
    // 이것이 수렴 검사가 잡은 F1이다.
    const consumers = readdirSync(UI_DIR)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => /\bauthorName\b/.test(codeOf(f)));

    expect(consumers.length).toBeGreaterThan(0);
  });

  it("일기 상세가 authorName을 우선 쓰고 폴백을 갖는다", () => {
    const detail = codeOf("DiaryDetailScreen.tsx");
    // `entry.authorName ?? <현재 이름>` 꼴 — 옛 일기(스냅샷 없음)에서 빈 이름이
    // 나오면 안 된다(SC-005).
    expect(detail).toMatch(/authorName\s*\?\?/);
  });
});

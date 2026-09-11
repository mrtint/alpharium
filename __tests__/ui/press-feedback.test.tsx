/**
 * 033 — 눌림 피드백 계약 (contracts/press-feedback.md PF1~PF8).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 테스트가 검증할 수 없는 것을 먼저 적는다**(PF7).
 *
 * `jest/setup-ui.ts`가 `react-native-reanimated`를 목으로 대체한다(2026-09-07
 * 실측 — 목 없이는 `loadUnpackers` 오류, 공식 `mock.js`도 실제 index를 다시
 * import해 똑같이 죽는다). 따라서 이 파일이 잠그는 것은 **"눌림 반응이
 * 배선됐는가"뿐이고, "실제로 움직이는가"는 잠그지 못한다.**
 *
 * 특히 `babel.config.js`의 `react-native-worklets/plugin`이 빠져도 **이 테스트는
 * 전부 초록이다.** 011(`has_media=0`)·013(URI 계약)·020(헤드리스 `defineTask`)이
 * 전부 "기기 없는 테스트 통과 + 실기기에서 조용히 안 됨"이었다 — 초록불을
 * "동작한다"로 읽지 않는다. 실기기 육안이 유일한 확인이다(spec FR-022).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent } from "@testing-library/react-native";

import { Button } from "../../src/ui/components/Button";
import { ListRow } from "../../src/ui/components/ListRow";
import { PRESS } from "../../src/ui/theme/tokens";

const SRC_DIR = join(__dirname, "../../src");
const COMPONENTS_DIR = join(SRC_DIR, "ui/components");

const TOKENS_SRC = readFileSync(join(SRC_DIR, "ui/theme/tokens.ts"), "utf8");
const BUTTON_SRC = readFileSync(join(COMPONENTS_DIR, "Button.tsx"), "utf8");
const LIST_ROW_SRC = readFileSync(join(COMPONENTS_DIR, "ListRow.tsx"), "utf8");

/** `src/` 아래 모든 `.ts`/`.tsx`를 훑는다. */
function allSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allSourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("PF1 — 세기·시간은 토큰 한 곳의 상수다", () => {
  it("tokens.ts가 PRESS를 export하고 scale·durationMs를 갖는다", () => {
    expect(PRESS).toBeDefined();
    expect(typeof PRESS.scale).toBe("number");
    expect(typeof PRESS.durationMs).toBe("number");
  });

  it("★ 사람이 정한 상수다 — as const이고 계산하지 않는다 (원칙 V)", () => {
    const decl = /export const PRESS = \{[\s\S]*?\} as const;/.exec(TOKENS_SRC);
    expect(decl).not.toBeNull();
    const body = decl![0];
    // 조건 분기·수식 유도가 들어가면 그것이 곧 임계값 코드다(원칙 IV로 가는 길).
    expect(body).not.toMatch(/\bMath\./);
    expect(body).not.toMatch(/\?|\bif\b|=>/);
  });

  it("★ PRESS를 참조하는 파일은 Button·ListRow 둘뿐이다 (SC-008)", () => {
    const referencing = allSourceFiles(SRC_DIR)
      .filter((f) => !f.endsWith(join("ui", "theme", "tokens.ts")))
      .filter((f) => /\bPRESS\b/.test(readFileSync(f, "utf8")))
      .map((f) => f.replace(/\\/g, "/"))
      .sort();

    expect(referencing).toHaveLength(2);
    expect(referencing[0]).toMatch(/src\/ui\/components\/Button\.tsx$/);
    expect(referencing[1]).toMatch(/src\/ui\/components\/ListRow\.tsx$/);
  });

  it("화면 파일은 PRESS를 import하지 않는다", () => {
    const screens = allSourceFiles(join(SRC_DIR, "ui")).filter(
      (f) => !f.replace(/\\/g, "/").includes("/ui/components/"),
    );
    for (const file of screens) {
      if (file.endsWith(join("theme", "tokens.ts"))) continue;
      expect(readFileSync(file, "utf8")).not.toMatch(/\bPRESS\b/);
    }
  });
});

describe("PF2 — 새 컴포넌트를 만들지 않는다", () => {
  it("★ src/ui/components/의 파일이 8개다(033 7개 + 038 TypewriterText)", () => {
    // 032가 만들고 안 쓴 컴포넌트 4개를 남긴 것이 이 스펙의 존재 이유다.
    // 같은 실패(쓸 자리 없는 추상을 먼저 만듦)를 되풀이하지 않는다.
    //
    // 038 — `TypewriterText.tsx`가 여덟 번째로 늘었다. 이건 032의 "만들고 안
    // 쓴" 패턴이 아니다 — 실제로 `DiaryDetailScreen`이 쓰고(첫 표시 타자기
    // 연출), data-model.md·contracts/typewriter-text.md가 계약을 미리 못
    // 박은 필수 컴포넌트다. 이 숫자는 "새 컴포넌트를 함부로 늘리지 않는다"는
    // 규칙을 지키되, 실제로 쓰이는 새 컴포넌트까지 막지는 않는다.
    expect(readdirSync(COMPONENTS_DIR).filter((f) => /\.tsx?$/.test(f))).toHaveLength(8);
  });
});

describe("PF3 — 눌린 것이 보이고 떼면 돌아온다", () => {
  /*
   * **★ `onPressIn`을 host 노드의 prop으로 검사하지 않는다**(2026-09-07 실측).
   *
   * `Pressable`은 `onPressIn`/`onPressOut`을 RN 責任자(responder) 시스템으로
   * 컴파일한다 — host `View`에 남는 것은 `onResponderGrant`·`onResponderRelease`
   * 뿐이고 `onPressIn`은 **props에 아예 없다**. 처음 이 계약을 prop 존재로
   * 쓴 것이 실패했고, 구현이 아니라 테스트가 틀렸다.
   *
   * 대신 (1) 이벤트를 실제로 쏴서 받아들여지는지, (2) 소스가 두 핸들러를
   * `PRESS` 토큰에 연결하는지 두 각도로 잠근다.
   */
  it("Button이 pressIn·pressOut 이벤트를 받아들인다", async () => {
    await render(
      <Button onPress={() => {}} testID="b1">
        누르기
      </Button>,
    );
    const node = screen.getByTestId("b1");
    await fireEvent(node, "pressIn");
    await fireEvent(node, "pressOut");
    expect(screen.getByTestId("b1")).toBeTruthy();
  });

  it("ListRow가 onPress를 가지면 pressIn·pressOut을 받아들인다", async () => {
    await render(<ListRow label="행" onPress={() => {}} testID="r1" />);
    const node = screen.getByTestId("r1");
    await fireEvent(node, "pressIn");
    await fireEvent(node, "pressOut");
    expect(screen.getByTestId("r1")).toBeTruthy();
  });

  it("★ 두 컴포넌트가 onPressIn·onPressOut을 실제로 배선한다 (소스)", () => {
    for (const src of [BUTTON_SRC, LIST_ROW_SRC]) {
      expect(src).toMatch(/onPressIn=\{/);
      expect(src).toMatch(/onPressOut=\{/);
      // 눌림은 축소(PRESS.scale), 뗌은 복귀(1) — 둘 다 있어야 돌아온다.
      expect(src).toMatch(/setScale\(PRESS\.scale\)/);
      expect(src).toMatch(/setScale\(1\)/);
      // 시간은 토큰에서 온다.
      expect(src).toMatch(/withTiming\([\s\S]{0,40}duration: PRESS\.durationMs/);
    }
  });

  it("눌렀다 떼도 예외가 나지 않는다", async () => {
    await render(
      <Button onPress={() => {}} testID="b2">
        누르기
      </Button>,
    );
    const node = screen.getByTestId("b2");
    await fireEvent(node, "pressIn");
    await fireEvent(node, "pressOut");
    expect(screen.getByTestId("b2")).toBeTruthy();
  });

  it("두 컴포넌트가 PRESS.scale·PRESS.durationMs를 쓴다", () => {
    for (const src of [BUTTON_SRC, LIST_ROW_SRC]) {
      expect(src).toMatch(/PRESS\.scale/);
      expect(src).toMatch(/PRESS\.durationMs/);
    }
  });
});

describe("PF4 — 자리·크기 배치를 바꾸지 않는다", () => {
  it("★ 애니메이션 대상이 transform(scale)뿐이다", () => {
    for (const src of [BUTTON_SRC, LIST_ROW_SRC]) {
      const animated = /useAnimatedStyle\(\(\) => \(\{[\s\S]*?\}\)\)/.exec(src);
      expect(animated).not.toBeNull();
      const body = animated![0];
      expect(body).toMatch(/transform/);
      // 레이아웃 속성을 애니메이션하면 주변이 밀려나며 목록이 출렁인다.
      for (const forbidden of ["width", "height", "margin", "padding", "flex"]) {
        expect(body).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
      }
    }
  });

  it("불투명도를 쓰지 않는다 (FR-013 — 기존 터치 영역이 이미 주던 효과)", () => {
    for (const src of [BUTTON_SRC, LIST_ROW_SRC]) {
      const animated = /useAnimatedStyle\(\(\) => \(\{[\s\S]*?\}\)\)/.exec(src);
      expect(animated![0]).not.toMatch(/opacity/);
    }
  });
});

describe("PF5 — 탭의 결과를 바꾸지 않는다", () => {
  it("Button의 onPress가 한 번만 불린다", async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} testID="b3">
        누르기
      </Button>,
    );
    await fireEvent.press(screen.getByTestId("b3"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("눌림 반응이 onPress를 삼키지 않는다 (pressIn→press 순서)", async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} testID="b4">
        누르기
      </Button>,
    );
    const node = screen.getByTestId("b4");
    await fireEvent(node, "pressIn");
    await fireEvent.press(node);
    await fireEvent(node, "pressOut");
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ListRow의 onPress가 한 번만 불린다", async () => {
    const onPress = jest.fn();
    await render(<ListRow label="행" onPress={onPress} testID="r2" />);
    await fireEvent.press(screen.getByTestId("r2"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("PF6 — 비활성은 반응하지 않는다", () => {
  it("★ disabled Button은 눌러도 onPress가 안 불린다", async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} disabled testID="b5">
        누르기
      </Button>,
    );
    await fireEvent.press(screen.getByTestId("b5"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("★ disabled면 눌림 반응이 없다 — 소스가 disabled를 판정에 쓴다", () => {
    // 반응만 있고 아무 일도 안 일어나면 008이 고쳤던 「버튼이 고장났다」가 돌아온다.
    for (const src of [BUTTON_SRC, LIST_ROW_SRC]) {
      for (const handler of ["onPressIn", "onPressOut"]) {
        const wiring = new RegExp(`${handler}=\\{disabled \\? undefined :`).exec(src);
        expect(wiring).not.toBeNull();
      }
    }
  });

  it("disabled ListRow는 눌러도 onPress가 안 불린다", async () => {
    const onPress = jest.fn();
    await render(<ListRow label="행" onPress={onPress} disabled testID="r3" />);
    await fireEvent.press(screen.getByTestId("r3"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("PF8 — 새 수치를 만들지 않는다 (원칙 IV)", () => {
  it("★ 소스에 성능 측정 어휘가 없다", () => {
    for (const src of [BUTTON_SRC, LIST_ROW_SRC, TOKENS_SRC]) {
      const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      for (const forbidden of ["fps", "frame", "elapsed", "measure", "benchmark"]) {
        expect(code.toLowerCase()).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
      }
    }
  });

  it("눌림 반응이 화면에 숫자를 새로 그리지 않는다", async () => {
    await render(
      <Button onPress={() => {}} testID="b6">
        누르기
      </Button>,
    );
    const node = screen.getByTestId("b6");
    await fireEvent(node, "pressIn");
    // 눌린 상태에서도 화면에 있는 글자는 라벨뿐이다.
    expect(screen.queryByText(/\d/)).toBeNull();
    expect(screen.getByText("누르기")).toBeTruthy();
  });
});

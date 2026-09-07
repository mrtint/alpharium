import { fireEvent, render, screen } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { WelcomeScreen, type WelcomeScreenProps } from "../../src/ui/WelcomeScreen";
import { NAME_MAX_LENGTH } from "../../src/welcome/naming";

/**
 * 첫 만남 화면의 계약 테스트.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/welcome-gate.md W11~W16
 *       liveness.md L15·L16
 *       spec.md FR-004·FR-005·FR-006·FR-007·FR-012·FR-013·FR-014·FR-027
 *
 * **RNTL 14는 `render`도 `fireEvent`도 Promise를 반환한다** — `await` 없이는
 * 렌더·상태 갱신이 flush되지 않는다(025에서 실측, 034 `author-picker.test.tsx` 선례).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/ui/WelcomeScreen.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

async function setup(overrides: Partial<WelcomeScreenProps> = {}) {
  const props: WelcomeScreenProps = {
    phase: "welcome",
    characterName: "금동이",
    onSubmitName: jest.fn(),
    onSkip: jest.fn(),
    onRetry: jest.fn(),
    ...overrides,
  };
  await render(<WelcomeScreen {...props} />);
  return { props };
}

describe("W12 — 세 phase가 각각 다른 것을 그린다", () => {
  it("checking — 대기 문구만, 작명·실패 요소 없음", async () => {
    await setup({ phase: "checking" });
    expect(screen.queryByTestId("welcome-checking")).not.toBeNull();
    expect(screen.queryByTestId("welcome-greeting")).toBeNull();
    expect(screen.queryByTestId("welcome-failed")).toBeNull();
    expect(screen.queryByTestId("welcome-name-input")).toBeNull();
  });

  it("welcome — 환영 문구와 작명 입력", async () => {
    await setup({ phase: "welcome" });
    expect(screen.queryByTestId("welcome-greeting")).not.toBeNull();
    expect(screen.queryByTestId("welcome-name-input")).not.toBeNull();
    expect(screen.queryByTestId("welcome-checking")).toBeNull();
    expect(screen.queryByTestId("welcome-failed")).toBeNull();
  });

  it("failed — 안내와 두 갈래 버튼, 작명 입력 없음", async () => {
    await setup({ phase: "failed" });
    expect(screen.queryByTestId("welcome-failed")).not.toBeNull();
    expect(screen.queryByTestId("welcome-name-input")).toBeNull();
    expect(screen.queryByTestId("welcome-greeting")).toBeNull();
  });
});

describe("FR-012 — 빈 입력·공백만은 확정할 수 없다", () => {
  it("처음에는 확정 버튼이 잠겨 있다", async () => {
    await setup();
    expect(screen.getByTestId("welcome-name-submit").props.accessibilityState?.disabled).toBe(true);
  });

  it("공백만 넣어도 잠겨 있다", async () => {
    await setup();
    await fireEvent.changeText(screen.getByTestId("welcome-name-input"), "   ");
    expect(screen.getByTestId("welcome-name-submit").props.accessibilityState?.disabled).toBe(true);
  });

  it("이름을 넣으면 풀린다", async () => {
    await setup();
    await fireEvent.changeText(screen.getByTestId("welcome-name-input"), "복실이");
    expect(screen.getByTestId("welcome-name-submit").props.accessibilityState?.disabled).toBe(
      false,
    );
  });

  it("확정하면 입력한 이름을 넘긴다", async () => {
    const { props } = await setup();
    await fireEvent.changeText(screen.getByTestId("welcome-name-input"), "복실이");
    await fireEvent.press(screen.getByTestId("welcome-name-submit"));
    expect(props.onSubmitName).toHaveBeenCalledWith("복실이");
  });
});

describe("FR-013 — 글자 수 상한", () => {
  it("입력창의 maxLength가 12다", async () => {
    await setup();
    expect(screen.getByTestId("welcome-name-input").props.maxLength).toBe(12);
  });

  it("naming.ts의 NAME_MAX_LENGTH와 같다", () => {
    // 화면은 `src/welcome/`를 import할 수 없으므로(W14) 값이 복제된다.
    // 어긋나면 여기서 잡는다.
    expect(NAME_MAX_LENGTH).toBe(12);
    expect(CODE).toMatch(/NAME_INPUT_MAX_LENGTH\s*=\s*12/);
  });
});

describe("W11 — 세 phase 전부에 빠져나갈 길이 있다 (원칙 I·II)", () => {
  it("welcome — 건너뛰기가 있다 (FR-014)", async () => {
    const { props } = await setup({ phase: "welcome" });
    await fireEvent.press(screen.getByTestId("welcome-name-skip"));
    expect(props.onSkip).toHaveBeenCalled();
  });

  it("failed — 다시 시도와 건너뛰기가 둘 다 있다 (FR-007)", async () => {
    const { props } = await setup({ phase: "failed" });
    await fireEvent.press(screen.getByTestId("welcome-retry"));
    expect(props.onRetry).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("welcome-failed-skip"));
    expect(props.onSkip).toHaveBeenCalled();
  });

  it("checking에도 화면이 멈추지 않는다 — 잠깐이며 조립부가 다음 phase로 옮긴다", async () => {
    await setup({ phase: "checking" });
    expect(screen.queryByTestId("welcome-checking")).not.toBeNull();
  });
});

describe("W13·L15 — props가 모델·확인 내부를 받지 않는다 (원칙 III·IV)", () => {
  const PROPS_DECLARATION = CODE.slice(
    CODE.indexOf("export type WelcomeScreenProps"),
    CODE.indexOf("const NAME_INPUT_MAX_LENGTH"),
  );

  it("Character 심볼을 받지 않는다", () => {
    expect(PROPS_DECLARATION).not.toMatch(/\bCharacter\b/);
  });

  it("RunResult·LivenessOutcome·응답 텍스트를 받지 않는다", () => {
    expect(PROPS_DECLARATION).not.toMatch(/RunResult|LivenessOutcome|Ending|\btext\b/);
  });

  it("시간·토큰을 받지 않는다", () => {
    expect(PROPS_DECLARATION).not.toMatch(/\bms\b|elapsed|duration|token|perSecond/i);
  });

  it("src/welcome/를 import하지 않는다 (W14)", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*welcome\//);
  });

  it("모델 식별자·자산에 닿지 않는다", () => {
    expect(CODE).not.toMatch(/models\/roster|ModelAsset|assetFor|\.bin|quantiz/i);
  });

  it("화면에 모델 이름이 렌더되지 않는다", async () => {
    const { toJSON } = await render(
      <WelcomeScreen
        characterName="금동이"
        onRetry={() => {}}
        onSkip={() => {}}
        onSubmitName={() => {}}
        phase="welcome"
      />,
    );
    const rendered = JSON.stringify(toJSON());
    expect(rendered).not.toMatch(/kanana|exaone|hyperclovax|qwen|gemma|gguf|Q4_K_M|2\.1b/i);
  });
});

describe("L16·W15·W16 — 문구는 사람이 쓴 고정 상수다", () => {
  it("캐릭터 이름만 보간된다", async () => {
    await setup({ characterName: "복실이" });
    expect(screen.getByTestId("welcome-character-name").props.children).toBe("복실이");
  });

  it("실패 화면에 오류 사유·경로가 없다 (W16)", async () => {
    await setup({ phase: "failed" });
    const rendered = JSON.stringify(screen.getByTestId("welcome-failed"));
    expect(rendered).not.toMatch(/files\/|\.bin|Error|reason|load-failed|not-found/);
  });

  it("소스에 추론 생성 텍스트가 흘러들 자리가 없다", () => {
    // 문구는 TEXT 상수뿐이고 props의 characterName만 보간된다.
    expect(CODE).toMatch(/const TEXT = \{/);
    expect(CODE).not.toMatch(/generated|completion|streamed|onToken/);
  });
});

describe("025 회귀 — 접근성 라벨", () => {
  it("이름 표시에 accessibilityLabel이 있다", async () => {
    // 여러 텍스트 조각이 한 <Text>에 있으면 testID가 접근성 트리에 안 나온다.
    await setup({ characterName: "복실이" });
    expect(screen.getByTestId("welcome-character-name").props.accessibilityLabel).toBe("복실이");
  });

  it("입력창에 accessibilityLabel이 있다", async () => {
    await setup();
    expect(screen.getByTestId("welcome-name-input").props.accessibilityLabel).toBeTruthy();
  });
});

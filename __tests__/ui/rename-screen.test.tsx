/**
 * 055 — 설정의 이름 바꾸기 (Clarification: 1a 입력줄 재사용, 빈 이름이면 「저장」 비활성).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md R1~R4
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";

import { RenameScreen } from "../../src/ui/RenameScreen";
import { WelcomeScreen } from "../../src/ui/WelcomeScreen";

jest.setTimeout(30000);

async function renderRename(initialName = "금동이") {
  const onSave = jest.fn();
  const onClose = jest.fn();
  await render(<RenameScreen initialName={initialName} onClose={onClose} onSave={onSave} />);
  return { onSave, onClose };
}

describe("055 R1 — 1a와 같은 입력줄", () => {
  it("머리 「‹ 설정」·제목 「이름」, 지금 이름이 채워져 있고 상한 12·카운터", async () => {
    await renderRename();
    expect(screen.getByTestId("rename-back")).toHaveTextContent("‹설정");
    expect(screen.getByTestId("settings-title")).toHaveTextContent("이름");
    const input = screen.getByTestId("rename-input");
    expect(input.props.value).toBe("금동이");
    expect(input.props.maxLength).toBe(12);
    expect(screen.getByTestId("rename-counter")).toHaveTextContent("3/12");
  });
});

describe("★ 055 R2 — 빈 이름이면 「저장」이 흐리고 눌리지 않는다", () => {
  it.each(["", "   "])("입력 %p", async (text) => {
    const { onSave } = await renderRename();
    await fireEvent.changeText(screen.getByTestId("rename-input"), text);
    const save = screen.getByTestId("rename-save");
    expect(save.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(save);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("055 R3 — 저장·뒤로", () => {
  it("「저장」은 입력을 그대로 onSave에 넘긴다(검증은 조립부)", async () => {
    const { onSave, onClose } = await renderRename();
    await fireEvent.changeText(screen.getByTestId("rename-input"), " 동이 ");
    expect(screen.getByTestId("rename-save").props.accessibilityState).toMatchObject({
      disabled: false,
    });
    await fireEvent.press(screen.getByTestId("rename-save"));
    expect(onSave).toHaveBeenCalledWith(" 동이 ");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("「‹ 설정」은 저장하지 않고 닫는다", async () => {
    const { onSave, onClose } = await renderRename();
    await fireEvent.changeText(screen.getByTestId("rename-input"), "동이");
    await fireEvent.press(screen.getByTestId("rename-back"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("055 R4 — 첫 실행 1a의 규칙은 그대로다 (047 Q1)", () => {
  it("빈 입력에도 확정 버튼을 흐리지 않는다(disabled를 넘기지 않는다)", async () => {
    await render(
      <WelcomeScreen
        characterName="금동이"
        onRetry={() => {}}
        onSkip={() => {}}
        onSubmitName={() => {}}
        phase="welcome"
      />,
    );
    const submit = screen.getByTestId("welcome-name-submit");
    expect(submit.props.accessibilityState).toMatchObject({ disabled: true });
    // 흐리지 않는다 — 공용 Button의 disabled(opacity .5)를 쓰지 않는다
    expect(submit.props.style).toMatchObject({ opacity: 1 });
  });
});

import { render, screen } from "@testing-library/react-native";

import { DiaryListScreen } from "../../src/ui/DiaryListScreen";

/**
 * 거부된 권한으로 제한되는 기능의 정직한 안내 (021 FR-014, SC-004) — 108에서 자리가 바뀌었다.
 *
 * 021은 거부된 권한의 `ifDenied` 문장을 스트립 아래 줄글로 보였다. 108은 그 줄을 없애고 쓰기 바 위의 한 줄 제약 띠로 옮겼다
 * (사실은 같다 — 사진이 없으면 사진 없이 쓴다). 띠 자체의 판정·모양은 `constraint-band.test.ts(x)`와 `home-constraint-band.test.tsx`가 본다.
 */

// CI 러너(2코어)에서 `jest-expo` 첫 `render()`가 기본 5초를 넘길 수 있다.
jest.setTimeout(30000);

describe("DiaryListScreen — 거부 안내는 줄글이 아니라 제약 띠 (108)", () => {
  it("constraint가 있으면 띠만 있고 거부 안내 줄(denied-notices)은 없다", async () => {
    await render(
      <DiaryListScreen
        items={[]}
        onWrite={() => {}}
        constraint={{
          text: "사진 권한이 없어 사진 없이 써요",
          action: "권한 허용",
          onAction: () => {},
        }}
      />,
    );
    expect(screen.getByTestId("constraint-band")).toBeTruthy();
    expect(screen.queryByTestId("denied-notices")).toBeNull();
  });

  it("constraint가 없으면 아무 안내도 없다 (006~020 기존 호출 호환)", async () => {
    await render(<DiaryListScreen items={[]} onWrite={() => {}} />);
    expect(screen.queryByTestId("constraint-band")).toBeNull();
    expect(screen.queryByTestId("denied-notices")).toBeNull();
  });
});

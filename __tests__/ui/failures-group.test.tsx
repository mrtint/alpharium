/**
 * 081 — 「최근 실패」 묶음 (contracts/write-failure-reasons.md G1~G4). 진단 화면과 개발자 화면이 함께 쓴다.
 *
 * 부품은 값만 받는다 — 까닭·시각 문자열은 조립부가 `diagnostics-view.ts`의 `failureLines()`로 옮긴 것이다.
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react-native";

import { FailuresGroup } from "../../src/ui/FailuresGroup";

jest.setTimeout(30000);

describe.each(["diagnostics", "developer"] as const)("081 G1~G3 — idPrefix %s", (idPrefix) => {
  it("G1·G3 — 줄이 없으면 「아직 실패가 없어요」 한 줄", async () => {
    await render(<FailuresGroup failures={[]} idPrefix={idPrefix} />);
    const group = screen.getByTestId(`${idPrefix}-group-failures`);
    expect(within(group).getByText("최근 실패")).toBeTruthy();
    expect(
      within(screen.getByTestId(`${idPrefix}-failures-empty`)).getByText("아직 실패가 없어요"),
    ).toBeTruthy();
    expect(screen.queryByTestId(`${idPrefix}-failure-0`)).toBeNull();
  });

  it("G2 — 줄마다 까닭과 시각을 넘겨받은 순서대로 그린다", async () => {
    await render(
      <FailuresGroup
        failures={[
          { reasonText: "도중에 끊김", timeText: "10월 14일 09:05" },
          { reasonText: "지시문을 되뱉음", timeText: "10월 13일 22:07" },
        ]}
        idPrefix={idPrefix}
      />,
    );
    expect(screen.queryByTestId(`${idPrefix}-failures-empty`)).toBeNull();
    const first = screen.getByTestId(`${idPrefix}-failure-0`);
    expect(within(first).getByText("도중에 끊김")).toBeTruthy();
    expect(within(first).getByText("10월 14일 09:05")).toBeTruthy();
    const second = screen.getByTestId(`${idPrefix}-failure-1`);
    expect(within(second).getByText("지시문을 되뱉음")).toBeTruthy();
    expect(within(second).getByText("10월 13일 22:07")).toBeTruthy();
    expect(screen.queryByTestId(`${idPrefix}-failure-2`)).toBeNull();
  });
});

describe("081 G4 — 소스 계약", () => {
  const code = readFileSync(join(__dirname, "../../src/ui/FailuresGroup.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("기록 모듈·기기 통로에 닿지 않는다 — 줄만 받는다", () => {
    expect(code).not.toMatch(/write-failures/);
    expect(code).not.toMatch(/expo-file-system/);
  });

  it("한글 문자열 리터럴이 없다 — 문구는 카탈로그에서 온다", () => {
    expect(code.match(/["'`][^"'`\n]*[가-힣][^"'`\n]*["'`]/g) ?? []).toEqual([]);
  });
});

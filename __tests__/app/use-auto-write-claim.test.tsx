import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { useAutoWriteClaim } from "../../src/app/use-auto-write-claim";

/**
 * 082 — 앱 열기 자동 쓰기의 「한 번」.
 *
 * 계약: specs/082-auto-write-claim-handoff/contracts/auto-write-open.md CL1~CL7
 *       (057 OP1 · 064 AF3이 `App.tsx`에서 잠그던 것을 훅으로 옮겼다)
 *
 * 훅을 작은 시험용 컴포넌트에 올린다. 누를 때마다 돌려준 값을 `onResult`로 받는다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`·`rerender`는 Promise다 — await한다.
 */

type Props = {
  simulationLoaded: boolean;
  writeBlocked: boolean;
  firstRunTried: { readonly current: boolean };
  onResult: (value: unknown) => void;
};

function Harness({ onResult, ...deps }: Props) {
  const claim = useAutoWriteClaim(deps);
  return (
    <>
      <Pressable onPress={() => onResult(claim.claimAutoWrite())} testID="claim" />
      <Pressable onPress={() => onResult(claim.spendAutoWrite())} testID="spend" />
      <Pressable onPress={() => onResult(claim.rearmAutoWrite())} testID="rearm" />
      <Pressable onPress={() => onResult(claim)} testID="snapshot" />
      <Text testID="keys">{Object.keys(claim).sort().join(",")}</Text>
    </>
  );
}

const base = (over: Partial<Props> = {}): Props => ({
  simulationLoaded: true,
  writeBlocked: false,
  firstRunTried: { current: false },
  onResult: jest.fn(),
  ...over,
});

const results = (props: Props) => (props.onResult as jest.Mock).mock.calls.map(([v]) => v);
const claim = () => fireEvent.press(screen.getByTestId("claim"));
const spend = () => fireEvent.press(screen.getByTestId("spend"));
const rearm = () => fireEvent.press(screen.getByTestId("rearm"));
const snapshot = () => fireEvent.press(screen.getByTestId("snapshot"));

describe("CL1 — 흉내 기록을 읽기 전에는 판정하지 않는다", () => {
  it("읽기 전에는 거짓이고 소모하지 않는다 — 읽은 뒤에는 참이다", async () => {
    const props = base({ simulationLoaded: false });
    const view = await render(<Harness {...props} />);

    await claim();
    await claim();
    expect(results(props)).toEqual([false, false]);

    await view.rerender(<Harness {...props} simulationLoaded />);
    await claim();
    expect(results(props)).toEqual([false, false, true]);
  });
});

describe("CL2 — 첫 실행이 이기고, 한 실행에 한 번이다", () => {
  it("첫 실행 자동 첫 일기를 시도한 실행이면 거짓이다 (040)", async () => {
    const props = base({ firstRunTried: { current: true } });
    await render(<Harness {...props} />);
    await claim();
    expect(results(props)).toEqual([false]);
  });

  it("두 번째부터는 거짓이다 (057)", async () => {
    const props = base();
    await render(<Harness {...props} />);
    await claim();
    await claim();
    await claim();
    expect(results(props)).toEqual([true, false, false]);
  });
});

describe("CL3·CL4 — 흉내로 막힌 실행 (064 AF3)", () => {
  it("막혀 있으면 거짓이고, 흉내를 꺼도 같은 실행에서는 거짓이다", async () => {
    const props = base({ writeBlocked: true });
    const view = await render(<Harness {...props} />);
    await claim();
    await view.rerender(<Harness {...props} writeBlocked={false} />);
    await claim();
    expect(results(props)).toEqual([false, false]);
  });

  it("★ 막히는 것만으로 소모된다 — 막힌 동안 한 번도 묻지 않았어도", async () => {
    const props = base({ writeBlocked: true });
    const view = await render(<Harness {...props} />);
    await view.rerender(<Harness {...props} writeBlocked={false} />);
    await claim();
    expect(results(props)).toEqual([false]);
  });
});

describe("CL5 — 묻지 않고 소모한다 (082 — 일기 모두 지우기)", () => {
  it("★ 소모한 뒤에는 거짓이다", async () => {
    const props = base();
    await render(<Harness {...props} />);
    await spend();
    await claim();
    expect(results(props)).toEqual([undefined, false]);
  });

  it("흉내 기록을 읽기 전에 소모해도 남는다 — 읽은 뒤에도 거짓이다", async () => {
    const props = base({ simulationLoaded: false });
    const view = await render(<Harness {...props} />);
    await spend();
    await view.rerender(<Harness {...props} simulationLoaded />);
    await claim();
    expect(results(props)).toEqual([undefined, false]);
  });

  it("두 번 소모해도 같다", async () => {
    const props = base();
    await render(<Harness {...props} />);
    await spend();
    await spend();
    await claim();
    expect(results(props)).toEqual([undefined, undefined, false]);
  });
});

describe("CL6 — 소모를 되돌리는 길은 쓸 차례 알림의 rearm 하나다 (085 FR-023 예외, RA8)", () => {
  it("훅이 돌려주는 것은 셋이다", async () => {
    await render(<Harness {...base()} />);
    expect(screen.getByTestId("keys").props.children).toBe(
      "claimAutoWrite,rearmAutoWrite,spendAutoWrite",
    );
  });
});

describe("085 RA — 쓸 차례 알림을 누르면 한 번 더", () => {
  it("RA1 — 소모한 뒤 다시 열면 참이다", async () => {
    const props = base();
    await render(<Harness {...props} />);
    await claim();
    await claim();
    await rearm();
    await claim();
    expect(results(props)).toEqual([true, false, undefined, true]);
  });

  it("RA1 — 지우기로 소모한 뒤에도 다시 연다", async () => {
    const props = base();
    await render(<Harness {...props} />);
    await spend();
    await rearm();
    await claim();
    expect(results(props)).toEqual([undefined, undefined, true]);
  });

  it("RA2 — 다시 열면 claimAutoWrite의 정체가 바뀌고 rearmAutoWrite는 그대로다", async () => {
    const props = base();
    await render(<Harness {...props} />);
    await snapshot();
    await rearm();
    await snapshot();
    const [before, , after] = results(props) as {
      claimAutoWrite: unknown;
      rearmAutoWrite: unknown;
    }[];
    expect(after!.claimAutoWrite).not.toBe(before!.claimAutoWrite);
    expect(after!.rearmAutoWrite).toBe(before!.rearmAutoWrite);
  });

  it("RA3 — 첫 실행·흉내가 앞선다", async () => {
    const first = base({ firstRunTried: { current: true } });
    const view = await render(<Harness {...first} />);
    await rearm();
    await claim();
    expect(results(first)).toEqual([undefined, false]);

    const blocked = base({ writeBlocked: true });
    await view.rerender(<Harness {...blocked} />);
    await rearm();
    await claim();
    expect(results(blocked)).toEqual([undefined, false]);
  });

  it("RA4 — 누름 하나에 한 번이다", async () => {
    const props = base();
    await render(<Harness {...props} />);
    await claim();
    await rearm();
    await claim();
    await claim();
    expect(results(props)).toEqual([true, undefined, true, false]);
  });
});

describe("CL7 — 첫 실행 표식은 콜백 안에서만 읽는다 (React Compiler)", () => {
  it("firstRunTried.current를 읽는 자리가 claimAutoWrite 본문 하나다", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src/app/use-auto-write-claim.ts"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source.match(/firstRunTried\.current/g)).toHaveLength(1);
    const body = source.slice(source.indexOf("const claimAutoWrite = useCallback("));
    expect(body.slice(0, body.indexOf("}, ["))).toMatch(/firstRunTried\.current/);
  });
});

/**
 * 059 — 버전 탭 훅 (계약 DV2·DV10·DV12).
 *
 * 강조 1.5초·토스트 2초의 수명을 가짜 시계로 본다. ⚠️ RNTL 14의 `render`·`act`는 Promise다 — await한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { useDeveloperTaps } from "../../src/ui/use-developer-taps";
import { useToastLine } from "../../src/ui/use-toast-line";

jest.setTimeout(30000);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function Probe({ alreadyOn, onEnable }: { alreadyOn: boolean; onEnable: () => void }) {
  const line = useToastLine();
  const { onPressVersion, highlight } = useDeveloperTaps({
    alreadyOn,
    onEnable,
    showToast: line.show,
  });
  const { toast } = line;
  return (
    <>
      <Pressable onPress={onPressVersion} testID="tap" />
      <Text testID="toast">
        {toast === null ? "" : `${toast.key}|${toast.text}|${toast.sub ?? ""}`}
      </Text>
      <Text testID="highlight">{highlight ? "yes" : "no"}</Text>
    </>
  );
}

const toast = () => screen.getByTestId("toast").props.children as string;
const highlight = () => screen.getByTestId("highlight").props.children as string;

async function tap(times: number, gapMs = 200) {
  for (let i = 0; i < times; i += 1) {
    await fireEvent.press(screen.getByTestId("tap"));
    await act(async () => {
      jest.advanceTimersByTime(gapMs);
    });
  }
}

describe("DV12 — 켜기", () => {
  it("1~3번째는 토스트가 없고 4번째에 「3번 남았어요」", async () => {
    await render(<Probe alreadyOn={false} onEnable={jest.fn()} />);
    await tap(3);
    expect(toast()).toBe("");
    await tap(1);
    expect(toast()).toContain("개발자 메뉴까지 3번 남았어요");
  });

  it("7번째에 onEnable 한 번·켜짐 토스트(보조 줄 포함)·강조가 켜지고 1.5초 뒤 꺼진다", async () => {
    const onEnable = jest.fn();
    await render(<Probe alreadyOn={false} onEnable={onEnable} />);
    await tap(6);
    await tap(1, 0);
    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(toast()).toContain("개발자 메뉴가 켜졌어요|이 기기에서만");
    expect(highlight()).toBe("yes");
    await act(async () => {
      jest.advanceTimersByTime(1499);
    });
    expect(highlight()).toBe("yes");
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(highlight()).toBe("no");
  });

  it("alreadyOn 이면 7번째에 「이미 켜져 있어요」, onEnable 은 안 불리고 강조도 없다", async () => {
    const onEnable = jest.fn();
    await render(<Probe alreadyOn onEnable={onEnable} />);
    await tap(7, 0);
    expect(toast()).toContain("이미 켜져 있어요");
    expect(onEnable).not.toHaveBeenCalled();
    expect(highlight()).toBe("no");
  });
});

describe("DV10 — 토스트 수명", () => {
  it("새 토스트가 이전 것을 대신하고(key 증가) 2초 뒤 사라진다", async () => {
    await render(<Probe alreadyOn={false} onEnable={jest.fn()} />);
    await tap(4, 0);
    const first = toast();
    await tap(1, 0);
    const second = toast();
    expect(second).not.toBe(first);
    expect(Number(second.split("|")[0])).toBeGreaterThan(Number(first.split("|")[0]));
    await act(async () => {
      jest.advanceTimersByTime(1999);
    });
    expect(toast()).not.toBe("");
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(toast()).toBe("");
  });

  it("1초를 넘기면 횟수를 처음부터 센다", async () => {
    await render(<Probe alreadyOn={false} onEnable={jest.fn()} />);
    await tap(3, 1001);
    await tap(1, 0);
    expect(toast()).toBe("");
  });
});

describe("소스 계약", () => {
  it("Date.now() 는 핸들러 안에서만 부른다(렌더 중 호출 없음)", () => {
    const source = readFileSync(join(__dirname, "../../src/ui/use-developer-taps.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const calls = source.match(/Date\.now\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(source).toMatch(/const onPressVersion = useCallback\(\(\) => \{[\s\S]*Date\.now\(/);
  });
});

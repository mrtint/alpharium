/**
 * 059 — 개발자 메뉴 켜짐 훅 (계약 HK1~HK5).
 *
 * ⚠️ RNTL 14의 `render`·`act`는 Promise다 — await한다. 통로는 메모리 대역이다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import type { DeveloperMenuStorePort } from "../../src/app/developer-menu-store";
import { useDeveloperMenu } from "../../src/ui/use-developer-menu";

jest.setTimeout(30000);

function port(initial: string | null = null, fail = false) {
  let content = initial;
  const p: DeveloperMenuStorePort = {
    read: jest.fn(async () => {
      if (fail) throw new Error("io");
      return content;
    }),
    write: jest.fn(async (s: string) => {
      if (fail) throw new Error("io");
      content = s;
    }),
    remove: jest.fn(async () => {
      if (fail) throw new Error("io");
      content = null;
    }),
  };
  return p;
}

function Probe({
  devEnvironment,
  store,
}: {
  devEnvironment: boolean;
  store: DeveloperMenuStorePort;
}) {
  const { enabled, enable, disable } = useDeveloperMenu({ devEnvironment, port: store });
  return (
    <>
      <Text testID="state">{enabled ? "on" : "off"}</Text>
      <Pressable onPress={enable} testID="enable" />
      <Pressable onPress={disable} testID="disable" />
    </>
  );
}

const state = () => screen.getByTestId("state").props.children;

async function press(id: string) {
  await fireEvent.press(screen.getByTestId(id));
}

describe("HK1·HK2 — 개발 환경", () => {
  it("파일이 꺼짐이어도 켜짐이고 파일을 읽지 않는다", async () => {
    const store = port();
    await render(<Probe devEnvironment store={store} />);
    expect(state()).toBe("on");
    expect(store.read).not.toHaveBeenCalled();
  });

  it("disable 은 그 실행 동안만 끄고 파일을 건드리지 않으며 enable 이 다시 켠다", async () => {
    const store = port();
    await render(<Probe devEnvironment store={store} />);
    await press("disable");
    expect(state()).toBe("off");
    await press("enable");
    expect(state()).toBe("on");
    expect(store.read).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
  });
});

describe("HK3 — 배포 환경 읽기", () => {
  it("켜짐 파일이면 켜짐", async () => {
    await render(<Probe devEnvironment={false} store={port('{"enabled":true}')} />);
    expect(state()).toBe("on");
  });

  it("파일이 없거나 읽기 실패면 꺼짐", async () => {
    await render(<Probe devEnvironment={false} store={port(null, true)} />);
    expect(state()).toBe("off");
  });
});

describe("HK4 — 배포 환경 쓰기·지우기", () => {
  it("enable 은 파일을 쓴다", async () => {
    const ok = port();
    await render(<Probe devEnvironment={false} store={ok} />);
    await press("enable");
    expect(state()).toBe("on");
    expect(ok.write).toHaveBeenCalledWith('{"enabled":true}');
  });

  it("enable 쓰기가 던져도 켜짐으로 남는다", async () => {
    await render(<Probe devEnvironment={false} store={port(null, true)} />);
    await press("enable");
    expect(state()).toBe("on");
  });

  it("disable 은 파일을 지우고, 지우기가 던져도 꺼짐이다", async () => {
    const bad = port('{"enabled":true}');
    (bad.remove as jest.Mock).mockRejectedValueOnce(new Error("io"));
    await render(<Probe devEnvironment={false} store={bad} />);
    expect(state()).toBe("on");
    await press("disable");
    expect(state()).toBe("off");
    expect(bad.remove).toHaveBeenCalledTimes(1);
  });
});

describe("HK5 — 환경은 인자다", () => {
  it("소스가 currentEnvironment( · process.env 를 부르지 않는다", () => {
    const source = readFileSync(join(__dirname, "../../src/ui/use-developer-menu.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/currentEnvironment\(/);
    expect(source).not.toMatch(/process\.env/);
  });
});

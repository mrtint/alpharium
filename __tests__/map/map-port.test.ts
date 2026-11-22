/**
 * 126 — 지도 데이터 기기 통로 (contracts/day-map.md DM13, research R4). 기기 모듈은 대역을 넣는다
 * (`expo-asset`·`expo-file-system`의 지연 import는 실기기에서 확인한다 — 장소 파일 통로와 같은 경계).
 */
import { makeMapPort, type MapModules } from "../../src/map/map-port";

function fakeModules(over: { uri?: () => Promise<string> } = {}) {
  const calls = { localUri: 0, bytes: 0, modules: 0 };
  const File = class {
    bytesSync() {
      calls.bytes += 1;
      return new Uint8Array([1, 2, 3]);
    }
  } as unknown as MapModules["File"];
  const modules = async (): Promise<MapModules> => {
    calls.modules += 1;
    return {
      File,
      localUri: async () => {
        calls.localUri += 1;
        return over.uri ? over.uri() : "file:///map.bin";
      },
    };
  };
  return { calls, modules };
}

describe("126 makeMapPort", () => {
  it("준비 전에 load하면 던진다", () => {
    expect(() => makeMapPort(fakeModules().modules).load()).toThrow();
  });

  it("prepare는 여러 번 불러도 자산을 한 번만 받는다", async () => {
    const f = fakeModules();
    const port = makeMapPort(f.modules);
    await Promise.all([port.prepare(), port.prepare()]);
    await port.prepare();
    expect(f.calls.localUri).toBe(1);
    expect(f.calls.modules).toBe(1);
  });

  it("바이트는 프로세스 안에서 한 번만 읽는다(R4)", async () => {
    const f = fakeModules();
    const port = makeMapPort(f.modules);
    await port.prepare();
    const a = port.load();
    const b = port.load();
    expect(Array.from(a)).toEqual([1, 2, 3]);
    expect(b).toBe(a);
    expect(f.calls.bytes).toBe(1);
  });

  it("경로를 얻지 못하면 prepare가 던지고 다음에 다시 시도할 수 있다", async () => {
    let fail = true;
    const f = fakeModules({
      uri: async () => {
        if (fail) throw new Error("경로 없음");
        return "file:///map.bin";
      },
    });
    const port = makeMapPort(f.modules);
    await expect(port.prepare()).rejects.toThrow();
    expect(() => port.load()).toThrow();
    fail = false;
    await expect(port.prepare()).resolves.toBeUndefined();
    expect(() => port.load()).not.toThrow();
  });
});

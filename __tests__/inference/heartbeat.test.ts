/**
 * 092 CW7 — 박동 구독. 종류만 실리고, 그만 들을 수 있고, 듣는 쪽의 실패가 내는 쪽을 무너뜨리지 않는다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beat, onBeat, type Beat } from "../../src/inference/heartbeat";

describe("092 CW7 — heartbeat", () => {
  it("듣는 쪽 모두에게 종류를 넘기고, 그만 들으면 더 오지 않는다", () => {
    const a: Beat[] = [];
    const b: Beat[] = [];
    const offA = onBeat((kind) => a.push(kind));
    const offB = onBeat((kind) => b.push(kind));
    beat("photo");
    offA();
    beat("chunk");
    offB();
    beat("chunk");
    expect(a).toEqual(["photo"]);
    expect(b).toEqual(["photo", "chunk"]);
  });

  it("듣는 쪽이 던져도 다른 쪽은 듣고 beat는 던지지 않는다", () => {
    const got: Beat[] = [];
    const offBad = onBeat(() => {
      throw new Error("boom");
    });
    const off = onBeat((kind) => got.push(kind));
    expect(() => beat("chunk")).not.toThrow();
    expect(got).toEqual(["chunk"]);
    offBad();
    off();
  });

  it("FR-004 — 박동 타입은 종류 둘뿐이고 값을 더 싣지 않는다 (소스)", () => {
    const source = readFileSync(join(__dirname, "../../src/inference/heartbeat.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toMatch(/export type Beat = "photo" \| "chunk" \| "token";/);
    expect(source).toMatch(/export function beat\(kind: Beat\): void/);
  });
});

describe("092 CW7 — 조립부가 엔진에 박동을 넘긴다 (소스)", () => {
  const read = (rel: string) =>
    readFileSync(join(__dirname, "../..", rel), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it("on-device.ts: 조각은 chunk, 캡션 한 장은 photo", () => {
    const onDevice = read("src/inference/on-device.ts");
    expect(onDevice).toMatch(
      /llamaEngine\([\s\S]*?\(\) => beat\("chunk"\),\s*\(\) => beat\("token"\),\s*isAppActive,\s*\)/,
    );
    expect(onDevice).toMatch(/onCaptioned: \(\) => beat\("photo"\)/);
    expect(onDevice).toMatch(/\(\) => beat\("token"\)/);
  });

  it("사진 엔진은 inference를 import하지 않는다 — 박동은 옵션으로만 받는다", () => {
    expect(read("src/vision/vision-port.ts")).not.toMatch(/from "\.\.\/inference/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resizedFileNameFor } from "../../src/inference/on-device";
import { resizePhoto } from "../../src/vision/resize";
import type { ResizeExecutor, ResizeResult } from "../../src/vision/resize";

/**
 * 리사이즈 계약 테스트.
 *
 * 계약: specs/013-photo-resize-caption/contracts/resize.md 「규칙 C1~C4」
 *
 * **C4(방향 보존)는 여기서 검증하지 않는다.** 이 계약 자체가 이미지 내용을
 * 모르는 순수 함수라 방향을 알 방법이 없다 — 검증은 quickstart.md D6(실기기,
 * 세로 사진)의 몫이다.
 */

describe("C1 — 이미 작은 사진은 그대로 쓴다", () => {
  it("execute가 원본 경로를 그대로 담아 돌려주면 그것을 그대로 전달한다", async () => {
    const execute: ResizeExecutor = async (sourcePath) => ({ ok: true, path: sourcePath });

    const result = await resizePhoto("/photo/small.jpg", execute);

    expect(result).toEqual({ ok: true, path: "/photo/small.jpg" });
  });

  it("줄인 경우 execute가 돌려준 새 경로를 그대로 전달한다", async () => {
    const execute: ResizeExecutor = async () => ({
      ok: true,
      path: "/app-docs/vision-cache/abc.jpg",
    });

    const result = await resizePhoto("/photo/big.jpg", execute);

    expect(result).toEqual({ ok: true, path: "/app-docs/vision-cache/abc.jpg" });
  });
});

describe("C2 — 예외를 던지지 않는다 (FR-012)", () => {
  it("execute가 던지면 { ok: false }로 바뀐다", async () => {
    const execute: ResizeExecutor = async () => {
      throw new Error("리사이즈 실패");
    };

    const result = await resizePhoto("/photo/broken.jpg", execute);

    expect(result).toEqual({ ok: false });
  });

  it("execute가 값으로 실패를 돌려주면 그대로 전달한다", async () => {
    const execute: ResizeExecutor = async () => ({ ok: false });

    const result: ResizeResult = await resizePhoto("/photo/broken.jpg", execute);

    expect(result).toEqual({ ok: false });
  });
});

describe("C3 — 결과 타입에 지표를 담을 자리가 없다 (FR-015, 원칙 IV)", () => {
  /**
   * ★ 007·009의 교훈 — `npm test`는 타입을 지우므로 선언을 직접 읽어야 잡힌다.
   * 여기서 `ResizeResult`에 `elapsedMs`나 `width`를 몰래 추가해도 이 검사만이
   * 잡아낸다.
   */
  it("ResizeResult 선언에 path 외의 필드가 없다", () => {
    const source = readFileSync(join(__dirname, "../../src/vision/resize.ts"), "utf8");
    const match = source.match(/export type ResizeResult\s*=\s*(.+);/);

    expect(match).not.toBeNull();
    const declaration = match?.[1] ?? "";

    // ok: true 갈래의 필드가 ok·path 둘뿐인지 — 시간·크기 등 다른 필드가 없는지 본다
    expect(declaration).toContain("ok: true");
    expect(declaration).toContain("path: string");
    expect(declaration).not.toMatch(/elapsedMs|width|height|duration|size/i);
  });

  it("resizePhoto의 실제 반환값에도 path 외의 키가 없다", async () => {
    const execute: ResizeExecutor = async () => ({ ok: true, path: "/x.jpg" });
    const result = await resizePhoto("/photo/a.jpg", execute);

    expect(Object.keys(result)).toEqual(["ok", "path"]);
  });
});

describe("목표 크기는 export되지 않는다 (FR-002)", () => {
  it("resize.ts가 RESIZE_TARGET류의 상수를 export하지 않는다", () => {
    const source = readFileSync(join(__dirname, "../../src/vision/resize.ts"), "utf8");

    expect(source).not.toMatch(/export const RESIZE_TARGET/);
    expect(source).not.toMatch(/export .*maxLongEdge\s*[:=]\s*\d/);
  });
});

/**
 * 013 T018 — 파일명 결정론 (research.md R3, data-model.md 「이름 규칙」).
 *
 * **결정론이 곧 정리 실패 방어다** — 앱이 예기치 않게 끝나 못 지운 사본이 남아도,
 * 같은 사진을 다음에 또 읽으면 같은 이름을 덮어써 파일이 누적되지 않는다(FR-009).
 */
describe("resizedFileNameFor는 결정론적이다 (013 R3, FR-009)", () => {
  it("같은 sourcePath는 항상 같은 파일명을 준다", () => {
    const a = resizedFileNameFor("content://media/external/images/media/123");
    const b = resizedFileNameFor("content://media/external/images/media/123");

    expect(a).toBe(b);
  });

  it("다른 sourcePath는 다른 파일명을 준다", () => {
    const a = resizedFileNameFor("content://media/external/images/media/123");
    const b = resizedFileNameFor("content://media/external/images/media/456");

    expect(a).not.toBe(b);
  });

  it("파일 시스템에 못 쓰는 문자(/·:)가 이름에 남지 않는다", () => {
    const name = resizedFileNameFor("content://media/external/images/media/123");

    expect(name).not.toMatch(/[/:]/);
  });
});

describe("resizePhoto는 execute에게 목표를 넘긴다", () => {
  it("target.maxLongEdge가 양수로 전달된다", async () => {
    let received: number | undefined;
    const execute: ResizeExecutor = async (sourcePath, target) => {
      received = target.maxLongEdge;
      return { ok: true, path: sourcePath };
    };

    await resizePhoto("/photo/a.jpg", execute);

    expect(received).toBeGreaterThan(0);
  });
});

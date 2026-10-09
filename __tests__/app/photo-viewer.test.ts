/**
 * 067 — 사진 확대 화면의 판정 (contracts/photo-viewer.md ZV1~ZV11).
 *
 * 손맛(핀치·끌기)은 jest가 못 본다 — 여기서는 문턱·한계를 순수 함수로 잠그고, 움직임은 실기기(quickstart Q5~Q11)에서 본다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BACKDROP_MIN_OPACITY,
  backdropOpacity,
  clampOffset,
  DISMISS_DISTANCE,
  DISMISS_FADE_DISTANCE,
  DISMISS_VELOCITY,
  doubleTapScale,
  fittedSize,
  isTap,
  isZoomed,
  panLimit,
  pinchScale,
  settleScale,
  shouldDismiss,
  TAP_SLOP,
  ZOOM_DOUBLE_TAP,
  ZOOM_MAX,
  ZOOM_MIN_LIVE,
} from "../../src/app/photo-viewer";

describe("067 ZV — 사진 확대 화면 판정", () => {
  it("ZV1 — 사람이 정한 수치", () => {
    expect(ZOOM_MAX).toBe(4);
    expect(ZOOM_DOUBLE_TAP).toBe(2);
    expect(ZOOM_MIN_LIVE).toBe(0.6);
    expect(DISMISS_DISTANCE).toBe(120);
    expect(DISMISS_VELOCITY).toBe(800);
    expect(DISMISS_FADE_DISTANCE).toBe(300);
    expect(BACKDROP_MIN_OPACITY).toBe(0.2);
  });

  it("ZV2 — 핀치 중 배율은 0.6~4로 자른다", () => {
    expect(pinchScale(0.3)).toBe(0.6);
    expect(pinchScale(2.5)).toBe(2.5);
    expect(pinchScale(9)).toBe(4);
  });

  it("ZV3 — 놓으면 1 미만은 1, 4 초과는 4", () => {
    expect(settleScale(0.7)).toBe(1);
    expect(settleScale(1)).toBe(1);
    expect(settleScale(1.005)).toBe(1); // 확대됨이 아니면 정확히 1 (FR-012)
    expect(settleScale(3)).toBe(3);
    expect(settleScale(5)).toBe(4);
  });

  it("ZV4 — 두 번 탭: 배율 1이면 2, 확대됐으면 1", () => {
    expect(doubleTapScale(1)).toBe(2);
    expect(doubleTapScale(1.005)).toBe(2);
    expect(doubleTapScale(1.5)).toBe(1);
    expect(doubleTapScale(4)).toBe(1);
  });

  it("ZV5 — 확대됐는가는 부동소수 여유 0.01을 둔다", () => {
    expect(isZoomed(1)).toBe(false);
    expect(isZoomed(1.005)).toBe(false);
    expect(isZoomed(1.02)).toBe(true);
  });

  it("ZV6 — 아래로 120 이상 또는 아래 방향 속도 800 이상이면 닫는다, 위로는 닫지 않는다", () => {
    expect(shouldDismiss(120, 0)).toBe(true);
    expect(shouldDismiss(119, 0)).toBe(false);
    expect(shouldDismiss(30, 800)).toBe(true);
    expect(shouldDismiss(30, 799)).toBe(false);
    expect(shouldDismiss(-50, 900)).toBe(false);
    expect(shouldDismiss(0, 900)).toBe(false);
  });

  it("ZV7 — 끈 거리에 따라 배경이 선형으로 옅어지고 0.2에서 멈춘다", () => {
    expect(backdropOpacity(-20)).toBe(1);
    expect(backdropOpacity(0)).toBe(1);
    expect(backdropOpacity(150)).toBeCloseTo(0.6);
    expect(backdropOpacity(300)).toBeCloseTo(0.2);
    expect(backdropOpacity(600)).toBeCloseTo(0.2);
  });

  it("ZV8 — 화면 상자에 원래 비율로 맞춘(contain) 크기", () => {
    expect(fittedSize({ width: 1024, height: 768 }, { width: 360, height: 800 })).toEqual({
      width: 360,
      height: 270,
    });
    expect(fittedSize({ width: 768, height: 1024 }, { width: 360, height: 400 })).toEqual({
      width: 300,
      height: 400,
    });
    expect(fittedSize({ width: 0, height: 768 }, { width: 360, height: 800 })).toBeUndefined();
    expect(fittedSize({ width: 1024, height: 768 }, { width: 360, height: 0 })).toBeUndefined();
  });

  it("ZV9 — 이동 한계: 확대된 사진이 상자보다 넘친 만큼의 절반, 넘치지 않으면 0", () => {
    const fitted = { width: 360, height: 270 };
    const box = { width: 360, height: 800 };
    expect(panLimit(fitted, box, 2)).toEqual({ x: 180, y: 0 });
    expect(panLimit(fitted, box, 1)).toEqual({ x: 0, y: 0 });
    expect(panLimit(undefined, box, 3)).toEqual({ x: 0, y: 0 });
  });

  it("ZV10 — 위치는 양쪽으로 한계 안에 자른다", () => {
    expect(clampOffset(250, 180)).toBe(180);
    expect(clampOffset(-250, 180)).toBe(-180);
    expect(clampOffset(50, 180)).toBe(50);
    expect(clampOffset(10, 0)).toBe(0);
  });

  it("★ ZV12 — 누름은 손가락이 10 안에서 떨어졌을 때만이다 (실기기: 사진 한 장을 가로로 쓸면 확대 화면이 열렸다)", () => {
    expect(TAP_SLOP).toBe(10);
    expect(isTap({ x: 100, y: 100 }, { x: 106, y: 108 })).toBe(true);
    expect(isTap({ x: 100, y: 100 }, { x: 111, y: 100 })).toBe(false);
    expect(isTap({ x: 800, y: 1300 }, { x: 300, y: 1300 })).toBe(false);
    expect(isTap({ x: 100, y: 100 }, { x: 100, y: 89 })).toBe(false);
    expect(isTap(undefined, { x: 1, y: 1 })).toBe(true); // 시작을 못 받았으면 막지 않는다
    expect(isTap({ x: 1, y: 1 }, { x: Number.NaN, y: 1 })).toBe(true);
  });

  it("ZV11 — 판정 모듈은 화면 계층·react-native에 닿지 않는다", () => {
    const source = readFileSync(join(__dirname, "../../src/app/photo-viewer.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/from\s+["'][^"']*\/ui\//);
    expect(source).not.toMatch(/from\s+["']react-native["']/);
  });
});

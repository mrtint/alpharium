/**
 * 129 — 카메라 사진 판정 (contracts/camera-only.md CO1~CO6)
 */
import { allowsSeedPhotos, isCameraPhoto } from "../../src/signals/camera-only";
import type { PhotoFacts } from "../../src/signals/port";

const base: PhotoFacts = { id: "1", takenAtMs: 1 };
const android = (localPath: string, extra: Partial<PhotoFacts> = {}): PhotoFacts => ({
  ...base,
  localPath,
  ...extra,
});
const ios = (mediaSubtypes: string[], extra: Partial<PhotoFacts> = {}): PhotoFacts => ({
  ...base,
  mediaSubtypes,
  ...extra,
});
const noSeed = { allowSeed: false };
const seed = { allowSeed: true };

describe("CO3 안드로이드 경로", () => {
  it.each([
    ["/storage/emulated/0/DCIM/Camera/IMG_1.jpg", true],
    ["/storage/emulated/0/DCIM/OpenCamera/IMG_1.jpg", true],
    ["/storage/emulated/0/DCIM/IMG_1.jpg", true],
    ["/storage/1234-ABCD/DCIM/Camera/IMG_1.jpg", true],
    ["/sdcard/DCIM/Camera/IMG_1.jpg", true],
    ["/storage/self/primary/DCIM/Camera/IMG_1.jpg", true],
    ["/storage/emulated/10/DCIM/Camera/IMG_1.jpg", true],
    ["/storage/self/primary/Download/a.jpg", false],
    ["/storage/emulated/0/dcim/camera/IMG_1.jpg", true],
    ["/storage/emulated/0/DCIM/Screenshots/a.jpg", false],
    ["/storage/emulated/0/DCIM/Screen recordings/a.jpg", false],
    ["/storage/emulated/0/DCIM/ScreenRecorder/a.jpg", false],
    ["/storage/emulated/0/Download/a.jpg", false],
    ["/storage/emulated/0/Download/Quick Share/a.jpg", false],
    ["/storage/emulated/0/Pictures/KakaoTalk/a.jpg", false],
    ["/storage/emulated/0/Pictures/Screenshots/a.jpg", false],
    ["/storage/emulated/0/Pictures/PocketlogSeed/a.jpg", false],
    ["/storage/emulated/0/PictureDCIM/a.jpg", false],
    ["DCIM/Camera/a.jpg", false],
    ["", false],
  ])("%s → %s", (path, expected) => {
    expect(isCameraPhoto(android(path), noSeed)).toBe(expected);
  });

  it("시딩 폴더는 allowSeed일 때만 카메라다", () => {
    const p = android("/storage/emulated/0/Pictures/PocketlogSeed/s30-a.jpg");
    expect(isCameraPhoto(p, seed)).toBe(true);
    expect(isCameraPhoto(p, noSeed)).toBe(false);
    expect(isCameraPhoto(android("/storage/emulated/0/Download/a.jpg"), seed)).toBe(false);
    // 시딩 트리 안의 흉내 폴더
    expect(
      isCameraPhoto(android("/storage/emulated/0/Pictures/PocketlogSeed/Camera/a.jpg"), seed),
    ).toBe(true);
    expect(
      isCameraPhoto(android("/storage/emulated/0/Pictures/PocketlogSeed/Screenshots/a.jpg"), seed),
    ).toBe(false);
    expect(
      isCameraPhoto(android("/storage/emulated/0/Pictures/PocketlogSeed/Download/a.jpg"), seed),
    ).toBe(false);
  });

  it("경로가 있으면 종류는 보지 않는다", () => {
    expect(
      isCameraPhoto(android("/storage/emulated/0/Download/a.jpg", { mediaSubtypes: [] }), noSeed),
    ).toBe(false);
  });
});

describe("CO4 iOS 종류", () => {
  it("스크린샷은 뺀다", () => {
    expect(isCameraPhoto(ios(["screenshot"]), noSeed)).toBe(false);
  });
  it("그 밖은 카메라다", () => {
    expect(isCameraPhoto(ios([]), noSeed)).toBe(true);
    expect(isCameraPhoto(ios(["livePhoto", "hdr"]), noSeed)).toBe(true);
  });
});

describe("CO2 이름·비율", () => {
  it("이름이 screenshot으로 시작하면 뺀다(대소문자 무시)", () => {
    expect(isCameraPhoto(ios([], { filename: "Screenshot_2026.png" }), noSeed)).toBe(false);
    expect(
      isCameraPhoto(
        android("/sdcard/DCIM/Camera/screenshot1.jpg", { filename: "screenshot1.jpg" }),
        noSeed,
      ),
    ).toBe(false);
  });
  it("세로/가로 ≥ 2면 뺀다", () => {
    expect(isCameraPhoto(ios([], { width: 1170, height: 2532 }), noSeed)).toBe(false);
    expect(isCameraPhoto(ios([], { width: 1000, height: 2000 }), noSeed)).toBe(false);
  });
  it("카메라 비율·가로 파노라마·크기 모름은 남긴다", () => {
    expect(isCameraPhoto(ios([], { width: 3024, height: 4032 }), noSeed)).toBe(true);
    expect(isCameraPhoto(ios([], { width: 8000, height: 2000 }), noSeed)).toBe(true);
    expect(isCameraPhoto(ios([], { height: 4000 }), noSeed)).toBe(true);
    expect(isCameraPhoto(ios([], { filename: "MyScreenshot.jpg" }), noSeed)).toBe(true);
    expect(isCameraPhoto(ios([], { width: 0, height: 3000 }), noSeed)).toBe(true);
  });
});

describe("CO5 출처 모름", () => {
  it("경로도 종류도 없으면 뺀다", () => {
    expect(isCameraPhoto(base, noSeed)).toBe(false);
    expect(isCameraPhoto(base, seed)).toBe(false);
  });
});

describe("CO6 allowsSeedPhotos", () => {
  it("판정에 성공한 local·dev만 참", () => {
    expect(allowsSeedPhotos({ ok: true, environment: "local" })).toBe(true);
    expect(allowsSeedPhotos({ ok: true, environment: "dev" })).toBe(true);
    expect(allowsSeedPhotos({ ok: true, environment: "prod" })).toBe(false);
    expect(allowsSeedPhotos({ ok: false, reason: "missing", received: undefined } as never)).toBe(
      false,
    );
  });
});

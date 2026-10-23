/**
 * 102 — 스토어 등록 에셋(스크린샷·기능 그래픽·스토어 아이콘)의 개수와 치수. 계약: specs/102-app-icon-store-assets/contracts/store-assets.md (S4·S5)
 *
 * 규격은 두 콘솔 요건에 대한 짐작이다(제출 시점에 대조해 `device-check.md`에 적는다, S9).
 * 치수는 PNG 헤더(IHDR)에서 읽는다 — 이미지를 해석하지 않는다.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

import { cropToHeight, pngColorType, toRgbPng } from "../../scripts/store/screenshot-prep";

const ROOT = join(__dirname, "../..");
const STORE = join(ROOT, "store", "ko");

/** PNG 시그니처 뒤 IHDR의 너비·높이(큰바이트순서) */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  const signature = buf.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error(`${path} 는 PNG가 아니다`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const pngs = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".png"))
        .sort()
    : [];

/** 스크린샷 파일명 규칙: `NN-장면.png` — 모델 식별자 금지(원칙 III) */
const NAME = /^\d{2}-[a-z0-9-]+\.png$/;
const MODEL_IDENTIFIER = /kanana|lfm|llama|ggml|gguf|mmproj|qwen|gemma/i;

describe("102 스토어 에셋", () => {
  it("S5: 스토어 아이콘 512×512, 기능 그래픽 1024×500", () => {
    expect(pngSize(join(STORE, "store-icon-512.png"))).toEqual({ width: 512, height: 512 });
    expect(pngSize(join(STORE, "feature-graphic-1024x500.png"))).toEqual({
      width: 1024,
      height: 500,
    });
  });

  it("S4: App Store iPhone 스크린샷은 1284×2778 정확히 5장이다", () => {
    const dir = join(STORE, "screenshots", "ios-6.5");
    const files = pngs(dir);
    expect(files).toHaveLength(5);
    for (const f of files) {
      expect({ f, size: pngSize(join(dir, f)) }).toEqual({
        f,
        size: { width: 1284, height: 2778 },
      });
    }
  });

  it("S4: Play 휴대폰 스크린샷은 4장 이상이고 각 변 320~3840px, 긴 변이 짧은 변의 2배 이하다", () => {
    const dir = join(STORE, "screenshots", "play-phone");
    const files = pngs(dir);
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) {
      const { width, height } = pngSize(join(dir, f));
      const [short, long] = width < height ? [width, height] : [height, width];
      expect({ f, ok: short >= 320 && long <= 3840 && long <= short * 2 }).toEqual({ f, ok: true });
    }
  });

  it("S4: 스크린샷·기능 그래픽은 알파 채널이 없다(App Store·Play 모두 허용하지 않는다)", () => {
    const files = [
      join(STORE, "feature-graphic-1024x500.png"),
      ...["ios-6.5", "play-phone"].flatMap((sub) =>
        pngs(join(STORE, "screenshots", sub)).map((f) => join(STORE, "screenshots", sub, f)),
      ),
    ];
    for (const path of files) {
      expect({ path, colorType: pngColorType(readFileSync(path)) }).toEqual({ path, colorType: 2 });
    }
  });

  it("S3: 스크린샷 파일명이 규칙을 따르고 모델 식별자가 없다", () => {
    for (const sub of ["ios-6.5", "play-phone"]) {
      for (const f of pngs(join(STORE, "screenshots", sub))) {
        expect({ f, ok: NAME.test(f) && !MODEL_IDENTIFIER.test(f) }).toEqual({ f, ok: true });
      }
    }
  });
});

describe("102 스토어 에셋 — 위반 주입 (S8)", () => {
  it("치수가 다르면 PNG 헤더 검사가 잡는다", () => {
    const header = Buffer.alloc(24);
    Buffer.from("89504e470d0a1a0a", "hex").copy(header);
    header.writeUInt32BE(1284, 16);
    header.writeUInt32BE(2777, 20); // 한 줄 모자람
    expect({ width: header.readUInt32BE(16), height: header.readUInt32BE(20) }).not.toEqual({
      width: 1284,
      height: 2778,
    });
  });

  it("모델 식별자가 든 파일명은 이름 검사가 잡는다", () => {
    expect(MODEL_IDENTIFIER.test("01-llama-home.png")).toBe(true);
    expect(NAME.test("01-home.png")).toBe(true);
    expect(NAME.test("home.png")).toBe(false);
  });
});

describe("102 스크린샷 후처리 코어", () => {
  const rgba = (alpha: number) => {
    const png = new PNG({ width: 2, height: 2 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 10;
      png.data[i + 1] = 20;
      png.data[i + 2] = 30;
      png.data[i + 3] = alpha;
    }
    return PNG.sync.write(png, { colorType: 6, inputColorType: 6 });
  };

  it("불투명 RGBA는 RGB(색 유형 2)로 바뀌고 색은 그대로다", () => {
    const out = toRgbPng(rgba(255));
    expect(pngColorType(out)).toBe(2);
    const back = PNG.sync.read(out);
    expect([back.data[0], back.data[1], back.data[2]]).toEqual([10, 20, 30]);
  });

  it("투명한 픽셀이 있으면 실패한다 — 위반 주입", () => {
    expect(() => toRgbPng(rgba(254))).toThrow(/투명/);
  });
});

describe("102 스크린샷 자르기 코어", () => {
  const sample = (height: number) => {
    const png = new PNG({ width: 2, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < 2; x++) {
        const i = (y * 2 + x) * 4;
        png.data[i] = y;
        png.data[i + 3] = 255;
      }
    }
    return PNG.sync.write(png, { colorType: 6, inputColorType: 6 });
  };

  it("위에서부터 정한 높이만 남기고 위쪽 줄은 그대로다", () => {
    const out = PNG.sync.read(cropToHeight(sample(6), 4));
    expect([out.width, out.height]).toEqual([2, 4]);
    expect([out.data[0], out.data[3 * 2 * 4]]).toEqual([0, 3]);
  });

  it("이미 낮으면 그대로 둔다", () => {
    const input = sample(3);
    expect(cropToHeight(input, 4)).toBe(input);
  });
});

/**
 * 117 — 앱 아이콘 정본(그림 `design/icon-art.svg` + 배치 값 `design/icon.json`)과 생성물.
 * 계약: specs/117-sunset-p-icon/contracts/icon-source.md (102의 계약을 대체한다)
 *
 * 생성물이 정본과 어긋나거나(손으로 고친 PNG) 규칙을 어기면(알파·안전 영역·경로·그림 밖 16진수) 실패한다.
 * PNG 인코딩 바이트는 zlib 버전에 따라 달라질 수 있어 픽셀로 비교한다.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

import {
  buildOutputs,
  opaqueBbox,
  parseArt,
  PIXEL_TOLERANCE,
  requireOpaque,
  samePixels,
  type IconOutput,
  type IconSource,
} from "../../scripts/design/icon-build";
import { clone, readText, ROOT } from "./helpers";

const ICON_JSON = join(ROOT, "design", "icon.json");
const src = JSON.parse(readText(ICON_JSON)) as IconSource;
const ART_PATH = join(ROOT, src.art.file);
const artSvg = readText(ART_PATH);
const outputs = buildOutputs(src, artSvg);

/** 주석을 걷어낸 소스에서 #rrggbb 꼴 16진수 리터럴 */
const stripComments = (text: string) =>
  text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
const hexLiterals = (text: string) => stripComments(text).match(/#[0-9a-fA-F]{6}\b/g) ?? [];

/** PNG 파일을 읽는다 — 색 유형은 IHDR 바이트 25에 있다 */
function readPng(rel: string) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) throw new Error(`${rel} 가 없다`);
  const buf = readFileSync(path);
  const png = PNG.sync.read(buf);
  return { buf, png, colorType: buf[25] };
}

const pngOutputs = outputs.filter(
  (o): o is Extract<IconOutput, { kind: "png" }> => o.kind === "png",
);
const byPath = (path: string) => {
  const found = pngOutputs.find((o) => o.path === path);
  if (!found) throw new Error(`${path} 가 생성 목록에 없다`);
  return found;
};

/** 캔버스 가운데에서 알파가 0이 아닌 픽셀까지의 가장 먼 거리 */
function maxRadius(rgba: Uint8Array, width: number, height: number): number {
  let max = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue;
      max = Math.max(max, Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2));
    }
  }
  return max;
}

const alphaAt = (out: { rgba: Uint8Array; width: number }, x: number, y: number) =>
  out.rgba[(Math.round(y) * out.width + Math.round(x)) * 4 + 3];

/** 그림 좌표 (ax, ay)가 캔버스 중앙 기준 배율 s로 놓인 자리 */
const place = (ax: number, ay: number, s: number, size = 1024) => ({
  x: size / 2 + (ax - src.art.center.x) * s,
  y: size / 2 + (ay - src.art.center.y) * s,
});

describe("117 아이콘 — 정본", () => {
  it("C1: icon.json(v2)은 배치 값만 있고 16진수·색 필드가 없다", () => {
    const raw = readText(ICON_JSON);
    expect(hexLiterals(raw)).toEqual([]);
    expect(src.version).toBe(2);
    expect(src.art.file).toBe("design/icon-art.svg");
    expect(Object.keys(src).sort()).toEqual(["art", "note", "safeZone", "scale", "version"]);
    expect(src.scale.ios).toBe(1.0);
    expect(src.scale.androidForeground).toBe(0.784);
    expect(src.scale.featureGraphic).toBe(0.5);
  });

  it("C3: 16진수 색은 design/icon-art.svg에만 있다(icon.json·생성기·실행기에는 없다)", () => {
    expect(hexLiterals(artSvg).length).toBeGreaterThan(10);
    for (const rel of [
      "design/icon.json",
      "scripts/design/icon-build.ts",
      "scripts/design/build-icons.mts",
    ]) {
      expect({ rel, hex: hexLiterals(readText(join(ROOT, rel))) }).toEqual({ rel, hex: [] });
    }
  });

  it("C4: 그림에 필요한 id가 있고 마침표는 기둥 옆 (508, 875)이다(A안)", () => {
    const art = parseArt(artSvg);
    expect(art.dotShape).toMatch(/cx="508"/);
    expect(art.dotShape).toMatch(/cy="875"/);
    expect(art.pShape).toMatch(/^<path /);
    expect(art.defs).toMatch(/id="p-shape"/);
  });

  it("C4: 없는 id를 가리키면 아무것도 만들지 않고 실패한다", () => {
    for (const id of ["art", "p-shape", "dot-shape"]) {
      const broken = artSvg.replaceAll(`id="${id}"`, `id="x-${id}"`);
      expect(() => buildOutputs(src, broken)).toThrow(new RegExp(`${id} 가 없다`));
    }
  });
});

describe("117 아이콘 — 생성물", () => {
  it("C5: 생성 목록의 모든 PNG가 파일과 픽셀까지 같다(손으로 고친 PNG는 실패)", () => {
    expect(pngOutputs.length).toBe(7);
    for (const out of pngOutputs) {
      const { png, colorType } = readPng(out.path);
      expect({ path: out.path, colorType }).toEqual({ path: out.path, colorType: out.colorType });
      expect({ path: out.path, w: png.width, h: png.height }).toEqual({
        path: out.path,
        w: out.width,
        h: out.height,
      });
      expect({ path: out.path, same: samePixels(png.data, out.rgba) }).toEqual({
        path: out.path,
        same: true,
      });
    }
  });

  it("C5: 같은 정본으로 두 번 만들면 같다(결정적)", () => {
    const again = buildOutputs(src, artSvg);
    expect(again.length).toBe(outputs.length);
    for (const [i, out] of outputs.entries()) {
      const other = again[i];
      if (out.kind === "png" && other.kind === "png") {
        expect({ path: out.path, same: Buffer.compare(out.rgba, other.rgba) === 0 }).toEqual({
          path: out.path,
          same: true,
        });
      } else {
        expect(other).toEqual(out);
      }
    }
  });

  it("미리보기 SVG도 정본에서 나온 그대로다", () => {
    const svg = outputs.find((o) => o.kind === "text");
    expect(svg?.path).toBe("design/icon.svg");
    expect(readText(join(ROOT, "design", "icon.svg"))).toBe((svg as { text: string }).text);
  });

  it("C6: iOS 아이콘은 1024²이고 알파 채널이 없다(PNG 색 유형 RGB, 모든 픽셀 불투명)", () => {
    const { png, colorType } = readPng("assets/icon.png");
    expect([png.width, png.height]).toEqual([1024, 1024]);
    expect(colorType).toBe(2);
    for (let i = 3; i < png.data.length; i += 4) {
      if (png.data[i] !== 255) throw new Error(`픽셀 ${(i - 3) / 4}의 알파가 ${png.data[i]}`);
    }
  });

  it("C8: 크기 — 스토어 아이콘 512²(Play는 32비트 PNG, RGBA)·favicon 48²·기능 그래픽 1024×500(Play는 24비트 PNG, 알파 없음)", () => {
    const store = readPng("store/ko/store-icon-512.png");
    expect([store.png.width, store.png.height, store.colorType]).toEqual([512, 512, 6]);
    const fav = readPng("assets/favicon.png");
    expect([fav.png.width, fav.png.height]).toEqual([48, 48]);
    const feature = readPng("store/ko/feature-graphic-1024x500.png");
    expect([feature.png.width, feature.png.height, feature.colorType]).toEqual([1024, 500, 2]);
  });

  it("C7: foreground는 안전 영역(정사각형 66/108과 그 안의 원) 안에 앉고 비어 있지 않다", () => {
    const { png } = readPng("assets/android-icon-foreground.png");
    const box = opaqueBbox(png.data, png.width, png.height);
    expect(box).not.toBeNull();
    const margin = (png.width * (1 - src.safeZone.numerator / src.safeZone.denominator)) / 2;
    expect(box!.minX).toBeGreaterThanOrEqual(margin);
    expect(box!.minY).toBeGreaterThanOrEqual(margin);
    expect(box!.maxX).toBeLessThanOrEqual(png.width - margin);
    expect(box!.maxY).toBeLessThanOrEqual(png.height - margin);
    const safeRadius = (png.width * src.safeZone.numerator) / src.safeZone.denominator / 2;
    expect(maxRadius(png.data, png.width, png.height)).toBeLessThanOrEqual(safeRadius);
  });

  it("C7: monochrome은 투명 바탕에 P 윤곽과 마침표만 한 색(검정)으로 있고 안전 영역 안이다", () => {
    const out = byPath("assets/android-icon-monochrome.png");
    const box = opaqueBbox(out.rgba, out.width, out.height);
    expect(box).not.toBeNull();
    const margin = (out.width * (1 - src.safeZone.numerator / src.safeZone.denominator)) / 2;
    expect(box!.minX).toBeGreaterThanOrEqual(margin);
    expect(box!.maxX).toBeLessThanOrEqual(out.width - margin);
    const safeRadius = (out.width * src.safeZone.numerator) / src.safeZone.denominator / 2;
    expect(maxRadius(out.rgba, out.width, out.height)).toBeLessThanOrEqual(safeRadius);
    const s = src.scale.androidForeground;
    const stem = place(344, 600, s);
    const dot = place(508, 875, s);
    expect(alphaAt(out, stem.x, stem.y)).toBe(255); // P 기둥
    expect(alphaAt(out, dot.x, dot.y)).toBe(255); // 마침표
    expect(alphaAt(out, 5, 5)).toBe(0); // 바탕은 투명
    for (let i = 0; i < out.rgba.length; i += 4) {
      if (out.rgba[i + 3] !== 0 && (out.rgba[i] | out.rgba[i + 1] | out.rgba[i + 2]) !== 0) {
        throw new Error(`monochrome 픽셀 ${i / 4}가 검정이 아니다`);
      }
    }
  });

  it("안드로이드 background는 배경 그라데이션이고 app.json의 adaptive 배경색은 그 첫 정지점이다(C9)", () => {
    const { png } = readPng("assets/android-icon-background.png");
    const first = /<linearGradient id="bg"[^>]*><stop stop-color="(#[0-9a-fA-F]{6})"/.exec(artSvg);
    expect(first).not.toBeNull();
    const hex = first![1].toLowerCase();
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let c = 0; c < 3; c++) expect(Math.abs(png.data[c] - rgb[c])).toBeLessThanOrEqual(2);
    const app = JSON.parse(readText(join(ROOT, "app.json"))) as {
      expo: { android: { adaptiveIcon: { backgroundColor: string } } };
    };
    expect(app.expo.android.adaptiveIcon.backgroundColor.toLowerCase()).toBe(hex);
  });

  it("C9: app.json이 가리키는 아이콘 경로가 모두 실재하고 생성 목록에 있다", () => {
    const app = JSON.parse(readText(join(ROOT, "app.json"))) as {
      expo: {
        icon: string;
        android: { adaptiveIcon: Record<string, string> };
        web: { favicon: string };
      };
    };
    const a = app.expo.android.adaptiveIcon;
    const paths = [
      app.expo.icon,
      a.foregroundImage,
      a.backgroundImage,
      a.monochromeImage,
      app.expo.web.favicon,
    ];
    for (const p of paths) {
      const rel = p.replace(/^\.\//, "");
      expect({ rel, exists: existsSync(join(ROOT, rel)) }).toEqual({ rel, exists: true });
      expect(() => byPath(rel)).not.toThrow();
    }
  });

  it("I7: iPhone 전용(ios.supportsTablet false)", () => {
    const app = JSON.parse(readText(join(ROOT, "app.json"))) as {
      expo: { ios: { supportsTablet: boolean } };
    };
    expect(app.expo.ios.supportsTablet).toBe(false);
  });
});

describe("117 아이콘 — 위반 주입 (C10)", () => {
  it("foreground 마크를 크게 키우면(배율 1.5) 안전 영역을 넘어 잡힌다", () => {
    const big = clone(src);
    big.scale.androidForeground = 1.5;
    const out = buildOutputs(big, artSvg).find(
      (o) => o.path === "assets/android-icon-foreground.png",
    );
    if (!out || out.kind !== "png") throw new Error("foreground 없음");
    const safeRadius = (out.width * src.safeZone.numerator) / src.safeZone.denominator / 2;
    expect(maxRadius(out.rgba, out.width, out.height)).toBeGreaterThan(safeRadius);
  });

  it("생성 픽셀 한 개를 바꾸면 파일과 달라진다(비교가 실제로 잡는다)", () => {
    const out = byPath("assets/icon.png");
    const { png } = readPng(out.path);
    expect(samePixels(png.data, out.rgba)).toBe(true);
    const tampered = Buffer.from(out.rgba);
    tampered[0] = tampered[0] < 128 ? tampered[0] + PIXEL_TOLERANCE + 100 : tampered[0] - 100;
    expect(samePixels(png.data, tampered)).toBe(false);
  });

  it("알파가 255가 아닌 픽셀이 있으면 생성기의 알파 검사가 실패한다", () => {
    const out = byPath("assets/icon.png");
    expect(() => requireOpaque(out.path, out.rgba)).not.toThrow();
    const data = new Uint8Array(out.rgba);
    data[3] = 254;
    expect(() => requireOpaque(out.path, data)).toThrow(/알파/);
  });

  it("배경이 투명해지는 그림이면 불투명 출력을 만들 때 실패한다", () => {
    const hole = artSvg.replace(/<linearGradient id="bg"[^>]*>.*<\/linearGradient>/, (m) =>
      m.replaceAll("<stop ", '<stop stop-opacity="0" '),
    );
    expect(hole).not.toBe(artSvg);
    expect(() => buildOutputs(src, hole)).toThrow(/알파/);
  });

  it("그림 파일 밖(icon.json·생성기)에 16진수가 생기면 검사가 잡는다", () => {
    expect(hexLiterals(readText(ICON_JSON) + '\n  "x": "#ec3013"')).toEqual(["#ec3013"]);
    expect(hexLiterals('const a = "#ec3013"; // #ffffff 주석은 제외')).toEqual(["#ec3013"]);
  });
});

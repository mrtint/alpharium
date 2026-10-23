/**
 * 102 — 앱 아이콘 정본(`design/icon.json`)과 생성물. 계약: specs/102-app-icon-store-assets/contracts/icon-source.md
 *
 * 생성물이 정본과 어긋나거나(손으로 고친 PNG) 규칙을 어기면(알파·안전 영역·경로) 실패한다.
 * PNG 인코딩 바이트는 zlib 버전에 따라 달라질 수 있어 픽셀로 비교한다.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

import {
  buildOutputs,
  opaqueBbox,
  resolveColors,
  type IconOutput,
  type IconSource,
} from "../../scripts/design/icon-build";
import { clone, loadTokens, readText, ROOT } from "./helpers";

const ICON_JSON = join(ROOT, "design", "icon.json");
const src = JSON.parse(readText(ICON_JSON)) as IconSource;
const tokens = loadTokens();
const outputs = buildOutputs(src, tokens);

const hex = (rgb: readonly number[]) =>
  "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

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

describe("102 아이콘 — 정본", () => {
  it("I1: 색은 토큰 역할 이름으로만 가리키고 16진수를 적지 않는다", () => {
    const raw = readText(ICON_JSON);
    expect(raw).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src.colors).toEqual({ background: "accent", mark: "accentForeground" });
    const rgb = resolveColors(src, tokens);
    expect(hex(rgb.background)).toBe(tokens.color.items.accent.light);
    expect(hex(rgb.mark)).toBe(tokens.color.items.accentForeground.light);
  });

  it("정본이 없는 토큰 이름을 가리키면 아무것도 만들지 않고 실패한다", () => {
    const bad = clone(src);
    bad.colors.background = "nope";
    expect(() => buildOutputs(bad, tokens)).toThrow(/nope/);
  });
});

describe("102 아이콘 — 생성물", () => {
  it("I3: 생성 목록의 모든 PNG가 파일과 픽셀까지 같다(손으로 고친 PNG는 실패)", () => {
    expect(pngOutputs.length).toBeGreaterThanOrEqual(7);
    for (const out of pngOutputs) {
      const { png, colorType } = readPng(out.path);
      expect({ path: out.path, colorType }).toEqual({ path: out.path, colorType: out.colorType });
      expect({ path: out.path, w: png.width, h: png.height }).toEqual({
        path: out.path,
        w: out.width,
        h: out.height,
      });
      expect({
        path: out.path,
        same: Buffer.compare(png.data, Buffer.from(out.rgba)) === 0,
      }).toEqual({
        path: out.path,
        same: true,
      });
    }
  });

  it("미리보기 SVG도 정본에서 나온 그대로다", () => {
    const svg = outputs.find((o) => o.kind === "text");
    expect(svg?.path).toBe("design/icon.svg");
    expect(readText(join(ROOT, "design", "icon.svg"))).toBe((svg as { text: string }).text);
  });

  it("I4: iOS 아이콘은 1024²이고 알파 채널이 없다(PNG 색 유형 RGB, 모든 픽셀 불투명)", () => {
    const { png, colorType } = readPng("assets/icon.png");
    expect([png.width, png.height]).toEqual([1024, 1024]);
    expect(colorType).toBe(2);
    for (let i = 3; i < png.data.length; i += 4) {
      if (png.data[i] !== 255) throw new Error(`픽셀 ${(i - 3) / 4}의 알파가 ${png.data[i]}`);
    }
  });

  it("FR-004: 크기 — 스토어 아이콘 512²(Play는 32비트 PNG, RGBA)·favicon 48²·기능 그래픽 1024×500(Play는 24비트 PNG, 알파 없음)", () => {
    const store = readPng("store/ko/store-icon-512.png");
    expect([store.png.width, store.png.height, store.colorType]).toEqual([512, 512, 6]);
    const fav = readPng("assets/favicon.png");
    expect([fav.png.width, fav.png.height]).toEqual([48, 48]);
    const feature = readPng("store/ko/feature-graphic-1024x500.png");
    expect([feature.png.width, feature.png.height, feature.colorType]).toEqual([1024, 500, 2]);
  });

  it("I5: foreground 마크는 안전 영역(중앙 66/108) 안에 앉고 비어 있지 않다", () => {
    const { png } = readPng("assets/android-icon-foreground.png");
    const box = opaqueBbox(png.data, png.width, png.height);
    expect(box).not.toBeNull();
    const margin = (png.width * (1 - src.safeZone.numerator / src.safeZone.denominator)) / 2;
    expect(box!.minX).toBeGreaterThanOrEqual(margin);
    expect(box!.minY).toBeGreaterThanOrEqual(margin);
    expect(box!.maxX).toBeLessThanOrEqual(png.width - margin);
    expect(box!.maxY).toBeLessThanOrEqual(png.height - margin);
  });

  it("I5: background는 단색 accent이고 app.json의 adaptive 배경색도 같다", () => {
    const { png } = readPng("assets/android-icon-background.png");
    const [r, g, b] = [png.data[0], png.data[1], png.data[2]];
    expect(hex([r, g, b])).toBe(tokens.color.items.accent.light);
    const app = JSON.parse(readText(join(ROOT, "app.json"))) as {
      expo: { android: { adaptiveIcon: { backgroundColor: string } } };
    };
    expect(app.expo.android.adaptiveIcon.backgroundColor.toLowerCase()).toBe(
      tokens.color.items.accent.light,
    );
  });

  it("I6: app.json이 가리키는 아이콘 경로가 모두 실재하고 생성 목록에 있다", () => {
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

  it("monochrome은 투명 바탕에 마크만 있고 안전 영역 안이다", () => {
    const { png } = readPng("assets/android-icon-monochrome.png");
    const box = opaqueBbox(png.data, png.width, png.height);
    expect(box).not.toBeNull();
    const margin = (png.width * (1 - src.safeZone.numerator / src.safeZone.denominator)) / 2;
    expect(box!.minX).toBeGreaterThanOrEqual(margin);
    expect(box!.maxX).toBeLessThanOrEqual(png.width - margin);
  });
});

describe("102 아이콘 — 위반 주입 (I8)", () => {
  it("foreground 마크를 크게 키우면(배율 3.0) 안전 영역을 넘어 잡힌다", () => {
    const big = clone(src);
    big.scale.androidForeground = 3.0;
    const out = buildOutputs(big, tokens).find(
      (o) => o.path === "assets/android-icon-foreground.png",
    );
    if (!out || out.kind !== "png") throw new Error("foreground 없음");
    const box = opaqueBbox(out.rgba, out.width, out.height)!;
    const margin = (out.width * (1 - src.safeZone.numerator / src.safeZone.denominator)) / 2;
    expect(box.maxY > out.height - margin || box.minY < margin).toBe(true);
  });

  it("생성 픽셀 한 개를 바꾸면 파일과 달라진다(비교가 실제로 잡는다)", () => {
    const out = byPath("assets/icon.png");
    const { png } = readPng(out.path);
    const tampered = Buffer.from(out.rgba);
    tampered[0] = tampered[0] === 0 ? 1 : 0;
    expect(Buffer.compare(png.data, tampered)).not.toBe(0);
  });

  it("iOS 아이콘 한 픽셀의 알파를 낮추면 알파 검사가 잡는다", () => {
    const out = byPath("assets/icon.png");
    const data = Buffer.from(out.rgba);
    data[3] = 254;
    const bad = [...data].some((v, i) => i % 4 === 3 && v !== 255);
    expect(bad).toBe(true);
  });
});

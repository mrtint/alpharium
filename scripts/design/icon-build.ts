/**
 * 117 — 아이콘 정본에서 PNG·SVG 생성물을 만드는 코어(102의 기하 도형 정본을 대체한다).
 *
 * 계약: specs/117-sunset-p-icon/contracts/icon-source.md
 *
 * 정본은 둘이다 — 그림(`design/icon-art.svg`)과 그림을 놓는 값(`design/icon.json`). 이 코어는 모양도 색도 정하지 않는다.
 * 하는 일은 출력마다 SVG를 조립해(배경 + 배율·중심으로 놓은 그림) 래스터화하는 것뿐이다(헌법 원칙 V).
 * 출력은 입력만으로 정해진다(시각·경로·파일을 읽지 않는다). SVG→PNG는 `@resvg/resvg-js`(devDependency)가 한다.
 */

import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";

export interface IconSource {
  version: number;
  art: { file: string; center: { x: number; y: number } };
  scale: { ios: number; androidForeground: number; featureGraphic: number };
  safeZone: { numerator: number; denominator: number };
}

export type IconOutput =
  | {
      kind: "png";
      path: string;
      width: number;
      height: number;
      /** RGBA 픽셀 */
      rgba: Uint8Array;
      /** 파일의 PNG 색 유형 — 2는 알파 채널 없음(RGB), 6은 RGBA */
      colorType: 2 | 6;
    }
  | { kind: "text"; path: string; text: string };

/** 그림 파일에서 이름으로 꺼낸 조각 */
export interface Art {
  /** `<defs>…</defs>` 통째 */
  defs: string;
  /** 그림 그룹 `<g id="art">…</g>` */
  art: string;
  /** P 윤곽 요소 `<path id="p-shape" …/>` */
  pShape: string;
  /** 마침표 요소 `<circle id="dot-shape" …/>` */
  dotShape: string;
}

function required(svg: string, re: RegExp, id: string): string {
  const m = re.exec(svg);
  if (!m) throw new Error(`design/icon-art.svg에 ${id} 가 없다`);
  return m[0];
}

/** 그림 파일에서 필요한 조각을 id로 꺼낸다. 하나라도 없으면 실패한다(아무것도 만들지 않는다). */
export function parseArt(svg: string): Art {
  const defs = required(svg, /<defs>[\s\S]*?<\/defs>/, "<defs>");
  // 전제: <defs>는 하나이고, art는 파일 끝까지 이어지는 마지막 그룹이다(안에 중첩 <g>가 있다). 이 구조를 어기면 틀린 결과가 나오니 고칠 때 함께 본다.
  const start = svg.indexOf('<g id="art">');
  const end = svg.lastIndexOf("</svg>");
  if (start < 0 || end < start) throw new Error("design/icon-art.svg에 art 가 없다");
  const art = svg.slice(start, end).trim();
  return {
    defs,
    art,
    pShape: required(defs, /<path id="p-shape"[^>]*\/>/, "p-shape"),
    dotShape: required(defs, /<circle id="dot-shape"[^>]*\/>/, "dot-shape"),
  };
}

const num = (v: number) => String(Math.round(v * 1000) / 1000);

type Body = "background" | "art" | "full" | "mono";

/**
 * 출력 한 장의 SVG. `background`는 캔버스를 채우는 배경(변환 밖), `art`는 배율·중심으로 놓은 그림.
 * `mono`는 P 윤곽과 마침표를 검정 한 색으로 놓는다(풍경 없음).
 */
function compose(a: Art, src: IconSource, w: number, h: number, scale: number, body: Body): string {
  const { x, y } = src.art.center;
  const place = (inner: string) =>
    `<g transform="translate(${num(w / 2)} ${num(h / 2)}) scale(${num(scale)}) translate(${num(-x)} ${num(-y)})">${inner}</g>`;
  const bg = `<rect width="${w}" height="${h}" fill="url(#bg)"/>`;
  const parts: Record<Body, string> = {
    background: bg,
    art: place(a.art),
    full: bg + place(a.art),
    // 검정은 알파만 쓰이는 테마 아이콘용 자리표시 색이다(그림의 색이 아니다) — C3의 16진수 가둠 밖이다
    mono: place(`<use href="#p-shape" fill="black"/><use href="#dot-shape" fill="black"/>`),
  };
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    a.defs,
    parts[body],
    `</svg>`,
    ``,
  ].join("\n");
}

function render(svg: string, w: number, h: number): Uint8Array {
  const image = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: { loadSystemFonts: false },
  }).render();
  if (image.width !== w || image.height !== h) {
    throw new Error(`래스터 크기 ${image.width}×${image.height} 가 ${w}×${h} 와 다르다`);
  }
  return new Uint8Array(image.pixels);
}

/** 알파가 255가 아닌 픽셀이 있으면 실패한다(알파 없는 출력은 배경이 캔버스를 덮어야 한다) */
export function requireOpaque(path: string, rgba: Uint8Array): void {
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] !== 255) throw new Error(`${path} 의 픽셀 ${(i - 3) / 4} 알파가 ${rgba[i]} 이다`);
  }
}

/**
 * 생성물과 파일의 픽셀 비교 허용치(채널당). 래스터라이저가 플랫폼마다 안티앨리어싱에서 한두 단계 다를 수 있어 정했다 —
 * 사람이 정한 값이고 측정이 아니다(macOS arm64 밖에서는 아직 비교해 보지 못했다).
 */
export const PIXEL_TOLERANCE = 2;

/** 두 RGBA가 모든 채널에서 PIXEL_TOLERANCE 이내로 같은지 */
export function samePixels(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > PIXEL_TOLERANCE) return false;
  }
  return true;
}

/** 알파가 0이 아닌 픽셀의 경계 상자(픽셀 좌표, 끝 포함). 없으면 null. */
export function opaqueBbox(
  rgba: Uint8Array,
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX: maxX + 1, maxY: maxY + 1 };
}

/** 정본에서 만들 모든 파일(저장소 루트 기준 상대 경로) */
export function buildOutputs(src: IconSource, artSvg: string): IconOutput[] {
  const art = parseArt(artSvg);
  const { ios, androidForeground, featureGraphic } = src.scale;

  const png = (
    path: string,
    w: number,
    h: number,
    scale: number,
    body: Body,
    colorType: 2 | 6,
    opaque: boolean,
  ): IconOutput => {
    const rgba = render(compose(art, src, w, h, scale, body), w, h);
    if (opaque) requireOpaque(path, rgba);
    return { kind: "png", path, width: w, height: h, rgba, colorType };
  };

  return [
    png("assets/icon.png", 1024, 1024, ios, "full", 2, true),
    png("assets/android-icon-foreground.png", 1024, 1024, androidForeground, "art", 6, false),
    png("assets/android-icon-background.png", 1024, 1024, 1, "background", 2, true),
    png("assets/android-icon-monochrome.png", 1024, 1024, androidForeground, "mono", 6, false),
    png("assets/favicon.png", 48, 48, (ios * 48) / 1024, "full", 2, true),
    // Google Play 스토어 아이콘은 「32비트 PNG(알파 포함)」 형식이다 — 배경이 덮으므로 알파는 255다
    png("store/ko/store-icon-512.png", 512, 512, (ios * 512) / 1024, "full", 6, true),
    png("store/ko/feature-graphic-1024x500.png", 1024, 500, featureGraphic, "full", 2, true),
    // 눈으로 보는 SVG 미리보기(iOS 합성) — 래스터화에 쓰는 바로 그 SVG다
    {
      kind: "text",
      path: "design/icon.svg",
      text: compose(art, src, 1024, 1024, ios, "full").replace(
        "<defs>",
        "<!-- 생성물 — design/icon-art.svg와 design/icon.json에서 scripts/design/build-icons.mts가 만든다. 손으로 고치지 않는다. -->\n<defs>",
      ),
    },
  ];
}

/** RGBA 출력을 PNG 파일 바이트로 — 색 유형 2는 알파 채널을 쓰지 않는다 */
export function encodePng(out: Extract<IconOutput, { kind: "png" }>): Buffer {
  const image = new PNG({ width: out.width, height: out.height });
  image.data = Buffer.from(out.rgba);
  return PNG.sync.write(image, { colorType: out.colorType, inputColorType: 6 });
}

/**
 * 102 — 아이콘 정본(`design/icon.json`)에서 PNG·SVG 생성물을 만드는 코어.
 *
 * 계약: specs/102-app-icon-store-assets/contracts/icon-source.md
 *
 * 이 코어는 모양을 정하지 않는다 — 도형·배율은 정본의 값이고 색은 `design/tokens.json`의 값이다(헌법 원칙 V).
 * 코어가 하는 일은 정본의 도형을 픽셀로 옮기는 것뿐이다. 출력은 입력만으로 정해진다(시각·경로·파일을 읽지 않는다).
 * 안티앨리어싱은 3×3 슈퍼샘플링이다 — SVG 렌더러를 들이지 않는다(specs/102 research R1).
 */

import { PNG } from "pngjs";

export interface IconShape {
  op: "add" | "sub";
  kind: "rect" | "d-shape";
  x0: number;
  y0: number;
  y1: number;
  /** rect의 오른쪽 변 */
  x1?: number;
  /** d-shape의 사각형 오른쪽 변이자 반원의 중심 x */
  cx?: number;
}

export interface IconSource {
  version: number;
  colors: { background: string; mark: string };
  mark: { height: number; shapes: IconShape[] };
  scale: { ios: number; androidForeground: number; featureGraphic: number };
  safeZone: { numerator: number; denominator: number };
}

export interface TokensColors {
  color: { items: Record<string, { light: string; dark: string }> };
}

export type Rgb = readonly [number, number, number];

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

const SS = 3;

function parseHex(value: string): Rgb {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!m) throw new Error(`색 ${value} 은(는) #rrggbb 꼴이 아니다`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** 정본의 색 이름을 토큰의 라이트 값으로 풀어 준다. 없는 이름이면 실패한다. */
export function resolveColors(src: IconSource, tokens: TokensColors): { background: Rgb; mark: Rgb } {
  const pick = (name: string): Rgb => {
    const entry = tokens.color.items[name];
    if (!entry) throw new Error(`design/icon.json이 없는 토큰 「${name}」 을(를) 가리킨다`);
    return parseHex(entry.light);
  };
  return { background: pick(src.colors.background), mark: pick(src.colors.mark) };
}

/** 글리프 단위계의 점 (x, y)가 마크 안인지 */
function inMark(shapes: readonly IconShape[], x: number, y: number): boolean {
  const inside = (s: IconShape): boolean => {
    if (y < s.y0 || y > s.y1) return false;
    if (s.kind === "rect") return x >= s.x0 && x <= (s.x1 as number);
    const cx = s.cx as number;
    if (x >= s.x0 && x <= cx) return true;
    const r = (s.y1 - s.y0) / 2;
    return x > cx && (x - cx) ** 2 + (y - (s.y0 + s.y1) / 2) ** 2 <= r * r;
  };
  let added = false;
  for (const s of shapes) {
    if (s.op === "add" && inside(s)) added = true;
  }
  if (!added) return false;
  return !shapes.some((s) => s.op === "sub" && inside(s));
}

/** 캔버스 중앙에 마크를 그린 RGBA. `background`가 null이면 투명 바탕이다. */
function renderMark(
  src: IconSource,
  width: number,
  height: number,
  scale: number,
  background: Rgb | null,
  mark: Rgb,
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS - width / 2) / scale;
          const y = (py + (sy + 0.5) / SS - height / 2) / scale;
          if (inMark(src.mark.shapes, x, y)) hit++;
        }
      }
      const a = hit / (SS * SS);
      const i = (py * width + px) * 4;
      if (background) {
        for (let c = 0; c < 3; c++) data[i + c] = Math.round(background[c] * (1 - a) + mark[c] * a);
        data[i + 3] = 255;
      } else {
        for (let c = 0; c < 3; c++) data[i + c] = mark[c];
        data[i + 3] = Math.round(255 * a);
      }
    }
  }
  return data;
}

function solid(width: number, height: number, color: Rgb): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = 255;
  }
  return data;
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

const num = (v: number) => String(Math.round(v * 1000) / 1000);

function shapePath(s: IconShape): string {
  if (s.kind === "rect") {
    const x1 = s.x1 as number;
    return `M${num(s.x0)} ${num(s.y0)}H${num(x1)}V${num(s.y1)}H${num(s.x0)}Z`;
  }
  const cx = s.cx as number;
  const r = (s.y1 - s.y0) / 2;
  return `M${num(s.x0)} ${num(s.y0)}H${num(cx)}A${num(r)} ${num(r)} 0 0 1 ${num(cx)} ${num(s.y1)}H${num(s.x0)}Z`;
}

const hexOf = (c: Rgb) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

/** 정본을 눈으로 보는 SVG 미리보기(iOS 배율) */
export function toSvg(src: IconSource, tokens: TokensColors): string {
  const { background, mark } = resolveColors(src, tokens);
  const d = src.mark.shapes.map(shapePath).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">`,
    `<!-- 생성물 — design/icon.json에서 scripts/design/build-icons.mts가 만든다. 손으로 고치지 않는다. -->`,
    `<rect width="1024" height="1024" fill="${hexOf(background)}"/>`,
    `<path transform="translate(512 512) scale(${num(src.scale.ios)})" fill="${hexOf(mark)}" fill-rule="evenodd" d="${d}"/>`,
    `</svg>`,
    ``,
  ].join("\n");
}

/** 정본에서 만들 모든 파일(저장소 루트 기준 상대 경로) */
export function buildOutputs(src: IconSource, tokens: TokensColors): IconOutput[] {
  const { background, mark } = resolveColors(src, tokens);
  const png = (
    path: string,
    width: number,
    height: number,
    rgba: Uint8Array,
    colorType: 2 | 6,
  ): IconOutput => ({ kind: "png", path, width, height, rgba, colorType });
  const { ios, androidForeground, featureGraphic } = src.scale;
  return [
    png("assets/icon.png", 1024, 1024, renderMark(src, 1024, 1024, ios, background, mark), 2),
    png(
      "assets/android-icon-foreground.png",
      1024,
      1024,
      renderMark(src, 1024, 1024, androidForeground, null, mark),
      6,
    ),
    png("assets/android-icon-background.png", 1024, 1024, solid(1024, 1024, background), 2),
    png(
      "assets/android-icon-monochrome.png",
      1024,
      1024,
      renderMark(src, 1024, 1024, androidForeground, null, [0, 0, 0]),
      6,
    ),
    png("assets/favicon.png", 48, 48, renderMark(src, 48, 48, (ios * 48) / 1024, background, mark), 2),
    png(
      "store/ko/store-icon-512.png",
      512,
      512,
      renderMark(src, 512, 512, (ios * 512) / 1024, background, mark),
      6, // Google Play 스토어 아이콘은 「32비트 PNG(알파 포함)」 형식이다
    ),
    png(
      "store/ko/feature-graphic-1024x500.png",
      1024,
      500,
      renderMark(src, 1024, 500, featureGraphic, background, mark),
      2,
    ),
    { kind: "text", path: "design/icon.svg", text: toSvg(src, tokens) },
  ];
}

/** RGBA 출력을 PNG 파일 바이트로 — 색 유형 2는 알파 채널을 쓰지 않는다 */
export function encodePng(out: Extract<IconOutput, { kind: "png" }>): Buffer {
  const image = new PNG({ width: out.width, height: out.height });
  image.data = Buffer.from(out.rgba);
  return PNG.sync.write(image, { colorType: out.colorType, inputColorType: 6 });
}

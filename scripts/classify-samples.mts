#!/usr/bin/env node
/**
 * scripts/samples/ 바로 아래에 뒤섞여 있는 사진들을 GPS 유무로 나눠
 * with-gps/ · no-gps/로 옮긴다.
 *
 * 일회성 정리 도구다 — 010 시딩 도구 자체의 일부가 아니므로 seed-day.mts는
 * 이 파일을 import하지 않는다.
 */
import { readdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "scripts", "samples");

function isPhoto(name: string): boolean {
  return /\.(jpe?g)$/i.test(name);
}

/**
 * JPEG 세그먼트를 훑어 APP1(Exif) 마커를 찾고, 그 안의 TIFF 헤더 오프셋을 준다.
 *
 * `exif.ts`의 `TIFF_OFFSET = 12`는 010의 템플릿 파일 하나에 고정된 값이라 여기서
 * 재사용할 수 없다 — 일반 카메라 JPEG는 APP1 앞에 다른 세그먼트가 올 수 있다.
 */
function findExifTiffOffset(buf: Buffer): number | null {
  if (buf.readUInt16BE(0) !== 0xffd8) return null; // SOI
  let pos = 2;
  while (pos + 4 <= buf.length) {
    const marker = buf.readUInt16BE(pos);
    if (marker < 0xff01 || marker > 0xfffe) break; // 마커가 아니다
    const len = buf.readUInt16BE(pos + 2);
    if (marker === 0xffe1) {
      const tag = buf.subarray(pos + 4, pos + 10).toString("ascii");
      if (tag === "Exif\0\0") return pos + 10;
    }
    if (marker === 0xffda) break; // SOS — 그 뒤는 압축 데이터다
    pos += 2 + len;
  }
  return null;
}

type Reader = {
  u16: (offset: number) => number;
  u32: (offset: number) => number;
};

function readerAt(buf: Buffer, tiffOffset: number): Reader {
  const little = buf.subarray(tiffOffset, tiffOffset + 2).toString("ascii") === "II";
  return {
    u16: (o) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o)),
    u32: (o) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o)),
  };
}

function* entriesOf(buf: Buffer, r: Reader, tiffOffset: number, ifdOffset: number) {
  const base = tiffOffset + ifdOffset;
  const count = r.u16(base);
  for (let i = 0; i < count; i++) {
    const at = base + 2 + i * 12;
    yield { at, tag: r.u16(at) };
  }
}

/** IFD0에 GPS IFD(0x8825)로 가는 포인터가 있으면 GPS 있는 사진으로 본다 */
function hasGpsIfd(buf: Buffer): boolean {
  const tiffOffset = findExifTiffOffset(buf);
  if (tiffOffset === null) return false;
  try {
    const r = readerAt(buf, tiffOffset);
    const ifd0Offset = r.u32(tiffOffset + 4);
    for (const e of entriesOf(buf, r, tiffOffset, ifd0Offset)) {
      if (e.tag === 0x8825) return true;
    }
  } catch {
    return false;
  }
  return false;
}

const files = readdirSync(ROOT).filter(isPhoto);
let withGps = 0;
let noGps = 0;
let failed = 0;

for (const name of files) {
  const path = join(ROOT, name);
  try {
    const buf = readFileSync(path);
    const gps = hasGpsIfd(buf);
    const dest = join(ROOT, gps ? "with-gps" : "no-gps", name);
    renameSync(path, dest);
    if (gps) withGps++;
    else noGps++;
  } catch (error) {
    console.error(`실패: ${name} — ${String(error)}`);
    failed++;
  }
}

console.log(`with-gps: ${withGps}장, no-gps: ${noGps}장, 실패: ${failed}장`);

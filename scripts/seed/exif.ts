/**
 * 템플릿 JPEG의 EXIF에서 날짜·좌표만 덮어쓴다.
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md 「2단계」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **EXIF를 만들지 않는다. 이미 동작이 확인된 것을 고쳐 쓴다.**
 *
 * research.md §4의 실측: 규격대로 손으로 만든 EXIF를 **안드로이드가 무시한다.**
 * 내가 짠 파서로는 정확히 파싱되는데 미디어 스캐너는 `datetaken`을 NULL로 둔다.
 * 진짜 사진의 EXIF에서 날짜만 덮어쓰면 정확히 들어간다.
 *
 * **차이가 어디서 오는지는 모른다**(원칙 V — 짐작으로 남긴다). 후보는 IFD0의 이미지
 * 태그들이 없어서일 가능성이지만 확인하지 않았고, 템플릿 방식이 되므로 확인할 필요가
 * 없어졌다.
 *
 * **그래서 이 파일의 모든 함수가 「길이를 유지한 자리 교체」다.** 길이가 바뀌면 뒤의
 * 오프셋이 전부 어긋나고, 그 순간 위의 「무시되는 EXIF」가 된다 — **오류는 나지 않고
 * `datetaken`만 NULL이 되므로** 알아채기 어렵다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 이 파일은 **기기에 닿지 않는다.** 순수하게 버퍼만 다루므로 기기 없이 검증된다.
 */

import { join } from "node:path";

/**
 * 010의 검은 단색 템플릿에서는 TIFF 헤더가 언제나 APP1의 자리(SOI(2) + FFE1(2) +
 * len(2) + "Exif\0\0"(6) = 12)에서 시작한다. **실사 사진은 이 값이 다르다** —
 * 앞에 다른 세그먼트(썸네일, 다른 APP 마커)가 올 수 있어 파일마다 찾는다.
 */

/**
 * JPEG 세그먼트를 훑어 APP1(Exif) 마커를 찾고 TIFF 헤더가 시작하는 자리를 준다.
 *
 * scripts/samples/의 실사 사진(011)을 지원하기 위해 추가됐다. **길이 유지
 * 원칙은 그대로다** — 여기서 하는 일은 오프셋을 "찾는" 것뿐이고, 아래 patch
 * 함수들은 여전히 찾은 자리의 바이트만 길이를 바꾸지 않고 덮어쓴다.
 */
function findTiffOffset(buf: Buffer): number {
  if (buf.readUInt16BE(0) !== 0xffd8) {
    throw new Error("JPEG이 아니다 — SOI 마커가 없다");
  }
  let pos = 2;
  while (pos + 4 <= buf.length) {
    const marker = buf.readUInt16BE(pos);
    if (marker < 0xff01 || marker > 0xfffe) break; // 마커가 아니다
    const len = buf.readUInt16BE(pos + 2);
    if (marker === 0xffe1 && buf.subarray(pos + 4, pos + 10).toString("ascii") === "Exif\0\0") {
      return pos + 10;
    }
    if (marker === 0xffda) break; // SOS — 그 뒤는 압축 데이터다
    pos += 2 + len;
  }
  throw new Error("APP1(Exif) 세그먼트를 찾지 못했다 — 사진에 EXIF가 없다");
}

/** EXIF 날짜 문자열의 길이. `"YYYY:MM:DD HH:MM:SS\0"` — **20바이트 고정이다** */
const DATE_LENGTH = 20;

const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATE_ORIGINAL = 0x9003;
const TAG_DATE_DIGITIZED = 0x9004;
const TAG_GPS_LAT_REF = 0x0001;
const TAG_GPS_LAT = 0x0002;
const TAG_GPS_LON_REF = 0x0003;
const TAG_GPS_LON = 0x0004;
const TAG_GPS_DATE_STAMP = 0x001d;

/** `GPSDateStamp`의 길이. `"YYYY:MM:DD\0"` — **11바이트 고정이다**(실측, 2026-08-22) */
const GPS_DATE_LENGTH = 11;

/**
 * 템플릿의 자리. **`scripts/` 아래다 — `src/`가 아니므로 번들에 들어갈 길이 없다**(FR-001).
 *
 * **⚠️ `import.meta.url`을 쓰지 않는다.** 이 파일은 두 곳에서 불린다: Node가 `.mts`
 * 진입점을 통해 (ESM), 그리고 jest가 CommonJS로 변환해서. **후자에서 `import.meta.url`이
 * `null`이 되어 `fileURLToPath`가 던진다** — 테스트 스위트 전체가 뜨지 않는다.
 *
 * 저장소 뿌리에서 푸는 것이 양쪽에서 동작하는 유일한 길이다. `process.cwd()`는 npm
 * 스크립트로 돌 때도 jest로 돌 때도 저장소 뿌리다.
 */
export function templatePath(withGps: boolean): string {
  return join(process.cwd(), "scripts", withGps ? "seed-template.jpg" : "seed-template-nogps.jpg");
}

/**
 * TIFF는 빅엔디안일 수도 리틀엔디안일 수도 있다.
 *
 * 템플릿은 지금 리틀엔디안("II")이지만 **템플릿을 바꿀 수 있으므로** 헤더를 읽어 정한다.
 * 고정으로 박으면 다음 사람이 템플릿을 바꿨을 때 조용히 어긋난다.
 */
type Reader = {
  tiffOffset: number;
  u16: (offset: number) => number;
  u32: (offset: number) => number;
  writeU32: (value: number, offset: number) => void;
};

function readerFor(buf: Buffer): Reader {
  const tiffOffset = findTiffOffset(buf);
  const little = buf.subarray(tiffOffset, tiffOffset + 2).toString("ascii") === "II";
  return {
    tiffOffset,
    u16: (o) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o)),
    u32: (o) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o)),
    writeU32: (v, o) => (little ? buf.writeUInt32LE(v, o) : buf.writeUInt32BE(v, o)),
  };
}

/** IFD 하나를 훑어 각 엔트리를 준다 */
function* entriesOf(buf: Buffer, r: Reader, ifdOffset: number) {
  const base = r.tiffOffset + ifdOffset;
  const count = r.u16(base);
  for (let i = 0; i < count; i++) {
    const at = base + 2 + i * 12;
    yield { at, tag: r.u16(at), type: r.u16(at + 2), count: r.u32(at + 4) };
  }
}

/** IFD0에서 하위 IFD로 가는 포인터를 찾는다. 없으면 null */
function subIfdOffset(buf: Buffer, r: Reader, tag: number): number | null {
  for (const e of entriesOf(buf, r, r.u32(r.tiffOffset + 4))) {
    if (e.tag === tag) return r.u32(e.at + 8);
  }
  return null;
}

/** ASCII 값이 실제로 놓인 자리. 4바이트 이하면 엔트리 안에 있다 */
function valueOffset(buf: Buffer, r: Reader, at: number, byteLength: number): number {
  return byteLength <= 4 ? at + 8 : r.tiffOffset + r.u32(at + 8);
}

/** `"YYYY:MM:DD HH:MM:SS"` */
function formatExifDate(at: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${at.getFullYear()}:${p(at.getMonth() + 1)}:${p(at.getDate())} ` +
    `${p(at.getHours())}:${p(at.getMinutes())}:${p(at.getSeconds())}`
  );
}

/**
 * 찍힌 시각을 덮어쓴다. **`DateTimeOriginal`과 `DateTimeDigitized` 둘 다 쓴다.**
 *
 * 어느 쪽을 스캐너가 보는지 확실하지 않고(원칙 V), 진짜 사진에는 둘 다 있으므로
 * 둘 다 맞춘다. 하나만 고치면 어긋난 사진이 된다.
 *
 * **길이가 고정(20바이트)이라 오프셋이 움직이지 않는다.**
 */
export function patchDate(template: Buffer, at: Date): Buffer {
  const buf = Buffer.from(template); // 원본을 건드리지 않는다 — 템플릿은 여러 번 쓰인다
  const r = readerFor(buf);

  const exifIfd = subIfdOffset(buf, r, TAG_EXIF_IFD);
  if (exifIfd === null) throw new Error("템플릿에 ExifIFD가 없다 — 템플릿이 손상됐다");

  const text = `${formatExifDate(at)}\0`;
  if (text.length !== DATE_LENGTH) {
    throw new Error(`날짜 문자열이 ${DATE_LENGTH}바이트가 아니다: ${text.length}`);
  }

  let written = 0;
  for (const e of entriesOf(buf, r, exifIfd)) {
    if (e.tag !== TAG_DATE_ORIGINAL && e.tag !== TAG_DATE_DIGITIZED) continue;
    if (e.count !== DATE_LENGTH) {
      throw new Error(`날짜 자리가 ${DATE_LENGTH}바이트가 아니다: ${e.count}`);
    }
    buf.write(text, valueOffset(buf, r, e.at, e.count), "ascii");
    written++;
  }

  if (written === 0) throw new Error("템플릿에 날짜 자리가 없다 — 템플릿이 손상됐다");

  // GPS IFD가 있으면 GPSDateStamp도 함께 맞춘다. **어긋난 채로 두면 안드로이드
  // 미디어 스캐너가 datetaken을 NULL로 둔다** — 011 실측(scripts/samples/README.md).
  // GPS 없는 사진은 이 태그 자체가 없으므로 조용히 건너뛴다.
  const gpsIfd = subIfdOffset(buf, r, TAG_GPS_IFD);
  if (gpsIfd !== null) {
    const gpsDateText = `${formatGpsDate(at)}\0`;
    for (const e of entriesOf(buf, r, gpsIfd)) {
      if (e.tag !== TAG_GPS_DATE_STAMP) continue;
      if (e.count !== GPS_DATE_LENGTH) {
        throw new Error(`GPSDateStamp 자리가 ${GPS_DATE_LENGTH}바이트가 아니다: ${e.count}`);
      }
      buf.write(gpsDateText, valueOffset(buf, r, e.at, e.count), "ascii");
    }
  }

  return buf;
}

/** `"YYYY:MM:DD"` — GPSDateStamp는 시각 없이 날짜만 담는다(UTC 기준이 관례이나
 * 여기서는 심는 날짜와 맞추는 것이 목적이므로 로컬 날짜를 그대로 쓴다) */
function formatGpsDate(at: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}:${p(at.getMonth() + 1)}:${p(at.getDate())}`;
}

/** 저장된 날짜를 읽는다. 확인용이며 심을 때도 쓴다 */
export function readDate(buf: Buffer): Date | null {
  const r = readerFor(buf);
  const exifIfd = subIfdOffset(buf, r, TAG_EXIF_IFD);
  if (exifIfd === null) return null;

  for (const e of entriesOf(buf, r, exifIfd)) {
    if (e.tag !== TAG_DATE_ORIGINAL) continue;

    const text = buf
      .subarray(valueOffset(buf, r, e.at, e.count), valueOffset(buf, r, e.at, e.count) + e.count)
      .toString("ascii")
      .replace(/\0/g, "");

    const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
    if (m === null) return null;

    const [, y, mo, d, h, mi, s] = m.map(Number);
    return new Date(y, mo - 1, d, h, mi, s);
  }
  return null;
}

/**
 * 좌표가 쓸 만한지 본다.
 *
 * **`(0,0)`을 거부하는 것이 핵심이다.** 004의 `isUsableCoordinate()`가 그 값을
 * 「좌표를 못 읽었을 때의 채움값」으로 보고 버린다 — 심은 좌표가 버려지면 사진은
 * 있는데 자리가 안 잡히고, 그것이 검증을 조용히 헛돌게 한다.
 *
 * **004와 같은 판정이지만 코드를 공유하지 않는다.** 그 함수는 `src/signals/`에 있고
 * 이 도구는 앱을 읽기만 하는 방향을 최소로 유지한다(`day-boundary` 하나뿐). 대신
 * 여기서 거부해 **어긋나면 심는 쪽이 먼저 실패한다.**
 */
function assertUsable(latitude: number, longitude: number): void {
  if (latitude === 0 && longitude === 0) {
    throw new Error("(0,0)은 좌표를 못 읽었을 때의 값이라 004가 버린다");
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error(`좌표가 범위를 벗어났다: ${latitude}, ${longitude}`);
  }
}

/** 도 → 도/분/초 rational 3개(각 8바이트). **24바이트 고정이라 오프셋이 안 움직인다** */
function writeDms(buf: Buffer, r: Reader, offset: number, degrees: number): void {
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  // 초는 분모를 크게 두어 정밀도를 남긴다 — 100m 판정(004)에 견뎌야 한다
  const s = Math.round(((abs - d) * 60 - m) * 60 * 10000);

  r.writeU32(d, offset);
  r.writeU32(1, offset + 4);
  r.writeU32(m, offset + 8);
  r.writeU32(1, offset + 12);
  r.writeU32(s, offset + 16);
  r.writeU32(10000, offset + 20);
}

function readDms(buf: Buffer, r: Reader, offset: number): number {
  const d = r.u32(offset) / r.u32(offset + 4);
  const m = r.u32(offset + 8) / r.u32(offset + 12);
  const s = r.u32(offset + 16) / r.u32(offset + 20);
  return d + m / 60 + s / 3600;
}

/**
 * 좌표를 덮어쓴다.
 *
 * **GPS IFD가 없는 템플릿에서는 실패한다.** 조용히 넘어가면 「좌표를 심었다고 믿는데
 * 사진에는 없는」 상태가 되고, 그것이 006~009에서 반복된 조용한 실패다.
 *
 * 좌표 없는 사진은 **`seed-template-nogps.jpg`를 쓰고 이 함수를 부르지 않는다** —
 * 태그를 지우면 IFD 엔트리 수가 바뀌어 오프셋이 움직인다.
 */
export function patchLocation(template: Buffer, latitude: number, longitude: number): Buffer {
  assertUsable(latitude, longitude);

  const buf = Buffer.from(template);
  const r = readerFor(buf);

  const gpsIfd = subIfdOffset(buf, r, TAG_GPS_IFD);
  if (gpsIfd === null) {
    throw new Error("이 템플릿에는 GPS 자리가 없다 — 좌표를 넣으려면 GPS 있는 템플릿을 쓴다");
  }

  let wrote = 0;
  for (const e of entriesOf(buf, r, gpsIfd)) {
    switch (e.tag) {
      case TAG_GPS_LAT_REF:
        buf.write(latitude >= 0 ? "N\0" : "S\0", e.at + 8, "ascii");
        wrote++;
        break;
      case TAG_GPS_LON_REF:
        buf.write(longitude >= 0 ? "E\0" : "W\0", e.at + 8, "ascii");
        wrote++;
        break;
      case TAG_GPS_LAT:
        writeDms(buf, r, r.tiffOffset + r.u32(e.at + 8), latitude);
        wrote++;
        break;
      case TAG_GPS_LON:
        writeDms(buf, r, r.tiffOffset + r.u32(e.at + 8), longitude);
        wrote++;
        break;
    }
  }

  if (wrote < 4) throw new Error(`GPS 자리가 모자란다 (${wrote}/4) — 템플릿이 손상됐다`);
  return buf;
}

/** 저장된 좌표를 읽는다. GPS 자리가 없으면 null */
export function readLocation(buf: Buffer): { latitude: number; longitude: number } | null {
  const r = readerFor(buf);
  const gpsIfd = subIfdOffset(buf, r, TAG_GPS_IFD);
  if (gpsIfd === null) return null;

  let latitude: number | null = null;
  let longitude: number | null = null;
  let latSign = 1;
  let lonSign = 1;

  for (const e of entriesOf(buf, r, gpsIfd)) {
    switch (e.tag) {
      case TAG_GPS_LAT_REF:
        latSign = buf.subarray(e.at + 8, e.at + 9).toString("ascii") === "S" ? -1 : 1;
        break;
      case TAG_GPS_LON_REF:
        lonSign = buf.subarray(e.at + 8, e.at + 9).toString("ascii") === "W" ? -1 : 1;
        break;
      case TAG_GPS_LAT:
        latitude = readDms(buf, r, r.tiffOffset + r.u32(e.at + 8));
        break;
      case TAG_GPS_LON:
        longitude = readDms(buf, r, r.tiffOffset + r.u32(e.at + 8));
        break;
    }
  }

  if (latitude === null || longitude === null) return null;
  return { latitude: latitude * latSign, longitude: longitude * lonSign };
}

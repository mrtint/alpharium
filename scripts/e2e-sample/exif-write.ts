/**
 * 070 — JPEG에 EXIF(촬영 시각·GPS)를 새로 쓴다.
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md E-1~E-5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **받은 사진의 EXIF를 쓰지 않는다.** 걷어낸 자리에 표가 정한 시각·좌표만 가진 APP1을 새로 넣는다. 사진 안의 촬영 기기·원래 위치가
 * 표본에 남지 않는다(저작자의 기기 식별 정보도 안 퍼진다).
 *
 * **010의 경고를 이어받는다**(`scripts/seed/exif.ts` 머리): 규격대로 손으로 만든 EXIF를 안드로이드 미디어 스캐너가 무시한 적이 있다(`datetaken`이
 * NULL). 그때 원인은 알아내지 못했다(원칙 V — 짐작). 그래서 진짜 사진에 있는 태그들을 넉넉히 넣는다 — IFD0의 해상도·방향, ExifIFD의
 * `ExifVersion`·`OffsetTime*`·`ComponentsConfiguration`·화소 크기, GPS의 `GPSVersionID`. **이 방식이 기기에서 받아들여지는지는 첫 실기기
 * 확인(T020)이 판정한다.** 그 결과는 research.md R4에 있다.
 *
 * `DateTime`·`DateTimeOriginal`·`DateTimeDigitized`·`GPSDateStamp`는 모두 같은 날짜를 담는다 — 010 실측으로 어긋나면 스캐너가 `datetaken`을 NULL로 둔다.
 *
 * 순수 함수다 — `fs`·`adb`를 import하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ExifCoordinate = { latitude: number; longitude: number };
export type ExifInput = { takenAt: Date; coordinate: ExifCoordinate | null };

const BYTE = 1;
const ASCII = 2;
const SHORT = 3;
const LONG = 4;
const RATIONAL = 5;
const UNDEFINED = 7;

type Entry = { tag: number; type: number; count: number; data: Buffer };

function ascii(text: string): Buffer {
  return Buffer.from(`${text}\0`, "latin1");
}

function short(value: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(value, 0);
  return b;
}

function long(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(value, 0);
  return b;
}

function rationals(pairs: [number, number][]): Buffer {
  const b = Buffer.alloc(pairs.length * 8);
  pairs.forEach(([n, d], i) => {
    b.writeUInt32LE(n, i * 8);
    b.writeUInt32LE(d, i * 8 + 4);
  });
  return b;
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** `"YYYY:MM:DD HH:MM:SS"` (로컬, 010 `formatExifDate`와 같은 형식) */
function exifDate(at: Date): string {
  return (
    `${at.getFullYear()}:${p2(at.getMonth() + 1)}:${p2(at.getDate())} ` +
    `${p2(at.getHours())}:${p2(at.getMinutes())}:${p2(at.getSeconds())}`
  );
}

/** `"YYYY:MM:DD"` (로컬 — 010 `formatGpsDate`와 같은 값) */
function gpsDate(at: Date): string {
  return `${at.getFullYear()}:${p2(at.getMonth() + 1)}:${p2(at.getDate())}`;
}

/** `"+09:00"` — 그 시각의 로컬 UTC 오프셋 */
function offsetText(at: Date): string {
  const minutes = -at.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `${sign}${p2(Math.floor(abs / 60))}:${p2(abs % 60)}`;
}

/** 도 → 도/분/초 rational 3개 (010 `writeDms`와 같은 분해, 초 분모 10000) */
function dms(degrees: number): Buffer {
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = Math.round(((abs - d) * 60 - m) * 60 * 10000);
  return rationals([
    [d, 1],
    [m, 1],
    [s, 10000],
  ]);
}

/** IFD 하나의 크기: 개수(2) + 엔트리(12씩) + 다음 IFD 포인터(4) */
const ifdSize = (entries: Entry[]) => 2 + entries.length * 12 + 4;

/** 4바이트를 넘는 값은 데이터 영역에 두고 포인터를 쓴다. `dataStart`는 TIFF 헤더 기준 오프셋이고 다음 빈 자리를 돌려준다 */
function writeIfd(
  entries: Entry[],
  at: number,
  tiff: Buffer,
  dataStart: number,
): number {
  const sorted = [...entries].sort((a, b) => a.tag - b.tag);
  tiff.writeUInt16LE(sorted.length, at);
  let data = dataStart;
  sorted.forEach((e, i) => {
    const entryAt = at + 2 + i * 12;
    tiff.writeUInt16LE(e.tag, entryAt);
    tiff.writeUInt16LE(e.type, entryAt + 2);
    tiff.writeUInt32LE(e.count, entryAt + 4);
    if (e.data.length <= 4) {
      e.data.copy(tiff, entryAt + 8);
    } else {
      tiff.writeUInt32LE(data, entryAt + 8);
      e.data.copy(tiff, data);
      data += e.data.length + (e.data.length % 2); // 짝수 경계
    }
  });
  tiff.writeUInt32LE(0, at + 2 + sorted.length * 12); // 다음 IFD 없음
  return data;
}

/** JPEG 세그먼트를 훑어 (마커, 시작, 끝) 목록과 SOS 시작을 준다 */
function walkSegments(jpeg: Buffer): { marker: number; start: number; end: number }[] {
  if (jpeg.length < 4 || jpeg.readUInt16BE(0) !== 0xffd8) {
    throw new Error("JPEG이 아니다 — SOI 마커가 없다");
  }
  const segments: { marker: number; start: number; end: number }[] = [];
  let pos = 2;
  while (pos + 4 <= jpeg.length) {
    const marker = jpeg.readUInt16BE(pos);
    if (marker < 0xff01 || marker > 0xfffe) {
      throw new Error("JPEG이 아니다 — 세그먼트 마커가 어긋났다");
    }
    if (marker === 0xffda) {
      segments.push({ marker, start: pos, end: jpeg.length });
      return segments;
    }
    const end = pos + 2 + jpeg.readUInt16BE(pos + 2);
    segments.push({ marker, start: pos, end });
    pos = end;
  }
  throw new Error("JPEG이 아니다 — SOS(이미지 데이터)가 없다");
}

/** SOF 세그먼트에서 화소 크기 */
function dimensionsOf(jpeg: Buffer, segments: { marker: number; start: number }[]): [number, number] {
  for (const s of segments) {
    const isSof =
      s.marker >= 0xffc0 && s.marker <= 0xffcf && s.marker !== 0xffc4 && s.marker !== 0xffc8 && s.marker !== 0xffcc;
    if (isSof) return [jpeg.readUInt16BE(s.start + 7), jpeg.readUInt16BE(s.start + 5)];
  }
  throw new Error("JPEG이 아니다 — SOF(화소 크기)가 없다");
}

/** 새 APP1(Exif) 세그먼트 전체(마커 포함) */
function buildApp1(input: ExifInput, width: number, height: number): Buffer {
  const { takenAt, coordinate } = input;
  const when = ascii(exifDate(takenAt));
  const offset = ascii(offsetText(takenAt));

  const exifEntries: Entry[] = [
    { tag: 0x9000, type: UNDEFINED, count: 4, data: Buffer.from("0231", "latin1") },
    { tag: 0x9003, type: ASCII, count: when.length, data: when },
    { tag: 0x9004, type: ASCII, count: when.length, data: when },
    { tag: 0x9010, type: ASCII, count: offset.length, data: offset },
    { tag: 0x9011, type: ASCII, count: offset.length, data: offset },
    { tag: 0x9012, type: ASCII, count: offset.length, data: offset },
    { tag: 0x9101, type: UNDEFINED, count: 4, data: Buffer.from([1, 2, 3, 0]) },
    { tag: 0xa000, type: UNDEFINED, count: 4, data: Buffer.from("0100", "latin1") },
    { tag: 0xa001, type: SHORT, count: 1, data: short(1) },
    { tag: 0xa002, type: LONG, count: 1, data: long(width) },
    { tag: 0xa003, type: LONG, count: 1, data: long(height) },
  ];

  const gpsEntries: Entry[] =
    coordinate === null
      ? []
      : [
          { tag: 0x0000, type: BYTE, count: 4, data: Buffer.from([2, 3, 0, 0]) },
          { tag: 0x0001, type: ASCII, count: 2, data: ascii(coordinate.latitude >= 0 ? "N" : "S") },
          { tag: 0x0002, type: RATIONAL, count: 3, data: dms(coordinate.latitude) },
          { tag: 0x0003, type: ASCII, count: 2, data: ascii(coordinate.longitude >= 0 ? "E" : "W") },
          { tag: 0x0004, type: RATIONAL, count: 3, data: dms(coordinate.longitude) },
          { tag: 0x001d, type: ASCII, count: 11, data: ascii(gpsDate(takenAt)) },
        ];

  // IFD 위치는 개수로 정해지므로 포인터를 먼저 계산한다
  const ifd0Entries = 7 + (coordinate === null ? 0 : 1);
  const ifd0Size = 2 + ifd0Entries * 12 + 4;
  const exifAt = 8 + ifd0Size;
  const gpsAt = exifAt + ifdSize(exifEntries);
  const dataAt = gpsAt + (coordinate === null ? 0 : ifdSize(gpsEntries));

  const ifd0: Entry[] = [
    { tag: 0x0112, type: SHORT, count: 1, data: short(1) },
    { tag: 0x011a, type: RATIONAL, count: 1, data: rationals([[72, 1]]) },
    { tag: 0x011b, type: RATIONAL, count: 1, data: rationals([[72, 1]]) },
    { tag: 0x0128, type: SHORT, count: 1, data: short(2) },
    { tag: 0x0132, type: ASCII, count: when.length, data: when },
    { tag: 0x0213, type: SHORT, count: 1, data: short(1) },
    { tag: 0x8769, type: LONG, count: 1, data: long(exifAt) },
    ...(coordinate === null ? [] : [{ tag: 0x8825, type: LONG, count: 1, data: long(gpsAt) }]),
  ];

  // 데이터 영역은 모든 값이 들어갈 만큼 넉넉히 잡고 마지막에 자른다
  const tiff = Buffer.alloc(dataAt + 512);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  let next = dataAt;
  next = writeIfd(ifd0, 8, tiff, next);
  next = writeIfd(exifEntries, exifAt, tiff, next);
  if (coordinate !== null) next = writeIfd(gpsEntries, gpsAt, tiff, next);

  const body = tiff.subarray(0, next);
  const header = Buffer.alloc(10);
  header.writeUInt16BE(0xffe1, 0);
  header.writeUInt16BE(2 + 6 + body.length, 2); // 길이 필드 = 자기 2 + "Exif\0\0" 6 + TIFF
  header.write("Exif\0\0", 4, "latin1");
  return Buffer.concat([header, body]);
}

/**
 * `jpeg`의 EXIF(APP1)·IPTC(APP13)를 걷고 표가 정한 촬영 시각·좌표만 가진 새 APP1을 SOI 바로 뒤에 넣는다.
 * 그 밖의 세그먼트(JFIF APP0 등)와 이미지 데이터는 바이트 그대로 둔다. JPEG이 아니면 던진다.
 */
export function writeExif(jpeg: Buffer, input: ExifInput): Buffer {
  const segments = walkSegments(jpeg);
  const [width, height] = dimensionsOf(jpeg, segments);

  const kept: Buffer[] = [];
  for (const s of segments) {
    if (s.marker === 0xffe1 || s.marker === 0xffed) continue; // 모든 APP1(Exif·XMP)·APP13(IPTC)를 걷는다
    kept.push(jpeg.subarray(s.start, s.end));
  }

  // APP0(JFIF)이 맨 앞에 와야 하는 규약이라 APP0 뒤에 넣는다. 없으면 SOI 바로 뒤.
  const app1 = buildApp1(input, width, height);
  const out: Buffer[] = [jpeg.subarray(0, 2)];
  let inserted = false;
  for (const part of kept) {
    out.push(part);
    if (!inserted && part.readUInt16BE(0) === 0xffe0) {
      out.push(app1);
      inserted = true;
    }
  }
  if (!inserted) out.splice(1, 0, app1);
  return Buffer.concat(out);
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readDate, readLocation } from "../../scripts/seed/exif";
import { writeExif } from "../../scripts/e2e-sample/exif-write";

/**
 * 070 — 받은 사진의 EXIF를 걷고 시각·GPS를 새로 쓴다 (contracts/sample-seeding.md E-1~E-5).
 *
 * 입력은 저장소의 템플릿 JPEG(`scripts/seed-template.jpg`, 검은 단색)다. 그 안의 EXIF가 출력에 남지 않는지도 본다.
 */

const TEMPLATE = readFileSync(join(process.cwd(), "scripts", "seed-template.jpg"));
const TAKEN_AT = new Date(2026, 8, 14, 18, 5, 9); // 로컬 2026-09-14 18:05:09
const SEOUL = { latitude: 37.5683, longitude: 126.8975 };

/** 세그먼트 마커 목록 (SOI 뒤부터 SOS까지) */
function markers(buf: Buffer): number[] {
  const found: number[] = [];
  let pos = 2;
  while (pos + 4 <= buf.length) {
    const marker = buf.readUInt16BE(pos);
    if (marker < 0xff01 || marker > 0xfffe) break;
    found.push(marker);
    if (marker === 0xffda) break;
    pos += 2 + buf.readUInt16BE(pos + 2);
  }
  return found;
}

describe("writeExif (E-1~E-5)", () => {
  it("E-3: 시각을 기존 readDate로 읽는다 (초 단위 일치)", () => {
    const out = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: null });
    expect(readDate(out)?.getTime()).toBe(TAKEN_AT.getTime());
  });

  it("E-3: 좌표를 기존 readLocation으로 읽는다 (오차 < 1e-5)", () => {
    const out = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: SEOUL });
    const read = readLocation(out);
    expect(read).not.toBeNull();
    expect(Math.abs(read!.latitude - SEOUL.latitude)).toBeLessThan(1e-5);
    expect(Math.abs(read!.longitude - SEOUL.longitude)).toBeLessThan(1e-5);
  });

  it("E-3: 서반구·남반구 좌표의 부호도 왕복한다", () => {
    const out = writeExif(TEMPLATE, {
      takenAt: TAKEN_AT,
      coordinate: { latitude: -33.8688, longitude: -70.6693 },
    });
    const read = readLocation(out)!;
    expect(read.latitude).toBeCloseTo(-33.8688, 4);
    expect(read.longitude).toBeCloseTo(-70.6693, 4);
  });

  it("E-2: 좌표가 없으면 GPS IFD 자체가 없다", () => {
    const out = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: null });
    expect(readLocation(out)).toBeNull();
    // 시각 태그는 여전히 있다
    expect(readDate(out)).not.toBeNull();
  });

  it("E-2: DateTime·DateTimeOriginal·DateTimeDigitized·GPSDateStamp가 같은 날짜를 담는다", () => {
    const out = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: SEOUL });
    const text = out.toString("latin1");
    // 시각 문자열 셋 (DateTime, Original, Digitized)
    expect(text.split("2026:09:14 18:05:09").length - 1).toBe(3);
    // GPSDateStamp — 010과 같은 값(로컬 날짜)
    expect(text.split("2026:09:14\0").length - 1).toBeGreaterThanOrEqual(1);
  });

  it("E-1: APP1(Exif)은 하나뿐이고 JFIF·이미지 데이터는 바이트 그대로 보존된다", () => {
    const out = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: SEOUL });
    const exifSegments = markers(out).filter((m) => m === 0xffe1);
    expect(exifSegments).toHaveLength(1);

    // SOS 이후(압축 이미지 데이터 + EOI)가 원본과 같다
    const sosOf = (buf: Buffer): number => {
      let pos = 2;
      while (pos + 4 <= buf.length) {
        const marker = buf.readUInt16BE(pos);
        if (marker === 0xffda) return pos;
        pos += 2 + buf.readUInt16BE(pos + 2);
      }
      throw new Error("SOS 없음");
    };
    expect(out.subarray(sosOf(out)).equals(TEMPLATE.subarray(sosOf(TEMPLATE)))).toBe(true);
  });

  it("E-4: 출력은 SOI로 시작해 EOI로 끝난다", () => {
    const out = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: SEOUL });
    expect(out.readUInt16BE(0)).toBe(0xffd8);
    expect(out.readUInt16BE(out.length - 2)).toBe(0xffd9);
  });

  it("E-4: 원본 EXIF의 기기 문자열이 출력에 남지 않는다", () => {
    // 템플릿(010)의 EXIF에 든 문자열 — 실제로 있는지 먼저 단언한다(치환·부재를 조용히 지나치지 않게)
    const marker = "alphari";
    expect(TEMPLATE.toString("latin1").slice(0, 1500)).toContain(marker);
    const out = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: SEOUL });
    expect(out.toString("latin1").slice(0, 2000)).not.toContain(marker);
  });

  it("E-5: JPEG가 아니면 던진다", () => {
    expect(() =>
      writeExif(Buffer.from("not a jpeg at all"), { takenAt: TAKEN_AT, coordinate: null }),
    ).toThrow(/JPEG/);
  });

  it("EXIF가 없는 JPEG에도 쓴다 (받은 사진 상황)", () => {
    const stripped = writeExif(TEMPLATE, { takenAt: TAKEN_AT, coordinate: null });
    // 한 번 쓴 결과를 다시 쓰면 앞의 것이 걷히고 새 시각이 남는다
    const later = new Date(2026, 8, 15, 7, 0, 0);
    const again = writeExif(stripped, { takenAt: later, coordinate: SEOUL });
    expect(readDate(again)?.getTime()).toBe(later.getTime());
    expect(markers(again).filter((m) => m === 0xffe1)).toHaveLength(1);
  });
});

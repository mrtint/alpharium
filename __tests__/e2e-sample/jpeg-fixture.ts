/**
 * 084 — 테스트용 작은 JPEG. SOI · APP0(JFIF) · SOF0(폭·높이) · EOI만 있다(이미지 데이터 없음).
 * `jpegSize`가 읽는 자리(SOF 세그먼트)만 진짜 JPEG와 같은 모양이다. `seed`로 바이트를 다르게 만든다(같은 크기의 다른 「변형」).
 */
export function tinyJpeg(width: number, height: number, seed = 0): Buffer {
  const app0 = Buffer.from([
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x01,
    0x00,
    0x00,
    0x01,
    0x00,
    0x01,
    0x00,
    seed & 0xff,
  ]);
  const sof0 = Buffer.from([
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x22,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof0, Buffer.from([0xff, 0xd9])]);
}

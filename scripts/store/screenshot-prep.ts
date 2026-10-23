/**
 * 102 — 스토어 스크린샷 후처리의 순수 코어. 계약: specs/102-app-icon-store-assets/contracts/store-assets.md (S4)
 *
 * 두 스토어는 스크린샷에 알파 채널을 허용하지 않는다(App Store: 「can't include alpha channels」, Play: 24비트 PNG).
 * 기기 캡처(안드로이드 `screencap`·iOS)는 RGBA로 나올 수 있어, 모든 픽셀이 불투명임을 확인하고 RGB(색 유형 2)로 다시 쓴다.
 * 투명한 픽셀이 있으면 실패한다 — 배경을 임의로 채워 그림을 바꾸지 않는다(원칙 V).
 */

import { PNG } from "pngjs";

/** PNG의 색 유형(IHDR 바이트 25). 2 = RGB, 6 = RGBA */
export function pngColorType(png: Buffer): number {
  return png[25];
}

/** 위에서부터 `height`줄만 남긴다(아래를 자른다). 이미 그보다 낮으면 그대로 둔다. */
export function cropToHeight(input: Buffer, height: number): Buffer {
  const image = PNG.sync.read(input);
  if (image.height <= height) return input;
  const cropped = new PNG({ width: image.width, height });
  image.data.copy(cropped.data, 0, 0, image.width * height * 4);
  return PNG.sync.write(cropped, { colorType: 6, inputColorType: 6 });
}

export function toRgbPng(input: Buffer): Buffer {
  const image = PNG.sync.read(input);
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] !== 255) {
      throw new Error(`투명한 픽셀이 있다(픽셀 ${(i - 3) / 4}, 알파 ${image.data[i]}) — 스크린샷이 아니다`);
    }
  }
  return PNG.sync.write(image, { colorType: 2, inputColorType: 6 });
}

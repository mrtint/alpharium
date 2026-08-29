import { readFileSync } from "node:fs";
import { join } from "node:path";

import { folderNameOf } from "../../src/signals/expo-port";

/**
 * 023 — 파일 경로/URI에서 상위 폴더 이름 뽑기.
 *
 * 계약: specs/023-photo-selection-algorithm/data-model.md §5
 *       specs/023-photo-selection-algorithm/quickstart.md T5
 *
 * `photosBetween()`·`folderNamesFor()`의 `getUri()` 호출부는 기기에서만
 * 확인한다(004의 경계 — `expo-port.ts`는 실기기 검증). 여기서는 순수 문자열
 * 파싱과 경계 규율만 잠근다.
 */
describe("folderNameOf", () => {
  it.each([
    ["file:///storage/emulated/0/DCIM/Camera/IMG_20230915_123456.jpg", "Camera"],
    ["/storage/emulated/0/DCIM/Camera/IMG_1.jpg", "Camera"],
    ["file:///storage/emulated/0/Pictures/Screenshots/Screenshot_1.png", "Screenshots"],
    ["/storage/emulated/0/Download/received.jpg", "Download"],
    ["file:///storage/emulated/0/Pictures/KakaoTalk/KakaoTalk_1.jpg", "KakaoTalk"],
  ])("%s → %s", (input, expected) => {
    expect(folderNameOf(input)).toBe(expected);
  });

  it.each<[string | null | undefined, string]>([
    ["content://media/external/images/media/1000000871", "content:// URI (폴더 구간 없음)"],
    ["", "빈 문자열"],
    [null, "null"],
    [undefined, "undefined"],
    ["justafilename.jpg", "슬래시 없는 문자열"],
    ["/onlyroot.jpg", "루트 바로 아래 (앞 폴더가 없음)"],
  ])("%s → undefined (%s)", (input) => {
    expect(folderNameOf(input)).toBeUndefined();
  });
});

/**
 * 023 T041 — `photosBetween()`은 폴더 이름을 채우지 않는다. `filePathOf()`가
 * 세운 경계("PhotoFacts에 담지 않고 함수로 둔다")를 잇는다 — 장수만 세는 004
 * 경로가 `getUri()` 왕복을 치르지 않게 하려는 것이다.
 */
describe("photosBetween이 폴더 이름을 미리 채우지 않는다 (023 T041, 011 경계)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/signals/expo-port.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("photosBetween의 map이 folderName을 넣지 않는다", () => {
    const body = CODE.match(/async photosBetween\([^)]*\)[^{]*\{([\s\S]*?)\n {4}\}/);
    expect(body).not.toBeNull();
    expect(body?.[1] ?? "").not.toMatch(/folderName/);
    // getUri()도 이 함수 안에서 부르지 않는다.
    expect(body?.[1] ?? "").not.toMatch(/getUri/);
  });

  it("folderNamesFor가 계약에 있다 — 폴더 이름은 이 함수로만 얻는다", () => {
    expect(CODE).toMatch(/async folderNamesFor\(/);
  });
});

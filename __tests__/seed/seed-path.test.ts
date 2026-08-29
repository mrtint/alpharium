import { folderNameOf } from "../../src/signals/expo-port";
import { SEED_FOLDER, seedPathFor } from "../../scripts/seed/device";

/**
 * 023 Phase 8 — `seedPathFor()`는 파일이 어디 심길지 정하는 순수 함수다.
 *
 * 계약: specs/023-photo-selection-algorithm/tasks.md T054
 *
 * `folderNameOf()`(읽는 쪽)의 대칭. `device.ts`의 나머지는 adb 경계라
 * 실기기에서 확인하지만(010), 이 순수 함수는 여기서 잠근다.
 */
describe("seedPathFor", () => {
  it("folder 없으면 SEED_FOLDER 바로 아래 (기존 동작)", () => {
    expect(seedPathFor("2026-08-20-000.jpg")).toBe(`${SEED_FOLDER}/2026-08-20-000.jpg`);
  });

  it("folder 있으면 SEED_FOLDER/<folder>/ 아래", () => {
    expect(seedPathFor("x.jpg", "Screenshots")).toBe(`${SEED_FOLDER}/Screenshots/x.jpg`);
    expect(seedPathFor("x.jpg", "Download")).toBe(`${SEED_FOLDER}/Download/x.jpg`);
    expect(seedPathFor("x.jpg", "Camera")).toBe(`${SEED_FOLDER}/Camera/x.jpg`);
  });

  it("결과가 항상 SEED_FOLDER로 시작한다 — 폴더 밖으로 안 나간다 (FR-016a)", () => {
    for (const folder of [undefined, "Camera", "Screenshots", "Download"] as const) {
      expect(seedPathFor("a.jpg", folder).startsWith(`${SEED_FOLDER}/`)).toBe(true);
    }
  });

  it("folderNameOf와 왕복한다 — seedPathFor가 만든 경로에서 folder를 되뽑는다", () => {
    // 023의 분류가 실기기에서 이 경로를 볼 때 `folderNameOf()`가 그 폴더
    // 이름을 뽑아 잡사진으로 갈라내야 한다.
    expect(folderNameOf(`file://${seedPathFor("s.jpg", "Screenshots")}`)).toBe("Screenshots");
    expect(folderNameOf(`file://${seedPathFor("d.jpg", "Download")}`)).toBe("Download");
    // folder 미지정이면 마지막 폴더는 "AlphariumSeed" — 잡사진 목록에 없어
    // 카메라 원본으로 분류된다(의도된 동작).
    expect(folderNameOf(`file://${seedPathFor("c.jpg")}`)).toBe("AlphariumSeed");
  });
});

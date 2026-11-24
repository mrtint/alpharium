import { isCameraPhoto } from "../../src/signals/camera-only";
import { SEED_FOLDER, seedPathFor } from "../../scripts/seed/device";

/**
 * 023 Phase 8 — `seedPathFor()`는 파일이 어디 심길지 정하는 순수 함수다.
 *
 * 계약: specs/023-photo-selection-algorithm/tasks.md T054
 *
 * 129 — 읽는 쪽(`isCameraPhoto`)과의 대칭. `device.ts`의 나머지는 adb 경계라
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

  it("camera-only 판정과 왕복한다 — 개발 환경에서 Camera·바로 아래만 카메라 사진 (129)", () => {
    const facts = (path: string) => ({
      id: "1",
      takenAtMs: 1,
      localPath: path.replace(/^\/sdcard/, "/storage/emulated/0"),
    });
    const dev = { allowSeed: true };
    expect(isCameraPhoto(facts(seedPathFor("c.jpg")), dev)).toBe(true);
    expect(isCameraPhoto(facts(seedPathFor("c.jpg", "Camera")), dev)).toBe(true);
    expect(isCameraPhoto(facts(seedPathFor("s.jpg", "Screenshots")), dev)).toBe(false);
    expect(isCameraPhoto(facts(seedPathFor("d.jpg", "Download")), dev)).toBe(false);
    // 배포 판정이면 시딩은 하나도 아니다
    expect(isCameraPhoto(facts(seedPathFor("c.jpg")), { allowSeed: false })).toBe(false);
  });
});

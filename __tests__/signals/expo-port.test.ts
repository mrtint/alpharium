import { readFileSync } from "node:fs";
import { join } from "node:path";

import { factsOfLegacyAsset, newApiIdOf } from "../../src/signals/expo-port";

/**
 * 129 — 레거시 목록 조회의 사진 하나를 사실로 옮긴다(판정 없음).
 * 계약: specs/129-camera-only-photos/contracts/camera-only.md, research R1·R2
 */
describe("factsOfLegacyAsset", () => {
  it("안드로이드 file:// 경로를 localPath로 싣는다", () => {
    expect(
      factsOfLegacyAsset({
        id: "1",
        uri: "file:///storage/emulated/0/DCIM/Camera/IMG_1.jpg",
        creationTime: 1000,
        filename: "IMG_1.jpg",
        width: 4000,
        height: 3000,
      }),
    ).toEqual({
      id: "content://media/external/images/media/1",
      takenAtMs: 1000,
      localPath: "/storage/emulated/0/DCIM/Camera/IMG_1.jpg",
      filename: "IMG_1.jpg",
      width: 4000,
      height: 3000,
    });
  });

  it("iOS ph:// 는 경로로 싣지 않고 mediaSubtypes를 싣는다", () => {
    expect(
      factsOfLegacyAsset({
        id: "A/L0/001",
        uri: "ph://A",
        creationTime: 5,
        mediaSubtypes: ["screenshot"],
      }),
    ).toEqual({ id: "ph://A/L0/001", takenAtMs: 5, mediaSubtypes: ["screenshot"] });
  });

  it("모르는 값(0·null·빈 문자열)은 싣지 않는다", () => {
    expect(
      factsOfLegacyAsset({
        id: "1",
        uri: "",
        creationTime: 0,
        filename: null,
        width: 0,
        height: null,
      }),
    ).toEqual({ id: "content://media/external/images/media/1", takenAtMs: null });
  });

  it('_data가 NULL이라 "file://null"이면 경로를 모른다', () => {
    expect(factsOfLegacyAsset({ id: "7", uri: "file://null", creationTime: 1 })).not.toHaveProperty(
      "localPath",
    );
  });
});

/**
 * 129 리뷰 — 레거시 id는 새 API id와 다르다. 옮기지 않으면 locationOf·filePathOf(새 API `new Asset(id)`)가 조용히 실패한다.
 * 기대값은 설치본 소스에서 읽은 꼴이다: 안드로이드 `AssetMapper.kt`(content URI), iOS `AssetMapper.swift`(`ph://`).
 */
describe("newApiIdOf", () => {
  it("안드로이드 _ID → 이미지 content URI", () => {
    expect(newApiIdOf("1000000871", "file:///storage/emulated/0/DCIM/Camera/a.jpg")).toBe(
      "content://media/external/images/media/1000000871",
    );
  });
  it("iOS localIdentifier → ph://", () => {
    expect(newApiIdOf("ABC-123/L0/001", "ph://ABC-123/L0/001")).toBe("ph://ABC-123/L0/001");
    expect(newApiIdOf("ph://ABC-123/L0/001", "ph://ABC-123/L0/001")).toBe("ph://ABC-123/L0/001");
  });
  it("알아보지 못하면 그대로 둔다", () => {
    expect(newApiIdOf("content://x/1", "")).toBe("content://x/1");
  });
});

/**
 * 129 SC-004 — 목록 조회가 출처를 얻으려 사진마다 경로를 풀지 않는다(2026-11-09 멈춤 호출).
 */
describe("photosBetween은 경로를 푸는 호출을 하지 않는다 (129 SC-004)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/signals/expo-port.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const body = CODE.match(/async photosBetween\([^)]*\)[^{]*\{([\s\S]*?)\n {4}\}/)?.[1] ?? "";

  it("레거시 getAssetsAsync 한 가지로 읽는다", () => {
    expect(body).toMatch(/getAssetsAsync\(/);
  });

  it("getUri·getAssetInfoAsync·EXIF를 부르지 않는다", () => {
    expect(body).not.toMatch(/getUri|getAssetInfoAsync|getExif|resolveWithFullInfo:\s*true/);
  });

  it("폴더를 얻는 별도 통로가 없다", () => {
    expect(CODE).not.toMatch(/folderNamesFor|folderNameOf/);
  });

  it("판정을 하지 않는다 — camera-only를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/camera-only|isCameraPhoto/);
  });
});

/**
 * 073 — expo-media-library의 Asset 인스턴스 JS GC 조기 회수 방지.
 *
 * await 직전 임시 객체 생성을 금지하고, 로컬 변수 바인딩 및 await 완료 후 참조 유지를 검증한다.
 */
describe("Asset 참조 수명 보장 (073 SharedObject GC 레이스 방어)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/signals/expo-port.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("filePathOf가 new lib.Asset을 로컬 변수에 할당하고 참조를 유지한다", () => {
    const fn = CODE.match(/async filePathOf\([^)]*\)[^{]*\{([\s\S]*?)\n {4}\}/)?.[1] ?? "";
    expect(fn).toMatch(/const\s+asset\s*=\s*new\s+lib\.Asset/);
    expect(fn).not.toMatch(/await\s+new\s+lib\.Asset/);
    expect(fn).toMatch(/asset\.id/);
  });

  it("locationOf가 new lib.Asset을 로컬 변수에 할당하고 참조를 유지한다", () => {
    const fn = CODE.match(/async locationOf\([^)]*\)[^{]*\{([\s\S]*?)\n {4}\}/)?.[1] ?? "";
    expect(fn).toMatch(/const\s+asset\s*=\s*new\s+lib\.Asset/);
    expect(fn).not.toMatch(/await\s+new\s+lib\.Asset/);
    expect(fn).toMatch(/asset\.id/);
  });
});

/**
 * 2026-11-09 — `getUri()`는 기다림 한도(`readUriWithin`) 안에서만 부른다. 사진 서비스가 바뀐 뒤 깨어난 프로세스에서 콜백이 오지
 * 않아 백그라운드 쓰기가 예산까지 멈췄다(`__tests__/signals/uri-deadline.test.ts`).
 */
describe("getUri는 기다림 한도 안에서만 부른다", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/signals/expo-port.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it.each(["filePathOf"])("%s가 readUriWithin으로 getUri를 감싼다", (name) => {
    const fn =
      CODE.match(new RegExp(`async ${name}\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n {4}\\}`))?.[1] ?? "";
    expect(fn).toMatch(/await readUriWithin\(\(\) => asset\.getUri\(\)\)/);
  });

  it("맨 getUri 호출이 남아 있지 않다", () => {
    expect(CODE).not.toMatch(/await\s+asset\.getUri\(\)/);
  });
});

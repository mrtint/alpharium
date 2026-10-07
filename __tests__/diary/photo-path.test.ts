/**
 * 066 — 일기에 저장된 사진 사본 경로를 지금의 앱 디렉터리로 옮긴다.
 *
 * iOS는 앱을 업데이트하면 데이터 컨테이너 경로(`/var/mobile/Containers/Data/Application/<UUID>/`)가
 * 바뀐다. 일기 파일에 절대 경로로 남은 사본 경로는 그 순간 죽은 경로가 되어 「이 사진은 이제 없어요」가
 * 뜬다. 사본은 늘 `Paths.document/vision-cache/<파일명>`에 있으므로 읽을 때 파일명만 살려 지금의 자리로
 * 옮긴다 — 저장 형식(절대 경로)은 그대로 두어 옛 일기도 같은 규칙으로 산다.
 */

import { VISION_CACHE_DIRECTORY, rehomeResizedPath } from "../../src/diary/photo-path";
import { fileStore, type FileSystemPort, serializeEntry } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { partiallyUnknownDay } from "../../src/signals/fake";

const OLD_DOC = "/var/mobile/Containers/Data/Application/OLD-UUID/Documents";
const NEW_DOC = "/var/mobile/Containers/Data/Application/NEW-UUID/Documents";

describe("066 PP — rehomeResizedPath", () => {
  it("사본 디렉터리 안의 경로는 지금의 문서 디렉터리로 옮긴다", () => {
    const stored = `${OLD_DOC}/${VISION_CACHE_DIRECTORY}/IMG_0010.jpg`;
    expect(rehomeResizedPath(stored, NEW_DOC)).toBe(
      `${NEW_DOC}/${VISION_CACHE_DIRECTORY}/IMG_0010.jpg`,
    );
  });

  it("문서 디렉터리 끝의 슬래시는 한 번만 들어간다", () => {
    const stored = `${OLD_DOC}/${VISION_CACHE_DIRECTORY}/a.jpg`;
    expect(rehomeResizedPath(stored, `${NEW_DOC}/`)).toBe(
      `${NEW_DOC}/${VISION_CACHE_DIRECTORY}/a.jpg`,
    );
  });

  it("사본 디렉터리 밖의 경로(리사이즈를 건너뛴 원본)는 그대로 둔다", () => {
    const original = "/storage/emulated/0/DCIM/Camera/20261008_120000.jpg";
    expect(rehomeResizedPath(original, NEW_DOC)).toBe(original);
  });

  it("이미 지금 자리에 있는 경로는 바뀌지 않는다", () => {
    const current = `${NEW_DOC}/${VISION_CACHE_DIRECTORY}/a.jpg`;
    expect(rehomeResizedPath(current, NEW_DOC)).toBe(current);
  });
});

describe("066 PP — fileStore.load가 사본 경로를 옮긴다", () => {
  function fakeFs(files: Record<string, string>, documentDirectory?: string): FileSystemPort {
    return {
      async read(name) {
        return files[name] ?? null;
      },
      async writeAtomically(name, contents) {
        files[name] = contents;
      },
      async list() {
        return Object.keys(files);
      },
      async remove(name) {
        delete files[name];
      },
      ...(documentDirectory === undefined
        ? {}
        : { documentDirectory: async () => documentDirectory }),
    };
  }

  const entry: DiaryEntry = {
    date: "2026-10-08",
    text: "일기",
    character: "quiet",
    signalsUsed: partiallyUnknownDay("2026-10-08"),
    createdAt: new Date("2026-10-08T20:00:00"),
    photos: [
      {
        photoId: "ph://A/L0/001",
        takenAt: new Date("2026-10-08T10:00:00"),
        resizedPath: `${OLD_DOC}/${VISION_CACHE_DIRECTORY}/ph___A_L0_001.jpg`,
      },
      {
        photoId: "ph://B/L0/001",
        takenAt: new Date("2026-10-08T11:00:00"),
        resizedPath: "/somewhere/original.jpg",
      },
    ],
  };

  it("통로가 문서 디렉터리를 알면 읽은 일기의 사본 경로가 지금 자리다", async () => {
    const store = fileStore(fakeFs({ "2026-10-08.json": serializeEntry(entry) }, NEW_DOC));
    const loaded = await store.load("2026-10-08");
    expect(loaded?.photos?.map((p) => p.resizedPath)).toEqual([
      `${NEW_DOC}/${VISION_CACHE_DIRECTORY}/ph___A_L0_001.jpg`,
      "/somewhere/original.jpg",
    ]);
  });

  it("통로가 문서 디렉터리를 모르면 저장된 경로 그대로다", async () => {
    const store = fileStore(fakeFs({ "2026-10-08.json": serializeEntry(entry) }));
    const loaded = await store.load("2026-10-08");
    expect(loaded?.photos?.[0]?.resizedPath).toBe(entry.photos?.[0]?.resizedPath);
  });

  it("저장 형식은 바뀌지 않는다 — 파일에는 절대 경로가 그대로 남는다", async () => {
    const files: Record<string, string> = {};
    await fileStore(fakeFs(files, NEW_DOC)).save(entry);
    expect(files["2026-10-08.json"]).toContain(`${OLD_DOC}/${VISION_CACHE_DIRECTORY}/`);
  });
});

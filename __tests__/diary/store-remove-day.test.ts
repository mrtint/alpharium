/**
 * 106 — 일기 하나 지우기 (`DiaryStore.removeDay`).
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/cycle-reset.md CR5 · spec FR-008
 *
 * 빠른 주기 리셋이 오늘의 일기 하나만 지운다. 일기 파일(`YYYY-MM-DD.json`)과 그 임시 파일(`.writing`)만 — 다른 날·다른 이름은 건드리지 않는다.
 */

import { fileStore, memoryStore, type FileSystemPort } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { emptyDay } from "../../src/signals/fake";

function memoryFs(initial: Record<string, string>, failOn: string[] = []) {
  const files = new Map(Object.entries(initial));
  const removed: string[] = [];
  const port: FileSystemPort = {
    async read(name) {
      return files.get(name) ?? null;
    },
    async writeAtomically(name, contents) {
      files.set(name, contents);
    },
    async list() {
      return [...files.keys()];
    },
    async remove(name) {
      removed.push(name);
      if (failOn.includes(name)) throw new Error(`못 지움: ${name}`);
      files.delete(name);
    },
  };
  return { port, files, removed };
}

const entry = (date: string): DiaryEntry => ({
  date,
  text: `${date}의 일기`,
  character: "quiet",
  signalsUsed: emptyDay(date),
  createdAt: new Date(`${date}T20:00:00`),
});

describe("removeDay — 메모리 저장소", () => {
  it("그 날만 지우고 다른 날은 남긴다", async () => {
    const store = memoryStore();
    await store.save(entry("2026-10-26"));
    await store.save(entry("2026-10-25"));
    await store.removeDay("2026-10-26");
    expect(await store.listDays()).toEqual(["2026-10-25"]);
    expect(await store.has("2026-10-26")).toBe(false);
  });

  it("없는 날은 조용히 넘어간다", async () => {
    const store = memoryStore();
    await expect(store.removeDay("2026-10-26")).resolves.toBeUndefined();
  });
});

describe("removeDay — 파일 저장소", () => {
  it("그 날의 일기 파일과 임시 파일만 지우고, 다른 날·다른 이름은 건드리지 않는다", async () => {
    const { port, removed, files } = memoryFs({
      "2026-10-26.json": "{}",
      "2026-10-26.json.writing": "{",
      "2026-10-25.json": "{}",
      "notes.txt": "x",
    });
    await fileStore(port).removeDay("2026-10-26");
    expect([...removed].sort()).toEqual(["2026-10-26.json", "2026-10-26.json.writing"]);
    expect([...files.keys()].sort()).toEqual(["2026-10-25.json", "notes.txt"]);
  });

  it("지운 뒤 listDays에서 사라지고 다른 날은 남는다", async () => {
    const { port } = memoryFs({});
    const store = fileStore(port);
    await store.save(entry("2026-10-26"));
    await store.save(entry("2026-10-25"));
    await store.removeDay("2026-10-26");
    expect(await store.listDays()).toEqual(["2026-10-25"]);
  });

  it("없는 날은 아무것도 지우지 않고 조용히 넘어간다", async () => {
    const { port, removed } = memoryFs({ "2026-10-25.json": "{}" });
    await expect(fileStore(port).removeDay("2026-10-26")).resolves.toBeUndefined();
    expect(removed).toEqual([]);
  });

  it("하나가 실패해도 다른 하나를 지우고 끝에 첫 오류를 던진다", async () => {
    const { port, files } = memoryFs({ "2026-10-26.json": "{}", "2026-10-26.json.writing": "{" }, [
      "2026-10-26.json",
    ]);
    await expect(fileStore(port).removeDay("2026-10-26")).rejects.toThrow("못 지움");
    expect(files.has("2026-10-26.json.writing")).toBe(false);
  });
});

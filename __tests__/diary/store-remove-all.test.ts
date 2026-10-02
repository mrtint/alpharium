/**
 * 058 — 일기 모두 지우기의 저장소 쪽 (`DiaryStore.removeAll`).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md ST1~ST6
 *
 * 파일 구현은 **일기 파일 이름(`YYYY-MM-DD.json`)과 그 임시 파일(`.writing`)만** 지운다 — 디렉터리를 통째로 지우지 않는다
 * (research R4). 메모리 `FileSystemPort` 대역으로 `remove` 호출을 기록해 본다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

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

describe("ST — fileStore.removeAll", () => {
  it("ST1 — 지운 뒤 listDays()는 []다", async () => {
    const { port } = memoryFs({});
    const store = fileStore(port);
    await store.save(entry("2026-10-01"));
    await store.save(entry("2026-09-30"));
    expect(await store.listDays()).toHaveLength(2);
    await store.removeAll();
    expect(await store.listDays()).toEqual([]);
  });

  it("★ ST2·ST3 — 일기 파일·임시 파일·깨진 일기만 지우고 다른 이름은 건드리지 않는다", async () => {
    const { port, removed, files } = memoryFs({
      "2026-10-01.json": "{}",
      "2026-10-01.json.writing": "반쯤",
      "2026-09-30.json": "{",
      "notes.txt": "x",
      "2026-10-01.bak": "x",
      "2026-10-01.json.tmp": "x",
    });
    await fileStore(port).removeAll();
    expect([...removed].sort()).toEqual(
      ["2026-09-30.json", "2026-10-01.json", "2026-10-01.json.writing"].sort(),
    );
    expect([...files.keys()].sort()).toEqual(
      ["2026-10-01.bak", "2026-10-01.json.tmp", "notes.txt"].sort(),
    );
  });

  it("ST4 — 한 파일이 실패해도 나머지를 지우고 끝에 첫 오류를 던진다", async () => {
    const { port, removed, files } = memoryFs(
      { "2026-10-01.json": "{}", "2026-10-02.json": "{}", "2026-10-03.json": "{}" },
      ["2026-10-01.json"],
    );
    await expect(fileStore(port).removeAll()).rejects.toThrow("못 지움: 2026-10-01.json");
    expect(removed).toHaveLength(3);
    expect([...files.keys()]).toEqual(["2026-10-01.json"]);
  });
});

describe("ST5 — memoryStore.removeAll", () => {
  it("지운 뒤 listDays()는 []이고 has()는 거짓이다", async () => {
    const store = memoryStore();
    await store.save(entry("2026-10-01"));
    await store.removeAll();
    expect(await store.listDays()).toEqual([]);
    expect(await store.has("2026-10-01")).toBe(false);
  });
});

describe("ST6 — expoFileSystemPort.remove (소스 계약)", () => {
  it("있을 때만 지운다 — exists 확인 뒤 delete()", () => {
    const source = readFileSync(join(__dirname, "../../src/diary/store.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const start = source.indexOf("async remove(name)");
    expect(start).toBeGreaterThan(0);
    const body = source.slice(start, start + 300);
    expect(body).toMatch(/\.exists\)[\s\S]*\.delete\(\)/);
  });
});

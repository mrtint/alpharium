import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  ALLOWED_LICENSES,
  CATALOG_PATH,
  loadCatalog,
  validateCatalog,
  type CatalogPhoto,
} from "../../scripts/e2e-sample/catalog";
import { PHOTO_TAGS } from "../../scripts/e2e-sample/manifest";

/**
 * 070 — 사진 목록 검증 (contracts/sample-manifest.md C-1~C-6).
 *
 * 앞쪽은 가짜 목록으로 검증 규칙 자체를 본다. 마지막 묶음은 진짜 `photos.json`이다(T014 뒤에 통과한다).
 */

const SHA = "a".repeat(64);

function validList(): CatalogPhoto[] {
  const list: CatalogPhoto[] = [];
  PHOTO_TAGS.forEach((tag, t) => {
    // 태그마다 30장 = 210장 (200~260)
    for (let i = 0; i < 30; i += 1) {
      list.push({
        file: `commons-${tag}-${i}.jpg`,
        url: `https://upload.wikimedia.org/wikipedia/commons/thumb/x/${t}${i}/960px-f.jpg`,
        sha256: SHA,
        license: "CC0",
        sourcePage: `https://commons.wikimedia.org/wiki/File:F${t}${i}.jpg`,
        checkedOn: "2026-10-10",
        tags: [tag],
        widthPx: 960,
      });
    }
  });
  return list;
}

describe("validateCatalog (C-1~C-5)", () => {
  it("올바른 목록은 통과한다", () => {
    expect(validateCatalog(validList()).ok).toBe(true);
  });

  it("C-2: 허용 라이선스는 CC0·PD 둘뿐이다", () => {
    expect(ALLOWED_LICENSES).toEqual(["CC0", "PD"]);
    const list = validList();
    (list[0] as { license: string }).license = "CC-BY-SA-4.0";
    const result = validateCatalog(list);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join("\n")).toMatch(/허용되지 않는 라이선스/);
  });

  it("C-3: url은 upload.wikimedia.org, 출처는 commons.wikimedia.org여야 한다", () => {
    const list = validList();
    list[0] = { ...list[0], url: "https://example.com/a.jpg" };
    list[1] = { ...list[1], sourcePage: "https://example.com/wiki" };
    const result = validateCatalog(list);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems.join("\n")).toMatch(/url이/);
      expect(result.problems.join("\n")).toMatch(/sourcePage가/);
    }
  });

  it("C-1: sha256은 64 hex여야 하고 빈 값은 기록 모드에서만 허용된다", () => {
    const list = validList();
    list[0] = { ...list[0], sha256: "" };
    expect(validateCatalog(list).ok).toBe(false);
    expect(validateCatalog(list, { allowEmptyHashes: true }).ok).toBe(true);
    list[1] = { ...list[1], sha256: "XYZ" };
    expect(validateCatalog(list, { allowEmptyHashes: true }).ok).toBe(false);
  });

  it("C-1: 필수 필드가 빠지면 이유와 함께 실패한다", () => {
    const result = validateCatalog([{ file: "a.jpg" }]);
    expect(result.ok).toBe(false);
  });

  it("C-4: 태그마다 최소 20장이어야 한다", () => {
    // night을 19장만 남기고 장수 범위(200~260)는 indoor 사본으로 채운다
    const nightFiles = validList()
      .filter((p) => p.tags[0] === "night")
      .slice(0, 19)
      .map((p) => p.file);
    const list = validList().filter((p) => p.tags[0] !== "night" || nightFiles.includes(p.file));
    const indoor = list.find((p) => p.tags[0] === "indoor")!;
    for (let i = 0; list.length < 201; i += 1) list.push({ ...indoor, file: `fill-${i}.jpg` });
    const result = validateCatalog(list);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(", ")).toMatch(/태그 night가 19장/);
  });

  it("C-5: 서로 다른 파일은 200~260장이어야 한다", () => {
    expect(validateCatalog(validList().slice(0, 20)).ok).toBe(false);
    const many = validList();
    for (let i = 0; i < 60; i += 1) many.push({ ...many[0], file: `extra-${i}.jpg` });
    expect(validateCatalog(many).ok).toBe(false);
  });

  it("file 이름이 겹치거나 안전하지 않으면 실패한다", () => {
    const dup = validList();
    dup[1] = { ...dup[1], file: dup[0].file };
    expect(validateCatalog(dup).ok).toBe(false);
    const unsafe = validList();
    unsafe[0] = { ...unsafe[0], file: "../evil.jpg" };
    expect(validateCatalog(unsafe).ok).toBe(false);
  });
});

describe("진짜 photos.json (C-1~C-6)", () => {
  it("파일이 있고 모든 항목이 규칙을 지킨다", () => {
    expect(existsSync(CATALOG_PATH())).toBe(true);
    const result = loadCatalog();
    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it("C-6: 저장소에 이 경로 아래 jpg가 추적되지 않는다", () => {
    let tracked = "";
    try {
      tracked = execFileSync("git", ["ls-files", "scripts/e2e-sample"], {
        cwd: process.cwd(),
        encoding: "utf8",
      });
    } catch {
      // git이 없는 환경이면 검사하지 않는다
      return;
    }
    expect(tracked).not.toMatch(/\.jpe?g/i);
    // 캐시 경로는 gitignore에 있다
    expect(existsSync(join(process.cwd(), ".gitignore"))).toBe(true);
  });
});

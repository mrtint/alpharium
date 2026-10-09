/**
 * expo-file-system 파일 객체의 비동기 호출 금지 (2026-10-09 실기기 결함).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **강제 종료 후 다시 열면 멀쩡한 일기가 가끔 「이 날의 일기 파일이 손상됐어요」로 보였다.** 실기기(SM-G986N, dev) 로그:
 *
 *   Call to function 'FileSystemFile.text' has been rejected.
 *   → Caused by: The 1st argument cannot be cast to type class expo.modules.filesystem.FileSystemFile (received class java.lang.Integer)
 *   → Caused by: Cannot use shared object that was already released
 *
 * `new File(dir, name)`은 네이티브 공유 객체다. `file.text()`는 **비동기**라 네이티브가 인자를 꺼내기 전에 JS 쪽 `file`이
 * 더 쓰이지 않으면 가비지 컬렉션이 그 공유 객체를 놓아 버린다 — GC 시점에 달린 조용한 실패라 늘 나지 않는다. `listDiaries`·홈의
 * 읽기는 그 거부를 「읽을 수 없음」으로 삼킨다. 같은 꼴(`file.exists ? file.text() : null`)이 온보딩 플래그·설정·잠금 등 열세 곳에
 * 있었고, 이름 저장(`names-port.ts`)은 비동기 `move()`를 기다리지도 않았다.
 *
 * **처방: 작은 파일은 동기 API(`textSync`·`moveSync`·`copySync`)로 읽고 옮긴다** — 호출이 끝날 때까지 객체가 살아 있다. 이미 쓰기·
 * 지우기·옮기기는 동기였다(메모리 「expo-file-system 57 API」). jest는 이 런타임(공유 객체·GC)이 없어 동작으로 못 잡는다 — 소스를 센다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** expo-file-system을 불러오는 소스 파일 (정적·동적 import, require 모두) */
const PORT_FILES = [...filesUnder(join(ROOT, "src")), join(ROOT, "App.tsx")]
  .filter((file) => /["']expo-file-system["']/.test(readFileSync(file, "utf8")))
  .map((file) => relative(ROOT, file).replace(/\\/g, "/"));

describe("expo-file-system — 파일 객체의 비동기 호출 금지", () => {
  it("검사 대상이 있다 (경로가 바뀌어 빈 목록으로 초록이 되지 않게)", () => {
    expect(PORT_FILES).toContain("src/diary/store.ts");
    expect(PORT_FILES.length).toBeGreaterThanOrEqual(10);
  });

  it.each(PORT_FILES)("%s — text()/bytes()/base64()가 아니라 *Sync()로 읽는다", (file) => {
    const code = strip(readFileSync(join(ROOT, file), "utf8"));
    expect(code).not.toMatch(/\.(text|bytes|base64)\(\)/);
  });

  it.each(PORT_FILES)("%s — move()/copy()가 아니라 moveSync()/copySync()로 옮긴다", (file) => {
    const code = strip(readFileSync(join(ROOT, file), "utf8"));
    expect(code).not.toMatch(/\.(move|copy)\(/);
  });
});

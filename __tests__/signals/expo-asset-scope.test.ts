/**
 * expo-media-library Asset 인스턴스의 임시 객체 비동기 호출 금지 (073 실기기 결함 방어).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **사진이 있는 날인데도 "사진 속을 보지 못했다"라는 거짓 일기가 저장됐다.**
 *
 * `new lib.Asset(id)`는 JSI/C++ 네이티브 공유 객체(`SharedObject`)다.
 * `await new lib.Asset(id).getUri()` 처럼 임시 표현식으로 즉시 호출하면,
 * VLM 로드 등 네이티브 힙 메모리 압박 시 Hermes GC가 JS 스택 참조가 없는 임시 Asset을
 * 조기 회수하여 `Cannot use shared object that was already released` 예외가 발생한다.
 *
 * `filePathOf`의 `catch`가 조용히 `null`을 반환하고 `captionAll`이 스킵하여 N장 사진이
 * 0초 만에 전부 건너뛰어지며, 프롬프트 엔진이 unread로 분류해 거짓 일기를 확정 저장했다.
 *
 * **처방: Asset 인스턴스는 로컬 변수로 바인딩하고 await 완료 시점까지 참조를 유지한다.**
 * Jest에는 이 네이티브 런타임(SharedObject·Hermes GC)이 없으므로 소스를 직접 읽어 잠근다.
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

/** expo-media-library를 불러오는 소스 파일 */
const MEDIA_FILES = [...filesUnder(join(ROOT, "src")), join(ROOT, "App.tsx")]
  .filter((file) => /["']expo-media-library["']/.test(readFileSync(file, "utf8")))
  .map((file) => relative(ROOT, file).replace(/\\/g, "/"));

describe("expo-media-library — Asset 인스턴스의 임시 객체 비동기 호출 금지 (073)", () => {
  it("검사 대상이 있다 (src/signals/expo-port.ts 포함)", () => {
    expect(MEDIA_FILES).toContain("src/signals/expo-port.ts");
    expect(MEDIA_FILES.length).toBeGreaterThanOrEqual(1);
  });

  it.each(MEDIA_FILES)(
    "%s — new ...Asset() 생성 후 임시 체이닝으로 비동기 메서드를 부르지 않는다",
    (file) => {
      const code = strip(readFileSync(join(ROOT, file), "utf8"));
      // new ...Asset(...).getUri() 또는 .getLocation() 또는 .getExif() 패턴 차단
      expect(code).not.toMatch(
        /new\s+(?:[a-zA-Z0-9_.]+\.)?Asset\([^)]*\)\s*\.\s*(?:getUri|getLocation|getExif)\s*\(/,
      );
    },
  );
});

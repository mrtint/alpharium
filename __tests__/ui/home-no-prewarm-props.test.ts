/**
 * 106 — 홈은 죽은 018 미리 준비 입력을 받지 않는다 (spec US8 AS1·FR-018, 080 잔여 ②).
 *
 * `App.tsx`는 `DiaryHomeScreen`에 `prepare`·`release`·`captionDay`를 넘기지 않았다(`canPrepare`만 넘겼다) — 그 입력으로 도는 effect(미리 준비·
 * 사진 미리 읽기)는 앱에서 한 번도 돌지 않았다. 연결하면 `load()` 경합(E1)이 실제 경로가 되고 파이프라인이 어차피 적재하므로 걷는다.
 * 엔진 쪽 `prewarm`·`promptPrefix`와 `on-device` 어댑터는 이 변경의 범위 밖이다. 주석을 먼저 걷어내고 소스를 읽는다(AGENTS).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const read = (path: string) => strip(readFileSync(join(__dirname, "../..", path), "utf8"));

const HOME = read("src/ui/DiaryHomeScreen.tsx");
const APP = read("App.tsx");

describe("DiaryHomeScreen — 018 미리 준비 입력이 없다", () => {
  it.each(["prepare", "release", "captionDay", "canPrepare", "preparedFor", "captionRef"])(
    "%s 식별자가 남아 있지 않다",
    (name) => {
      expect(HOME).not.toMatch(new RegExp(`\\b${name}\\b`));
    },
  );

  it("파이프라인에 미리 읽은 사진(seen)을 넘기지 않는다 — 파이프라인이 신호에서 직접 읽는다", () => {
    expect(HOME).not.toMatch(/\bseenVision\b/);
  });
});

describe("App.tsx — 그 입력을 홈에 넘기지 않는다", () => {
  it.each(["prepare", "release", "captionDay", "canPrepare"])("%s를 홈에 넘기지 않는다", (name) => {
    expect(APP).not.toMatch(new RegExp(`\\b${name}=\\{`));
  });
});

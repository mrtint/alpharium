import { readFileSync } from "node:fs";
import { join } from "node:path";

import { autoWriteDoneText } from "../../src/schedule/notification-text";

/**
 * 057 — 자동 쓰기 완성 알림 문구 (보드 `notif.autoWriteDone`).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md NT1·NT2, spec FR-023·FR-024
 *
 * 「{name}{이|가} {M}월 {d}일 일기를 다 썼어요」 한 줄. 020은 지난날을 써도 「오늘의 일기가 준비됐어요」라고 했다 — 사실과 달랐다.
 */

describe("NT1 — 이름과 조사", () => {
  it("받침 없는 이름 → 가", () => {
    expect(autoWriteDoneText("금동이", "2026-09-14")).toBe("금동이가 9월 14일 일기를 다 썼어요");
  });

  it("받침 있는 이름 → 이", () => {
    expect(autoWriteDoneText("별님", "2026-09-14")).toBe("별님이 9월 14일 일기를 다 썼어요");
  });

  it("한글로 끝나지 않으면 가 (035 규칙)", () => {
    expect(autoWriteDoneText("Bot", "2026-09-14")).toBe("Bot가 9월 14일 일기를 다 썼어요");
  });
});

describe("NT2 — 월·일에 앞 0이 없다", () => {
  it("10월 2일", () => {
    expect(autoWriteDoneText("금동이", "2026-10-02")).toBe("금동이가 10월 2일 일기를 다 썼어요");
  });
});

describe("NT3 — 문장 틀에 본문·감상·모델 정보가 없다 (020 N2, 원칙 II·III)", () => {
  const code = readFileSync(join(__dirname, "../../src/schedule/notification-text.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("조사는 035의 particleFor 하나로 고른다", () => {
    expect(code).toMatch(/\bparticleFor\(/);
  });

  it("일기 본문·요약·감상·모델 이름 어휘가 없다", () => {
    expect(code).not.toMatch(/entry|\.text\b|summary|즐거운|행복한|kanana|exaone|gguf/i);
  });
});

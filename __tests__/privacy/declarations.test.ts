/**
 * 086 — 스토어 선언 초안(`docs/store/privacy-declarations.md`)의 계약 (contracts/declarations.md D1~D6).
 *
 * 소유자가 콘솔에 옮겨 적는 문서다. 답의 옳음은 사람이 근거와 대조하고(contracts 「원문 검토」), 이 테스트는 모양을 잠근다:
 * 두 스토어 절, 줄마다 확신 표식, 미확인 줄의 보수적 답, 소유자가 정한 두 답, 외부 전송 목록과의 짝.
 * URL 대조(L4)는 `policy-links.test.ts`에 있다.
 *
 * ⚠️ CI(`ci.yml`)는 `docs/**`만 바뀐 커밋에서 돌지 않는다 — 이 문서만 고쳤으면 `npm test`를 로컬에서 돌린다(plan Known limit).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { OUTBOUND } from "./outbound";

const DOC = readFileSync(
  join(__dirname, "../../docs/store/privacy-declarations.md"),
  "utf8",
).replace(/\r\n/g, "\n");

/** `## <제목>`부터 다음 `## ` 전까지 */
function part(title: string): string {
  const start = DOC.indexOf(`\n## ${title}`);
  if (start === -1) return "";
  const next = DOC.indexOf("\n## ", start + 1);
  return DOC.slice(start, next === -1 ? undefined : next);
}

/** 답 표의 데이터 줄(머리·구분 줄 제외) — 「답」 열이 있는 표만 */
function answerRows(section: string): string[] {
  const lines = section.split("\n");
  const rows: string[] = [];
  let inAnswerTable = false;
  for (const line of lines) {
    if (!line.startsWith("|")) {
      inAnswerTable = false;
      continue;
    }
    if (/\|\s*답\s*\|/.test(line) && /\|\s*표식\s*\|/.test(line)) {
      inAnswerTable = true;
      continue;
    }
    if (/^\|\s*-/.test(line)) continue;
    if (inAnswerTable) rows.push(line);
  }
  return rows;
}

const PLAY = "Google Play — 데이터 보안";
const APPLE = "App Store — 앱 개인정보 보호";

describe("086 D — 스토어 선언 초안", () => {
  it("D1 — 두 스토어 절이 있다", () => {
    expect(part(PLAY)).not.toBe("");
    expect(part(APPLE)).not.toBe("");
  });

  it.each([PLAY, APPLE])("D2 — %s 의 답 줄마다 확신 표식이 하나 있다", (title) => {
    const rows = answerRows(part(title));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const marks = row.match(/\[(문서|코드|미확인)\]/g) ?? [];
      expect({ row, marks: marks.length > 0 }).toEqual({ row, marks: true });
    }
  });

  it("D3 — [미확인] 줄에는 보수적 답이 있다", () => {
    const rows = [...answerRows(part(PLAY)), ...answerRows(part(APPLE))].filter((r) =>
      r.includes("[미확인]"),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows)
      expect({ row, ok: row.includes("보수적 답") }).toEqual({ row, ok: true });
  });

  it("D4 — Play 위치 줄: 정확한 위치 — 수집함 · 공유 안 함 · 선택 사항 · 앱 기능", () => {
    expect(part(PLAY)).toContain("정확한 위치 — 수집함 · 공유 안 함 · 선택 사항 · 앱 기능");
  });

  it("D5 — App Store: Data Not Collected", () => {
    expect(part(APPLE)).toContain("Data Not Collected");
  });

  it("D6 — 머리: 방침을 먼저 고친다는 규칙과 외부 전송 목록 세 항목의 짝", () => {
    const head = DOC.slice(0, DOC.indexOf(`\n## ${PLAY}`));
    expect(head).toContain("방침을 먼저 고친다");
    for (const entry of OUTBOUND) expect(head).toContain(`\`${entry.id}\``);
  });
});

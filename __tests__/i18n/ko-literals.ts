/**
 * 062 — 한글 화면 문구 리터럴 추출 (contracts/i18n.md G1, research R9).
 *
 * 테스트 파일이 아니다(`.test.ts`가 아니라 jest가 돌리지 않는다). 골든을 만들 때와 대조할 때 같은 함수를 쓴다.
 *
 * - 주석을 먼저 걷는다(이 저장소의 주석은 금지어·원문을 정당하게 담는다).
 * - 한글이 든 문자열(`"`·`'`·`` ` ``)과 JSX 텍스트(`>…<`)를 뽑는다.
 * - 템플릿의 `${…}` 안은 `${}`로 바꾼다 — 변수 이름이 바뀌어도 문구가 같으면 같다.
 * - 정렬해서 돌려준다(다중집합 비교).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** 저장소 뿌리 — jest의 `rootDir`이 작업 디렉터리다 */
export const ROOT = process.cwd();

export const stripComments = (code: string): string =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
    .replace(/\{\s*\}/g, "");

const HANGUL = /[가-힣]/;

/** `${ … }`를 `${}`로 — 중첩 중괄호를 센다 */
function normalizeTemplate(body: string): string {
  let out = "";
  let i = 0;
  while (i < body.length) {
    if (body[i] === "$" && body[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < body.length && depth > 0) {
        if (body[j] === "{") depth += 1;
        else if (body[j] === "}") depth -= 1;
        j += 1;
      }
      out += "${}";
      i = j;
    } else {
      out += body[i];
      i += 1;
    }
  }
  return out;
}

/** 문자열 리터럴을 순서대로 훑는다. 따옴표 종류마다 끝을 찾고 이스케이프를 건너뛴다 */
function stringLiterals(code: string): { text: string; start: number; end: number }[] {
  const found: { text: string; start: number; end: number }[] = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      let depth = 0;
      while (j < code.length) {
        const d = code[j];
        if (d === "\\") {
          j += 2;
          continue;
        }
        if (c === "`") {
          if (d === "$" && code[j + 1] === "{") {
            depth += 1;
            j += 2;
            continue;
          }
          if (depth > 0 && d === "}") {
            depth -= 1;
            j += 1;
            continue;
          }
          if (depth > 0) {
            j += 1;
            continue;
          }
        } else if (d === "\n") {
          break;
        }
        if (d === c) break;
        j += 1;
      }
      const body = code.slice(i + 1, j);
      found.push({ text: c === "`" ? normalizeTemplate(body) : body, start: i, end: j + 1 });
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return found;
}

/** 한 파일 소스에서 한글 리터럴을 뽑는다 */
export function koLiteralsOf(source: string): string[] {
  const code = stripComments(source);
  const strings = stringLiterals(code);
  const out = strings.filter((s) => HANGUL.test(s.text)).map((s) => s.text);

  // JSX 텍스트 — 문자열 리터럴 구간을 빈칸으로 덮은 뒤 `>…<` 사이를 본다
  let masked = code;
  for (const s of strings) {
    masked = masked.slice(0, s.start) + " ".repeat(s.end - s.start) + masked.slice(s.end);
  }
  // JSX 안의 `{식}`은 `${}`로 바꿔 한 문장으로 잇는다(「준비가 끝났어요. {n}/{m}단계…」가 카탈로그 템플릿과 같은 모양이 되게)
  for (const m of masked.matchAll(/>([^<>]*)</g)) {
    const text = normalizeTemplate(m[1].replace(/\{/g, "${")).trim();
    if (HANGUL.test(text)) out.push(text.replace(/\s+/g, " "));
  }
  return out;
}

/** 여러 파일의 한글 리터럴 다중집합(정렬) */
export function koLiterals(files: readonly string[]): string[] {
  return files.flatMap((f) => koLiteralsOf(readFileSync(join(ROOT, f), "utf8"))).sort();
}

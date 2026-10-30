/**
 * 086 — 사이트 원문(`site/`)의 계약 (contracts/site-pages.md S1~S10).
 *
 * 방침의 문장 내용은 사람이 근거와 대조한다(SC-001 — quickstart 「실측」). 이 테스트는 절의 존재·순서, 외부 전송 표식과
 * 목록의 짝, 자리표시자, 단정 금지 낱말, 외부 자원 0을 잠근다. 자리표시자가 남아 있어도 통과한다(S6 — 게시를 막는 것은
 * `.github/workflows/pages.yml`의 검사 단계다).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { OUTBOUND, FIX_POLICY } from "./outbound";
import {
  PLACEHOLDERS,
  SITE,
  attrValues,
  placeholderLike,
  readSite,
  sectionBy,
  sectionIds,
  stripHtmlComments,
} from "./read-site";

import { PRIVACY_URL } from "../../src/app/policy-links";

const PAGES = [
  "index.html",
  "privacy/index.html",
  "support/index.html",
  "licenses/index.html",
] as const;
const POLICY_SECTIONS = [
  "summary",
  "on-device",
  "outbound",
  "third-party",
  "retention",
  "permissions",
  "rights",
  "safety",
  "contact",
  "remedy",
  "changes",
];

describe("086 site — 사이트 원문", () => {
  it("S1 — 세 페이지와 .nojekyll이 있다", () => {
    for (const rel of [...PAGES, ".nojekyll"]) expect(existsSync(join(SITE, rel))).toBe(true);
  });

  it.each(PAGES)("S2 — %s 는 lang ko·charset·viewport·title을 갖는다", (rel) => {
    const html = readSite(rel);
    expect(html).toMatch(/<html lang="ko">/);
    expect(html).toMatch(/<meta charset="utf-8">/i);
    expect(html).toMatch(/<meta name="viewport"[^>]*width=device-width/);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });

  it.each(PAGES)("S3 — %s 는 외부 자원을 부르지 않는다(스크립트·외부 스타일·외부 src 0)", (rel) => {
    const html = stripHtmlComments(readSite(rel));
    expect(html).not.toMatch(/<script/i);
    // 089 — 같은 출처의 상대 경로 스타일시트(`site/assets/`)는 허용한다. 외부 주소·절대 경로 스타일시트는 계속 금지.
    for (const tag of html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi) ?? []) {
      expect(tag).toMatch(/\bhref="(?![a-z][a-z0-9+.-]*:|\/)[^"]+"/i);
    }
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/\bsrc="https?:\/\//);
  });

  it("S4 — 방침의 절 열하나가 순서대로 있다", () => {
    const ids = sectionIds(readSite("privacy/index.html")).filter((id) =>
      POLICY_SECTIONS.includes(id),
    );
    expect(ids).toEqual(POLICY_SECTIONS);
  });

  it("S5 — outbound 절의 data-outbound 표식 = 외부 전송 목록(각 한 번, 목록 밖 0)", () => {
    const outbound = sectionBy(readSite("privacy/index.html"), "id", "outbound");
    expect(outbound).not.toBeNull();
    const marks = attrValues(outbound ?? "", "data-outbound");
    const ids = OUTBOUND.map((e) => e.id);
    const all = attrValues(readSite("privacy/index.html"), "data-outbound");
    // outbound 절 밖에 표식이 있으면 그것도 어긋남이다.
    expect({ marks: [...all].sort(), why: FIX_POLICY }).toEqual({
      marks: [...ids].sort(),
      why: FIX_POLICY,
    });
    expect(marks.length).toBe(all.length);
    expect(new Set(marks).size).toBe(marks.length);
  });

  it.each(OUTBOUND.map((e) => e.id))("S5 — data-outbound=%s 절에 근거 주석이 있다", (id) => {
    const body = sectionBy(readSite("privacy/index.html"), "data-outbound", id);
    expect(body).toMatch(/<!--\s*근거:/);
  });

  it("S6 — 자리표시자 꼴은 정해진 셋뿐이다(있어도 통과)", () => {
    const found = PAGES.flatMap((rel) => placeholderLike(readSite(rel)));
    const unknown = found.filter((p) => !(PLACEHOLDERS as readonly string[]).includes(p));
    expect(unknown).toEqual([]);
  });

  // 108 — 소유자 결정(2026-10-30): 「지체 없이」 대신 끝나는 기준(마지막 답장 뒤 30일)·파기 방법·법령상 보존·법정 요청을 적는다.
  const policyText = (id: string) =>
    stripHtmlComments(sectionBy(readSite("privacy/index.html"), "id", id) ?? "");

  it("S7 — 문의 절: 메일 자리·책임자·끝나는 기준(30일)·파기 방법·열람 삭제 요청", () => {
    const contact = policyText("contact");
    expect(contact).toMatch(/\{SUPPORT_EMAIL\}|[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(contact).toMatch(/\{OPERATOR\}|책임자/);
    expect(contact).toContain(
      "운영자가 마지막으로 답장한 날부터 30일 동안 같은 문의가 이어지지 않으면 그 문의는 끝난 것으로 봅니다.",
    );
    expect(contact).toContain("휴지통까지 비웁니다");
    expect(contact).toContain("열람이나 삭제");
    expect(contact).not.toContain("지체 없이");
  });

  it("S7b — 보존 절: 법령상 따로 보존하는 것 없음(결제 없음)과 보존 요청을 받은 때", () => {
    const retention = policyText("retention");
    expect(retention).toContain("포켓로그에는 결제가 없어");
    expect(retention).toContain("법령에 따라 보존을 요구받은 메일은");
  });

  it("S11 — 제3자 절: 제공 없음, 문의 메일 보관 위탁(Google LLC, 미국)과 국외 이전 항목", () => {
    const third = policyText("third-party");
    expect(third).toContain("제3자에게 제공하지 않습니다");
    expect(third).not.toContain("처리를 맡기지 않습니다");
    for (const item of ["Google LLC", "미국", "Gmail", "보낸 메일 주소", "메일 내용"])
      expect(third).toContain(item);
    // 법정 요청과, 휴대폰이 직접 요청하는 외부 전송은 운영자의 제공·위탁이 아니라는 구분
    expect(third).toContain("법령에 정한 절차");
    expect(third).toContain("운영자가 제공하거나 맡기는 것이 아닙니다");
  });

  it("S12 — 모듈 내려받기 절: 받는 곳·나라·항목을 「등」 없이 밝힌다", () => {
    const body = stripHtmlComments(
      sectionBy(readSite("privacy/index.html"), "data-outbound", "model-download") ?? "",
    );
    for (const item of ["Hugging Face, Inc.", "미국", "IP 주소", "요청 시각", "받는 파일의 주소"])
      expect(body).toContain(item);
    expect(body).not.toContain("IP 주소 등");
  });

  it("S13 — 권리·안전·구제 절이 있고 구제 기관 넷의 연락처를 적는다", () => {
    expect(policyText("rights")).toContain("10일 안에");
    expect(policyText("safety")).toContain("운영자의 서버가 없습니다");
    const remedy = policyText("remedy");
    for (const contact of ["1833-6972", "118", "1301", "182"]) expect(remedy).toContain(contact);
  });

  it("S8 — 변경 이력: 시행일 자리·이력 목록·저장소 기록 링크", () => {
    const changes = stripHtmlComments(
      sectionBy(readSite("privacy/index.html"), "id", "changes") ?? "",
    );
    expect(changes).toMatch(/<ol|<ul/);
    expect(changes).toContain(
      'href="https://github.com/mrtint/alpharium/commits/main/site/privacy/index.html"',
    );
  });

  it("S9 — 지원 페이지: 방침 링크·메일 자리·자주 묻는 것 여섯", () => {
    const html = readSite("support/index.html");
    expect(stripHtmlComments(html)).toContain(`href="${PRIVACY_URL}"`);
    expect(stripHtmlComments(html)).toMatch(/\{SUPPORT_EMAIL\}|mailto:/);
    expect(attrValues(html, "data-faq")).toEqual([
      "download",
      "auto-write",
      "uninstall",
      "on-device",
      "place-name",
      "places",
    ]);
  });

  it("S9b — 098 CP4: 장소 수 항목은 맨 끝이고 확정 답이며 짐작 상수를 적지 않는다", () => {
    const html = readSite("support/index.html");
    const body = stripHtmlComments(sectionBy(html, "data-faq", "places") ?? "");
    expect(body).toContain("홈의 장소 수는 무엇인가요?");
    expect(body).toContain(
      "그날 사진이 찍힌 자리의 수예요. 가까운 곳에서 찍은 사진은 한 자리로 묶어 세고, 위치 정보가 없는 사진은 세지 않아요.",
    );
    expect(body).not.toMatch(/\d+\s*(m|미터)/);
    // 「앱을 지우면」 답은 백업 과제 몫이라 이 과제가 바꾸지 않는다 — 항목이 그대로 있다.
    expect(sectionBy(html, "data-faq", "uninstall")).toContain("앱을 지우면 일기는 어떻게 되나요?");
  });

  // 099 — 실측한 사실(specs/099-backup-and-loss-notice/quickstart.md)을 두 페이지가 같은 문장으로 말한다.
  const BACKUP_MODEL =
    "모델(약 2GB)은 휴대폰의 백업(iCloud, Google 백업)에서 제외하도록 설정해 두었습니다.";
  const BACKUP_DIARY =
    "일기와 설정은 휴대폰의 기본 백업 방식을 따르므로 백업에 포함될 수 있지만, 그 백업으로 일기가 되살아난다고 보장하지 않습니다.";
  const BACKUP_LIMIT =
    "Android는 모델을 뺀 앱 데이터가 OS가 정한 한도를 넘으면 백업이 이뤄지지 않을 수 있습니다.";

  const retention = () =>
    stripHtmlComments(sectionBy(readSite("privacy/index.html"), "id", "retention") ?? "");
  const uninstall = () =>
    stripHtmlComments(sectionBy(readSite("support/index.html"), "data-faq", "uninstall") ?? "");

  it("S10 — 보존 절이 모델 제외·일기 비보장·안드로이드 한도를 말한다", () => {
    for (const sentence of [BACKUP_MODEL, BACKUP_DIARY, BACKUP_LIMIT]) {
      expect(retention()).toContain(sentence);
    }
  });

  it("S10 — 지원 「앱을 지우면」 답이 방침 보존 절과 같은 문장으로 말한다", () => {
    for (const sentence of [BACKUP_MODEL, BACKUP_DIARY, BACKUP_LIMIT]) {
      expect(uninstall()).toContain(sentence);
    }
  });

  it("S10 — 일기가 백업으로 되살아난다고 단정하지 않고, 미실측 항목을 단정하지 않는다", () => {
    const both = `${retention()}${stripHtmlComments(readSite("support/index.html"))}`;
    expect(both).not.toMatch(/백업(으로|에서) (반드시|항상) (되살|복원)/);
    expect(both).not.toMatch(/포함됩니다|포함되지 않습니다/);
  });
});

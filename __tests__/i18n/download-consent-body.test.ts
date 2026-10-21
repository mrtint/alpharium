/**
 * 095 — 표준 다운로드 동의 본문에 받을 양을 싣는다 (App Store 4.2.3(ii)).
 *
 * 계약: specs/095-download-size-notice/contracts/consent-size.md DS1
 *
 * 양을 못 읽으면(`null`) 원래 문장과 바이트 동일해야 한다 — 양을 지어내지 않는다(원칙 V, FR-002).
 */

import { ko } from "../../src/i18n/catalogs/ko";

const ORIGINAL =
  "일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.";

describe("DS1 — download.consent.body(size)", () => {
  it("null이면 원래 문장과 바이트 동일하다", () => {
    expect(ko.download.consent.body(null)).toBe(ORIGINAL);
  });

  it.each(["2.0GB", "350MB"])("%s면 「약 %s」를 싣는다", (size) => {
    expect(ko.download.consent.body(size)).toBe(
      `일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 약 ${size} 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.`,
    );
  });

  it("어떤 입력에도 「null」·「undefined」가 새지 않는다", () => {
    for (const size of [null, "2.0GB"]) {
      expect(ko.download.consent.body(size)).not.toMatch(/null|undefined/);
    }
  });
});

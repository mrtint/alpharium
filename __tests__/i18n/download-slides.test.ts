/**
 * 098 CP1 — 첫 실행 슬라이드 3은 자동 쓰기를 켜지 않아도 참인 말만 한다.
 * 자동 쓰기는 기본값이 꺼짐이라 알림·먼저 써 둠은 「켜 두면」 조건 아래에만 둔다. 진행 문구에 바이트·퍼센트·시간을 넣지 않는다(045 FR-006).
 */

import { download } from "../../src/i18n/catalogs/ko/download";
import { welcome } from "../../src/i18n/catalogs/ko/welcome";

describe("098 CP1 — 슬라이드 3", () => {
  const slide = download.slides[2]!;

  it("제목·본문이 확정 문장이다", () => {
    expect(slide.title).toBe("열면 바로 그날 일기를 써요");
    expect(slide.body).toBe("자동으로 쓰기를 켜 두면 쓸 차례에 알림이 오고, 먼저 써 두기도 해요.");
  });

  it("알림·먼저 써 둠은 「켜 두면」 조건 뒤에만 나온다", () => {
    const at = slide.body.indexOf("켜 두면");
    expect(at).toBeGreaterThanOrEqual(0);
    for (const word of ["알림", "먼저 써"]) {
      expect(slide.body.indexOf(word)).toBeGreaterThan(at);
    }
  });

  it("조건 없는 완성 약속이 없다", () => {
    const all = download.slides.map((s) => `${s.title} ${s.body}`).join("\n");
    expect(all).not.toMatch(/잠들기 전|조용히 완성/);
  });

  it("슬라이드 어디에도 숫자·퍼센트·용량·시간 단위가 없다(045 FR-006)", () => {
    for (const s of download.slides) {
      expect(`${s.title} ${s.body}`).not.toMatch(/\d|%|[MG]B|분|초|시간/);
    }
  });
});

describe("108 — 앱 소개(D2-b)·슬라이드 4(D6)", () => {
  it("스플래시 캡션과 슬라이드 1 제목은 같은 문자열이다 — 앱을 소개하는 두 자리가 따로 놀지 않는다", () => {
    expect(welcome.logoCaption).toBe(download.slides[0]!.title);
  });

  it("슬라이드 1·4는 소유자가 정한 문구다", () => {
    expect(download.slides[0]).toEqual({
      title: "AI가 쓰는 일기",
      body: "주인님의 하루를 글로 남겨요. 실수할 때도 있지만요",
    });
    expect(download.slides[3]).toEqual({
      title: "사진과 일기는 서버로 보내지 않아요",
      body: "일기를 쓰는 AI는 이 휴대폰 안에서 돌아요.",
    });
  });
});

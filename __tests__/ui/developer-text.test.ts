/**
 * 059 — 개발자 메뉴 문구 (계약 TX·BD4).
 *
 * 보드 「KO 문자열 — 설정 · 개발자」 표의 원문을 글자 단위로 잠근다(C4, 047 교훈). 보드 밖 문구도 글자로 잠그되
 * 소스 주석에 「보드 밖」이 표시돼 있는지 본다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEVELOPER_TEXT } from "../../src/ui/developer-text";
import { SETTINGS_TEXT } from "../../src/ui/settings-text";

describe("TX — 보드 KO 원문", () => {
  it("dev.* 와 about.developer 가 글자 단위로 같다", () => {
    expect(SETTINGS_TEXT.developer).toBe("개발자");
    expect(DEVELOPER_TEXT.title).toBe("개발자");
    expect(DEVELOPER_TEXT.groupModules).toBe("모듈");
    expect(DEVELOPER_TEXT.readModule).toBe("읽는 모듈");
    expect(DEVELOPER_TEXT.writeModule).toBe("쓰는 모듈");
    expect(DEVELOPER_TEXT.redownload).toBe("모듈 다시 받기");
    expect(DEVELOPER_TEXT.groupDiag).toBe("진단");
    expect(DEVELOPER_TEXT.diag).toBe("진단");
    expect(DEVELOPER_TEXT.devOnly).toBe("개발 빌드만");
    expect(DEVELOPER_TEXT.groupReplay).toBe("다시 보기");
    expect(DEVELOPER_TEXT.replayOnboarding).toBe("온보딩부터 다시");
    expect(DEVELOPER_TEXT.off).toBe("개발자 메뉴 끄기");
    expect(DEVELOPER_TEXT.enabled).toBe("개발자 메뉴가 켜졌어요");
    expect(DEVELOPER_TEXT.enabledSub).toBe("이 기기에서만");
    expect(DEVELOPER_TEXT.already).toBe("이미 켜져 있어요");
  });

  it("tapsLeft 는 남은 횟수를 숫자 그대로 끼운다", () => {
    expect(DEVELOPER_TEXT.tapsLeft(3)).toBe("개발자 메뉴까지 3번 남았어요");
    expect(DEVELOPER_TEXT.tapsLeft(1)).toBe("개발자 메뉴까지 1번 남았어요");
  });
});

describe("TX — 보드 밖 문구", () => {
  it("글자 단위로 잠근다", () => {
    expect(DEVELOPER_TEXT.allReady).toBe("이미 모두 준비돼 있어요");
    expect(DEVELOPER_TEXT.redownloadTitle).toBe("모듈을 다시 받을까요?");
    expect(DEVELOPER_TEXT.redownloadCellular("1.2GB")).toBe("모바일 데이터로 1.2GB를 받아요.");
    expect(DEVELOPER_TEXT.redownloadBody).toBe("빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.");
    expect(DEVELOPER_TEXT.redownloadConfirm).toBe("받기");
    expect(DEVELOPER_TEXT.redownloadCancel).toBe("취소");
    expect(DEVELOPER_TEXT.diagBack).toBe("개발자");
  });

  it("BD4 — 소스 주석에 「보드 밖」이 표시돼 있다", () => {
    const source = readFileSync(join(__dirname, "../../src/ui/developer-text.ts"), "utf8");
    expect(source).toMatch(/보드 밖/);
  });
});

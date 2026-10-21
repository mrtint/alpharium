/**
 * 릴리스 노트 — 저장소의 `release-notes/ko.txt` 하나를 Play 「출시 노하우」와 TestFlight 「테스트할 내용」에 보낸다.
 * 이 파일은 두 스토어가 공유하는 읽기·검증만 잠근다(길이는 글자 수, 서로게이트 쌍은 한 글자).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeNotes,
  PLAY_NOTES_MAX,
  TESTFLIGHT_NOTES_MAX,
} from "../../scripts/release-notes/notes.ts";

describe("normalizeNotes", () => {
  it("앞뒤 공백을 걷고 줄바꿈을 \\n으로 맞춘다", () => {
    expect(normalizeNotes("\n  이어 하기\r\n- 하나\r\n  \n", 500)).toBe("이어 하기\n- 하나");
  });

  it("비어 있거나 공백뿐이면 던진다 — 노트 없이 릴리스하지 않는다", () => {
    expect(() => normalizeNotes("", 500)).toThrow("비어 있다");
    expect(() => normalizeNotes(" \r\n\t ", 500)).toThrow("비어 있다");
  });

  it("한도 글자 수까지는 통과하고 하나 넘으면 몇 자인지 밝혀 던진다", () => {
    expect(normalizeNotes("가".repeat(500), 500)).toHaveLength(500);
    expect(() => normalizeNotes("가".repeat(501), 500)).toThrow("501자");
    expect(() => normalizeNotes("가".repeat(501), 500)).toThrow("한도 500자");
  });

  it("글자 수는 코드 포인트로 센다 — 이모지 하나는 한 글자", () => {
    expect(() => normalizeNotes("😀".repeat(500), 500)).not.toThrow();
    expect(() => normalizeNotes("😀".repeat(501), 500)).toThrow("501자");
  });

  it("한도는 Play 500자, TestFlight 4000자다", () => {
    expect(PLAY_NOTES_MAX).toBe(500);
    expect(TESTFLIGHT_NOTES_MAX).toBe(4000);
  });
});

describe("저장소의 release-notes/ko.txt", () => {
  // 릴리스 워크플로가 14분 빌드 전에 같은 검사를 하지만, 노트를 고치는 PR에서 먼저 잡히게 `npm test`에도 둔다
  const file = readFileSync(join(__dirname, "../../release-notes/ko.txt"), "utf8");

  it("Play 500자·TestFlight 4000자 한도 안에서 비어 있지 않다", () => {
    expect(() => normalizeNotes(file, PLAY_NOTES_MAX)).not.toThrow();
    expect(() => normalizeNotes(file, TESTFLIGHT_NOTES_MAX)).not.toThrow();
  });
});

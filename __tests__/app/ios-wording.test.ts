/**
 * 093 — iOS 자동 쓰기 동작 조건을 말하는 문구 (092 이어 하기 이후).
 *
 * 플랫폼 값은 조립부가 넘기고 함수는 입력만으로 정해진다. 안드로이드 값은 바이트 그대로다(이 과제는 안드로이드 동작을 바꾸지 않는다).
 */

import { writingLeaveNote } from "../../src/app/leave-note";
import { previewSentence } from "../../src/app/target-hour";

const ANDROID_PREVIEW_PM =
  "매일 오후 10시쯤 그날 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.";
const ANDROID_PREVIEW_AM =
  "매일 오전 7시쯤 어제 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.";

describe("093 — 시각 대화상자 미리보기", () => {
  it("iOS는 열면 바로 쓰고 앱을 나가도 계속 쓴다고 말한다", () => {
    expect(previewSentence(22, "h12", "ios")).toBe(
      "매일 오후 10시쯤 그날 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 쓰고, 앱을 나가도 계속 써요. 이미 쓴 날은 건너뛰어요.",
    );
    expect(previewSentence(7, "h24", "ios")).toBe(
      "매일 7시쯤 어제 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 쓰고, 앱을 나가도 계속 써요. 이미 쓴 날은 건너뛰어요.",
    );
  });

  it("안드로이드는 바이트 그대로다 — 플랫폼을 안 줘도 같다", () => {
    expect(previewSentence(22, "h12", "android")).toBe(ANDROID_PREVIEW_PM);
    expect(previewSentence(7, "h12", "android")).toBe(ANDROID_PREVIEW_AM);
    expect(previewSentence(22, "h12")).toBe(ANDROID_PREVIEW_PM);
  });
});

describe("093 — 쓰는 중 화면 안내 줄", () => {
  it("iOS만 나가도 계속 쓴다는 한 줄을 갖는다", () => {
    expect(writingLeaveNote("ios")).toBe("앱을 나가도 계속 써요.");
  });

  it("안드로이드는 줄이 없다 — 앞을 벗어나면 멈추는 사실은 이 과제 밖이다", () => {
    expect(writingLeaveNote("android")).toBeUndefined();
  });

  it("숫자(분·퍼센트)와 시간 약속을 넣지 않는다 (045 FR-006, 원칙 IV)", () => {
    expect(writingLeaveNote("ios")).not.toMatch(/\d|분|퍼센트|%/);
    expect(previewSentence(22, "h12", "ios").replace(/오후 10시/, "")).not.toMatch(/\d|분 /);
  });
});

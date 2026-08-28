import { readFileSync } from "node:fs";
import { join } from "node:path";

import { routeFromNotification } from "../../src/app/notification-routing";

/**
 * 알림 응답 → 화면 라우팅 판정의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md N5·N9
 *       spec.md FR-006
 */

function response(data: unknown): never {
  return {
    notification: { request: { content: { data } } },
    actionIdentifier: "default",
  } as never;
}

describe("N5 — 형식 검사", () => {
  it("null이면 null (알림으로 안 열림)", () => {
    expect(routeFromNotification(null)).toBeNull();
  });

  it("undefined이면 null", () => {
    expect(routeFromNotification(undefined)).toBeNull();
  });

  it("data.day가 YYYY-MM-DD면 { day }", () => {
    expect(routeFromNotification(response({ day: "2026-08-27" }))).toEqual({ day: "2026-08-27" });
  });

  it.each([
    ["day 없음", {}],
    ["day가 빈 문자열", { day: "" }],
    ["day 형식 불명", { day: "2026/08/27" }],
    ["day가 숫자", { day: 20260827 }],
    ["day가 부분", { day: "2026-08" }],
    ["data가 배열", []],
  ])("%s이면 null — 지어내지 않는다 (원칙 V)", (_label, data) => {
    expect(routeFromNotification(response(data))).toBeNull();
  });
});

describe("N5 — 소스 검사", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/app/notification-routing.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("diary/* 를 import하지 않는다 (F3 — 스캔 대상이 아니어도 안전)", () => {
    expect(CODE).not.toMatch(/from ["'][^"']*diary\//);
  });

  it("화면 전이를 하지 않는다 (setScreen / navigate 없음)", () => {
    expect(CODE).not.toMatch(/setScreen|navigate|toDetail|initialScreen/);
  });

  it("YYYY-MM-DD 패턴으로만 통과시킨다", () => {
    expect(CODE).toMatch(/\\d\{4\}-\\d\{2\}-\\d\{2\}/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NotificationPort } from "../../src/schedule/notification-port";

/**
 * 로컬 알림 통로의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md
 *       N2·N3·N9
 *       spec.md FR-004·FR-012·헌법 원칙 II·III
 *
 * 기기(`expo-notifications`)에 닿는 자리이므로 소스 문자열 검사가 주된 방어다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/schedule/notification-port.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("N3 — 인터페이스 시그니처", () => {
  it("ensureChannel/requestPermission/getPermission/present/dismiss/lastResponse/onResponse를 갖는다", () => {
    const port: NotificationPort = {
      ensureChannel: async () => {},
      requestPermission: async () => "granted",
      getPermission: async () => "granted",
      present: async () => "id",
      dismiss: async () => {},
      lastResponse: async () => null,
      onResponse: () => () => {},
    };
    expect(Object.keys(port).sort()).toEqual([
      "dismiss",
      "ensureChannel",
      "getPermission",
      "lastResponse",
      "onResponse",
      "present",
      "requestPermission",
    ]);
  });
});

/**
 * 020 N2 → 057 갱신: 고정 문구 두 개(「오늘의 일기가 준비됐어요」 / 본문)를 걷었다. 지난날을 써도 「오늘」이라고 해서
 * 사실과 달랐다(원칙 V). 제목은 부르는 쪽이 `autoWriteDoneText(이름, 날)`로 만들어 넘기고 본문은 없다(057 FR-023·FR-024).
 * 일기 내용·감상·모델 정보를 담지 않는다는 020의 취지는 그대로다 — 문장 틀은 `notification-text.test.ts`가 잠근다.
 */
describe("N2 (057) — 제목은 받은 것, 본문 없음", () => {
  it("present(day, title)가 받은 제목을 쓴다", () => {
    expect(CODE).toMatch(/async present\(day, title\)/);
    expect(CODE).toMatch(/content:\s*\{\s*title,/);
  });

  it("본문(body)을 싣지 않는다", () => {
    expect(CODE).not.toMatch(/\bbody\s*:/);
    expect(CODE).not.toMatch(/NOTIFICATION_BODY|NOTIFICATION_TITLE/);
  });

  it("문구에 감상·단정(즐거운 하루 류)이 없다", () => {
    expect(CODE).not.toMatch(/즐거운 하루|행복한 하루|좋은 하루였|멋진 하루/);
  });

  it("문구에 모델 정보가 없다 (원칙 III)", () => {
    expect(CODE).not.toMatch(/kanana|exaone|hyperclova|gguf/i);
  });
});

describe("N3 — present는 trigger: null만 쓴다 (예약 알림 금지)", () => {
  it("scheduleNotificationAsync 호출에 trigger: null이 있다", () => {
    expect(CODE).toMatch(/trigger:\s*null/);
  });

  it("DAILY / TIME_INTERVAL / seconds / hour 트리거를 쓰지 않는다", () => {
    expect(CODE).not.toMatch(/SchedulableTriggerInputTypes|DAILY|TIME_INTERVAL|trigger:\s*\{/);
  });

  it("present가 data에 { day }를 싣는다", () => {
    expect(CODE).toMatch(/data:\s*\{\s*day\s*\}/);
  });
});

describe("N3 — 안드로이드 채널", () => {
  it("setNotificationChannelAsync로 채널을 보장한다", () => {
    expect(CODE).toMatch(/setNotificationChannelAsync/);
  });
});

describe("기기 통로 — 지연 import", () => {
  it("expo-notifications를 메서드 안에서 await import한다", () => {
    expect(CODE).toMatch(/await import\(["']expo-notifications["']\)/);
  });

  it("모듈 최상단에서 값 import를 하지 않는다 (type import는 허용)", () => {
    const valueImport = SOURCE.match(/^import\s+(?!type\s)[^;]*from ["']expo-notifications["']/m);
    expect(valueImport).toBeNull();
  });
});

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

describe("N2 — 알림 문구가 원칙 II를 지킨다", () => {
  it("문구 상수 2개가 있다 (제목/본문)", () => {
    expect(CODE).toMatch(/NOTIFICATION_TITLE\s*=/);
    expect(CODE).toMatch(/NOTIFICATION_BODY\s*=/);
  });

  it("문구에 일기 본문·요약 참조가 없다 (열어야 확인 — FR-012)", () => {
    // 문구 상수 값을 뽑아 본다.
    const title = CODE.match(/NOTIFICATION_TITLE\s*=\s*["']([^"']*)["']/)?.[1] ?? "";
    const body = CODE.match(/NOTIFICATION_BODY\s*=\s*["']([^"']*)["']/)?.[1] ?? "";
    for (const text of [title, body]) {
      expect(text).not.toMatch(/entry|text|\.body|summary|본문 요약/i);
    }
  });

  it("문구에 감상·단정(즐거운 하루 류)이 없다", () => {
    // 주석은 규칙을 설명하는 자리다(008의 교훈) — CODE(주석 제거본)만 본다.
    expect(CODE).not.toMatch(/즐거운 하루|행복한 하루|좋은 하루였|멋진 하루/);
  });

  it("문구에 캐릭터·모델 정보가 없다 (원칙 III)", () => {
    const title = CODE.match(/NOTIFICATION_TITLE\s*=\s*["']([^"']*)["']/)?.[1] ?? "";
    const body = CODE.match(/NOTIFICATION_BODY\s*=\s*["']([^"']*)["']/)?.[1] ?? "";
    for (const text of [title, body]) {
      expect(text).not.toMatch(/kanana|exaone|hyperclova|금동이|루이|오드|샤오바이|모카|gguf/i);
    }
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

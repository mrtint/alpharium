/**
 * 085 — 쓸 차례 알림 통로.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RT1~RT4
 *
 * `expo-notifications`는 쓰는 함수만 대역한다 — 통로의 불러오기 자리(`load`)에 넘긴다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  expoReminderPort as realPort,
  REMINDER_CHANNEL_ID,
} from "../../src/schedule/reminder-port";

const mock = {
  scheduleNotificationAsync: jest.fn(async () => "id"),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async (): Promise<unknown[]> => []),
  getPresentedNotificationsAsync: jest.fn(async (): Promise<unknown[]> => []),
  dismissNotificationAsync: jest.fn(async () => {}),
  SchedulableTriggerInputTypes: { DATE: "date" },
};

/** jest `logic`(node)에서는 동적 import가 돌지 않는다 — 불러오기 자리에 대역을 넘긴다 */
const expoReminderPort = () => realPort(async () => mock as never);

beforeEach(() => jest.clearAllMocks());

const ENTRY = {
  id: "diary-reminder-2026-10-15",
  day: "2026-10-15",
  at: new Date(2026, 9, 15, 22).getTime(),
  title: "은동이가 10월 15일 일기를 쓸 차례예요",
};

describe("RT2 — 날짜 예약 하나", () => {
  it("id·제목·data·DATE 트리거·채널, 본문 없음", async () => {
    await expoReminderPort().schedule(ENTRY);
    expect(mock.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const [arg] = mock.scheduleNotificationAsync.mock.calls[0] as unknown as [
      { identifier: string; content: Record<string, unknown>; trigger: Record<string, unknown> },
    ];
    expect(arg.identifier).toBe(ENTRY.id);
    expect(arg.content).toEqual({
      title: ENTRY.title,
      data: { day: ENTRY.day, kind: "write-reminder", at: ENTRY.at },
    });
    expect(arg.content).not.toHaveProperty("body");
    expect(arg.trigger).toEqual({ type: "date", date: ENTRY.at, channelId: "diary-reminder" });
    expect(REMINDER_CHANNEL_ID).toBe("diary-reminder");
  });
});

describe("RT3 — 우리 것만 읽는다", () => {
  it("scheduled()는 접두사로 거르고 data에서 day·at을 읽는다", async () => {
    mock.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      {
        identifier: ENTRY.id,
        content: {
          title: ENTRY.title,
          data: { day: ENTRY.day, kind: "write-reminder", at: ENTRY.at },
        },
        trigger: { type: "timeInterval", seconds: 3600 },
      },
      { identifier: "completion-1", content: { title: "다 썼어요", data: { day: "2026-10-14" } } },
      {
        identifier: "diary-reminder-bad",
        content: { title: null, data: { day: "nope", at: "x" } },
      },
    ]);
    await expect(expoReminderPort().scheduled()).resolves.toEqual([
      { id: ENTRY.id, day: ENTRY.day, at: ENTRY.at, title: ENTRY.title },
      { id: "diary-reminder-bad", day: null, at: null, title: null },
    ]);
  });

  it("presented()는 request.identifier 접두사로 거른다", async () => {
    mock.getPresentedNotificationsAsync.mockResolvedValueOnce([
      { request: { identifier: ENTRY.id, content: { data: { day: ENTRY.day } } } },
      { request: { identifier: "completion-1", content: { data: { day: "2026-10-14" } } } },
    ]);
    await expect(expoReminderPort().presented()).resolves.toEqual([
      { id: ENTRY.id, day: ENTRY.day },
    ]);
  });

  it("기저 API가 던지면 둘 다 던진다(빈 목록으로 바꾸지 않는다)", async () => {
    mock.getAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error("x"));
    await expect(expoReminderPort().scheduled()).rejects.toThrow();
    mock.getPresentedNotificationsAsync.mockRejectedValueOnce(new Error("x"));
    await expect(expoReminderPort().presented()).rejects.toThrow();
  });
});

describe("RT4 — 취소·거두기는 던지지 않는다", () => {
  it("cancel·dismiss", async () => {
    mock.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error("x"));
    mock.dismissNotificationAsync.mockRejectedValueOnce(new Error("x"));
    await expect(expoReminderPort().cancel(ENTRY.id)).resolves.toBeUndefined();
    await expect(expoReminderPort().dismiss(ENTRY.id)).resolves.toBeUndefined();
  });
});

describe("RT1 — 지연 import", () => {
  it("expo-notifications를 최상단에서 값으로 import하지 않는다", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src/schedule/reminder-port.ts"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/^import (?!type)[^;]*["']expo-notifications["']/m);
    expect(source).toMatch(/\(\) => import\(["']expo-notifications["']\)/);
  });
});

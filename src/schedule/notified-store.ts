/**
 * 날짜별 알림 상태의 영속화 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S5
 *       specs/020-scheduled-diary-notification/data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`DiaryEntry`와 분리된 상태다**(research.md §6, 원칙 III·IV 경계).
 *
 * `DiaryEntry`(`src/diary/types.ts`)는 헌법 원칙 III·IV의 방어선이 걸린
 * 타입이다 — 불변식이 "모델 식별자 없음, 점수 없음, 실패는 entry가 안 됨".
 * 알림 상태는 일기의 속성이 아니라 이 기능의 **UX 상태**다. 섞으면 다음
 * 기능이 그 틈으로 들어온다(003·011·012가 반복 경고한 패턴).
 *
 * 별도 파일은 하위 호환도 공짜다 — 옛 일기 파일을 건드릴 이유가 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";

/** 한 날짜의 알림 상태. */
export type NotifiedEntry = {
  /** 이 날짜로 알림을 보낸 마지막 시각. ISO 8601 (Date.toISOString()). */
  sentAt: string;
  /**
   * 사용자가 이 날짜의 일기를 열어 확인했는가.
   * true면 FR-013 재시도로 재생성돼도 다시 알리지 않는다(FR-007 (2)).
   */
  acknowledged: boolean;
  /** expo-notifications가 돌려준 알림 식별자 (dismiss·갱신에 쓴다). */
  notificationId: string;
};

export type NotifiedState = { [day: DayDate]: NotifiedEntry };

/** 상태가 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface NotifiedStorePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 엔트리 하나가 모양을 갖췄는가. 아니면 그 날짜는 "알린 적 없음"으로 취급. */
function isEntry(value: unknown): value is NotifiedEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.sentAt === "string" &&
    typeof e.acknowledged === "boolean" &&
    typeof e.notificationId === "string"
  );
}

/**
 * 알림 상태 맵을 읽는다.
 *
 * **없으면 빈 맵**(S5). 파일 없음·깨짐·통로 예외 전부 `{}`로 귀결된다.
 * 손상된 엔트리는 무시한다 — 한 줄 손상이 전체를 막지 않는다.
 */
export async function loadNotifiedState(port: NotifiedStorePort): Promise<NotifiedState> {
  try {
    const raw = await port.read();
    if (raw === null) return {};

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const state: NotifiedState = {};
    for (const [day, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isEntry(value)) state[day] = value;
    }
    return state;
  } catch {
    return {};
  }
}

/** 알림 상태 맵을 담는다. */
export async function saveNotifiedState(
  port: NotifiedStorePort,
  state: NotifiedState,
): Promise<void> {
  await port.write(JSON.stringify(state));
}

/**
 * 그 날짜의 알림을 "확인함"으로 표시한다 (020, FR-007 (2)).
 *
 * 상세 화면에 진입하면 호출된다. 엔트리가 없으면(알림을 보낸 적 없는
 * 날짜를 목록에서 열었으면) 아무것도 하지 않는다 — 확인 상태만 있고
 * 알림 이력이 없는 엔트리를 지어내지 않는다(원칙 V).
 *
 * 통로 예외를 삼킨다 — 확인 기록에 실패해도 사용자는 이미 일기를 봤고,
 * 최악의 경우 재생성 시 알림이 한 번 더 뜰 뿐이다.
 */
export async function acknowledgeNotified(port: NotifiedStorePort, day: DayDate): Promise<void> {
  try {
    const state = await loadNotifiedState(port);
    const entry = state[day];
    if (entry === undefined || entry.acknowledged === true) return;
    await saveNotifiedState(port, { ...state, [day]: { ...entry, acknowledged: true } });
  } catch {
    // 확인 기록 실패는 치명적이지 않다 — 다음 재생성에 알림이 한 번 더 뜰 뿐.
  }
}

/**
 * 오래된 엔트리를 잘라낸다 (S5).
 *
 * **순수 함수. 날짜 문자열 비교만 한다**(원칙 IV) — 값(`sentAt`·
 * `acknowledged`)이나 시간을 보지 않는다. `keepFrom`보다 사전순으로
 * 작은(= 더 오래된) 날짜 엔트리를 제거한다. `YYYY-MM-DD`는 사전순이 곧
 * 시간순이다.
 *
 * `keepFrom`은 호출부가 `selectableDays(now)`의 가장 오래된 값에서 며칠 더
 * 뺀 여유값을 넘긴다(맵이 무한히 안 커지게).
 */
export function pruneNotified(state: NotifiedState, keepFrom: DayDate): NotifiedState {
  const pruned: NotifiedState = {};
  for (const [day, entry] of Object.entries(state)) {
    if (day >= keepFrom) pruned[day] = entry;
  }
  return pruned;
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const STATE_FILE = "notified.json";

/** 디렉터리를 연다. **지연 import다.** */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/**
 * 기기의 알림 상태 통로.
 *
 * `preferences/notified.json`에 둔다 — **`diary/` 밖**(007이 `preferences/`를
 * `diary/` 밖에 둔 이유와 같다 — `store.ts`의 `listDays()`가 안 건드리게).
 */
export function expoNotifiedStorePort(): NotifiedStorePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, STATE_FILE);
      return file.exists ? file.text() : null;
    },

    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${STATE_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, STATE_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}

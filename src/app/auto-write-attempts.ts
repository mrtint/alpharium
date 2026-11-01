/**
 * 자동 쓰기 시도 기록 — 날짜별 장부 (078 → 109).
 *
 * 설계: docs/superpowers/specs/2026-11-01-attempt-ledger-design.md · 계약: specs/109-attempt-ledger/contracts/
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜**: iPhone에서 자동 쓰기가 안 될 때 「OS가 한 번도 깨우지 않았다」·「깼는데 창 밖이었다」·「완주하다 끊겼다」를 가를 증거가 없었다.
 * 자동 쓰기가 **판정에 들어갈 때마다** 경로·결과 한 줄을 남긴다. 078은 최근 20건 한 파일이었는데, 15분마다 도는 반복 줄
 * (`no-material` 등)이 하루를 밀어내 며칠 뒤 읽을 때 증거가 사라졌다. 109부터 **날짜별 파일 하나**(`attempt-ledger/YYYY-MM-DD.json`)에
 * 그 날의 줄을 모두 남기고 상한도 자동 삭제도 없다. 058 지우기·059 개발자 끄기·온보딩 다시는 이 장부를 건드리지 않는다.
 *
 * **갈래는 사람이 못 박은 상수다**(원칙 IV) — 시간·바이트·토큰·단계별 소요·이유 문자열은 싣지 않는다. 백그라운드·수동 실행은
 * 시작(`started`)을 먼저 쓰고 끝에 같은 줄을 결과로 바꾼다 — 끝이 영영 안 오면 `started`가 남고 그것이 「프로세스가 도중에 정지됐다」의
 * 증거다. 시작과 끝은 **같은 `at`**(실행 시작 시각)으로 불려 같은 날 파일에서 짝을 찾으므로 자정을 넘는 실행도 시작 날에서 닫힌다.
 * 앱 열기 경로는 판정이 끊길 일이 없어 끝 한 줄만 쓰고, 그 날 파일의 마지막 줄과 경로·결과·날이 같으면 줄을 늘리지 않고 시각만 갱신한다
 * (전경 복귀마다 판정해 하루 수백 줄이 되지 않게). 백그라운드·수동·만료 줄은 합치지 않는다.
 *
 * 요약(날짜별 깨움 횟수 등)은 읽을 때 줄에서 계산한다 — 저장하지 않는다. 기록 실패는 삼킨다 — 기록이 자동 쓰기를 막지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, type DayDate } from "../config/day-boundary";
import type { AutoWriteDecision } from "../schedule/auto-write";

export type AttemptPath = "background" | "app-open" | "manual";
export const ATTEMPT_PATHS: readonly AttemptPath[] = ["background", "app-open", "manual"];

export type AttemptOutcome =
  | "started"
  | "simulation"
  | "disabled"
  | "not-near-target"
  | "catch-up-spent"
  | "all-written"
  | "no-photo-access"
  | "no-material"
  | "no-character"
  | "write"
  | "already-running"
  /** 080 — 사용자가 그 쓰기를 그만두었다(합류한 홈의 「그만두기」·「일기 모두 지우기」). 실패도 미완주도 아니다 */
  | "cancelled"
  | "ran"
  | "failed"
  /**
   * 090 — iOS가 백그라운드 실행의 시간 예산이 끝났다고 알렸다. 만료된 시각의 **따로 선 줄**이다 — 그 실행의 시작 줄은 그대로 남아
   * (멈췄다 이어서 끝나면 끝남 갈래로 바뀐다) 「만료됐다」와 「죽었다」를 가른다.
   */
  | "expired";
export const ATTEMPT_OUTCOMES: readonly AttemptOutcome[] = [
  "started",
  "simulation",
  "disabled",
  "not-near-target",
  "catch-up-spent",
  "all-written",
  "no-photo-access",
  "no-material",
  "no-character",
  "write",
  "already-running",
  "cancelled",
  "ran",
  "failed",
  "expired",
];

/**
 * 090 — 백그라운드·수동 실행이 시작될 때 앱이 앞에 있었는가. lldb 강제 깨우기(앞)와 OS 깨움(뒤)을 기록으로 가른다.
 * 판정 입력이 아니라 기록 값이다.
 */
export type LaunchState = "active" | "background";
const LAUNCH_STATES: readonly LaunchState[] = ["active", "background"];

/**
 * 091 — 백그라운드 실행을 깨운 iOS 요청. `power`는 외부 전원을 요구하는 요청(CPU 감시 없음, 090), `battery`는 요구하지 않는 요청
 * (감시 아래 — 느린 쓰기). 배터리 하루 깨움 수를 이 갈래로 센다. 기록 값이다.
 */
export type WakeKind = "power" | "battery";
const WAKE_KINDS: readonly WakeKind[] = ["power", "battery"];

export type AutoWriteAttempt = {
  at: Date;
  path: AttemptPath;
  outcome: AttemptOutcome;
  /** 090 — 시작 줄에만. 옛 줄·두 값 밖은 없다 */
  launch?: LaunchState;
  /** 091 — 백그라운드 시작 줄에만. 옛 줄·두 값 밖은 없다 */
  wake?: WakeKind;
  /**
   * 105 — 쓰기로 정해진 시도의 끝 줄에만. 판정이 고른 날(`YYYY-MM-DD`)이다. 시간·횟수가 아니라 사람이 읽는 사실이다(원칙 IV).
   * 옛 줄·형식이 틀린 값은 없다.
   */
  day?: DayDate;
};

/** 장부 한 날의 파일을 읽고 쓰는 통로. 날 하나가 파일 하나다 */
export interface AutoWriteAttemptPort {
  read(day: DayDate): Promise<string | null>;
  write(day: DayDate, serialized: string): Promise<void>;
  /** 장부 파일이 있는 날들(순서 불문) */
  days(): Promise<DayDate[]>;
}

/** 057 판정 결과를 갈래로 — `idle`은 020 이유, `skip`은 057 이유, `write`는 「쓸 날을 넘겼다」 */
export function attemptOutcomeOf(decision: AutoWriteDecision): AttemptOutcome {
  if (decision.kind === "idle") return decision.reason;
  if (decision.kind === "skip") return decision.because;
  return "write";
}

/** 105 — 쓰기로 정해진 판정의 날. 그 밖은 없다 */
export function attemptDayOf(decision: AutoWriteDecision): DayDate | undefined {
  return decision.kind === "write" ? decision.day : undefined;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
function isDay(value: unknown): value is DayDate {
  return typeof value === "string" && DAY_PATTERN.test(value);
}

function isPath(value: unknown): value is AttemptPath {
  return typeof value === "string" && (ATTEMPT_PATHS as readonly string[]).includes(value);
}

function isLaunch(value: unknown): value is LaunchState {
  return typeof value === "string" && (LAUNCH_STATES as readonly string[]).includes(value);
}

function isWake(value: unknown): value is WakeKind {
  return typeof value === "string" && (WAKE_KINDS as readonly string[]).includes(value);
}

function isOutcome(value: unknown): value is AttemptOutcome {
  return typeof value === "string" && (ATTEMPT_OUTCOMES as readonly string[]).includes(value);
}

/** 한 날의 줄(시간순, 오래된 줄이 앞). 못 읽거나 깨졌으면 빈 목록. 깨진 항목은 건너뛴다(060과 같다). */
export async function loadDayAttempts(
  port: AutoWriteAttemptPort,
  day: DayDate,
): Promise<AutoWriteAttempt[]> {
  try {
    const raw = await port.read(day);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];
    const out: AutoWriteAttempt[] = [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const {
        at,
        path,
        outcome,
        launch,
        wake,
        day: picked,
      } = item as {
        at?: unknown;
        path?: unknown;
        outcome?: unknown;
        launch?: unknown;
        wake?: unknown;
        day?: unknown;
      };
      if (typeof at !== "string" || !isPath(path) || !isOutcome(outcome)) continue;
      const date = new Date(at);
      if (Number.isNaN(date.getTime())) continue;
      out.push({
        at: date,
        path,
        outcome,
        ...(isLaunch(launch) ? { launch } : {}),
        ...(isWake(wake) ? { wake } : {}),
        ...(isDay(picked) ? { day: picked } : {}),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** 장부에 싣는 필드는 이 여섯뿐이다(FR-005) — 일기 내용·장소·사진 정보·이유 문자열·소요 시간은 없다 */
function toStored(item: AutoWriteAttempt) {
  return {
    at: item.at.toISOString(),
    path: item.path,
    outcome: item.outcome,
    ...(item.launch !== undefined ? { launch: item.launch } : {}),
    ...(item.wake !== undefined ? { wake: item.wake } : {}),
    ...(item.day !== undefined ? { day: item.day } : {}),
  };
}

async function save(
  port: AutoWriteAttemptPort,
  day: DayDate,
  items: readonly AutoWriteAttempt[],
): Promise<void> {
  await port.write(day, JSON.stringify({ items: items.map(toStored) }));
}

/**
 * ★ 같은 프로세스 안의 기록을 한 줄로 세운다. 기록은 「읽고 → 고쳐 → 쓴다」인데 통로가 비동기라, 백그라운드의 시작 기록과 앱 열기
 * 판정의 기록이 겹치면 뒤에 쓴 쪽이 앞의 줄을 덮었다 — iOS는 백그라운드 재실행에서도 `App.tsx`를 그려 둘이 함께 돈다. 잃는 쪽이
 * `started`면 「깼지만 끝나지 않았다」의 증거가 사라진다. 일은 던지지 않으므로(아래 try/catch) 줄이 끊기지 않는다.
 */
let queue: Promise<void> = Promise.resolve();
function inOrder(work: () => Promise<void>): Promise<void> {
  queue = queue.then(work);
  return queue;
}

/** 그 `at`이 속한 날 파일을 읽어 고쳐 쓴다. 실패는 삼킨다. */
function updateDay(
  port: AutoWriteAttemptPort,
  at: Date,
  change: (items: AutoWriteAttempt[]) => AutoWriteAttempt[],
): Promise<void> {
  return inOrder(async () => {
    try {
      const day = dayOf(at);
      await save(port, day, change(await loadDayAttempts(port, day)));
    } catch {
      // 기록이 자동 쓰기를 막지 않는다.
    }
  });
}

/** 시작 — `started` 줄을 그 날 파일 끝에. 090 — 깨운 순간의 앱 상태를 함께 싣는다(모르면 없음). 실패는 삼킨다. */
export function recordAttemptStart(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
  launch?: LaunchState,
  wake?: WakeKind,
): Promise<void> {
  return updateDay(port, at, (items) => [
    ...items,
    {
      at,
      path,
      outcome: "started",
      ...(launch !== undefined ? { launch } : {}),
      ...(wake !== undefined ? { wake } : {}),
    },
  ]);
}

/**
 * 끝 — 같은 `at`(ms까지)·`path`의 줄을 결과로 바꾼다. 짝이 없으면: 앱 열기 경로이고 그 날 마지막 줄과 경로·결과·날이 같으면
 * 그 줄의 시각만 갱신하고, 아니면 끝에 덧붙인다. 실패는 삼킨다.
 */
export function recordAttemptEnd(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
  outcome: AttemptOutcome,
  day?: DayDate,
): Promise<void> {
  return updateDay(port, at, (items) => {
    const key = at.toISOString();
    // 만료 줄은 따로 선 줄이라 짝이 아니다 — 시작 줄 쓰기가 실패해 없을 때 같은 `at`의 만료 줄을 결과로 덮지 않는다(FR-003)
    const index = items.findIndex(
      (item) => item.path === path && item.outcome !== "expired" && item.at.toISOString() === key,
    );
    if (index >= 0) {
      return items.map((item, n) =>
        n === index ? { ...item, outcome, ...(day !== undefined ? { day } : {}) } : item,
      );
    }
    const last = items[items.length - 1];
    // 105 — 날까지 같을 때만 합친다. 다른 날을 같은 줄로 덮으면 어느 날을 골랐는지가 사라진다.
    if (
      path === "app-open" &&
      last !== undefined &&
      last.path === path &&
      last.outcome === outcome &&
      last.day === day
    ) {
      return [...items.slice(0, -1), { ...last, at }];
    }
    return [...items, { at, path, outcome, ...(day !== undefined ? { day } : {}) }];
  });
}

/**
 * 090 — 백그라운드 실행의 시간 예산이 끝났다. 만료된 시각의 `background` 줄을 따로 남긴다(합치지 않는다 — 한 실행에 한 번이다).
 * 시작 줄은 건드리지 않는다. 실패는 삼킨다.
 */
export function recordAttemptExpired(port: AutoWriteAttemptPort, at: Date): Promise<void> {
  return updateDay(port, at, (items) => [...items, { at, path: "background", outcome: "expired" }]);
}

/* ────────────────────────── 날짜별 요약 (읽을 때 계산) ────────────────────────── */

export type DaySummary = {
  day: DayDate;
  /** 백그라운드 줄 중 `expired`가 아닌 것 — 한 실행 하나 (만료는 같은 실행의 따로 선 줄이다, 090) */
  wakes: number;
  firstAt?: Date;
  lastAt?: Date;
  /** `started`로 남은 백그라운드 줄 — 끝나지 못한 실행 */
  unfinished: number;
  /** `started`·`expired`를 뺀 갈래별 백그라운드 줄 수 */
  byOutcome: Partial<Record<AttemptOutcome, number>>;
};

/** 한 날의 줄에서 요약. 백그라운드만 센다 — 앱 열기·수동 줄은 장부에는 있으나 세지 않는다. */
export function summarizeDay(day: DayDate, items: readonly AutoWriteAttempt[]): DaySummary {
  let wakes = 0;
  let unfinished = 0;
  let firstAt: Date | undefined;
  let lastAt: Date | undefined;
  const byOutcome: Partial<Record<AttemptOutcome, number>> = {};
  for (const item of items) {
    if (item.path !== "background" || item.outcome === "expired") continue;
    wakes += 1;
    if (firstAt === undefined || item.at < firstAt) firstAt = item.at;
    if (lastAt === undefined || item.at > lastAt) lastAt = item.at;
    if (item.outcome === "started") unfinished += 1;
    else byOutcome[item.outcome] = (byOutcome[item.outcome] ?? 0) + 1;
  }
  return {
    day,
    wakes,
    ...(firstAt !== undefined ? { firstAt } : {}),
    ...(lastAt !== undefined ? { lastAt } : {}),
    unfinished,
    byOutcome,
  };
}

/** 가장 이른 장부 날부터 오늘까지 최대 `max`일, 최근 날이 앞. 파일 없는 날도 낀다 */
export function summaryDays(earliest: DayDate, today: DayDate, max = 14): DayDate[] {
  const [year, month, date] = today.split("-").map(Number) as [number, number, number];
  const out: DayDate[] = [];
  for (let offset = 0; offset < max; offset += 1) {
    // 원본에서 매번 더한다(누적하면 서머타임 등으로 오차가 쌓인다) — 정오에 두는 것도 같은 이유다(day-boundary.ts)
    const day = dayOf(new Date(year, month - 1, date - offset, 12, 0, 0, 0));
    out.push(day);
    if (day <= earliest) break;
  }
  return out;
}

/** 화면이 보이는 날짜별 요약, 최근 날부터. 장부가 비었거나 읽지 못하면 빈 배열(지어내지 않는다) */
export async function loadAttemptSummaries(
  port: AutoWriteAttemptPort,
  now: Date,
  max = 14,
): Promise<DaySummary[]> {
  try {
    // 오늘보다 뒤 날짜(시계 오류로 생긴 파일)는 범위의 시작으로 삼지 않는다
    const today = dayOf(now);
    const days = (await port.days()).filter((day) => isDay(day) && day <= today).sort();
    const earliest = days[0];
    if (earliest === undefined) return [];
    return await Promise.all(
      summaryDays(earliest, today, max).map(async (day) =>
        summarizeDay(day, await loadDayAttempts(port, day)),
      ),
    );
  } catch {
    return [];
  }
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const LEDGER_DIRECTORY = "attempt-ledger";
const DAY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.json$/;

/** 날 → 파일 이름. 파일 이름이 곧 날짜 키다 */
function dayFileName(day: DayDate): string {
  return `${day}.json`;
}

/** 읽기 경로는 디렉터리를 만들지 않는다(`create: false`) — 화면을 여는 것만으로 부작용이 생기지 않게 */
async function openDirectory(create: boolean) {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, LEDGER_DIRECTORY);
  if (create && !dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** `attempt-ledger/YYYY-MM-DD.json`. 임시 파일에 쓰고 옮긴다(060과 같다). 짧게 사는 `File`에는 `*Sync()`만 쓴다(AGENTS). */
export function expoAutoWriteAttemptPort(): AutoWriteAttemptPort {
  return {
    async read(day) {
      const { dir, File } = await openDirectory(false);
      if (!dir.exists) return null;
      const file = new File(dir, dayFileName(day));
      return file.exists ? file.textSync() : null;
    },
    async write(day, serialized) {
      const { dir, File } = await openDirectory(true);
      const temporary = new File(dir, `${dayFileName(day)}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);
      const target = new File(dir, dayFileName(day));
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
    async days() {
      const { dir } = await openDirectory(false);
      if (!dir.exists) return [];
      const out: DayDate[] = [];
      for (const item of dir.list()) {
        const match = DAY_FILE_PATTERN.exec(item.name ?? "");
        if (match?.[1] !== undefined) out.push(match[1]);
      }
      return out;
    },
  };
}

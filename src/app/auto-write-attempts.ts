/**
 * 자동 쓰기 시도 기록 (078).
 *
 * 설계: docs/superpowers/specs/2026-10-13-auto-write-missed-day-and-attempt-log-design.md 조각 2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜**: iPhone에서 자동 쓰기가 안 될 때 「OS가 한 번도 깨우지 않았다」·「깼는데 창 밖이었다」·「완주하다 끊겼다」를 가를 증거가 없었다.
 * 자동 쓰기가 **판정에 들어갈 때마다** 경로·결과 한 줄을 남기고 진단 화면이 보인다. 060 쓰기 실패 기록(`write-failures.ts`)과 같은 꼴이다.
 *
 * **갈래는 사람이 못 박은 상수다**(원칙 IV) — 시간·바이트·토큰·단계별 소요·이유 문자열은 싣지 않는다. 백그라운드·수동 실행은
 * 시작(`started`)을 먼저 쓰고 끝에 같은 줄을 결과로 바꾼다 — 끝이 영영 안 오면 `started`가 남고 그것이 「프로세스가 도중에 정지됐다」의
 * 증거다. 앱 열기 경로는 판정이 끊길 일이 없어 끝 한 줄만 쓴다. 바로 앞 줄과 경로·결과가 같으면 새 줄 대신 시각만 갱신한다 —
 * 전경 복귀마다 판정하는 앱 열기 줄이 백그라운드 줄을 상한 밖으로 밀어내지 않게.
 *
 * 058 지우기·059 개발자 끄기·온보딩 다시는 이 파일을 건드리지 않는다. 기록 실패는 삼킨다 — 기록이 자동 쓰기를 막지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AutoWriteDecision } from "../schedule/auto-write";

export type AttemptPath = "background" | "app-open" | "manual";
export const ATTEMPT_PATHS: readonly AttemptPath[] = ["background", "app-open", "manual"];

export type AttemptOutcome =
  | "started"
  | "simulation"
  | "disabled"
  | "not-near-target"
  | "all-written"
  | "no-photo-access"
  | "no-material"
  | "no-character"
  | "write"
  | "already-running"
  | "ran"
  | "failed";
export const ATTEMPT_OUTCOMES: readonly AttemptOutcome[] = [
  "started",
  "simulation",
  "disabled",
  "not-near-target",
  "all-written",
  "no-photo-access",
  "no-material",
  "no-character",
  "write",
  "already-running",
  "ran",
  "failed",
];

export type AutoWriteAttempt = { at: Date; path: AttemptPath; outcome: AttemptOutcome };

/** 최근 몇 건을 남기는가 — 사람이 정한 값 */
export const MAX_AUTO_WRITE_ATTEMPTS = 20;

export interface AutoWriteAttemptPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 057 판정 결과를 갈래로 — `idle`은 020 이유, `skip`은 057 이유, `write`는 「쓸 날을 넘겼다」 */
export function attemptOutcomeOf(decision: AutoWriteDecision): AttemptOutcome {
  if (decision.kind === "idle") return decision.reason;
  if (decision.kind === "skip") return decision.because;
  return "write";
}

function isPath(value: unknown): value is AttemptPath {
  return typeof value === "string" && (ATTEMPT_PATHS as readonly string[]).includes(value);
}

function isOutcome(value: unknown): value is AttemptOutcome {
  return typeof value === "string" && (ATTEMPT_OUTCOMES as readonly string[]).includes(value);
}

/** 못 읽거나 깨졌으면 빈 목록. 깨진 항목은 건너뛴다(060과 같다). */
export async function loadAutoWriteAttempts(
  port: AutoWriteAttemptPort,
): Promise<AutoWriteAttempt[]> {
  try {
    const raw = await port.read();
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];
    const out: AutoWriteAttempt[] = [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const { at, path, outcome } = item as { at?: unknown; path?: unknown; outcome?: unknown };
      if (typeof at !== "string" || !isPath(path) || !isOutcome(outcome)) continue;
      const date = new Date(at);
      if (Number.isNaN(date.getTime())) continue;
      out.push({ at: date, path, outcome });
    }
    return out.slice(0, MAX_AUTO_WRITE_ATTEMPTS);
  } catch {
    return [];
  }
}

async function save(port: AutoWriteAttemptPort, items: readonly AutoWriteAttempt[]): Promise<void> {
  await port.write(
    JSON.stringify({
      items: items
        .slice(0, MAX_AUTO_WRITE_ATTEMPTS)
        .map((item) => ({ at: item.at.toISOString(), path: item.path, outcome: item.outcome })),
    }),
  );
}

/** 시작 — `started` 줄을 맨 앞에. 실패는 삼킨다. */
export async function recordAttemptStart(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
): Promise<void> {
  try {
    const previous = await loadAutoWriteAttempts(port);
    await save(port, [{ at, path, outcome: "started" }, ...previous]);
  } catch {
    // 기록이 자동 쓰기를 막지 않는다.
  }
}

/**
 * 끝 — 같은 `at`(ms까지)·`path`의 줄을 결과로 바꾼다. 짝이 없으면: 바로 앞 줄과 경로·결과가 같으면 그 줄의 시각만 갱신하고,
 * 아니면 맨 앞에 넣는다. 실패는 삼킨다.
 */
export async function recordAttemptEnd(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
  outcome: AttemptOutcome,
): Promise<void> {
  try {
    const previous = await loadAutoWriteAttempts(port);
    const key = at.toISOString();
    const index = previous.findIndex((item) => item.path === path && item.at.toISOString() === key);
    if (index >= 0) {
      await save(
        port,
        previous.map((item, n) => (n === index ? { ...item, outcome } : item)),
      );
      return;
    }
    const head = previous[0];
    if (head !== undefined && head.path === path && head.outcome === outcome) {
      await save(port, [{ ...head, at }, ...previous.slice(1)]);
      return;
    }
    await save(port, [{ at, path, outcome }, ...previous]);
  } catch {
    // 기록이 자동 쓰기를 막지 않는다.
  }
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const ATTEMPT_FILE = "auto-write-attempts.json";

async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** `preferences/auto-write-attempts.json`. 임시 파일에 쓰고 옮긴다(060과 같다). 짧게 사는 `File`에는 `*Sync()`만 쓴다(AGENTS). */
export function expoAutoWriteAttemptPort(): AutoWriteAttemptPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, ATTEMPT_FILE);
      return file.exists ? file.textSync() : null;
    },
    async write(serialized) {
      const { dir, File } = await openDirectory();
      const temporary = new File(dir, `${ATTEMPT_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);
      const target = new File(dir, ATTEMPT_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}

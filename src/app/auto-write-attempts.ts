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
};

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

function isLaunch(value: unknown): value is LaunchState {
  return typeof value === "string" && (LAUNCH_STATES as readonly string[]).includes(value);
}

function isWake(value: unknown): value is WakeKind {
  return typeof value === "string" && (WAKE_KINDS as readonly string[]).includes(value);
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
      const { at, path, outcome, launch, wake } = item as {
        at?: unknown;
        path?: unknown;
        outcome?: unknown;
        launch?: unknown;
        wake?: unknown;
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
      });
    }
    return out.slice(0, MAX_AUTO_WRITE_ATTEMPTS);
  } catch {
    return [];
  }
}

async function save(port: AutoWriteAttemptPort, items: readonly AutoWriteAttempt[]): Promise<void> {
  await port.write(
    JSON.stringify({
      items: items.slice(0, MAX_AUTO_WRITE_ATTEMPTS).map((item) => ({
        at: item.at.toISOString(),
        path: item.path,
        outcome: item.outcome,
        ...(item.launch !== undefined ? { launch: item.launch } : {}),
        ...(item.wake !== undefined ? { wake: item.wake } : {}),
      })),
    }),
  );
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

/** 시작 — `started` 줄을 맨 앞에. 090 — 깨운 순간의 앱 상태를 함께 싣는다(모르면 없음). 실패는 삼킨다. */
export function recordAttemptStart(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
  launch?: LaunchState,
  wake?: WakeKind,
): Promise<void> {
  return inOrder(async () => {
    try {
      const previous = await loadAutoWriteAttempts(port);
      const line: AutoWriteAttempt = {
        at,
        path,
        outcome: "started",
        ...(launch !== undefined ? { launch } : {}),
        ...(wake !== undefined ? { wake } : {}),
      };
      await save(port, [line, ...previous]);
    } catch {
      // 기록이 자동 쓰기를 막지 않는다.
    }
  });
}

/**
 * 끝 — 같은 `at`(ms까지)·`path`의 줄을 결과로 바꾼다. 짝이 없으면: 바로 앞 줄과 경로·결과가 같으면 그 줄의 시각만 갱신하고,
 * 아니면 맨 앞에 넣는다. 실패는 삼킨다.
 */
export function recordAttemptEnd(
  port: AutoWriteAttemptPort,
  path: AttemptPath,
  at: Date,
  outcome: AttemptOutcome,
): Promise<void> {
  return inOrder(async () => {
    try {
      const previous = await loadAutoWriteAttempts(port);
      const key = at.toISOString();
      const index = previous.findIndex(
        (item) => item.path === path && item.at.toISOString() === key,
      );
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
  });
}

/**
 * 090 — 백그라운드 실행의 시간 예산이 끝났다. 만료된 시각의 `background` 줄을 따로 남긴다(합치기 규칙은 끝과 같다 — 짝을 찾지 않는다).
 * 시작 줄은 건드리지 않는다. 실패는 삼킨다.
 */
export function recordAttemptExpired(port: AutoWriteAttemptPort, at: Date): Promise<void> {
  return inOrder(async () => {
    try {
      const previous = await loadAutoWriteAttempts(port);
      const head = previous[0];
      if (head !== undefined && head.path === "background" && head.outcome === "expired") {
        await save(port, [{ ...head, at }, ...previous.slice(1)]);
        return;
      }
      await save(port, [{ at, path: "background", outcome: "expired" }, ...previous]);
    } catch {
      // 기록이 자동 쓰기를 막지 않는다.
    }
  });
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

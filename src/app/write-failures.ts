/**
 * 쓰기 실패의 영구 기록 (060, 보드 `6h` ⑦ 「최근 실패」).
 *
 * 계약: specs/081-write-failure-reasons/contracts/write-failure-reasons.md F·S절(갈래 판정 — 060 WF1을 대체), 그 밖은
 * specs/060-diagnostics-screen/contracts/diagnostics.md WF2~WF9, data-model.md §1, research R2·R3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이유 갈래와 시각뿐이다**(D3, 원칙 IV). 걸린 시간·토큰·모델·어느 하루였는지·오류 문구를 담으면 실행 이력 로그로 자란다 —
 * `skip-store.ts`(057)가 날짜 하나만 담는 것과 같은 이유다. 최근 열 건을 넘으면 오래된 것부터 빠진다.
 *
 * **파이프라인 결과를 소비하는 쪽이 부른다**(홈 `generate`·`runAutoDiaryTask`·첫 실행 자동 첫 일기) — 파이프라인 안에서 기록하면
 * 「사용자가 그만뒀다」와 「OS가 앱을 끊었다」(둘 다 `interrupted`)를 가를 수 없다. 그만두기·건너뜀·`already-running`(다른 쪽이
 * 쓰고 있다)은 실패가 아니라 기록하지 않는다. **읽기는 던지지 않고 기록 실패는 삼킨다** — 일기 쓰기·토스트에 영향이 없다.
 *
 * 갈래 판정은 054 `failure-toast.ts`와 같은 규칙이다: `reason`의 앞 토큰(`` `${kind}: ${detail}` ``)과 `vision-failed`·`rejected`의 detail만
 * 본다. 문구 전체를 비교하면 문구를 고칠 때 조용히 깨진다(053의 교훈).
 *
 * **081 — 갈래는 열하나다**(specs/081-write-failure-reasons/contracts/write-failure-reasons.md F절, 표는 data-model.md §2).
 * 060의 다섯은 판정 거부·시간 초과·끊김·예외를 `unwritten` 하나로 뭉쳐, 실패가 났을 때 「어느 문에서 멈췄는가」를 가를 수
 * 없었다. 늘어난 것은 갈래의 수뿐이다 — 담는 것은 여전히 갈래와 시각이고, 점수·시간·오류 문구가 아니다. **판정의 갈래는
 * 늘지 않는다**(원칙 IV): 거부 넷은 `acceptance.ts`가 이미 가른 것을 여기까지 옮긴 것이고, 이 모듈은 그 모듈에 기대지 않는다
 * (테스트가 두 쪽의 집합을 대조한다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 보드 `diag.fail.*` 넷 + 081이 더한 여섯 + 어디에도 안 맞는 실패와 옛 기록을 위한 `unwritten`.
 *
 * - `echo`·`language`·`unfinished` — 판정 거부(빈 글은 보드의 `empty`)
 * - `timed-out` — 생성 시간 한도. **멈춰 있다 돌아와 한도가 지난 것도 이 갈래다**(079) — 가르려면 시간을 기록해야 해서 가르지 않는다
 * - `interrupted` — 사용자가 그만둔 것이 아닌데 끊겼다(앱이 앞을 벗어남, OS 중단). 그만둔 쓰기는 기록되지 않는다
 * - `error` — 생성 중 예외. 오류 문구는 읽지도 담지도 않는다
 */
const REASONS = [
  "module",
  "photos",
  "empty",
  "save",
  "echo",
  "language",
  "unfinished",
  "timed-out",
  "interrupted",
  "error",
  "unwritten",
] as const;

/** 갈래의 이름은 위 목록에서 나온다 — 타입에만 더한 갈래가 기록된 뒤 읽을 때 조용히 버려지는 일이 없게 */
export type WriteFailureReason = (typeof REASONS)[number];

/** 기록 항목 하나 — 필드는 이 둘뿐이다 */
export type WriteFailure = { reason: WriteFailureReason; at: Date };

/** 최근 몇 건까지 남기는가 — 사람이 정한 값(보드 「최근 10건」) */
export const MAX_WRITE_FAILURES = 10;

/** 기록이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface WriteFailurePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/**
 * 파이프라인 결과에서 이 모듈이 보는 모양 — 파이프라인 타입에 닿지 않는다.
 *
 * `cancelled` — 사용자가 그 쓰기를 그만두었다(080, 등록부의 칸에 그만둠이 선 채 끝났다).
 */
export type WriteResult = { ok: boolean; stage?: string; reason?: string; cancelled?: boolean };

function split(reason: string | undefined): { kind: string; detail: string } {
  const [kind, ...rest] = (reason ?? "").split(":");
  return { kind: kind?.trim() ?? "", detail: rest.join(":").trim() };
}

/**
 * 판정 거부의 까닭 값을 갈래로 옮긴다. 넷 밖이면(판정 갈래가 바뀌었거나 까닭이 실리지 않은 옛 모양) 다른 갈래로 새지 않고
 * `unwritten`이다.
 */
function rejectedReasonFor(detail: string): WriteFailureReason {
  switch (detail) {
    case "empty":
      return "empty";
    case "echo":
      return "echo";
    case "language":
      return "language";
    case "unfinished":
      return "unfinished";
    default:
      return "unwritten";
  }
}

/** 실패 하나를 이유 갈래로 옮긴다. 던지지 않는다. 모르는 것은 `unwritten`이다. */
export function writeFailureReasonFor(result: {
  stage?: string;
  reason?: string;
}): WriteFailureReason {
  const { kind, detail } = split(result.reason);

  switch (result.stage) {
    case "storage":
      return "save";
    case "request-build":
    case "model-not-ready":
      return "module";
    case "signals":
      return "photos";
    case "vision":
      if (detail === "not-ready") return "module";
      // 사진을 못 읽은 것이 아니라 읽는 도중 끊긴 것이다 — 본문 도중의 끊김과 같은 갈래다(081 F3)
      if (detail === "cancelled") return "interrupted";
      return "photos";
    case "generation":
      switch (kind) {
        case "model-load-failed":
          return "module";
        case "rejected":
          return rejectedReasonFor(detail);
        case "timed-out":
          return "timed-out";
        case "interrupted":
          return "interrupted";
        case "generation-failed":
          return "error";
        default:
          return "unwritten";
      }
    default:
      return "unwritten";
  }
}

/**
 * 기록할 만한 실패인가 — 성공과 `already-running`(다른 쪽이 쓰는 중)은 아니다.
 *
 * 080 — **사용자가 그만둔 쓰기도 아니다.** 합류한 홈의 「그만두기」나 「일기 모두 지우기」가 끊은 쓰기는 시작한 쪽
 * (백그라운드 태스크·첫 실행 자동 첫 일기)에 실패 모양으로 돌아오지만 실패가 아니다. 문구가 아니라 값으로 가른다.
 * 홈이 스스로 시작한 쓰기의 그만두기는 홈이 먼저 거른다(071의 시도 번호) — 여기 오지 않는다.
 */
function isRecordable(result: WriteResult): boolean {
  return !result.ok && result.stage !== "already-running" && result.cancelled !== true;
}

function isReason(value: unknown): value is WriteFailureReason {
  return typeof value === "string" && (REASONS as readonly string[]).includes(value);
}

/** 기록을 읽는다. 없음·깨짐·모양이 다름·통로 예외는 빈 목록이고, 못 읽는 항목만 버린다. */
export async function loadWriteFailures(port: WriteFailurePort): Promise<WriteFailure[]> {
  try {
    const raw = await port.read();
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];

    const out: WriteFailure[] = [];
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const { reason, at } = item as { reason?: unknown; at?: unknown };
      if (!isReason(reason) || typeof at !== "string") continue;
      const date = new Date(at);
      if (Number.isNaN(date.getTime())) continue;
      out.push({ reason, at: date });
    }
    return out.slice(0, MAX_WRITE_FAILURES);
  } catch {
    return [];
  }
}

/**
 * 쓰기 실패 하나를 맨 앞에 더한다. 기록할 만한 실패가 아니면 아무것도 하지 않는다. **던지지 않는다.**
 */
export async function recordWriteFailure(
  port: WriteFailurePort,
  result: WriteResult,
  at: Date,
): Promise<void> {
  if (!isRecordable(result)) return;
  try {
    const previous = await loadWriteFailures(port);
    const next = [{ reason: writeFailureReasonFor(result), at }, ...previous].slice(
      0,
      MAX_WRITE_FAILURES,
    );
    await port.write(
      JSON.stringify({
        items: next.map((item) => ({ reason: item.reason, at: item.at.toISOString() })),
      }),
    );
  } catch {
    // 기록하지 못해도 일기 쓰기·토스트 경로는 그대로다(FR-018)
  }
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const FAILURE_FILE = "write-failures.json";

/** 디렉터리를 연다. **지연 import다.** */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/** 기기의 실패 기록 통로. `preferences/` 아래 — `diary/` 밖이라 일기 목록이 건드리지 않는다. */
export function expoWriteFailurePort(): WriteFailurePort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, FAILURE_FILE);
      return file.exists ? file.textSync() : null;
    },

    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${FAILURE_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, FAILURE_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}

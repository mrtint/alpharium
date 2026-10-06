/**
 * 쓰기 실패의 영구 기록 (060, 보드 `6h` ⑦ 「최근 실패」).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md WF1~WF9, data-model.md §1, research R2·R3
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
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 보드 `diag.fail.*` 넷 + 앞 넷에 안 맞는 모든 실패를 위한 다섯째(clarify Q1) */
export type WriteFailureReason = "module" | "photos" | "empty" | "save" | "unwritten";

const REASONS: readonly WriteFailureReason[] = ["module", "photos", "empty", "save", "unwritten"];

/** 기록 항목 하나 — 필드는 이 둘뿐이다 */
export type WriteFailure = { reason: WriteFailureReason; at: Date };

/** 최근 몇 건까지 남기는가 — 사람이 정한 값(보드 「최근 10건」) */
export const MAX_WRITE_FAILURES = 10;

/** 기록이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface WriteFailurePort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 파이프라인 결과에서 이 모듈이 보는 모양 — 파이프라인 타입에 닿지 않는다 */
export type WriteResult = { ok: boolean; stage?: string; reason?: string };

function split(reason: string | undefined): { kind: string; detail: string } {
  const [kind, ...rest] = (reason ?? "").split(":");
  return { kind: kind?.trim() ?? "", detail: rest.join(":").trim() };
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
      return detail === "not-ready" ? "module" : "photos";
    case "generation":
      if (kind === "model-load-failed") return "module";
      if (kind === "rejected" && detail === "empty") return "empty";
      return "unwritten";
    default:
      return "unwritten";
  }
}

/** 기록할 만한 실패인가 — 성공과 `already-running`(다른 쪽이 쓰는 중)은 아니다 */
function isRecordable(result: WriteResult): boolean {
  return !result.ok && result.stage !== "already-running";
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
      return file.exists ? file.text() : null;
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

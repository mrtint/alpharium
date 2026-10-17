/**
 * 087 — 실제 iPhone에 합성 하루의 사진을 넣는 도구의 순수 부분(계획·인자·lldb 스크립트).
 *
 * 기기·네트워크·파일을 부르지 않는다. 그것들은 `ios-seed.mts`가 이 모듈 밖에서 다룬다.
 * 안드로이드 `scripts/seed/`(010)의 짝이다 — **입력(사진)만 심고 일기는 만들지도 읽지도 않는다**(원칙 IV).
 */

export const SEED_DIR = "Documents/seed-ios";
export const DYLIB_PATH = `${SEED_DIR}/PocketSeed.dylib`;

/**
 * 실행마다 폴더가 따로다 — `devicectl device copy to`는 기기 파일이 원본보다 새로우면 조용히 덮어쓰지 않고(087),
 * 지난 실행의 `done: true` 상태 파일을 새 실행의 결과로 읽을 수도 있다.
 */
export const runDir = (runId: string) => `${SEED_DIR}/${runId}`;
export const statusPathOf = (runId: string) => `${runDir(runId)}/status.json`;
export const planPathOf = (runId: string) => `${runDir(runId)}/plan.json`;

/** 한 하루의 사진을 퍼뜨리는 시각 범위(기기 로컬 시각) — 사람이 정한 값 */
const FIRST_HOUR = 8;
const LAST_HOUR = 21;
/** 좌표 기본값(경기 성남 판교) — 한 자리에서 조금씩 떨어진 점들. 사람이 정한 값 */
const BASE_LAT = 37.4018;
const BASE_LON = 127.1036;
const STEP_DEGREES = 0.0004;

export type PlanAsset = { path: string; takenAt: string; lat?: number; lon?: number };
export type SeedPlan = { statusPath: string; assets: PlanAsset[] };
export type Upload = { from: string; to: string };

export type PlanInput = {
  /** 실행 식별자 — 폴더 이름으로 쓴다(영숫자·`-`) */
  runId: string;
  day: string;
  count: number;
  /** 원본 사진 파일 경로들(개발 기계) — 모자라면 돌려 쓴다 */
  photos: readonly string[];
  /** `+09:00` 꼴 */
  tz: string;
  gps: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

function timeAt(index: number, count: number): string {
  if (count === 1) return `${pad(FIRST_HOUR)}:00:00`;
  const minutes =
    Math.round(((LAST_HOUR - FIRST_HOUR) * 60 * index) / (count - 1)) + FIRST_HOUR * 60;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;
}

export function buildPlan(input: PlanInput): { plan: SeedPlan; uploads: Upload[] } {
  if (!/^[A-Za-z0-9-]+$/.test(input.runId))
    throw new Error(`runId는 영숫자와 -만 쓴다: ${input.runId}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day))
    throw new Error(`day는 YYYY-MM-DD여야 한다: ${input.day}`);
  if (!Number.isInteger(input.count) || input.count < 1)
    throw new Error(`count는 1 이상의 정수여야 한다: ${input.count}`);
  if (input.photos.length === 0) throw new Error("photos가 비었다 — 심을 원본 사진이 없다");

  const assets: PlanAsset[] = [];
  const uploads: Upload[] = [];
  for (let i = 0; i < input.count; i++) {
    const to = `${runDir(input.runId)}/photos/${pad(i + 1)}.jpg`;
    const asset: PlanAsset = {
      path: to,
      takenAt: `${input.day}T${timeAt(i, input.count)}${input.tz}`,
    };
    if (input.gps) {
      asset.lat = Number((BASE_LAT + STEP_DEGREES * i).toFixed(6));
      asset.lon = BASE_LON;
    }
    assets.push(asset);
    uploads.push({ from: input.photos[i % input.photos.length], to });
  }
  return { plan: { statusPath: statusPathOf(input.runId), assets }, uploads };
}

export type Args = {
  day: string;
  count: number;
  photos: string | undefined;
  device: string | undefined;
  gps: boolean;
};

export function parseArgs(argv: readonly string[]): Args {
  const out: { day?: string; count?: number; photos?: string; device?: string; gps: boolean } = {
    gps: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-gps") out.gps = false;
    else if (a === "--day") out.day = argv[++i];
    else if (a === "--count") out.count = Number(argv[++i]);
    else if (a === "--photos") out.photos = argv[++i];
    else if (a === "--device") out.device = argv[++i];
    else throw new Error(`모르는 옵션: ${a}`);
  }
  if (!out.day) throw new Error("--day YYYY-MM-DD가 필요하다");
  if (out.count === undefined || Number.isNaN(out.count)) throw new Error("--count N이 필요하다");
  return { day: out.day, count: out.count, photos: out.photos, device: out.device, gps: out.gps };
}

export type LldbInput = {
  device: string;
  pid: number;
  planPath: string;
  dylibPath: string;
  /** 붙은 뒤 프로세스가 멈출 때까지 기다리는 한도(초). 공유 캐시를 읽느라 30~60초 걸린 적이 있다 */
  attachWaitSec: number;
};

/** lldb의 Objective-C++ 폴백은 반환형을 모르면 메서드를 못 찾는다 — 캐스트가 필요하다 */
const cPath = (rel: string) =>
  `(const char*)[(id)[(id)NSHomeDirectory() stringByAppendingPathComponent:@"${rel}"] UTF8String]`;

/**
 * 앱 프로세스에 붙어 `PocketSeed.dylib`을 열고 `PocketSeedStart`를 부른 뒤 프로세스를 다시 돌린다.
 *
 * - 배치 모드의 동기 `process continue`는 프로세스가 멈출 때까지 돌아오지 않아 뒤 명령이 실행되지 않는다 → 비동기로 돌린다.
 * - 한 명령이 오류여도 배치가 멈추지 않게 한다(멈추면 앱이 멈춘 채 남는다).
 */
export function buildLldbScript(i: LldbInput): string {
  return [
    "settings set interpreter.stop-command-source-on-error false",
    `device select ${i.device}`,
    `device process attach --pid ${i.pid}`,
    `script import time,lldb; p=lldb.debugger.GetSelectedTarget().GetProcess(); [time.sleep(1) for _ in range(${i.attachWaitSec}) if p.GetState()!=lldb.eStateStopped]; print("STATE", p.GetState())`,
    `expr -l objc -- void *$h = (void*)dlopen(${cPath(i.dylibPath)}, 2); (void*)$h`,
    `expr -l objc -- (int)((int(*)(const char*))dlsym($h, "PocketSeedStart"))(${cPath(i.planPath)})`,
    "script lldb.debugger.SetAsync(True); lldb.debugger.GetSelectedTarget().GetProcess().Continue(); import time; time.sleep(2)",
    "",
  ].join("\n");
}

/**
 * 097 — iOS 층 2 실행: 흐름마다 기준 상태를 다시 만들고, 사람이 눌러야 할 것을 안내하고, 일기 파일이 생기는지 본다.
 *
 * 계약: specs/097-ios-e2e-suite/contracts/ios-layer2-runner.md (L2-0~L2-8, I-1), data-model 「상태 전이」
 *
 * Maestro가 없다(실기기를 구동하지 못한다 — research R1). 그래서 안드로이드 `runLayer2`(073)를 일반화하지 않고 따로 둔다 — 기준 상태 만들기
 * (`prepareBaseline`)만 재사용한다. **일기 본문을 읽거나 점수화하지 않는다**(원칙 IV): 일기 파일이 생겼는가, 정상 형식(JSON·날짜 일치·본문이 빈 문자열이
 * 아님)인가, 실패 기록에 새 항목이 없는가까지만 본다. 끝에 일기를 개발 기계로 가져오는 것은 출력일 뿐이고 사람이 읽는다.
 *
 * 쓰는 중은 파일로 안 보인다(research R7) — 사람이 조작을 마치고 Enter로 알리는 것이 「조작했다」의 유일한 신호다. 그래서 조작 대기 초과(Enter 없음)와
 * 생성 대기 초과(Enter 뒤 파일 없음)를 가른다(FR-010). 앱 삭제·재설치·모델 변경이 없다(I-1).
 *
 * 순수한 조립이다 — 기기·시계·키보드·시딩은 주입받으므로 기기 없이 테스트된다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Outcome } from "../layer1/device.ts";
import { BASELINE } from "../layer1/baseline.ts";
import {
  buildFixtureDiaries,
  fixtureDay,
  fixturePhotoNames,
  FIXTURES_DIRECTORY,
} from "../layer1/fixtures.ts";
import { prepareBaseline, type Fixtures } from "../layer1/runner.ts";
import type { IosPhone } from "./device.ts";
import { IOS_LAYER2_FLOWS, type Layer2IosFlow } from "./flows.ts";

/** 연속으로 몇 번 목록을 못 읽으면 기기에 닿지 못하는 것으로 보고 중단하나 */
const MAX_POLL_ERRORS = 6;
/** 일기 폴더에서 일기 파일(과 쓰는 중 임시 파일)로 보는 이름 */
const DIARY_FILE = /^\d{4}-\d{2}-\d{2}\.json(\.writing)?$/;

/** 필수 모델 파일 (`ESSENTIAL_ASSET_KEYS`와 같다 — 층 1 runner.ts의 점검과 같은 규칙) */
const REQUIRED_MODEL_FILES = ["a1.bin", "v1.bin", "v2.bin"];
/** 시딩할 사진 수 — 어제 5장(안드로이드 층 2의 어제 픽스처와 같다) */
export const SEED_PHOTO_COUNT = 5;

export const DEDICATED_PHONE_NOTICE =
  "층 2는 전용 iPhone에서만 돈다 — 이 기기의 일기를 지우고 실제 모델로 쓴다. 사진 보관함에 합성 사진이 남는다(지우는 도구가 없다).";

export type FlowOutcome =
  | "passed"
  | "failed-operation-timeout"
  | "failed-generation-timeout"
  | "failed-write-failure"
  | "failed-invalid-diary"
  | "aborted"
  | "not-run";

export type IosLayer2Result = {
  status: "passed" | "failed" | "skipped" | "aborted";
  reason?: string;
  perFlow: { id: string; outcome: FlowOutcome; collected?: string; detail?: string }[];
};

export type PromptPort = {
  announce(lines: string[]): void;
  /** 사람이 조작을 마치고 Enter를 누를 때까지. 표준 입력이 터미널이 아니면 `no-tty` */
  waitForEnter(timeoutMs: number): Promise<"entered" | "timeout" | "no-tty">;
};

export type SeedPort = {
  xcodeRunning(): boolean;
  /** 그 날에 합성 사진을 심는다 (`ios:seed`) */
  seedDay(day: string, count: number): Outcome<void>;
  /** 이 기기에 이미 심은 날짜들 (같은 날 재시딩 방지 — 기기마다 따로 센다) */
  seededDays(udid: string): string[];
  markSeeded(udid: string, day: string): void;
};

export type IosLayer2Deps = {
  phone: IosPhone;
  seed: SeedPort;
  prompt: PromptPort;
  clock: { nowMs(): number; sleep(ms: number): Promise<void> };
  now?: Date;
  flows?: readonly Layer2IosFlow[];
  /** 흐름이 쓴 일기를 모아 둘 개발 기계의 폴더 */
  collectDirectory?: string;
  pollIntervalMs?: number;
  /** 흐름의 기본 대기 한도를 덮는다(음성 확인용) */
  operationTimeoutMs?: number;
  generationTimeoutMs?: number;
  log?: (line: string) => void;
};

function stamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

const must = (step: string, outcome: Outcome<unknown>): string | null =>
  outcome.ok ? null : `${step}: ${outcome.detail}`;

function noRuns(flows: readonly Layer2IosFlow[]): IosLayer2Result["perFlow"] {
  return flows.map((f) => ({ id: f.id, outcome: "not-run" as const }));
}

/** 일기 파일이 정상 형식인가 — JSON이고 날짜가 맞고 본문이 빈 문자열이 아니다. 내용을 평가하지 않는다 */
export function diaryProblem(text: string, day: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "JSON이 아니다";
  }
  if (typeof parsed !== "object" || parsed === null) return "객체가 아니다";
  const { date, text: body } = parsed as { date?: unknown; text?: unknown };
  if (date !== day) return `날짜가 ${day}가 아니다`;
  if (typeof body !== "string" || body.trim() === "") return "본문이 비어 있다";
  return null;
}

export async function runLayer2Ios(deps: IosLayer2Deps): Promise<IosLayer2Result> {
  const { phone, seed, prompt, clock } = deps;
  const flows = deps.flows ?? IOS_LAYER2_FLOWS;
  const log = deps.log ?? (() => {});
  const now = deps.now ?? new Date();
  const collectDirectory = deps.collectDirectory ?? join(".cache", "layer2-ios", stamp(now));
  const pollMs = deps.pollIntervalMs ?? 5000;

  log(`  ${DEDICATED_PHONE_NOTICE}`);

  // L2-1 — 기기. 없으면 건너뜀(통과가 아니다)
  const udids = phone.listDevices();
  if (udids === null)
    return { status: "skipped", reason: phone.labels.toolMissing, perFlow: noRuns(flows) };
  if (udids.length === 0)
    return { status: "skipped", reason: phone.labels.noDevice, perFlow: noRuns(flows) };
  if (udids.length > 1) {
    return {
      status: "aborted",
      reason: `층 2는 iPhone이 하나일 때만 돈다 (${udids.join(", ")}) — 하나만 남기고 다시 부른다`,
      perFlow: noRuns(flows),
    };
  }
  const udid = udids[0];
  const aborted = (reason: string, perFlow = noRuns(flows)): IosLayer2Result => ({
    status: "aborted",
    reason,
    perFlow,
  });

  const probe = phone.probe(udid);
  if (!probe.ok)
    return aborted(`[${udid}] 앱 데이터에 닿지 못했다(${phone.labels.probeHint}): ${probe.detail}`);

  // L2-2 — 모델이 있고 0바이트가 아니다 (읽기만; 내려받기 중에 0KB 파일이 보였다 — 실측)
  const models = phone.remoteList(udid, "models");
  if (!models.ok) return aborted(`[${udid}] 모델 폴더를 읽지 못했다: ${models.detail}`);
  const unready = REQUIRED_MODEL_FILES.filter(
    (name) => (models.value.find((m) => m.name === name)?.size ?? 0) === 0,
  );
  if (unready.length > 0) {
    return aborted(
      `[${udid}] 모델이 없거나 0바이트다: ${unready.join(", ")} — 층 2는 모델을 받지 않는다. 앱에서 먼저 받아 둔다`,
    );
  }

  const allFixtures: Fixtures = {
    diaries: buildFixtureDiaries(now),
    photos: fixturePhotoNames(now).map((name) => ({
      name,
      localPath: join(process.cwd(), FIXTURES_DIRECTORY, "photos", name),
    })),
  };

  /** 기준 상태(자동 쓰기 꺼짐)를 만들어 기기에 올린다. 문제가 있으면 이유를 돌려준다 */
  const prepare = async (flow: Layer2IosFlow | null): Promise<string | null> => {
    const absent =
      flow === null
        ? new Set<string>()
        : new Set(flow.absentDays.map((k) => `${fixtureDay(now, k)}.json`));
    const fixtures: Fixtures = {
      photos: allFixtures.photos,
      diaries: allFixtures.diaries.filter((d) => !absent.has(d.name)),
    };
    const base = prepareBaseline(phone, udid, fixtures, log, phone.labels);
    if (base !== null) return base.reason ?? "기준 상태를 만들지 못했다";
    const flushed = must(`[${udid}] 기준 상태 올리기`, await phone.flush(udid));
    if (flushed !== null) return flushed;
    return verifyBaseline(fixtures.diaries.map((d) => d.name));
  };

  /**
   * 지우기가 정말 됐는가 — 앱 안의 삭제(lldb)는 「이미 없음」과 실패를 가르지 못하므로 기기의 목록을 다시 본다. 낡은 일기 파일이 남은 채 돌면
   * 이 실행이 쓰지 않은 일기를 보고 통과할 수 있다(원칙 V).
   */
  const verifyBaseline = (expectedDiaries: readonly string[]): string | null => {
    const diary = phone.remoteList(udid, "diary");
    if (!diary.ok) return `[${udid}] 일기 폴더를 다시 읽지 못했다: ${diary.detail}`;
    const extras = diary.value
      .map((f) => f.name)
      .filter((name) => DIARY_FILE.test(name) && !expectedDiaries.includes(name));
    if (extras.length > 0)
      return `[${udid}] 지우지 못한 일기가 남아 있다: ${extras.join(", ")} — 지우기(lldb)가 안 됐다`;
    const preferences = phone.remoteList(udid, "preferences");
    if (!preferences.ok) return `[${udid}] 설정 폴더를 다시 읽지 못했다: ${preferences.detail}`;
    const stale = BASELINE.filter(
      (e) => e.action === "delete" && preferences.value.some((f) => f.name === e.file),
    ).map((e) => e.file);
    if (stale.length > 0)
      return `[${udid}] 지우지 못한 설정 파일이 남아 있다: ${stale.join(", ")} — 지우기(lldb)가 안 됐다`;
    return null;
  };

  const perFlow = noRuns(flows);
  const failedNames: string[] = [];
  /** 기준 상태를 한 번이라도 건드렸나 — 중단해도 설정을 바꾼 채 끝나지 않게 되돌린다 */
  let touched = false;

  try {
    for (const [index, flow] of flows.entries()) {
      const day = String(fixtureDay(now, flow.writtenDay));
      const operationMs = deps.operationTimeoutMs ?? flow.operationTimeoutMs;
      const generationMs = deps.generationTimeoutMs ?? flow.generationTimeoutMs;
      log(`▶ [${index + 1}/${flows.length}] ${flow.id} — ${flow.story}`);

      // L2-3 (1) — 기준 상태(자동 쓰기 꺼짐)
      touched = true;
      const prepared = await prepare(flow);
      if (prepared !== null) return aborted(prepared, perFlow);

      // L2-3 (2)(3) — 사진 시딩은 이 설정(자동 쓰기 꺼짐)에서 하고, 시딩이 띄운 앱을 끈다(087: 시딩이 앱을 새로 띄운다)
      if (flow.seedsPhotos && !seed.seededDays(udid).includes(day)) {
        if (seed.xcodeRunning()) {
          return aborted(
            "Xcode가 켜져 있어 사진 시딩이 멈춘다(087) — Xcode를 끄고 다시 부른다",
            perFlow,
          );
        }
        const seeded = seed.seedDay(day, SEED_PHOTO_COUNT);
        if (!seeded.ok) return aborted(`사진 시딩 실패: ${seeded.detail}`, perFlow);
        seed.markSeeded(udid, day);
        const stopped = must(`[${udid}] 시딩 뒤 앱 종료`, phone.forceStop(udid));
        if (stopped !== null) return aborted(stopped, perFlow);
      }

      // L2-3 (4) — 흐름별 덮어쓰기(자동 쓰기 켜짐 등)는 시딩 뒤에 적용한다
      const writes = flow.preferenceOverrides(now);
      if (writes.length > 0 || flow.deleteFiles.length > 0) {
        for (const write of writes) {
          const failed = must(
            `[${udid}] ${write.file} 덮어쓰기`,
            phone.writeFile(udid, `preferences/${write.file}`, write.content),
          );
          if (failed !== null) return aborted(failed, perFlow);
        }
        for (const file of flow.deleteFiles) {
          const failed = must(
            `[${udid}] ${file} 삭제`,
            phone.removeFile(udid, `preferences/${file}`),
          );
          if (failed !== null) return aborted(failed, perFlow);
        }
        const flushed = must(`[${udid}] 덮어쓴 설정 정리`, await phone.flush(udid));
        if (flushed !== null) return aborted(flushed, perFlow);
      }

      // 쓸 날의 일기가 아직 없다 — 있으면 이 실행이 쓰지 않은 파일을 보고 통과한다(지우기 실패)
      const before = phone.remoteList(udid, "diary");
      if (!before.ok)
        return aborted(`[${udid}] 일기 폴더를 읽지 못했다: ${before.detail}`, perFlow);
      if (before.value.some((f) => f.name === `${day}.json`)) {
        return aborted(
          `[${udid}] 이 흐름이 쓸 날의 일기(${day}.json)가 이미 있다 — 지우기가 안 됐다`,
          perFlow,
        );
      }

      // L2-4 — 앱을 띄운다
      const launched = must(`[${udid}] 앱 실행`, phone.launch(udid));
      if (launched !== null) return aborted(launched, perFlow);

      // L2-5 — 사람 조작 안내와 Enter 대기
      if (flow.humanSteps.length > 0) {
        prompt.announce(
          flow.humanSteps
            .map((step, i) => `${i + 1}. ${step}`)
            .concat(["조작을 마치면 이 터미널에서 Enter를 누른다."]),
        );
        const entered = await prompt.waitForEnter(operationMs);
        if (entered === "no-tty")
          return aborted(
            "사람 조작이 필요한 흐름인데 표준 입력이 터미널이 아니다 — 터미널에서 직접 실행한다",
            perFlow,
          );
        if (entered === "timeout") {
          perFlow[index] = {
            id: flow.id,
            outcome: "failed-operation-timeout",
            detail: `Enter 없이 ${Math.round(operationMs / 1000)}초가 지났다`,
          };
          failedNames.push(`${flow.id}(조작 대기 초과)`);
          continue;
        }
      } else {
        log("  사람 조작 없음 — 앱이 알아서 쓴다");
      }

      // L2-6 — 일기 파일이 생기기를 기다린다
      const deadline = clock.nowMs() + generationMs;
      let appeared = false;
      let pollErrors = 0;
      let lastPollError = "";
      for (;;) {
        const listed = phone.remoteList(udid, "diary");
        if (!listed.ok) {
          pollErrors += 1;
          lastPollError = listed.detail;
          if (pollErrors >= MAX_POLL_ERRORS) {
            return aborted(
              `[${udid}] 일기 폴더를 ${pollErrors}번 연속 읽지 못했다 — 기기에 닿지 못한다(잠금·케이블): ${lastPollError}`,
              perFlow,
            );
          }
        } else {
          pollErrors = 0;
          if (listed.value.some((f) => f.name === `${day}.json`)) {
            appeared = true;
            break;
          }
        }
        if (clock.nowMs() >= deadline) break;
        await clock.sleep(pollMs);
      }

      // L2-7 — 실패 기록(기준 상태에서 지웠으므로 항목이 있으면 이 흐름이 낳은 것이다)
      const failure = failureReasons(phone, udid, collectDirectory, flow.id);
      const reasons = failure.reasons;

      if (!appeared) {
        const extra = [
          reasons.length > 0 ? `실패 기록: ${reasons.join(", ")}` : "",
          failure.unreadable !== undefined ? `실패 기록을 읽지 못했다(${failure.unreadable})` : "",
          lastPollError !== "" ? `마지막 목록 읽기 오류: ${lastPollError}` : "",
        ].filter((t) => t !== "");
        perFlow[index] = {
          id: flow.id,
          outcome: "failed-generation-timeout",
          detail: `일기 파일(${day}.json)이 ${Math.round(generationMs / 1000)}초 안에 생기지 않았다${extra.length > 0 ? ` — ${extra.join("; ")}` : ""}`,
        };
        failedNames.push(`${flow.id}(생성 대기 초과)`);
        continue;
      }

      // L2-8 — 가져오기(출력). 가져오지 못하면 형식 확인도 못 한다
      const local = join(collectDirectory, `${flow.id}-${day}.json`);
      const pulled = phone.pullFile(udid, `diary/${day}.json`, local);
      if (!pulled.ok) {
        perFlow[index] = {
          id: flow.id,
          outcome: "failed-invalid-diary",
          detail: `일기를 가져오지 못했다: ${pulled.detail}`,
        };
        failedNames.push(`${flow.id}(일기 읽기 실패)`);
        continue;
      }
      const problem = diaryProblem(readText(local), day);
      if (problem !== null) {
        perFlow[index] = {
          id: flow.id,
          outcome: "failed-invalid-diary",
          collected: local,
          detail: problem,
        };
        failedNames.push(`${flow.id}(일기 형식: ${problem})`);
        continue;
      }
      if (failure.unreadable !== undefined) {
        perFlow[index] = {
          id: flow.id,
          outcome: "failed-write-failure",
          collected: local,
          detail: `실패 기록을 읽지 못했다: ${failure.unreadable}`,
        };
        failedNames.push(`${flow.id}(실패 기록을 읽지 못함)`);
        continue;
      }
      if (reasons.length > 0) {
        perFlow[index] = {
          id: flow.id,
          outcome: "failed-write-failure",
          collected: local,
          detail: reasons.join(", "),
        };
        failedNames.push(`${flow.id}(실패 기록: ${reasons.join(", ")})`);
        continue;
      }
      perFlow[index] = { id: flow.id, outcome: "passed", collected: local };
      log(`  일기 ${day}를 가져왔다: ${local}`);
    }
  } finally {
    // 끝에 — 중단했어도 설정을 바꾼 채 끝나지 않게 기준 상태로 되돌린다(최선을 다한다, 실패해도 결과는 그대로다)
    if (touched) {
      const restored = await prepare(null);
      if (restored !== null) log(`  기준 상태 복원 실패: ${restored}`);
    }
  }

  log("층 2(iOS) 결과:");
  for (const f of perFlow)
    log(
      `  ${f.outcome === "passed" ? "PASS" : f.outcome === "not-run" ? "----" : "FAIL"}  ${f.id}${f.detail ? ` — ${f.detail}` : ""}`,
    );

  if (failedNames.length > 0)
    return { status: "failed", reason: `실패한 흐름: ${failedNames.join(", ")}`, perFlow };
  return { status: "passed", perFlow };
}

function readText(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

/**
 * 실패 기록(`preferences/write-failures.json`)의 갈래 이름들. 파일이 없으면 빈 목록이다. **파일이 있는데 읽지 못하면 `unreadable`에 이유를 담는다** —
 * 못 읽은 것을 「실패 없음」으로 세면 이 실행이 낳은 실패를 놓치고 통과한다(원칙 V).
 */
function failureReasons(
  phone: IosPhone,
  udid: string,
  collectDirectory: string,
  flowId: string,
): { reasons: string[]; unreadable?: string } {
  const listed = phone.remoteList(udid, "preferences");
  if (!listed.ok) return { reasons: [], unreadable: `설정 폴더를 읽지 못했다: ${listed.detail}` };
  if (!listed.value.some((f) => f.name === "write-failures.json")) return { reasons: [] };
  const local = join(collectDirectory, `${flowId}-write-failures.json`);
  const pulled = phone.pullFile(udid, "preferences/write-failures.json", local);
  if (!pulled.ok) return { reasons: [], unreadable: pulled.detail };
  try {
    const items = (JSON.parse(readText(local)) as { items?: { reason?: unknown }[] }).items ?? [];
    return { reasons: items.map((i) => (typeof i.reason === "string" ? i.reason : "알 수 없음")) };
  } catch {
    return { reasons: [], unreadable: "JSON이 아니다" };
  }
}

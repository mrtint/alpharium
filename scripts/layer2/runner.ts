/**
 * 073 — 층 2 실행: 흐름마다 기준 상태를 다시 만들고 흐름 하나씩 실제 모델로 돌린다.
 *
 * 계약: specs/073-e2e-layer2-stale-flows/contracts/layer2-runner.md (L2-0~L2-8)
 *
 * 층 1(069)과의 차이: (1) 흐름마다 `maestro test`를 따로 부르고 호출 사이마다 기준 상태를 다시 만든다 — 앞 흐름이 쓴 일기가 뒤 흐름의
 * 출발 상태를 바꾸지 않게. (2) 끝나면 흐름이 쓴 날의 일기를 개발 기계로 가져온다 — 사람이 읽는 출력이다.
 * 일기를 채점·비교하지 않는다(헌법 원칙 IV). 앱 데이터를 통째로 지우지 않고 앱을 다시 깔지도 않으며 모델은 읽기만 한다(I-1).
 *
 * 순수한 조립이다 — 기기는 `Layer2Device`로 주입받으므로 기기 없이 테스트된다.
 */

import { join } from "node:path";

import type { Layer2Device, Outcome } from "../layer1/device.ts";
import { buildFixtureDiaries, fixtureDay, fixturePhotoNames, FIXTURES_DIRECTORY } from "../layer1/fixtures.ts";
import { prepareBaseline, type Fixtures } from "../layer1/runner.ts";
import { LAYER2_FLOWS, type Layer2Flow } from "./flows.ts";

export type Layer2FlowStatus = "passed" | "failed" | "not-run";
export type Layer2Result = {
  status: "passed" | "failed" | "skipped" | "aborted";
  reason?: string;
  perFlow: { file: string; status: Layer2FlowStatus; collected?: string }[];
};

export type Layer2Options = {
  device: Layer2Device;
  flows?: readonly Layer2Flow[];
  now?: Date;
  /** 흐름이 쓴 일기를 모아 둘 개발 기계의 폴더 */
  collectDirectory?: string;
  log?: (line: string) => void;
  /** 흐름에 더해 넘길 `-e` 값(표본 대표 날 등) */
  env?: Readonly<Record<string, string>>;
};

export const DEDICATED_DEVICE_NOTICE =
  "층 2는 전용 테스트 기기에서만 돌린다 — 이 기기의 일기를 지우고, 실제 모델로 일기를 쓴다.";

function noRuns(flows: readonly Layer2Flow[]): Layer2Result["perFlow"] {
  return flows.map((f) => ({ file: f.file, status: "not-run" as const }));
}

function defaultFixtures(now: Date): Fixtures {
  return {
    diaries: buildFixtureDiaries(now),
    photos: fixturePhotoNames(now).map((name) => ({
      name,
      localPath: join(process.cwd(), FIXTURES_DIRECTORY, "photos", name),
    })),
  };
}

function stamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

const must = (step: string, outcome: Outcome<unknown>): string | null =>
  outcome.ok ? null : `${step}: ${outcome.detail}`;

export function runLayer2(options: Layer2Options): Layer2Result {
  const { device } = options;
  const flows = options.flows ?? LAYER2_FLOWS;
  const log = options.log ?? (() => {});
  const now = options.now ?? new Date();
  const collectDirectory = options.collectDirectory ?? join(".cache", "layer2", stamp(now));

  log(`  ${DEDICATED_DEVICE_NOTICE}`);

  // L2-1 — 기기·Maestro. 없으면 건너뜀(통과가 아니다)
  const serials = device.listDevices();
  if (serials === null) return { status: "skipped", reason: "adb를 찾지 못했다", perFlow: noRuns(flows) };
  if (serials.length === 0) {
    return { status: "skipped", reason: "연결된 안드로이드 기기가 없다", perFlow: noRuns(flows) };
  }
  if (!device.hasMaestro()) return { status: "skipped", reason: "Maestro가 설치되지 않았다", perFlow: noRuns(flows) };
  if (serials.length > 1) {
    return {
      status: "aborted",
      reason: `층 2는 기기가 하나일 때만 돈다 (${serials.join(", ")}) — 하나만 남기고 다시 부른다`,
      perFlow: noRuns(flows),
    };
  }
  const serial = serials[0];

  const today = fixtureDay(now, "today");
  const yesterday = fixtureDay(now, "yesterday");
  const env: Record<string, string> = { ...options.env, TODAY: today, YESTERDAY: yesterday };
  const dayOf = { today, yesterday } as const;
  const allFixtures = defaultFixtures(now);

  /** 기준 상태 + 이 흐름의 덮어쓰기. 문제가 있으면 이유를 돌려준다 */
  const prepare = (flow: Layer2Flow | null): string | null => {
    const absentNames =
      flow === null ? new Set<string>() : new Set(flow.absentDays.map((k) => `${fixtureDay(now, k)}.json`));
    const fixtures: Fixtures = {
      photos: allFixtures.photos,
      diaries: allFixtures.diaries.filter((d) => !absentNames.has(d.name)),
    };
    const aborted = prepareBaseline(device, serial, fixtures, log);
    if (aborted !== null) return aborted.reason ?? "기준 상태를 만들지 못했다";
    if (flow === null) return null;
    for (const write of flow.preferenceOverrides(now)) {
      const failed = must(
        `[${serial}] ${write.file} 덮어쓰기`,
        device.writeFile(serial, `preferences/${write.file}`, write.content),
      );
      if (failed !== null) return failed;
    }
    for (const file of flow.deleteFiles) {
      const failed = must(`[${serial}] ${file} 삭제`, device.removeFile(serial, `preferences/${file}`));
      if (failed !== null) return failed;
    }
    return null;
  };

  const perFlow: Layer2Result["perFlow"] = noRuns(flows);
  const failedNames: string[] = [];

  for (const [index, flow] of flows.entries()) {
    log(`▶ [${index + 1}/${flows.length}] ${flow.file} — ${flow.story}`);
    const problem = prepare(flow);
    if (problem !== null) {
      // 모델 없음·run-as 불가 같은 전제 문제는 이어 돌릴 수 없다 — 이미 돈 흐름의 결과는 남긴다
      return { status: "aborted", reason: problem, perFlow };
    }

    // L2-6 — 보고서에 실패한 흐름이 없는데 실패 코드면 기기 서버가 죽은 것이다. 한 번만 다시 돈다.
    let run = device.runMaestro([flow.file], env);
    if (run.status !== 0 && run.failed === null) {
      log("  Maestro가 보고서 없이 실패했다 — 기기 서버 문제일 수 있어 한 번 다시 돈다");
      const retried = prepare(flow);
      if (retried !== null) return { status: "aborted", reason: retried, perFlow };
      run = device.runMaestro([flow.file], env);
    }

    if (run.status === 0) {
      perFlow[index] = { file: flow.file, status: "passed" };
      // L2-8 — 가져오기는 출력일 뿐이다. 실패해도 판정을 바꾸지 않는다.
      const day = dayOf[flow.writtenDay];
      const name = flow.file.replace(/^.*\//, "").replace(/\.yml$/, "");
      const local = join(collectDirectory, `${name}-${day}.json`);
      const pulled = device.pullFile(serial, `diary/${day}.json`, local);
      if (pulled.ok) {
        perFlow[index].collected = local;
        log(`  일기 ${day}를 가져왔다: ${local}`);
      } else {
        log(`  일기를 가져오지 못했다(판정에는 영향 없음): ${pulled.detail}`);
      }
    } else {
      perFlow[index] = { file: flow.file, status: "failed" };
      failedNames.push(run.failed?.join(", ") ?? flow.file);
    }
  }

  // L2-7 — 설정을 바꾼 채 끝나지 않게 기준 상태로 되돌린다
  const restored = prepare(null);
  if (restored !== null) log(`  기준 상태 복원 실패: ${restored}`);

  log("층 2 결과:");
  for (const f of perFlow) log(`  ${f.status === "passed" ? "PASS" : f.status === "failed" ? "FAIL" : "----"}  ${f.file}`);

  if (failedNames.length > 0) return { status: "failed", reason: `실패한 흐름: ${failedNames.join(", ")}`, perFlow };
  return { status: "passed", perFlow };
}

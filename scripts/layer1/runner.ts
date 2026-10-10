/**
 * 069 — 층 1 실행: 기준 상태를 만들고 층 1 흐름을 한 번에 돌린다.
 *
 * 계약: specs/069-e2e-layer1-screen-flows/contracts/layer1-runner.md (L0~L7, I-1~I-7)
 *
 * **앱 데이터를 통째로 지우지 않고 앱을 다시 깔지도 않는다**(I-1). 모델(`files/models/`)은 읽기만 한다(존재 점검).
 * 건너뜀·중단은 「통과」로 보고하지 않는다(I-3, 원칙 V) — `skipped`/`aborted`는 따로 있다.
 *
 * 순수한 조립이다 — 기기는 `Layer1Device`로 주입받으므로 기기 없이 테스트된다.
 */

import { join } from "node:path";

import { ESSENTIAL_ASSET_KEYS } from "../../src/onboarding/essential-assets.ts";
import { BASELINE } from "./baseline.ts";
import type { Layer1Device, Outcome } from "./device.ts";
import {
  FIXTURES_DIRECTORY,
  buildFixtureDiaries,
  fixturePhotoNames,
  type FixtureFile,
} from "./fixtures.ts";

export type Layer1Status = "passed" | "failed" | "skipped" | "aborted";
export type Layer1Result = { status: Layer1Status; reason?: string };

export type Fixtures = { diaries: FixtureFile[]; photos: { name: string; localPath: string }[] };

export type Layer1Options = {
  device: Layer1Device;
  /** 돌릴 흐름 파일들 */
  flows: readonly string[];
  now?: Date;
  log?: (line: string) => void;
  /** 테스트가 틀·사진을 갈아 끼운다. 기본은 저장소의 픽스처 */
  fixtures?: Fixtures;
  /** 070 — 흐름에 넘길 `-e` 값(표본 대표 날). 없으면 넘기지 않는다 */
  env?: Readonly<Record<string, string>>;
};

/** L0에서 출력하는 안내 한 줄 (FR-013) — 확인 질문은 없다 */
export const DEDICATED_DEVICE_NOTICE =
  "층 1은 전용 테스트 기기에서만 돌린다 — 이 기기의 일기를 지운다.";

/** 지우기 대상: 일기 파일과 그 임시 파일 (058 `removeAll`과 같은 패턴) */
const DIARY_FILE = /^\d{4}-\d{2}-\d{2}\.json(\.writing)?$/;
/** 사진 사본 이름으로 안전한 것만 지운다 */
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/** 필수 모델 파일 이름들 (`files/models/<key>.bin`) */
const REQUIRED_MODEL_FILES = ESSENTIAL_ASSET_KEYS.map((key) => `${key}.bin`);

function stop(status: "aborted", reason: string): Layer1Result {
  return { status, reason };
}

function must(step: string, outcome: Outcome<unknown>): string | null {
  return outcome.ok ? null : `${step}: ${outcome.detail}`;
}

/**
 * 기준 상태를 만든다 (L2~L6) — 층 1과 층 2(073)가 함께 쓴다. 문제가 있으면 aborted 결과를, 없으면 null을 돌려준다.
 * 앱 데이터를 통째로 지우지 않고 모델은 읽기만 한다(I-1).
 */
export function prepareBaseline(
  device: Layer1Device,
  serial: string,
  fixtures: Fixtures,
  log: (line: string) => void,
): Layer1Result | null {
  // L2 — debug 앱 데이터에 닿는가
  const probe = device.probe(serial);
  if (!probe.ok) {
    return stop(
      "aborted",
      `[${serial}] 앱 데이터에 닿지 못했다(release 빌드이거나 재부팅 뒤 첫 잠금 해제 전일 수 있다): ${probe.detail}`,
    );
  }

  // L3 — 모델이 있는가 (읽기만)
  const models = device.listDir(serial, "models");
  if (!models.ok) return stop("aborted", `[${serial}] 모델 폴더를 읽지 못했다: ${models.detail}`);
  const missing = REQUIRED_MODEL_FILES.filter((name) => !models.value.includes(name));
  if (missing.length > 0) {
    return stop("aborted", `[${serial}] 모델이 없다: ${missing.join(", ")} — 층 1·2는 모델을 받지 않는다`);
  }

  // L4 — 앱을 끈다(파일을 바꾸는 동안 앱이 쓰지 않게; I-7)
  const stopped = must(`[${serial}] 앱 종료`, device.forceStop(serial));
  if (stopped !== null) return stop("aborted", stopped);

  const dirs = must(`[${serial}] 폴더 준비`, device.ensureDirs(serial));
  if (dirs !== null) return stop("aborted", dirs);

  // L5 — 설정 기준값
  for (const entry of BASELINE) {
    const path = `preferences/${entry.file}`;
    if (entry.action === "write") {
      const failed = must(`[${serial}] ${entry.file} 쓰기`, device.writeFile(serial, path, entry.content ?? ""));
      if (failed !== null) return stop("aborted", failed);
    } else if (entry.action === "delete") {
      const failed = must(`[${serial}] ${entry.file} 삭제`, device.removeFile(serial, path));
      if (failed !== null) return stop("aborted", failed);
    }
  }

  // L6 — 일기 폴더(일기 파일만)와 사진 사본을 픽스처로
  const diaryNames = device.listDir(serial, "diary");
  if (!diaryNames.ok) return stop("aborted", `[${serial}] 일기 폴더를 읽지 못했다: ${diaryNames.detail}`);
  for (const name of diaryNames.value.filter((n) => DIARY_FILE.test(n))) {
    const failed = must(`[${serial}] 일기 ${name} 삭제`, device.removeFile(serial, `diary/${name}`));
    if (failed !== null) return stop("aborted", failed);
  }
  const cacheNames = device.listDir(serial, "vision-cache");
  if (!cacheNames.ok) return stop("aborted", `[${serial}] 사진 사본 폴더를 읽지 못했다: ${cacheNames.detail}`);
  for (const name of cacheNames.value.filter((n) => SAFE_NAME.test(n))) {
    const failed = must(`[${serial}] 사진 사본 ${name} 삭제`, device.removeFile(serial, `vision-cache/${name}`));
    if (failed !== null) return stop("aborted", failed);
  }
  for (const photo of fixtures.photos) {
    const failed = must(
      `[${serial}] 사진 사본 ${photo.name} 심기`,
      device.copyFile(serial, `vision-cache/${photo.name}`, photo.localPath),
    );
    if (failed !== null) return stop("aborted", failed);
  }
  for (const diary of fixtures.diaries) {
    const failed = must(`[${serial}] 일기 ${diary.name} 심기`, device.writeFile(serial, `diary/${diary.name}`, diary.content));
    if (failed !== null) return stop("aborted", failed);
  }
  log(`  [${serial}] 기준 상태: 설정 ${BASELINE.length}개 정리, 일기 ${fixtures.diaries.length}편·사진 사본 ${fixtures.photos.length}개`);
  return null;
}

export function runLayer1(options: Layer1Options): Layer1Result {
  const { device, flows } = options;
  const log = options.log ?? (() => {});
  const now = options.now ?? new Date();

  log(`  ${DEDICATED_DEVICE_NOTICE}`);

  // L1 — 기기·Maestro. 없으면 건너뜀(통과가 아니다)
  const serials = device.listDevices();
  if (serials === null) return { status: "skipped", reason: "adb를 찾지 못했다" };
  if (serials.length === 0) return { status: "skipped", reason: "연결된 안드로이드 기기가 없다" };
  if (!device.hasMaestro()) return { status: "skipped", reason: "Maestro가 설치되지 않았다" };

  const fixtures = options.fixtures ?? {
    diaries: buildFixtureDiaries(now),
    photos: fixturePhotoNames(now).map((name) => ({
      name,
      localPath: join(process.cwd(), FIXTURES_DIRECTORY, "photos", name),
    })),
  };

  for (const serial of serials) {
    const aborted = prepareBaseline(device, serial, fixtures, log);
    if (aborted !== null) return aborted;
  }

  // L7 — 흐름을 한 번의 maestro 실행으로
  log(`▶ 층 1 흐름 ${flows.length}개를 한 번에 실행`);
  const run = device.runMaestro(flows, options.env);
  if (run.status === 0) return { status: "passed" };
  const failedNames = run.failed?.join(", ") ?? `알 수 없음 (종료 코드 ${run.status})`;
  return { status: "failed", reason: `실패한 흐름: ${failedNames}` };
}

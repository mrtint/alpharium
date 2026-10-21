/**
 * 095 — 앱 컨테이너의 파일을 앱 프로세스 안에서 지운다 (lldb + `NSFileManager`).
 *
 * 계약: specs/095-ios-e2e-suite/contracts/ios-layer2-runner.md (L2-3), research R2
 *
 * `devicectl`에는 파일 삭제 명령이 없고, `device copy to --remove-existing-content true`는 **대상 디렉터리의 부모를 통째로 비운다**(실측 — 한 번
 * 쓰다 기기의 `Documents/`가 비워졌다, 모델 포함). 그래서 지우기는 092 관찰법과 같은 길을 쓴다: 앱을 띄우고 lldb로 붙어 `removeItemAtPath:`를 부른다.
 *
 * **지울 수 있는 것은 `preferences/`·`diary/`·`vision-cache/` 아래 파일뿐이다.** `models/`와 그 밖의 경로는 거절한다(I-1) — 이 모듈이 기기에서 지우는
 * 유일한 자리다. 전제는 ios-seed(087)와 같다: 개발 서명 빌드(`get-task-allow`)·Xcode 꺼 둠·기기 잠금 해제.
 *
 * `exec`·`sleep`은 주입받아 기기 없이 테스트된다.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PACKAGE, type Outcome } from "../layer1/device.ts";
import type { Ctl } from "./device.ts";

/** 지울 수 있는 디렉터리 — `models/`는 여기 없다 */
export const DELETABLE_DIRECTORIES = ["preferences", "diary", "vision-cache"] as const;

const APP_START_WAIT_MS = 20_000;
const ATTACH_WAIT_SEC = 280;

export type RunLldb = (script: string) => { stdout: string; error?: string };

export function isDeletable(relative: string): boolean {
  if (!/^[A-Za-z0-9._/-]+$/.test(relative) || relative.startsWith("/") || relative.includes("..")) return false;
  const [directory, ...rest] = relative.split("/");
  return (DELETABLE_DIRECTORIES as readonly string[]).includes(directory) && rest.length > 0;
}

/** lldb 스크립트 — 앱이 멈춘 채 붙어 파일마다 `removeItemAtPath:`를 부르고 앱을 놓는다. 호출 결과 `(BOOL) $n = YES/NO`가 한 줄씩 나온다 */
export function buildDeleteScript(input: { device: string; pid: number; paths: readonly string[]; attachWaitSec: number }): string {
  const lines = [
    "settings set interpreter.stop-command-source-on-error false",
    `device select ${input.device}`,
    `device process attach --pid ${input.pid}`,
    `script import time,lldb; p=lldb.debugger.GetSelectedTarget().GetProcess(); [time.sleep(1) for _ in range(${input.attachWaitSec}) if p.GetState()!=lldb.eStateStopped]`,
  ];
  for (const path of input.paths) {
    lines.push(
      `expr -l objc -- (BOOL)[[NSFileManager defaultManager] removeItemAtPath:[[(NSArray *)NSSearchPathForDirectoriesInDomains(9, 1, YES) firstObject] stringByAppendingPathComponent:@"${path}"] error:nil]`,
    );
  }
  lines.push("process detach", "");
  return lines.join("\n");
}

const realLldb: RunLldb = (script) => {
  const file = join(mkdtempSync(join(tmpdir(), "pocketlog-delete-")), "delete.lldb");
  writeFileSync(file, script);
  const run = spawnSync("xcrun", ["lldb", "-b", "-s", file], {
    encoding: "utf8",
    timeout: (ATTACH_WAIT_SEC + 60) * 1000,
    env: { ...process.env, DEVELOPER_DIR: process.env.DEVELOPER_DIR ?? "/Applications/Xcode.app/Contents/Developer" },
  });
  return { stdout: run.stdout ?? "", error: run.error?.message };
};

type Deps = { ctl: Ctl; runLldb?: RunLldb; sleep?: (ms: number) => Promise<void>; xcodeRunning?: () => boolean };

/** 기기 앱 컨테이너 `Documents/` 아래의 파일들을 지운다. 지울 것이 없으면 아무것도 하지 않는다 */
export async function deleteInApp(deps: Deps, udid: string, relatives: readonly string[]): Promise<Outcome<void>> {
  const paths = [...new Set(relatives)];
  if (paths.length === 0) return { ok: true, value: undefined };
  const refused = paths.find((p) => !isDeletable(p));
  if (refused !== undefined) {
    return { ok: false, detail: `지울 수 없는 경로: ${refused} — preferences/·diary/·vision-cache/ 아래 파일만 지운다 (models/는 건드리지 않는다)` };
  }
  const { ctl } = deps;
  const runLldb = deps.runLldb ?? realLldb;
  const sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  if ((deps.xcodeRunning ?? (() => spawnSync("pgrep", ["-x", "Xcode"]).status === 0))()) {
    return { ok: false, detail: "Xcode가 켜져 있어 lldb attach가 멈춘다(087) — Xcode를 끄고 다시 부른다" };
  }

  const launched = ctl(["device", "process", "launch", "--device", udid, "--terminate-existing", PACKAGE]);
  if (!launched.ok) return { ok: false, detail: `앱을 띄우지 못했다: ${launched.detail}` };
  await sleep(APP_START_WAIT_MS);

  const listed = ctl(["device", "info", "processes", "--device", udid]);
  if (!listed.ok) return { ok: false, detail: `프로세스 목록을 읽지 못했다: ${listed.detail}` };
  const processes =
    (listed.json as { result?: { runningProcesses?: { executable?: string; processIdentifier?: number }[] } }).result?.runningProcesses ?? [];
  const pid = processes.find((p) => p.executable?.includes("/Pocketlog.app/") === true)?.processIdentifier;
  if (pid === undefined) return { ok: false, detail: "앱 프로세스를 찾지 못했다 — 기기 잠금을 풀고 다시 돌린다" };

  const result = runLldb(buildDeleteScript({ device: udid, pid, paths, attachWaitSec: ATTACH_WAIT_SEC }));
  // 앱은 지운 뒤 끈다 — 이어서 기준 상태를 만든다
  ctl(["device", "process", "terminate", "--device", udid, "--pid", String(pid)]);
  const answers = [...result.stdout.matchAll(/\(BOOL\) \$\d+ = (YES|NO|true|false)/g)];
  if (answers.length !== paths.length) {
    return { ok: false, detail: `lldb가 ${paths.length}개 삭제 중 ${answers.length}개의 결과만 돌려줬다 (출력 끝: ${result.stdout.slice(-300)})${result.error ? ` ${result.error}` : ""}` };
  }
  // NO는 「이미 없음」일 수도 있어 실패로 보지 않는다 — 존재 확인은 호출한 쪽이 목록으로 한다
  return { ok: true, value: undefined };
}

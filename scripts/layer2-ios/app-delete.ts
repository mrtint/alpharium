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

/** 멈춘 채 뜬 프로세스가 목록에 보이기를 기다리는 시간 */
const APP_START_WAIT_MS = 3_000;
const ATTACH_WAIT_SEC = 280;

export type RunLldb = (script: string) => { stdout: string; error?: string };

export function isDeletable(relative: string): boolean {
  if (!/^[A-Za-z0-9._/-]+$/.test(relative) || relative.startsWith("/") || relative.includes(".."))
    return false;
  const [directory, ...rest] = relative.split("/");
  return (DELETABLE_DIRECTORIES as readonly string[]).includes(directory) && rest.length > 0;
}

/**
 * lldb 스크립트 — 앱이 멈춘 채 붙어 컨테이너 루트(`HOME`)로 옮기고, 파일마다 `unlink`를 부른 뒤 앱을 끝낸다. 호출마다 `(int) $n = 값`이 한 줄씩 나온다
 * (첫 줄은 `chdir`, 0이어야 한다).
 *
 * **Objective-C 식 대신 C 함수를 `dlsym`으로 부른다** — lldb 식에서는 Foundation 클래스·함수가 선언돼 있지 않아 `-stringByAppendingPathComponent:`가
 * 「no known method」로, `NSHomeDirectory()`가 「undeclared identifier」로 거절된다(095 실기기 실측). `dlsym` 함수 포인터 캐스트는 087의 시딩 도구가
 * 이미 쓰는 길이다. `unlink`는 파일만 지우고 디렉터리는 지우지 못한다.
 */
export function buildDeleteScript(input: {
  device: string;
  pid: number;
  paths: readonly string[];
  attachWaitSec: number;
}): string {
  const lines = [
    "settings set interpreter.stop-command-source-on-error false",
    `device select ${input.device}`,
    `device process attach --pid ${input.pid}`,
    `script import time,lldb; p=lldb.debugger.GetSelectedTarget().GetProcess(); [time.sleep(1) for _ in range(${input.attachWaitSec}) if p.GetState()!=lldb.eStateStopped]`,
    // 멈춘 채 뜬 앱은 아직 라이브러리(dyld·libdyld)가 안 올라 함수를 못 부른다(`_dlsym` 심볼 없음 — 095 실기기 실측). `UIApplicationMain`까지만 달리게 한다 —
    // 거기서는 라이브러리가 다 올라 있고 앱 코드(JS·시도 기록)는 아직 시작하지 않았다(092 관찰법).
    "breakpoint set -n UIApplicationMain",
    "process continue",
    `script import time,lldb; p=lldb.debugger.GetSelectedTarget().GetProcess(); [time.sleep(1) for _ in range(${input.attachWaitSec}) if p.GetState()!=lldb.eStateStopped]`,
    // 컨테이너 루트로 옮긴다 — 이후 경로는 `Documents/…` 상대 경로다
    'expr -l objc -- (int)((int(*)(const char*))dlsym((void*)-2, "chdir"))(((const char*(*)(const char*))dlsym((void*)-2, "getenv"))("HOME"))',
  ];
  for (const path of input.paths) {
    lines.push(
      `expr -l objc -- (int)((int(*)(const char*))dlsym((void*)-2, "unlink"))("Documents/${path}")`,
    );
  }
  // detach가 아니라 kill — 놓으면 앱이 달려 자기 파일(시도 기록 등)을 다시 만든다
  lines.push("process kill", "");
  return lines.join("\n");
}

const realLldb: RunLldb = (script) => {
  const file = join(mkdtempSync(join(tmpdir(), "pocketlog-delete-")), "delete.lldb");
  writeFileSync(file, script);
  const run = spawnSync("xcrun", ["lldb", "-b", "-s", file], {
    encoding: "utf8",
    timeout: (ATTACH_WAIT_SEC + 60) * 1000,
    env: {
      ...process.env,
      DEVELOPER_DIR: process.env.DEVELOPER_DIR ?? "/Applications/Xcode.app/Contents/Developer",
    },
  });
  return { stdout: run.stdout ?? "", error: run.error?.message };
};

type Deps = {
  ctl: Ctl;
  runLldb?: RunLldb;
  sleep?: (ms: number) => Promise<void>;
  xcodeRunning?: () => boolean;
};

/** 기기 앱 컨테이너 `Documents/` 아래의 파일들을 지운다. 지울 것이 없으면 아무것도 하지 않는다 */
export async function deleteInApp(
  deps: Deps,
  udid: string,
  relatives: readonly string[],
): Promise<Outcome<void>> {
  const paths = [...new Set(relatives)];
  if (paths.length === 0) return { ok: true, value: undefined };
  const refused = paths.find((p) => !isDeletable(p));
  if (refused !== undefined) {
    return {
      ok: false,
      detail: `지울 수 없는 경로: ${refused} — preferences/·diary/·vision-cache/ 아래 파일만 지운다 (models/는 건드리지 않는다)`,
    };
  }
  const { ctl } = deps;
  const runLldb = deps.runLldb ?? realLldb;
  const sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  if ((deps.xcodeRunning ?? (() => spawnSync("pgrep", ["-x", "Xcode"]).status === 0))()) {
    return {
      ok: false,
      detail: "Xcode가 켜져 있어 lldb attach가 멈춘다(087) — Xcode를 끄고 다시 부른다",
    };
  }

  // **멈춘 채 띄운다** — 그냥 띄우면 lldb가 붙기 전에 앱이 돌아 시도 기록(`auto-write-attempts.json`) 같은 파일을 다시 만든다(095 실기기 실측)
  const launched = ctl([
    "device",
    "process",
    "launch",
    "--device",
    udid,
    "--terminate-existing",
    "--start-stopped",
    PACKAGE,
  ]);
  if (!launched.ok) return { ok: false, detail: `앱을 띄우지 못했다: ${launched.detail}` };
  await sleep(APP_START_WAIT_MS);

  const listed = ctl(["device", "info", "processes", "--device", udid]);
  if (!listed.ok) return { ok: false, detail: `프로세스 목록을 읽지 못했다: ${listed.detail}` };
  const processes =
    (
      listed.json as {
        result?: { runningProcesses?: { executable?: string; processIdentifier?: number }[] };
      }
    ).result?.runningProcesses ?? [];
  const pid = processes.find(
    (p) => p.executable?.includes("/Pocketlog.app/") === true,
  )?.processIdentifier;
  if (pid === undefined)
    return { ok: false, detail: "앱 프로세스를 찾지 못했다 — 기기 잠금을 풀고 다시 돌린다" };

  const result = runLldb(
    buildDeleteScript({ device: udid, pid, paths, attachWaitSec: ATTACH_WAIT_SEC }),
  );
  // 앱은 지운 뒤 끈다 — 이어서 기준 상태를 만든다
  ctl(["device", "process", "terminate", "--device", udid, "--pid", String(pid)]);
  const answers = [...result.stdout.matchAll(/\(int\) \$\d+ = (-?\d+)/g)].map((m) => Number(m[1]));
  // 첫 줄은 chdir(0이어야 한다), 이어서 파일마다 unlink 한 줄
  if (answers.length !== paths.length + 1 || answers[0] !== 0) {
    return {
      ok: false,
      detail: `lldb가 chdir 1개 + 삭제 ${paths.length}개 중 ${answers.length}개의 결과만 돌려줬거나 chdir이 실패했다 (출력 끝: ${result.stdout.slice(-300)})${result.error ? ` ${result.error}` : ""}`,
    };
  }
  // unlink의 -1은 「이미 없음」일 수도 있어 실패로 보지 않는다 — 존재 확인은 호출한 쪽이 목록으로 한다
  return { ok: true, value: undefined };
}

/**
 * 097 — iPhone 실기기가 층 2에 닿는 유일한 자리 (`xcrun devicectl`).
 *
 * 계약: specs/097-ios-e2e-suite/contracts/ios-layer2-runner.md (L2-1·L2-3, I-1), data-model 「IosDeviceTarget」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`devicectl device copy to`에 `--remove-existing-content`를 쓰지 않는다.** 그 옵션은 대상 디렉터리의 **부모**를 통째로 비운다 — 실측(임시 영역과
 * 기기)에서 `Documents/preferences`를 올리려다 `Documents/` 전체(모델 포함)가 비워졌다. 소스 계약 테스트가 이 문자열 자체를 막는다.
 *
 * - 쓰기: 파일 하나씩 `copy to`로 올린다(덮어쓰기, 없는 부모 디렉터리는 만들어진다 — 실측).
 * - 지우기: `devicectl`에는 파일 삭제 명령이 없다. 지울 파일은 모아 두었다가 `flush`가 앱 프로세스 안에서 지운다(`app-delete.ts`, lldb —
 *   092 관찰법). 이미 없는 파일은 지울 목록에 넣지 않아 lldb를 불필요하게 부르지 않는다.
 * - 쓸 수 있는 곳은 `preferences/`·`diary/`·`vision-cache/` 아래뿐이다 — **`models/`에는 쓰지도 지우지도 않는다**(I-1,
 *   `ios-layer2-source-contract.test.ts`가 소스를 읽어 잠근다). 읽기(목록·`copy from`)는 어느 경로든 된다.
 *
 * `devicectl`은 오류에도 종료 코드 0을 줄 수 있어 `--json-output`의 `outcome`을 본다(`realCtl`). 앱 삭제·재설치가 없다. `devicectl`은 `ctl`로
 * 주입받아 기기 없이 테스트된다. 경로는 앱 데이터 루트(`Documents/`) 기준 상대 경로다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { BaselineDevice, DeviceLabels, Outcome } from "../layer1/device.ts";
import { PACKAGE } from "../layer1/device.ts";
import { deleteInApp, isDeletable } from "./app-delete.ts";

/** `devicectl` 호출 결과 — 성공이면 `--json-output`을 파싱한 값 */
export type CtlResult = { ok: true; json: unknown } | { ok: false; detail: string };
/** `xcrun devicectl` 뒤의 인자들을 받는다 (`--json-output`은 실제 구현이 붙인다) */
export type Ctl = (args: string[]) => CtlResult;

export const PHONE_LABELS: DeviceLabels = {
  toolMissing: "xcrun devicectl을 찾지 못했다",
  noDevice: "연결된 iPhone이 없다 (페어링과 잠금 해제를 확인한다)",
  probeHint:
    "개발 서명 빌드가 깔려 있지 않거나 기기 잠금이 안 풀렸을 수 있다 (TestFlight 빌드에는 닿지 못한다)",
};

const DOMAIN = ["--domain-type", "appDataContainer", "--domain-identifier", PACKAGE];
const done: Outcome = { ok: true, value: undefined };

export const realCtl: Ctl = (args) => {
  const directory = mkdtempSync(join(tmpdir(), "pocketlog-devicectl-"));
  const output = join(directory, "out.json");
  const run = spawnSync("xcrun", ["devicectl", ...args, "--json-output", output], {
    encoding: "utf8",
  });
  const text = existsSync(output) ? readFileSync(output, "utf8") : "";
  // 폴링이 5초마다 부르므로 임시 폴더를 남기지 않는다
  rmSync(directory, { recursive: true, force: true });
  if (run.error) return { ok: false, detail: `xcrun을 부르지 못했다: ${run.error.message}` };
  if (text === "")
    return {
      ok: false,
      detail: (run.stderr || run.stdout).trim() || `devicectl 실패 (${run.status})`,
    };
  try {
    const json = JSON.parse(text) as {
      info?: { outcome?: string };
      error?: { userInfo?: Record<string, { string?: string }>; localizedDescription?: string };
    };
    if (json.info?.outcome !== "success") {
      return {
        ok: false,
        detail:
          json.error?.localizedDescription ??
          ((run.stderr || run.stdout).trim() || "devicectl 실패"),
      };
    }
    return { ok: true, json };
  } catch {
    return { ok: false, detail: "devicectl 출력을 읽지 못했다" };
  }
};

export type RemoteFile = { name: string; size: number };

export interface IosPhone extends BaselineDevice {
  labels: DeviceLabels;
  /** 페어링된 실기기 iPhone UDID들. devicectl을 못 부르면 null */
  listDevices(): string[] | null;
  /** `Documents/<relative>`의 직접 자식과 크기 (기기의 실제 상태) */
  remoteList(udid: string, relative: string): Outcome<RemoteFile[]>;
  /** `Documents/<relative>`를 개발 기계의 `localPath`로 가져온다 (읽기만) */
  pullFile(udid: string, relative: string, localPath: string): Outcome;
  /** 모아 둔 삭제를 앱 안에서 수행한다. 지울 것이 없으면 아무것도 하지 않는다 */
  flush(udid: string): Promise<Outcome>;
  /** 떠 있던 앱을 끄고 새로 띄운다 */
  launch(udid: string): Outcome;
}

type Deps = {
  ctl?: Ctl;
  deleter?: (udid: string, relatives: readonly string[]) => Promise<Outcome>;
};

const safePath = (relative: string) =>
  /^[A-Za-z0-9._/-]+$/.test(relative) && !relative.startsWith("/") && !relative.includes("..");

const rejected = (relative: string): { ok: false; detail: string } => ({
  ok: false,
  detail: `쓸 수 없는 경로: ${relative} — preferences/·diary/·vision-cache/ 아래만 고친다 (models/는 건드리지 않는다)`,
});

type InfoFiles = {
  result?: {
    files?: {
      relativePath: string;
      metadata?: { size?: number };
      resources?: { isDirectory?: boolean };
    }[];
  };
};

export function iosPhoneDevice(deps: Deps = {}): IosPhone {
  const ctl = deps.ctl ?? realCtl;
  const deleter = deps.deleter ?? ((udid, relatives) => deleteInApp({ ctl }, udid, relatives));
  /** 지울 것으로 모아 둔 경로 (`flush`가 수행) */
  const pendingDeletes = new Set<string>();
  const deviceArgs = (udid: string) => ["--device", udid];

  /** 기기 `Documents/` 전체 목록(재귀) */
  const remoteFiles = (
    udid: string,
  ): Outcome<NonNullable<NonNullable<InfoFiles["result"]>["files"]>> => {
    const listed = ctl([
      "device",
      "info",
      "files",
      ...deviceArgs(udid),
      ...DOMAIN,
      "--subdirectory",
      "Documents",
    ]);
    if (!listed.ok) return listed;
    return { ok: true, value: (listed.json as InfoFiles).result?.files ?? [] };
  };

  const upload = (udid: string, relative: string, localPath: string): Outcome => {
    if (!isDeletable(relative)) return rejected(relative);
    const uploaded = ctl([
      "device",
      "copy",
      "to",
      ...deviceArgs(udid),
      ...DOMAIN,
      "--source",
      localPath,
      "--destination",
      `Documents/${relative}`,
    ]);
    if (!uploaded.ok)
      return { ok: false, detail: `${relative}를 올리지 못했다: ${uploaded.detail}` };
    // 같은 경로를 지우려던 것을 다시 쓰면 지우지 않는다
    pendingDeletes.delete(`${udid}/${relative}`);
    return done;
  };

  return {
    labels: PHONE_LABELS,

    listDevices() {
      const listed = ctl(["list", "devices"]);
      if (!listed.ok) return null;
      const devices =
        (
          listed.json as {
            result?: {
              devices?: {
                connectionProperties?: { pairingState?: string };
                hardwareProperties?: { deviceType?: string; reality?: string; udid?: string };
              }[];
            };
          }
        ).result?.devices ?? [];
      return devices
        .filter(
          (d) =>
            d.hardwareProperties?.reality === "physical" &&
            d.hardwareProperties?.deviceType === "iPhone" &&
            d.connectionProperties?.pairingState === "paired" &&
            typeof d.hardwareProperties?.udid === "string",
        )
        .map((d) => d.hardwareProperties!.udid!);
    },

    probe(udid) {
      const files = remoteFiles(udid);
      if (!files.ok) return files;
      return files.value.length > 0
        ? done
        : { ok: false, detail: "앱 컨테이너 Documents가 비어 있거나 없다" };
    },

    listDir(udid, relative) {
      const listed = this.remoteList(udid, relative);
      return listed.ok ? { ok: true, value: listed.value.map((f) => f.name) } : listed;
    },

    remoteList(udid, relative) {
      if (!safePath(relative)) return { ok: false, detail: `안전하지 않은 경로: ${relative}` };
      const files = remoteFiles(udid);
      if (!files.ok) return files;
      const prefix = `${relative}/`;
      const children = files.value
        .filter(
          (f) =>
            f.relativePath.startsWith(prefix) && !f.relativePath.slice(prefix.length).includes("/"),
        )
        .map((f) => ({ name: f.relativePath.slice(prefix.length), size: f.metadata?.size ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { ok: true, value: children };
    },

    forceStop(udid) {
      const listed = ctl(["device", "info", "processes", ...deviceArgs(udid)]);
      if (!listed.ok) return listed;
      const processes =
        (
          listed.json as {
            result?: { runningProcesses?: { executable?: string; processIdentifier?: number }[] };
          }
        ).result?.runningProcesses ?? [];
      const app = processes.find((p) => p.executable?.includes("/Pocketlog.app/") === true);
      if (app?.processIdentifier === undefined) return done;
      const killed = ctl([
        "device",
        "process",
        "terminate",
        ...deviceArgs(udid),
        "--pid",
        String(app.processIdentifier),
      ]);
      return killed.ok ? done : killed;
    },

    ensureDirs() {
      // 디렉터리는 파일을 올릴 때 만들어진다(실측) — 할 일이 없다
      return done;
    },

    writeFile(udid, relative, content) {
      if (!isDeletable(relative)) return rejected(relative);
      const directory = mkdtempSync(join(tmpdir(), "pocketlog-layer2-ios-"));
      try {
        const local = join(directory, "payload");
        writeFileSync(local, content, "utf8");
        return upload(udid, relative, local);
      } catch (error) {
        return { ok: false, detail: `${relative}: ${String(error)}` };
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },

    copyFile(udid, relative, localPath) {
      return upload(udid, relative, localPath);
    },

    removeFile(udid, relative) {
      if (!isDeletable(relative)) return rejected(relative);
      const files = remoteFiles(udid);
      if (!files.ok) return files;
      // 이미 없으면 지울 목록에 넣지 않는다 — lldb를 불필요하게 부르지 않는다
      if (
        files.value.some((f) => f.relativePath === relative && f.resources?.isDirectory !== true)
      ) {
        pendingDeletes.add(`${udid}/${relative}`);
      }
      return done;
    },

    pullFile(udid, relative, localPath) {
      if (!safePath(relative)) return { ok: false, detail: `안전하지 않은 경로: ${relative}` };
      mkdirSync(dirname(localPath), { recursive: true });
      const copied = ctl([
        "device",
        "copy",
        "from",
        ...deviceArgs(udid),
        ...DOMAIN,
        "--source",
        `Documents/${relative}`,
        "--destination",
        localPath,
      ]);
      return copied.ok
        ? done
        : { ok: false, detail: `${relative}를 읽지 못했다: ${copied.detail}` };
    },

    async flush(udid) {
      const mine = [...pendingDeletes]
        .filter((key) => key.startsWith(`${udid}/`))
        .map((key) => key.slice(udid.length + 1));
      if (mine.length === 0) return done;
      const deleted = await deleter(udid, mine);
      if (!deleted.ok) return deleted;
      for (const relative of mine) pendingDeletes.delete(`${udid}/${relative}`);
      return done;
    },

    launch(udid) {
      const launched = ctl([
        "device",
        "process",
        "launch",
        ...deviceArgs(udid),
        "--terminate-existing",
        PACKAGE,
      ]);
      return launched.ok ? done : launched;
    },
  };
}

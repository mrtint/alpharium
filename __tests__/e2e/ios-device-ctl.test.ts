import { readFileSync } from "node:fs";
import { join } from "node:path";

import { iosPhoneDevice, type Ctl } from "../../scripts/layer2-ios/device";

/**
 * 097 — iPhone 실기기 장치 (`devicectl` 기반). `devicectl`은 대역이고, 실측 JSON(`fixtures/devicectl-*.json`)을 돌려준다.
 *
 * 계약: specs/097-ios-e2e-suite/contracts/ios-layer2-runner.md (L2-1·L2-3, I-1), data-model 「IosDeviceTarget」
 *
 * 실측(research R2): `devicectl`에는 파일 삭제 명령이 없고 `--remove-existing-content true`는 대상 디렉터리의 **부모**를 비운다 —
 * 그래서 파일 하나씩 올리고, 지우기는 앱 안에서(lldb) 한다.
 */

const UDID = "00008110-000000000000001E";
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(join(process.cwd(), "__tests__", "e2e", "fixtures", name), "utf8"),
  ) as unknown;
const infoFiles = fixture("devicectl-info-files.json");
const listDevices = fixture("devicectl-list-devices.json");

type Call = string[];

/** 지울 수 있는 파일이 기기에 있는 모양의 목록 */
function filesWith(extra: string[]) {
  const base = (infoFiles as { result: { files: unknown[] } }).result.files;
  return {
    result: {
      files: [
        ...base,
        ...extra.map((relativePath) => ({
          name: relativePath.split("/").pop(),
          relativePath,
          metadata: { size: 10 },
          resources: { isDirectory: false },
        })),
      ],
    },
  };
}

function setup(options: { files?: unknown; processes?: unknown } = {}) {
  const calls: Call[] = [];
  const deleted: string[][] = [];
  const ctl: Ctl = (args) => {
    calls.push(args);
    const sub = args.slice(0, 3).join(" ");
    if (sub === "list devices") return { ok: true, json: listDevices };
    if (sub === "device info files") return { ok: true, json: options.files ?? infoFiles };
    if (sub === "device info processes")
      return { ok: true, json: options.processes ?? { result: { runningProcesses: [] } } };
    return { ok: true, json: {} };
  };
  const device = iosPhoneDevice({
    ctl,
    deleter: async (_udid, relatives) => {
      deleted.push([...relatives]);
      return { ok: true, value: undefined };
    },
  });
  return { device, calls, deleted };
}

const kind = (call: Call) => call.slice(0, 3).join(" ");

describe("iPhone 장치 (097)", () => {
  it("listDevices — 페어링된 실기기 iPhone만 준다 (시뮬레이터 제외)", () => {
    expect(setup().device.listDevices()).toEqual([UDID]);
  });

  it("listDevices — devicectl을 못 부르면 null (건너뜀 이유)", () => {
    expect(
      iosPhoneDevice({ ctl: () => ({ ok: false, detail: "ENOENT" }) }).listDevices(),
    ).toBeNull();
  });

  it("probe — 앱 컨테이너 Documents에 닿으면 성공, 못 닿으면 이유", () => {
    expect(setup().device.probe(UDID).ok).toBe(true);
    expect(
      iosPhoneDevice({ ctl: () => ({ ok: false, detail: "no developer disk image" }) }).probe(UDID)
        .ok,
    ).toBe(false);
  });

  it("listDir — Documents 아래 직접 자식 이름만 준다, 없는 폴더는 비어 있음", () => {
    const { device } = setup();
    expect(device.listDir(UDID, "models")).toEqual({
      ok: true,
      value: ["a1.bin", "state.json", "v1.bin", "v2.bin"],
    });
    expect(device.listDir(UDID, "diary")).toEqual({ ok: true, value: [] });
  });

  it("remoteList — 파일 크기를 준다 (0바이트 모델을 알아보려고)", () => {
    const listed = setup().device.remoteList(UDID, "models");
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.find((f) => f.name === "v1.bin")).toEqual({
      name: "v1.bin",
      size: expect.any(Number),
    });
  });

  it("writeFile — 파일 하나를 copy to로 올린다 (덮어쓰기, --remove-existing-content 없음)", () => {
    const { device, calls } = setup();
    expect(device.writeFile(UDID, "preferences/auto-diary.json", '{"enabled":true}').ok).toBe(true);
    const up = calls.filter((c) => kind(c) === "device copy to");
    expect(up).toHaveLength(1);
    expect(up[0]).toEqual(
      expect.arrayContaining([
        "--destination",
        "Documents/preferences/auto-diary.json",
        "--domain-type",
        "appDataContainer",
        "--domain-identifier",
        "com.a810labs.pocketlog",
      ]),
    );
    expect(calls.flat()).not.toContain("--remove-existing-content");
  });

  it("copyFile — 개발 기계의 파일을 올린다", () => {
    const { device, calls } = setup();
    expect(device.copyFile(UDID, "vision-cache/a.jpg", __filename).ok).toBe(true);
    const up = calls.find((c) => kind(c) === "device copy to")!;
    expect(up).toEqual(
      expect.arrayContaining([
        "--source",
        __filename,
        "--destination",
        "Documents/vision-cache/a.jpg",
      ]),
    );
  });

  it("removeFile — 기기에 있는 파일만 지울 목록에 넣고 flush가 앱 안에서 지운다", async () => {
    const { device, deleted, calls } = setup({ files: filesWith(["diary/2026-10-21.json"]) });
    expect(device.removeFile(UDID, "diary/2026-10-21.json").ok).toBe(true);
    expect(device.removeFile(UDID, "preferences/missing.json").ok).toBe(true);
    expect(deleted).toEqual([]);
    expect((await device.flush(UDID)).ok).toBe(true);
    expect(deleted).toEqual([["diary/2026-10-21.json"]]);
    expect(calls.some((c) => kind(c) === "device copy to")).toBe(false);
    // 한 번 수행한 삭제는 다시 하지 않는다
    expect((await device.flush(UDID)).ok).toBe(true);
    expect(deleted).toHaveLength(1);
  });

  it("지우려던 파일을 같은 실행에서 다시 쓰면 지우지 않는다 (픽스처가 지워지지 않게)", async () => {
    const { device, deleted } = setup({ files: filesWith(["diary/2026-10-22.json"]) });
    device.removeFile(UDID, "diary/2026-10-22.json");
    device.writeFile(UDID, "diary/2026-10-22.json", "{}");
    await device.flush(UDID);
    expect(deleted).toEqual([]);
  });

  it("flush — 지울 것이 없으면 아무것도 부르지 않는다", async () => {
    const { device, deleted, calls } = setup();
    const before = calls.length;
    expect((await device.flush(UDID)).ok).toBe(true);
    expect(deleted).toEqual([]);
    expect(calls).toHaveLength(before);
  });

  it("flush — 삭제가 실패하면 그 이유를 돌려주고 목록을 비우지 않는다", async () => {
    const device = iosPhoneDevice({
      ctl: (args) => ({ ok: true, json: args[2] === "files" ? filesWith(["diary/x.json"]) : {} }),
      deleter: async () => ({ ok: false, detail: "lldb attach 실패" }),
    });
    device.removeFile(UDID, "diary/x.json");
    const flushed = await device.flush(UDID);
    expect(flushed).toEqual({ ok: false, detail: "lldb attach 실패" });
  });

  it("I-1 — 모델 폴더와 허용 밖 경로에는 쓰지도 지우지도 않고 devicectl도 부르지 않는다", () => {
    const { device, calls } = setup();
    for (const bad of [
      "models/a1.bin",
      "models/x",
      "../x",
      "Library/x.json",
      "state.json",
      "diary",
    ]) {
      expect(device.writeFile(UDID, bad, "x").ok).toBe(false);
      expect(device.removeFile(UDID, bad).ok).toBe(false);
      expect(device.copyFile(UDID, bad, __filename).ok).toBe(false);
    }
    expect(calls).toEqual([]);
  });

  it("ensureDirs — 할 일이 없다 (디렉터리는 파일을 올릴 때 만들어진다)", () => {
    const { device, calls } = setup();
    expect(device.ensureDirs(UDID).ok).toBe(true);
    expect(calls).toEqual([]);
  });

  it("pullFile — copy from으로 기기의 파일을 개발 기계로 가져온다", () => {
    const { device, calls } = setup();
    device.pullFile(
      UDID,
      "diary/2026-10-21.json",
      join(process.cwd(), ".cache", "layer2-ios", "unit-test-out.json"),
    );
    const pull = calls.find((c) => kind(c) === "device copy from")!;
    expect(pull).toEqual(expect.arrayContaining(["--source", "Documents/diary/2026-10-21.json"]));
  });

  it("launch — 떠 있던 앱을 끄고 새로 띄운다 (--terminate-existing)", () => {
    const { device, calls } = setup();
    expect(device.launch(UDID).ok).toBe(true);
    const run = calls.find((c) => kind(c) === "device process launch")!;
    expect(run).toEqual(expect.arrayContaining(["--terminate-existing", "com.a810labs.pocketlog"]));
  });

  it("forceStop — 실행 중인 앱 프로세스를 pid로 끈다, 실행 중이 아니면 아무것도 하지 않는다", () => {
    const running = setup({
      processes: {
        result: {
          runningProcesses: [
            { executable: "file:///sbin/launchd", processIdentifier: 1 },
            {
              executable:
                "file:///private/var/containers/Bundle/Application/X/Pocketlog.app/Pocketlog",
              processIdentifier: 4135,
            },
          ],
        },
      },
    });
    expect(running.device.forceStop(UDID).ok).toBe(true);
    expect(running.calls.find((c) => kind(c) === "device process terminate")).toEqual(
      expect.arrayContaining(["--pid", "4135"]),
    );
    const idle = setup();
    expect(idle.device.forceStop(UDID).ok).toBe(true);
    expect(idle.calls.some((c) => kind(c) === "device process terminate")).toBe(false);
  });
});

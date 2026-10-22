/**
 * 096 — 번호 점검 진입점(`version-check.mts`, `build-number-check.mts`)을 자식 프로세스로 돌려 종료 코드와 출력을 본다.
 * 스토어는 `--import`로 먼저 읽히는 모듈이 `globalThis.fetch`를 갈아 끼운 대역이다. 실제 스토어 응답은 첫 실행에서만 본다.
 */

import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(__dirname, "../..");
const dir = mkdtempSync(join(tmpdir(), "release-number-"));

const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const SERVICE_ACCOUNT = JSON.stringify({
  client_email: "ci@example.iam.gserviceaccount.com",
  private_key: rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
});
const KEY_P8 = ec.privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function appJson(expo: Record<string, unknown>): string {
  const path = join(dir, `app-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(path, JSON.stringify({ expo }));
  return path;
}

/** `globalThis.fetch`를 정해진 응답으로 바꾸는 선행 모듈 */
function stub(source: string): string {
  const path = join(dir, `stub-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(path, source);
  return pathToFileURL(path).href;
}

const PLAY_STUB = (bundles: unknown) => `
globalThis.fetch = async (url, init) => {
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (String(url).includes("oauth2.googleapis.com")) return json({ access_token: "tok" });
  if (init.method === "POST" && String(url).endsWith("/edits")) return json({ id: "E1" });
  if (init.method === "DELETE") return new Response(null, { status: 204 });
  if (String(url).endsWith("/edits/E1/bundles")) return json(${JSON.stringify(bundles)});
  return json({ error: { message: "예상 밖 호출 " + init.method + " " + url } }, 500);
};`;

const ASC_STUB = (builds: unknown, status = 200) => `
globalThis.fetch = async (url, init) => {
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (init.method !== "GET") return json({ errors: [{ detail: "쓰기 호출 " + init.method }] }, 500);
  if (String(url).includes("/v1/apps?")) return json({ data: [{ id: "APP1" }] });
  if (String(url).includes("/v1/builds?")) return json(${JSON.stringify(builds)}, ${status});
  return json({ errors: [{ detail: "예상 밖 호출 " + url }] }, 500);
};`;

function run(script: string, args: string[], env: Record<string, string>, preload?: string) {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
      ...(preload ? ["--import", preload] : []),
      join(ROOT, script),
      ...args,
    ],
    {
      env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv,
      encoding: "utf8",
    },
  );
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const ANDROID = "scripts/android-release/version-check.mts";
const IOS = "scripts/ios-release/build-number-check.mts";
const COMMIT = "0123456789abcdef0123456789abcdef01234567";

describe("096 version-check.mts (안드로이드)", () => {
  const args = (app: string) => [
    "--app-json",
    app,
    "--package",
    "com.a810labs.pocketlog",
    "--commit",
    COMMIT,
  ];
  const env = { PLAY_SERVICE_ACCOUNT_JSON: SERVICE_ACCOUNT };
  const app = (versionCode: unknown) => appJson({ version: "1.0.0", android: { versionCode } });

  it("인자가 빠지면 사용법과 함께 1로 끝난다", () => {
    const r = run(ANDROID, [], env);
    expect(r.code).toBe(1);
    expect(r.err).toContain("::error::사용법");
  });

  it("PLAY_SERVICE_ACCOUNT_JSON이 비면 이름을 밝히며 실패한다 (값은 없다)", () => {
    const r = run(ANDROID, args(app(13)), {});
    expect(r.code).toBe(1);
    expect(r.err).toContain("PLAY_SERVICE_ACCOUNT_JSON");
  });

  it("versionCode가 정수가 아니면 실패한다", () => {
    const r = run(ANDROID, args(app("13")), env, stub(PLAY_STUB({ bundles: [] })));
    expect(r.code).toBe(1);
    expect(r.err).toContain("expo.android.versionCode 가 정수가 아니다");
  });

  it("스토어보다 크면 한 줄을 남기고 0으로 끝난다", () => {
    const r = run(ANDROID, args(app(13)), env, stub(PLAY_STUB({ bundles: [{ versionCode: 12 }] })));
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe("버전 1.0.0 · versionCode 13 · 커밋 0123456 · 스토어 마지막 12");
  });

  it("스토어와 같으면 ::error::로 이미 있는 번호와 올릴 값을 말하고 1로 끝난다", () => {
    const r = run(ANDROID, args(app(12)), env, stub(PLAY_STUB({ bundles: [{ versionCode: 12 }] })));
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/^::error::versionCode 12 .*이미 있다.*13 이상/);
  });

  it("스토어 사유에 줄바꿈이 있어도 ::error:: 한 줄로 나온다 (워크플로 명령 주입 방지)", () => {
    const evil = `
globalThis.fetch = async (url) => {
  if (String(url).includes("oauth2")) return new Response(JSON.stringify({ access_token: "t" }));
  return new Response(JSON.stringify({ error: { message: "x\\n::set-output name=a::b" } }), { status: 500 });
};`;
    const r = run(ANDROID, args(app(13)), env, stub(evil));
    expect(r.code).toBe(1);
    expect(r.err.trim().split("\n")).toHaveLength(1);
  });

  it("스토어가 403이면 읽지 못한 이유로 실패한다 (건너뛰지 않는다)", () => {
    const denied = `
globalThis.fetch = async (url, init) => {
  if (String(url).includes("oauth2")) return new Response(JSON.stringify({ access_token: "t" }));
  return new Response(JSON.stringify({ error: { message: "no" } }), { status: 403 });
};`;
    const r = run(ANDROID, args(app(13)), env, stub(denied));
    expect(r.code).toBe(1);
    expect(r.err).toContain("HTTP 403 edits.insert");
    expect(r.err).not.toContain(SERVICE_ACCOUNT.slice(20, 60));
  });
});

describe("096 build-number-check.mts (iOS)", () => {
  const args = (app: string) => [
    "--app-json",
    app,
    "--bundle",
    "com.a810labs.pocketlog",
    "--commit",
    COMMIT,
  ];
  const env = { ASC_API_KEY_P8: KEY_P8, ASC_KEY_ID: "KEYID12345", ASC_ISSUER_ID: "issuer" };
  const app = (buildNumber: unknown) => appJson({ version: "1.0.0", ios: { buildNumber } });
  const builds = (...versions: string[]) => ({
    data: versions.map((version, i) => ({ id: `B${i}`, attributes: { version } })),
  });

  it("인자가 빠지면 사용법과 함께 1로 끝난다", () => {
    const r = run(IOS, [], env);
    expect(r.code).toBe(1);
    expect(r.err).toContain("::error::사용법");
  });

  it("API 키 환경변수가 비면 실패한다", () => {
    const r = run(IOS, args(app("13")), { ASC_KEY_ID: "x" });
    expect(r.code).toBe(1);
    expect(r.err).toContain("ASC_API_KEY_P8");
  });

  it("buildNumber가 정수 문자열이 아니면 실패한다", () => {
    const r = run(IOS, args(app(13)), env, stub(ASC_STUB(builds())));
    expect(r.code).toBe(1);
    expect(r.err).toContain("expo.ios.buildNumber 가 정수 문자열이 아니다");
  });

  it("스토어보다 크면 한 줄을 남기고 0으로 끝난다 (GET만 부른다)", () => {
    const r = run(IOS, args(app("14")), env, stub(ASC_STUB(builds("12", "13"))));
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe("버전 1.0.0 · 빌드 14 · 커밋 0123456 · 스토어 마지막 13");
  });

  it("이 버전의 빌드가 없으면 통과한다", () => {
    const r = run(IOS, args(app("1")), env, stub(ASC_STUB(builds())));
    expect(r.code).toBe(0);
    expect(r.out).toContain("스토어 마지막 없음");
  });

  it("같으면 버전과 이미 있는 번호와 올릴 값을 말하고 1로 끝난다", () => {
    const r = run(IOS, args(app("13")), env, stub(ASC_STUB(builds("13"))));
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/^::error::버전 1\.0\.0에 빌드 13 .*이미 있다.*14 이상/);
  });

  it("스토어가 403이면 읽지 못한 이유로 실패한다", () => {
    const r = run(
      IOS,
      args(app("14")),
      env,
      stub(ASC_STUB({ errors: [{ detail: "forbidden" }] }, 403)),
    );
    expect(r.code).toBe(1);
    expect(r.err).toContain("HTTP 403 builds: forbidden");
    expect(r.err).not.toContain("BEGIN PRIVATE KEY");
  });
});

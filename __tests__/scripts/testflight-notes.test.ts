/**
 * TestFlight 「테스트할 내용」 — App Store Connect API로 빌드가 처리되길 기다렸다가 betaBuildLocalizations에 쓴다.
 * 네트워크·시계·잠자기는 주입한다. 실제 Apple 응답은 첫 실행에서만 본다(AGENTS 「iOS 빌드」).
 */

import { generateKeyPairSync, createVerify } from "node:crypto";
import { publishWhatsNew } from "../../scripts/ios-release/testflight-notes.ts";

const API = "https://api.appstoreconnect.apple.com/v1";
const NOW = 1_800_000_000_000;
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const KEY_P8 = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };
type Responder = (call: Call) => Response | undefined;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function make(override?: Responder) {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      headers: { ...((init?.headers ?? {}) as Record<string, string>) },
      body: init?.body as string | undefined,
    };
    calls.push(call);
    const custom = override?.(call);
    if (custom) return custom;
    if (url.startsWith(`${API}/apps?`)) return json({ data: [{ id: "APP1", type: "apps" }] });
    if (url.startsWith(`${API}/builds?`)) {
      return json({
        data: [{ id: "BUILD1", type: "builds", attributes: { processingState: "VALID" } }],
      });
    }
    if (url === `${API}/builds/BUILD1/betaBuildLocalizations`) return json({ data: [] });
    if (url === `${API}/betaBuildLocalizations` && call.method === "POST") {
      return json({ data: { id: "LOC1" } }, 201);
    }
    if (url === `${API}/betaBuildLocalizations/LOC1` && call.method === "PATCH") {
      return json({ data: { id: "LOC1" } });
    }
    return json(
      { errors: [{ title: "unexpected", detail: `unexpected ${call.method} ${url}` }] },
      500,
    );
  }) as typeof fetch;
  return { fakeFetch, calls, sleeps };
}

function run(fakeFetch: typeof fetch, sleeps: number[], overrides = {}) {
  let now = NOW;
  return publishWhatsNew({
    deps: {
      fetch: fakeFetch,
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    },
    keyP8: KEY_P8,
    keyId: "KEYID12345",
    issuerId: "issuer-uuid",
    bundleId: "com.a810labs.pocketlog",
    version: "1.0.0",
    buildNumber: "13",
    locale: "ko",
    whatsNew: "이어 하기\n- 하나",
    pollIntervalMs: 30_000,
    timeoutMs: 120_000,
    ...overrides,
  });
}

describe("TestFlight 테스트할 내용", () => {
  it("앱 → 빌드 → 지역화 목록 → 새 지역화 만들기 순서로 부른다", async () => {
    const { fakeFetch, calls, sleeps } = make();
    await expect(run(fakeFetch, sleeps)).resolves.toEqual({ buildId: "BUILD1", action: "created" });
    expect(calls.map((c) => `${c.method} ${c.url.split("?")[0]}`)).toEqual([
      `GET ${API}/apps`,
      `GET ${API}/builds`,
      `GET ${API}/builds/BUILD1/betaBuildLocalizations`,
      `POST ${API}/betaBuildLocalizations`,
    ]);
    expect(sleeps).toEqual([]);
  });

  it("앱·빌드 조회 필터는 번들 id·앱·버전·빌드 번호를 쓴다", async () => {
    const { fakeFetch, calls, sleeps } = make();
    await run(fakeFetch, sleeps);
    expect(decodeURIComponent(calls[0].url)).toContain("filter[bundleId]=com.a810labs.pocketlog");
    const builds = decodeURIComponent(calls[1].url);
    expect(builds).toContain("filter[app]=APP1");
    expect(builds).toContain("filter[version]=13");
    expect(builds).toContain("filter[preReleaseVersion.version]=1.0.0");
  });

  it("새 지역화는 로케일·글·빌드 관계를 싣는다", async () => {
    const { fakeFetch, calls, sleeps } = make();
    await run(fakeFetch, sleeps);
    const post = calls.find((c) => c.method === "POST")!;
    expect(JSON.parse(post.body!)).toEqual({
      data: {
        type: "betaBuildLocalizations",
        attributes: { locale: "ko", whatsNew: "이어 하기\n- 하나" },
        relationships: { build: { data: { type: "builds", id: "BUILD1" } } },
      },
    });
  });

  it("같은 로케일 지역화가 이미 있으면 새로 만들지 않고 고친다", async () => {
    const { fakeFetch, calls, sleeps } = make((c) =>
      c.url === `${API}/builds/BUILD1/betaBuildLocalizations`
        ? json({
            data: [
              { id: "LOC0", attributes: { locale: "en-US" } },
              { id: "LOC1", attributes: { locale: "ko" } },
            ],
          })
        : undefined,
    );
    await expect(run(fakeFetch, sleeps)).resolves.toEqual({ buildId: "BUILD1", action: "updated" });
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toBe(`${API}/betaBuildLocalizations/LOC1`);
    expect(JSON.parse(patch.body!)).toEqual({
      data: {
        type: "betaBuildLocalizations",
        id: "LOC1",
        attributes: { whatsNew: "이어 하기\n- 하나" },
      },
    });
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("JWT는 ES256이고 클레임이 계약과 같으며 서명이 공개 키로 검증된다", async () => {
    const { fakeFetch, calls, sleeps } = make();
    await run(fakeFetch, sleeps);
    const token = calls[0].headers.Authorization.replace("Bearer ", "");
    const [h, p, s] = token.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({
      alg: "ES256",
      kid: "KEYID12345",
      typ: "JWT",
    });
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(claims).toEqual({
      iss: "issuer-uuid",
      iat: NOW / 1000,
      exp: NOW / 1000 + 600,
      aud: "appstoreconnect-v1",
    });
    const ok = createVerify("SHA256")
      .update(`${h}.${p}`)
      .verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
    for (const c of calls) expect(c.headers.Authorization).toBe(`Bearer ${token}`);
  });

  describe("처리 기다리기", () => {
    it("빌드가 아직 안 보이거나 처리 중이면 간격을 두고 다시 본다", async () => {
      let builds = 0;
      const { fakeFetch, sleeps } = make((c) => {
        if (!c.url.startsWith(`${API}/builds?`)) return undefined;
        builds += 1;
        if (builds === 1) return json({ data: [] });
        if (builds === 2) {
          return json({ data: [{ id: "BUILD1", attributes: { processingState: "PROCESSING" } }] });
        }
        return undefined;
      });
      await expect(run(fakeFetch, sleeps)).resolves.toMatchObject({ buildId: "BUILD1" });
      expect(builds).toBe(3);
      expect(sleeps).toEqual([30_000, 30_000]);
    });

    it("처리가 INVALID·FAILED면 기다리지 않고 던진다", async () => {
      const { fakeFetch, sleeps } = make((c) =>
        c.url.startsWith(`${API}/builds?`)
          ? json({ data: [{ id: "BUILD1", attributes: { processingState: "INVALID" } }] })
          : undefined,
      );
      await expect(run(fakeFetch, sleeps)).rejects.toThrow("INVALID");
      expect(sleeps).toEqual([]);
    });

    it("한도 시간 안에 처리되지 않으면 던진다 — 빌드는 올라가 있다고 밝힌다", async () => {
      const { fakeFetch, sleeps } = make((c) =>
        c.url.startsWith(`${API}/builds?`) ? json({ data: [] }) : undefined,
      );
      const failure = run(fakeFetch, sleeps, { timeoutMs: 90_000 });
      await expect(failure).rejects.toThrow("처리되지 않았다");
      await expect(failure).rejects.toThrow("빌드는 이미 올라갔다");
    });
  });

  describe("오류 메시지 — 비밀을 싣지 않는다", () => {
    it("HTTP 오류는 상태·호출 이름·detail만 보인다", async () => {
      const { fakeFetch, sleeps } = make((c) =>
        c.url.startsWith(`${API}/apps?`)
          ? json(
              { errors: [{ title: "x", detail: "사유 문장", meta: { secret: "TOKEN-LEAK" } }] },
              401,
            )
          : undefined,
      );
      const failure = run(fakeFetch, sleeps);
      await expect(failure).rejects.toThrow("HTTP 401 apps: 사유 문장");
      await expect(failure).rejects.not.toThrow(/TOKEN-LEAK|Bearer|BEGIN/);
    });

    it("앱을 못 찾으면 던진다", async () => {
      const { fakeFetch, sleeps } = make((c) =>
        c.url.startsWith(`${API}/apps?`) ? json({ data: [] }) : undefined,
      );
      await expect(run(fakeFetch, sleeps)).rejects.toThrow("앱을 찾지 못했다");
    });

    it("개인 키 형식이 틀리면 키 내용 없이 던진다", async () => {
      const { fakeFetch, sleeps } = make();
      const failure = run(fakeFetch, sleeps, { keyP8: "not a key" });
      await expect(failure).rejects.toThrow("서명하지 못했다");
      await expect(failure).rejects.not.toThrow("not a key");
    });

    it("네트워크 예외는 내용 없이 호출 이름만 싣는다", async () => {
      const failingFetch = (async () => {
        throw new Error("socket TOKEN-LEAK");
      }) as typeof fetch;
      const failure = run(failingFetch, []);
      await expect(failure).rejects.toThrow("네트워크 오류 apps");
      await expect(failure).rejects.not.toThrow("TOKEN-LEAK");
    });
  });
});

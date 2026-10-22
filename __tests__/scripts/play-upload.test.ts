/**
 * 076 — Play 업로드 흐름(`scripts/android-release/play-upload.ts`)의 계약 P1~P7.
 * 네트워크는 fetch 대역, 서명 키는 테스트용 임시 RSA 키다. 실제 Play 호출은 첫 실행(quickstart §3)에서만 본다.
 */

import { generateKeyPairSync, verify } from "node:crypto";
import { listBundleVersionCodes, uploadBundle } from "../../scripts/android-release/play-upload.ts";

const PKG = "com.a810labs.pocketlog";
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;
const AAB = new Uint8Array([1, 2, 3, 4, 5]);
const NOW = 1_800_000_000_000;

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PRIVATE_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const SERVICE_ACCOUNT = JSON.stringify({
  client_email: "ci@example.iam.gserviceaccount.com",
  private_key: PRIVATE_PEM,
  token_uri: "https://oauth2.googleapis.com/token",
});

type Call = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal | null;
};
type Responder = (call: Call) => Response | undefined;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** 호출을 기록하고, 정해진 응답이 없는 요청은 정상 응답을 준다 */
function makeFetch(override?: Responder) {
  const calls: Call[] = [];
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      headers: { ...((init?.headers ?? {}) as Record<string, string>) },
      body: init?.body,
      signal: init?.signal,
    };
    calls.push(call);
    const custom = override?.(call);
    if (custom) return custom;
    if (url === "https://oauth2.googleapis.com/token") {
      return json({ access_token: "ya29.TOKEN-VALUE" });
    }
    if (url === `${BASE}/edits` && call.method === "POST") return json({ id: "EDIT1" });
    if (url.startsWith(`${UPLOAD}/edits/EDIT1/bundles`)) return json({ versionCode: 42 });
    if (url === `${BASE}/edits/EDIT1/tracks/internal`) return json({ track: "internal" });
    if (url === `${BASE}/edits/EDIT1:commit`) return json({ id: "EDIT1" });
    if (url === `${BASE}/edits/EDIT1` && call.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    throw new Error(`예상 밖 호출: ${call.method} ${url}`);
  }) as unknown as typeof fetch;
  return { fakeFetch, calls };
}

function run(fakeFetch: typeof fetch, overrides: Partial<Parameters<typeof uploadBundle>[0]> = {}) {
  return uploadBundle({
    deps: { fetch: fakeFetch, now: () => NOW },
    serviceAccountJson: SERVICE_ACCOUNT,
    packageName: PKG,
    track: "internal",
    aab: AAB,
    ...overrides,
  });
}

describe("076 Play 업로드", () => {
  it("P1 토큰 → insert → 번들 업로드 → 트랙 → commit 순서로 정확히 한 번씩 부른다", async () => {
    const { fakeFetch, calls } = makeFetch();
    await expect(run(fakeFetch)).resolves.toEqual({ versionCode: 42 });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST https://oauth2.googleapis.com/token",
      `POST ${BASE}/edits`,
      `POST ${UPLOAD}/edits/EDIT1/bundles?uploadType=media`,
      `PUT ${BASE}/edits/EDIT1/tracks/internal`,
      `POST ${BASE}/edits/EDIT1:commit`,
    ]);
    // 토큰 이후의 호출은 모두 Bearer 토큰을 쓴다
    for (const c of calls.slice(1)) {
      expect(c.headers.Authorization).toBe("Bearer ya29.TOKEN-VALUE");
    }
  });

  it("트랙은 방금 올린 versionCode를 완료 상태로 지정한다", async () => {
    const { fakeFetch, calls } = makeFetch();
    await run(fakeFetch);
    const track = calls.find((c) => c.method === "PUT")!;
    expect(JSON.parse(track.body as string)).toEqual({
      track: "internal",
      releases: [{ versionCodes: ["42"], status: "completed" }],
    });
  });

  it("릴리스 노트를 주면 그 릴리스에 언어와 글이 실린다", async () => {
    const { fakeFetch, calls } = makeFetch();
    await run(fakeFetch, { releaseNotes: [{ language: "ko-KR", text: "이어 하기\n- 하나" }] });
    const track = calls.find((c) => c.method === "PUT")!;
    expect(JSON.parse(track.body as string).releases).toEqual([
      {
        versionCodes: ["42"],
        status: "completed",
        releaseNotes: [{ language: "ko-KR", text: "이어 하기\n- 하나" }],
      },
    ]);
  });

  it("릴리스 노트를 안 주면 releaseNotes 키가 없다 (종전 요청과 같다)", async () => {
    const { fakeFetch, calls } = makeFetch();
    await run(fakeFetch, { releaseNotes: undefined });
    const track = calls.find((c) => c.method === "PUT")!;
    expect(Object.keys(JSON.parse(track.body as string).releases[0])).toEqual([
      "versionCodes",
      "status",
    ]);
  });

  it("모든 호출에 시간 제한(AbortSignal)이 붙는다 — 응답이 멈춰도 잡이 붙들리지 않는다", async () => {
    const { fakeFetch, calls } = makeFetch();
    await run(fakeFetch);
    for (const c of calls) expect(c.signal).toBeInstanceOf(AbortSignal);
  });

  it("P3 번들은 옥텟 스트림으로 바이트 그대로 올린다", async () => {
    const { fakeFetch, calls } = makeFetch();
    await run(fakeFetch);
    const upload = calls.find((c) => c.url.includes("/bundles"))!;
    expect(upload.headers["Content-Type"]).toBe("application/octet-stream");
    expect(upload.body).toBe(AAB);
  });

  it("P2 JWT는 RS256이고 클레임이 계약과 같으며 서명이 공개 키로 검증된다", async () => {
    const { fakeFetch, calls } = makeFetch();
    await run(fakeFetch);
    const form = new URLSearchParams(calls[0].body as string);
    expect(form.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const [h, p, s] = form.get("assertion")!.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
    });
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(claims).toEqual({
      iss: "ci@example.iam.gserviceaccount.com",
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: NOW / 1000,
      exp: NOW / 1000 + 3600,
    });
    const ok = verify(
      "RSA-SHA256",
      Buffer.from(`${h}.${p}`),
      publicKey,
      Buffer.from(s, "base64url"),
    );
    expect(ok).toBe(true);
  });

  describe("P5 서비스 계정 JSON이 틀리면 네트워크를 부르기 전에 던진다", () => {
    it.each([
      ["JSON이 아니다", "not json"],
      ["client_email이 없다", JSON.stringify({ private_key: PRIVATE_PEM })],
      ["private_key가 없다", JSON.stringify({ client_email: "a@b.c" })],
      ["빈 문자열", ""],
    ])("%s", async (_name, bad) => {
      const { fakeFetch, calls } = makeFetch();
      await expect(run(fakeFetch, { serviceAccountJson: bad })).rejects.toThrow(/서비스 계정/);
      expect(calls).toHaveLength(0);
    });

    it("오류 메시지에 입력 값을 싣지 않는다", async () => {
      const { fakeFetch } = makeFetch();
      const broken = '{"private_key":"-----BEGIN PRIVATE KEY-----SECRET';
      const error = (await run(fakeFetch, { serviceAccountJson: broken }).catch(
        (e: Error) => e,
      )) as Error;
      expect(error.message).not.toContain("SECRET");
    });
  });

  describe("P4 편집을 연 뒤 실패하면 편집을 버리고 원래 오류를 던진다", () => {
    const failAt =
      (match: (c: Call) => boolean): Responder =>
      (c) =>
        match(c) ? json({ error: { message: "거부 사유" } }, 403) : undefined;

    it.each([
      [
        "번들 업로드",
        (c: Call) => c.url.includes("/bundles"),
        /HTTP 403 bundles\.upload: 거부 사유/,
      ],
      ["트랙 갱신", (c: Call) => c.method === "PUT", /HTTP 403 tracks\.update: 거부 사유/],
      ["commit", (c: Call) => c.url.endsWith(":commit"), /HTTP 403 edits\.commit: 거부 사유/],
    ])("%s 실패", async (_name, match, message) => {
      const { fakeFetch, calls } = makeFetch(failAt(match));
      await expect(run(fakeFetch)).rejects.toThrow(message);
      const last = calls[calls.length - 1];
      expect(`${last.method} ${last.url}`).toBe(`DELETE ${BASE}/edits/EDIT1`);
    });

    it("편집 삭제가 실패해도 원래 오류가 그대로 나온다", async () => {
      const { fakeFetch } = makeFetch((c) => {
        if (c.url.includes("/bundles")) return json({ error: { message: "원래 오류" } }, 400);
        if (c.method === "DELETE") return json({ error: { message: "삭제 오류" } }, 500);
        return undefined;
      });
      await expect(run(fakeFetch)).rejects.toThrow(/원래 오류/);
    });

    it("commit 성공 뒤에는 삭제를 부르지 않는다", async () => {
      const { fakeFetch, calls } = makeFetch();
      await run(fakeFetch);
      expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    });

    it("같은 versionCode를 Play가 거부하면 그 사유가 그대로 보이고 편집이 버려진다", async () => {
      const { fakeFetch, calls } = makeFetch((c) =>
        c.url.includes("/bundles")
          ? json(
              { error: { message: "APK specifies a version code that has already been used." } },
              403,
            )
          : undefined,
      );
      await expect(run(fakeFetch)).rejects.toThrow(
        "HTTP 403 bundles.upload: APK specifies a version code that has already been used.",
      );
      expect(calls[calls.length - 1].method).toBe("DELETE");
    });
  });

  it("P7 응답의 versionCode가 정수가 아니면 트랙 갱신 전에 편집을 버린다", async () => {
    const { fakeFetch, calls } = makeFetch((c) =>
      c.url.includes("/bundles") ? json({ versionCode: "abc" }) : undefined,
    );
    await expect(run(fakeFetch)).rejects.toThrow(/versionCode/);
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
    expect(calls[calls.length - 1].method).toBe("DELETE");
  });

  describe("P6 오류 메시지에 비밀이 없다", () => {
    const TOKENISH = "ya29.LEAKED-ACCESS-TOKEN";

    it("응답 본문의 다른 필드(토큰 모양 문자열)는 메시지에 들어오지 않는다", async () => {
      const { fakeFetch } = makeFetch((c) =>
        c.url.includes("/bundles")
          ? json(
              { error: { message: "권한 없음" }, access_token: TOKENISH, debug: SERVICE_ACCOUNT },
              403,
            )
          : undefined,
      );
      const error = (await run(fakeFetch).catch((e: Error) => e)) as Error;
      expect(error.message).toBe("HTTP 403 bundles.upload: 권한 없음");
      for (const secret of [
        TOKENISH,
        "ya29.TOKEN-VALUE",
        "PRIVATE KEY",
        "ci@example",
        "client_email",
      ]) {
        expect(error.message).not.toContain(secret);
      }
    });

    it("토큰 교환 실패는 error와 error_description만 보인다 (assertion은 없다)", async () => {
      const { fakeFetch } = makeFetch((c) =>
        c.url === "https://oauth2.googleapis.com/token"
          ? json({ error: "invalid_grant", error_description: "Invalid JWT Signature." }, 400)
          : undefined,
      );
      const error = (await run(fakeFetch).catch((e: Error) => e)) as Error;
      expect(error.message).toBe("HTTP 400 token: invalid_grant (Invalid JWT Signature.)");
    });

    it("JSON이 아닌 오류 응답과 네트워크 예외도 본문·예외 내용을 싣지 않는다", async () => {
      const html = makeFetch((c) =>
        c.url.includes("/bundles")
          ? new Response(`<html>${TOKENISH}</html>`, { status: 502 })
          : undefined,
      );
      const e1 = (await run(html.fakeFetch).catch((e: Error) => e)) as Error;
      expect(e1.message).toBe("HTTP 502 bundles.upload: (응답에서 사유를 읽지 못함)");

      const down = makeFetch((c) => {
        if (c.url.includes("/bundles")) throw new Error(`connect ECONNREFUSED ${TOKENISH}`);
        return undefined;
      });
      const e2 = (await run(down.fakeFetch).catch((e: Error) => e)) as Error;
      expect(e2.message).toBe("네트워크 오류 bundles.upload");
      expect(e2.message).not.toContain(TOKENISH);
    });
  });
});

describe("096 Play 번들 번호 조회 (listBundleVersionCodes)", () => {
  const LIST = `${BASE}/edits/EDIT1/bundles`;

  function lookup(override?: Responder) {
    const { fakeFetch, calls } = makeFetch((call) => {
      const custom = override?.(call);
      if (custom) return custom;
      if (call.url === LIST) return json({ bundles: [{ versionCode: 9 }, { versionCode: 12 }] });
      return undefined;
    });
    const result = () =>
      listBundleVersionCodes({
        deps: { fetch: fakeFetch, now: () => NOW },
        serviceAccountJson: SERVICE_ACCOUNT,
        packageName: PKG,
      });
    return { calls, result };
  }

  it("P5 토큰 → insert → 번들 목록 → 편집 삭제 순서로 부르고 번호를 돌려준다", async () => {
    const { calls, result } = lookup();
    await expect(result()).resolves.toEqual([9, 12]);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST https://oauth2.googleapis.com/token",
      `POST ${BASE}/edits`,
      `GET ${LIST}`,
      `DELETE ${BASE}/edits/EDIT1`,
    ]);
    expect(calls[2].headers.Authorization).toBe("Bearer ya29.TOKEN-VALUE");
  });

  it("P5 읽기 전용이다 — 업로드·트랙·commit을 부르지 않는다", async () => {
    const { calls, result } = lookup();
    await result();
    for (const call of calls) {
      expect(call.url).not.toMatch(/upload\/androidpublisher|\/tracks\/|:commit/);
    }
  });

  it("목록 조회가 성공하면 편집 삭제가 실패해도 번호를 그대로 돌려준다", async () => {
    const { calls, result } = lookup((c) =>
      c.method === "DELETE" ? json({ error: { message: "삭제 실패" } }, 500) : undefined,
    );
    await expect(result()).resolves.toEqual([9, 12]);
    expect(calls.at(-1)).toMatchObject({ method: "DELETE" });
  });

  it("P7 bundles 키가 없으면(번들이 없는 앱) 빈 배열이고 편집은 버린다", async () => {
    const { calls, result } = lookup((c) => (c.url === LIST ? json({}) : undefined));
    await expect(result()).resolves.toEqual([]);
    expect(calls.at(-1)).toMatchObject({ method: "DELETE" });
  });

  it("P7 bundles가 배열이 아니거나 versionCode가 정수가 아니면 실패한다", async () => {
    for (const body of [
      { bundles: "x" },
      { bundles: [{ versionCode: "12" }] },
      { bundles: [{ versionCode: 1.5 }] },
      { bundles: [{}] },
    ]) {
      const { calls, result } = lookup((c) => (c.url === LIST ? json(body) : undefined));
      await expect(result()).rejects.toThrow("HTTP 200 bundles.list: 응답 형식이 다르다");
      expect(calls.at(-1)).toMatchObject({ method: "DELETE" });
    }
  });

  it("P6 목록 조회가 실패해도 편집을 버리고 원래 오류를 던진다 (삭제 실패는 삼킨다)", async () => {
    const { calls, result } = lookup((c) => {
      if (c.url === LIST) return json({ error: { message: "boom" } }, 500);
      if (c.method === "DELETE") return json({ error: { message: "삭제 실패" } }, 500);
      return undefined;
    });
    await expect(result()).rejects.toThrow("HTTP 500 bundles.list: boom");
    expect(calls.at(-1)).toMatchObject({ method: "DELETE" });
  });

  it("P8 403이면 사유 뒤에 필요한 권한을 덧붙인다", async () => {
    const { result } = lookup((c) =>
      c.url === LIST
        ? json({ error: { message: "The caller does not have permission" } }, 403)
        : undefined,
    );
    await expect(result()).rejects.toThrow(
      /HTTP 403 bundles\.list: The caller does not have permission .*앱 정보 보기·릴리스 보기 권한/,
    );
  });

  it("편집을 만들 때 403이어도 같은 권한 안내가 붙는다", async () => {
    const { result } = lookup((c) =>
      c.url === `${BASE}/edits` ? json({ error: { message: "denied" } }, 403) : undefined,
    );
    await expect(result()).rejects.toThrow(/HTTP 403 edits\.insert: denied .*권한/);
  });

  it("FR-007 오류 문장에 토큰·개인 키·서비스 계정·응답 본문의 다른 필드가 실리지 않는다", async () => {
    const { result } = lookup((c) =>
      c.url === LIST
        ? json({ error: { message: "nope" }, debug: "ya29.LEAK", access_token: "ya29.LEAK2" }, 403)
        : undefined,
    );
    const error = (await result().catch((e: Error) => e)) as Error;
    expect(error.message).not.toMatch(/ya29|PRIVATE KEY|ci@example|LEAK/);
  });

  it("네트워크 오류는 호출 이름만 밝힌다", async () => {
    const { fakeFetch } = makeFetch((c) => {
      if (c.url === LIST) throw new Error("socket hang up ya29.LEAK");
      return undefined;
    });
    const error = await listBundleVersionCodes({
      deps: { fetch: fakeFetch, now: () => NOW },
      serviceAccountJson: SERVICE_ACCOUNT,
      packageName: PKG,
    }).catch((e: Error) => e);
    expect((error as Error).message).toBe("네트워크 오류 bundles.list");
  });
});

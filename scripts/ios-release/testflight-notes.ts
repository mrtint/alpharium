/**
 * TestFlight 「테스트할 내용」 — 업로드된 빌드가 처리되길 기다렸다가 App Store Connect API로 `betaBuildLocalizations`에 쓴다.
 * 네트워크·시계·잠자기는 주입받는다. `altool`은 이 글을 올리지 못한다.
 * 096 — 같은 인증·호출로 이 버전의 스토어 빌드 번호를 읽기만 한다(`listBuildNumbers`).
 *
 * `play-upload.ts`와 같은 규칙이다: 새 의존성 없이 Node 내장 `crypto`와 `fetch`만 쓰고, 비밀(API 개인 키·토큰)을 어디에도 출력하지
 * 않는다. 오류 메시지는 `HTTP <상태> <호출>: <사유>` 꼴 하나이고 사유는 응답의 `errors[0].detail`(없으면 `title`)에서만 가져온다.
 *
 * 이 단계가 실패해도 빌드는 이미 TestFlight로 올라가 있다 — 그 사실을 오류 문장에 적어 다시 올리지 않게 한다.
 */

import { createSign } from "node:crypto";

export type AscDeps = {
  fetch: typeof fetch;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

export type PublishArgs = {
  deps: AscDeps;
  /** App Store Connect API 개인 키(.p8, PEM 문자열) */
  keyP8: string;
  keyId: string;
  issuerId: string;
  bundleId: string;
  /** 마케팅 버전(`expo.version`) — 같은 빌드 번호가 다른 버전에 있을 수 있다 */
  version: string;
  /** 빌드 번호(`expo.ios.buildNumber`) */
  buildNumber: string;
  /** TestFlight 로케일 (한국어는 `ko`) */
  locale: string;
  whatsNew: string;
  /** 빌드가 처리되길 기다리는 간격·한도 (기본 30초·30분) */
  pollIntervalMs?: number;
  timeoutMs?: number;
};

const API = "https://api.appstoreconnect.apple.com/v1";
const CALL_TIMEOUT_MS = 60_000;

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/** ES256 JWT. 개인 키로 서명하지 못하면 이유를 싣지 않고 던진다 */
function signJwt(args: Pick<PublishArgs, "keyP8" | "keyId" | "issuerId">, nowMs: number): string {
  const iat = Math.floor(nowMs / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: args.keyId, typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: args.issuerId, iat, exp: iat + 600, aud: "appstoreconnect-v1" }),
  );
  try {
    const signature = createSign("SHA256")
      .update(`${header}.${claims}`)
      .sign({ key: args.keyP8, dsaEncoding: "ieee-p1363" });
    return `${header}.${claims}.${base64url(signature)}`;
  } catch {
    throw new Error("API 개인 키로 서명하지 못했다 (ASC_API_KEY_P8 형식 확인)");
  }
}

/** 오류 응답에서 사람이 읽을 사유만 꺼낸다. 본문 전체를 쓰지 않는다 */
async function reasonOf(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { errors?: { detail?: unknown; title?: unknown }[] };
    const first = body.errors?.[0];
    if (typeof first?.detail === "string" && first.detail !== "") return first.detail;
    if (typeof first?.title === "string" && first.title !== "") return first.title;
  } catch {
    // 본문이 JSON이 아니면 아래 고정 문구
  }
  return "(응답에서 사유를 읽지 못함)";
}

type Json = Record<string, unknown>;

/** 호출 하나. 실패는 `HTTP <상태> <이름>: <사유>`, 연결 실패는 `네트워크 오류 <이름>`. `forbiddenHint`는 403일 때 사유 뒤에 괄호로 붙는다 */
async function callAsc(
  deps: AscDeps,
  token: string,
  name: string,
  method: string,
  url: string,
  body?: unknown,
  forbiddenHint?: string,
): Promise<Json> {
  let response: Response;
  try {
    response = await deps.fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    } as RequestInit);
  } catch {
    throw new Error(`네트워크 오류 ${name}`);
  }
  if (!response.ok) {
    const hint =
      response.status === 403 && forbiddenHint !== undefined ? ` (${forbiddenHint})` : "";
    throw new Error(`HTTP ${response.status} ${name}: ${await reasonOf(response)}${hint}`);
  }
  try {
    return (await response.json()) as Json;
  } catch {
    return {};
  }
}

export async function publishWhatsNew(
  args: PublishArgs,
): Promise<{ buildId: string; action: "created" | "updated" }> {
  const { deps } = args;
  const token = signJwt(args, deps.now());
  const call = (name: string, method: string, url: string, body?: unknown) =>
    callAsc(deps, token, name, method, url, body);

  const apps = await call(
    "apps",
    "GET",
    `${API}/apps?${new URLSearchParams({ "filter[bundleId]": args.bundleId, limit: "1" })}`,
  );
  const appId = (apps.data as { id?: string }[] | undefined)?.[0]?.id;
  if (typeof appId !== "string" || appId === "") {
    throw new Error(`앱을 찾지 못했다 (번들 id ${args.bundleId})`);
  }

  // 업로드 직후에는 빌드가 아직 안 보이거나 처리 중이다 — `altool`이 끝나도 처리 통과는 아니다.
  const interval = args.pollIntervalMs ?? 30_000;
  const deadline = deps.now() + (args.timeoutMs ?? 1_800_000);
  const buildsUrl = `${API}/builds?${new URLSearchParams({
    "filter[app]": appId,
    "filter[version]": args.buildNumber,
    "filter[preReleaseVersion.version]": args.version,
    limit: "1",
  })}`;
  let buildId: string | undefined;
  for (;;) {
    const builds = await call("builds", "GET", buildsUrl);
    const build = (
      builds.data as { id?: string; attributes?: { processingState?: string } }[] | undefined
    )?.[0];
    const state = build?.attributes?.processingState;
    if (build !== undefined && state === "VALID" && typeof build.id === "string") {
      buildId = build.id;
      break;
    }
    if (state === "INVALID" || state === "FAILED") {
      throw new Error(
        `빌드 ${args.version} (${args.buildNumber})의 처리가 ${state}다 — 빌드는 이미 올라갔다, App Store Connect 메일을 본다`,
      );
    }
    if (deps.now() + interval > deadline) {
      throw new Error(
        `빌드 ${args.version} (${args.buildNumber})가 한도 안에 처리되지 않았다 — 빌드는 이미 올라갔다, 처리가 끝나면 노트만 따로 넣는다`,
      );
    }
    await deps.sleep(interval);
  }

  const localizations = await call(
    "betaBuildLocalizations.list",
    "GET",
    `${API}/builds/${buildId}/betaBuildLocalizations`,
  );
  const existing = (
    localizations.data as { id?: string; attributes?: { locale?: string } }[] | undefined
  )?.find((item) => item.attributes?.locale === args.locale);

  if (existing !== undefined && typeof existing.id === "string") {
    await call(
      "betaBuildLocalizations.update",
      "PATCH",
      `${API}/betaBuildLocalizations/${existing.id}`,
      {
        data: {
          type: "betaBuildLocalizations",
          id: existing.id,
          attributes: { whatsNew: args.whatsNew },
        },
      },
    );
    return { buildId, action: "updated" };
  }
  await call("betaBuildLocalizations.create", "POST", `${API}/betaBuildLocalizations`, {
    data: {
      type: "betaBuildLocalizations",
      attributes: { locale: args.locale, whatsNew: args.whatsNew },
      relationships: { build: { data: { type: "builds", id: buildId } } },
    },
  });
  return { buildId, action: "created" };
}

const API_ORIGIN = "https://api.appstoreconnect.apple.com/";
const MAX_PAGES = 20;
const READ_ROLE_HINT = "API 키 역할을 확인한다 — App Manager 이상";

/**
 * 이 앱·이 마케팅 버전으로 App Store Connect에 올라간 모든 빌드의 번호(`attributes.version`)를 읽는다(096). 읽기(GET)만 한다.
 * 서버 정렬에 기대지 않고 모두 내려받아 부르는 쪽이 센다. 다음 쪽 주소는 API 호스트일 때만 따라간다 — 토큰을 다른 곳으로 보내지 않는다.
 */
export async function listBuildNumbers(
  args: Pick<PublishArgs, "deps" | "keyP8" | "keyId" | "issuerId" | "bundleId" | "version">,
): Promise<string[]> {
  const { deps } = args;
  const token = signJwt(args, deps.now());
  const get = (name: string, url: string) =>
    callAsc(deps, token, name, "GET", url, undefined, READ_ROLE_HINT);

  const apps = await get(
    "apps",
    `${API}/apps?${new URLSearchParams({ "filter[bundleId]": args.bundleId, limit: "1" })}`,
  );
  const appId = (apps.data as { id?: string }[] | undefined)?.[0]?.id;
  if (typeof appId !== "string" || appId === "") {
    throw new Error(`앱을 찾지 못했다 (번들 id ${args.bundleId})`);
  }

  const numbers: string[] = [];
  let url: string | undefined = `${API}/builds?${new URLSearchParams({
    "filter[app]": appId,
    "filter[preReleaseVersion.version]": args.version,
    limit: "200",
  })}`;
  for (let page = 1; url !== undefined; page++) {
    if (page > MAX_PAGES) {
      throw new Error(`빌드 목록이 ${MAX_PAGES}쪽을 넘는다 — 번호를 다 읽지 못했다`);
    }
    const body = await get("builds", url);
    if (!Array.isArray(body.data)) throw new Error("HTTP 200 builds: 응답 형식이 다르다");
    for (const build of body.data as { attributes?: { version?: unknown } }[]) {
      const version = build?.attributes?.version;
      if (typeof version !== "string") throw new Error("HTTP 200 builds: 응답 형식이 다르다");
      numbers.push(version);
    }
    const next = (body.links as { next?: unknown } | undefined)?.next;
    if (next === undefined) {
      url = undefined;
    } else if (typeof next === "string" && next.startsWith(API_ORIGIN)) {
      url = next;
    } else {
      throw new Error("HTTP 200 builds: 다음 쪽 주소가 App Store Connect API가 아니다");
    }
  }
  return numbers;
}

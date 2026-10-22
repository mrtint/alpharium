/**
 * 076 — Play Developer API(edits)로 AAB를 내부 테스트 트랙에 올린다. 네트워크와 시계는 주입받는다.
 * 096 — 같은 인증·호출로 Play에 올라간 번들 번호를 읽기만 한다(`listBundleVersionCodes`, 편집은 열었다가 버린다).
 *
 * 계약: specs/076-android-release-ci/contracts/scripts-contract.md P1~P7,
 *       specs/096-release-build-number-check/contracts/scripts-contract.md P5~P8
 *
 * 새 의존성 없이 Node 내장 `crypto`와 `fetch`만 쓴다 — 배포 권한을 가진 서비스 계정 JSON을 저장소 안 코드만 다루게 하려는
 * 소유자 결정(2026-10-11)이다. 그래서 이 파일은 비밀을 어디에도 출력하지 않는다: 오류 메시지는 `HTTP <상태> <호출>: <사유>`
 * 꼴 하나뿐이고, 사유는 응답의 `error.message`(또는 OAuth의 `error`·`error_description`)에서만 가져온다. 응답 본문 전체,
 * 토큰, 개인 키, 예외 객체의 내용은 메시지에 들어오지 않는다.
 *
 * 흐름 중 어느 단계든 실패하면 열어 둔 편집을 버린다 — 트랙에 반쪽 릴리스가 남지 않게.
 */

import { createSign } from "node:crypto";

export type PlayDeps = { fetch: typeof fetch; now: () => number };

export type UploadArgs = {
  deps: PlayDeps;
  serviceAccountJson: string;
  packageName: string;
  track: string;
  aab: Uint8Array;
  /** 릴리스 노트(언어당 하나). 없으면 노트 없이 올린다 — 검증(길이·빈 값)은 부르는 쪽(`release-notes/notes.ts`)이 한다 */
  releaseNotes?: { language: string; text: string }[];
};

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const UPLOAD_API =
  "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";

/** 응답이 멈춘 호출이 잡 시간 한도(90분)까지 동시 실행 그룹을 붙잡지 않게 한다. 번들 업로드만 길게 둔다(미실측: AAB 크기·업로드 시간) */
const CALL_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 600_000;

type ServiceAccount = { clientEmail: string; privateKey: string };

/** 서비스 계정 JSON을 읽는다. 오류 메시지에 입력 값을 싣지 않는다 */
function parseServiceAccount(text: string): ServiceAccount {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("서비스 계정 JSON을 읽지 못했다 (JSON 형식이 아님)");
  }
  const record = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<
    string,
    unknown
  >;
  const { client_email: email, private_key: key } = record;
  if (typeof email !== "string" || email === "" || typeof key !== "string" || key === "") {
    throw new Error("서비스 계정 JSON에 client_email 또는 private_key가 없다");
  }
  return { clientEmail: email, privateKey: key };
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/** RS256 JWT. 개인 키로 서명하지 못하면 이유를 싣지 않고 던진다 */
function signJwt(account: ServiceAccount, nowMs: number): string {
  const iat = Math.floor(nowMs / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat,
      exp: iat + 3600,
    }),
  );
  try {
    const signature = createSign("RSA-SHA256")
      .update(`${header}.${claims}`)
      .sign(account.privateKey);
    return `${header}.${claims}.${base64url(signature)}`;
  } catch {
    throw new Error("서비스 계정 개인 키로 서명하지 못했다 (private_key 형식 확인)");
  }
}

/** 오류 응답에서 사람이 읽을 사유만 꺼낸다. 본문 전체를 쓰지 않는다 */
async function reasonOf(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    const error = body.error;
    if (typeof error === "object" && error !== null) {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === "string" && message !== "") return message;
    }
    if (typeof error === "string" && error !== "") {
      const description = body.error_description;
      return typeof description === "string" && description !== ""
        ? `${error} (${description})`
        : error;
    }
  } catch {
    // 본문이 JSON이 아니면 아래 고정 문구
  }
  return "(응답에서 사유를 읽지 못함)";
}

type Init = { method: string; headers?: Record<string, string>; body?: string | Uint8Array };

/**
 * 호출 하나. 실패는 `HTTP <상태> <이름>: <사유>`, 연결 실패는 `네트워크 오류 <이름>`.
 * `forbiddenHint`를 주면 403일 때 사유 뒤에 괄호로 붙인다(무엇을 더 줘야 하는지).
 */
async function call(
  deps: PlayDeps,
  name: string,
  url: string,
  init: Init,
  timeoutMs = CALL_TIMEOUT_MS,
  forbiddenHint?: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await deps.fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    } as RequestInit);
  } catch {
    throw new Error(`네트워크 오류 ${name}`);
  }
  if (!response.ok) {
    const hint =
      response.status === 403 && forbiddenHint !== undefined ? ` (${forbiddenHint})` : "";
    throw new Error(`HTTP ${response.status} ${name}: ${await reasonOf(response)}${hint}`);
  }
  return response;
}

async function jsonOf(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** 서비스 계정 JSON으로 액세스 토큰을 받아 `Authorization` 헤더를 돌려준다 */
async function authorize(
  deps: PlayDeps,
  serviceAccountJson: string,
): Promise<{ Authorization: string }> {
  const account = parseServiceAccount(serviceAccountJson);
  const assertion = signJwt(account, deps.now());

  const tokenResponse = await call(deps, "token", TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const accessToken = (await jsonOf(tokenResponse)).access_token;
  if (typeof accessToken !== "string" || accessToken === "") {
    throw new Error("HTTP 200 token: 응답에 액세스 토큰이 없다");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

export async function uploadBundle(args: UploadArgs): Promise<{ versionCode: number }> {
  const { deps, packageName, track, aab, releaseNotes } = args;
  const auth = await authorize(deps, args.serviceAccountJson);

  const base = `${API}/${packageName}`;
  const editResponse = await call(deps, "edits.insert", `${base}/edits`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: "{}",
  });
  const editId = (await jsonOf(editResponse)).id;
  if (typeof editId !== "string" || editId === "") {
    throw new Error("HTTP 200 edits.insert: 응답에 편집 id가 없다");
  }

  try {
    const uploaded = await call(
      deps,
      "bundles.upload",
      `${UPLOAD_API}/${packageName}/edits/${editId}/bundles?uploadType=media`,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/octet-stream" },
        body: aab,
      },
      UPLOAD_TIMEOUT_MS,
    );
    const versionCode = (await jsonOf(uploaded)).versionCode;
    if (typeof versionCode !== "number" || !Number.isInteger(versionCode)) {
      throw new Error("HTTP 200 bundles.upload: 응답의 versionCode가 정수가 아니다");
    }

    await call(
      deps,
      "tracks.update",
      `${base}/edits/${editId}/tracks/${encodeURIComponent(track)}`,
      {
        method: "PUT",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          track,
          releases: [
            {
              versionCodes: [String(versionCode)],
              status: "completed",
              ...(releaseNotes === undefined ? {} : { releaseNotes }),
            },
          ],
        }),
      },
    );
    await call(deps, "edits.commit", `${base}/edits/${editId}:commit`, {
      method: "POST",
      headers: auth,
    });
    return { versionCode };
  } catch (error) {
    // 편집을 버린다. 그 실패는 삼키고 원래 오류를 던진다 (commit 성공 뒤에는 여기로 오지 않는다)
    await call(deps, "edits.delete", `${base}/edits/${editId}`, {
      method: "DELETE",
      headers: auth,
    }).catch(() => undefined);
    throw error;
  }
}

const READ_PERMISSION_HINT = "서비스 계정에 Play Console 앱 정보 보기·릴리스 보기 권한이 필요하다";

/**
 * Play에 올라간 모든 번들의 versionCode를 읽는다(096). versionCode는 트랙을 통틀어 단조 증가해야 하므로 트랙별 목록이 아니라
 * 번들 목록이 정본이다. 읽기 전용이다: 목록을 읽으려면 편집이 필요해 열지만 커밋하지 않고 언제나 버린다(삭제 실패는 삼킨다).
 */
export async function listBundleVersionCodes(args: {
  deps: PlayDeps;
  serviceAccountJson: string;
  packageName: string;
}): Promise<number[]> {
  const { deps, packageName } = args;
  const auth = await authorize(deps, args.serviceAccountJson);
  const base = `${API}/${packageName}`;

  const editResponse = await call(
    deps,
    "edits.insert",
    `${base}/edits`,
    { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: "{}" },
    CALL_TIMEOUT_MS,
    READ_PERMISSION_HINT,
  );
  const editId = (await jsonOf(editResponse)).id;
  if (typeof editId !== "string" || editId === "") {
    throw new Error("HTTP 200 edits.insert: 응답에 편집 id가 없다");
  }

  try {
    const listed = await call(
      deps,
      "bundles.list",
      `${base}/edits/${editId}/bundles`,
      { method: "GET", headers: auth },
      CALL_TIMEOUT_MS,
      READ_PERMISSION_HINT,
    );
    const { bundles } = await jsonOf(listed);
    // 번들이 하나도 없는 앱은 `bundles` 키가 빠질 수 있다 — 키가 있는데 배열이 아니면 형식이 다른 것이다
    if (bundles === undefined) return [];
    if (!Array.isArray(bundles)) throw new Error("HTTP 200 bundles.list: 응답 형식이 다르다");
    return bundles.map((bundle: unknown) => {
      const versionCode =
        typeof bundle === "object" && bundle !== null
          ? (bundle as Record<string, unknown>).versionCode
          : undefined;
      if (typeof versionCode !== "number" || !Number.isInteger(versionCode)) {
        throw new Error("HTTP 200 bundles.list: 응답 형식이 다르다");
      }
      return versionCode;
    });
  } finally {
    await call(deps, "edits.delete", `${base}/edits/${editId}`, {
      method: "DELETE",
      headers: auth,
    }).catch(() => undefined);
  }
}

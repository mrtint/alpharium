/**
 * 076 — AAB 서명 인증서 판정 (순수 함수, 파일·프로세스·환경변수를 만지지 않는다).
 *
 * 계약: specs/076-android-release-ci/contracts/scripts-contract.md V1~V7
 *
 * 입력은 `keytool -J-Duser.language=en -J-Duser.country=US -printcert -jarfile <aab>`의 출력이다. 로캘을 영어로 못 박는
 * 이유는 실측(2026-10-11, 한국어 Windows JDK 17)에서 옵션 없이는 `소유자:`로 나왔기 때문이다. `SHA256:` 줄은 로캘과
 * 무관했고 줄 끝은 CRLF와 LF가 섞여 있었다.
 *
 * 이 판정이 막는 것: 키스토어가 없을 때 조용히 debug 키로 서명되는 것(`plugins/with-release-signing.js`가 가장 경계하는
 * 실패), 그리고 엉뚱한 키(옛 `alpharium.jks` 등)가 비밀에 들어간 것. 서명 키가 바뀌면 덮어 설치가 끊기고 일기가 사라진다.
 */

export type Certificate = { owner: string; sha256: string };

export type SignerVerdict =
  | { ok: true; owner: string; sha256: string }
  | { ok: false; reason: string };

/** keytool이 찍는 SHA-256 지문 꼴: 대문자 16진수 32바이트, 콜론 구분 (총 95자) */
const FINGERPRINT = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/;

/** `keytool -printcert -jarfile` 출력에서 첫 서명자의 소유자와 SHA-256 지문을 읽는다. 못 읽으면 undefined */
export function parseCertificate(keytoolOutput: string): Certificate | undefined {
  // 둘째 인증서(체인) · 둘째 서명자부터는 보지 않는다 — 첫 서명자의 첫 인증서가 앱을 서명한 것이다
  const text = keytoolOutput.replace(/\r/g, "");
  const cut = text.search(/^(Certificate #2|Signer #2)/m);
  const first = cut === -1 ? text : text.slice(0, cut);
  const owner = /^Owner:[ \t]*(.+)$/m.exec(first)?.[1].trim();
  const sha256 = /^[ \t]*SHA256:[ \t]*([0-9A-Fa-f:]+)[ \t]*$/m.exec(first)?.[1].toUpperCase();
  if (!owner || !sha256) return undefined;
  return { owner, sha256 };
}

/** 기대 지문 파일에서 `#` 줄·빈 줄을 건너뛴 첫 줄을 지문으로 읽는다. 형식이 틀리면 undefined (뒤의 줄을 대신 쓰지 않는다) */
export function parseExpectedFingerprint(fileText: string): string | undefined {
  for (const raw of fileText.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const upper = line.toUpperCase();
    return FINGERPRINT.test(upper) ? upper : undefined;
  }
  return undefined;
}

/** 읽은 인증서를 기대 지문과 견줘 업로드해도 되는지 가른다. 건너뛰는 갈래가 없다 */
export function verifySigner(
  cert: Certificate | undefined,
  expected: string | undefined,
): SignerVerdict {
  if (cert === undefined) {
    return { ok: false, reason: "서명 인증서를 읽지 못했다 (서명이 없거나 keytool 출력을 해석하지 못함)" };
  }
  if (cert.owner.includes("CN=Android Debug")) {
    return { ok: false, reason: `debug 키로 서명되었다 (소유자: ${cert.owner})` };
  }
  if (expected === undefined) {
    return {
      ok: false,
      reason: "기대 지문이 없다 (scripts/android-release/upload-key.sha256 이 없거나 형식이 틀림)",
    };
  }
  if (cert.sha256 !== expected) {
    return {
      ok: false,
      reason: `서명 키의 지문이 기대와 다르다 (읽은 값: ${cert.sha256}, 기대 값: ${expected})`,
    };
  }
  return { ok: true, owner: cert.owner, sha256: cert.sha256 };
}

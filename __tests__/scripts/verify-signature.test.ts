/**
 * 076 — AAB 서명 인증서 판정(`scripts/android-release/verify-signature.ts`)의 계약 V1~V7.
 * 고정 문자열은 2026-10-11 로컬 JDK 17에서 일회용 키로 서명한 jar에 `keytool -J-Duser.language=en -printcert -jarfile`을
 * 돌린 실제 출력이다(줄 끝이 CRLF와 LF로 섞여 있다).
 */

import {
  parseCertificate,
  parseExpectedFingerprint,
  verifySigner,
} from "../../scripts/android-release/verify-signature.ts";

const FP =
  "73:2A:18:77:4F:3A:4D:35:ED:4A:F5:51:D4:42:5E:83:97:60:74:E4:44:A0:EA:5D:45:16:19:DA:32:11:6A:6E";
const OTHER_FP =
  "11:2A:18:77:4F:3A:4D:35:ED:4A:F5:51:D4:42:5E:83:97:60:74:E4:44:A0:EA:5D:45:16:19:DA:32:11:6A:6F";

function keytoolOutput(owner: string, sha256: string): string {
  return [
    "Signer #1:\r",
    "\r",
    "Certificate #1:\r",
    `Owner: ${owner}`,
    `Issuer: ${owner}`,
    "Serial number: ae5f592fb15e3b8f",
    "Valid from: Sun Oct 11 19:42:37 KST 2026 until: Wed Oct 21 19:42:37 KST 2026",
    "Certificate fingerprints:",
    "\t SHA1: FF:C8:87:96:27:19:70:34:15:83:80:66:D8:94:F5:9E:CF:EE:8F:91",
    `\t SHA256: ${sha256}`,
    "Signature algorithm name: SHA256withRSA",
    "Subject Public Key Algorithm: 2048-bit RSA key",
    "Version: 3\r",
    "\r",
  ].join("\n");
}

describe("076 서명 확인 판정", () => {
  describe("parseCertificate (V1)", () => {
    it("첫 서명자의 Owner와 SHA256을 읽는다 (CRLF·LF 혼합)", () => {
      expect(parseCertificate(keytoolOutput("CN=Test Upload, O=Test, C=KR", FP))).toEqual({
        owner: "CN=Test Upload, O=Test, C=KR",
        sha256: FP,
      });
    });

    it("서명자가 둘이어도 첫 번째만 읽는다", () => {
      const text =
        keytoolOutput("CN=First", FP) +
        "\n" +
        keytoolOutput("CN=Second", OTHER_FP).replace("#1", "#2");
      expect(parseCertificate(text)).toEqual({ owner: "CN=First", sha256: FP });
    });

    it("Owner나 SHA256이 없으면 undefined (서명 없음·읽기 실패·한국어 출력)", () => {
      expect(parseCertificate("")).toBeUndefined();
      expect(
        parseCertificate("keytool error: java.lang.Exception: Not a signed jar file"),
      ).toBeUndefined();
      expect(
        parseCertificate(keytoolOutput("CN=A", FP).replace("Owner:", "소유자:")),
      ).toBeUndefined();
      expect(
        parseCertificate(keytoolOutput("CN=A", FP).replace("SHA256:", "SHA512:")),
      ).toBeUndefined();
    });
  });

  describe("parseExpectedFingerprint (V2)", () => {
    it("# 줄과 빈 줄을 건너뛴 첫 줄이 형식에 맞으면 그것을 돌려준다", () => {
      expect(parseExpectedFingerprint(`# 업로드 키 SHA-256 (공개 값)\n\n${FP}\n`)).toBe(FP);
      expect(parseExpectedFingerprint(`${FP}\r\n`)).toBe(FP);
    });

    it("소문자는 대문자로 정규화한다", () => {
      expect(parseExpectedFingerprint(FP.toLowerCase())).toBe(FP);
    });

    it("비었거나 형식이 틀리면 undefined (길이·구분자·16진수·첫 유효 줄이 아닌 줄)", () => {
      expect(parseExpectedFingerprint("")).toBeUndefined();
      expect(parseExpectedFingerprint("# 주석만")).toBeUndefined();
      expect(parseExpectedFingerprint("TODO")).toBeUndefined();
      expect(parseExpectedFingerprint(FP.replace(/:/g, ""))).toBeUndefined();
      expect(parseExpectedFingerprint(FP.slice(0, -3))).toBeUndefined();
      expect(parseExpectedFingerprint(FP.replace("73", "ZZ"))).toBeUndefined();
      // 첫 유효 줄이 틀렸으면 뒤의 올바른 줄을 쓰지 않는다
      expect(parseExpectedFingerprint(`TODO\n${FP}`)).toBeUndefined();
    });
  });

  describe("verifySigner (V3~V7)", () => {
    const cert = { owner: "CN=Pocketlog Upload, O=A810, C=KR", sha256: FP };

    it("V3 인증서를 못 읽었으면 실패", () => {
      const r = verifySigner(undefined, FP);
      expect(r.ok).toBe(false);
    });

    it("V4 debug 키(CN=Android Debug)면 실패", () => {
      const r = verifySigner({ owner: "C=US, O=Android, CN=Android Debug", sha256: FP }, FP);
      expect(r.ok).toBe(false);
    });

    it("V5 기대 지문이 없으면(파일 없음·형식 오류) 실패 — 건너뛰지 않는다", () => {
      const r = verifySigner(cert, undefined);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/기대 지문/);
    });

    it("V6 지문이 다르면 실패하고 reason에 두 지문이 모두 있다", () => {
      const r = verifySigner(cert, OTHER_FP);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason).toContain(FP);
        expect(r.reason).toContain(OTHER_FP);
      }
    });

    it("V7 일치하면 owner와 지문을 돌려준다", () => {
      expect(verifySigner(cert, FP)).toEqual({ ok: true, owner: cert.owner, sha256: FP });
    });
  });
});

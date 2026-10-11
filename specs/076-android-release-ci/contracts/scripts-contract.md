# Contract: `scripts/android-release/` — 서명 확인과 Play 업로드

테스트(`__tests__/scripts/*.test.ts`)가 이 문서보다 나중이 아니라 같이/먼저 쓰인다. 판정·흐름은 순수 모듈(`.ts`), 파일·프로세스·환경변수를 만지는 것은 진입점(`.mts`)이다.

## 1. `verify-signature.ts` (순수)

```
parseCertificate(keytoolOutput: string): { owner: string; sha256: string } | undefined
parseExpectedFingerprint(fileText: string): string | undefined
verifySigner(cert: ReturnType<typeof parseCertificate>, expected: string | undefined): { ok: true; owner: string; sha256: string } | { ok: false; reason: string }
```

| ID | 규칙 |
| --- | --- |
| V1 | `parseCertificate`는 `keytool -printcert` 출력에서 첫 서명자의 `Owner:`와 `SHA256:` 줄을 읽는다. 둘 중 하나라도 없으면 `undefined` |
| V2 | `parseExpectedFingerprint`는 `#` 줄·빈 줄을 건너뛴 첫 줄이 `AA:BB:…`(대문자 16진수 32바이트, 콜론 구분)이면 그것을, 아니면 `undefined`. 소문자 입력은 대문자로 정규화 |
| V3 | `verifySigner`는 `cert`가 `undefined`이면 `{ok:false}`(서명 없음/읽기 실패) |
| V4 | `owner`가 `CN=Android Debug`를 포함하면 `{ok:false}` |
| V5 | `expected`가 `undefined`이면 `{ok:false}`(지문 파일 없음/형식 오류 — 건너뛰지 않는다) |
| V6 | `sha256 !== expected`이면 `{ok:false}`이고 `reason`에 두 지문을 모두 담는다(공개 값) |
| V7 | 그 밖은 `{ok:true}` |

진입점 `verify-signature.mts <aab> [<expected 파일>]`: `LC_ALL=C keytool -printcert -jarfile <aab>`를 실행해 위 함수로 판정한다. 통과하면 `owner`·`sha256`을 표준 출력에 한 줄씩 쓰고 종료 코드 0, 실패하면 `reason`을 표준 오류에 쓰고 1. 비밀을 다루지 않는다.
`--check-expected-only`(사전 점검용): 기대 지문 파일만 읽어 V2를 판정한다.

## 2. `play-upload.ts` (fetch·시계 주입)

```
type PlayDeps = { fetch: typeof fetch; now: () => number }
uploadBundle(args: { deps: PlayDeps; serviceAccountJson: string; packageName: string; track: string; aab: Uint8Array }): Promise<{ versionCode: number }>
```

호출 순서(P1): 토큰 교환 → `edits.insert` → `edits.bundles.upload` → `edits.tracks.update`(`track`, `releases: [{ versionCodes: [String(versionCode)], status: "completed" }]`) → `edits.commit`.

| ID | 규칙 |
| --- | --- |
| P1 | 위 순서로 정확히 한 번씩 부른다(트랙 이름은 인자 그대로, 진입점 기본값 `internal`) |
| P2 | JWT는 RS256, 클레임 `iss`=`client_email`, `scope`=`https://www.googleapis.com/auth/androidpublisher`, `aud`=`https://oauth2.googleapis.com/token`, `iat`=`now()/1000`, `exp`=`iat+3600`. 서명은 `crypto.createSign("RSA-SHA256")` |
| P3 | `bundles.upload`의 `Content-Type`은 `application/octet-stream`, 본문은 AAB 바이트 그대로 |
| P4 | 편집을 연 뒤의 어느 호출이든 실패하면 `edits.delete`를 부르고(그 실패는 삼킨다) 원래 오류를 던진다. `commit` 성공 뒤에는 부르지 않는다 |
| P5 | 서비스 계정 JSON이 JSON이 아니거나 `client_email`·`private_key`가 없으면 네트워크를 부르기 전에 던진다 |
| P6 | 던지는 오류의 메시지는 `HTTP <상태> <호출 이름>: <API 응답의 error.message 또는 error/error_description>`뿐이다. 서비스 계정 JSON·개인 키·JWT·액세스 토큰·응답 본문 전체를 어떤 경로로도 오류 메시지·`console` 출력에 넣지 않는다 |
| P7 | 응답의 `versionCode`가 정수가 아니면 던진다(트랙 갱신 전, 편집 폐기) |

진입점 `play-upload.mts --aab <경로> --package <패키지> [--track internal]`: `PLAY_SERVICE_ACCOUNT_JSON` 환경변수에서만 서비스 계정을 읽고(인자·파일 불가, 비어 있으면 종료 1), AAB를 읽어 `uploadBundle`을 부른다. 성공하면 `업로드 완료: versionCode N (트랙 internal)`만 쓴다.

## 3. 테스트가 잠그는 것 (소스 계약)

- `play-upload.ts`·`.mts`에 `console.log`·`console.error`·`process.stdout.write`로 `serviceAccountJson`·`private_key`·`access_token`·`assertion`을 넘기는 줄이 없다.
- `scripts/android-release/`의 어떤 파일도 `process.env`를 `PLAY_SERVICE_ACCOUNT_JSON` 외 비밀 이름으로 읽지 않는다. `.ts`(순수)는 `process.env`를 읽지 않는다.
- 외부 패키지를 import하지 않는다(`node:` 내장과 상대 경로만).

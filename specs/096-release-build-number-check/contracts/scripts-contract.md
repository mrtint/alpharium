# Contract: 번호 점검 스크립트

판정·흐름은 `.ts`(순수·주입), 파일·환경변수·종료 코드는 `.mts`다. 076/075와 같은 규칙: 새 의존성 없음, 비밀을 출력하지 않음, 오류는 `HTTP <상태> <호출>: <사유>` 또는 `네트워크 오류 <호출>` 꼴 하나.

## 1. `scripts/android-release/version-check.ts` (순수)

```
decideVersionCode(current: number, stored: number[]): VersionCodeVerdict   // data-model.md
describeVersionCode(args: { version: string; current: number; last: number | undefined; commit: string }): string
```

| ID  | 규칙                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `stored`가 비면 통과(`last: undefined`)                                                                                                                                                           |
| A2  | `current > max(stored)` 통과                                                                                                                                                                      |
| A3  | `current === max(stored)` 또는 `stored.includes(current)`이면 실패, `relation: "same"`, 메시지에 이번 번호·마지막 번호·`minimum`(= 마지막 + 1)과 「app.json의 expo.android.versionCode」를 말한다 |
| A4  | A3에 해당하지 않고 `current < max(stored)`이면 실패, `relation: "lower"`, 같은 필드                                                                                                               |
| A5  | `describeVersionCode`는 `버전 <v> · versionCode <n> · 커밋 <앞 7자> · 스토어 마지막 <m 또는 없음>` 한 줄                                                                                          |

## 2. `play-upload.ts` 추가

```
listBundleVersionCodes(args: { deps: PlayDeps; serviceAccountJson: string; packageName: string }): Promise<number[]>
```

| ID  | 규칙                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5  | 토큰 → `edits.insert` → `GET …/edits/{id}/bundles` → `edits.delete` 순서. 쓰기는 편집 생성·삭제뿐이고 `commit`·`bundles.upload`·`tracks.update`는 부르지 않는다                                                                                           |
| P6  | `bundles.list` 또는 이후 어느 단계가 실패해도 `edits.delete`를 부르고(그 실패는 삼킨다) 원래 오류를 던진다. 성공해도 `edits.delete`를 부른다                                                                                                              |
| P7  | 응답 `bundles`가 배열이 아니거나(없음 포함 → 번들이 하나도 없는 앱은 `bundles` 키가 빠질 수 있으므로 **키가 없으면 빈 배열**, 키가 있는데 배열이 아니면 실패) 항목의 `versionCode`가 정수가 아니면 `HTTP 200 bundles.list: 응답 형식이 다르다`로 실패한다 |
| P8  | 403이면 사유 뒤에 「(서비스 계정에 Play Console 앱 정보 보기·릴리스 보기 권한이 필요하다)」를 덧붙인다. 기존 `uploadBundle` 동작은 바뀌지 않는다(인증 도우미 추출만)                                                                                      |

## 3. `version-check.mts`

```
node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/android-release/version-check.mts \
  --app-json app.json --package com.a810labs.pocketlog --commit "$GITHUB_SHA"
```

- `PLAY_SERVICE_ACCOUNT_JSON`만 환경변수로 읽는다. `app.json`의 `expo.android.versionCode`·`expo.version`을 읽는다.
- 통과: 표준 출력에 A5 한 줄, 종료 0. 실패: 표준 오류에 `::error::<message>`, 종료 1.

## 4. `scripts/ios-release/build-number-check.ts` (순수)

```
decideBuildNumber(current: string, version: string, stored: string[]): BuildNumberVerdict
describeBuildNumber(args: { version: string; current: string; last: number | undefined; commit: string }): string
```

| ID  | 규칙                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I1  | 정수가 아닌 `stored`는 비교에서 빼고 `ignored`로 센다                                                                                                  |
| I2  | 비교 가능한 `stored`가 없으면 통과(새 버전)                                                                                                            |
| I3  | `current <= max` 실패(`current === max`는 same, 그 밖은 lower), 메시지에 버전 이름·이번 번호·마지막 번호·`minimum`·「app.json의 expo.ios.buildNumber」 |
| I4  | `ignored > 0`이면 메시지·통과 줄에 개수를 덧붙인다                                                                                                     |
| I5  | `describeBuildNumber`: `버전 <v> · 빌드 <n> · 커밋 <앞 7자> · 스토어 마지막 <m 또는 없음>`                                                             |

## 5. `testflight-notes.ts` 추가

```
listBuildNumbers(args: { deps: AscDeps; keyP8; keyId; issuerId; bundleId; version }): Promise<string[]>
```

| ID  | 규칙                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `apps`(번들 id) → `builds`(`filter[app]`·`filter[preReleaseVersion.version]`·`limit=200`)를 `links.next`가 없을 때까지 따라간다(최대 20쪽, 넘으면 실패). 읽기(GET)만 한다 |
| T2  | 앱을 못 찾으면 `앱을 찾지 못했다 (번들 id …)`로 실패. 항목의 `attributes.version`이 문자열이 아니면 건너뛰지 않고 `HTTP 200 builds: 응답 형식이 다르다`로 실패            |
| T3  | `links.next`는 `https://api.appstoreconnect.apple.com/` 로 시작할 때만 따라간다(다른 호스트로 토큰을 보내지 않는다)                                                       |
| T4  | 403이면 사유 뒤에 「(API 키 역할을 확인한다 — App Manager 이상)」을 덧붙인다                                                                                              |

## 6. `build-number-check.mts`

- `ASC_API_KEY_P8`·`ASC_KEY_ID`·`ASC_ISSUER_ID`만 환경변수로 읽고, `--app-json`·`--bundle`·`--commit` 인자를 받는다. 출력 규칙은 3과 같다.

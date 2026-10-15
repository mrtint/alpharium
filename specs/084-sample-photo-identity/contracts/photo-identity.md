# Contract: 사진의 정체와 썸네일 변형 (084)

대상: `scripts/e2e-sample/{catalog,commons,fetch,plan}.ts`, `scripts/sample-fetch.mts`, `photos.json`. 검사: `__tests__/e2e-sample/{catalog,commons,fetch,plan}.test.ts`.
070 계약의 C-1·F-2·F-5·P-4를 아래로 대체한다.

## 목록 (catalog) — 070 C-1 대체

- **I-1** 각 항목의 `sha256`은 배열이고, 원소는 소문자 hex 64자, 중복이 없고, 1개 이상이다. 기록 모드(`allowEmptyHashes`)에서만 빈 배열을 허용한다.
- **I-2** 각 항목의 `originalSha1`은 소문자 hex 40자다. 기록 모드에서만 `""`를 허용한다.
- **I-3** 저장소의 `photos.json` 210개 항목이 I-1·I-2를 기록 모드 없이 통과한다(사진 수·태그 규칙 C-4·C-5는 그대로).

## 원본 조회 (commons) — 순수 + 실제 통로

- **O-1** `titleOf(sourcePage)`는 `/wiki/` 뒤를 디코드한 `File:` 제목을 준다. `File:`로 시작하지 않으면 `null`.
- **O-2** `originalApiUrl(title)`은 `commons.wikimedia.org/w/api.php`에 `action=query`·`format=json`·`prop=imageinfo`·`iiprop=sha1|size|timestamp`·`titles`를 싣는다.
- **O-3** `parseOriginal(json)`은 첫 페이지의 `imageinfo[0]`에서 `sha1`(40 hex)·`width`·`height`(양의 정수)·`timestamp`(ISO 문자열 — 그 판이 올라온 시각)를 읽는다. 페이지 없음(`missing`)·`imageinfo` 없음·모양 이상은 `{ ok: false }`(던지지 않는다).
- **O-4** `jpegSize(bytes)`는 JPEG의 SOF 세그먼트에서 폭·높이를 읽는다. JPEG가 아니거나 SOF가 없으면 `null`.
- **O-5** `looksLikeThumbnail(bytes, widthPx, original)`은 O-4의 폭 = `widthPx`이고 `|높이 − round(original.height / original.width × widthPx)| ≤ 1`일 때만 참.
- **O-6** 실제 조회 통로는 내려받기와 같은 UA를 싣는다.

## 내려받기 (fetch) — 070 F-2·F-5 대체

- **V-1** 받은(또는 캐시에 있는) 바이트의 sha256이 `sha256[]`에 있으면 원본 조회 없이 받아들인다(F-1 그대로).
- **V-2** 캐시 파일의 해시가 `sha256[]`에 없으면 지우고 다시 받는다.
- **V-3** 받은 해시가 `sha256[]`에 없으면 원본을 조회한다. 조회 성공 + `sha1 == originalSha1` + O-5 참일 때만: 캐시에 두고, `sha256[]`에 덧붙이고(중복 없이), `accepted`에 파일명을 넣는다.
- **V-4** 조회 실패·`sha1 ≠ originalSha1`·O-5 거짓이면 파일을 남기지 않고 `{ ok: false }`(이유에 파일명; sha1이 다르면 두 값의 앞 12자).
- **V-5** 기록 모드: `originalSha1`이 빈 항목은 먼저 원본을 조회해, `timestamp`의 날짜(UTC `YYYY-MM-DD`)가 `checkedOn` 이하일 때만 채운다(조회 실패·날짜가 뒤면 실패, 이유에 파일명). 한 실행 안에서 같은 사진의 조회 결과는 V-3에서 다시 쓴다(두 번 조회하지 않는다). 그 뒤 V-1~V-4를 탄다(빈 `sha256[]`은 V-3을 탄다). 이미 채워진 `originalSha1`은 바꾸지 않는다. 기록 모드가 아니면 빈 값은 목록 검사(I-1·I-2)에서 이미 실패한다.
- **V-6** 원본 조회도 요청 간격(앞에 요청이 있었으면 `REQUEST_INTERVAL_MS`)과 429 백오프(최대 3회)를 탄다. 네트워크는 주입된 `fetchBytes`·`lookupJson`으로만.
- **V-7** 결과의 `changed`는 덧붙인 해시나 채운 원본 sha1이 하나라도 있으면 참이다.

## 진입점 (`sample-fetch.mts`)

- **W-1** `ok && changed`일 때만 `photos.json`을 쓴다(실패한 실행은 쓰지 않는다 — FR-006). 기록 모드 여부와 무관하다.
- **W-2** `accepted`의 파일마다 「새 썸네일 변형을 받아들였다: <파일>」 한 줄을 출력한다.

## 지문 — 070 P-4 대체

- **P-4'** `fingerprint(items, catalog)`의 사진 값은 `originalSha1`이다. `sha256[]`만 다른 두 목록은 같은 지문, `originalSha1`이 다르면 다른 지문.

# Research: 084 표본 사진의 정체

## R1. 바이트가 왜 다른가 (실측 2026-10-15, 맥)

- **Decision**: 썸네일 해시는 「사진의 정체」로 쓸 수 없다 — 원본 sha1을 정체로 쓴다.
- **Rationale**: 같은 URL을 `curl --resolve upload.wikimedia.org:443:<엣지 IP>`로 엣지를 바꿔 받았다. codfw(208.80.153.240)·ulsfo 엣지는 목록과 같은 바이트(Last-Modified
  2026-10-10 05:51 — 목록 작성일), eqiad(208.80.154.240)·eqsin·esams·drmrs·magru 엣지는 다른 바이트(Last-Modified 2026-08-03 등). 어긋난 15장 모두 codfw = 목록,
  eqiad = 다름. 원본은 15장 모두 2024-04-30 이전 마지막 올림, 받은 크기가 원본 비율과 맞는다. 썸네일은 데이터센터마다 따로 만들어 둔 것이고 어느 쪽이 오는지는
  엣지(사용자의 네트워크 위치)가 정한다.
- **Alternatives**: 맥 값으로 다시 기록(반대쪽 기계가 깨짐), 허용 해시 배열만(셋째 변형에 다시 멈춤), 원본 URL(약 700MB·EXIF 방향 손실·심기 지연) — 설계문서 「기각한 안」.

## R2. 원본 sha1을 어떻게 읽는가

- **Decision**: `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=sha1%7Csize%7Ctimestamp&titles=<제목>` — 제목은 `sourcePage`의
  `/wiki/` 뒤를 `decodeURIComponent`한 값(`File:…`). 응답 `query.pages.<id>.imageinfo[0]`의 `sha1`(40 hex)·`width`·`height`·`timestamp`(최신 판이 올라온 시각 — 기록 모드에서 `checkedOn` 이하인지 본다: 채운 sha1이 목록 작성자가 본 사진을 가리킨다는 근거. brainstorming 실측에서 15장 모두 최신 판이 2024-04-30 이전). 페이지에 `missing`이 있거나
  `imageinfo`가 없으면 「확인할 수 없음」. 리다이렉트는 따라가지 않는다(이름이 바뀐 파일은 사람이 본다).
- **Rationale**: brainstorming 탐색에서 같은 질의(`iiprop=timestamp|sha1|size…`)로 15장 모두 값을 받았다. `sha1`은 MediaWiki가 원본 파일에 대해 저장하는 값이고
  원본이 다시 올라오면 바뀐다.
- **Alternatives**: 제목 50개씩 묶음 조회(최초 채우기 4분 → 수 초) — 코드가 늘고(묶음 응답의 제목 정규화 대응) 한 번뿐인 비용이라 고르지 않았다(YAGNI).
  원본 파일을 받아 직접 sha1 계산 — 수 MB씩 받아야 한다.

## R3. 받은 바이트가 그 원본의 썸네일인가 (clarify Q1)

- **Decision**: JPEG(SOI `FF D8`)이고, SOFn 마커의 폭 = 목록 `widthPx`, 높이 = `round(원본 높이 / 원본 폭 × widthPx)`와의 차가 1 이하.
- **Rationale**: 실측 15장: 원본 비율로 계산한 높이 540.0·640.1·640.0·717.0·637.6·720.0·720.0·720.0·640.0·720.0·641.0·540.2·536.3·637.8·540.4, 받은 높이
  540·640·640·717·638·720·720·720·640·720·641·540·536·638·540 — 모두 ±1 안. JPEG 크기는 SOF0~SOF15(`C4`·`C8`·`CC` 제외) 세그먼트의 높이(2바이트)·폭(2바이트).
- **Alternatives**: 픽셀 디코딩 대조 — 새 의존성이 필요하다.

## R4. 목록 파일은 누가 언제 쓰는가

- **Decision**: `fetchCatalog`는 갱신된 목록과 `changed`(덧붙인 해시·채운 원본 sha1이 있었는가)·`accepted`(받아들인 변형의 파일명 목록)를 돌려주고, `sample-fetch.mts`가
  `ok && changed`일 때만 `photos.json`을 쓴다. 기록 모드 여부와 무관하다.
- **Rationale**: FR-006 — 실패한 실행은 목록을 바꾸지 않는다. 쓰기를 진입점 한 곳에 두면 `fetch.ts`는 파일 시스템의 목록 경로를 모른다(지금도 그렇다).

## R5. 지문

- **Decision**: `fingerprint()`의 사진 값 = `originalSha1`.
- **Rationale**: FR-010. 원본 sha1은 기계·엣지와 무관하다. 바꾼 직후 기기 표식의 지문이 달라져 한 번 다시 심긴다(정상).

## R6. 조회 간격

- **Decision**: 원본 조회도 썸네일 요청과 같은 간격 규칙(앞에 요청이 있었으면 1.1초)과 429 백오프를 탄다. 조회 통로는 `{ status, json }`을 돌려주는 주입 함수.
- **Rationale**: FR-009, Wikimedia API 정책. 같은 주입 방식이라 테스트가 호출 순서·간격을 센다.

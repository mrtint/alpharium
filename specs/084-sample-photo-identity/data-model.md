# Data Model: 084

## 목록 항목 (`CatalogPhoto`, `photos.json`의 한 칸)

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `file` | string | 070 그대로 |
| `url` | string | 070 그대로(`https://upload.wikimedia.org/`) |
| `sha256` | **string[]** | 받아들인 썸네일 변형. 각 원소 소문자 hex 64자, 중복 없음, 1개 이상. 기록 모드에서만 `[]` 허용. **이름은 그대로 두고 타입만 배열로** — 070 문서·스크립트가 쓰는 낱말을 유지한다 |
| `originalSha1` | string | **새 필드.** Commons 원본 sha1, 소문자 hex 40자. 기록 모드에서만 `""` 허용. 도구가 덮어쓰지 않는다 |
| `license`·`sourcePage`·`checkedOn`·`tags`·`widthPx` | — | 070 그대로 |

필드 순서(JSON 직렬화): `file`, `url`, `sha256`, `originalSha1`, `license`, `sourcePage`, `checkedOn`, `tags`, `widthPx`.

이전(한 번): `sha256: "<hex>"` → `sha256: ["<hex>"]`, `originalSha1: ""` → 기록 모드로 채움 → 15장에 맥(eqiad) 변형이 덧붙음.

## 원본 조회 결과 (`OriginalLookup`)

```text
{ ok: true, sha1: string(40 hex), width: number, height: number, timestamp: string /* 최신 판이 올라온 시각(ISO) */ }
{ ok: false, reason: string }   // HTTP 오류·형식 이상·페이지 없음·imageinfo 없음·예외
```

## 내려받기 결과 (`FetchResult`)

```text
{ ok: true, photos: CatalogPhoto[], downloaded, cached, accepted: string[] /* 새 변형을 받아들인 파일 */, changed: boolean }
{ ok: false, reason: string }
```

## 표식 지문

070 data-model의 정의에서 「catalog sha256」 → 「catalog originalSha1」. 나머지 그대로.

# Data Model: 모델·오픈소스 라이선스 고지

저장되는 데이터는 없다. 페이지와 앱이 공유하는 값만 정의한다.

## 1. 고지 항목 (사이트 `<section data-license="…">`)

| 필드 | 설명 | 필수 |
|------|------|------|
| `data-license` | 식별자: `kanana`·`lfm`·`llama-cpp`·`llama-rn` (이 순서) | 예 |
| 이름 | 제목(`<h2>`) | 예 |
| 저작권자 | "Copyright …" 줄 또는 원문이 밝히는 라이선서 | 예 |
| 라이선스 이름 | 예: "Apache License 2.0", "LFM Open License v1.0", "MIT License" | 예 |
| 원문 링크 | 원문 주소(`<a href>`) | 예 |
| 확인일 | `data-checked="2026-10-22"` | 예 |
| 전문 | `<pre>`(클래스 없음), 원문 파일과 글자 동일 | 예 |
| 하위 블록 | `llama-cpp`만: 서드파티 `<section data-bundled="…">` 다섯 | 해당 시 |

`lfm` 항목은 본체와 mmproj 파일 둘이 같은 라이선스에 속한다는 문장을 가진다.

## 2. 고지 주소

`LICENSES_URL = "https://mrtint.github.io/alpharium/licenses/"` — `src/app/policy-links.ts`에만 정의, 끝의 `/`까지 사이트 경로 `site/licenses/index.html`과 짝.

## 3. 원문 파일 (`sources/`)

| 파일 | 대응 항목 |
|------|-----------|
| `kanana-LICENSE.txt` | `kanana` |
| `lfm-LICENSE.txt` | `lfm` |
| `llama-cpp-LICENSE.txt` | `llama-cpp` |
| `llama-rn-LICENSE.txt` | `llama-rn` |
| (구현 단계) `bundled-*.txt` | `llama-cpp`의 하위 블록 다섯 (`opencl-headers`는 헤더 고지 NOTICE, 나머지는 라이선스 전문) |

## 4. 앱 문구 (`licenseLinks`)

`{ row: "오픈소스 라이선스" }` — 모델 식별자 없음. 실패 한 줄은 기존 `policyLinks.openFailed(url)`을 쓴다.

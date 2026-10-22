# Research: 모델·오픈소스 라이선스 고지

확인일 2026-10-22. 원문은 `sources/`에 있다.

## R1 — 원문과 해시

| 파일 | 출처 | SHA-256 |
|------|------|---------|
| `sources/lfm-LICENSE.txt` | `https://huggingface.co/LiquidAI/LFM2.5-VL-450M/raw/main/LICENSE` | `4d28ca14dedc0b3d0fcc2b3339f0e79931faa33874f3d24f522183a8fc70068c` |
| `sources/kanana-LICENSE.txt` | `https://huggingface.co/kakaocorp/kanana-1.5-2.1b-instruct-2505/raw/main/LICENSE` | `d1ee81266b96305cdec883e60fad804aa1d04b4698dccb5942ca51816b10df57` |
| `sources/llama-cpp-LICENSE.txt` | 설치본 `node_modules/llama.rn/cpp/LICENSE`(llama.rn 0.12.9) | `e562a2ddfaf8280537795ac5ecd34e3012b6582a147ef69ba6a6a5c08c84757d` |
| `sources/llama-rn-LICENSE.txt` | `https://raw.githubusercontent.com/mybigday/llama.rn/main/LICENSE` = 설치본 `LICENSE` | `b22eff2c123a71b45b110a2933dd8a4360e119d38dbb8fd2dcf3a85627712883` |

- **Decision**: 전문은 이 파일 그대로(줄 끝 LF)를 `<pre>`에 싣는다.
- **Rationale**: 요약이 아니라 받은 원문이 정본이어야 "원문 그대로" 의무를 증명할 수 있다.
- **Alternatives**: 한국어 번역 병기(clarify에서 기각), 링크만 걸고 전문 생략(라이선스가 사본 제공을 요구 — LFM 4(a)).

## R2 — llama.cpp는 번들 쪽 글자를 정본으로

상류 `master`의 LICENSE는 "2023-2026", 앱이 싣는 `llama.rn@0.12.9`의 `cpp/LICENSE`는 "2023-2024"이고 다른 글자는 같다. **앱이 싣는 것은 번들이다.** → 번들 글자를 정본으로 하고, `llama.rn` 버전이 오르면 계약 테스트(LP6)가 번들 파일과 `sources/`의 불일치로 실패해 고지를 다시 보게 한다.

## R3 — llama.rn이 함께 싣는 서드파티 (H4)

`node_modules/llama.rn@0.12.9` 소스에서 확인:

| 코드 | 라이선스 | 저작권 | 전문 출처 |
|------|----------|--------|-----------|
| nlohmann/json 3.12.0 (`cpp/nlohmann/json.hpp`) | MIT | 2013-2025 Niels Lohmann | 헤더에는 SPDX 줄만 있다 → 상류 `LICENSE.MIT`(v3.12.0 태그)를 받아 `sources/`에 둔다 |
| anyascii (`cpp/anyascii.h`) | ISC | 2020-2023 Hunter WB | 헤더 주석 전문 |
| stb_image (`cpp/tools/mtmd/stb/stb_image.h`) | MIT(대안 A) 또는 공공 영역(대안 B) | 2017 Sean Barrett | 파일 끝 전문 |
| miniaudio 0.11.25 (`cpp/tools/mtmd/miniaudio/miniaudio.h`) | 공공 영역 또는 MIT-0 | David Reid | 파일 끝 전문 |
| OpenCL-Headers (`third_party/OpenCL-Headers`) | Apache-2.0 | 2008-2021 Khronos Group | 헤더 고지 원문 + Apache 2.0 원문 링크(본문은 Kanana 항목의 Apache 2.0 전문 참조) |

- **Decision**: llama.cpp 항목의 하위 블록으로 싣는다(항목 수는 넷 유지). 헤더에 전문이 있는 것은 그 글자 그대로, nlohmann은 상류 파일을 받는다.
- **Rationale**: 번들된 코드의 MIT/ISC 고지 의무를 지키되, 사용자 눈에는 "llama.cpp 계열 하나"로 보이게 한다.
- **Open**: 이것으로 충분한지는 소유자 확인(H4). 오디오·OpenCL이 실제 빌드에 컴파일되는지는 이 과제에서 재지 않는다 — 번들되어 배포되는 소스를 기준으로 안전하게 싣는다(Constitution V: 컴파일 여부는 미확인으로 표시).
- **Alternatives**: 항목을 다섯 이상으로 늘림(페이지 구성이 복잡), 전문 생략하고 링크만(MIT 사본 요구 못 채움).

## R4 — LFM 라이선스의 요점 (소유자가 원문을 읽는다)

`sources/lfm-LICENSE.txt` 원문에서 확인한 조항만 적는다(해석은 H1·H2).

- 4(a) 사본 제공, 4(b) 수정 표시, 4(c)(d) 고지 유지.
- 1절 Threshold: 연 매출 1,000만 달러 이상, 5절 상업적 이용 조건.
- **Decision**: 페이지는 전문을 그대로 싣고 요약·해설을 붙이지 않는다. 조건에 대한 판단은 H1·H2로 소유자에게 올린다.

## R5 — Kanana

원 저장소(`kakaocorp/kanana-1.5-2.1b-instruct-2505`)에 `LICENSE`(Apache 2.0 본문 마크다운 형)가 있다. 사용하는 GGUF는 DevQuasar 재배포본이며 HF 메타데이터에 라이선스 표기가 없다. **Decision**: 정본은 원 저장소의 LICENSE, 재배포자는 출처 줄에 적는다. 저작권자 줄(Kakao Corp.)은 모델 카드/원 저장소 표기를 구현 단계에서 확인해 그대로 옮긴다(미확인이면 쓰지 않고 H3로 올린다).

## R6 — 페이지 구조와 테스트 방식

- 086 방침 페이지와 같은 정적 구조(`<main class="page doc">`, 토큰·서체·`site.css`). 항목마다 `<section data-license="kanana|lfm|llama-cpp|llama-rn">`, 전문은 `<pre class="license-text">`(HTML 이스케이프).
- 테스트는 086처럼 정규식으로 읽는다(HTML 파서 의존 없음). 전문 대조는 `<pre>`의 내용을 HTML 엔티티 복원 후 `sources/`와 비교한다.
- `.doc`용 `pre` 스타일이 `site.css`에 없으면 같은 파일에 `pre.license-text` 규칙만 더한다(줄바꿈 유지·가로 스크롤 금지).

## R7 — 앱 쪽 선례 확인

- `src/app/policy-links.ts`가 주소 정의의 유일한 자리이며 086 L5가 `src/`에서 사이트 도메인이 나오는 파일을 그 하나로 잠근다 → `LICENSES_URL`도 거기에 둔다.
- `App.tsx`의 `openLink(kind, url)`·`linkFailed`를 확장한다. 설정 화면(`SettingsScreen`)은 주소를 모르고 콜백만 받는다.
- 「정보」 묶음의 행 순서는 버전 · 방침 · 지원 · 서체 라이선스 · (개발자). 새 행은 서체 라이선스 다음, 개발자 앞.
- 문구는 `lazyText`로 평가하고 골든 `ADDED_AFTER_GOLDEN`에 올린다.

## R8 — 배포 순서

`site/**` 푸시는 `main` 머지 후 `pages.yml`이 배포한다. 새 행의 주소는 앱 릴리스 전에 배포돼 있어야 한다. 이 과제의 PR이 머지되면 사이트가 먼저 나가고, 앱 업로드는 소유자가 따로 한다.

# Contract: 고지 페이지 (`site/licenses/index.html`)

테스트: `__tests__/privacy/license-page.test.ts`(로직 프로젝트), 보조로 `site-pages.test.ts`의 S2·S3·S6이 이 페이지를 `PAGES`에 포함해 돈다.

| ID | 계약 |
|----|------|
| LP1 | `site/licenses/index.html`이 있다. `<html lang="ko">`·charset·viewport·`<title>`을 가진다 |
| LP2 | 외부 자원 0 — 스크립트 없음, 스타일시트는 상대 경로(`../assets/…`)만, 외부 `src` 없음 (086 S3) |
| LP3 | `data-license` 값이 `kanana`·`lfm`·`llama-cpp`·`llama-rn` 순서대로 정확히 한 번씩 있다 |
| LP4 | 각 항목에 `<h2>` 이름, 저작권자 줄(원문이 밝히는 표기. 원문에 표기가 없으면 「원문에 저작권자 표기가 없음」이라고 적는다), 라이선스 이름, 원문 링크(`https://`), `data-checked="2026-10-22"`가 있다. `kanana` 항목은 재배포본(DevQuasar GGUF)의 출처를 한 줄로 적는다 |
| LP5 | 각 항목에 `<pre class="license-text">`가 하나 있고, HTML 엔티티를 풀어 줄 끝을 LF로 맞춘 내용이 `specs/101-license-notice/sources/<항목>-LICENSE.txt`와 글자까지 같다 |
| LP6 | `sources/llama-cpp-LICENSE.txt`와 `sources/llama-rn-LICENSE.txt`는 `node_modules/llama.rn/cpp/LICENSE`·`LICENSE`와 같다(`llama.rn`이 올라 고지가 낡으면 실패) |
| LP7 | 네 원문 파일의 SHA-256이 `research.md` R1의 값과 같다(원문 교체 탐지) |
| LP8 | `llama-cpp` 항목은 `data-bundled`가 `nlohmann-json`·`anyascii`·`stb-image`·`miniaudio`·`opencl-headers` 순서로 다섯 하위 블록을 가지고, 각 블록에 이름·저작권자·라이선스 이름·전문이 있고, 전문(`<pre>`)은 `sources/bundled-*.txt`와 글자까지 같으며 그 파일의 SHA-256이 `research.md` R3의 값과 같다. `opencl-headers` 블록은 헤더 고지 원문(`bundled-opencl-headers-NOTICE.txt`)과 Apache 2.0 원문 링크를 두고, 본문은 `kanana` 항목의 Apache 2.0 전문을 가리킨다고 적는다 |
| LP9 | `lfm` 항목에 "본체와 mmproj 파일" 두 파일이 같은 라이선스에 속한다는 문장이 있다. 요약·해설로 조건을 줄이는 문장은 없다(전문이 정본) |
| LP10 | 자리표시자(`{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}`) 없음. `site/index.html`에 이 페이지로 가는 링크가 있고 지원 페이지 FAQ·방침 본문은 이 과제가 바꾸지 않는다(099 문장 불변) |

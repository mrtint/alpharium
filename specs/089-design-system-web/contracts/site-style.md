# Contract: 사이트 스타일과 마크업

## 링크 (세 페이지 공통)

각 HTML의 `<head>`에 정확히 이 순서로 셋(상대 경로, 페이지 깊이에 맞춰 `assets/…` 또는 `../assets/…`):

```html
<link rel="stylesheet" href="…/assets/tokens.css">
<link rel="stylesheet" href="…/assets/fonts.css">
<link rel="stylesheet" href="…/assets/site.css">
```

- L1. 세 링크만 스타일시트다. `<style>` 블록·`style="…"` 속성·`<script>`·`@import`·`http(s)` 주소의 `<link>`/`src`가 없다.
- L2. 086이 정한 마크업 계약은 그대로다: `lang="ko"`, `charset`, `viewport`, `title`, 절 `id`, `data-outbound`, 근거 주석, 자리표시자, 문장.
- L3. 구조를 위한 클래스는 `site.css`가 정의한 것만 쓴다(아래). 새 요소를 더하지 않는다 — 기존 요소에 `class`만 붙인다. 문장 추가·삭제 없음(FR-012).

## `site.css`

- S1. 색은 `var(--color-*)`, 서체는 `var(--font-sans)`, 글자 크기·굵기·행간은 `var(--text-*)`, 반경은 `var(--radius-*)`, 여백·간격은 `var(--space-*)`(또는 그 `calc()` 정수배·`0`·`auto`)만 쓴다. 16진수·`rgb()`·`hsl()`·`font-family`(대체 서체 목록)·px 간격 리터럴이 없다.
- S2. 글자 색에 `accent`를 쓰지 않는다(링크·강조는 `danger`, FR-007). `accent`는 배경·표식에만 쓸 수 있다.
- S3. 포커스 가능한 요소는 `:focus-visible`에서 `--color-text` 2px 윤곽이 보인다.
- S4. 레이아웃: 본문 최대 폭(읽기 폭), 좌우 여백은 휴대폰 폭에서도 `var(--space-16)` 이상, 320px에서 가로 스크롤 없음(긴 낱말은 줄바꿈 허용 — 086의 `overflow-wrap`·`word-break: keep-all` 의도 유지).
- S5. 다크는 `tokens.css`가 변수 값을 바꾸므로 `site.css`에 `prefers-color-scheme` 분기가 없다.

## 공용 클래스 (이름은 `DESIGN.md`가 설명하고 G8이 실재를 잠근다)

`.page`(본문 컨테이너) · `.doc`(긴 글 타이포: h1/h2/h3/p/ul/li/a) · `.meta`(보조 줄) · `.summary`(한 줄 요약 상자 — `surface` 면) · `.section`(절 구분: 위 구분선 + 간격) · `.links`(링크 목록).
방침의 `<section id=…>`, `data-outbound` 절은 `.section`으로 스타일하며 속성 선택자를 쓰지 않는다.

## 위반 주입 (G5가 잡아야 하는 것)

- HTML에 `<style>` 한 줄 · `style="color:#fff"` · `<link href="https://…">`
- `site.css`에 `#fff`·`color: rgb(…)`·`font-family: Arial`·`padding: 13px`·`color: var(--color-accent)`(글자 색)

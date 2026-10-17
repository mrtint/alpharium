# Research: 디자인 시스템 기반과 웹 재디자인

조사일 2026-10-18. 표시: **[실측]** 이 세션에서 직접 잰 것, **[코드]** 소스에서 읽은 것, **[문서]** 배포처 문서, **[짐작]** 확인 못 한 것.

## R1 — 간격 스케일 (FR-001a)

**조사**: `src/ui/`의 `padding|margin|gap` 계열 정수 리터럴과 tailwind 간격 클래스(`p-4` 등) 빈도 **[실측, 정규식 1차 조사 — 구현 때 `scripts/design/`이 아니라 일회성 명령으로 다시 세어 표를 산출물에 남긴다]**.

| 값 | 8 | 12 | 10 | 16 | 20 | 24 | 4 | 6 | 2 | 3 | 14 | 18 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 횟수 | 15 | 15 | 11 | 11 | 11 | 11 | 9 | 8 | 5 | 3 | 3 | 2 |

**재집계 [실측, 2026-10-18 구현 때]**: `padding|margin|gap|rowGap|columnGap`(+`Top|Bottom|Left|Right|Horizontal|Vertical|Start|End`)의 정수 리터럴을 `src/ui/`·`App.tsx`에서 세었다 — 위 표가 그 값이고(24가 10 → 11로 정정) 「9회 이상」 결과는 **4·8·10·12·16·20·24로 1차 조사와 같다**(소유자 확인 게이트 불필요). 그 밖: 0이 3회, 32가 1회. tailwind 간격 클래스는 세 번뿐이다.

(그 밖: 70·44·104 등은 화면 고유 치수라 간격 스케일 후보가 아니다. tailwind 간격 클래스는 두 곳뿐이다.)

**결정**: 스펙 정책(clarify)대로 「자주 쓰는 값만」. 기준을 **사용 9회 이상**으로 정하면 **4·8·10·12·16·20·24** 일곱 단계다(6은 8회로 한 끗 아래). 단계 이름은 값이 곧 이름이다(`space-4`…). 구현 때 재집계가 이 목록과 다르면 표를 갱신하고 소유자 확인 게이트를 둔다(tasks).
**근거**: 새 배수 체계를 만들어 앱에 강요하지 않고(범위 밖), 웹이 앱의 실제 리듬을 따른다.
**기각**: 4px 배수 스케일 신설(앱과 다른 체계), 간격 미포함(웹 여백 기준 부재).
**웹에서 24보다 큰 간격**은 단계의 정수배(`calc(var(--space-24) * 2)`)로만 만든다(contracts/site-style.md).

## R2 — 웹 서체 (FR-009·FR-010·FR-010a)

**조사 [실측]**:
- GitHub 릴리스 zip(`Pretendard-1.3.9.zip`, sha256 `04be351a…c428a` — 앱 `source.json`과 같은 파일)의 웹 배포는 `web/static/woff2`(굵기당 약 0.77MB, 한글 전체)와 `web/static/woff2-subset`(굵기당 약 0.27MB)뿐이고 **분할 배포본이 없다**.
- npm 패키지 `pretendard@1.3.9`(레지스트리 `dist.integrity` `sha512-PaQAADyLY5v4kYFwkpSJHbSSYIkiriY/1xXw75TKoZ9UQQqeU+tvP05yTdZAWibiIYoo8ZKtRv8PM7w0IaywSw==`)의 `dist/web/static/woff2-dynamic-subset/`에 굵기당 92개 조각이 있고 굵기별 CSS(`Pretendard-Regular.css` 등)에 `unicode-range`와 `font-display: swap`이 이미 있다.
- 현재 방침 페이지(글자 279종)가 요구하는 조각은 굵기당 **17개, 약 196KB** → 400·600·700 세 굵기 **약 588KB**(1MB 상한의 59%). 세 페이지를 합친 글자 집합으로도 조각 수가 같은 규모(재측정은 G7 테스트가 한다).
- 사이트에 두는 파일은 3 굵기 × 92 = 276개, 약 3.9MB.

**결정**: npm `pretendard@1.3.9`의 `woff2-dynamic-subset` 중 **400·600·700**을 바이트 그대로 복사한다. 굵기는 본문 400, 제목·강조 600, 큰 제목 700 — 앱이 쓰는 `FONT.weights`(400~800)의 부분집합이다. 가져오기는 `import-pretendard-web.mts`가 하며 tarball의 `integrity`를 확인하고 파일별 sha256을 `source.json`에 남긴다. `fonts.css`는 배포처 굵기별 CSS에서 `src`를 woff2 한 줄로만 고치고 `unicode-range`·`font-weight`·`font-display`는 그대로 둔 것이다(선언만 다시 쓰고 글꼴 파일은 변환하지 않으므로 OFL상 수정이 아니다 — 083과 같은 선).
**버전**: 앱(GitHub zip OTF)과 같은 v1.3.9다. 두 배포는 같은 릴리스의 다른 포장이고 글리프 동일성은 **[짐작]**(배포처 설명) — 캡처에서 앱·웹 글자 모양을 눈으로 대조한다.
**기각**: GitHub zip의 `woff2`(굵기당 0.77MB × 3 = 2.3MB, 상한 초과), `woff2-subset`(굵기당 0.27MB × 3 = 0.8MB이나 KS X 1001 밖 음절이 대체 서체로 떨어져 방침의 일부 낱말 모양이 달라질 수 있음 **[짐작]**), CDN(방문자 IP 제3자 전송), 가변 서체(웹 가변 woff2도 굵기 하나보다 큼).
**사이트 용량 상한 방식**: 페이지 텍스트의 글자 집합 × `fonts.css`의 `unicode-range` → 필요한 조각 파일 크기의 합 × 선언된 굵기. 브라우저는 실제로 쓰이는 굵기·글자 구간만 받으므로 이것이 상한 쪽 추정이다(선언한 세 굵기를 모두 쓴다고 본다).

## R3 — 정본 모양 (FR-001·FR-004)

**결정**: `design/tokens.json` 한 파일. 최상위 `color`·`radius`·`type`·`font`·`space`·`contrast`. 항목마다 `note`(왜 이 값인지 — 생성 영역의 문서 주석이 된다). 색은 `{light, dark}`. 글자 역할에 `platforms`가 없으면 앱·웹 공용, `["web"]`이면 웹 전용(`display`·`reading` — 앱 `TYPE`의 여섯 키를 바꾸지 않으려는 장치). 웹 전용 역할의 값은 구현에서 정하되 초안은 `display` 32/40/700, `reading` 17/30/400이다 **[사람이 정하는 값, 캡처를 보고 소유자가 확정]**.
**기각**: W3C 토큰 형식(clarify에서 결정).

## R4 — 앱 생성물의 자리 (FR-003)

**조사 [코드]**: `__tests__/theme-tokens.test.ts`는 `tokens.ts` 소스를 읽어 「COLORS를 `const`로 선언」·「값이 리터럴」·「키 정확히 9개」·「`COLORS_DARK`·`darkColors` 없음」·「TYPE 6개 역할」을 단언하고, `__tests__/config/font-rules.test.ts`는 `tokens.ts`가 `fontFamily`를 `FONT.family`로만 정한다고 단언한다. 파일을 나누면 이 소스 단언들을 새 파일로 옮겨야 한다.
**결정**: `tokens.ts`는 그대로 두고 **표식 두 줄 사이**(`// <design-tokens:generated>` … `// </design-tokens:generated>`)에 `COLORS`·`RADIUS`·`TYPE`·`FONT` 블록을 생성한다. 블록 모양은 현재와 같고(`export const … = {…} as const`, 리터럴, 문서 주석) 라이트 값만 담는다. 표식 밖(나머지 약 350줄)은 사람이 쓴다. 동기 테스트가 생성 결과와 표식 사이 텍스트의 일치를 본다.
**기각**: `tokens.generated.ts` 분리(위 테스트 수정 필요), JSON을 런타임에 읽기(RN 번들·jest 영향).

## R5 — 대비 쌍 (FR-006·SC-002)

**조사 [실측, 계산]**: 라이트 `accent` 위 `accentForeground` 3.76, `accent`/`bg` 3.76·`accent`/`surface` 3.47(본문 불가), `danger`/`bg` 6.41. 다크 초안: `text`/`bg` 15.71, `textMuted`/`bg` 7.19·`/surface` 6.33, `accent`/`bg` 6.21, `accentForeground`/`accent` 6.21, `danger`/`bg` 7.91, `border`/`bg` 3.33.
**결정**: 쌍 표는 정본에 사람이 적는다(`contrast`). 본문 글자 쌍은 4.5, 앱이 면 위 오프화이트를 허용하는 `accentForeground`/`accent`(라이트)는 3.0(큰 글자·UI, 043 결정)으로 표에 `min: 3`과 이유를 적는다. 웹이 이 쌍을 글자에 쓰지 않는다는 것은 `site.css`가 `accent`를 글자 색으로 쓰지 않는 소스 검사(G5)로 잠근다. 라이트 `border`는 장식 구분선(앱도 2.4:1, 앱 쪽 선례 `›/지면`)이라 쌍 표에서 뺀다.

## R6 — 기존 테스트와의 충돌

**조사 [코드]**: `__tests__/privacy/site-pages.test.ts` S3가 `<link rel="stylesheet">`를 모든 형태로 금지하고 `@import`·`src="http…"`·`<script`도 금지한다. 새 설계는 같은 출처 상대 경로 스타일시트 셋을 링크한다.
**결정**: S3에서 `rel="stylesheet"` 금지를 「`href`가 상대 경로(`../assets/…`·`assets/…`)가 아닌 stylesheet 링크 금지」로 좁힌다(FR-012의 유일한 수정). `<script`·`@import`·외부 `src` 금지는 그대로다. 같은 단언 자리에 「`<style>` 블록 0」은 G5가 맡는다.
**그 밖**: `pages.yml`은 `site` 폴더를 올리므로 `assets/`가 자동으로 포함된다(변경 없음). `.nojekyll`이 있어 `_`로 시작하는 경로 제약이 없다.

## R7 — 생성기 형식 안정성

**결정**: 생성 영역은 `prettier`(저장소 설정)로 한 번 포맷한 문자열을 쓴다 — `npm run format:check`가 `src/**`를 검사하므로 생성 결과가 그 기준과 같아야 한다. 생성기는 입력(JSON)만으로 결정적이다(시각·경로·환경 무관). CSS는 형식을 직접 고정한다(prettier 대상 아님).

## R8 — 웹 링크·강조 색

**결정**: 링크·강조 글자는 `danger` 역할(`--color-danger`), 면·구분 표식은 `accent`. 포커스 링은 `text` 색 2px 윤곽(대비 보장). 구분선·요약 상자는 `border`·`surface`.

## 미확인 (구현 후 quickstart에 기록)

- 실제 브라우저(Safari iOS·Chrome Android)에서의 글꼴 분할 로딩과 깜빡임(캡처는 헤드리스 크롬뿐).
- GitHub Pages 게시 뒤 서체 URL 200과 캐시 헤더.
- 앱 OTF와 웹 woff2의 글리프 동일성(눈 대조).

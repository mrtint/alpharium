# Contract: 생성물과 생성기

## 생성기

- 코어 `scripts/design/tokens-build.ts`: `buildOutputs(tokens: TokensJson): { appRegion: string; css: string }`(동기)와 `validateTokens`·`extractRegion`·`replaceRegion` — 입력만으로 정해지는 결정적 함수. 시각·경로·환경을 읽지 않고 같은 입력은 같은 바이트를 낸다. **prettier를 부르지 않는다**(jest의 CJS에서 prettier 3의 동적 import가 안 돈다) — 저장소 prettier 설정(printWidth 100·큰따옴표·후행 쉼표)과 같은 모양으로 직접 쓰고, 같은 모양인지는 `tokens-sync` 테스트가 `prettier --check`로 본다(G-A5).
- CLI `scripts/design/build-tokens.mts`: 정본을 읽어 (1) `src/ui/theme/tokens.ts`의 생성 영역을 바꿔 쓰고 (2) `site/assets/tokens.css`를 쓴다. `--check`는 쓰지 않고 다르면 종료 코드 1.
- 정본이 규칙(tokens-json C1~C9)을 어기면 아무것도 쓰지 않고 실패한다.
- 생성기는 값을 만들지 않는다(V8): 출력의 모든 수치·문자열은 정본의 값이거나 고정 꼴(식별자·구두점)이다.

## 앱 생성 영역 (`src/ui/theme/tokens.ts`)

표식 두 줄 사이를 통째로 바꾼다(표식 줄 포함 위·아래 텍스트는 건드리지 않는다):

```ts
// <design-tokens:generated> — design/tokens.json에서 만든다. 손으로 고치지 않는다.
/** …note… */
export const COLORS = { bg: "#f3f2f2", … } as const;
export const RADIUS = { card: 0, pill: 0, control: 6 } as const;
export const TYPE = { title: { fontSize: 20, fontWeight: "600", lineHeight: 28 }, … } as const;
export const FONT = { family: "Pretendard", weights: ["400", "500", "600", "700", "800"] } as const;
// </design-tokens:generated>
```

- G-A1. `COLORS`는 **라이트 값만**, 키 아홉, `const`, 리터럴. `COLORS_DARK`·`darkColors` 같은 이름이 없다(기존 테스트).
- G-A2. `TYPE`은 `platforms`가 없는 여섯 역할만, 모양은 `{ fontSize, fontWeight, lineHeight }`.
- G-A3. `FONT`는 `family`·`weights`만(`webWeights`·`fallback`은 웹 전용).
- G-A4. `fontFamily` 문자열이 영역 안에 없다(기존 F1 — `FONT.family`로만 정한다).
- G-A5. 영역은 `prettier --check`를 통과하는 형식이다.
- 표식 밖의 코드(`TEXT_FONT`·`PRESS`·`WRITING`·… `RNR_COLOR_ALIASES`·`contrastRatio`)는 바뀌지 않는다.

## 웹 변수 파일 (`site/assets/tokens.css`)

```css
/* design/tokens.json에서 만든다. 손으로 고치지 않는다. */
:root {
  color-scheme: light dark;
  --color-bg: #f3f2f2;
  /* … 아홉 역할 라이트 … */
  --radius-card: 0px; /* … */
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  --text-title-size: 20px; --text-title-weight: 600; --text-title-line: 28px; /* … 웹 전용 포함 모든 역할 */
  --space-4: 4px; /* … */
}
@media (prefers-color-scheme: dark) {
  :root { --color-bg: #1a1918; /* … 아홉 역할 다크 … */ }
}
```

- G-W1. 변수 이름: `--color-<role>`, `--radius-<name>`, `--font-sans`, `--text-<role>-size|weight|line`, `--space-<n>`. 역할 이름은 정본 키 그대로(camelCase 유지).
- G-W2. 색 변수는 라이트가 기본, 다크는 `prefers-color-scheme: dark` 한 곳. 다크 값이 라이트 선언 안에 섞이지 않는다.
- G-W3. 길이 단위는 `px`(정본이 숫자). 변환·`rem` 환산 없음(V8).
- G-W4. 웹 전용 글자 역할(`display`·`reading`)도 같은 꼴로 나온다.
- G-W5. `--font-sans`의 마지막 항목은 일반 계열 `sans-serif`다(글꼴이 늦게 와도 글이 보인다, FR-010).

## 서체 파일 (`site/assets/fonts/`, `fonts.css`)

- `import-pretendard-web.mts`가 만든다: tarball(`https://registry.npmjs.org/pretendard/-/pretendard-1.3.9.tgz`)을 받아 `dist.integrity`(sha512)를 확인하고 `webWeights` 굵기의 `woff2-dynamic-subset/*.woff2` 92개씩을 **바이트 그대로** 복사한다.
- `source.json`: 패키지 이름·버전·`integrity`·라이선스 파일 sha256·파일별 sha256·굵기 목록. `LICENSE.txt`는 앱의 `assets/fonts/pretendard/LICENSE.txt`와 바이트 같아야 한다(같은 v1.3.9).
- `fonts.css`: 굵기별 CSS에서 조각마다 `@font-face { font-family: "Pretendard"; font-style: normal; font-display: swap; font-weight: N; src: url(./fonts/….woff2) format("woff2"); unicode-range: …; }` — `unicode-range`는 배포처 값 그대로.

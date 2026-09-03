// 032 — NativeWind v4 tailwind 설정.
//
// 계약: specs/032-nativewind-ui-system/contracts/build-config.md BC5·BC6
//
// ─────────────────────────────────────────────────────────────────────────────
// **단일 출처**: `src/ui/theme/tokens.ts`를 require해 색·반경·타이포를 구성한다.
// 값을 여기 하드코딩하지 않는다 — 두 곳에 쓰면 한 글자만 어긋나도 화면과 tailwind
// 유틸리티가 갈라진다(018 `promptPrefix()` 바이트 동일성 교훈).
//
// **darkMode: "class"**: NativeWind 기본값은 "media"라 런타임이 OS 색 스킴을
// 읽어 `dark:` 스타일을 적용한다. 이 앱은 라이트 고정이고(031) `dark:` variant를
// 한 번도 쓰지 않으므로 "class"로 명시한다 — 실수로 `dark:`를 넣어도 토글이
// 없어 영구 라이트로 남는다(BC6, spec FR-019).
// ─────────────────────────────────────────────────────────────────────────────

const { COLORS, RADIUS, TYPE } = require("./src/ui/theme/tokens");

/** tokens.ts의 TYPE(`{ fontSize, fontWeight, lineHeight }`)을 tailwind fontSize
 *  튜플(`[size, { lineHeight, fontWeight }]`)로 옮긴다. */
const fontSize = Object.fromEntries(
  Object.entries(TYPE).map(([key, t]) => [
    key,
    [`${t.fontSize}px`, { lineHeight: `${t.lineHeight}px`, fontWeight: t.fontWeight }],
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: { ...COLORS },
      borderRadius: {
        card: `${RADIUS.card}px`,
        pill: `${RADIUS.pill}px`,
      },
      fontSize,
    },
  },
  plugins: [],
};

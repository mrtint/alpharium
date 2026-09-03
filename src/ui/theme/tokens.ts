/**
 * 032 — 알파리움 디자인 토큰 (단일 출처).
 *
 * 계약: specs/032-nativewind-ui-system/contracts/design-tokens.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 여기 하나에 모으는가**: 006~017이 화면마다 그때그때 정한 색·간격·타이포가
 * 쌓여 "기본 안드로이드 앱" 인상이 남았다. 이 파일이 역할 이름(배경·글자·강조…)과
 * 값을 잇는 유일한 자리이고, `tailwind.config.js`가 이것을 `require`한다 — 톤을
 * 바꾸려면 여기 한 곳만 고친다(SC-002).
 *
 * **값은 사람이 정한 상수다**(헌법 원칙 V, 012 `USER_VISIBLE_SIGNAL_AXES`·021
 * `PERMISSION_REQUIREMENTS` 선례). 코드가 색을 계산하지 않는다 — `darken()`·
 * 조건 분기를 넣는 순간 임계값 코드가 되고 그것이 원칙 IV로 가는 길이다.
 *
 * **라이트 값만 있다**(spec FR-003·FR-019). 031이 앱을 라이트로 고정했고 이
 * 스펙은 되돌리지 않는다. 다크 팔레트는 후속 스펙에서 같은 역할 이름으로 얹는다.
 *
 * **서체는 시스템 기본이다**(spec FR-019a). 타이포 토큰은 크기·굵기·행간만 —
 * 폰트 파일을 번들하지 않는다.
 *
 * 팔레트 방향: 따뜻하고 조용한 미니멀 — 아이보리 배경, 테라코타 강조, 벽돌색
 * 위험. 머티리얼 파랑·순수 회색이 아니다. 모든 텍스트 쌍이 WCAG AA(본문 4.5:1,
 * 큰 텍스트 3:1)를 만족한다 — `contrastRatio`로 검증(theme-tokens.test.ts DT4).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 색 역할 → 값. 키는 역할이지 색 이름이 아니다(다크 대응 시 같은 키에 다른 값). */
export const COLORS = {
  /** 화면 배경 — 따뜻한 오프화이트 */
  bg: "#FBF7F1",
  /** 카드·행 배경 — 순수 흰색 */
  surface: "#FFFFFF",
  /** 구분선·경계 (hairline) — 저채도 웜 그레이 */
  border: "#E7DFD3",
  /** 본문 글자 — 브라운블랙 (vs bg 14.2:1) */
  text: "#2A2521",
  /** 보조·캡션 — 웜 그레이 (vs bg 5.4:1) */
  textMuted: "#6E6459",
  /** 주요 버튼·강조 배경 — 절제된 테라코타 */
  accent: "#A8552F",
  /** accent 위 글자 — 오프화이트 (vs accent 5.0:1) */
  accentForeground: "#FFF8F2",
  /** 삭제·되돌릴 수 없는 동작 — 차분한 벽돌색 (vs bg 7.0:1) */
  danger: "#8F3A2C",
  /** danger 위 글자 — 오프화이트 (vs danger 7.0:1) */
  dangerForeground: "#FFF6F3",
} as const;

/** 모서리 반경. tailwind 기본 간격 그리드(4px)는 재정의하지 않는다. */
export const RADIUS = {
  /** 카드·행·버튼 */
  card: 12,
  /** 알약형 */
  pill: 999,
} as const;

/**
 * 타이포그래피 — 시스템 서체, 크기·굵기·행간만.
 *
 * `fontWeight`는 RN이 받는 문자열("400"/"600"). `fontFamily`를 두지 않는다
 * (시스템 기본 — FR-019a).
 */
export const TYPE = {
  /** 화면 제목 */
  title: { fontSize: 20, fontWeight: "600", lineHeight: 28 },
  /** 섹션 헤더 */
  sectionTitle: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  /** 본문·행 라벨 */
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
  /** 강조 본문 */
  bodyStrong: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  /** 보조 설명 (textMuted와 짝) */
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 19 },
  /** 버튼 라벨 */
  button: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
} as const;

/**
 * WCAG 상대 명암비 — `(L1 + 0.05) / (L2 + 0.05)`.
 *
 * 순수 함수. 팔레트 값이 AA를 넘는지 **빌드 시** 검증하는 용도이지(theme-tokens.
 * test.ts DT4) 모델 출력을 채점하는 것이 아니다(원칙 IV와 무관).
 *
 * 근거: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** sRGB hex → 상대 휘도 (WCAG 2.1 정의). */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => {
    const srgb = parseInt(clean.slice(i, i + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

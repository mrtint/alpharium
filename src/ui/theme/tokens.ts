/**
 * 032/043 — 알파리움 디자인 토큰 (단일 출처).
 *
 * 계약: specs/032-nativewind-ui-system/contracts/design-tokens.md
 *       specs/043-modernist-splash-permissions/data-model.md
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
 * **043 — Modernist 팔레트로 전면 교체**: 오프화이트 배경, 단일 레드 강조,
 * 제로 라디우스. 032의 따뜻한 미니멀(아이보리·테라코타)을 대체했다. 값은
 * claude.ai/design 리뷰 보드에서 직접 추출했다(043 스펙 research.md R2).
 * `accentForeground`는 `accent` 배경 위에서 4.5:1을 만족하는 값이 순검정뿐이라
 * `#000000`으로 정했지만, 이 조합을 실제로 렌더하는 컴포넌트는 없다 —
 * `Button` `primary` variant는 대신 `danger` 배경을 쓴다(043 research R2).
 * `textMuted`도 마크업 원본(#7d7979, 3.85:1 미달)에서 `#6b6767`(5.00:1)로
 * 근소 조정했다. 모든 텍스트 쌍이 WCAG AA(본문 4.5:1, 큰 텍스트 3:1)를
 * 만족한다 — `contrastRatio`로 검증(theme-tokens.test.ts DT4).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 색 역할 → 값. 키는 역할이지 색 이름이 아니다(다크 대응 시 같은 키에 다른 값). */
export const COLORS = {
  /** 화면 배경 — 오프화이트 (043 Modernist) */
  bg: "#f3f2f2",
  /** 카드·행 배경 — 옅은 회색 */
  surface: "#eae9e9",
  /** 구분선·경계 (hairline) — 마크업 divider(어두운 텍스트색 40% 불투명도)를
   *  bg(#f3f2f2) 위에 합성한 불투명 hex 근사(DT1 — COLORS는 #rrggbb만 허용) */
  border: "#9f9d9d",
  /** 본문 글자 — 짙은 블랙 (vs bg 14.86:1) */
  text: "#201e1d",
  /** 보조·캡션 — 중간 회색, WCAG 대비 위해 원본보다 근소하게 어둡게 조정 (vs bg 5.00:1) */
  textMuted: "#6b6767",
  /** 주요 버튼·강조 배경 — 단일 레드 */
  accent: "#ec3013",
  /** accent 배경 위 글자용 값 — 4.5:1을 만족하는 값은 순검정뿐(vs accent 5.00:1).
   *  실제로 이 조합을 렌더하는 컴포넌트는 없다(Button은 danger를 쓴다). */
  accentForeground: "#000000",
  /** 삭제·되돌릴 수 없는 동작 + 강조 텍스트/버튼용 진한 레드 (vs bg 6.41:1) */
  danger: "#ae1800",
  /** danger 위 글자 — 오프화이트 (vs danger 6.41:1) */
  dangerForeground: "#f3f2f2",
} as const;

/** 모서리 반경. 043 — Modernist는 전 역할 제로 라디우스. */
export const RADIUS = {
  /** 카드·행·버튼 */
  card: 0,
  /** 알약형 */
  pill: 0,
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
 * 033 — 눌림 반응. 누를 수 있는 요소가 손끝에 반응하는 정도.
 *
 * **사람이 정한 값이다**(헌법 원칙 V). 사용자 조사나 측정에 근거하지 않으며,
 * 근거를 만들려 드는 순간 그것이 측정 장치다(원칙 IV). 012의
 * `USER_VISIBLE_SIGNAL_AXES`, 021의 `PERMISSION_REQUIREMENTS`, 023의
 * `BUCKET_COUNT`, 그리고 위 `COLORS`·`TYPE`이 전부 같은 성격이다.
 *
 * 값의 성격: `0.97`은 **눈에 띄지만 요란하지 않은** 범위다 — `0.90` 이하면
 * 버튼이 튀고, `0.99`면 있는지 모른다. `120ms`는 손을 떼고 돌아오는 것이
 * 즉각적으로 느껴지는 범위다. **실기기에서 어색하면 여기 한 줄만 고친다**
 * (참조하는 곳이 `Button`·`ListRow` 둘뿐 — spec SC-008).
 *
 * **크기만 바꾼다**(spec FR-013). 불투명도는 쓰지 않는다 — `TouchableOpacity`가
 * 이미 주던 효과라 새로 얻는 것이 없고, 크기와 겹치면 "가벼운 마감"의 선을
 * 넘는다. 자리·크기 배치를 애니메이션하지 않으므로 주변이 밀려나지 않는다.
 */
export const PRESS = {
  /** 눌렸을 때의 크기 배율 */
  scale: 0.97,
  /** 눌림·복귀 각각에 걸리는 시간 (ms) */
  durationMs: 120,
} as const;

/**
 * 038 — 일기 첫 표시 타자기 연출의 글자당 노출 간격.
 *
 * **사람이 정한 값이다**(012 `USER_VISIBLE_SIGNAL_AXES`, 021
 * `PERMISSION_REQUIREMENTS`, 033 `PRESS`가 선례) — 코드가 재서 정하지 않는다
 * (원칙 V). "기다림"보다 "드러남"에 가깝게 빠른 편을 기본으로 한다(FR-010).
 *
 * **화면에 노출하지 않는다**(원칙 IV) — `TypewriterText`가 이 값을 입력
 * prop으로만 받고, 렌더 출력 어디에도 이 숫자가 텍스트로 나타나지 않는다.
 * 실기기에서 느리거나 빠르게 느껴지면 이 한 줄만 고친다.
 */
export const REVEAL = {
  /** 글자당 노출 간격 (ms) */
  charMs: 15,
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

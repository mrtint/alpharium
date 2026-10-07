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
 * `accentForeground`는 보드 그대로 오프화이트(`bg`와 같은 값)다 — 빨간 면(스트립 선택 칸·
 * 하단 「일기 쓰기」 바·대화상자 동작 버튼·캐러셀 배지) 위 글자는 흰색이다. 043 R2는 AA 본문
 * 기준(4.5:1)을 채우려 순검정으로 바꿨지만 **2026-10-01 저장소 소유자가 보드를 따르기로 했다**
 * (vs accent 3.76:1 — 큰 글자·UI 기준 3:1만 넘는다). 나머지 텍스트 쌍은 AA 본문 기준을
 * 만족한다. `textMuted`는 마크업 원본(#7d7979, 3.85:1 미달)에서 `#6b6767`(5.00:1)로 근소
 * 조정했다 — `contrastRatio`로 검증(theme-tokens.test.ts DT4).
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
  /** accent 배경 위 글자 — 보드의 오프화이트(vs accent 3.76:1, 큰 글자·UI 기준만 충족).
   *  AA 본문 기준 미달을 알고 보드를 따른다(2026-10-01 저장소 소유자 결정). */
  accentForeground: "#f3f2f2",
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
  /**
   * 050 — 대화상자·달력의 버튼(보드 `2d`·`2j`). 면은 여전히 직선(반경 0)이고 **버튼만** 6이다 —
   * 보드가 하단 바 버튼과 맞춘 값이다(설계 §3.1, 사람이 정한 값).
   */
  control: 6,
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
 * (참조하는 곳이 `Button` 하나뿐 — spec SC-008, 059가 `ListRow`를 지웠다).
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
 * 054 — 쓰는 중 홈(보드 `2b`)의 치수·간격. 색은 넣지 않는다 — `COLORS`만 쓴다(C5).
 *
 * **사람이 정한 값이다**(012 `USER_VISIBLE_SIGNAL_AXES` 선례) — 코드가 재서 정하지 않는다(원칙 V).
 * `rotateMs`(혼잣말 교체 간격)·`fadeMs`는 표시 상수이지 측정이 아니다. 실기기에서 어색하면 이 한 곳만 고친다.
 */
export const WRITING = {
  /** 잠근 스트립의 불투명도 — 잠긴 것이 보이게 (보드 `2b`) */
  stripLockedOpacity: 0.35,
  /** 지면 안쪽 여백 — 아래 120은 하단 바가 덮는 자리 */
  paperPadding: { top: 32, horizontal: 20, bottom: 120 },
  gap: 14,
  /** 머리말 11/600, 대문자 간격 .1em */
  kicker: { fontSize: 11, fontWeight: "600", letterSpacing: 1.1 },
  /** 혼잣말 24/700, 줄높이 1.35, 자간 −.01em */
  monologue: { fontSize: 24, fontWeight: "700", lineHeight: 32.4, letterSpacing: -0.24 },
  /** 「{이름}이 쓰고 있어요…」 13, 줄높이 1.5 */
  byline: { fontSize: 13, lineHeight: 19.5 },
  /** 혼잣말 교체 간격·페이드 (ms) */
  rotateMs: 4000,
  fadeMs: 250,
} as const;

/**
 * 054 — 실패 토스트(보드 `2i`)의 치수·수명. 쓸어 닫기 문턱은 여기가 아니라 `src/app/failure-toast.ts`의
 * `TOAST_SWIPE`가 정본이다(순수 판정이 화면 토큰을 import하지 않게).
 */
export const TOAST = {
  /** 좌우 여백 */
  inset: 12,
  /** 하단 바 위 간격 */
  gapAboveBar: 12,
  minHeight: 48,
  padding: { vertical: 12, horizontal: 16 },
  fontSize: 14,
  fontWeight: "600",
  lineHeight: 19.6,
  /** 왼쪽 accent 사각형 6×6, 글과의 간격 10 */
  marker: 6,
  markerGap: 10,
  /** 그림자 `0 8px 24px rgba(0,0,0,.18)` */
  shadow: { offsetY: 8, blur: 24, opacity: 0.18 },
  /** 화면에 머무는 시간·페이드 아웃·슬라이드 인 (ms) */
  showMs: 3000,
  fadeOutMs: 200,
  enterMs: 240,
} as const;

/**
 * 050 — React Native Reusables(RNR) 색 이름 → 우리 역할 (Clarifications Q3, research R6).
 *
 * RNR 복사본(`src/ui/rnr/`)은 shadcn 색 이름(`bg-background`·`text-foreground`…)을 쓴다. CSS 변수를
 * 두면 단일 출처가 둘로 갈라지므로(032 BC5) **여기서 별칭만** 만들고, 값은 전부 `COLORS`를 가리킨다 —
 * 새 색이 하나도 없다(DEP4). 복사본이 실제로 쓰는 이름만 둔다.
 *
 * RNR의 `accent`(눌림 배경)는 우리 `accent`(빨강)와 이름이 겹치므로 별칭으로 두지 않는다 — 복사본에서
 * 그 클래스를 `bg-surface`로 바꿨다.
 */
export const RNR_COLOR_ALIASES = {
  background: COLORS.bg,
  foreground: COLORS.text,
  "muted-foreground": COLORS.textMuted,
  primary: COLORS.accent,
  "primary-foreground": COLORS.accentForeground,
  input: COLORS.text,
  popover: COLORS.bg,
  "popover-foreground": COLORS.text,
} as const;

/**
 * 050 — 대화상자 덮개와 면 그림자 (보드 `2d`·`2j`, 설계 §3.1 — 사람이 정한 값).
 *
 * `COLORS`는 `#rrggbb`만 담으므로(DT1) 반투명 값은 여기 따로 둔다. 덮개 `rgba(0,0,0,.5)`, 면 그림자
 * `0 10px 30px rgba(0,0,0,.18)`(RN `boxShadow` 문자열 — 안드로이드에서도 그린다).
 */
export const OVERLAY = {
  scrim: "rgba(0,0,0,0.5)",
  faceShadow: "0px 10px 30px rgba(0,0,0,0.18)",
} as const;

/** 050 — 대화상자 면·버튼 치수 (보드 `2d`, 사람이 정한 값). */
export const DIALOG = {
  /** 면 안쪽 여백 */
  padding: 24,
  /** 면 안 요소 간격 */
  gap: 16,
  /** 화면 좌우 바깥 여백 (가로 전폭) */
  inset: 20,
  /** 면 테두리 두께 (`COLORS.text`) */
  borderWidth: 2,
  /** 버튼 높이 */
  buttonHeight: 48,
  /** 세로로 쌓인 버튼 사이 */
  buttonGap: 8,
  /** 056 — 제목과 부제 사이(보드 `6f` 제목·시간대 줄 묶음) */
  subtitleGap: 6,
  /** 056 — 부제 글자 크기(보드 `6f` 시간대 줄 13) */
  subtitleSize: 13,
  /** 056 — 보드 body 기본 줄높이(글자 크기에 곱한다) */
  lineHeightRatio: 1.55,
} as const;

/** 050 — 날짜로 이동 달력 치수 (보드 `2j`, 사람이 정한 값). */
export const CALENDAR = {
  /** 이전·다음 버튼 한 변 */
  navSize: 40,
  /** 날짜 칸 높이 */
  cellHeight: 40,
  /** 일기 있음 점 한 변 */
  dot: 4,
  /** 오늘 밑줄과 숫자 사이 */
  underlineOffset: 3,
  /** 미래 칸·비활성 버튼 불투명도 */
  disabledOpacity: 0.3,
} as const;

/**
 * 051 — 쓴 날 지면·캐러셀·「다시 쓰기」 바 (보드 `2c`·`2k`·`2g`, 설계 §3.5 — 사람이 정한 값).
 *
 * 보드 색 램프(설계 §4.2)의 세 값은 「역할」이 아니라 이 면들의 색이라 `COLORS`(아홉 역할, DT1)에
 * 넣지 않는다 — 050의 `OVERLAY`·`CALENDAR`와 같은 방식(research R7). 대비는 theme-tokens.test가
 * 잠근다.
 */
export const WRITTEN_DAY = {
  /** 지면 배경 — 보드 neutral-100 */
  paper: "#f8f4f4",
  /** 「다시 쓰기」 바 — 보드 neutral-200 */
  rewriteBar: "#eae7e7",
  /** 인디케이터 나머지 칸 — 보드 neutral-400 */
  indicatorIdle: "#bab6b6",
  /** 캐러셀 사진 높이 */
  photoHeight: 210,
  /** 스트립 아래 지면까지 */
  paperGap: 20,
  /** 캐러셀 안쪽 여백 (위·좌우, 아래 0) */
  carouselPadding: { top: 16, horizontal: 20 },
  /** 「1 / 3」 배지 — 위·오른쪽 10, 11/700, 자간 .08em(11 × .08), 안쪽 여백 4 9 */
  badge: { inset: 10, fontSize: 11, letterSpacing: 0.88, paddingV: 4, paddingH: 9 },
  /** 인디케이터 — 현재 장 18×4, 나머지 6×4, 간격 6 */
  indicator: { activeWidth: 18, idleWidth: 6, height: 4, gap: 6, marginTop: 10 },
  /** 본문 — 15, 줄높이 1.65, 문단 간격 14, 안쪽 여백 16 20 104 (사진이 없으면 위 20 — 보드 `2k`) */
  body: {
    fontSize: 15,
    lineHeightRatio: 1.65,
    paragraphGap: 14,
    paddingTop: 16,
    paddingTopAlone: 20,
    paddingH: 20,
    paddingBottom: 104,
  },
  /** 헤더 제목 15/700 */
  title: { fontSize: 15, fontWeight: "700" },
  /** 「다시 쓰기」 17/800 */
  rewrite: { fontSize: 17, fontWeight: "800" },
  /** 하단 바 — 최소 높이 64, 위 좌우 반경 6, 올라오고 내려가는 시간 240ms (보드 `2c`·`1d`·`5b`) */
  bar: { minHeight: 64, radius: 6, slideMs: 240 },
  /** 상대 작성 시각 11/500, 바 글자와의 간격 3 */
  writtenAt: { fontSize: 11, fontWeight: "500", gap: 3 },
} as const;

/**
 * 읽기 스크롤(052) — 스트립을 접는 움직임과 ▾ (보드 `5b`).
 *
 * 접힘: 높이 `.24s ease-out`, 불투명도 `.18s`. (보드의 ▾는 두지 않는다 — 저장소 소유자 지시)
 * 높이는 보드의 `max-height: 180`(CSS 상한)이 아니라 **잰 자연 높이**를 옮긴다(research R1).
 */
export const READING_SCROLL = {
  foldMs: 240,
  fadeMs: 180,
  /** 접히는 영역을 재기 전 첫 프레임의 **짐작값**(기본 글꼴에서 잰 값). 재는 즉시 실측으로 바뀐다 */
  stripEstimate: 108,
} as const;

/**
 * 쓸 재료(053) — 안 쓴 날 지면의 두 칸과 안내 한 줄 (보드 `1d` ④·`2l`·`2e`).
 *
 * 치수는 보드 마크업의 인라인 스타일을 옮긴 사람이 정한 값이다. 색은 새로 만들지 않는다 —
 * 지면 배경은 `WRITTEN_DAY.paper`(neutral-100), 글자는 `COLORS`.
 */
export const MATERIAL_GRID = {
  /** 지면 안쪽 여백 — 아래 120은 하단 바가 덮는 자리 */
  paperPadding: { top: 20, horizontal: 20, bottom: 120 },
  /** 지면 컬럼 간격 — 안내 한 줄의 위 간격은 이 6 + `noteMarginTop` 8 = 14 */
  columnGap: 6,
  noteMarginTop: 8,
  /** 칸 안쪽 여백 세로 16, 둘째 칸은 왼쪽 16, 라벨과 값 사이 8 */
  cellPaddingVertical: 16,
  secondCellPaddingLeft: 16,
  cellGap: 8,
  /** 「권한이 없어요 ›」 누를 수 있는 영역의 최소 높이 */
  permissionMinHeight: 44,
  /**
   * 숫자 48/800(자간 −.04em), 단위 15/700, 라벨 13/600, 안내 14(줄높이 1.5 = 21).
   * 보드는 줄높이 .85(= 41)지만 iOS는 줄높이가 글자 높이보다 작으면 윗부분을 잘라 낸다 —
   * 안드로이드에서는 안 보이는 결함이라 줄높이를 글자 크기(48)와 같게 잡는다.
   */
  number: { fontSize: 48, lineHeight: 48, letterSpacing: -1.92 },
  unitSize: 15,
  labelSize: 13,
  note: { fontSize: 14, lineHeight: 21 },
  /** 「권한이 없어요」 16/700, 「›」 18/700, 사이 간격 6 */
  permission: { fontSize: 16, caretSize: 18, gap: 6 },
} as const;

/**
 * 설정 화면(055) — 홈 위에 쌓이는 설정의 틀·행·꼬리표·토글과 진입점 (보드 `6a`·`6c`).
 *
 * 치수는 보드 마크업 인라인 스타일을 옮긴 사람이 정한 값이다. 보드 색 램프 중 이미 있는 값은 새로 만들지
 * 않는다(research R10) — 지면 `WRITTEN_DAY.paper`(neutral-100), 값·보조 줄 `COLORS.textMuted`(보드
 * neutral-600을 043이 AA로 조정한 값), 「허용 안 함」 글자 `COLORS.danger`(= accent-700), 행 구분선
 * `COLORS.border`(divider). 새로 드는 것은 아래 셋뿐이다.
 */
export const SETTINGS = {
  /** › — 보드 neutral-500. 장식 글리프라 대비 규칙 밖(지면 위 약 2.6:1 — theme-tokens.test가 잠근다) */
  chevron: "#9b9797",
  /** 「허용됨」 꼬리표 면·토글 꺼짐 면 — 보드 neutral-200(「다시 쓰기」 바와 같은 값) */
  tagFill: WRITTEN_DAY.rewriteBar,
  /** 「허용됨」 꼬리표 글자 — 보드 neutral-800 */
  tagText: "#444141",
  /** 059 — 「개발자」 행이 켜진 순간의 바탕(보드 `6d` accent-100) */
  rowHighlight: "#fff2ef",
  /**
   * 머리 — 위 10·좌우 20, 「‹ 일기」 15/700·‹ 22·최소 높이 44, 제목 44/800·자간 -.04em, 아래 2px 선, 제목 위 6·아래 14.
   * 보드의 위 56은 iOS 프레임의 상태 표시줄 46을 품은 값이다 — 홈 헤더가 보드 70을 24로 옮긴 것과 같은 환산(2026-10-01 실기기에서
   * 56을 그대로 두자 머리가 홈보다 한참 아래로 내려앉았다).
   */
  head: {
    paddingTop: 10,
    paddingH: 20,
    backSize: 15,
    backWeight: "700",
    chevronSize: 22,
    backMinHeight: 44,
    backGap: 6,
    titleSize: 44,
    titleWeight: "800",
    /** 보드는 줄높이 .9(= 39.6)지만 iOS는 줄높이가 글자보다 작으면 윗부분을 잘라 낸다(#98) — 글자 크기와 같게 */
    titleLineHeight: 44,
    titleLetterSpacingEm: -0.04,
    titlePaddingTop: 6,
    titlePaddingBottom: 14,
    ruleWidth: 2,
  },
  /** 지면 안쪽 여백 — 위 14·좌우 20·아래 40 */
  paperPadding: { top: 14, horizontal: 20, bottom: 40 },
  /** 묶음 머리 — 11/600, 자간 .1em, 대문자, 위 14(첫 묶음 0)·아래 6 */
  group: { fontSize: 11, fontWeight: "600", letterSpacingEm: 0.1, marginTop: 14, marginBottom: 6 },
  /** 행 — 최소 44(보조 줄 56), 간격 12, 라벨 15/600, 값 15, › 18, 보조 줄 12·줄높이 1.35, 라벨·보조 줄 사이 3, 값·› 사이 8 */
  row: {
    minHeight: 44,
    minHeightWithHint: 56,
    gap: 12,
    labelSize: 15,
    labelWeight: "600",
    valueSize: 15,
    chevronSize: 18,
    hintSize: 12,
    hintLineHeightRatio: 1.35,
    hintGap: 3,
    valueGap: 8,
  },
  /** 꼬리표 — 13/600. 면 있는 것은 여백 3·8, 테두리 있는 것은 1px + 여백 2·7 */
  tag: {
    fontSize: 13,
    fontWeight: "600",
    filledPadding: { v: 3, h: 8 },
    outlinedPadding: { v: 2, h: 7 },
  },
  /**
   * 토글 — 44×26, 안쪽 3, 손잡이 20×20. 꺼짐 손잡이는 `textMuted`(보드 neutral-600 근처) — 꺼짐 면(`tagFill`) 대비 4.54:1.
   * 055의 「꺼짐 = 바탕색 손잡이」는 면과 거의 구분되지 않아 056 FR-029가 뒤집었다(theme-tokens.test가 3:1 하한을 잠근다).
   */
  toggle: { width: 44, height: 26, padding: 3, knob: 20, knobOff: COLORS.textMuted },
  /** 056 — 「매일 쓰는 시각」 행이 펼쳐지고 접히는 시간(보드 `6c` ③ 「0→44, 200ms」) */
  expandMs: 200,
  /**
   * 056 — 보드의 기본 줄높이(`body { line-height: 1.55 }`, 글자 크기에 곱한다). 줄높이를 따로 적지 않은 대화상자 안 글자
   * (시간대 줄·오전/오후·격자 숫자·장소 칸 이름·지도 고지)에 쓴다 — `AppText`의 기본 22를 물려받으면 13 글자는 보드보다 높고
   * 16 글자는 낮아진다.
   */
  boardLineHeightRatio: 1.55,
  /** 056 — 두 대화상자의 제목 20/700(보드 `6f`·`6l`) */
  dialogTitle: { size: 20, weight: "700" },
  /**
   * 056 — 시 격자 대화상자(보드 `6f`). 시간대 줄은 대화상자 틀의 부제(`DIALOG.subtitle*`)다. 오전/오후 칸 높이 40·15(선택 800, 아님 600),
   * 격자 칸 높이 52·18(선택 800, 아님 600)·열 4(12시간)/6(24시간), 미리보기 13·줄높이 1.5.
   */
  timeDialog: {
    meridiemHeight: 40,
    meridiemSize: 15,
    cellHeight: 52,
    cellSize: 18,
    previewSize: 13,
    previewLineHeightRatio: 1.5,
    columns12: 4,
    columns24: 6,
  },
  /**
   * 056 — 장소 이름 대화상자(보드 `6l`). 칸 사이 8, 안쪽 12·14, 표식 12×12·표식과 글 사이 12(위 4 내림),
   * 이름 16(선택 800, 아님 600), 설명 13·줄높이 1.45·이름 아래 3.
   */
  placeDialog: {
    optionGap: 8,
    optionPaddingV: 12,
    optionPaddingH: 14,
    markSize: 12,
    markGap: 12,
    markTop: 4,
    nameSize: 16,
    descSize: 13,
    descLineHeightRatio: 1.45,
    descGap: 3,
    noticeSize: 13,
  },
  /** 진입점 — 점 5×5 셋, 간격 4, 누름 44×44, 보드 음수 여백 -14 -12 -14 0 */
  entry: { dot: 5, gap: 4, hit: 44, margin: { top: -14, right: -12, bottom: -14 } },
  /** 겹이 밀려 들어오고 나가는 시간 — 052 접힘·051 바와 맞춘 사람이 정한 값(research R1) */
  slideMs: 240,
} as const;

/**
 * 상태 흉내가 켜진 홈의 쓰기 바·DEV 꼬리표 (064, 보드 `6i`).
 *
 * 면은 보드 neutral-300. 글자는 보드 neutral-700(`#605d5d`)이 이 면 위 4.39:1이라 AA(4.5:1)에 못 미쳐 한 칸 진한 neutral-800을 쓴다
 * (043 `textMuted` 조정과 같은 관례, research R7). 꼬리표 테두리는 글자색(보드 `1px solid var(--color-text)`).
 */
export const SIMULATION = {
  /** 쓰기 바 면 — 보드 neutral-300 */
  barFill: "#d7d3d3",
  /** 쓰기 바 글자·꼬리표 — 보드 neutral-800(보드 neutral-700은 AA 미달) */
  barText: "#444141",
  /** 월 라벨 옆 DEV 꼬리표 테두리 */
  badgeBorder: COLORS.text,
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

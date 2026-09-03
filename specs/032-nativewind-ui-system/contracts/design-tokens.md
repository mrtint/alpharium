# Contract: 디자인 토큰 (DT)

**Feature**: 032-nativewind-ui-system
**File under contract**: `src/ui/theme/tokens.ts`
계약 테스트: `__tests__/theme-tokens.test.ts` (jest `logic`) — 소스를
`readFileSync`/`import`로 읽어 잠근다.

---

## DT1 — 색 역할 토큰이 사람이 정한 `readonly` 상수다

- `tokens.ts`가 `COLORS` 객체를 `export const ... as const`(또는 동등한
  `readonly` 타입)로 내보낸다.
- 키가 정확히: `bg`, `surface`, `border`, `text`, `textMuted`, `accent`,
  `accentForeground`, `danger`, `dangerForeground` (data-model.md §1.1).
- 각 값은 `#` 6자리 hex 문자열.
- **코드가 값을 계산하지 않는다** — `COLORS`는 리터럴이지 함수 호출·조건·map의
  결과가 아니다(원칙 V, 012 `USER_VISIBLE_SIGNAL_AXES` 선례).
- **위반 주입**: `COLORS`를 `let`으로 바꾸거나 값을 `computeShade(...)`로
  만들면 → DT1 FAIL.

## DT2 — 간격·반경·타이포 상수

- `RADIUS` 객체: `card` (number), `pill` (number).
- `TYPE` 객체: `title`, `sectionTitle`, `body`, `bodyStrong`, `caption`,
  `button` 키. 각 값은 `{ fontSize, fontWeight, lineHeight }` (data-model.md §1.3).
- `fontFamily`·`fontWeight`가 커스텀 폰트 이름을 참조하지 않는다 — 시스템 기본
  (spec FR-019a). `fontWeight`는 `"400"`/`"600"` 같은 표준값만.
- **위반 주입**: `TYPE.body.fontFamily = "Pretendard"` → DT2 FAIL (커스텀 서체
  미도입).

## DT3 — WCAG 대비 헬퍼

- `contrastRatio(a: string, b: string): number` export.
- 순수 함수 — 같은 입력에 같은 출력, 파일·`Date`·난수 안 씀.
- `contrastRatio("#000000", "#FFFFFF")` ≈ 21, `contrastRatio("#FFFFFF",
  "#FFFFFF")` === 1 (부동소수 허용 오차).

## DT4 — 팔레트가 WCAG AA를 만족한다 (spec FR-002, SC-005)

`theme-tokens.test.ts`가 `contrastRatio`로 검증:

| 쌍 | 최소 비율 |
|---|---|
| `text` vs `bg` | ≥ 4.5 |
| `text` vs `surface` | ≥ 4.5 |
| `textMuted` vs `bg` | ≥ 4.5 |
| `accentForeground` vs `accent` | ≥ 4.5 |
| `dangerForeground` vs `danger` | ≥ 4.5 |
| `danger` vs `bg` | ≥ 3.0 |

- **위반 주입**: `text`를 배경과 가까운 밝은 회색으로 바꾸면 → DT4 FAIL.
- **근거**: "읽는 앱"이라 본문 가독성이 핵심. 계산은 빌드 시 검사이지 모델
  출력 채점이 아님(원칙 IV 무관).

## DT5 — 단일 출처

- `tailwind.config.js`가 `tokens.ts`를 `require`한다(BC5와 짝).
- `theme-tokens.test.ts`가 `tailwind.config.js`를 로드해 `theme.extend.colors`
  키 집합 == `COLORS` 키 집합임을 확인.
- **위반 주입**: `tailwind.config.js`에 색을 하드코딩하거나 키를 하나 빼면 →
  DT5 FAIL.

## DT6 — 다크 값 없음 (spec FR-003·FR-019)

- `tokens.ts`에 `COLORS_DARK`·`darkColors`·색 스킴 분기가 **없다**. 라이트 값만.
- 구조는 나중에 다크 형제를 얹을 수 있는 역할 키 형태(이건 "있어야 한다"가
  아니라 "역할 키를 쓴다"는 DT1으로 이미 충족).
- **위반 주입**: `COLORS_DARK` 추가 → DT6 FAIL (이번 스펙 범위 밖 — 후속).

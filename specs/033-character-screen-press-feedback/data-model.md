# Phase 1 — Data Model: 캐릭터 화면 이관 + 눌림 피드백

**Feature**: 033-character-screen-press-feedback | **Date**: 2026-09-07

이 스펙은 **저장되는 데이터를 만들지 않는다.** 새 신호·새 파일·새 저장 필드가
0개이며(spec SC-006 계열), 여기서 말하는 "모델"은 **타입과 사람이 정한 상수**뿐이다.

---

## 1. 신규 — 눌림 반응 상수 (`src/ui/theme/tokens.ts`)

```
PRESS = {
  scale:      0.97   // 눌렸을 때의 크기 배율
  durationMs: 120    // 눌림·복귀 각각에 걸리는 시간
}
```

**성격**: 사람이 정한 `as const` 리터럴. 헌법 원칙 V — 코드가 상황을 보고 이 값을
계산하지 않는다. 012 `USER_VISIBLE_SIGNAL_AXES`, 021 `PERMISSION_REQUIREMENTS`,
023 `BUCKET_COUNT`, 032 `COLORS`·`RADIUS`·`TYPE`가 선례다.

**참조하는 곳**: `Button.tsx`, `ListRow.tsx` **둘뿐**(spec SC-008). 화면 코드는
이 상수를 읽지 않는다 — 공용 컴포넌트를 쓰는 것만으로 반응을 얻는다(FR-016a).

**왜 `tokens.ts`인가**: 032가 "톤을 바꾸려면 여기 한 곳만 고친다"로 세운 단일
출처다. 눌림의 세기는 색·모서리·타이포와 같은 층의 결정이므로 같은 자리에 산다.
별도 파일을 만들면 단일 출처가 둘이 된다.

---

## 2. 확장 — `ListRowProps.label` (`src/ui/components/ListRow.tsx`)

| | 이전 | 이후 |
|---|---|---|
| `label` | `string` | `string \| React.ReactNode` |

**동작 규칙**:
- `typeof label === "string"` → 지금처럼 `<AppText variant="body">{label}</AppText>`로
  감싼다. **기존 6개 테스트가 전부 이 경로**이므로 무수정 GREEN(R3, SC-002).
- 그 외 → 노드를 그대로 그린다. 좌측이 세로로 쌓인 캐릭터 행이 이 경로.

**나머지 prop 무변경**: `value`·`right`·`onPress`·`chevron`·`disabled`·`testID`·
`style` 전부 그대로. 새 prop 0개.

**뒤로 호환**: 순수 확장(union 넓힘)이라 기존 호출부가 하나도 안 깨진다. `tsc`가
이것을 보증한다.

---

## 3. 무변경으로 유지 — `CharacterListProps`

**`CharacterListScreen`의 props 타입은 한 글자도 안 바뀐다.** `readiness`·`view`·
`usage`·`onPrepare`·`onPause`·`onRemove`·`onDismissNotice`·`visionReadiness`·
`visionProgress`·`onPrepareVision`·`onRemoveVision`·`visionBytes` 그대로다.

이것이 "표현만 바꾼다"의 타입 수준 증거다 — 호출부(`App.tsx`)가 한 줄도 안 바뀐다.

---

## 4. 무변경으로 유지 — 화면 내부 순수 함수

`statusText()`·`actionLabel()`·`progressText()`·`formatBytes()` **네 함수의 로직과
반환 문자열이 전부 불변**이다(spec FR-002). 이관은 이들이 만든 문자열을 **어디에
어떤 스타일로 그리는가**만 바꾼다.

| 함수 | 반환값 (불변) |
|---|---|
| `statusText` | `쓸 수 있음` / `받아야 함` / `받다 멈춤 — 이어받을 수 있음` / `받다 멈춤` / `다시 받아야 함` |
| `actionLabel` | `지우기` / `이어받기` / `다시 받기` / `준비하기` |
| `progressText` | `받는 중…` / `받는 중… N%` |
| `formatBytes` | `N.NGB` / `NMB` |

**`progressText`의 `N%`는 다운로드 상태이지 생성 지표가 아니다**(spec FR-019,
003이 정한 것). 이 스펙이 그 판단을 바꾸지 않으며, 새 수치를 만들지도 않는다.

---

## 5. 제거되는 것 — `styles` (StyleSheet)

`CharacterListScreen.tsx` 하단의 `StyleSheet.create({...})` 12개 항목이 사라진다.
원시 hex 6개(`#ddd`·`#fdf3d8`·`#666`×2·`#999`·`#eee`)가 이때 함께 사라진다(SC-001).

| 옛 스타일 | 이후 |
|---|---|
| `container` | 화면 루트의 className + 토큰 style |
| `title` | `<AppText variant="title">` |
| `row` | `ListRow`가 내부에서 (hairline border 포함) |
| `notice` / `noticeText` / `dismiss` | 토큰 style + `AppText` + `Button` |
| `info` | `ListRow`의 `label` 노드 안 |
| `name` / `tagline` / `status` / `usage` | `<AppText variant="body"/"caption">` |
| `button` | `Button` (variant: 지우기=danger, 나머지=secondary) |

---

## 6. 상태 전이 — 없음

이 스펙은 **상태 기계를 도입하지 않는다.** 눌림 반응은 `onPressIn`/`onPressOut`이
공유값 하나를 바꾸는 것이고, 그 값은 저장되지 않으며 컴포넌트 밖으로 나가지 않는다.
화면의 기존 상태 전이(준비 → 받는 중 → 쓸 수 있음, 거부 안내 표시/닫기)는 전부
불변이다(spec FR-004).

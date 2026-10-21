# Data Model: 작은 글자 대비와 누름 영역 (088)

이 기능은 영속 저장소(`Documents/` 파일)나 런타임 상태를 바꾸지 않으며, `src/ui/theme/tokens.ts`의 읽기 전용 디자인 토큰 상수만 확장한다.

## 1. `DAY_STRIP` 토큰 (`src/ui/theme/tokens.ts`)

| 필드 | 타입 | 값 | 제약 조건 및 근거 |
| --- | --- | --- | --- |
| `dowMuted` | `"#5f5e5d"` | `"#5f5e5d"` | `#rrggbb` 불투명 hex 리터럴(원칙 V). `COLORS.text`(`#201e1d`)를 `COLORS.bg`(`#f3f2f2`) 위에 0.7 불투명도로 합성한 값. `contrastRatio(DAY_STRIP.dowMuted, COLORS.bg) >= 4.5`(실제 5.79:1). `COLORS` 9개 역할에는 넣지 않는다(DT1). |

## 2. `SETTINGS.toggle` 토큰 확장 (`src/ui/theme/tokens.ts`)

| 필드 | 타입 | 값 | 제약 조건 및 근거 |
| --- | --- | --- | --- |
| `width` | `44` | `44` | 기존 유지 (055 FR-018) |
| `height` | `26` | `26` | 기존 유지 (055 FR-018) |
| `padding` | `3` | `3` | 기존 유지 |
| `knob` | `20` | `20` | 기존 유지 |
| `knobOff` | `typeof COLORS.textMuted` | `COLORS.textMuted` | 기존 유지 (056 FR-029) |
| `hitSlop` | `9` | `9` | 세로 위·아래 확장 폭(dp). `height + hitSlop * 2 === SETTINGS.row.minHeight`(44). |

## 3. 대비 쌍 불변식 (`__tests__/theme-tokens.test.ts`)

| 전경 | 배경 | 최소 대비 기준 | 계산값 | 관련 요구사항 |
| --- | --- | --- | --- | --- |
| `COLORS.danger` (`#ae1800`) | `COLORS.bg` (`#f3f2f2`) | `4.5:1` (DT4) | `6.41:1` | FR-001, FR-003, SC-001 |
| `COLORS.danger` (`#ae1800`) | `WRITTEN_DAY.paper` (`#f8f4f4`) | `4.5:1` (055) | `6.56:1` | FR-001, FR-003, SC-001 |
| `COLORS.accentForeground` (`#f3f2f2`) | `COLORS.accent` (`#ec3013`) | `3.0:1` (DT4, 043 결정) | `3.76:1` | FR-005, SC-002 |
| `DAY_STRIP.dowMuted` (`#5f5e5d`) | `COLORS.bg` (`#f3f2f2`) | `4.5:1` (088) | `5.79:1` | FR-006, SC-002 |

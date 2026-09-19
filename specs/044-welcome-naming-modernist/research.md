# Research: Modernist 첫 만남 및 캐릭터 작명

## R1 — 새 색 실측이 필요 없다

**Decision**: `src/ui/theme/tokens.ts`의 `COLORS.*` 9개 역할은 043에서 이미
Modernist 값으로 교체·WCAG AA 대비 실측까지 끝났다(`__tests__/theme-tokens.test.ts`
DT1~DT7). 이번 스펙은 이 값을 그대로 소비하며 토큰 파일을 건드리지 않는다.

**Rationale**: 043 research.md R2가 `bg`/`surface`/`text`/`textMuted`/
`accent`/`accentForeground`/`danger`/`dangerForeground`/`border` 값을 실측·
확정했고, `Button.tsx`의 `primary`(accent 배경 + accentForeground 글자)·
`secondary`(surface 배경 + text 글자) variant도 이미 그 값을 쓰고 있다.
`WelcomeScreen`은 기존에도 `COLORS.*`만 참조했으므로(032/034 이관 당시부터)
043이 값을 바꾼 순간 이미 새 팔레트를 상속받고 있다 — 지금 화면이 "이전
스타일"로 보이는 것은 색이 아니라 **레이아웃**(둥근 카드, 중앙 정렬 텍스트
블록) 때문이다.

**Alternatives considered**: 새 역할 색(예: 카드 배경 전용 톤)을 추가하는 것
— 기각. DT1이 `COLORS` 키를 정확히 9개로 잠그고, 043도 "새 역할이 필요하면
그때 늘린다"는 입장을 유지했다. 044도 레이아웃(테두리 유무, 정렬, 여백)만
바꿔 기존 9개 역할로 충분히 표현한다.

**Impact on tasks**: 색 관련 태스크가 없다. 태스크는 레이아웃 재작성(구조·
정렬·타이포그래피)에만 집중한다.

## R2 — 작명 화면(`welcome`)은 리뷰 보드 `1a` 레이아웃을 그대로 옮긴다

**Decision**: `1a` 마크업 구조(좌측 정렬, 세로 스택)를 채택한다 — 위에서
아래로: 굵은 제목(`h1`, font-weight 800) → 본문 문단 → 구분선(2px) → 이름
프롬프트(작은 굵은 텍스트) → 이름 입력줄(밑줄 스타일, 글자 수 표시 없음 —
FR-005가 카운터 자체를 금지하지 않지만 기존 화면도 카운터가 없었고 스펙
범위 밖) → 힌트 캡션 → 하단 [건너뛰기]/[확정] 버튼 가로 배치(확정 버튼이
오른쪽, accent 배경).

**Rationale**: 사용자가 제공한 마크업 파일의 `1a` 화면이 정확히 이 스펙이
다루는 첫 만남·작명 화면이다(로드맵 문서에 이미 화면 ID 매핑을 기록해
뒀다). 기존 `WelcomeScreen.tsx`도 이미 같은 순서(제목→본문→프롬프트→
입력→힌트→버튼 2개)로 요소를 배치하고 있어 **구조 자체는 거의 그대로,
스타일(굵기·크기·테두리·간격)만 바뀐다** — 새 정보 아키텍처가 필요 없다.

**Alternatives considered**: 마크업의 아바타 원형 이미지(로봇 얼굴 등)를
포함하는 것 — 기각(spec Assumptions에 명시). 037 기준 로스터가 하나뿐이라
캐릭터별 아바타 자산이 없고, 만들면 이번 스펙 범위(레이아웃 이관)를
벗어나 새 자산 관리 문제가 생긴다.

**Impact on tasks**: `WelcomeScreen.tsx`의 `welcome` phase 블록을
좌측 정렬 카드형 스타일(굵은 제목 폰트 크기 확대, 구분선 추가, 버튼 가로
배치)로 재작성하는 태스크 하나.

## R3 — `checking`/`failed`는 `LogoScreen`의 중앙 정렬 패턴을 재사용한다

**Decision**: 2026-09-19 클래리파이에서 확정한 대로, 두 단계는 카드·테두리
없이 화면 중앙에 로딩 인디케이터 또는 안내 문구 + 버튼을 배치한다 —
`LogoScreen.tsx`의 `container`(flex:1, 세로 중앙 정렬)와 유사한 구조.

**Rationale**: 리뷰 보드에 이 두 상태를 위한 전용 화면이 없다(035가 만든
상태이지 리뷰 보드가 예상한 상태가 아님). 043이 만든 두 가지 기존 패턴
(로고의 중앙 정렬 미니멀 / 배터리 예외 단계의 좌측 정렬 안내+버튼) 중
클래리파이로 "중앙 정렬 미니멀"을 확정했다 — 이렇게 하면 작명 화면(입력을
요구하는 좌측 정렬 카드형)과 시각적으로 뚜렷이 구분되어, 사용자가 "지금은
내가 뭘 입력할 차례가 아니라 시스템이 처리 중"임을 즉시 알 수 있다.

**Alternatives considered**: 배터리 예외 단계와 같은 좌측 정렬 카드형 —
기각(클래리파이 결정). 작명 화면과 시각적으로 구분되지 않아 두 상태를
헷갈리기 쉽다.

**Impact on tasks**: `WelcomeScreen.tsx`의 `checking`/`failed` phase 블록을
중앙 정렬 컨테이너(기존 `CENTERED` 스타일과 유사하되 대비·타이포그래피는
Modernist)로 재작성하는 태스크 하나. 기존 `ActivityIndicator` 사용은
유지한다(원칙 IV — 진행률 파라미터가 없는 것이 방어라는 기존 주석 근거는
바뀌지 않는다).

## R4 — 이름 입력 상한(12자)은 마크업 문구와 실제 코드 값이 이미 일치

**Decision**: 화면 상수(`NAME_INPUT_MAX_LENGTH = 12`)와 `src/welcome/naming.ts`의
`NAME_MAX_LENGTH = 12`, 마크업 `nameHint`("12자까지")가 전부 12로 일치한다
(spec.md Assumptions에서 이미 실측 확인). 변경 없음.

**Rationale**: clarify 단계에서 발견한 대로, 사용자의 최초 설명("상한
10자")은 부정확한 요약이었다. 코드가 이미 마크업과 일치하므로 이번 스펙은
숫자를 바꾸지 않는다.

**Impact on tasks**: 값 변경 태스크 없음. 기존 계약 테스트
(`welcome-screen.test.tsx`의 "FR-013 — 글자 수 상한" describe 블록)가
그대로 유지되어야 한다는 것만 회귀 검증 대상에 남는다.

## R5 — `testID`는 그대로 유지한다

**Decision**: `welcome-screen`, `welcome-checking`, `welcome-greeting`,
`welcome-name-input`, `welcome-name-submit`, `welcome-name-skip`,
`welcome-failed`, `welcome-retry`, `welcome-failed-skip`,
`welcome-character-name` — 기존 10개 `testID` 문자열을 그대로 유지한다.

**Rationale**: 기존 계약 테스트(`__tests__/ui/welcome-screen.test.tsx`)와
Maestro 흐름(`.maestro/welcome-naming.yml`)이 전부 이 값들로 요소를
조회한다. 값을 바꾸면 두 테스트 스위트를 함께 고쳐야 하고, 이는 스펙이
명시한 "시각 레이어만 재작성한다"는 범위를 벗어난다. FR-009가 이미 이
선택을 요구한다(값을 바꿔도 되지만 그 경우 Maestro도 함께 갱신해야 한다고
명시했으나, 바꿀 이유가 없으므로 여기서 "바꾸지 않는다"로 확정한다).

**Alternatives considered**: 043 스타일의 새 명명 규칙으로 통일 — 기각.
043도 기존 `testID`(`onboarding-*`, `first-run-logo` 등)를 유지했고 새로
만든 화면(`LogoScreen`)에서만 새 이름을 썼다. 044는 기존 화면 재작성이라
같은 전례를 따른다.

**Impact on tasks**: `testID` 변경 태스크 없음. 회귀 검증 태스크에서
"testID 문자열 불변"을 명시적으로 확인한다.

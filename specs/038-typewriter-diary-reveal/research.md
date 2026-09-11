# Research: 완성된 일기 첫 표시를 타자기 연출로

**Feature**: 038-typewriter-diary-reveal | **Date**: 2026-09-11

Phase 0 조사. 스펙에 `NEEDS CLARIFICATION`이 없고 로드맵 23번에 2026-09-08
브레인스토밍 결과가 상세히 기록돼 있어, 여기서는 **결정과 그 근거**를 정리하고
저장소 현행 코드에서 확인한 사실을 남긴다.

---

## 결정 1 — `DiaryDetailScreen`에 옵셔널 `reveal` prop을 더한다 (브레인스토밍 A안)

- **Decision**: `written` 케이스에서만 `<DiaryDetailScreen reveal ... />`로 넘기고,
  `reveal`이 참이면 제목→본문을 점진 노출하고 하단 절을 지연한다. `reveal`이
  없거나 거짓이면(목록에서 연 `detail` 케이스) 지금과 100% 동일.
- **Rationale**:
  - `app/state.ts`가 **이미** `{ kind: "written"; entry; saved; overwrote }`와
    `{ kind: "detail"; day; entry }`를 별개 상태로 구분한다(state.ts:74·99).
    "첫 표시만 연출"(FR-007·US3)의 seam이 코드에 이미 있다 — 새로 판정할 것이 없다.
  - `DiaryHomeScreen`의 `case "written"`(DiaryHomeScreen.tsx:469)과
    `case "detail"`(:422)이 이미 갈라져 있어, 한쪽에만 prop을 더하면 된다.
  - "그 자리가 그대로 상세 화면이 된다"(US1-5)에 정확히 맞는다 — 화면 전환이
    없고 `written`→`detail` 재렌더도 없다(뒤로 갔다 목록에서 다시 열면
    `openItem`이 `detail`을 만든다, state.ts:261).
- **Alternatives considered**:
  - **B. `DiaryRevealScreen` 별도 화면 분리** — 화면 전환이 한 번 생기고 상세
    렌더 로직을 두 곳에서 관리하게 된다. 기각(브레인스토밍).
  - **C. `App.tsx` 레벨 애니메이션 래퍼** — `written` 상태 하나에만 필요한데
    앱 전역에 얹는 것은 과함. 기각(브레인스토밍).

---

## 결정 2 — reanimated를 쓰지 않는다. `setState` + 타이머로 문자열을 자른다

- **Decision**: `TypewriterText`가 `Array.from(text)`로 만든 글자 배열을
  타이머(`setInterval` 또는 재귀 `setTimeout`)로 인덱스를 늘려가며
  `text.slice(0, n)` 상당의 접두 문자열을 `useState`로 렌더한다.
- **Rationale**:
  - 이 연출은 **투명도·변형 전환이 아니라 표시 문자열의 교체**다. reanimated의
    worklet·`useAnimatedStyle`이 할 일이 없다.
  - 032가 NativeWind의 peer dep으로 reanimated를 끌어왔고 033이 눌림 피드백에
    처음 썼지만(로드맵 21번), 이 기능은 그와 **무관**하다(스펙 Assumptions).
    reanimated를 쓰면 033이 겪은 `babel.config.js`의 `react-native-worklets/plugin`
    의존과 jest 목 문제(AGENTS.md 033 실측)를 이 기능에도 끌어들이게 된다.
  - `setState` 방식은 `jest.useFakeTimers()` + `act(advanceTimersByTime)`로
    **기기 없이 정확히** 검증된다(025가 `ScrollView` 스크롤을 그렇게 검증한 선례).
- **Alternatives considered**:
  - **reanimated `withTiming` + 마스크** — 글자를 미리 다 그려 놓고 폭을 애니메이트.
    한글·가변폭 폰트에서 "다음 글자 절반이 잠깐 보임"이 생기고, worklet 의존이
    붙는다. 기각.

---

## 결정 3 — 글자 경계는 `Array.from()` 기준으로 자른다 (`grapheme-slice.ts`)

- **Decision**: 순수 유틸 `src/ui/text/grapheme-slice.ts`가 `Array.from(text)`로
  코드포인트 배열을 만들고, "길이 N 접두 문자열"을 그 배열의 `slice(0, n).join("")`로
  돌려준다. `TypewriterText`는 이 유틸만 쓴다.
- **Rationale**:
  - FR-009: 이모지·서로게이트 쌍·한글 완성 글자에서 반쪽 글자가 나오면 안 된다.
    `string[index]`나 `.slice(0, n)`은 UTF-16 코드 유닛 단위라 서로게이트 쌍을
    쪼갠다. `Array.from()`/스프레드/`for...of`는 **코드포인트 단위**로 순회하므로
    서로게이트 쌍(대부분의 이모지)이 안전하다.
  - 한글 **완성형**(가·나…, NFC)은 코드포인트 하나라 `Array.from()`으로 충분하다.
    조합형(NFD, 자모 분리)이나 ZWJ 이모지 시퀀스(👨‍👩‍👧)까지 완벽히 묶으려면
    `Intl.Segmenter`가 필요하나, **일기 본문은 kanana가 생성한 한국어 NFC
    텍스트**이고 이모지를 쓰지 않으므로(프롬프트·모델 특성) 코드포인트 단위가
    실무상 충분하다. `Intl.Segmenter`는 RN Hermes에서 가용성이 불확실해 의존을
    피한다.
  - 별도 `.ts` 파일이어야 `test:logic`(node 환경, ~7초)에서 경계 케이스를 잠글
    수 있다. `TypewriterText.tsx`에 인라인하면 jest-expo에서만 돌아 개발 중
    빠른 피드백에서 빠진다(plan.md Structure Decision).
- **Alternatives considered**:
  - **`Intl.Segmenter`로 grapheme cluster 분할** — 이론적으로 가장 정확하나 RN
    Hermes 지원이 버전에 따라 불확실하고, 일기 본문 특성상 이득이 없다. 필요해지면
    (이모지 캐릭터가 로스터에 생기는 등) 이 유틸 한 곳만 교체하면 된다.
  - **npm `grapheme-splitter`** — 새 의존. 025가 "새 의존성 0"을 지킨 것과
    어긋난다. 기각.

---

## 결정 4 — 하단 절(017 "이 일기가 본 것" + 025 슬라이더)은 본문 완료 후 렌더

- **Decision**: `reveal`이 참이고 아직 본문 타이핑이 끝나지 않았으면
  `DiaryDetailScreen`이 "이 일기가 본 것" 절·`PhotoSlider`·`PhotoGalleryModal`을
  **렌더하지 않는다**(존재 자체가 없다). 본문 `onDone` 또는 skip 후 렌더한다.
- **Rationale**:
  - FR-003·SC-002: "본문 타이핑 완료 전에는 화면에 없어야 한다". "숨김"(`hidden`)이
    아니라 "미렌더"로 해야 Maestro/RNTL 쿼리에서도 부재가 확인된다(025의
    `accessibilityLabel` 함정 계열 — 존재하면 접근성 트리에 뜬다).
  - `DiaryDetailScreen`은 이미 `hasPhotos && ...`로 슬라이더를 조건부 렌더한다
    (DiaryDetailScreen.tsx:466). 여기에 `&& revealDone` 상당의 게이트를 AND로
    더하는 최소 변경.
- **Alternatives considered**:
  - **`opacity: 0`으로 숨김** — 레이아웃 점프는 없지만 접근성 트리에 남아
    SC-002의 "화면에 없다"를 만족하지 못한다. 기각.

---

## 결정 5 — `saved:false` / `overwrote:true` 안내는 타이핑과 무관하게 즉시 표시

- **Decision**: "저장하지 못했다..."(`!saved`)와 "이전 일기를 덮어썼다"
  (`overwrote`) 두 안내는 `reveal` 상태와 무관하게 지금 위치에서 지금처럼
  렌더한다(FR-012).
- **Rationale**:
  - 이 둘은 사용자가 **즉시 알아야 하는 정보**다(006 FR-012b·FR-034 — "조용히
    덮어쓰면 사용자는 이전 일기가 사라진 줄도 모른다"). 타이핑 완료를 기다리게
    하면 그 사이 앱을 나가버릴 수 있다.
  - 현재 이 안내는 본문 `<AppText>` 아래에 있다(DiaryDetailScreen.tsx:446·449).
    `reveal` 중에는 본문이 아직 짧으므로 안내가 위로 당겨 보이는데, 그래도 무방
    하다 — 스펙 Edge Cases가 이를 명시했다.
- **Alternatives considered**:
  - **본문 위로 옮겨 항상 먼저 보이게** — 목록 재진입(`detail`) 경로의 레이아웃이
    바뀌어 SC-004(회귀 없음)를 깬다. 기각.

---

## 결정 6 — 탭 건너뛰기 판정은 단일 조건: "연출 완료 전이면 skip"

- **Decision**: `reveal`이 참이고 `revealDone`이 거짓이면, 화면 어디를 탭해도
  즉시 전체 노출 + `revealDone := true`. `revealDone`이 참이면 탭은 skip으로
  동작하지 않는다(슬라이더·갤러리 탭 등 기존 상호작용만).
- **Rationale**:
  - 스펙 Clarifications(2026-09-11): 제목→본문 사이·본문 종료 직후 하단 절
    등장 전을 포함해 **전부 나타나기 전**이면 어느 시점의 탭이든 건너뛰기.
    단일 조건이라 계약 테스트가 `revealDone` 하나만 본다.
  - 구현: `reveal && !revealDone`일 때만 화면 최상위를 `Pressable`로 감싸고
    `onPress`에서 `TypewriterText`에 `skipToEnd`를 넘기고 `revealDone`을 켠다.
    `revealDone`이 참이 되면 그 `Pressable`을 일반 `View`로 되돌린다(또는
    `onPress` 무시). 그래야 FR-006(완료 후 탭이 슬라이더·갤러리를 가리지 않음).
- **Alternatives considered**:
  - **본문 타이핑 중에만 skip** — 경계 구간(제목→본문, 본문→하단 절)에서 탭이
    먹통이 되어 "탭했는데 아무 일도 없다"는 사용자 혼란. Clarification에서 기각.

---

## 결정 7 — 새 헌법 검사 규칙은 넣지 않는다 (선택 사항 검토 결과)

- **Decision**: `scripts/constitution-rules.ts`에 이 기능 전용 규칙을 **추가하지
  않는다**. 대신 계약 테스트(`diary-reveal.test.tsx`)가 "`detail` 케이스에서는
  본문이 잘리지 않는다", "생성 중 화면은 무변경"을 잠근다.
- **Rationale**:
  - 035는 `checkWelcomeFile`을 새로 만들었지만 그건 **새 경계**(`src/welcome/`)가
    로스터·프롬프트·시간 토큰에 닿는 것을 막는 구조적 방어였다. 038은 새 경계가
    없고 `src/ui/` 안에서 끝난다.
  - 원칙 IV 톤 위험("생성 중처럼 보임")은 **소스 토큰 검사로 잡을 수 있는 종류가
    아니다** — `TypewriterText`라는 이름 자체가 금지어가 아니고, 위험은 "writing
    화면에 타이핑을 붙였는가"인데 그건 FR-011 계약 테스트(writing 케이스 diff 0,
    금지어 개수)가 직접 센다.
  - 저장소 관례상 "새 규칙을 세울 때마다 위반 주입으로 검증"(AGENTS.md)해야
    하는데, 여기서 세울 규칙이 계약 테스트로 이미 커버되면 중복이다.
- **Alternatives considered**:
  - **`checkSourceFile`에 "`TypewriterText` import는 `DiaryDetailScreen`에서만"**
    — 방어 가치가 낮다(다른 화면이 이걸 쓰려 해도 그 자체가 위반은 아니다).
    필요해지면 그때 추가. 지금은 YAGNI.

---

## 현행 코드에서 확인한 사실

| 확인 항목 | 결과 | 위치 |
|---|---|---|
| `written`/`detail` 상태 분리 | 이미 있음 — `{ kind: "written"; entry; saved; overwrote }` vs `{ kind: "detail"; day; entry }` | `src/app/state.ts:74,99` |
| `DiaryHomeScreen`이 두 케이스를 별도 렌더 | 이미 있음 — `case "written"`(:469), `case "detail"`(:422) 모두 `<Frame>` + `<DiaryDetailScreen>` | `src/ui/DiaryHomeScreen.tsx` |
| `DiaryDetailScreen` props | `{ entry; currentAuthorName?; saved?; overwrote? }` — `reveal?` 추가는 옵셔널 확장, 기존 호출자 무영향 | `src/ui/DiaryDetailScreen.tsx:44` |
| 제목 렌더 | `entry.title !== undefined && <AppText variant="title">{entry.title}</AppText>` | `:443` |
| 본문 렌더 | `<AppText variant="body" style={{ fontSize:16, lineHeight:26 }}>{entry.text}</AppText>` | `:452` |
| 슬라이더 조건부 렌더 | `hasPhotos && <PhotoSlider .../>` — `&& revealGate` AND 추가만 | `:466` |
| 하단 "이 일기가 본 것" 절 | `<View style={styles.signals}>` 블록, 본문·슬라이더 아래 | `:487` |
| 생성 중 화면 | `case "writing"` — `DiaryHomeScreen`의 **별도 `View`**, `DiaryDetailScreen` 미경유 | `:456` |
| 상수 자리 선례 | `tokens.ts`의 `PRESS = { scale, durationMs }`(033) | `src/ui/theme/tokens.ts:96` |
| jest 프로젝트 분리 | `.tsx` → `test:ui`(jest-expo), `.ts` → `test:logic`(node) | `package.json`, AGENTS.md |
| RNTL 14 주의 | `render`·`fireEvent` 모두 Promise 반환, `await` 필수. 쿼리는 `screen.*` | AGENTS.md(025·035 실측) |

---

## 미해결 없음

스펙의 모든 FR·SC가 위 결정으로 커버된다. `NEEDS CLARIFICATION` 잔여 0.

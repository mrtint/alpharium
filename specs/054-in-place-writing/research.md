# Research: 제자리 쓰기

각 결정은 **Decision / Rationale / Alternatives**. 근거는 읽은 코드(`DiaryHomeScreen.tsx`·`DiaryListScreen.tsx`·`state.ts`·`failure-text.ts`·
`monologue.ts`)와 보드 `2b`·`2i` 마크업(flex·position·transform까지 읽음 — transform 없음, 토스트·하단 바는 `position:absolute` 바닥 기준)이다.

## R1 — `writing`은 그대로, 화면이 `items`를 따로 든다

- **Decision**: `AppScreen`의 `{ kind: "writing"; stage?; branch?; line? }`를 **바꾸지 않는다**. `generate(params, items)`가 쓰기를 시작할 때 `items`(목록 요약)를 받아 화면 로컬 state `writingItems`에 든다.
- **Rationale**: 쓰는 중에도 헤더의 큰 날짜·주간 스트립 7칸(점)을 그려야 하므로 그 시점의 목록 요약이 필요하다. 처음에는 `confirm-overwrite`(050)처럼 `writing`이 `items`를 들게 하려 했으나(`toWriting(items)`), **구현 단계에서 기존 방어와 충돌**함을 확인했다 — `toWriting()`이 **인자를 받지 않고 `Object.keys(toWriting())`가 `["kind"]`뿐**임을 007 S1·009 I7·012 C3가 원칙 I(저장 상태로 갈리지 않는다)의 방어로 세 곳에서 잠갔다. `items`가 본문이 아닌 목록 요약이라 정신은 지켜지지만, 세 방어를 완화하는 것보다 `AppScreen`을 그대로 두는 편이 싸고 안전하다. `startWriting(prompt, items)`·`confirmOverwrite()`도 무변경이다.
- **Alternatives**: `writing`에 `items`를 더한다(위 이유로 기각). 렌더 중 ref 갱신으로 마지막 `items`를 든다(`react-hooks/refs`가 막는다).

## R2 — 쓰는 중 레이아웃은 안 쓴 날 레이아웃을 쓴다

- **Decision**: `DiaryListScreen`에 `writing?: { line?: string; name?: string }` 모드를 더한다. 이 모드는 쓴 날 여부와 무관하게 **헤더(스트립 포함) + `WritingPaper` +
  `StopBar`** 를 그린다. 쓴 날 분기(스트립 덮는 판·접힘·`WrittenDayPaper`)를 타지 않는다.
- **Rationale**: 보드 `2b`는 스트립이 헤더 안에 있고 지면이 배경색이다. 다시 쓰는 날도 같은 그림이어야 한다(인터랙션 메모 — 「다시 쓰던 날이면 기존 일기(`2c`)로 복귀」는 **끝난 뒤**의 일).
- **함정(052)**: `foldState`·`end`는 `DiaryListScreen`의 상태라 쓰는 중에도 남는다. 그만두고 쓴 날로 돌아오면 `WrittenDayPaper`가 새로 마운트돼 스크롤이 0인데 `foldState`가
  접힘이면 펼침 조건(y ≤ 2)이 서는 샘플이 오기 전까지 스트립이 접힌 채다. → **`writing` 모드에 들어가는 렌더에서 두 상태를 비운다**(049 `DayHeading`의 「렌더 중 상태 갱신」
  방식 — effect 안 동기 `setState`는 lint가 막는다). 쓰는 중 들어간 뒤 돌아온 지면은 처음부터 다시 잰다(스크롤 위치는 되살리지 않는다 — 언마운트).
- **`Notices`(캐릭터 옮김·거부 권한 안내)**: 스트립 바로 아래에 그대로 두고 **흐리게 하지 않는다**. 보드 `2b`에는 없는 요소이나 정직한 정보이고, 잠금은 스트립에만 적용된다(보드: 불투명도는 스트립 컨테이너).
- **Alternatives**: 쓴 날 레이아웃 위에 오버레이 — 접힘·바 상태 결합이 크고 보드와 다르다.

## R3 — 그만두기·실패의 복귀는 `refresh()` 뒤 `list`

- **Decision**: 그만두기: `cancelled=true` → `stop()` → `setScreen(toList(await refresh()))`(지금과 같다). 실패·저장 실패: `setScreen(toList(await refresh()))` + 토스트.
- **Rationale**: 「쓰기 전 상태 그대로」(FR-009)는 화면이 보이는 모양의 뜻이고, 생성이 저장 직전까지 갔다 그만둔 경계에서 파일이 이미 써졌을 수 있다 — 다시 읽으면 화면이 저장된 사실을
  정직하게 보인다(007 FR-014a의 「그만두기 우선」은 화면 결과를 새 일기로 보이지 않는 것). 캐시하지 않는다(051).
- **Alternatives**: 들고 있던 `items`로 즉시 복귀 — 빠르지만 저장 경계에서 거짓말할 수 있다.

## R4 — 혼잣말: 간격 4초 + 단계 전환 즉시, 페이드, 타자기 없음

- **Decision**: `MONOLOGUE_ROTATE_MS = 4000`(사람이 정한 값), `MONOLOGUE_FADE_MS = 250`. `DiaryHomeScreen`이 `writing` 동안 간격 타이머를 돌려 `pickMonologue(stage, branch, prev)`로
  `line`을 바꾼다. 단계·갈래가 바뀌면(진행 콜백) 지금처럼 즉시 새 줄을 고르고 **타이머를 다시 센다**. 첫 진행 신호 전(`stage` 없음)에는 지금의 「쓰고 있다」를 그대로 두고 교체하지 않는다.
- **Rationale**: 039 문안은 「실제로 하는 일에 근거」한다(사진 보는 중 / 모델 준비 중). 순수하게 타이머로만 돌리면 사진 보기가 끝났는데도 「사진을 살펴보는 중」이 몇 초 남는다 — 문안이 거짓이 된다.
  spec clarify Q2의 「단계에 묶지 않는다」는 **교체 간격이 단계 길이에 묶이지 않는다**(단계가 긴 동안에도 줄이 바뀜)로 읽고, 단계 전환의 즉시 교체는 그 위에 얹는다.
  **spec FR-021에 반영했다.** 문안 풀은 각 10개 이상이라 같은 줄이 연달아 나오지 않는다(`pickMonologue`가 직전 줄을 뺀다).
- **페이드**: 049의 `FadeLayer`(겹마다 마운트, 시작 투명도를 마운트 값으로) — effect로 시작값을 되돌리면 첫 프레임이 샌다. 줄이 바뀔 때 이전 줄은 절대 배치로 1→0, 새 줄은 0→1. 높이는 새 줄 하나가 잡는다.
- **Alternatives**: 타이머만(위 이유로 거짓 가능), 단계만(039 — 긴 단계에서 화면이 멈춘 듯 보임, 보드와 다름).
- **정리**: `TypewriterText`가 쓰는 곳 0이 되면 그것·`grapheme-slice`·`REVEAL`·각 테스트를 지운다(쓰지 않는 코드를 두지 않는다 — 044 교훈). 단, 삭제는 grep으로 사용처 0을 확인한 뒤에만.

## R5 — 실패 갈래 표(`failure-toast.ts`) — 사람이 못 박은 상수

- **Decision**: `PipelineResult`(실패) → `ToastKind`. `generation`·`vision` 단계는 파이프라인이 담아 온 `` `${kind}: ${detail}` ``의 **앞 토큰(kind)** 으로 갈라 표에 맞춘다(`describeGenerationReason`과 같은 방식 — 문구 전체를 비교하지 않는다).

  | 파이프라인 신호 | 갈래 | 문구 |
  | --- | --- | --- |
  | `rejected`·`timed-out`·`interrupted`·`generation-failed`·`vision-failed:cancelled`·`vision-failed:failed`·`signals`·`already-running`·`day-not-closed` | `retry` | 일기를 쓰지 못했어요. 다시 써 볼 수 있어요. (보드 `m.failToast`) |
  | `model-not-ready`·`request-build`·`model-load-failed` | `prepare-character` | 일기를 쓰지 못했어요. 먼저 캐릭터를 준비해 주세요. |
  | `vision-failed:not-ready` | `prepare-vision` | 일기를 쓰지 못했어요. 사진을 보는 데 필요한 것을 먼저 준비해 주세요. |
  | `backend-unavailable`·`not-implemented` | `plain` | 일기를 쓰지 못했어요. |
  | `storage`(글은 나왔으나 저장 실패) | `save` | 일기를 저장하지 못했어요. |
  | (모르는 종류) | `retry` | 위와 같다 — 지금의 「다시 시도해 볼 만하다」 폴백과 같은 방향 |

- **Rationale**: spec FR-014·019. `retry`가 아닌 것들은 다시 눌러도 풀리지 않으므로 「다시 써 볼 수 있어요」를 붙이지 않는다. `plain`은 개발·시뮬레이터에서만 나는 갈래(네이티브 추론 모듈 없음)라
  이유를 말하지 않고 문장 하나만 준다(이유 미노출, FR-016). `already-running`은 백그라운드 자동 생성이 같은 날을 쓰는 중이므로 잠시 뒤 다시 쓰면 되는 실패다(`retry`).
  `day-not-closed`는 미래 날이라 지금은 도달 불가지만 안전한 쪽(`retry`)으로 둔다. 문구는 **초안**이며 정본은 `failure-toast.ts`의 상수 하나다.
- **Alternatives**: 이유 문자열로 직접 판정 — 문구 수정에 조용히 깨진다(053 `photoAccess` 선례와 같은 교훈). 표에 갈래를 더 쪼개기 — 사용자에게 필요한 건 「다시 되나 / 준비해야 하나」 둘뿐.

## R6 — 토스트 위치와 수명

- **Decision**: `DiaryListScreen` ROOT 안 절대 배치. 바닥 = **하단 바의 잰 높이 + 12**. 바(`WriteBar`·`RewriteBar`·`StopBar`)의 `onLayout` 높이를 `DiaryListScreen`이 최댓값 상태로 든다.
  「다시 쓰기」 바는 작성 시각 줄이 있으면 64보다 크고, 내려가 있어도(`translateY`) `onLayout` 높이는 그대로이므로 **바가 올라와도 겹치지 않는다**.
- **Rationale**: 보드 `bottom: 110` = 바 64 + 홈 인디케이터 34 + 12. 우리는 바닥 안전 영역을 루트 `SafeAreaView`가 이미 비키므로 34가 따로 없다. 「바를 가리거나 밀어내지 않는다」(FR-015).
- **수명**: `FailureToast` 안 타이머 — `TOAST.showMs 3000`에 `onDismiss`, 그 200ms 전부터 페이드 아웃. 입력을 막지 않는다(`pointerEvents="box-none"` 래퍼 + 토스트 본체만 팬을 받는다).
- **쓸어 닫기**: 049 `DayPicker`와 같은 `Gesture.Pan().runOnJS(true)`, 아래로 끌면 손가락을 따라 `translateY`, 손을 떼면 `shouldDismissToast(dy, vy)`(문턱 `distance 24`·`velocity 500` — **사람이 정한 값**)면 닫고 아니면 제자리.
  판정은 순수 함수라 jest가 직접 검증하고, 제스처 배선은 한 렌더에서만 쏜다(049 함정: 앞 테스트의 핸들러가 불린다).
- **접근성**: `accessibilityLiveRegion="polite"`(안드로이드) + `accessibilityRole="alert"`로 나타날 때 읽힌다.
- **Alternatives**: 토스트를 바 슬롯의 자식으로 — 「다시 쓰기」 바가 내려가면 함께 내려가 사라진다. 고정 76 — 작성 시각 줄이 있는 바(≈90)와 겹친다.

## R7 — 토스트 수명 관리(화면 로컬 상태)

- **Decision**: `DiaryHomeScreen`이 `toast: { id: number; kind: ToastKind } | null`을 든다. 새 쓰기 시작·날 바꿈(`setChosenDay` 래퍼)·화면 이탈 시 `null`로 비운다(FR-018). `id`는 새 실패마다 올려 같은 문구가
  연달아 나도 토스트가 다시 뜨게(`key`) 한다.
- **Rationale**: 토스트는 그것을 낳은 실패 하나에 대한 것이다. 파일에 남기지 않는다(FR-012).

## R8 — `unsaved` 제거와 그 잔재

- **Decision**: `AppScreen`에서 `unsaved`를 지우고 `afterGeneration`의 결과를 `{ kind: "home" } | { kind: "toast"; toast: ToastKind }`로 바꾼다. `WRITTEN_DAY_TEXT.unsaved`·`unsaved-screen` testID·
  `unsaved` 뒤로 가기 처리·해당 테스트를 지운다. **`failed` 갈래는 남긴다** — 쓰기 **시작 전** `no-ready-character` 막힘(`toFailed`)의 화면이고, 지금 설정으로 가는 유일한 길이다(FR-024).
- **Rationale(중요한 정정)**: clarify Q1 옵션 B를 권할 때 「준비하러 가는 길은 홈에 이미 있는 설정 안내」라고 적었으나 **사실이 아니었다** — `onGoToSettings`는 `failed` 화면의 버튼 하나에서만 쓰인다(051이 `⋯`
  메뉴를 없앴다). 그 화면을 지우면 설정에 닿는 길이 사라진다. 그 실패는 「쓰는 중」이 아니라 쓰기 시작 전의 막힘이므로 이 조각 밖으로 두고 그대로 둔다. 쓰는 도중의 준비 실패(사이에 파일이 사라짐)는 토스트뿐이며
  설정으로 가는 길이 없다 — 설정 진입점은 「설정 화면 구성」 과제의 몫이다(범위 밖, 사용자 결정).

## R9 — 검증 나눔

- **Decision**: 배선(jest): 헤더 문구·스트립 잠금(pointerEvents·접근성)·`writing` 동안 날 이동 무반응·KO 원문·조사·「그만두기」 동작·복귀 상태(처음/다시)·토스트 문구·3초(가짜 시계)·이유 미유출·표의 각 갈래·저장 실패 토스트·`unsaved` 부재.
  움직임(페이드 교체·토스트 슬라이드 인·쓸어 닫기 손맛)은 실기기 육안(화면 녹화 프레임, 049 절차)으로만 본다 — 스펙에 따로 적는다(quickstart §2).
- **위반 주입**(관례): 토스트에 이유 문자열 넣기 / `retry` 문구를 조치 필요 갈래에 쓰기 / 스트립 `pointerEvents` 제거 / `writing`에 `toWriting()`이 저장 상태로 분기 / 그만두기 뒤 토스트 띄우기 — 각각 테스트가 잡는지 확인한다(quickstart §3).

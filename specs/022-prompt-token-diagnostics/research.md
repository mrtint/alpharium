# Phase 0 Research: 개발자 탭 내 입력 프롬프트 모니터링

스펙의 [NEEDS CLARIFICATION]은 `/speckit-clarify`(Session 2026-08-29)에서 모두 해소됨. 남은
연구 항목은 "기존 코드 재사용 방식"뿐이다.

## R1 — 미리보기 프롬프트를 어떻게 조립하는가

**Decision**: `src/diary/request.ts`의 `buildRequest(signals, character, vision, day, now)`로
`DiaryRequest`를 만든 뒤 `src/diary/prompt.ts`의 `buildPrompt(request)`를 호출한다. 결과
문자열을 그대로 미리보기로 쓴다.

**Rationale**:
- `buildPrompt()`가 **실제 생성 경로(온디바이스·데스크톱 양쪽)가 부르는 유일한 조립
  지점**이다(005 FR-013b, `prompt.ts` 파일 주석). 미리보기가 이 함수를 부르면 "화면에 보이는
  것 == 모델에 가는 것"이 정의상 보장된다(FR-006).
- `buildRequest()`는 이미 `signals`·`character`·`vision`·`dayStillOpen`을 묶는 순수 함수이며
  `no-character` 실패 갈래를 값으로 반환한다(FR-009의 실패 표시에 그대로 쓸 수 있다).
- `buildPrompt()`는 결정적이다(P6 — `new Date()`·난수 미사용). 같은 프리셋 → 같은 문자열이라
  계약 테스트로 잠글 수 있다.

**Alternatives considered**:
- *미리보기 전용 조립 함수 신설*: 원칙 II 위반. 화자 규칙이 두 곳에 생기고, 한쪽만 고쳐지면
  미리보기가 거짓을 보인다. 명시적으로 거부(FR-006).
- *`promptPrefix()`만 보여주기*: 018의 고정 접두사만 보이면 신호에 따라 달라지는 본문
  (`signalLines()`·`visionLines()`)을 못 본다 — 프롬프트 축소 작업의 핵심이 그 부분이라
  불충분.

**주의 — `vision` 인자**: `buildPrompt(request, vision?)`의 두 번째 인자 `PhotoVision`은
"사진을 실제로 VLM으로 읽은 결과"다. 미리보기는 VLM을 돌리지 않으므로 이 인자를 **주지
않는다**(undefined). "사진 있음" 프리셋은 `DaySignals.photos`가 `known`인 상태만 보여주며,
그때 프롬프트에는 `signalLines()`의 사진 장수·시각 줄과 `TRUNCATED_WARNING`(잘린 경우)이
들어간다. 캡션 줄(`visionLines()`)은 미리보기 범위 밖이다 — 별도 프리셋을 원하면 나중에
`PhotoVision` 프리셋을 상수로 추가할 수 있으나 이번 스코프 아님.

## R2 — 신호 프리셋을 어디에 어떤 모양으로 두는가

**Decision**: `src/diagnostics/prompt-preview.ts`에 사람이 손으로 쓴 `readonly` 배열
`SIGNAL_PRESETS: readonly SignalPreset[]`를 둔다. 각 항목은 `{ id, label, signals: DaySignals }`.
최소 두 개: `"empty"`(모든 축 `none`/`unknown`), `"photos"`(`photos`·`places`가 `known`).
`date`는 고정 상수(예: `"2026-01-15"`)를 박는다 — 미리보기는 날짜 자체를 검증하지 않는다.

**Rationale**:
- 012의 `USER_VISIBLE_SIGNAL_AXES`가 선례: "어느 축이 프롬프트에 들어가는가를 코드가 값에서
  판정하지 않고 사람이 상수로 못 박는다"(원칙 V MUST). 여기서도 "어떤 신호 조합을 보여줄지"를
  코드가 정하지 않는다.
- `src/signals/fake.ts`의 `emptyDay()`/`richDay()`를 재사용하는 대안은, 그 파일이 테스트·개발
  전용 표식을 달고 있고 `src/ui/`에서 import 금지 대상이라(원칙 I) 경계가 헷갈린다. 진단
  계층에 **전용 상수**를 두면 "이건 진단용 고정 입력"이라는 의도가 파일 위치로 드러난다.
- 프리셋을 `src/diagnostics/`에 두면 `src/ui/`는 `DaySignals`를 볼 일이 없다(FR-008).

**Alternatives considered**:
- *`fake.ts` 재사용*: 위 이유로 거부. 다만 프리셋 **작성 시** `fake.ts`의 구조를 참고 자료로
  본다(런타임 의존 아님).
- *저장된 일기의 `signalsUsed` 재사용*(clarify 옵션 C): 실기기에 일기가 없으면 미리보기가
  안 뜬다. 결정론도 깨진다(일기가 바뀌면 미리보기가 바뀜). 거부됨.

**프리셋 최소 구성** (data-model.md에서 필드까지 확정):

| id | label | photos | places | steps/battery/connectivity |
|---|---|---|---|---|
| `empty` | 신호 없음 | `none` | `none` | 전부 `unknown` |
| `photos` | 사진 있음 | `known` (2장, 서로 다른 시각) | `known` (2곳, 좌표 출처) | 전부 `unknown` |

`steps`/`battery`/`connectivity`는 `USER_VISIBLE_SIGNAL_AXES`에서 전부 `false`라 프롬프트에
어차피 안 나온다 — `unknown`으로 두면 충분하고, 축이 다시 켜지면 프리셋도 그때 손본다.

## R3 — 진단 리포트에 어떻게 싣는가

**Decision**: `DiagnosticReport`에 `promptPreviews: Readonly<Record<Character, PromptPreviewSet>>`
필드를 추가한다. `PromptPreviewSet`은 프리셋 id → `PromptPreview`(성공 시 `{ ok: true, text,
approxChars }`, 실패 시 `{ ok: false, reason }`). `collectReport()`가 `collectCharacterModels()`
바로 옆에서 `collectPromptPreviews()`를 부른다.

**Rationale**:
- 014가 `characterModels: Readonly<Record<Character, string>>`를 똑같이 추가했다 — 같은 모양,
  같은 자리, 같은 계약 테스트 패턴. 화면은 `report.promptPreviews[character][presetId]`만 읽는다.
- `approxChars`(문자 수)는 조립 시점에 `text.length`로 바로 나온다. "실측 토큰 아님"이라는
  표기는 화면이 라벨로 붙인다(FR-011).
- 실패 갈래를 값으로 담아 화면이 `ok` 분기만 하면 된다(FR-009) — `buildRequest()`가
  `no-character`를 반환하는 경우가 유일한 실패이나, `character` 인자를 항상 채워 부르므로
  실제로는 성공만 나온다. 그래도 갈래를 두는 것은 003의 `isModelReady?`·017의 `geocoding?`처럼
  "계약을 넓히되 방어를 남긴다"는 이 저장소 관례.

**Alternatives considered**:
- *별도 훅/함수로 화면에서 직접 조립*: `src/ui/`가 `prompt.ts`·`signals`를 import하게 되어
  FR-008 위반. 거부.
- *`collectReport`의 `ReportOptions`로 프리셋 주입*: 프리셋은 고정 상수라 주입할 이유가 없다.
  테스트에서 프리셋을 갈아끼울 필요가 생기면 그때 옵셔널 파라미터로 넓힌다(YAGNI).

## R4 — 헌법 검사: src/ui/ ↔ prompt/signals 경계

**Decision**: `scripts/constitution-rules.ts`의 `checkSourceFile()`에 정규식 한 쌍을 추가한다:
`UI_TOUCHES_PROMPT = /\bfrom\s+["'][^"']*diary\/prompt["']/` 와
`UI_TOUCHES_SIGNALS = /\bfrom\s+["'][^"']*signals\/(?:types|collect|fake|expo-port)["']/`.
`normalized.startsWith("src/ui/")`일 때만 적용. `App.tsx`·`src/app/`은 대상 아님(조립 계층).

**Rationale**:
- 007이 `src/ui/` → `models/roster` 차단을, 012가 `SignalProbe.tsx` → `USER_VISIBLE_SIGNAL_AXES`
  차단을 검사로 못 박은 것과 동형. "위반 주입으로 방어를 검증한다"(AGENTS.md 작업 습관)를
  따르려면 검사가 있어야 한다.
- `signals/types`만 막으면 `signals/collect` 우회가 뚫린다 — 하위 모듈을 함께 나열한다.
- `DiagnosticsScreen.tsx`는 이미 `signals/expo-port`를 import한다(`PermissionPanel`용
  `photoPort`). **주의**: `expo-port`를 정규식에 넣으면 기존 코드가 위반으로 잡힌다. →
  `expo-port`는 제외하고 `types|collect|fake`만 막는다. 프롬프트 미리보기에 필요한 것은
  `DaySignals` **타입**과 프리셋 **값**인데, 타입은 `src/diagnostics/`가 대신 들고 값은
  리포트 문자열로 오므로 화면이 `signals/types`를 볼 이유가 정말 없다.

**Alternatives considered**:
- *새 경계 함수 `checkDiagnosticsFile` 신설*: 020·021은 새 디렉터리(`src/schedule/`,
  `src/onboarding/`)를 만들어 전용 함수를 뒀다. 이 기능은 기존 `src/diagnostics/` 안에
  머무르고 화면 규칙만 늘어나므로 `checkSourceFile` 확장이 맞다. 과설계 회피.
- *검사 없이 코드 리뷰로만*: 이 저장소는 "타입 방어는 tsc, 구조 방어는 검사"를 반복
  확인했다(007·009·012). 검사 없으면 다음 기능에서 조용히 뚫린다.

## R5 — 화면 렌더링 범위

**Decision**: `DiagnosticsScreen.tsx`에 캐릭터 선택 UI(간단한 가로 버튼 열 또는 순차 표시)와
프리셋별 프롬프트 원본을 `ScrollView` 안 `<Text>`로 렌더. 화면 디자인은 범위 밖(001의 진단
화면 관례 — "상태가 읽히면 충분하다"). `testID`를 프리셋·캐릭터별로 달아 Maestro가 잡게 한다.

**Rationale**:
- 진단 화면은 이미 `ScrollView` + `Row` 패턴이다. 프롬프트는 여러 줄이라 `Row` 대신 제목
  + 스크롤 가능한 `<Text selectable>`로 둔다(FR-010 — 전체 읽기·복사).
- 캐릭터 5 × 프리셋 2 = 10개 블록을 한 번에 다 그리면 화면이 길어지지만 진단 화면이므로
  허용. 선택 UI로 캐릭터 하나씩 좁히면 더 낫다 — 구현 시 판단(둘 다 계약 만족).

**Alternatives considered**:
- *별도 화면/모달*: 진단은 한 화면에 모으는 것이 001 관례. 거부.

## 미해결 없음

모든 항목이 기존 코드 재사용으로 해결됨. 새 네이티브 모듈·새 의존성·빌드 설정 변경 없음 →
실기기 검증은 debug 1회로 충분(012 기준, AGENTS.md).

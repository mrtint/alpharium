# Feature Specification: 일기 자동 생성 프롬프트 재구성 (E2SN)

**Feature Branch**: `036-diary-concept-prompt`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "일기 자동 생성 프롬프트를 로드맵 18번(+14번) 실험 리포트의 결정 1~11대로 다시 짠다. 헌법 1.5.0(결정 12 = E2SN 채택)이 이미 커밋됐다."

## 배경

로드맵 18번(+14번) 컨셉·프롬프트 실험이 my-ollama에서 끝났다(kanana 1,242런 +
Haiku·Sonnet·Opus 기준선 136편). 리포트는 alpharium main
`docs/superpowers/specs/2026-09-07-diary-concept-prompt-experiment-report.md`에 있다.

리포트가 확인한 것: 현재 프롬프트가 낳는 다섯 가지 실패(끝 문단 면책, 제목 반례의
이름 베끼기, 신호 줄 되뇜, 캡션 없는 날의 지어내기, 캡션 인물로의 화자 미끄러짐)는
모델 탓이 아니라 프롬프트가 만든 모양이다 — 같은 프롬프트에서 Haiku가 다섯 다,
Sonnet이 넷, Opus가 둘을 낸다(§2.4). 자동 생성에 쓸 수 있는 모델은 kanana(금동이)
하나이며(§2.2), 저장소 소유자가 평가 기준을 "짐작은 용인, 면책·되뇜은 최소"로
바꿔(결정 12) 최적 프롬프트가 **E2SN**으로 정해졌다(§5.6). 헌법 1.5.0이 이 결정을
이미 반영해 커밋됐다(`5a061b6`).

이 스펙은 리포트 §7의 결정 1~11을 `src/diary/prompt.ts`에 옮긴다. 새 기능이 아니라
**같은 함수(`buildPrompt()`)가 내는 문자열을 바꾸는 것**이다. 판정 4갈래·018 프리필
경계·`llama-port.ts` 원칙 IV 경계는 건드리지 않는다.

원본 문자열은 my-ollama `concept-prompt-experiment` 브랜치(`cdabf64`)의
`src/fixtures/alpharium/concept-candidates.ts`(E2SN 조립)와 `conditions.ts`에 있다.
손으로 옮겨 적지 않고 그 파일에서 가져온다. 완료 후 my-ollama의
`scripts/concept-prompt/gen-baseline.ts`로 6케이스 프롬프트를 뽑아 `buildCandidate('E2SN', …)`
출력과 바이트가 같은지 확인한다 — 한 글자라도 다르면 리포트 수치는 근거가 아니다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 금동이 일기가 짐작으로 하루를 잇는다 (Priority: P1)

사용자가 홈에서 "일기 쓰기"를 눌러 금동이(kanana)로 사진 없는 하루의 일기를
생성하면, 일기가 신호(시각·자리·거리)를 짐작의 말투로 이어 한 편을 쓴다.
"오늘은 사진도 없고 다닌 자리도 남지 않았다. 무엇을 했는지 나는 알 수 없다"처럼
못 본 것을 나열하며 끝나지 않고, "집에서 쉬는 하루였을지도 모른다"처럼 마지막
짐작에서 끝난다.

**Why this priority**: 이것이 결정 12 채택의 실체다. 이 흐름이 안 되면 스펙 전체가
의미 없다. 리포트 §5.6이 이 조합(E2SN, 금동이, 사진 없는 날)에서 면책 2/18,
되뇜 1/18, 짐작 18/18을 실측했다.

**Independent Test**: 금동이로 사진 없는 하루 3편을 실기기에서 생성해 (a) 마지막
문단이 "못 봤다/기록이 없다" 진술로 끝나지 않는가, (b) `unfinished`·`echo` 거부가
현행보다 늘지 않았는가, (c) 날짜·"라벨: 값" 신호 줄이 일기 첫머리에 그대로
옮겨지지 않는가를 눈으로 본다. 채점 코드는 넣지 않는다.

**Acceptance Scenarios**:

1. **Given** 금동이가 준비됐고 사진 0장·자리 0곳인 하루, **When** "일기 쓰기"를
   누른다, **Then** 일기가 저장되고 마지막 문장이 짐작의 말투(`~였을지도 모른다` 등)로
   끝난다.
2. **Given** 사진 5장(잘림)·자리 3곳인 하루, **When** 금동이로 생성한다, **Then**
   일기가 사진 수·시각 목록을 나열하지 않고 문장으로 녹여 쓴다.
3. **Given** 아직 끝나지 않은 오늘(정오 이후), **When** 금동이로 생성한다, **Then**
   "오늘은 아직 다 가지 않았다"가 프롬프트에 실리고, `SPEAKER_RULES` 되뇜으로
   `echo` 거부되는 빈도가 현행 `DAY_STILL_OPEN` 대비 늘지 않는다.

---

### User Story 2 - 새 프롬프트가 my-ollama 실측과 바이트 단위로 일치한다 (Priority: P1)

구현이 끝나면 my-ollama `gen-baseline.ts`가 새 `prompt.ts`로 6케이스 프롬프트를
생성하고, 그 출력이 `concept-candidates.ts`의 `buildCandidate('E2SN', …)` 출력과
바이트 단위로 같다.

**Why this priority**: 리포트 §5.6의 수치(면책 2/18, 되뇜 1/18 등)는 특정 문자열에
대한 것이다. 프롬프트가 한 글자라도 다르면 그 수치는 이 구현의 근거가 아니게 되고,
KV 캐시 프리필(018)도 빗나간다.

**Independent Test**: `ALPHARIUM_DIR=<경로> npx tsx scripts/concept-prompt/gen-baseline.ts`를
036 브랜치에서 돌려 `baseline.json`을 뽑고, 6케이스 × 금동이 프롬프트를
`buildCandidate('E2SN', case, baselineRow).prompt`와 문자열 비교한다.

**Acceptance Scenarios**:

1. **Given** 036 구현이 끝난 `prompt.ts`, **When** `gen-baseline.ts`를 돌린다,
   **Then** 6케이스(`empty`/`photos-places`/`truncated`/`day-open`/`caption-ko`/`caption-en`)
   전부에서 금동이 프롬프트가 E2SN 조립 결과와 정확히 같다.
2. **Given** 같은 프롬프트, **When** `promptPrefix('quiet')`와 `buildPrompt()` 앞부분을
   비교한다, **Then** `buildPrompt()`가 언제나 `promptPrefix()`로 시작한다(018 P8 유지).

---

### User Story 3 - 사용자 지정 이름이 새 머리에 흐른다 (Priority: P2)

035에서 사용자가 캐릭터 이름을 지을 수 있게 됐다. 새 머리의 호칭 줄
("너는 '___'이라 불린다.")이 `displayNameOf(character, customNames)`를 써서 사용자가
지은 이름을 반영하되, 호칭 줄 자체는 접두사(`fixedHead`)에 그대로 남는다.

**Why this priority**: 035 FR-020이 확정한 것 — 호칭 줄을 접두사에서 빼면 한국어
캐릭터 셋의 접두사가 같아져 018 P11이 막으려던 KV 캐시 오재사용이 발생한다. 새
머리에서도 이 성질이 유지돼야 한다.

**Independent Test**: `customNames = { quiet: '복실이' }`로 `promptPrefix('quiet', customNames)`를
부르면 호칭 줄이 "너는 '복실이'이라 불린다."로 나오고, 나머지 줄은 불변임을 계약
테스트로 확인한다.

**Acceptance Scenarios**:

1. **Given** 사용자가 금동이를 "복실이"로 지음, **When** 일기를 생성한다, **Then**
   프롬프트 호칭 줄이 "복실이"를 쓰고 `DiaryEntry.authorName`에 그 시점 이름이
   스냅샷된다(035 유지).
2. **Given** 이름 미지정, **When** 프롬프트를 만든다, **Then** 호칭 줄이 로스터
   기본값("금동이")을 쓴다.

---

### Edge Cases

- **루이·오드로 자동 생성을 시도하면?** 문장형 신호(한국어 숫자 낱말)와 새 머리는
  금동이(kanana) 기준으로 검증됐다. 루이·오드는 자동 생성 대상에서 빠지므로(결정 6)
  이 스펙은 그 경로를 바꾸지 않는다. 두 캐릭터가 사용자 선택으로 남아 수동 생성될
  때 어떤 머리를 받는지는 이 스펙의 범위 밖이며, 현행 `SPEAKER_RULES`/`TITLE_INSTRUCTION`을
  그대로 받는다(회귀 없음).
- **샤오바이·모카(중국어·영어)?** 문장형 신호는 한국어 숫자 낱말("다섯 장", "세 곳")이라
  다른 언어에 그대로 못 쓴다. 두 캐릭터는 모델 교체 대상(결정 5, 별도 스펙)이고 이
  스펙은 건드리지 않는다 — 현행 경로 유지.
- **캡션 없는 사진 날의 지어내기?** E2SN에서도 캡션 없는 사진이 지어내기의 주된
  자리다(§5.4). 이 스펙은 프롬프트만 바꾸며, "사진 있는 날 VLM 항상 돌림"은 `vision/`
  설정 결정으로 이 스펙의 범위 밖이다(결정 8, 관측만 기록).
- **`placeName`이 붙는 날?** 자리 이름은 지어내기의 씨앗이다(결정 10). E2SN은 현행
  `placeName` 게이트를 그대로 쓴다 — 이 스펙이 게이트를 풀거나 조이지 않는다.
- **6케이스 중 하나에서 바이트가 어긋나면?** US2가 실패한 것이다. 어긋난 자리를
  찾아 `prompt.ts`를 E2SN 조립과 맞춘다. `concept-candidates.ts` 쪽을 고치지 않는다
  (그쪽이 실측의 기준이다).

## Requirements *(mandatory)*

### Functional Requirements

#### 새 머리 (결정 1·2·4 — §5.6 E2SN, §3.1)

- **FR-001**: `SPEAKER_RULES`(현행 8줄)를 E2SN 머리 규칙(E2_RULES 5줄)으로 교체한다.
  내용은 my-ollama `concept-candidates.ts`의 `E2_RULES` 상수 그대로다. 이 규칙은
  "본 것으로 주인의 하루를 짐작하는 글"을 명시하고, "알 수 없는 것"의 예시 나열
  (날씨·먹은 것·만난 사람·집에서 한 일)을 빼며, "마지막 문장은 그날에 대한 짐작으로
  끝내라"를 포함한다.
- **FR-002**: 프롬프트에서 "모른다고 쓴 일기가 지어낸 일기보다 낫다"는 문장을
  뺀다(헌법 1.5.0 MUST). E2_RULES에 이 문장이 없다.
- **FR-003**: `TITLE_INSTRUCTION`(현행 6문장)을 E2SN 제목 지시문(E2_TITLE 4문장)으로
  교체한다. 이름 든 반례("'금동이의 오늘 일기'", "'루이의 하루'")를 "날짜나 이름만
  넣은 제목"으로 바꾸고, 서식 기호 나열("#, *, **, -")을 "서식 기호"로 뭉뚱그린다.
  내용은 `concept-candidates.ts`의 `E2_TITLE` 상수 그대로다.
- **FR-004**: 페르소나 톤 줄은 금동이(quiet)만 받는다 — `E_TONE.quiet` =
  "담담하게, 짧게 쓴다." 이 줄은 새 머리에서 E2_RULES 뒤, E2_TITLE 앞에 온다.
  루이·오드·샤오바이·모카는 자동 생성 대상이 아니므로 이 스펙에서 톤 줄을 정하지
  않는다.
- **FR-004a**: 톤 줄이 그 모델의 씨앗과 같은 방향이라는 근거를 코드 주석에 남긴다
  (헌법 1.5.0 원칙 III MUST) — 리포트 §3.1: "짧게 적는다"를 넣은 B·BA·B2·BA2 72런에서
  글자 238~311(base 464), 잘림 0, 톤 이행 83~94%. 씨앗("짧고 정확하다", 006·007 실측)과
  같은 방향이다.
- **FR-005**: 호칭 줄("너는 '___'이라 불린다.")은 새 머리에서도 `displayNameOf(character,
  customNames)`를 쓰고 접두사(`fixedHead`)에 남는다(035 FR-020, 018 P11). E2SN 머리의
  첫 줄은 "너는 '___'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이
  아니다."이며, 호칭이 이 줄 안에 있다.

#### 문장형 신호 + 날짜 삭제 (결정 9 — §5.6 손잡이 S·N)

- **FR-006**: 신호 줄을 "라벨: 값" 형식에서 문장 형식으로 바꾼다. `concept-candidates.ts`의
  `sentenceSignalLines()`와 같은 문안:
  - 머리줄: 날짜 없이 "오늘 내가 본 것은 이렇다." (withDate=false)
  - 사진(known, ≥1장): "사진은 {N}장이 남았다. {시각 목록}에 찍혔다."
  - 사진(none): "사진은 없었다." / 사진(unknown): "사진은 모른다. {reason}."
  - 자리(known): "자리는 {N}곳에 남았고, 가장 먼 두 곳은 {거리}쯤 떨어져 있다.
    사진 {M}장 중 {K}장에서 얻은 자리다."
  - 자리(none): "다닌 자리는 남지 않았다." / 자리(unknown): "다닌 자리는 모른다.
    {reason}."
  - 한국어 숫자 낱말(`koHour`·`koCount`·`koMeters`)을 쓴다.
- **FR-007**: `buildPrompt()`의 날짜 머리줄(`${request.signals.date}에 네가 본 것:`)을
  없앤다. 본문 어디에도 `signals.date`를 쓰지 않는다. `buildRequest()`·`DiaryRequest`의
  `signals.date` 필드 자체는 건드리지 않는다(서명 무변경) — 프롬프트에서만 안 쓴다.
- **FR-008**: `none`/`unknown` 구분은 문장형에서도 유지된다("없었다" vs "모른다.
  {reason}") — 004가 값에서 지킨 구분이 여기서 무너지지 않는다(헌법 원칙 V).
- **FR-009**: 관측 통로가 없는 축(걸음·배터리·연결)은 문장형에서도 프롬프트에 싣지
  않는다 — `USER_VISIBLE_SIGNAL_AXES`가 유일한 판정처다(012, 헌법 원칙 V MUST NOT).
  현행과 동일하게 `sentenceSignalLines()`에 세 축이 없다.
- **FR-010**: 잘린 사진 경고·자리 한계 문장은 문장형 신호에서도 조건부로 붙는다
  (`S_TRUNCATED`·`S_PLACES`). 문안은 `concept-candidates.ts` 상수 그대로:
  - `S_TRUNCATED` = "이것이 그날 사진의 전부는 아니다. 더 있을 수 있다."
  - `S_PLACES` = "이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니다."
  - `S_DAY_OPEN` = "오늘은 아직 다 가지 않았다. 이 뒤에 무슨 일이 더 있을지는 모른다."
  - `S_VISION_PARTIAL` = "사진이 더 있었지만 그중 몇 장만 보았다."
- **FR-011**: `DAY_STILL_OPEN`(012)을 `S_DAY_OPEN`으로 교체한다. 사진 축과 무관하게
  붙는 성질(신호 목록과 독립된 자리, `SPEAKER_RULES` 다음)은 유지한다.

#### 캡션 감싸기 (결정 3 — §4.1 A-wrap)

- **FR-012**: 캡션 줄을 "내가 {N}시에 담은 장면: {캡션}" 틀로 감싼다
  (`concept-candidates.ts`의 `wrappedCaptionLines()`). 현행 "사진에 담긴 것:" 머리줄 +
  "- {N}시: {캡션}" 목록을 대체한다.
- **FR-013**: 감싼 캡션 묶음 뒤에 고정 문장 `SCENE_LIMIT`을 한 줄 붙인다 —
  "이 장면들 속 사람이 누구인지, 주인과 어떤 사이인지 나는 모른다. 사진에 찍힌 순간
  밖에서 그 사람이 무엇을 했는지도 모른다." 이 줄은 신호 값을 담지 않으므로 되뱉기
  판정 대상(`instructionLines()`)에 들어간다.
- **FR-014**: 인물 조항을 `SPEAKER_RULES`(머리)에 더하지 않는다(A-rule 기각, §4.1).
  머리에서 "그 사람이 무엇을 했는지 쓰지 마라"를 읽은 kanana가 본문에서 정확히 그걸
  쓴다(화자 ok 17%). 감싸기(`SCENE_LIMIT`)만으로 kanana는 잡힌다.
- **FR-015**: VLM 쪽(`src/vision/`)은 건드리지 않는다. 캡션 언어는 영어 그대로다
  (결정 3, §4.2).
- **FR-016**: 캡션 한계 줄(`VISION_PARTIAL`/`VISION_UNREAD`/`VISION_NONE_READ`)의
  현행 동작은 유지하되, 문장형 신호 흐름에 맞춰 `S_VISION_PARTIAL` 문안을 쓴다.
  캡션이 하나도 없을 때 "사진이 없었다"와 구분되는 "사진은 있었으나 내용을 하나도
  보지 못했다"는 유지한다(SC-006 계열).

#### 조립 구조 불변 (결정 11 관련, 018·005)

- **FR-017**: `fixedHead()`와 `buildPrompt()`가 같은 배열에서 나오는 구조를 유지한다.
  새 머리(E2_RULES + 톤 줄 + E2_TITLE + 호칭 + 언어 줄)가 `fixedHead()`에 있고,
  `promptPrefix()`가 그것을 join한다.
- **FR-018**: `buildPrompt()`의 결과는 언제나 `promptPrefix(character, customNames)`로
  시작한다(018 P8). `prompt.test.ts` P8이 그대로 통과한다.
- **FR-019**: `instructionLines()`가 반환하는 되뱉기 판정 비교 줄은 새 머리·새 고정
  문장(`SCENE_LIMIT`·`S_*` 고정 줄)에서 나오고, 신호 값이 든 줄(문장형 신호 본문)은
  넣지 않는다 — 캡션·신호가 일기에 나오는 것은 정상이므로 비교 대상이면 오탐이 된다
  (005 research.md §7, 011 P5). `prompt.test.ts` P7이 이 일치를 검사한다.
- **FR-020**: 판정 갈래는 4개 그대로다(`unfinished`/`empty`/`echo`/`language`).
  면책·되뇜·인물형 지어내기를 재는 코드를 제품에 넣지 않는다(헌법 1.5.0 원칙 IV MUST).
  `acceptance.ts`는 한 줄도 고치지 않는다.
- **FR-021**: 꼬리에 제목 규칙을 한 줄 더 붙이지 않는다(T 손잡이 기각, §5.6). kanana가
  "그다음 줄은 비우고"를 본문에 `비움`으로, "첫 줄은 제목"을 `제목:` 라벨로 베낀다.
  꼬리는 현행 `TAIL`("이 기록으로 그 하루의 일기를 써라.") 한 줄 그대로다.
- **FR-022**: `llama-port.ts`의 원칙 IV 경계는 건드리지 않는다 — `RunResult`가
  `{ text, ending }` 둘만 갖는 것, 토큰 콜백을 `completion()`에 안 넘기는 것 그대로다.

#### 문자열 출처와 검증 (핸드오프 §2)

- **FR-023**: E2SN 문자열은 my-ollama `concept-prompt-experiment` 브랜치의
  `src/fixtures/alpharium/concept-candidates.ts`(`E2_RULES`·`E2_TITLE`·`S_*`·`SCENE_LIMIT`·
  `T_TAIL`은 안 씀)와 `conditions.ts`에서 가져온다. 손으로 옮겨 적으며 오타를 내지
  않는다.
- **FR-024**: 구현 후 my-ollama `scripts/concept-prompt/gen-baseline.ts`를 036 브랜치에
  대해 돌려 `results/concept-prompt/prompts/baseline.json`을 생성하고, 6케이스 × 금동이
  프롬프트가 `buildCandidate('E2SN', …)` 출력과 바이트 단위로 같은지 확인한다.
  다르면 `prompt.ts`를 E2SN 조립과 맞춘다(반대 방향 금지).
- **FR-025**: 검증용 6케이스 프롬프트를 금동이로 뽑아 파일로 낸다(스펙 `quickstart.md`
  또는 `logs/`에). 이 파일은 실측의 기준이 무엇이었는지를 되짚는 자료이며 제품
  코드가 아니다.

### Key Entities

- **E2SN 머리**: E2_RULES(5줄) + 톤 줄(금동이만) + E2_TITLE(4문장) + 호칭·언어 줄.
  캐릭터별로 바뀌는 것은 호칭·언어·톤 줄뿐이며, 018 프리필의 대상이다(신호에 따라
  안 바뀜).
- **문장형 신호**: `sentenceSignalLines()`가 내는 줄들. 한국어 숫자 낱말로 시각·개수·
  거리를 쓰고, `none`/`unknown`을 다른 문장으로 가른다. 날짜를 안 쓴다. 신호 값이
  들었으므로 되뱉기 판정 비교 대상이 아니다.
- **감싼 캡션**: "내가 {N}시에 담은 장면: {영어 캡션}" 줄들 + `SCENE_LIMIT` 고정 줄.
  캡션 본문은 신호이고, `SCENE_LIMIT`은 고정 문장이라 판정 대상이다.
- **gen-baseline 검증**: my-ollama 스크립트가 036 `prompt.ts`를 직접 import해 6케이스
  프롬프트를 뽑고 E2SN 조립과 대조. 코드 변경은 alpharium 쪽뿐이고, my-ollama는
  읽기만 한다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 6케이스(`empty`/`photos-places`/`truncated`/`day-open`/`caption-ko`/`caption-en`)
  전부에서 036 `prompt.ts`가 낸 금동이 프롬프트가 my-ollama `buildCandidate('E2SN', …)`
  출력과 바이트 단위로 일치한다.
- **SC-002**: `buildPrompt()`가 6케이스 전부에서 `promptPrefix('quiet')`로 시작한다
  (018 P8 유지).
- **SC-003**: 기기 없는 테스트(`npm test`)와 lint(eslint·tsc·헌법 검사·prettier)가
  전부 통과한다. `acceptance.ts`는 diff 0줄이다.
- **SC-004**: 실기기에서 금동이로 사진 없는 날 3편, 사진 있는 날 3편을 생성해 저장
  성공률이 현행 대비 떨어지지 않고(`unfinished`·`echo` 거부가 늘지 않고), 6편 모두
  마지막 문단이 "못 봤다/기록이 없다" 진술로 끝나지 않는다(§7-7).
- **SC-005**: 실기기 일기 6편 중 어느 것도 기록에 없는 사람·관계를 단언하지 않는다
  (짐작 어미 없는 인물형 지어내기 0편). 짐작 어미가 붙은 장소 추측은 헌법 1.5.0이
  용인한 것이므로 감점하지 않는다.
- **SC-006**: 사용자 지정 이름(`customNames.quiet = '복실이'`)으로 프롬프트를 만들면
  호칭 줄이 그 이름을 쓰고, 나머지 머리 줄은 이름 미지정일 때와 같다.
- **SC-007**: 생성 시간(writingMs)이 현행 대비 줄어든다 — E2SN 출력 중앙값 416자
  (BA 276, base 464)이나, S20+ 환산 디코드는 문장형·짧은 톤 줄로 현행보다 짧다는
  것이 리포트 추정이다(결정 7, −20초 예상). 실측 1회로 방향만 확인한다.

## Assumptions

- 금동이(kanana) 모델은 이미 준비돼 있다(029 온보딩 필수 에셋). 이 스펙은 모델
  다운로드·검증을 건드리지 않는다.
- my-ollama `concept-prompt-experiment` 브랜치(`cdabf64`)가 로컬에 fetch돼 있다.
  `concept-candidates.ts`·`gen-baseline.ts`·`concept-cases.ts`를 읽을 수 있다.
- 루이·오드로 자동 생성을 하지 않는다는 것은 배선 계층(`resolve-generation.ts`,
  029)에서 이미 정해진다. 이 스펙은 프롬프트만 바꾸며 캐릭터 선택 로직은 건드리지
  않는다 — 다만 루이·오드가 수동 선택으로 `buildPrompt()`에 닿으면 **새 머리를
  받는다**(문장형 신호는 한국어라 세 한국어 캐릭터 모두 유효). 톤 줄만 금동이
  한정이다.
- `src/diary/character-name.ts`의 `displayNameOf`와 `CustomNames` 타입은 035에서
  이미 있다. 이 스펙은 그 함수를 새 머리에서 계속 쓸 뿐 고치지 않는다.
- 캡션 언어가 영어라 감싼 틀("내가 N시에 담은 장면:")은 한국어이고 그 안의 캡션은
  영어인 혼합이 정상이다(011 기존 상태 유지).
- 새 네이티브 모듈·빌드 설정 변경이 없으므로 release 재확인은 생략한다(012 기준).
  debug 실기기 1회로 충분하다.
- my-ollama 쪽 파일(`concept-candidates.ts` 등)은 이 스펙에서 수정하지 않는다 —
  그쪽이 실측의 기준이다. 바이트가 어긋나면 alpharium `prompt.ts`를 맞춘다.

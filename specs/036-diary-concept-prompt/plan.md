# Implementation Plan: 일기 자동 생성 프롬프트 재구성 (E2SN)

**Branch**: `036-diary-concept-prompt` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-diary-concept-prompt/spec.md`

## Summary

리포트 §7 결정 1~11을 `src/diary/prompt.ts`에 옮긴다. 세 자리:

1. **새 머리** — `SPEAKER_RULES`(8줄) → `E2_RULES`(5줄), `TITLE_INSTRUCTION`(6문장) →
   `E2_TITLE`(4문장), 금동이 톤 줄 `E_TONE.quiet`. 한국어 캐릭터 셋에 적용
   (Clarification Q1). 호칭 줄은 접두사 유지(035·018).
2. **문장형 신호 + 날짜 삭제** — `describe()`의 "라벨: 값" → `sentenceSignalLines()`의
   문장형(한국어 숫자 낱말). `buildPrompt()`의 날짜 머리줄 제거.
3. **캡션 감싸기** — `visionLines()`의 "사진에 담긴 것:" 목록 → "내가 {N}시에 담은
   장면: {캡션}" + `SCENE_LIMIT` 고정 줄.

`chinese`·`english`는 현행 머리·라벨형 신호·라벨형 캡션을 유지한다 —
`fixedHead()`·`signalLines()`·`visionLines()`가 `LANGUAGE[character] === "한국어"`로
분기한다. 판정 4갈래·018 프리필 성질·`llama-port.ts` 경계는 무변경.

문자열은 my-ollama `concept-prompt-experiment`(`cdabf64`)의 `concept-candidates.ts`·
`conditions.ts`에서 가져온다. 완료 후 `gen-baseline.ts`로 세 한국어 캐릭터 × 6케이스
= 18프롬프트가 `buildCandidate('E2SN', …)`와 바이트 일치하는지 확인한다.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86, Expo SDK 57

**Primary Dependencies**: 없음 추가 — `src/diary/prompt.ts` 문자열·분기만 바꾼다.
`src/diary/character-name.ts`(`displayNameOf`, 035)는 이미 있고 재사용만 한다.

**Storage**: N/A — `DiaryEntry`·`DiaryRequest` 서명 무변경. `signals.date` 필드는
남기고 프롬프트에서만 안 쓴다.

**Testing**: jest(`test:logic` — `.ts` 순수 로직), `prompt.test.ts`(P7·P8·P12 회귀),
신규 계약 테스트(E2SN 조립 대조, 언어 분기). my-ollama `gen-baseline.ts` 바이트 대조는
alpharium 밖 검증이라 `npm test`에 안 들어간다. 실기기 Maestro는 기존 흐름 회귀 +
금동이 생성.

**Target Platform**: Android (SM-S901N / Galaxy S22, dev debug 빌드로 검증).

**Project Type**: Mobile app (단일 저장소, `src/` + `__tests__/` + `.maestro/`).

**Performance Goals**: 생성 시간(writingMs) 현행 대비 감소 방향 확인(§5.6 추정
디코드 −20초). 실측 1회로 방향만.

**Constraints**:
- `buildPrompt()`는 결정적 순수 함수여야 한다(005 P6) — `new Date()`·난수 금지.
- `promptPrefix()`와 `buildPrompt()` 앞부분이 바이트 동일해야 한다(018 P8).
- `instructionLines()`와 `buildPrompt()`가 같은 상수에서 나와야 한다(005 P7).
- 판정 갈래 4개 고정(`acceptance.ts` diff 0줄, 원칙 IV).
- 프롬프트는 `prompt.ts` 한 곳(005 FR-013b).

**Scale/Scope**: `prompt.ts` 한 파일(~493줄 → 비슷하거나 약간 늘어남). 신규 헬퍼
3개(`koHour`·`koCount`·`koMeters`). 신규 상수 ~12개(E2_RULES·E2_TITLE·E_TONE·S_*·
SCENE_LIMIT). 계약 테스트 1개 스위트. 헌법 검사 변경 없음(새 경계 안 만듦).

## Constitution Check

*GATE: Phase 0 전 통과. Phase 1 후 재확인.*

### 원칙 I — 온디바이스가 제품이다

✅ 위반 없음. 추론 위치·정책을 건드리지 않는다. 프롬프트 문자열만 바꾼다.
거부 시 파일을 건드리지 않는 `generate()` 흐름 무변경.

### 원칙 II — 화자는 휴대폰이고, 시야는 좁다

✅ **이 스펙이 헌법 1.5.0 신설 조항을 실제로 구현하는 자리다.**
- 짐작 MAY: `E2_RULES`가 "본 것으로 주인의 하루를 짐작하는 글"을 명시. 짐작의 말투
  (`~였을 것 같다`) 지시 포함.
- "모른다고 쓴 일기가 지어낸 일기보다 낫다" 제거(FR-002): `E2_RULES`·`E2_TITLE`에
  그 문장 없음. 예시 나열(날씨·먹은 것·만난 사람·집에서 한 일)도 없음.
- 면책·되뇜 SHOULD NOT: 신호 줄 문장화(S)로 "라벨: 값" 베낄 재료 제거, 날짜 삭제(N)로
  날짜 제목 제거. `E2_RULES` 마지막 줄이 "마지막 문장은 그날에 대한 짐작으로 끝내라".
- 사람·관계·단정 MUST NOT: `E2_RULES` 3번째 줄이 "기록에 없는 장소 이름, 사람, 물건,
  사건을 끌어와 짐작을 채우지 마라". `SCENE_LIMIT`이 캡션 인물을 이야기 밖에 둔다.
- 화자가 뒤집히는 것 MUST NOT: `SCENE_LIMIT` + 감싼 캡션 틀("내가 담은 장면:")로
  캡션 인물 미끄러짐을 잡는다(§4.1, kanana는 감싸기만으로 잡힘).

### 원칙 III — 모델은 캐릭터다

✅ 캐릭터에서 오는 것은 **이름·언어·톤 줄**뿐(FR-005·FR-004). 모델 식별자 없음.
- 톤 줄은 헌법 1.5.0 개정 조항이 허용한 MAY. 금동이만 실측 근거(§3.1) — 씨앗
  ("짧고 정확하다")과 같은 방향임을 코드 주석에 남긴다(FR-004a, 1.5.0 원칙 III MUST).
- 루이·오드는 E2SN 머리를 받되 톤 줄 없음(§3.1 "채택 안 함"). 그 근거도 주석에.
- `persona.ts`·`roster.ts`는 한 줄도 안 고친다. `displayNameOf`만 재사용.

### 원칙 IV — 측정 장치를 제품에 들이지 않는다

✅ 위반 없음.
- 판정 갈래 4개 고정. `acceptance.ts` diff 0줄(FR-020).
- 면책·되뇜·인물형 지어내기를 재는 코드를 넣지 않는다. 실측·채점은 my-ollama
  (`gen-baseline.ts` 바이트 대조는 "조립대로 옮겼는가"이지 출력 품질 채점이 아니다).
- `llama-port.ts` 경계 무변경 — `RunResult` `{ text, ending }` 둘뿐, 토큰 콜백 안 넘김.
- 꼬리 제목 규칙(T) 안 붙임(FR-021) — kanana가 지시문을 베끼는 것을 §5.6이 확인.

### 원칙 V — 관측된 사실과 추측을 구분해 기록한다

✅ 위반 없음.
- `none`/`unknown` 구분이 문장형에서도 유지("없었다" vs "모른다. {reason}") — FR-008.
- 관측 통로 없는 축(걸음·배터리·연결)은 문장형에서도 프롬프트에 안 실림(FR-009).
  `USER_VISIBLE_SIGNAL_AXES`가 유일한 판정처. `sentenceSignalLines()`에 세 축 없음.
- 헌법 1.5.0이 원칙 V에 더한 SHOULD NOT(일기 끝을 면책으로 맺지 않는다)을 `E2_RULES`
  맺음 규칙이 구현.

### 개발 방식 / Governance

✅ 헌법 1.5.0을 코드보다 먼저 커밋함(`5a061b6`). 계약을 먼저 정하고 테스트를 먼저
쓴다. `main`에서 작업하지 않는다(`036-diary-concept-prompt` 브랜치).

### 헌법 검사(`scripts/`)

변경 없음. 새 경계를 만들지 않는다 — `prompt.ts`는 이미 원칙 II의 통과 지점이고,
`UI_TOUCHES_PROMPT`·`checkPromptFile`(035 연출 계층 차단)이 그대로 유효하다.

**GATE 결과: 통과.** 위반 없음. Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/036-diary-concept-prompt/
├── plan.md              # 이 파일
├── spec.md              # /speckit-specify + /speckit-clarify 출력
├── research.md          # Phase 0 — 문자열 출처·헬퍼 이관·언어 분기 결정
├── data-model.md        # Phase 1 — 프롬프트 조립 구조(엔티티 대신)
├── quickstart.md        # Phase 1 — gen-baseline 바이트 대조 + 실기기 확인 절차
├── contracts/
│   └── prompt-e2sn.md   # Phase 1 — 새 머리·문장형 신호·감싼 캡션의 계약
├── checklists/
│   └── requirements.md   # /speckit-specify 출력 (clarify에서 갱신)
└── tasks.md             # /speckit-tasks 출력 (이 명령이 만들지 않음)
```

### Source Code (repository root)

```text
src/diary/
├── prompt.ts            # ★ 유일한 변경 파일 — 세 자리(머리·신호·캡션) + 언어 분기
├── character-name.ts    # 무변경 — displayNameOf 재사용
├── persona.ts           # 무변경 (014 계약 P2·P3·P4 보존)
├── acceptance.ts        # 무변경 (원칙 IV, diff 0줄)
├── request.ts           # 무변경 — buildRequest 서명 그대로
└── types.ts             # 무변경 — DiaryRequest·DaySignals 서명 그대로

__tests__/diary/
├── prompt.test.ts       # 회귀 — P7·P8·P12 통과 유지 + 한국어/외국어 분기 추가
└── prompt-e2sn.test.ts  # 신규 — E2SN 조립 대조, 언어 분기, 톤 줄 캐릭터별

.maestro/
└── (기존 흐름 회귀 — generate-diary·diary-user-path 등, 신규 없음)
```

**Structure Decision**: 단일 저장소 mobile app. 변경은 `src/diary/prompt.ts` 한 파일에
집중된다 — 새 기능이 아니라 문자열·분기 리팩터라 새 계층·새 경계를 만들지 않는다.
검증 스크립트(`gen-baseline.ts` 대조)는 my-ollama 쪽이며 alpharium 코드가 아니다.

## Phase 0 산출: research.md

다음을 해결한다:

1. **`ConceptCase.signals` ↔ alpharium `DaySignals` 매핑** — 리서치 결과 **동일 모양**.
   `concept-cases.ts`가 alpharium 타입을 그대로 복제했고, `gen-baseline.ts`가 실제
   `buildRequest(c.signals, …)`를 부른다. 매핑 코드 불필요.
2. **`koHour`·`koCount`·`koMeters` 헬퍼 이관** — `concept-candidates.ts`에서 alpharium
   `prompt.ts`로 옮긴다(인라인 아님, 이름 있는 함수로 — `sentenceSignalLines()`가
   여러 번 부른다). 그대로 복사하고 출처 주석을 단다.
3. **언어 분기를 어디에 둘지** — `LANGUAGE[character] === "한국어"` 하나로 판정.
   `fixedHead()`가 머리를, `signalLines()`가 신호 형식을, `visionLines()`가 캡션
   형식을 분기. `instructionLines()`도 같은 분기(되뱉기 비교 대상이 머리를 따라감).
4. **`E_TONE` 이관** — 다섯 캐릭터 전부 옮기되 `quiet`만 실제로 쓰고
   `narrative`/`imaginative`는 빈 문자열(줄 안 붙음). §3.1 "채택 안 함" 근거 주석.
5. **`gen-baseline.ts` 검증 절차** — my-ollama에서 `ALPHARIUM_DIR=<경로> npx tsx
   scripts/concept-prompt/gen-baseline.ts` → `baseline.json` 30행 → 한국어 3캐릭터 ×
   6 = 18을 `buildCandidate('E2SN', case, row)`와 문자열 `===`. chinese·english × 6은
   036 구현 전 `git stash` 상태로 한 번 더 뽑아 회귀 대조.
6. **`DAY_STILL_OPEN` → `S_DAY_OPEN` 문안 변경 영향** — 012가 `echo` 거부를 관측한
   자리. 새 문안도 `instructionLines()`에 실려 되뱉기 판정 대상이 된다(회귀 테스트
   P2 갱신).

## Phase 1 산출

### data-model.md

프롬프트 조립 구조를 엔티티처럼 기술: E2SN 머리(줄 순서·캐릭터별 변수), 문장형 신호
(`none`/`unknown`/`known` 갈래별 문장), 감싼 캡션(캡션 줄 + `SCENE_LIMIT`), 언어 분기
표(한국어 3 / 외국어 2가 각 함수에서 무엇을 받는지).

### contracts/prompt-e2sn.md

- **E1**: 한국어 캐릭터의 `fixedHead()` = 호칭 줄 + `E2_RULES` + (금동이면 톤 줄) +
  `E2_TITLE` + "" + "{언어}로 써라." + "". `buildCandidate('E2SN', …).prefix`와 바이트
  동일.
- **E2**: `sentenceSignalLines()` 출력이 `concept-candidates.ts`의 그것과 문안 동일.
  `none`/`unknown` 구분 유지. 날짜 머리줄 = "오늘 내가 본 것은 이렇다."(withDate=false).
- **E3**: `visionLines()`(한국어) = "내가 {N}시에 담은 장면: {text}" 줄들 + `SCENE_LIMIT`.
- **E4**: `promptPrefix(c, names)` = `buildPrompt(req, vision)`.slice(0, prefix.length),
  6케이스 전부(018 P8).
- **E5**: `instructionLines()`가 새 머리·`SCENE_LIMIT`·`S_*` 고정 줄을 담고, 문장형 신호
  본문은 안 담는다(005 P7).
- **E6**: chinese·english는 현행 `SPEAKER_RULES`·`TITLE_INSTRUCTION`·`describe()`·현행
  `visionLines()`. 036 구현 전 출력과 바이트 동일.
- **E7**: 판정 4갈래 불변. `acceptance.ts` import 그대로, diff 0줄.
- **E8**: 톤 줄 — `quiet`만 붙고 `narrative`·`imaginative`는 안 붙는다. `chinese`·
  `english`는 현행이라 무관.
- 위반 주입: E2_RULES에 "모른다고 쓴 일기가 낫다" 되살리면 → 계약 테스트 실패.
  날짜 머리줄 남기면 → E2 실패. 톤 줄을 narrative에 붙이면 → E8 실패. chinese에
  E2SN 머리 주면 → E6 실패.

### quickstart.md

1. `npm run test:logic` — `prompt.test.ts` + `prompt-e2sn.test.ts` 통과.
2. `npm run lint` — eslint·tsc·헌법 검사·prettier.
3. my-ollama 바이트 대조: `cd ~/Workspace/my-ollama && git checkout concept-prompt-experiment
   && ALPHARIUM_DIR=~/Workspace/alpharium npx tsx scripts/concept-prompt/gen-baseline.ts`
   → 18프롬프트 `buildCandidate('E2SN')` 대조 스크립트(quickstart에 인라인).
4. 실기기(SM-S901N, dev debug): 금동이 사진 없는 날 3편 + 사진 있는 날 3편, 루이·오드
   각 1편(관측), Maestro 회귀(`generate-diary`·`diary-user-path`·`prompt-preview`).

## Phase 1 후 Constitution 재확인

설계가 새 위반을 만들지 않는다:
- 새 계약(E1~E8)이 전부 기존 원칙(II·IV·V, 018 P8, 005 P7)을 못 박는 방향이다.
- 언어 분기가 `LANGUAGE` 상수 하나에 기대므로 "코드가 값을 보고 정한다"(원칙 V MUST
  NOT)에 해당하지 않는다 — `LANGUAGE`는 사람이 못 박은 캐릭터→언어 표다.
- `E_TONE`의 빈 문자열은 "모르는 것을 기본값으로 채우는" 것이 아니다 — "이 캐릭터엔
  톤 줄을 안 붙인다"는 사람이 정한 결정이며 §3.1이 근거다.

**GATE 결과: 통과.**

## Complexity Tracking

*위반 없음 — 비움.*

# Phase 1 Data Model: 프롬프트 조립 구조

**Date**: 2026-09-08 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

이 스펙은 저장 스키마를 바꾸지 않는다(`DiaryEntry`·`DiaryRequest`·`DaySignals` 서명
무변경). "데이터 모델" 대신 **프롬프트 조립 구조**를 기술한다 — `buildPrompt()`가
문자열을 어떻게 쌓는지, 캐릭터 언어에 따라 무엇이 갈리는지.

---

## 1. 언어 분기 표

`LANGUAGE[character]` (기존 `prompt.ts` 상수)로 갈린다.

| 캐릭터 | 언어 | 머리 | 신호 본문 | 캡션 | 되뱉기 비교 줄 |
|---|---|---|---|---|---|
| `quiet` (금동이) | 한국어 | E2SN + 톤 줄 | 문장형 | 감싼 틀 | 새 머리 + `S_*`·`SCENE_LIMIT` |
| `narrative` (루이) | 한국어 | E2SN (톤 줄 없음) | 문장형 | 감싼 틀 | 새 머리 + `S_*`·`SCENE_LIMIT` |
| `imaginative` (오드) | 한국어 | E2SN (톤 줄 없음) | 문장형 | 감싼 틀 | 새 머리 + `S_*`·`SCENE_LIMIT` |
| `chinese` (샤오바이) | 중국어 | **현행** `SPEAKER_RULES` | **현행** 라벨형 | **현행** 목록 | **현행** |
| `english` (모카) | 영어 | **현행** `SPEAKER_RULES` | **현행** 라벨형 | **현행** 목록 | **현행** |

판정 기준: `LANGUAGE[character] === "한국어"`. 로스터에 한국어 캐릭터가 추가되면
자동으로 E2SN 경로를 탄다.

---

## 2. E2SN 머리 (`fixedHead()` 한국어 분기)

줄 순서 (`\n` join):

```
1. 너는 '{displayNameOf(character, customNames)}'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다.
2. {E2_RULES[0]}   너는 주머니와 가방 속에서 하루를 보내서, …본 것으로 주인의 하루를 짐작하는 글이다.
3. {E2_RULES[1]}   아래 기록이 단서의 전부다. 단서가 말해 주는 것은 …
4. {E2_RULES[2]}   무엇을 먹었는지, 누구를 만났는지, … 끌어와 짐작을 채우지 마라.
5. {E2_RULES[3]}   짐작은 '~였을 것 같다', … 단정은 기록에 있는 것에만 쓴다.
6. {E2_RULES[4]}   일기는 기록에 있는 하루 한 편이다. … 마지막 문장은 그날에 대한 짐작으로 끝내라.
7. {E_TONE[character]}   조건부 spread — quiet만 "담담하게, 짧게 쓴다."; narrative·imaginative는 "" 라 원소 자체가 안 들어감(`\n\n` 없음, contracts E8)
8. {E2_TITLE}   첫 줄에 제목을, … 본문 첫 문장은 주인이 그날 한 일에 대한 짐작으로 시작한다. (4문장 " " join, 한 줄)
9. (빈 줄)
10. {LANGUAGE[character]}로 써라.   → "한국어로 써라."
11. (빈 줄)
```

**캐릭터별로 바뀌는 것**: 1번(이름), 7번(quiet만 있음), 10번(언어 — 셋 다 "한국어").
→ 사실상 한국어 캐릭터 셋의 접두사 차이는 **이름과 (quiet의) 톤 줄**뿐. 018 P11이
막으려던 "접두사가 완전히 같아짐"은 이름 줄이 있어 안 일어난다(035 FR-020 재확인).

**`promptPrefix()`** = 1~11번을 `\n` join. `buildPrompt()`가 이 뒤에 본문을 붙인다.

---

## 3. 문장형 신호 (`sentenceSignalLines()` 한국어 분기)

`describe()`의 "라벨: 값"을 대체. 줄 순서:

```
(dayStillOpen이면)  {S_DAY_OPEN}
머리줄:              오늘 내가 본 것은 이렇다.        ← withDate=false, 날짜 없음
사진:
  known, ≥1장:      사진은 {koCount(N,'장')}이 남았다. {times.map(koHour).join(', ')}에 찍혔다.
    complete=false: {S_TRUNCATED}
  known, 0장:       사진은 없었다.
  none:            사진은 없었다.
  unknown:         사진은 모른다. {reason}.
자리:
  known:           자리는 {koCount(visitCount,'곳')}에 남았고, 가장 먼 두 곳은 {koMeters(m)}쯤 떨어져 있다. 사진 {koCount(considered,'장')} 중 {koCount(withLocation,'장')}에서 얻은 자리다.
                   {S_PLACES}
  none:            다닌 자리는 남지 않았다.
  unknown:         다닌 자리는 모른다. {reason}.
(placeName 있으면) 다녀온 곳은 {placeName} 근처였다.
(vision 있으면)   {감싼 캡션 줄들}
                  (available > considered면)  {S_VISION_PARTIAL}
```

**`none`/`unknown` 구분 유지**: "없었다"(none) vs "모른다. {reason}."(unknown).
헌법 원칙 V. FR-008.

**통로 없는 축 제외**: 걸음·배터리·연결은 `sentenceSignalLines()`에 아예 없다.
`USER_VISIBLE_SIGNAL_AXES`를 참조할 필요도 없다 — 문장형 함수가 세 축을 안 만든다.
현행 `signalLines()`는 `USER_VISIBLE_SIGNAL_AXES.steps` 등을 검사하는데, 그 셋이 모두
`false`라 결과가 같다. (만약 나중에 통로가 생기면 `sentenceSignalLines()`도 그 축을
문장형으로 더해야 한다 — 그때 상수를 고친다.)

---

## 4. 감싼 캡션 (`visionLines()` 한국어 분기)

```
현행:  사진에 담긴 것:
       - 12시: {caption}
       - 13시: {caption}

E2SN:  내가 12시에 담은 장면: {caption}
       내가 13시에 담은 장면: {caption}
       {SCENE_LIMIT}
```

`SCENE_LIMIT` = "이 장면들 속 사람이 누구인지, 주인과 어떤 사이인지 나는 모른다.
사진에 찍힌 순간 밖에서 그 사람이 무엇을 했는지도 모른다." — 신호 값을 안 담으므로
`instructionLines()`(되뱉기 비교)에 들어간다.

**캡션 본문은 안 바꾼다** — VLM이 낸 영어 문장 그대로(011). 틀만 한국어.

`vision.captions.length === 0`이면 `visionLines()`는 `[]`(현행과 같음). 그때
`visionLimitLines()`가 `VISION_NONE_READ` 등을 낸다(FR-016, 문안은 한국어 캐릭터도
현행 유지 — `S_VISION_PARTIAL`만 문장형에서 바뀜).

---

## 5. `buildPrompt()` 최종 조립 (한국어 캐릭터)

```
[fixedHead(character, customNames)]        ← §2 (11줄, promptPrefix와 동일)
[sentenceSignalLines(...) 포함 본문]        ← §3 (dayStillOpen·신호·placeName·캡션)
(빈 줄)
이 기록으로 그 하루의 일기를 써라.          ← TAIL (현행 그대로)
```

**현행과의 차이**:
- `${request.signals.date}에 네가 본 것:` 머리줄 **삭제**(FR-007). `signals.date`는
  본문 어디에도 안 쓴다.
- `dayStillOpenPart`가 `[DAY_STILL_OPEN, ""]` → `sentenceSignalLines()` 안에서
  `S_DAY_OPEN`이 맨 앞에 (빈 줄 없이).
- `placeNamePart`가 별도 배열 → `sentenceSignalLines()` 안에서 처리.
- `visionPart`가 별도 → `sentenceSignalLines()` 안에서 처리.

즉 한국어 캐릭터는 **`fixedHead()` + `sentenceSignalLines()` + "" + TAIL** 로 단순화된다.

---

## 6. 상수 목록 (alpharium `prompt.ts`에 추가)

| 상수 | 종류 | 되뱉기 대상 | 출처 |
|---|---|---|---|
| `E2_RULES` | `readonly string[]` (5줄) | ✅ (머리) | `concept-candidates.ts` L368 |
| `E2_TITLE` | `string` (4문장 join) | ✅ (머리) | `concept-candidates.ts` L378 |
| `E_TONE` | `Record<Character, string>` | ✅ (quiet만) | `concept-candidates.ts` L332 |
| `S_DAY_OPEN` | `string` | ✅ | `concept-candidates.ts` L444 |
| `S_TRUNCATED` | `string` | ✅ | L445 |
| `S_PLACES` | `string` | ✅ | L446 |
| `S_VISION_PARTIAL` | `string` | ✅ | L447 |
| `SCENE_LIMIT` | `string` | ✅ | `concept-candidates.ts` L48 |
| `KO_NUM` | `string[]` (13칸) | ❌ (헬퍼) | L403 |
| `koHour` `koCount` `koMeters` | `function` | ❌ | L404~415 |

**현행 상수는 지우지 않는다** — `SPEAKER_RULES`·`TITLE_INSTRUCTION`·`DAY_STILL_OPEN`·
`TRUNCATED_WARNING`·`PLACES_LIMITATION`·`VISION_*` 를 외국어 캐릭터가 계속 쓴다.

---

## 7. 상태 전이 / 검증 규칙

없음 — 순수 함수 조립이다. 검증은 계약(E1~E8)과 `gen-baseline` 바이트 대조.

**결정성**(005 P6): `buildPrompt()`·`sentenceSignalLines()`·`fixedHead()`가 `new
Date()`·난수를 안 읽는다. `koHour(h)`는 인자 `h`(정수)만 본다.

**018 P8**: `buildPrompt(req).startsWith(promptPrefix(req.character, req.customNames))`
— 6케이스 × 한국어 3캐릭터 전부.

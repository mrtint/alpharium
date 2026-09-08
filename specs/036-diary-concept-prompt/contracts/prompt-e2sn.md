# Contract: E2SN 프롬프트 재구성

**Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

계약 테스트는 소스를 직접 읽고(`readFileSync`) `buildPrompt()`·`promptPrefix()`·
`instructionLines()`를 부른다. my-ollama `buildCandidate('E2SN', …)` 대조는 alpharium
밖(quickstart.md §3)에서 한다 — `npm test`에 안 들어간다.

---

## E1 — 한국어 캐릭터의 새 머리

`fixedHead("quiet", {})`가 다음 순서로 나온다:

1. `너는 '금동이'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다.`
2. `E2_RULES[0]` … `E2_RULES[4]` (5줄)
3. `담담하게, 짧게 쓴다.` (`E_TONE.quiet`)
4. `E2_TITLE` (4문장 `" "` join, 한 줄)
5. `""`
6. `한국어로 써라.`
7. `""`

**검사**:
- `promptPrefix("quiet")`가 위 7줄을 `"\n"` join한 것과 정확히 같다.
- `promptPrefix("quiet")`에 `"모른다고 쓴 일기가 지어낸 일기보다 낫다"`가 **없다**
  (FR-002, 헌법 1.5.0).
- `promptPrefix("quiet")`에 `"날씨"` `"먹은 것"` `"만난 사람"` `"집에서 한 일"`을
  나열한 예시 문장이 **없다**(FR-001 — E2_RULES는 "무엇을 먹었는지, 누구를
  만났는지"를 한 문장으로 쓰지 목록 나열이 아니다). ※ E2_RULES[2]에 "먹었는지"
  "만났는지"가 문장으로 들어 있으므로, 검사는 현행 `SPEAKER_RULES`의 목록형
  `"예를 들어 날씨, 주인이 먹은 것, 만난 사람, 집에서 한 일은"` 문자열이 없어졌는지로
  한다.
- `promptPrefix("quiet")`에 `#`, `**` 같은 서식 기호를 **나열한** 문장이 없다
  (FR-003 — `E2_TITLE`는 "서식 기호 없이 보통 문장으로만 쓴다"). 현행
  `TITLE_INSTRUCTION`의 `"#, *, **, - 같은"` 문자열이 없어졌는지로 검사.
- `promptPrefix("quiet")`에 `'금동이의 오늘 일기'` `'루이의 하루'` 반례 문자열이
  **없다**(FR-003).

**위반 주입**: `E2_RULES`에 "모른다고 쓴 일기가 지어낸 일기보다 낫다"를 되살리면 →
E1 실패. `E2_TITLE`에 `'금동이의 오늘 일기'`를 되살리면 → E1 실패.

---

## E2 — 문장형 신호 + 날짜 삭제

한국어 캐릭터의 `buildPrompt()` 본문(`fixedHead()` 이후):

- 머리줄이 `오늘 내가 본 것은 이렇다.` — **날짜가 없다**(FR-007).
- `buildPrompt(req)`에 `req.signals.date`(예: `"2026-01-15"`)가 **문자열로 안
  나온다**. (`signals.date` 필드 자체는 `DiaryRequest`에 남아 있다.)
- 사진 known 2장: `사진은 두 장이 남았다. {koHour}, {koHour}에 찍혔다.`
- 사진 none: `사진은 없었다.` / 사진 unknown: `사진은 모른다. {reason}.`
- 자리 known: `자리는 {koCount}에 남았고, 가장 먼 두 곳은 {koMeters}쯤 떨어져 있다.
  사진 {koCount} 중 {koCount}에서 얻은 자리다.` 뒤에 `S_PLACES`.
- 자리 none: `다닌 자리는 남지 않았다.` / unknown: `다닌 자리는 모른다. {reason}.`

**검사**:
- `none`과 `unknown`이 서로 다른 문장이다(FR-008). 같은 신호를 `none`으로,
  `unknown`으로 두 번 만들어 두 프롬프트가 다른지 확인.
- `koHour(8)` === `"아침 여덟 시"`, `koHour(13)` === `"낮 한 시"`, `koHour(20)` ===
  `"저녁 여덟 시"`, `koCount(3, "곳")` === `"세 곳"`, `koCount(13, "장")` === `"13 장"`,
  `koMeters(5100)` === `"열 킬로미터"` 또는 `"10.5 킬로미터"` (원본 로직대로).
- 걸음·배터리·연결 문장이 한국어 캐릭터 프롬프트에 **없다**(FR-009).

**위반 주입**: 머리줄에 날짜를 되살리면 → E2 실패. `none`과 `unknown`을 같은 문장으로
만들면 → E2 실패.

---

## E3 — 감싼 캡션

한국어 캐릭터의 `visionLines(vision)` (캡션 ≥1):

```
내가 {takenAt.getHours()}시에 담은 장면: {caption.text}
…
{SCENE_LIMIT}
```

**검사**:
- 현행 `사진에 담긴 것:` 머리줄과 `- {N}시:` 접두사가 **없다**.
- 마지막 줄이 `SCENE_LIMIT`이다.
- `caption.text`가 그대로 들어간다(영어 문장 변형 없음, FR-015).
- `vision.captions.length === 0`이면 `visionLines()` === `[]`.

**위반 주입**: 캡션 인물 조항(`PERSON_RULE`)을 `E2_RULES` 뒤에 머리로 넣으면 →
E4 실패(A-rule 기각, §4.1).

---

## E4 — A-rule 기각 (머리에 인물 조항 없음)

`promptPrefix("quiet")`에 `"사진에 사람이 찍혀 있어도 그 사람이 누구인지, 주인과 어떤
사이인지 너는 모른다. 그 사람은 …이야기의 인물로 삼지 말고"`류 **머리 인물 조항이
없다**. 인물에 대한 언급은 `SCENE_LIMIT`(캡션 뒤, 본문) 하나뿐이다.

**근거**: §4.1 — 머리에 인물 조항을 넣으면 kanana 화자 ok 17%로 떨어진다. 감싸기
(`SCENE_LIMIT`)만으로 잡힌다.

---

## E5 — `instructionLines()` (되뱉기 비교, 한국어)

한국어 캐릭터의 `instructionLines(request, vision?)`가:

- `E2_RULES` 5줄 + `E_TONE`(quiet면) + `E2_TITLE`를 담는다(머리 = 되뱉기 대상).
- 조건부 고정 줄을 담는다: `S_DAY_OPEN`(dayStillOpen), `S_TRUNCATED`(사진 잘림),
  `S_PLACES`(자리 known), `S_VISION_PARTIAL`(available>considered),
  `SCENE_LIMIT`(캡션 ≥1).
- **문장형 신호 본문은 안 담는다**(005 P7) — `사진은 두 장이 남았다.` 같은 줄이
  `instructionLines()`에 **없다**. 신호가 일기에 나오는 것은 정상이므로.

**검사**:
- `instructionLines()`의 모든 줄이 `buildPrompt()` 안에 실제로 있다(P7 성질).
- `instructionLines()`에 `사진은 .*장이 남았다` 패턴이 없다.
- `S_DAY_OPEN`이 `dayStillOpen: true`일 때 `instructionLines()`에 있고
  `buildPrompt()`에도 있다(`prompt.test.ts` P2 갱신 — 한국어는 `S_DAY_OPEN`).

**위반 주입**: 문장형 신호 줄을 `instructionLines()`에 넣으면 → P7 성질 검사가 잡음
(그 줄이 신호 값에 따라 바뀌므로 `buildPrompt()`와 조건부로 어긋남).

---

## E6 — 외국어 캐릭터는 현행 유지

`chinese`·`english`의 `fixedHead()`·`signalLines()`·`visionLines()`·
`instructionLines()`가 **036 구현 전과 바이트 동일**하다.

**검사**:
- `promptPrefix("chinese")`가 현행 `SPEAKER_RULES` + `nameLine("chinese")` +
  `TITLE_INSTRUCTION` + `""` + `"중국어로 써라."` + `""` 를 join한 것.
- `buildPrompt(chineseRequest)`에 `E2_RULES[0]` 문자열이 **없다**.
- `buildPrompt(chineseRequest)`에 현행 날짜 머리줄 `${date}에 네가 본 것:`이 **있다**.
- `buildPrompt(chineseRequest)`의 캡션이 현행 `사진에 담긴 것:` 목록 형식.
- quickstart.md §3의 `baseline-pre036.json` vs `baseline.json` 대조에서
  chinese·english × 6 = 12프롬프트가 완전 일치(SC-001a).

**위반 주입**: `LANGUAGE[character] === "한국어"` 분기를 `!== "영어"` 등으로 잘못
쓰면 → chinese가 E2SN 경로를 타 E6 실패.

---

## E7 — 판정 4갈래 불변

- `src/diary/acceptance.ts`의 `git diff` = 0줄.
- `acceptance.ts`가 export하는 판정 이름이 정확히 4개
  (`unfinished`/`empty`/`echo`/`language`) — 소스를 읽어 센다(기존 계약 유지).
- `prompt.ts`가 면책·되뇜·인물형 지어내기를 세거나 점수 매기는 함수를 **추가하지
  않는다** — `prompt.ts` 소스에 `score`·`count`·`ratio`·`판정`·`감점` 토큰이
  새로 안 생긴다(헌법 검사 계열 검사, `readFileSync` + 주석 제거).

---

## E8 — 톤 줄 캐릭터별 (조건부 spread)

- `E_TONE.quiet` === `"담담하게, 짧게 쓴다."` 이고 `fixedHead("quiet")`에 이 줄이
  **있다**.
- alpharium `E_TONE.narrative` === `""`, `E_TONE.imaginative` === `""` (빈 문자열).
- `fixedHead()`(한국어)는 톤 줄을 **조건부 spread**로 넣는다:
  `...(E_TONE[character] ? [E_TONE[character]] : [])`. 빈 문자열이면 배열 원소가
  아예 안 들어가 `.join("\n")`에서 **`\n\n`(빈 줄)이 생기지 않는다**. `E2_RULES`
  마지막 줄 다음이 바로 `E2_TITLE`.
- **검사**: `promptPrefix("narrative")`에 `"\n\n"`이 (언어 줄 앞 한 곳 말고는) 없다.
  `fixedHead("narrative")` 배열 길이 === `fixedHead("quiet")` 배열 길이 − 1.
- 코드 주석에 근거가 있다(FR-004a): quiet는 §3.1 실측(글자 238~311, 잘림 0, 톤 이행
  83~94%, 씨앗과 같은 방향), narrative·imaginative는 §3.1 "채택 안 함"(루이 잘림
  4~8/18, 오드 이행 22~33%).

**바이트 대조와의 관계**(R4, analyze C3·C4): my-ollama `buildCandidate('E2SN', …)`의
`e2HeadLines`는 `MYOLLAMA_E_TONE[character]`(non-empty 문자열)를 **모든 캐릭터에
리터럴로** 넣는다. 그래서 SC-001의 narrative·imaginative 대조는 **"my-ollama
프롬프트에서 `"\n" + MYOLLAMA_E_TONE[character]`를 제거한 것 == alpharium 프롬프트"**
로 한다 — 제거는 **my-ollama 쪽 expected에** 적용한다(alpharium은 그 줄을 애초에
안 냄). quiet × 6은 제거 없이 완전 일치. `MYOLLAMA_E_TONE`은 `concept-candidates.ts`
에서 import한다(alpharium `E_TONE` 아님). quickstart.md §3c 스크립트.

**위반 주입**: alpharium `E_TONE.narrative`에 non-empty 값을 넣고 `fixedHead`가
그것을 spread하면 → E8 검사(배열 길이·`\n\n` 부재) 실패, 그리고 SC-001 대조에서
narrative가 my-ollama와 톤 줄까지 같아져 `replace` 후 불일치.

---

## 계약 테스트 파일

`__tests__/diary/prompt-e2sn.test.ts` (`.ts` — 순수 로직, `test:logic`).

기존 `__tests__/diary/prompt.test.ts`는 회귀:
- P8 (`buildPrompt`가 `promptPrefix`로 시작) — 한국어 3캐릭터로 확장.
- P7 (`instructionLines`와 `buildPrompt` 같은 상수) — 한국어 분기 반영.
- P12 (`promptPrefix` 순수 함수) — 그대로.
- P2 (`DAY_STILL_OPEN` 되뱉기 대상) — 한국어는 `S_DAY_OPEN`으로.
- 제목 지시문 되뱉기 대상 회귀 — 한국어는 `E2_TITLE`로.

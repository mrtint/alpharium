# Contract: 조건부 교정 (US2 / US3)

**조건부 코드 계약.** `chosenPath`가 `US2-acceptance` 또는 `US3-prompt`일
때만 발동한다. `US4-mojibake`·`env-factor`면 이 파일의 계약은 "코드 변경
0줄"과 "`git grep 028-investigation` 0건"으로 대체된다.

교정은 **구현 전에 계약 테스트를 먼저 쓴다**(헌법 「개발 방식」).

---

## A. 교정 (a) — `acceptance.ts` 언어 판정 (US2)

발동 조건: 조사에서 채록한 거부 본문이 **정상적인 중국어/영어**인데
`judge()`가 `language`로 거부함 (`eyeballVerdict === "normal-target-language"`),
그리고 원인이 **문자 클래스 정의의 범위 버그**로 특정됨 (예: 정상 간체
일부가 `HANJA = /[一-鿿]/` 밖).

### C-LJ-A1 — `REJECT_REASONS`는 정확히 4개다

교정 전후로 `["empty", "echo", "language", "unfinished"]`. `acceptance.test.ts`
A-7이 `toHaveLength(4)`와 정렬 배열 동일성을 검사한다. 다섯 번째 갈래
추가 금지(원칙 IV).

### C-LJ-A2 — 한국어 캐릭터의 비대칭이 유지된다

`quiet`/`narrative`/`imaginative`는 `!hangul`만으로 거부 — 한글 외 문자
(라틴·한자)가 섞여도 통과. 이 비대칭(고유명사·영어 낱말 허용)을 깨지
않는다. 기존 테스트 "한국어 캐릭터는 영어 낱말이 섞여도 통과한다"가 계속
녹색.

### C-LJ-A3 — `chinese`/`english`의 한글 금지가 유지된다

헌법 로스터 MUST NOT("한국어로는 쓰지 않는다"). `chinese`의 `hangul` 참
→ 거부, `english`의 `hangul` 참 → 거부를 **풀지 않는다**. 교정은 한자/
라틴 인식 **범위를 넓히는** 방향만 허용 — 한글 허용은 불가.

### C-LJ-A4 — `judge()` 순서가 유지된다

`unfinished → empty → echo → language`. 순서를 바꾸면 끊긴 글이 다른
판정을 통과할 수 있다(`acceptance.ts` 주석).

### C-LJ-A5 — 임계값·비율·점수를 도입하지 않는다

"한글 N자 미만은 허용" 같은 것 금지. 판정은 여전히 문자 클래스의
`RegExp.test()` 불리언 조합.

### C-LJ-A6 — 계약 테스트 + 위반 주입

- **추가 케이스**: 조사에서 채록한 정상 중국어 본문·정상 영어 본문을
  `judge(body, {kind:"eos"}, character, INSTRUCTIONS)`에 넣어
  `{ ok: true }` 확인.
- **회귀 케이스**: 기존 A-6("중국어 캐릭터 + 중국어 글 → ok" 등)이 계속
  녹색. `chinese`가 한글 섞으면 여전히 `language` 거부.
- **위반 주입**: 문자 클래스 변경을 되돌리면 새 케이스가 FAIL. 한글
  금지를 실수로 풀면 "chinese가 한글 섞으면 거부" 케이스가 FAIL.

### C-LJ-A7 — 실기기 재확인 (FR-014)

두 캐릭터로 재생성해 일기가 저장·목록 반영. 금동이(`quiet`) 생성이 회귀
없이 동작. debug 1회로 충분(순수 로직, 012 기준).

---

## B. 교정 (b) — `prompt.ts` 출력 언어 지시 강화 (US3)

발동 조건: 조사에서 모델이 **엉뚱한 언어를 냄** (`eyeballVerdict ===
"wrong-language"` — 예: qwen3가 한글 혼입), 판정은 옳음.

### C-LJ-B1 — 프롬프트는 `prompt.ts`에만 있다

강화된 문장이 `prompt.ts`의 `fixedHead()` 배열 안에 들어간다(현재
`` `${language}로 써라.` `` 자리). 다른 파일에 프롬프트 문자열을 두지
않는다(005 FR-013b). 데스크톱 어댑터도 `buildPrompt()`를 부른다.

### C-LJ-B2 — `promptPrefix()` == `fixedHead().join("\n")` 바이트 동일

`prompt.test.ts` P8("buildPrompt()의 결과는 언제나 promptPrefix()로
시작한다")이 계속 녹색. `promptPrefix()`가 `fixedHead()`와 **같은 배열**에서
나오므로, 강화 문장이 `fixedHead()`에 들어가면 접두사도 자동으로 포함한다.
복제하지 않는다.

### C-LJ-B3 — 캐릭터별 접두사 유일성 (P10·P11)

- P10: 접두사에 날마다 바뀌는 것(날짜 등)이 안 섞인다 — 강화 문장은
  캐릭터·언어 고정이므로 OK.
- P11: 캐릭터마다 접두사가 다르다 — `${language}`가 이미 캐릭터별로 다름
  ("한국어"/"중국어"/"영어"). 강화해도 이 유일성 유지.
- 018 KV 캐시 프리필이 이 성질에 의존.

### C-LJ-B4 — `instructionLines()`가 강화 문장을 포함 (P7)

`prompt.test.ts` "instructionLines의 모든 줄이 프롬프트에 실제로 들어
있다 (P-7의 성질 유지)"가 계속 녹색. 되뱉기 판정(`isEcho`)이 이 줄과
비교하므로, 강화 문장이 `instructionLines()` 출력에도 있어야 모델이
그 문장을 되뱉으면 잡힌다.

### C-LJ-B5 — `LANGUAGE` 맵 값 무변경

`{ quiet: "한국어", ..., chinese: "중국어", english: "영어" }`. 교정은
지시 **문장**을 강화하는 것이지 언어 매핑을 바꾸는 게 아니다(원칙 III —
캐릭터에서 오는 것은 이름과 출력 언어).

### C-LJ-B6 — `SPEAKER_RULES`·`TITLE_INSTRUCTION`을 건드리지 않는다

강화는 출력 언어 줄 하나에 한한다. 화자 규칙·제목 지시문은 이 스펙
범위 밖(그건 로드맵 18번 프롬프트 최적화의 몫).

### C-LJ-B7 — 계약 테스트 + 위반 주입

- **추가 케이스**: 강화된 줄이 `fixedHead(character)`·`buildPrompt(...)`·
  `instructionLines(...)` 세 곳에 바이트 동일하게 나타남. 캐릭터별로
  올바른 언어명이 들어감.
- **위반 주입**: 강화 문장을 `buildPrompt()`에만 넣고 `fixedHead()`에서
  빼면 P8이 FAIL. `instructionLines()`에서 빼면 P7이 FAIL.

### C-LJ-B8 — 실기기 대조 생성 (FR-014, spec US3 AS2·AS3)

- 샤오바이·모카 → 출력이 각각 중국어·영어, 일기 저장됨.
- 금동이·오드·루이 → 출력이 여전히 한국어, 되뱉기·지어내기 위반 없음
  (005~017이 각 지시 줄을 추가한 근거의 역검증).
- debug 1회로 충분(프롬프트 문자열, 새 네이티브 모듈 없음, 012 기준).

---

## C. `US4-mojibake` / `env-factor` — 코드 계약 없음

- `src/` 변경 0줄.
- `git grep "028-investigation"` → 0건 (임시 로그 제거됨).
- `git diff src/` → 0줄.
- `findings.md`에 "왜 코드로 못 고치는가"(mojibake는 GGUF/`llama.rn`
  문제, `judge()` 완화는 원칙 I 위반) 또는 "환경 요인, 클린 Metro에서
  재현 불가".
- mojibake면 `docs/roadmap/README.md` 17번 → "14번과 병합", 14번에
  qwen3·gemma3 추가.

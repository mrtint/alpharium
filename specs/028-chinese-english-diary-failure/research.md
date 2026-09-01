# Phase 0 — Research: 샤오바이·모카 일기 생성 실패 조사

**Date**: 2026-09-01 | **Plan**: [plan.md](./plan.md)

이 문서는 조사를 **실기기에서 수행하기 전에** 세울 수 있는 가설·판별
기준·방법론을 정리한다. 실측 수치는 `findings.md`에 들어간다(Phase 2 이후).

---

## 1. 실패 갈래별 원인 가설과 판별 신호

**Decision**: 6개 갈래 각각에 대해 (원인 가설 / `adb logcat`에서 보이는
신호 / 확정에 필요한 추가 관측)을 아래 표로 고정한다. 조사자는 이 표를
들고 로그를 읽는다.

| 갈래 | 원인 가설 | logcat 신호 | 추가 관측 |
|---|---|---|---|
| `rejected: language` | (가장 유력) qwen3가 한국어를 섞어 냄 → `chinese`의 `!hanja \|\| hangul`에서 `hangul` 참. 또는 gemma3 출력에 라틴이 없음(mojibake·비ASCII) → `english`의 `!latin` 참 | `on-device.ts`가 `{ kind: "rejected", why: "language" }` 반환. 임시 로그 `[028-investigation] rejected language "<body>"` | 거부 본문에 한글이 있나(qwen3) / 라틴이 아예 없나(gemma3). 육안 판정 |
| `rejected: empty` | 채팅 템플릿(`jinja: true`)에서도 qwen3/gemma3가 즉시 EOS. 005가 "평문 프롬프트로는 빈 글" 관측 — jinja로 해소됐으나 이 두 모델에서 재발? | `{ kind: "rejected", why: "empty" }`. 임시 로그 본문이 `""` 또는 공백 | `run.run.ending.kind === "eos"`인가(EOS는 났는데 내용이 없음) |
| `rejected: echo` | `MIN_ECHO_LENGTH`(12자) + 지시문 전체가 본문에 포함. 중국어는 12자에 문장 하나가 들어가 한국어보다 되뱉기 판정이 민감할 수 있음 | `{ kind: "rejected", why: "echo" }`. 임시 로그 본문에 `SPEAKER_RULES`/`TITLE_INSTRUCTION`의 어느 줄이 그대로 | 어느 지시문 줄이 포함됐는지. `instructionLines()` 출력과 대조 |
| `rejected: unfinished` | qwen3/gemma3의 EOS 토큰이 `llama.rn` 0.12.8의 jinja 템플릿 처리에서 안 잡혀 `ending.kind`가 `length`/`interrupted` | `{ kind: "rejected", why: "unfinished" }`. 임시 로그가 `ending.kind !== "eos"` | `ending.kind` 실제 값. `n_predict`(512) 도달인지(`length`) |
| `timed-out` | 1.7B/1B라 가능성 낮음. 콜드 로드 후 첫 토큰까지 오래 걸리면? `writingMs`는 로드 제외 구간만 잼 | `{ kind: "timed-out" }`. `writingMs`가 로그에 안 찍힘(타임아웃 시 early return) — `runWithTimeout`의 `timedOut: true` | `engine.load()` 후 `onStage("generation")`부터 얼마나 지났는지 다른 로그로 추정 |
| `generation-failed` | GGUF 로드는 성공했는데 `completion()`이 예외. JNI 레벨 크래시·OOM | `{ kind: "generation-failed", reason: "<message>" }`. `reason`에 예외 메시지 | 예외 메시지 전문. `llama` 태그 네이티브 로그 동반 확인 |

**Rationale**: 사용자 화면 문구("다시 시도해 볼 만하다")는
`describeFailure()`에서 `rejected`·`timed-out`·`generation-failed`가
**공유**하므로 화면만으로는 갈래를 못 가른다. `on-device.ts`가 반환하는
`{ kind }`가 유일한 확정 신호이고, `rejected`면 하위 `why`까지 봐야 한다.
파이프라인은 이걸 `` `${kind}: ${detail}` ``로 담아
`describeGenerationReason()`이 다시 갈래로 되돌리므로(`failure-text.ts`),
로그에서 이 문자열을 잡으면 된다.

**Alternatives considered**:
- 디버거로 `run.run.text`를 브레이크포인트에서 확인 → 실기기 dev 빌드에서
  소스맵·브레이크포인트가 불안정하고, 3회 반복에 부적합. 임시 `console.log`가
  단순하고 확실(spec Clarifications에서 Option B 채택).
- 화면 문구로 갈래 추정 → 세 갈래가 같은 문구라 불가능. 기각.

---

## 2. `isWrongLanguage` 문자 범위 정밀 분석

**Decision**: `acceptance.ts`의 판정을 캐릭터별로 전개해 "정상 본문이 왜
거부될 수 있는가"를 특정한다.

```
HANGUL = /[가-힣]/    // U+AC00–U+D7A3 (완성형 음절만)
HANJA  = /[一-鿿]/     // U+4E00–U+9FFF (CJK Unified Ideographs 기본 블록)
LATIN  = /[A-Za-z]/    // ASCII 라틴만

chinese: return !hanja || hangul       // 한자가 없거나 / 한글이 있으면 거부
english: return !latin || hangul || hanja  // 라틴이 없거나 / 한글·한자가 있으면 거부
```

**qwen3(`chinese`)가 정상 간체를 냈는데 거부되는 경로**:
- `!hanja` 참 — 간체 상용자는 거의 전부 U+4E00–U+9FFF 안이라 이 경로는
  희박. 다만 본문이 **아주 짧고**(예: 제목만) 그 글자가 확장 한자면 가능.
- `hangul` 참 — qwen3가 한국어를 섞어 냄. **이게 유력**. 헌법 로스터가
  "qwen은 한국어 출력에서 문장이 부서진다"고 이미 관측 — 프롬프트가
  한국어(지시문이 전부 한국어)라 모델이 한국어로 끌려갈 수 있다.

**gemma3(`english`)가 정상 영어를 냈는데 거부되는 경로**:
- `!latin` 참 — 본문에 `[A-Za-z]`가 하나도 없어야 함. 정상 영어면 불가능.
  **mojibake면 가능** — surrogate가 U+FFFD(�)나 CJK 비슷한 것으로 렌더되면
  라틴이 없어짐. 헌법 로스터가 "gemma는 지시를 못 따라 프롬프트를
  되뱉었다"고 관측 — 이 경우 `echo`로 갈 수도 있음.
- `hangul`/`hanja` 참 — gemma3가 한국어/한자를 섞음. 가능.

**교정 방향에 대한 헌법 제약**:
- 헌법 로스터가 `qwen3`·`gemma3`에 "한국어로는 쓰지 않는다(MUST NOT)"를
  못 박았다. 따라서 `chinese`/`english`의 **한글 금지(`hangul` 참 → 거부)를
  풀 수 없다.** 판정은 헌법이 요구한 대로 동작하는 것이다.
- 즉 **교정 (a)(판정 수정)가 성립하는 경우는 좁다** — "정상 간체가 `HANJA`
  범위 밖으로 새어 `!hanja` 참이 되는 실제 사례"처럼 판정 **범위 버그**가
  확인될 때만. 그 경우 `HANJA` 범위를 CJK Extension A(U+3400–U+4DBF)까지
  넓히는 등 **문자 클래스 정의만** 고친다 — `judge()` 순서·갈래 수·임계값
  도입 없음.
- qwen3가 한국어를 섞는 것이면 그것은 **모델/프롬프트 문제**이지 판정
  문제가 아니다 → 교정 (b) 또는 (c).

**Rationale**: 로드맵이 "`isWrongLanguage`가 유력"이라고 적었지만, 헌법
제약을 넣고 보면 "판정을 느슨하게" 하는 교정은 대부분 불가능하다. research가
이걸 명확히 해서, 조사자가 실측 후 잘못된 교정(한글 금지 완화)으로 가지
않도록 한다.

**Alternatives considered**:
- `isWrongLanguage`에 "한글 비율 N% 미만은 허용" 같은 임계값 → 원칙 IV
  정면 위반. `acceptance.ts` 주석이 이미 금지. 기각.
- 캐릭터별 판정을 프롬프트 언어와 연동 → `acceptance.ts`가 `prompt.ts`를
  알게 되어 경계 붕괴. 기각.

---

## 3. 임시 조사 로그 위치와 형태

**Decision**: `src/inference/on-device.ts`의 `generate()` 안, 세 실패
반환 지점 직전에 `console.log` 한 줄씩(총 3줄). 형태:

```
// [028-investigation] 조사 후 제거 — spec FR-003a
console.log("[028-investigation] rejected", verdict.why, JSON.stringify(run.run.text));   // 판정 거부 분기
console.log("[028-investigation] timed-out");                                             // runWithTimeout timedOut 분기
console.log("[028-investigation] generation-failed", JSON.stringify(reason));             // catch 분기
```

삽입 지점(현재 소스 기준, 행 번호는 참고):
- `rejected` — `if (!verdict.ok) { ... return { kind: "rejected", why: verdict.why }; }`
  블록 안, `return` 직전. `run.run.ending.kind === "interrupted"` 분기보다
  뒤(또는 그 앞에 한 번) — 어느 쪽이든 `verdict.why`와 `run.run.text`를
  찍는다.
- `timed-out` — `if (run.timedOut) { await cleanupUsedPhotos(); return { kind: "timed-out" }; }`
  안.
- `generation-failed` — `catch (error) { ... const reason = ...; return { kind: "generation-failed", reason }; }`
  안, `return` 직전.

**타입 무변경**: `Verdict`·`GenerationFailure`·`RunResult`에 `text`를
추가하지 않는다. `run.run.text`는 이 스코프에 이미 있는 지역 변수다.

**제거 확인**: 조사·교정 완료 후 `git grep "028-investigation"`가 **0건**.
`git diff src/` 검토에서 이 3줄이 안 보여야 종료(FR-015·SC-007).

**Rationale**: 모듈이 아니라 3줄짜리 `console.log`이므로 019의
`verification-log.ts`(020이 제거한 검증 전용 모듈)와 급이 다르다.
헌법 원칙 IV의 "측정 장치"는 값을 재고 비교하는 코드지, 조사 중 텍스트를
한 번 흘려보는 임시 로그가 아니다. 그래도 최종 코드에는 안 남긴다 —
"예외를 코드에 몰래 두지 않는다"(Governance).

**Alternatives considered**:
- `pipeline.ts`에서 찍기 → `pipeline.ts`는 `reason` 문자열만 받고
  `run.run.text`를 모른다. `on-device.ts`가 유일한 위치.
- 영구 진단 로그로 승격 → 원칙 IV. 조사 후 제거가 계약(FR-003a).

---

## 4. mojibake 판별 기준

**Decision**: 채록한 `run.run.text`에 대해 사람이 아래를 확인한다.

- **깨짐 신호**: U+FFFD(�) 다수, 고립 UTF-16 surrogate, 제어문자
  (U+0000–U+001F 중 `\n`·`\t` 외), 의미 없는 CJK/기호 열.
- **금지 기호 혼입**: `title`/본문에 `###`·`**`·`- ` 같은 마크다운
  (014·017이 프롬프트로 금지한 것) — 024 §10 EXAONE에서 관측된 양상.
- **재현 범위**: qwen3만 / gemma3만 / 둘 다. 3회 중 몇 회.
- **환경 메타**: `llama.rn` **0.12.8**(`package.json` 확인), GGUF는
  qwen3=`unsloth/Qwen3-1.7B-Q4_K_M`, gemma3=`unsloth/gemma-3-1b-it-Q4_K_M`
  (`roster.ts`).

**mojibake로 확정되면**:
- `src/` 코드 변경 0줄. `judge()`를 느슨하게 해 깨진 글을 통과시키는 것은
  원칙 I 위반(spec FR-012).
- `findings.md`에 결론 + 위 근거. `docs/roadmap/README.md` 17번 → "mojibake
  확인, 14번과 병합", 14번 항목에 qwen3·gemma3 추가(FR-011).
- 024 §10(EXAONE mojibake)과의 연관을 명시 — "qwen3·gemma3·exaone Q4_K_M +
  llama.rn 0.12.8에서 비ASCII 출력이 깨진다"는 공통 결론이면 세 캐릭터가
  같은 뿌리.

**Rationale**: mojibake는 GGUF 토크나이저/디코더와 `llama.rn` 바인딩의
문제이지 이 저장소의 판정·프롬프트·저장 코드로 고칠 수 없다. 잘못된 교정
(판정 완화)을 막기 위해 판별 기준을 사전에 못 박는다.

**Alternatives considered**:
- `llama.rn` 패치 버전 올려 보기 → 이 스펙 범위 밖(새 네이티브 의존성
  검증은 별도, 헌법 「Expo 작업 시」). 14번의 몫.
- 출력에서 깨진 문자만 필터 → `judge()`가 "글을 고치지 않는다"(FR-017)를
  어김. 기각.

---

## 5. 3회 재현 방법론

**Decision**:
- **고정 조건**: "사진을 보지 않음" 설정 + 과거 하루(009 최근 3일 범위
  안, 사진·좌표 신호가 빈약한 날). VLM·사진·위치 변수를 전부 제거해
  생성 경로만 남긴다.
- **표본**: 샤오바이 3회, 모카 3회 (온도 0.8·seed 없음이라 매 회 출력이
  다름 — `sampling.ts`).
- **채록**: 매 회 `adb logcat -c`(클리어) → 생성 → `adb logcat -d`(덤프).
  각 로그에서 `{ kind }`·`[028-investigation]` 줄·`ending`·(있으면)
  `writingMs` 추출 → `findings.md` 표(캐릭터 × 3행).
- **판정**: 3회 동일 갈래 → 확정. 갈림 → "3회 중 M회 `<갈래>`" 분포 +
  **최빈 갈래**를 교정 대상. 동률이면 (원칙 I·헌법 로스터 관점에서) 더
  근본적인 갈래를 택하고 findings에 근거를 적는다.
- **재현 실패**(3회 다 정상 저장) → 스테일 Metro 의심.
  `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`로 재기동
  후 재시도. 그래도 정상이면 "환경 요인, 클린 Metro에서 재현 불가"로
  종료(코드 변경 0, US4의 env-factor 경로).

**Rationale**: 019가 "간격만 좁히고 방치 시간은 유지"로 표본을 늘린 것과
같은 취지 — 여기선 "조건을 고정하고 횟수를 3으로" 표본을 만든다. 3은
실기기 세션 부담(6런 × 30초~1분)과 우연 배제의 균형점(spec Clarifications).

**Alternatives considered**:
- 1회 → 온도 0.8라 우연을 못 가름. 기각(Clarifications).
- 5회 → 세션이 길어짐. 3으로 시작하고 갈리면 findings에 분포만 남김.
- 사진 있는 하루로도 재현 → VLM 전환 변수가 들어와 원인이 흐려짐. 사진
  있는 하루에서만 실패하면 그건 011 계열 별건으로 findings에 분리 기록
  (spec Edge Cases).

---

## 6. 금동이(quiet) 정상 동작의 대조 의미

**Decision**: 조사 결론을 쓸 때 "왜 `quiet`만 통과하는가"를 명시적으로
분석한다. `quiet`(kanana)·`chinese`(qwen3)·`english`(gemma3)는:

- **같은 파이프라인**(`pipeline.ts` → `on-device.ts`)
- **같은 판정**(`judge()` — `character`만 다름)
- **같은 프롬프트 구조**(`buildPrompt()` — `nameLine`·`${language}로 써라.`
  두 줄만 캐릭터별로 다름)
- **같은 샘플링**(`SAMPLING` — 캐릭터 무관)

를 쓴다. `quiet`만 통과한다는 것은 원인이 **캐릭터에서 오는 딱 두 가지**
중 하나임을 강하게 시사한다:

1. **출력 언어**(`${language}로 써라.` — `quiet`는 "한국어", 나머지는
   "중국어"/"영어"). 지시문 전체가 한국어인데 출력만 다른 언어를 요구 →
   qwen3/gemma3가 못 따르거나 깨짐. → 교정 (b) 또는 (c).
2. **모델 자체**(kanana는 한국어가 깨끗, qwen3/gemma3는 헌법 로스터가
   "한국어에서 부서진다/되뱉는다"고 관측). 중국어/영어에서는 괜찮아야
   하는데 실제로 깨지면 → 교정 (c), 14번.

`judge()`의 `character` 분기(`isWrongLanguage`)도 다르지만, 그건 **정상
출력을 거부하는** 방향이지 `quiet`가 통과하는 이유를 설명하진 않는다
(§2에서 본 대로 헌법상 한글 금지는 못 푼다).

**Rationale**: 이 대조가 조사 범위를 "캐릭터에서 오는 2가지"로 좁혀,
"한 축을 깊게 파는" 실패(AGENTS.md·헌법 「개발 방식」)를 예방한다.

**Alternatives considered**: 없음 — 이건 분석 프레임이지 선택지가 아니다.

---

## 종합 — 조사 후 갈림길

```
3회 재현 결과
├── rejected: language + 거부 본문이 정상 중국어/영어인데 판정 범위 버그로 샜다
│     → 교정 (a): acceptance.ts 문자 클래스만. 계약 테스트 + 위반 주입.  [희박]
├── rejected: language/echo/empty + 거부 본문에 한글 혼입 / 프롬프트 되뱉기
│     → 교정 (b): prompt.ts `${language}로 써라.` 한 줄 강화. P7/P8/P10/P11 유지.
├── 거부 본문이 mojibake (깨진 UTF-8 / 금지 기호)
│     → 교정 (c): 코드 0줄. findings + 로드맵 14번 병합.  [024 §10과 같은 뿌리 가능성]
├── timed-out / generation-failed
│     → findings에 소요 시간·예외 기록. 대개 14번(모델 재검토)으로.  코드 0줄.
└── 3회 다 정상 저장 (재현 불가)
      → 클린 Metro 재시도 → 여전히 정상이면 "환경 요인"으로 종료. 코드 0줄.
```

어느 경우든: `REJECT_REASONS` 4개 유지, `judge()` 느슨하게 안 함, 임시
로그 제거, 최빈 갈래 하나만 교정하고 나머지는 "미확인 잔여".

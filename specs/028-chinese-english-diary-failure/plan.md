# Implementation Plan: 샤오바이·모카 일기 생성 실패 조사

**Branch**: `028-chinese-english-diary-failure` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-chinese-english-diary-failure/spec.md`

## Summary

사용자가 2026-09-01에 보고한 증상 — 샤오바이(`chinese`/qwen3-1.7b)·모카
(`english`/gemma3-1b)로 일기를 쓰면 "다시 시도해 볼 만하다" 계열 실패 화면이
뜨고 목록에 안 남는다, 금동이(`quiet`)는 정상 — 의 실패 갈래를 실기기
`adb logcat`으로 특정하고, 갈래에 따라 최소 교정만 한다. 019(스파이크)·027
(024 잔여 실측)와 같은 계열의 **진단 스펙**이다.

**기술 접근**:

1. **임시 조사 로그 → 3회 재현 → 갈래 확정.** `on-device.ts`의 거부 분기에
   `run.run.text`를 흘리는 **임시 로그**를 한시적으로 넣고(spec FR-003a),
   SM-S901N(dev/debug)에서 두 캐릭터로 "사진을 보지 않음" 과거 하루를
   각 3회 생성한다. 로그에서 실패 갈래(`rejected: <why>` / `timed-out` /
   `generation-failed`)와 거부된 본문 전문을 채록한다. 온도 0.8·seed
   없음이라 3회의 분포를 남긴다.
2. **육안 판정으로 원인 갈래를 하나 고른다** — (a) 판정 오탐(모델은
   올바른 언어로 정상 본문을 냈으나 `isWrongLanguage`가 거부) / (b) 모델이
   엉뚱한 언어를 냄(프롬프트 약함) / (c) mojibake(GGUF 인코딩) / (d) 환경
   요인(스테일 Metro) 중 최빈 갈래. 나머지는 findings.md "미확인 잔여".
3. **갈래별 최소 교정** — 상호 배타적이다:
   - (a) → `src/diary/acceptance.ts`의 `isWrongLanguage()`(또는 그것이
     의존하는 `HANJA`/`LATIN` 문자 범위) **한 함수만** 수정. `REJECT_REASONS`
     4개 고정(원칙 IV). 계약 테스트 추가 + 위반 주입.
   - (b) → `src/diary/prompt.ts`의 출력 언어 지시 **한 줄만** 강화
     (현재 `` `${language}로 써라.` ``, `LANGUAGE` 맵은 그대로). 프롬프트는
     `prompt.ts`에만(005 FR-013b). `promptPrefix()`/`fixedHead()` 바이트
     동일성(018)·`instructionLines()` 되뱉기 비교 대상 일치(P7) 유지.
     실기기 대조 생성.
   - (c) → `src/` 코드 변경 0줄. findings.md에 결론·근거(깨짐 양상, 재현
     모델 조합, `llama.rn` 버전) + 로드맵 14번에 qwen3·gemma3 추가, 17번을
     "14번과 병합"으로 갱신.
   - (d) → 코드 변경 0줄. findings.md에 "클린 Metro에서 재현 불가".
4. **임시 로그 제거 + 최종 diff 확인.** 교정 여부와 무관하게 FR-003a의
   임시 로그는 제거한다. 교정이 없었으면 `git diff src/` = 0줄(FR-015).
5. **기기 없는 게이트 유지** — `npm run test:logic`·`npm run lint`
   (eslint·tsc·헌법 검사·prettier) 전부 통과. 교정이 (a)/(b)면 그 변경의
   계약 테스트가 `__tests__/`(순수 로직이므로 `.ts`)에 추가되고 위반
   주입으로 방어를 확인한다.
6. **교정이 있었으면 실기기 재확인 1회**(FR-014, debug) — 두 캐릭터로
   재생성해 일기가 저장·목록 반영되고, 금동이 등 다른 캐릭터가 회귀 없이
   동작함을 확인. 순수 로직·프롬프트 문자열이라 release 재확인 불필요
   (012 기준).

## Technical Context

**Language/Version**: TypeScript 5.x (React Native 0.86 / Expo SDK 57, 기존 기준선). 코드 변경은 조건부 — 없을 수도 있다(mojibake·환경 요인).

**Primary Dependencies**: 신규 없음. 재사용만 — `llama.rn`(005, 온디바이스 추론), `adb`(실기기 로그). `expo install --check`의 기존 패치 버전 어긋남은 이 스펙이 만든 것이 아니다.

**Storage**: 없음. `files/diary/`(일기 저장)는 이 조사에서 **읽기 대상**이지 스키마를 바꾸지 않는다. `state.json`(모델 verdict)도 읽기만.

**Testing**: `npm run test:logic`(순수 로직, ~7초). 교정이 있으면 `__tests__/diary/acceptance.test.ts` 또는 `__tests__/diary/prompt.test.ts` 확장(`.ts` — 순수 로직). 실기기는 `adb logcat`(Maestro 신규 흐름 없음 — 3회 수동 생성 관측이 검증이고, 이건 019의 `adb dumpsys` 관측과 같은 성격).

**Target Platform**: SM-S901N(Galaxy S22, Android 16 / SDK 36), dev(debug) 빌드, Metro 실행 중. 사용자가 증상을 본 것과 같은 환경.

**Project Type**: 모바일 앱(단일 프로젝트). 진단 스펙.

**Performance Goals**: 없음(진단). `GENERATION_TIMEOUT_MS`(180초, `engine.run()` 구간)는 재는 게 아니라 `timed-out` 갈래가 나오면 실제 소요와 **대비**하는 기준.

**Constraints**:
- **판정 갈래를 늘리지 않는다**(헌법 원칙 IV — `REJECT_REASONS` 4개 고정, `acceptance.test.ts` A-7이 수를 센다).
- **`judge()`를 느슨하게 해 깨졌거나 언어가 다른 본문을 통과시키지 않는다**(원칙 I — spec FR-012).
- **프롬프트는 `prompt.ts`에만**(005 FR-013b). 캐릭터에서 오는 것은 이름과 출력 언어뿐(원칙 III).
- **채점 코드 금지**(원칙 IV) — 거부된 본문의 mojibake·언어 판정은 사람이 육안으로, `findings.md`에만.
- **임시 조사 로그는 조사 기간에만**(FR-003a) — `Verdict`·`GenerationFailure` 타입에 `text` 추가 없음. 최종 `src/` diff에 안 남음.
- **한 갈래를 무한히 파지 않는다**(AGENTS.md·헌법 「개발 방식」) — 최빈 갈래 하나만 교정, 나머지는 "미확인 잔여".
- 실기기 재현은 "사진을 보지 않음"(신호 빈약)으로 — VLM·사진·위치 변수 제거.
- `a4`(qwen3)·`a5`(gemma3) 모델이 `files/models/`에 있고 verdict `passed: true`여야 함 — 없으면 개발 기계 재다운로드 + `run-as` 배치(024 T037 선례).

**Scale/Scope**: 코드 변경 예상 규모 — **0줄**(mojibake·환경 요인) ~ **한 함수/한 줄**(판정 오탐 또는 프롬프트). + 조건부 계약 테스트 1스위트. + 임시 조사 로그(삽입 후 제거, 최종 diff 0). 실기기 라운드: 두 캐릭터 × 3회 = 6런 + 교정 시 재확인 2런. 새 화면·새 파일·새 `*-port.ts`·새 Maestro 흐름 0개.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 원칙 I — 온디바이스가 제품이다 (NON-NEGOTIABLE)

- **영향**: 이 스펙은 추론 위치를 바꾸지 않는다. 조사는 온디바이스 생성이
  왜 **거부/실패로 끝나는지**를 본다. 교정이 (a)/(b)면 그것은 정상 온디바이스
  출력이 저장까지 가게 하는 것이지, 미리 만든 응답을 넣는 것이 아니다.
- **거부는 거부로 둔다**(FR-012) — 깨졌거나 언어가 다른 본문을 통과시키는
  수정을 하지 않는다. 원칙 I의 "실패가 텍스트를 반환하지 않는다"를 유지한다.
- **판정**: 통과. 방어를 검증·복원할 뿐 완화하지 않는다.

### 원칙 II — 화자는 휴대폰이고, 시야는 좁다

- **영향**: 교정이 (b)면 `prompt.ts`의 출력 언어 지시 한 줄을 강화한다 —
  이것은 화자 규칙(`SPEAKER_RULES`)이나 시야 규칙이 아니라 **출력 언어**
  (헌법 로스터가 "한국어로는 쓰지 않는다 MUST NOT"으로 못 박은 것)의 강제다.
  프롬프트는 `prompt.ts` 하나에만 남는다(005 FR-013b).
- `instructionLines()`의 되뱉기 판정 비교 대상이 강화된 줄을 포함하도록
  유지한다(P7) — 어긋나면 되뱉기를 놓친다.
- **판정**: 통과.

### 원칙 III — 모델은 캐릭터다

- **영향**: 이 스펙은 `roster.ts`(캐릭터→모델)·`persona.ts`(캐릭터→이름)를
  건드리지 않는다. `LANGUAGE` 맵(캐릭터→출력 언어)도 그대로 — 교정 (b)는
  지시 **문장**을 강화하는 것이지 언어 매핑을 바꾸는 게 아니다.
- 조사 결과(어느 모델이 어느 갈래로 실패)는 `findings.md` 문서에만. 제품
  코드에 모델 비교·점수를 넣지 않는다.
- mojibake 결론이면 "qwen3·gemma3 GGUF 인코딩 문제"를 로드맵 14번(서술형
  모델 재검토)으로 넘긴다 — 로스터 조항을 이 스펙에서 개정하지 않는다.
- **`acceptance.ts`는 `character`를 인자로 받지만 `roster`/`persona`를
  import하지 않는다** — 교정 (a)도 이 경계를 유지한다.
- **판정**: 통과.

### 원칙 IV — 측정 장치를 제품에 들이지 않는다

- **영향**: 이 스펙은 진단이 핵심이지만 측정 **장치**를 제품에 넣지 않는다.
  - 검증 전용 로그 모듈(019의 `verification-log.ts`)을 만들지 않는다 —
    FR-003a의 임시 로그는 **한 줄짜리 `console.log`**이고 조사 후 제거된다.
    모듈도 아니고 영속도 아니다.
  - 개발자 탭에 "마지막 실패 갈래" 패널 등을 추가하지 않는다.
  - 거부된 본문의 mojibake·언어 판정은 사람이 육안으로 하고 `findings.md`에
    옮긴다. 자동 채점 코드 없음.
  - `REJECT_REASONS`는 조사 전후로 4개(SC-006). 교정 (a)는 `isWrongLanguage()`
    **한 함수의 판정 로직**만 고친다 — 갈래를 더하지 않고, 임계값·비율·점수를
    넣지 않는다(`acceptance.ts` 주석이 이미 못 박은 것).
  - `llama-port.ts`의 `timings` 폐기 경계는 그대로. `timed-out` 갈래를
    보더라도 소요 시간은 `on-device.ts`가 이미 재는 `writingMs`(벽시계)를
    로그로 읽는 것이지 네이티브 지표가 아니다.
- **판정**: 통과.

### 원칙 V — 관측된 사실과 추측을 구분해 기록한다

- **영향**: 이 스펙의 전부가 이 원칙의 실행이다.
  - 실패 갈래를 **실측**(`adb logcat`)으로 확정하고, 언제·어느 기기·어느
    빌드·`llama.rn` 어느 버전에서 쟀는지 `findings.md`에 남긴다(FR-005).
  - 3회가 갈리면 "3회 중 M회 `<갈래>`"로 분포를 정직하게 남긴다 — 하나로
    단정하지 않는다.
  - "아마 `isWrongLanguage` 오탐일 것이다"(로드맵의 현재 추측)를 실측으로
    바꾼다 — 거부된 본문을 실제로 읽어 판정한다.
  - 지표가 전부 실패면 재는 코드(`judge()`·`isWrongLanguage()`)를 먼저
    의심한다(원칙 V 본문) — 이 스펙이 정확히 그 순서다.
  - 합성 하루·재배치 모델은 "경로가 도는가"만(010 원칙, FR-013) — 출력
    품질 결론에 쓰지 않는다.
- **판정**: 통과.

### 개발 방식 — 계약 먼저, 테스트 먼저

- 교정이 (a)/(b)인 경우에만 계약 테스트가 생긴다 — 그때는 구현 전에 쓴다
  (조사에서 채록한 "정상 중국어/영어 본문"을 `judge()`에 넣어 현재 코드가
  거부하는 것을 재현하는 테스트 → 교정 → 통과). 위반 주입으로 방어 확인
  (007~027 공통).
- 코드 변경이 없으면(mojibake·환경 요인) 계약 테스트도 없다 — 진단 마무리.
- 커밋 메시지 한국어.
- **판정**: 통과.

### 종합

**위반 없음.** Complexity Tracking 비움. 이 스펙은 002/005/014의 경계
(`pipeline.ts` 단계·`acceptance.ts` 4갈래·`prompt.ts` 단일 통과 지점)를
유지·검증하며 새 구조를 만들지 않는다. 코드 변경은 조건부이며 그 경우도
한 함수 또는 한 줄 + 계약 테스트로 한정한다.

## Project Structure

### Documentation (this feature)

```text
specs/028-chinese-english-diary-failure/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 실패 갈래별 원인 가설, isWrongLanguage 문자 범위 분석, 임시 로그 위치, mojibake 판별 기준, 3회 재현 방법론
├── data-model.md        # Phase 1 — 관측 레코드(문서 전용): 실패 갈래·거부 본문·소요 시간·육안 판정. findings.md 구조
├── quickstart.md        # Phase 1 — 실기기 조사 절차(임시 로그 삽입 → 두 캐릭터 3회 생성 → 채록 → 갈래별 교정 → 로그 제거 → 재확인)
├── contracts/           # Phase 1
│   ├── investigation-record.md        # 조사 관측 레코드·갈래 판정 규칙(US1) — 문서 전용 계약
│   └── language-judgment.md           # isWrongLanguage 교정 계약(US2, 조건부) + prompt 언어 지시 강화 계약(US3, 조건부)
├── checklists/
│   └── requirements.md  # 이미 생성됨(specify 단계)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

이 스펙이 **읽거나(대부분) 조건부로 건드리는** 자리(전부 기존):

```text
src/
├── inference/
│   └── on-device.ts             # 임시 조사 로그 1줄 삽입 → 조사 후 제거(FR-003a). 거부 분기(~552행 `return { kind: "rejected", why: verdict.why }` 직전). 최종 diff 0
└── diary/
    ├── acceptance.ts            # 교정 (a)일 때만 — isWrongLanguage() 또는 HANJA/LATIN 문자 범위 한 곳. REJECT_REASONS·judge() 순서·MIN_ECHO_LENGTH 무변경
    └── prompt.ts                # 교정 (b)일 때만 — `${language}로 써라.` 한 줄 강화. LANGUAGE 맵·SPEAKER_RULES·fixedHead()·instructionLines() 구조 무변경

__tests__/
└── diary/
    ├── acceptance.test.ts       # 교정 (a)면 케이스 추가(정상 중국어/영어 본문 통과, 한국어 캐릭터 회귀 없음, A-7 갈래 수 4 유지). 위반 주입
    └── prompt.test.ts           # 교정 (b)면 케이스 추가(강화된 줄이 fixedHead()/instructionLines()에 바이트 동일하게 들어감 — P8·P10·P11·P7 유지). 위반 주입

specs/028-chinese-english-diary-failure/findings.md   # 조사 산출물(Phase 2에서 채움) — 캐릭터별 갈래 분포·거부 본문·소요 시간·육안 판정·환경 메타·미확인 잔여
docs/roadmap/README.md                                # 17번 항목 결론 갱신. mojibake이면 14번에 qwen3·gemma3 추가(FR-011)
```

이 스펙이 **명시적으로 만들지 않거나 건드리지 않는** 것: 새 `src/` 파일,
새 화면, 새 `*-port.ts`, 새 `preferences/*.json`, 새 네이티브 모듈, 새 진단
패널, 검증 전용 로그 모듈, 새 Maestro 흐름, `REJECT_REASONS`의 다섯 번째
갈래, `LANGUAGE` 맵의 값, `SAMPLING` 파라미터, `judge()`의 판정 순서.
빌드 설정(`android/`·`metro.config.js`)도 안 건드린다 — 순수 로직·프롬프트
문자열 교정이라 release 재확인이 불필요하기 때문이다(012 기준).

**Structure Decision**: 단일 프로젝트. 005가 만든 `on-device.ts`의 거부
분기, 002/005가 만든 `pipeline.ts`의 `generation` 단계, 005/014가 만든
`acceptance.ts`의 4갈래 판정, 005가 만든 `prompt.ts`의 단일 통과 지점을
그대로 쓴다. 코드 변경은 조사 결과 조건부이며, 그 경우도 한 함수(`acceptance.ts`)
또는 한 줄(`prompt.ts`) + 계약 테스트로 한정한다. 새 디렉터리 없음.

## Phase 0 — Research (research.md)

해소할 미지수와 조사 항목:

1. **실패 갈래별 원인 가설과 판별 신호** (US1, FR-002·FR-003)
   - `rejected: language` — `isWrongLanguage(text, character)` 반환 조건을
     캐릭터별로 전개. `chinese`: `!hanja || hangul`. `english`:
     `!latin || hangul || hanja`. 어느 조건이 참이 되면 거부인지, 정상
     본문에서 그 조건이 왜 참이 될 수 있는지(예: `HANJA = /[一-鿿]/`가
     U+4E00–U+9FFF만 커버 — 간체 상용자는 대부분 이 안이지만 일부 확장
     한자·기호는 밖. `english`가 `!latin`이면 거부인데 mojibake는 Latin이
     아니므로 `!latin` 참).
   - `rejected: empty` — `text.trim().length === 0`. 평문 프롬프트로 즉시
     EOS를 내는 005의 관측이 qwen3/gemma3 채팅 템플릿에서 재현되는가.
   - `rejected: echo` — `MIN_ECHO_LENGTH`(12자) + 지시문 전체 포함. 중국어는
     글자당 정보 밀도가 높아 12자 경계가 한국어와 다르게 작동할 수 있다.
   - `rejected: unfinished` — `ending.kind !== "eos"`. qwen3/gemma3의 EOS
     토큰이 `llama.rn` jinja 템플릿에서 다르게 잡히는가.
   - `timed-out` — `writingMs` > 180초. 1.7B/1B 모델이라 가능성 낮지만
     콜드 로드 후 첫 토큰 지연을 본다.
   - `generation-failed` — `completion()` 예외. GGUF 로드는 됐는데 추론
     중 죽는 경우.
   - **판별**: `adb logcat`에서 `on-device.ts`가 반환하는 `{ kind }` 값과
     임시 로그의 `run.run.text`. 파이프라인이 `` `${kind}: ${detail}` ``로
     담는 것(`pipeline.ts`)을 `describeGenerationReason()` 이전 단계에서
     읽는다.

2. **`isWrongLanguage` 문자 범위 정밀 분석** (US2, FR-006·FR-008)
   - `HANGUL = /[가-힣]/` (U+AC00–U+D7A3) — 완성형 음절만. 자모(U+1100–)는
     안 잡음. 정상.
   - `HANJA = /[一-鿿]/` (U+4E00–U+9FFF) — CJK Unified Ideographs 기본
     블록. Extension A(U+3400–U+4DBF)·Compatibility Ideographs(U+F900–)는
     밖. qwen3가 간체로 쓰면 대부분 기본 블록 안 — 이 범위 자체는 아마
     문제가 아니다. **의심은 `hangul` 쪽** — qwen3가 한국어를 섞어 내면
     `chinese`의 `!hanja || hangul`에서 `hangul` 참 → 거부.
   - `LATIN = /[A-Za-z]/` — ASCII 라틴만. 악센트 문자(é·ü)는 안 잡음.
     gemma3 영어는 ASCII 위주라 `!latin` 참이 되려면 **본문에 라틴이 아예
     없어야** 함 — mojibake(surrogate가 �로 렌더)면 `!latin` 참 → 거부.
   - **결론 후보**: (a) qwen3가 한국어 혼입 → `chinese`의 `hangul` 금지에
     걸림 / (b) gemma3 mojibake → `english`의 `!latin`에 걸림. 둘 다 교정
     방향이 다르다(전자는 프롬프트, 후자는 14번).
   - **교정이 판정 쪽이면**: 헌법 로스터가 "한국어로는 쓰지 않는다 MUST NOT"을
     못 박았으므로 `hangul` 금지를 풀 수 없다 — 판정은 옳고 원인은 프롬프트
     또는 모델이다. **즉 `isWrongLanguage` 자체를 느슨하게 하는 교정은
     헌법상 불가**하고, 교정 (a)가 성립하는 경우는 "판정 범위 버그"(예:
     정상 간체가 `HANJA` 범위 밖으로 새는 실제 사례)로 좁혀진다. research가
     이걸 명확히 한다.

3. **임시 조사 로그 위치와 형태** (FR-003a)
   - `on-device.ts` `generate()`의 판정 직후, `if (!verdict.ok)` 블록 안,
     `return { kind: "rejected", why: verdict.why }` 직전에
     `console.log("[028-investigation] rejected", verdict.why, JSON.stringify(run.run.text))`
     한 줄. `timed-out`·`generation-failed` 분기에도 같은 형태로(각 1줄).
   - **타입 무변경** — `Verdict`·`GenerationFailure`에 `text` 안 넣는다.
   - 조사·교정 후 제거. `git grep 028-investigation`가 0건이어야 종료
     (FR-015·SC-007).

4. **mojibake 판별 기준** (US4, FR-011)
   - 024 §10 EXAONE 양상: "깨진 UTF-8 surrogate", `title`에 금지된
     `###`·`**` 혼입, `judge()`는 통과시킴(이 스펙에선 `judge()`가 거부).
   - 판별: 채록한 `run.run.text`에 U+FFFD(�)·고립 surrogate·제어문자가
     다수인가. 정상 중국어/영어 문장으로 읽히는가(사람이 판단). qwen3만/
     gemma3만/둘 다 중 어디서 재현되는가. `llama.rn` 버전(`package.json`)
     기록.
   - mojibake면 이 저장소 코드로 못 고침 — `judge()`를 느슨하게 해 통과
     시키는 것은 원칙 I 위반. 결론만 남기고 14번 병합.

5. **3회 재현 방법론** (FR-001, Clarifications)
   - "사진을 보지 않음" + 과거 하루(009 범위 안, 신호 빈약) 고정.
   - 두 캐릭터 각 3회. 매 회 `adb logcat` 새 캡처(또는 연속 캡처에서
     타임스탬프로 분리). 갈래·거부 본문·`writingMs`·`ending.kind` 채록.
   - 3회 동일 → 확정. 갈림 → "3회 중 M회" 분포, 최빈 갈래를 교정 대상.
   - 재현이 아예 안 되면(정상 저장) → 스테일 Metro 의심,
     `npx expo start --dev-client --clear` 후 재시도. 그래도 정상이면
     "환경 요인, 클린 Metro에서 재현 불가"로 종료(코드 변경 0).

6. **금동이(quiet) 정상 동작의 대조 의미**
   - 사용자 보고에서 `quiet`는 정상. 같은 파이프라인·같은 `judge()`·같은
     프롬프트 구조에서 `quiet`만 통과한다는 것은 **원인이 캐릭터에서 오는
     두 가지(출력 언어, 모델) 중 하나**임을 강하게 시사한다. research가
     이 대조를 명시해 조사 범위를 좁힌다.

**Output**: research.md — 6개 항목의 Decision/Rationale/Alternatives.

## Phase 1 — Design & Contracts

### data-model.md

문서 전용 관측 레코드(제품 타입 아님):

- **InvestigationRun** — `{ character, runIndex(1..3), branch, rejectedBody?,
  endingKind, writingMs?, eyeballVerdict }`. `branch` ∈ `rejected:empty` |
  `rejected:echo` | `rejected:language` | `rejected:unfinished` | `timed-out` |
  `generation-failed` | `saved-ok`(재현 안 됨). `eyeballVerdict` ∈
  `empty` | `echo` | `wrong-language` | `mojibake` | `normal-target-language` |
  `n/a`.
- **CharacterFinding** — `{ character, branchDistribution: Map<branch, count>,
  dominantBranch, chosenPath(US2|US3|US4|env-factor), residual[] }`.
- **findings.md 구조** — 헤더(기기·빌드·Metro·`llama.rn` 버전·날짜), 캐릭터별
  섹션(3회 표 + 거부 본문 + 육안 판정), 원인 결론, 교정 내역(있으면 diff 요약)
  또는 "코드 변경 0줄" + `git grep 028-investigation` 0건 확인, 미확인 잔여,
  로드맵 갱신 내역.

상태 전이: 없음(진단).

### contracts/

- **investigation-record.md** — US1의 관측 레코드 필수 필드와 갈래 판정
  규칙. "3회 동일 → 확정 / 갈림 → 분포 + 최빈" 규칙. 육안 판정 기준
  (mojibake vs wrong-language vs normal 구분법). 문서 전용 — 코드 계약
  아님. `findings.md`가 이 레코드를 채우면 SC-001·SC-002 충족.
- **language-judgment.md** — **조건부 코드 계약**.
  - 교정 (a): `isWrongLanguage()` 또는 문자 범위 상수 변경 시 지켜야 할
    불변식 — (i) `REJECT_REASONS` 정확히 4개(A-7), (ii) 한국어 캐릭터
    (`quiet`/`narrative`/`imaginative`)는 한글 외 문자를 금지하지 않는
    비대칭 유지, (iii) `chinese`/`english`의 한글 금지 유지(헌법 로스터
    MUST NOT), (iv) `judge()` 순서(unfinished→empty→echo→language) 무변경,
    (v) 임계값·비율·점수 도입 금지. 계약 테스트: 조사에서 채록한 정상
    본문이 통과 + 위반 주입(범위를 되돌리면 FAIL).
  - 교정 (b): `prompt.ts`의 출력 언어 지시 강화 시 — (i) 프롬프트는
    `prompt.ts`에만(005 FR-013b), (ii) `promptPrefix()`==`fixedHead().join`
    바이트 동일(P8), (iii) 캐릭터별 접두사 유일성(P10·P11 — 018 KV 캐시),
    (iv) `instructionLines()`가 강화된 줄을 포함(P7 — 되뱉기 비교 대상
    일치), (v) `LANGUAGE` 맵 값 무변경. 계약 테스트: `prompt.test.ts`
    확장 + 위반 주입.
  - 교정 (c)/(d): 코드 계약 없음 — `git grep 028-investigation` 0건 +
    `git diff src/` 0줄이 유일한 "계약".

### quickstart.md

실기기 조사 절차(순서):

1. 사전 — `a4`/`a5` 모델 `files/models/` 존재 + verdict `passed:true` 확인
   (없으면 재배치). Metro `EXPO_PUBLIC_APP_ENV=dev ... --clear`로 클린 기동.
   `adb reverse tcp:8081 tcp:8081`. `deviceLocked=0`.
2. 임시 로그 삽입 — `on-device.ts` 3개 거부 분기에 `console.log` 1줄씩
   (research §3). `npm run test:logic`이 여전히 통과하는지(로그는 로직을
   안 바꿈).
3. 재현 — `adb logcat -c` → 샤오바이 "사진 안 봄" 과거 하루 생성 →
   `adb logcat -d > run1.log`. 3회 반복. 모카도 3회.
4. 채록 — 각 로그에서 `{ kind }`·`[028-investigation]` 줄·`writingMs`·
   `ending` 추출 → `findings.md` 표.
5. 육안 판정 — 거부 본문을 사람이 읽어 mojibake/wrong-language/normal 판정.
6. 원인 갈래 결정 — 최빈 갈래 → US2 / US3 / US4 / env-factor 중 하나.
7. 교정(있으면) — 계약 테스트 먼저 → 최소 수정 → `npm run test:logic` +
   `npm run lint` → 위반 주입 확인.
8. 임시 로그 제거 — 3줄 삭제. `git grep 028-investigation` 0건.
9. 재확인(교정 있었으면) — 두 캐릭터 재생성해 일기 저장·목록 반영 +
   금동이 회귀 없음(FR-014).
10. 문서 — `findings.md` 완성, `docs/roadmap/README.md` 17번(+조건부 14번)
    갱신.

기대 결과: SC-001~007 중 해당하는 것 충족. 코드 변경 0줄이면 `git diff src/`
0줄 + `findings.md`에 "왜 코드로 못 고치는가".

## Post-Design Constitution Re-Check

Phase 1 산출물(data-model.md·contracts/·quickstart.md)을 만든 뒤 재점검:

- **원칙 I** — contracts/language-judgment.md C절이 "`judge()`를 느슨하게
  하는 교정 금지"를 명시. mojibake 경로는 코드 0줄. 통과.
- **원칙 II** — 교정 (b) 계약(C-LJ-B1~B8)이 프롬프트를 `prompt.ts` 한
  곳에 유지하고 `SPEAKER_RULES`를 안 건드림을 못 박음. 통과.
- **원칙 III** — C-LJ-A2·A3·B5가 `LANGUAGE` 맵·`roster`·`persona` 무변경,
  한국어 캐릭터 비대칭 유지를 계약으로 고정. 통과.
- **원칙 IV** — C-IR-4가 "자동 채점 코드 금지, 사람이 육안 판정"을,
  C-LJ-A1·A5가 "`REJECT_REASONS` 4개·임계값 미도입"을 계약화. 임시 로그는
  3줄 `console.log`(모듈 아님)이고 C-IR-6이 제거를 계약. 통과.
- **원칙 V** — data-model.md의 CharacterFinding 규칙이 "3회 갈리면 분포로
  정직하게", C-IR-2가 "화면 문구 추정 금지, 로그의 `{kind}`에서 확정"을
  고정. 통과.
- **개발 방식** — quickstart 5단계가 "계약 테스트 먼저 → 최소 수정 →
  위반 주입". 통과.

**설계 후에도 위반 없음.** 새 타입·새 모듈·새 디렉터리 0개. 조건부
코드는 한 함수(`acceptance.ts`) 또는 한 줄(`prompt.ts`)로 상한이 계약에
박혀 있다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비움.

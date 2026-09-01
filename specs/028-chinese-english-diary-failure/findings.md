# Findings: 샤오바이·모카 일기 생성 실패 조사

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

> **상태: Phase 3(US1) 실기기 실측 완료. `chosenPath` 확정 — 아래.**

---

## 환경

| 항목 | 값 |
|---|---|
| 기기 | SM-S901N (Galaxy S22) |
| Android | 16 / SDK 36 |
| 빌드 | dev/debug (`npx expo run:android`, gradle 7m 22s). 027 US4 release는 서명 불일치로 uninstall 후 debug 설치 (`flags=[ DEBUGGABLE ... ]` 확인) |
| Metro | `EXPO_PUBLIC_APP_ENV=dev NODE_ENV=development npx expo start --dev-client --clear`, `adb reverse tcp:8081 tcp:8081`. 번들 8028ms 로드 |
| llama.rn | **0.12.8** (`package.json`). 네이티브 로그 태그 `RNLlama` |
| 모델 (chinese) | a4 = Qwen3-1.7B-Q4_K_M, 1,107,409,472 B, md5 `dc4836c71a28a136d2a5b782b8465b6f` (기기 `run-as md5sum` 확인, 로드맵 17번 "1차 실측" verdict 지문과 일치) |
| 모델 (english) | a5 = gemma-3-1b-it-Q4_K_M, 806,058,272 B, md5 `b00db505c25aa7178848ed1b4aa7af34` (동일하게 확인) |
| 파일명 | `files/models/a4.bin` · `a5.bin` (`roster.ts` `fileNameFor(key) = ${key}.bin`) — 처음에 `.bin` 없이 뒀다가 "캐릭터 상태를 읽는 중…"에서 멈춰 정정 |
| state.json | a4·a5 둘 다 `{ passed: true, verifiedMd5, verifiedBytes }` 수동 작성 → 캐릭터 탭에서 "쓸 수 있음" 확인 |
| 조사 조건 | "사진을 보지 않음" + 과거 하루 **2026-08-30** (사진·좌표 심지 않음 → 모든 신호 `unknown`) |
| 조사 날짜 | 2026-09-02 (KST) |

**참고 — 조사 중 관측된 무해한 dev 로그**: 앱 시작 시
`ReactNativeJS: [Error: Uncaught (in promise, id: 0): "TypeError: Cannot read
property 'reload' of undefined"]` 토스트가 뜬다. dev-client의 fast-refresh
계열이며 온보딩·생성 경로와 무관(생성이 정상 진행됨).

---

## 임시 조사 로그 (FR-003a)

**삽입** (`src/inference/on-device.ts`):

| 분기 | 로그 |
|---|---|
| 판정 거부 | `console.log("[028-investigation] rejected", verdict.why, run.run.ending.kind, JSON.stringify(run.run.text))` |
| 타임아웃 | `console.log("[028-investigation] timed-out")` |
| 예외 | `console.log("[028-investigation] generation-failed", JSON.stringify(reason))` |

- 타입 무변경 (`Verdict`·`GenerationFailure`·`RunResult`에 `text` 안 넣음).
- `no-console` 규칙이 `eslint-config-expo`에 없어 `eslint-disable` 주석 불필요.
- 기기 없는 게이트 (삽입 후): `npm run lint` 0 errors, `npm run
  check:constitution` 위반 0, prettier clean, `npm run test:logic` 1749
  passed.

**제거 예정** (Phase 6, T035): `git grep "028-investigation"` → 0건.

### 제거 확인 (Phase 6 완료)

- [x] `git grep "028-investigation"` → 0건 (2026-09-02)
- [x] `git diff main -- src/` → **0줄** (`on-device.ts`가 `main`과 바이트 동일)

---

## 샤오바이 (chinese / qwen3-1.7b) — 3회

| run | branch | ending | writingMs(대략) | eyeball | notes |
|-----|--------|--------|-----------------|---------|-------|
| 1 | `rejected: unfinished` | `length` | ~40s (07:00:38→07:01:41 로그창) | **`unfinished` — `<think>` 미완** | 본문 전체가 Qwen3 영어 `<think>` 추론 블록. 512토큰 소진까지 실제 일기 본문에 도달 못 함 |
| 2 | `rejected: unfinished` | `length` | ~50s | 동일 | `<think>` 블록이 "write a diary entry in Korean" 얘기하다 소진 |
| 3 | `rejected: unfinished` | `length` | ~60s | 동일 | `<think>` 블록에서 "샤오바이" → "금동이"(환각) 언급하다 소진 |

**branchDistribution**: `{ "rejected:unfinished": 3 }` (3/3 동일)
**dominantBranch**: `rejected: unfinished` (ending = `length`)
**dominantEyeballVerdict**: `unfinished` — 모델이 **추론 블록(`<think>...`)만 내고
본문에 도달하지 못한 채 `n_predict`(512) 한도에 걸림**

거부 본문 예 (run1, 앞부분):
```
<think>
Okay, let's see. The user wants me to write a diary entry in Chinese for the
day of August 30, 2026, based on the given records. The main points are that
I'm the phone, not the owner, and I can only see what's in my pockets and bag.
... (512토큰까지 계속, </think> 도달 못 함, 실제 일기 0줄)
```

**원인**: Qwen3-1.7B는 **추론(reasoning) 모델**이라 답 앞에 `<think>...</think>`
사고 사슬을 낸다. `sampling.ts`의 `n_predict: 512`로는 이 저장소의 긴 프롬프트
(화자 규칙 8줄 + 제목 지시문 6문장 + …)에 대해 **`<think>` 안에서 예산을
전부 써버려** `</think>` 닫기 전에 잘린다 → `ending.kind = "length"` →
`judge()`의 첫 검사 `if (ending.kind !== "eos") return REJECT("unfinished")`에
걸림.

**mojibake 아님. `isWrongLanguage` 오탐 아님** (판정이 본문을 볼 기회조차 없음
— `unfinished`가 첫 검사).

**`chosenPath` = `US4-mojibake` 계열이지만 정확히는 "모델 부적합"** — 로드맵
14번(자동 생성용 서술형 모델 재검토)의 범위. `acceptance.ts`·`prompt.ts` 수정
불가:
- 판정 완화 불가 — `unfinished`(끊긴 글)를 통과시키면 헌법 원칙 I 위반
  (spec FR-012).
- 프롬프트로 `<think>`를 억제(`/no_think` 등)하는 것은 **캐릭터에서 오는 것을
  이름·출력 언어로 제한**한 원칙 III 경계를 넘고, `prompt.ts` 한 줄 수정 범위를
  벗어난다(Qwen3 전용 토큰을 프롬프트에 박는 것).
- `n_predict`를 늘리는 것은 `sampling.ts`(온디바이스·데스크톱 공유, 캐릭터
  무관) 전역 변경이라 이 스펙 범위 밖 + 다른 캐릭터 생성 시간에 영향.

---

## 모카 (english / gemma3-1b) — 3회

| run | branch | ending | writingMs | eyeball | notes |
|-----|--------|--------|-----------|---------|-------|
| 1 | **`saved-ok`** | `eos` | 31s | `normal-target-language`(단, 전부 지어냄) | 저장됨. title `**The Day of the Crimson Rain**`, 본문 영어. 사진·신호 0인데 "crimson rain"·향신료 상인·개 쫓는 소년 등 **완전 환각** |
| 2 | **`saved-ok`** | `eos` | ~31s (`writingMs: 31420`, 저장 JSON) | 동일 | 덮어쓰기. 같은 title, 본문 다름(작업장·기름등잔·brass cog 만지는 주인). 환각 |
| 3 | `rejected: unfinished` | `length` | ~20s | **`wrong-language` + 반복 붕괴** | 본문이 **한국어**(모카는 영어여야 함, 헌법 로스터 MUST NOT). `**오늘의 감정**` + `#` 마크다운. "모카는 곰팡이가 핀 끈적한 냄새를 맡았다."를 **12회+ 반복**하다 512토큰 소진 |

**branchDistribution**: `{ "saved-ok": 2, "rejected:unfinished": 1 }`
**dominantBranch**: `saved-ok` (2/3) — 그러나 **성공 케이스도 전부 환각**이고
`title`에 금지된 `**` 마크다운이 섞임
**residual**: run3 (`rejected: unfinished`, 한국어 혼입 + 반복 붕괴)

거부 본문 (run3):
```
**오늘의 감정**

2026-08-30

모카는 낡은 벽돌길을 따라 걷고 있었다. ...
#
모카는 텅 빈 방에 섰다. ...
#
방 안에는 곰팡이가 핀 끈적한 냄새가 났다.  모카는 곰팡이가 핀 끈적한 냄새를
맡았다.  모카는 곰팡이가 핀 끈적한 냄새를 맡았다.  (×12+, 512토큰까지)
```

저장된 diary JSON (`files/diary/2026-08-30.json`, run2):
```json
{
  "date": "2026-08-30",
  "text": "August 30th, 2026\n\nThe dust settled, a thick, red layer clinging
           to everything. I was nestled amongst the shadows of the workshop...",
  "title": "**The Day of the Crimson Rain**",
  "character": "english",
  "signalsUsed": { "photos": {"kind":"unknown"}, "places": {"kind":"unknown"}, ... },
  "timing": { "writingMs": 31420 }
}
```
**U+FFFD·surrogate 없음 — mojibake 아님.** 인코딩은 깨끗하다.

**원인**: gemma3-1b는 지시 이행이 불안정하다(헌법 로스터가 이미 관측:
"gemma는 지시를 따르지 못해 프롬프트를 되뱉었다"). 실측에서 세 가지가 동시에:
1. **환각** (2/3 성공 케이스 포함 전부) — 신호가 0인데 장면을 지어낸다.
   이것은 `judge()`가 잡지 않는다(의미 판정은 프롬프트+사람의 몫, `acceptance.ts`
   주석). 원칙 II 위반이지만 이 스펙의 조사 대상(저장 실패)이 아니다.
2. **`title`에 `**` 마크다운** — `title.ts`가 `judge()` 통과 후 제목을
   분리하지만 `**...**`를 떼지 못해 `**The Day of the Crimson Rain**`이 그대로
   저장. (014·017이 프롬프트로 마크다운 금지를 넣었으나 gemma가 무시.)
3. **한국어 혼입 + 반복 붕괴** (1/3) — 영어 캐릭터가 한국어로, 그리고 같은
   문장을 무한 반복하다 `length`로 잘림 → `unfinished` 거부.

**`chosenPath` = `US4` (로드맵 14번)** — 코드 수정 불가:
- run3의 `unfinished`(반복 붕괴)를 판정 완화로 통과시키면 원칙 I 위반.
- run1·2의 환각·`**` title은 이 스펙(저장 실패 조사)의 범위 밖 — 별건.
- gemma3-1b 자체가 이 프롬프트에 대해 불안정. 모델 재검토(14번).

---

## 금동이 대조 (quiet / kanana-1.5-2.1b)

- 사용자 보고: 금동이는 정상. 이 세션에서는 금동이 모델(a1)을 배치하지
  않아 직접 재확인 못 함(조사 조건상 불필요 — 샤오바이/모카만).
- **분석** (research §6이 예측한 대로): `quiet`·`chinese`·`english`는 같은
  파이프라인·같은 `judge()`·같은 프롬프트 구조·같은 `SAMPLING`을 쓴다.
  `quiet`(kanana)만 통과하는 이유는 **kanana가 추론 블록을 내지 않고
  (`<think>` 없음) 한국어 지시를 안정적으로 따르기 때문**. 원인이 캐릭터에서
  오는 것(= 모델 자체)임이 확정됐다. `${language}로 써라.` 지시문이나 판정
  로직의 문제가 아니다.

---

## 원인 결론

| 캐릭터 | branch 분포 | chosenPath | 근거 |
|---|---|---|---|
| **샤오바이** (qwen3-1.7b) | `unfinished` 3/3 (ending=length) | **US4 → 로드맵 14번** | Qwen3는 추론 모델. `<think>` 블록이 `n_predict:512`를 소진해 본문 미도달. mojibake 아님, 판정 오탐 아님 |
| **모카** (gemma3-1b) | `saved-ok` 2/3 (전부 환각·`**`title), `unfinished` 1/3 (한국어 혼입+반복 붕괴) | **US4 → 로드맵 14번** | gemma3-1b 지시 이행 불안정. mojibake 아님 |

**공통**: 둘 다 **모델 부적합**이며 `acceptance.ts`·`prompt.ts`·`store.ts`
수정으로 고칠 수 없다. `judge()`를 느슨하게 하는 것은 헌법 원칙 I 위반
(spec FR-012). **코드 변경 0줄.** US2(판정 교정)·US3(프롬프트 강화) 발동 안 함.

**024 §10 (EXAONE mojibake)과의 관계**: 024는 exaone 출력이 **깨진 UTF-8**
이었다. 이번 qwen3·gemma3는 **인코딩은 깨끗**하다 — 실패 양상이 다르다
(qwen3=추론 블록 미완, gemma3=불안정). 다만 **셋 다 "이 저장소의 프롬프트·
샘플링 설정에서 자동 저장 가능한 일기를 안정적으로 못 낸다"**는 공통점으로
로드맵 14번에 함께 묶인다.

**로드맵 17번의 초기 추측 정정**:
- ~~`isWrongLanguage` 유력~~ → **아님**. qwen3는 판정이 본문을 볼 기회조차
  없다(`unfinished`가 첫 검사). gemma3도 성공 2회는 판정 통과.
- ~~mojibake (024 §10 계열)~~ → **아님**. 인코딩 깨끗.
- **실제**: qwen3 = 추론 모델 구조 문제, gemma3 = 지시 이행 불안정. 둘 다
  모델 교체/재검토 사안(14번).

---

## 교정

**없음.** `chosenPath`가 두 캐릭터 모두 `US4`.

- `git diff src/` (임시 로그 제외) = 0줄 예정 (T035에서 임시 로그 제거 후 확인).
- 왜 코드로 못 고치는가:
  - qwen3 `unfinished`, gemma3 run3 `unfinished`(반복 붕괴) — 끊긴 글을
    `judge()` 완화로 통과시키면 헌법 원칙 I 위반 (spec FR-012).
  - `n_predict` 상향은 `sampling.ts` 전역(캐릭터 무관, 데스크톱 공유) 변경
    → 이 스펙 범위 밖.
  - Qwen3 `<think>` 억제 토큰을 프롬프트에 박는 것은 원칙 III(캐릭터에서
    오는 것은 이름·언어뿐) 경계 + `prompt.ts` 한 줄 범위 초과.

---

## 합성 하루·모델 사용 확인 (FR-013 · 010 원칙)

- [x] 조사에 쓴 것은 **모델 파일**(로스터 정품 GGUF, md5가 로드맵 지문과
  일치)과 **빈 과거 하루**(2026-08-30, 사진·좌표 안 심음)뿐. "경로가
  도는가"만 봤다 — 파이프라인이 `generation` 단계에 도달하고 `judge()`가
  갈래를 붙이는 것. 출력 품질을 결론에 쓰지 않았다(품질은 애초에 이 스펙의
  대상이 아니고, 결론은 "어느 실패 갈래인가"뿐).

---

## 미확인 잔여

- **모카 run1·2의 환각·`**` title**: 저장은 됐으나 (a) 신호 0인데 장면을
  지어냄(원칙 II), (b) `title.ts`가 `**...**` 마크다운을 못 뗌. 이 스펙
  (저장 실패 조사)의 범위 밖 — 로드맵 14번 또는 별건.
- **모카 3회가 갈림** (`saved-ok` 2 / `unfinished` 1): gemma3-1b 불안정성의
  표본. 14번에서 gemma3 재평가 시 참고.
- **금동이 직접 재확인 안 함**: 이 세션에서 a1 미배치. 사용자 보고("금동이
  정상")를 신뢰하고 research §6 분석으로 갈음.
- **narrative(루이/exaone)**: 이 스펙 범위 밖(024 §10에서 이미 다룸).
- **release 재확인**: 순수 조사 + 코드 0줄이라 불필요(012 기준). 임시
  로그도 제거되므로.

---

## 로드맵 갱신

- `docs/roadmap/README.md` **17번**: "조사 완료 — 샤오바이(qwen3)·모카(gemma3)
  둘 다 **모델 부적합**으로 확정. mojibake·판정 오탐·프롬프트 문제 아님.
  qwen3는 추론(`<think>`) 블록이 `n_predict:512`를 소진해 본문 미도달
  (`rejected: unfinished`, ending=length, 3/3). gemma3는 지시 이행 불안정
  (저장 2/3이나 전부 환각+`**`title, 나머지 1/3은 한국어 혼입+반복 붕괴로
  `unfinished`). **코드 변경 0줄.** `acceptance.ts`/`prompt.ts` 수정으로
  해결 불가(`judge()` 완화 = 원칙 I 위반). → **14번(자동 생성용 서술형 모델
  재검토)으로 병합.**"
- **14번**에 추가: "028 조사 결과 qwen3-1.7b·gemma3-1b도 이 저장소의
  프롬프트·`n_predict:512`에서 자동 저장 가능한 일기를 안정적으로 못 낸다
  (qwen3=추론 블록 미완, gemma3=불안정). exaone mojibake와 함께 **외국어
  캐릭터 2개 + narrative 1개 = 로스터의 3/5가 자동 생성에 부적합** — 로스터
  재검토 또는 모델 교체 필요."

# Quickstart — 샤오바이·모카 일기 생성 실패 조사

**Date**: 2026-09-01 | **Plan**: [plan.md](./plan.md)

실기기에서 조사를 수행하는 절차. 산출물은 `findings.md`와 (조건부) 최소
교정. 019·027 계열의 진단 스펙이라 새 Maestro 흐름·새 화면은 없다.

---

## 사전 조건

1. **기기·빌드**: SM-S901N(Galaxy S22), dev/debug. `npx expo run:android`로
   설치되어 있어야 함(`run-as`·모델 배치 필요). 027 US4 이후 release가
   설치돼 있으면 dev 빌드를 다시 깔고 모델을 재배치한다(메모리
   `alpharium-device-session-batch` 참조).
2. **모델**: `files/models/`에 `a4`(qwen3, 1,107,409,472 바이트)·
   `a5`(gemma3, 806,058,272 바이트). `state.json`에 둘 다
   `passed: true`. 없으면 개발 기계에서 재다운로드 → `run-as cp` →
   `state.json` verdict 수동 기록(024 T037 선례).
3. **Metro (클린)**: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`.
   **스테일 Metro가 오류 없이 깨진 번들을 서빙하는 것**이 이 저장소의
   반복 함정이라(024·027) `--clear` 필수. `adb reverse tcp:8081 tcp:8081`.
4. **잠금 해제**: `adb shell dumpsys trust` → `deviceLocked=0`.
5. **한글 로그**: 콘솔이 CP949로 뭉갤 수 있으니 `adb logcat`을 파일로
   받아 UTF-8로 읽는다.

---

## 1단계 — 임시 조사 로그 삽입 (FR-003a)

`src/inference/on-device.ts`의 `generate()` 안 세 지점에 `console.log`
한 줄씩 (research §3):

- 판정 거부 분기 — `return { kind: "rejected", why: verdict.why }` 직전:
  `console.log("[028-investigation] rejected", verdict.why, JSON.stringify(run.run.text));`
- 타임아웃 분기 — `if (run.timedOut)` 안:
  `console.log("[028-investigation] timed-out");`
- 예외 분기 — `catch` 안 `return { kind: "generation-failed", reason }` 직전:
  `console.log("[028-investigation] generation-failed", JSON.stringify(reason));`

**타입 무변경.** `Verdict`·`GenerationFailure`·`RunResult`에 `text` 안
넣는다.

확인: `npm run test:logic` 여전히 통과(로그는 로직을 안 바꿈).
`npm run lint`도 통과(no-console 규칙이 있으면 이 3줄에 한해
`// eslint-disable-next-line no-console`을 같이 붙이고, 그것도 조사 후
함께 제거).

---

## 2단계 — 3회 재현 (FR-001)

고정 조건: **"사진을 보지 않음"** + 과거 하루(009 최근 3일 범위 안,
신호 빈약한 날).

샤오바이:

```
adb logcat -c
# 앱에서: 캐릭터 = 샤오바이, 사진 = 보지 않음, 과거 하루 선택 → 일기 쓰기
adb logcat -d > specs/028-chinese-english-diary-failure/logs/chinese-run1.log
```

3회 반복(`run1`·`run2`·`run3`). 모카도 동일하게 3회.

각 로그에서 채록:
- `on-device.ts` 반환 `{ kind }`(+`why`) — `[028-investigation]` 줄 또는
  파이프라인의 `` `${kind}: ${detail}` ``
- 거부 본문 전문 (`[028-investigation] rejected <why> "<body>"`)
- `ending` (`run.run.ending.kind`)
- `writingMs` (있으면 — `timing.writingMs`)

→ `findings.md`의 캐릭터별 표(3행)에 적는다.

---

## 3단계 — 육안 판정 (FR-003, contracts/investigation-record.md C-IR-4)

거부 본문을 사람이 읽어 `eyeballVerdict` 결정:
`empty` / `echo` / `wrong-language` / `mojibake` / `normal-target-language`.

- mojibake: U+FFFD(�) 다수 / 고립 surrogate / 제어문자 / `###`·`**`.
- wrong-language: 읽히긴 하지만 기대 언어 아님(qwen3인데 한글 등).
- normal-target-language: 정상 중국어/영어인데 거부됨 → 판정 범위 버그
  의심.

**자동 채점 스크립트를 만들지 않는다**(원칙 IV).

---

## 4단계 — 원인 갈래 결정 (data-model.md CharacterFinding)

- 3회 동일 → `dominantBranch` 확정.
- 갈림 → `branchDistribution` "3회 중 M회" + 최빈. `residual`은 findings
  "미확인 잔여"로.
- `chosenPath` ∈ `US2-acceptance` / `US3-prompt` / `US4-mojibake` /
  `env-factor` (research §종합의 갈림길 표).
- 두 캐릭터가 다른 `chosenPath`일 수 있다 — 각각 독립.
- **재현 실패**(3회 다 정상 저장): 클린 Metro 재기동 후 재시도. 여전히
  정상이면 `env-factor`로 종료(코드 0줄).

---

## 5단계 — 조건부 교정

### `chosenPath === "US2-acceptance"` (희박)

`contracts/language-judgment.md` A절. 계약 테스트 먼저:
- `__tests__/diary/acceptance.test.ts`에 채록한 정상 본문 통과 케이스 추가.
- `src/diary/acceptance.ts`의 문자 클래스 상수(`HANJA`/`LATIN`)만 최소
  수정. `REJECT_REASONS`·`judge()` 순서·`MIN_ECHO_LENGTH` 무변경.
- `npm run test:logic` + `npm run lint`.
- 위반 주입: 변경을 되돌리면 새 케이스 FAIL. 한글 금지를 실수로 풀면
  "chinese가 한글 섞으면 거부" FAIL.
- **실기기 재확인**(FR-014·SC-004) — 두 캐릭터 재생성 저장·목록 반영 +
  금동이 회귀 없음. debug 1회.

### `chosenPath === "US3-prompt"`

`contracts/language-judgment.md` B절. 계약 테스트 먼저:
- `__tests__/diary/prompt.test.ts`에 강화 문장이
  `fixedHead()`/`buildPrompt()`/`instructionLines()` 세 곳에 바이트
  동일하게 들어가는 케이스 추가.
- `src/diary/prompt.ts`의 `fixedHead()` 안 `` `${language}로 써라.` ``
  한 줄만 강화(예: `` `반드시 ${language}로만 써라. 다른 언어를 섞지 마라.` ``).
  `LANGUAGE` 맵·`SPEAKER_RULES`·`TITLE_INSTRUCTION` 무변경.
- `npm run test:logic` + `npm run lint`. P7·P8·P10·P11 녹색 확인.
- 위반 주입: 강화 문장을 `buildPrompt()`에만 넣고 `fixedHead()`에서 빼면
  P8 FAIL.

### `chosenPath === "US4-mojibake"` 또는 `"env-factor"`

코드 변경 0줄. `findings.md`에 결론·근거. mojibake면
`docs/roadmap/README.md` 17번 → "14번과 병합", 14번에 qwen3·gemma3 추가.

---

## 6단계 — 임시 로그 제거 (FR-015 · SC-007)

1단계에서 넣은 3줄(+ eslint-disable 주석) 삭제.

```
git grep "028-investigation"          # → 0건
git diff src/                         # 교정 없으면 0줄. 교정 있으면 교정분만
```

---

## 7단계 — 실기기 재확인 (교정이 있었을 때만, FR-014)

- 샤오바이·모카로 재생성 → 일기가 저장되고 목록에 나타난다.
- 금동이(`quiet`)로 생성 → 회귀 없이 정상.
- (US3면) 오드·루이도 → 여전히 한국어, 되뱉기·지어내기 위반 없음.
- debug 1회로 충분(순수 로직/프롬프트 문자열, 012 기준).

---

## 8단계 — 문서

- `findings.md` 완성(data-model.md 구조).
- `docs/roadmap/README.md` 17번 결론 갱신(+조건부 14번).
- 커밋 메시지 한국어. `main` 아닌 `028-chinese-english-diary-failure`
  브랜치에서 커밋(`git branch --show-current` 확인 — AGENTS.md 경고).

---

## 기대 결과 (성공 기준 매핑)

| 단계 | 충족 SC |
|---|---|
| 2·3 | SC-001(갈래 분포 확정), SC-002(거부 본문 육안 판정) |
| 4·5 | SC-003(정확히 하나의 경로 선택) |
| 7 | SC-004(교정 후 저장·목록 반영), SC-005(다른 캐릭터 회귀 없음) |
| 5 | SC-006(`REJECT_REASONS` 4개) |
| 6 | SC-007(교정 없으면 `git diff src/` 0줄 + 근거) |

# Findings: 샤오바이·모카 일기 생성 실패 조사

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

> **상태: 진행 중 (Phase 1·2 완료, Phase 3 실기기 실측 대기)**
>
> 이 스펙의 본체는 실기기에서 사람이 두 캐릭터로 3회씩 일기를 생성하고
> `adb logcat`에서 거부된 본문·실패 갈래를 채록·육안 판정하는 것이다
> (FR-001~005). 아래 표는 그 실측이 들어갈 자리이며 지금은 비어 있다.

---

## 환경

| 항목 | 값 | 확인 |
|---|---|---|
| 기기 | SM-S901N (Galaxy S22) | `adb getprop ro.product.model` |
| Android | 16 / SDK 36 | `adb getprop ro.build.version.release` = 16 |
| 빌드 | ⚠️ **현재 release APK 설치됨** (027 US4 잔재, `flags=0x0`, `run-as` 불가) — 조사 전 `npx expo run:android`로 dev/debug 재설치 필요 | `dumpsys package` `flags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ALLOW_BACKUP ]`, `versionName=1.0.0` |
| Metro | 조사 시작 시 `--clear`로 클린 기동 (T004) | — |
| llama.rn | 0.12.8 | `package.json` L17 `"llama.rn": "^0.12.8"` |
| 모델 (chinese) | a4 = Qwen3-1.7B-Q4_K_M, expectedBytes 1,107,409,472 | `roster.ts` — 기기 배치는 dev 빌드 재설치 후 재배치 필요 (release라 `run-as` 확인 불가) |
| 모델 (english) | a5 = gemma-3-1b-it-Q4_K_M, expectedBytes 806,058,272 | `roster.ts` — 위와 같음 |
| deviceLocked | 0 (잠금 해제됨) | `dumpsys trust` |
| 조사 날짜 | 2026-09-01 (Phase 1·2), 실측일 __ | — |

**⚠️ 실측 전 필수 준비** (tasks.md T002·T003):
1. `npx expo run:android` — dev/debug 빌드 재설치 (현재 release가 깔려 있어 `run-as`·개발자 탭 불가)
2. 모델 재배치 — 개발 기계에서 a4·a5(최소) 재다운로드 → `run-as cp files/models/` → `state.json`에 `passed: true` verdict 수동 기록 (024 T037 선례)
3. `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear` + `adb reverse tcp:8081 tcp:8081`

---

## 임시 조사 로그 (FR-003a)

**삽입 완료** (Phase 2, `src/inference/on-device.ts`):

| 분기 | 위치 | 로그 |
|---|---|---|
| 판정 거부 | `if (!verdict.ok)` 블록, `return { kind: "rejected", ... }` 직전 | `console.log("[028-investigation] rejected", verdict.why, run.run.ending.kind, JSON.stringify(run.run.text))` |
| 타임아웃 | `if (run.timedOut)` 안 | `console.log("[028-investigation] timed-out")` |
| 예외 | `catch` 안, `return { kind: "generation-failed", ... }` 직전 | `console.log("[028-investigation] generation-failed", JSON.stringify(reason))` |

- 타입 무변경 — `Verdict`·`GenerationFailure`·`RunResult`에 `text` 안 넣음.
- `no-console` eslint 규칙이 `eslint-config-expo`에 없어 `eslint-disable`
  주석은 넣지 않음 (넣으면 "unused directive" 경고).
- 게이트 확인 (T011): `npm run lint` 0 errors, `npm run check:constitution`
  위반 0, prettier clean, `npm run test:logic` 1749 passed.

**제거 예정** (Phase 6, T035): `git grep "028-investigation"` → 0건,
`git diff src/`에 안 보임. 아래 "제거 확인"에 결과를 적는다.

### 제거 확인 (Phase 6에서 채움)

- [ ] `git grep "028-investigation"` → 0건
- [ ] `git diff src/`에 임시 로그 3개 흔적 없음

---

## 샤오바이 (chinese / qwen3-1.7b) — 3회

| run | branch | ending | writingMs | eyeball | notes |
|-----|--------|--------|-----------|---------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

- **거부 본문 (회차별 전문)**:
  - run1:
  - run2:
  - run3:
- **branchDistribution**:
- **dominantBranch**:
- **dominantEyeballVerdict**:
- **chosenPath**: (US2-acceptance / US3-prompt / US4-mojibake / env-factor)

---

## 모카 (english / gemma3-1b) — 3회

| run | branch | ending | writingMs | eyeball | notes |
|-----|--------|--------|-----------|---------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

- **거부 본문 (회차별 전문)**:
  - run1:
  - run2:
  - run3:
- **branchDistribution**:
- **dominantBranch**:
- **dominantEyeballVerdict**:
- **chosenPath**:

---

## 금동이 대조 (quiet / kanana-1.5-2.1b)

- 같은 조건("사진 안 봄", 같은 과거 하루)에서 정상 저장됨: __ (1회 확인)
- **분석** (research §6): `quiet`·`chinese`·`english`는 같은 파이프라인·
  같은 `judge()`(character만 다름)·같은 프롬프트 구조·같은 샘플링을 쓴다.
  `quiet`만 통과 → 원인은 **캐릭터에서 오는 두 가지** 중 하나:
  (1) 출력 언어 지시(`${language}로 써라.`) — 지시문 전체가 한국어인데
  출력만 다른 언어 요구, (2) 모델 자체(qwen3/gemma3는 헌법 로스터가
  "한국어에서 부서진다/되뱉는다"고 관측 — 중국어/영어에서는 괜찮아야 함).

---

## 원인 결론 (Phase 3·4·5 이후 채움)

- **샤오바이**: chosenPath = __ , 근거 = __
- **모카**: chosenPath = __ , 근거 = __
- **024 §10 (EXAONE mojibake)와의 연관**: __
  (qwen3·gemma3·exaone Q4_K_M + llama.rn 0.12.8에서 비ASCII 출력이 깨지면
  세 캐릭터가 같은 뿌리)

---

## 교정 (있으면 — Phase 4 또는 5)

### CorrectionRecord

- `path`: (US2-acceptance / US3-prompt)
- `file`: (src/diary/acceptance.ts / src/diary/prompt.ts)
- `changeSummary`:
- `contractTestsAdded`:
- `violationInjectionResult`:
- `rejectReasonsCount`: (정확히 4 — SC-006)
- `deviceReverify`: (두 캐릭터 재생성 저장·목록 반영 + 금동이 회귀 없음 — FR-014)

### 교정이 없으면 (US4-mojibake / env-factor)

- `git diff src/` → 0줄 확인: __
- 왜 코드로 못 고치는가: __
  (mojibake는 GGUF 토크나이저/디코더 + llama.rn 바인딩 문제, `judge()`를
  느슨하게 해 깨진 글을 통과시키는 것은 헌법 원칙 I 위반 — spec FR-012)

---

## 합성 하루·모델 사용 확인 (FR-013 · 010 원칙)

- [ ] 조사에 쓴 합성 하루·재배치 모델은 "경로가 도는가" 확인에만 썼고
  출력 품질 결론에 쓰지 않았음.

---

## 미확인 잔여

- (3회가 갈렸을 때의 소수 갈래 → 후속 스펙 14번 등)

---

## 로드맵 갱신 (Phase 6)

- `docs/roadmap/README.md` 17번: __
  (해소 — 028에서 `<경로>`로 교정 / mojibake 확인, 14번과 병합 / 환경 요인)
- (mojibake이면) 14번 항목에 qwen3·gemma3 추가: __

# Findings: 샤오바이·모카 일기 생성 실패 조사

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

> **상태: 진행 중 (Phase 1·2 완료 + 실기기 환경 재구축 완료, Phase 3 UI 조작 대기 — 기기 잠금 해제 필요)**
>
> 이 스펙의 본체는 실기기에서 사람이 두 캐릭터로 3회씩 일기를 생성하고
> `adb logcat`에서 거부된 본문·실패 갈래를 채록·육안 판정하는 것이다
> (FR-001~005). 아래 표는 그 실측이 들어갈 자리이며 지금은 비어 있다.

## 진행 로그 (2026-09-01 세션)

**완료:**
- Phase 1·2 (T001·T005~T013) — 임시 조사 로그 삽입, 기기 없는 게이트 통과.
- **실기기 환경 재구축**:
  - dev/debug 빌드 재설치 완료 — `npx expo run:android` (gradle BUILD
    SUCCESSFUL 7m 22s). release APK는 서명 불일치로 덮어 설치 거부
    (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) → **release 앱 uninstall 후
    debug 설치** (027 US4 잔재 데이터 소실, 새로 받은 모델로 대체하므로
    영향 없음). `dumpsys package`에 `flags=[ DEBUGGABLE ... ]` 확인.
  - 모델 재배치 완료 — a4(Qwen3-1.7B-Q4_K_M, 1,107,409,472 B, md5
    `dc4836c71a28a136d2a5b782b8465b6f`)·a5(gemma-3-1b-it-Q4_K_M,
    806,058,272 B, md5 `b00db505c25aa7178848ed1b4aa7af34`)를
    HuggingFace에서 재다운로드 → `/data/local/tmp` push → `run-as cp
    files/models/{a4,a5}`. **on-device md5가 로드맵 17번 "1차 실측"의
    verdict 지문과 정확히 일치** — 사용자가 증상을 본 것과 같은 파일.
  - `files/models/state.json` 수동 작성 — a4·a5 둘 다
    `{ passed: true, verifiedMd5, verifiedBytes }`. `readinessOf` 판정상
    두 캐릭터 `ready`가 되도록.
  - Metro 클린 기동 (`EXPO_PUBLIC_APP_ENV=dev NODE_ENV=development npx
    expo start --dev-client --clear`), `adb reverse tcp:8081 tcp:8081`.
    앱 실행 → `ReactNativeJS: Running "main" with {... "fabric":true}`,
    "Android Bundled 8028ms index.ts (829 modules)" — 번들 정상 로드.
  - VLM 모델(v1·v2)은 **배치하지 않음** — 조사가 "사진을 보지 않음"
    설정이라 불필요.

**중단 지점 (사람 필요):**
- 앱 실행 후 기기가 자동 잠금됨 (`deviceLocked=1`, `mCurrentFocus=
  Window{... Bouncer}` — PIN/패턴 입력 화면). **보안 잠금 해제는 사람이
  해야 한다** (AGENTS.md "PIN은 사람이 넣는다"). 잠긴 상태에서는
  `screencap`이 검게 나오고 UI 조작이 불가.
- 화면 자동 꺼짐 시간을 10분으로 늘려 둠 (`settings put system
  screen_off_timeout 600000`).

**다음 사람이 할 일 (quickstart.md 2단계부터):**
1. 기기 PIN/패턴 잠금 해제. `adb shell dumpsys trust`에 `deviceLocked=0`.
2. 앱에서: 캐릭터 = **샤오바이**, 사진 설정 = **사진을 보지 않음**,
   과거 하루(009 최근 3일 범위 안, 신호 빈약한 날) 선택 → **일기 쓰기**.
3. 각 회 `adb logcat -c` → 생성 → `adb logcat -d -s ReactNativeJS:* llama:*
   > specs/028-chinese-english-diary-failure/logs/chinese-run{1,2,3}.log`.
   3회 반복. **모카**도 동일하게 3회
   (`logs/english-run{1,2,3}.log`).
4. 로그에서 `[028-investigation] rejected <why> <ending> "<body>"` 또는
   `timed-out` / `generation-failed` 채록 → 아래 표.
5. 거부 본문 육안 판정 (T018) → `chosenPath` 결정 (T021) → 그에 따라
   Phase 4(US2) / Phase 5(US3) / Phase 6(US4).
6. **Phase 6 T035에서 임시 조사 로그 3줄 반드시 제거** —
   `git grep "028-investigation"` → 0건.

**임시 조사 로그가 아직 코드에 있음** (`src/inference/on-device.ts`,
FR-003a). 조사·교정 완료 후 T035에서 제거해야 최종 diff가 깨끗하다.

---

## 환경

| 항목 | 값 | 확인 |
|---|---|---|
| 기기 | SM-S901N (Galaxy S22) | `adb getprop ro.product.model` |
| Android | 16 / SDK 36 | `adb getprop ro.build.version.release` = 16 |
| 빌드 | ✅ **dev/debug 재설치 완료** (2026-09-01, gradle 7m 22s) — release는 서명 불일치로 uninstall 후 debug 설치 | `dumpsys package` `flags=[ DEBUGGABLE HAS_CODE ALLOW_CLEAR_USER_DATA ALLOW_BACKUP ]`, `versionName=1.0.0` |
| Metro | ✅ `--clear`로 클린 기동, 번들 8028ms 로드, `ReactNativeJS: Running "main"` | scratchpad/metro.log |
| llama.rn | 0.12.8 | `package.json` L17 `"llama.rn": "^0.12.8"` |
| 모델 (chinese) | ✅ a4 = Qwen3-1.7B-Q4_K_M, 1,107,409,472 B, md5 `dc4836c71a28a136d2a5b782b8465b6f` (기기 배치·검증됨) | `roster.ts` + on-device `md5sum` |
| 모델 (english) | ✅ a5 = gemma-3-1b-it-Q4_K_M, 806,058,272 B, md5 `b00db505c25aa7178848ed1b4aa7af34` (기기 배치·검증됨) | `roster.ts` + on-device `md5sum` |
| state.json | ✅ a4·a5 둘 다 `passed: true` (수동 작성) | `run-as cat files/models/state.json` |
| deviceLocked | ⚠️ **1 (잠김)** — 앱 실행 후 자동 잠금, PIN/패턴 입력 대기. 사람이 해제해야 함 | `dumpsys trust`, `mCurrentFocus=Window{... Bouncer}` |
| 조사 날짜 | 2026-09-01 (Phase 1·2 + 환경 재구축), 실측일 __ | — |

**✅ 실측 전 필수 준비 완료** (tasks.md T002·T003). 남은 것: 기기 잠금
해제(사람) → quickstart.md 2단계(캐릭터 3회 생성)부터.

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

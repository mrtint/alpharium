# Phase 1 — Data Model: 샤오바이·모카 일기 생성 실패 조사

**Date**: 2026-09-01 | **Plan**: [plan.md](./plan.md)

이 스펙은 **제품 타입을 만들지 않는다**(진단 스펙). 아래는 조사 관측을
기록하기 위한 **문서 전용 레코드 구조**이며 `findings.md`가 이 모양으로
채워진다. 제품 코드(`src/`)에는 대응 타입이 없다.

---

## InvestigationRun (한 회차 관측)

한 캐릭터로 한 번 생성한 결과.

| 필드 | 값 | 출처 |
|---|---|---|
| `character` | `chinese` \| `english` | 조사자가 선택 |
| `runIndex` | 1 \| 2 \| 3 | 회차 |
| `branch` | `rejected:empty` \| `rejected:echo` \| `rejected:language` \| `rejected:unfinished` \| `timed-out` \| `generation-failed` \| `saved-ok` | `adb logcat`의 `on-device.ts` 반환 `{ kind }`(+`why`) |
| `endingKind` | `eos` \| `length` \| `interrupted` \| `stop` \| `unknown` | `run.run.ending.kind` (임시 로그 또는 기존 로그) |
| `rejectedBody` | 문자열 (거부/실패 시) / `null` (`saved-ok`) | 임시 로그 `[028-investigation]`의 `JSON.stringify(run.run.text)` |
| `writingMs` | 정수 밀리초 / `null` | `on-device.ts`가 이미 재는 벽시계 (`timing.writingMs`). `timed-out`이면 없음 |
| `eyeballVerdict` | `empty` \| `echo` \| `wrong-language` \| `mojibake` \| `normal-target-language` \| `n/a` | 사람이 `rejectedBody`를 읽어 판정 |
| `notes` | 자유 서술 | 한글 혼입 여부, 금지 기호, surrogate 개수 등 |

**불변식**:
- `branch === "saved-ok"` ⟺ `rejectedBody === null` ⟺ `eyeballVerdict === "n/a"`.
- `branch === "rejected:empty"` ⟹ `rejectedBody`가 `""` 또는 공백만.
- `branch === "timed-out"` ⟹ `writingMs === null` (early return 전).

---

## CharacterFinding (캐릭터별 종합)

한 캐릭터의 3회를 묶은 결론.

| 필드 | 값 | 규칙 |
|---|---|---|
| `character` | `chinese` \| `english` | |
| `branchDistribution` | `{ <branch>: count }` (합 = 3) | 3회의 `branch` 집계 |
| `dominantBranch` | 위 분포의 최빈값 | 동률이면 근본적 갈래 택하고 근거 명시 |
| `dominantEyeballVerdict` | `dominantBranch` 회차들의 최빈 `eyeballVerdict` | |
| `chosenPath` | `US2-acceptance` \| `US3-prompt` \| `US4-mojibake` \| `env-factor` | research §종합의 갈림길 표 |
| `residual` | `InvestigationRun[]` (소수 갈래) | `dominantBranch`가 아닌 회차 — findings "미확인 잔여"로 |

**규칙**:
- 3회 동일 → `branchDistribution`이 `{ X: 3 }`, `residual` 비어 있음.
- 갈림 → `residual`에 소수 회차. 후속 스펙(14번 등)으로 넘긴다.
- 두 캐릭터의 `chosenPath`가 다를 수 있다(예: `chinese` → US3, `english`
  → US4). 각각 독립 적용.

---

## CorrectionRecord (교정 내역 — 있을 때만)

`chosenPath`가 `US2-acceptance` 또는 `US3-prompt`일 때만 존재.

| 필드 | 값 |
|---|---|
| `path` | `US2-acceptance` \| `US3-prompt` |
| `file` | `src/diary/acceptance.ts` \| `src/diary/prompt.ts` |
| `changeSummary` | 무엇을 어떻게 (예: "`HANJA` 범위에 U+3400–U+4DBF 추가", "`${language}로 써라.` → `반드시 ${language}로만 써라. 다른 언어를 섞지 마라.`") |
| `contractTestsAdded` | `__tests__/diary/*.test.ts`의 신규 케이스 목록 |
| `violationInjectionResult` | 위반 주입 시 어느 테스트가 FAIL하는지 |
| `rejectReasonsCount` | 정확히 `4` (SC-006 확인) |
| `deviceReverify` | 두 캐릭터 재생성 결과 + 금동이 회귀 확인 (FR-014) |

**불변식**:
- `path === "US2-acceptance"` ⟹ `REJECT_REASONS` 배열 무변경, `judge()`
  순서 무변경, 임계값/비율/점수 미도입.
- `path === "US3-prompt"` ⟹ `promptPrefix() === fixedHead().join("\n")`
  바이트 동일(P8), 캐릭터별 접두사 유일(P10·P11),
  `instructionLines()`가 강화된 줄 포함(P7), `LANGUAGE` 맵 값 무변경.

---

## findings.md 구조

```markdown
# Findings: 샤오바이·모카 일기 생성 실패 조사

## 환경
- 기기: SM-S901N (Galaxy S22), Android __ / SDK __
- 빌드: dev/debug, Metro __ (clean 여부)
- llama.rn: 0.12.8
- 모델: a4=Qwen3-1.7B-Q4_K_M, a5=gemma-3-1b-it-Q4_K_M (verdict passed)
- 조사 날짜: 2026-__-__

## 임시 조사 로그
- 삽입: src/inference/on-device.ts 3개 분기 (rejected/timed-out/generation-failed)
- 제거 확인: `git grep 028-investigation` → 0건, `git diff src/`에 없음

## 샤오바이 (chinese / qwen3-1.7b)
| run | branch | ending | writingMs | eyeball | notes |
|-----|--------|--------|-----------|---------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
- 거부 본문 (회차별 전문):
- branchDistribution / dominantBranch:
- 육안 판정:

## 모카 (english / gemma3-1b)
(동일 표)

## 금동이 대조
- 같은 조건에서 정상 저장됨(사용자 보고 재확인): __

## 원인 결론
- 샤오바이: chosenPath = __
- 모카: chosenPath = __
- 024 §10 (EXAONE mojibake)과의 연관: __

## 교정 (있으면)
- CorrectionRecord (위 구조)
- 없으면: "코드 변경 0줄" + git diff src/ 0줄 확인

## 미확인 잔여
- (소수 갈래, 후속 스펙으로)

## 로드맵 갱신
- docs/roadmap/README.md 17번: __
- (mojibake이면) 14번에 qwen3·gemma3 추가: __
```

---

## 상태 전이

없음 — 진단 스펙. 관측 → 분류 → (조건부) 교정 → 문서화의 1방향 흐름뿐.

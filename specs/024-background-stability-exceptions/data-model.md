# Data Model: 백그라운드 안정성 및 예외 대응

**대상 스펙**: [spec.md](./spec.md) · [plan.md](./plan.md)

이 스펙은 **새 영속 엔티티를 만들지 않는다.** 아래 "관측 레코드"는
`findings.md`에 사람이 옮겨 적는 표의 행 구조이며 **제품 코드에 타입으로
들어가지 않는다**(헌법 원칙 IV — 측정 장치를 제품에 들이지 않는다).

코드에 반영되는 데이터 규칙은 §5의 `STALE_LOCK_MS` 갱신 규칙 하나뿐이다.

---

## §1 캐릭터 완주 실측 레코드 (findings.md 표 행 — 문서 전용)

| 필드 | 값 | 비고 |
|---|---|---|
| `character` | `"narrative"` (이 스펙) | 007 저장 선택. 다른 캐릭터는 019·020이 이미 확인 |
| `dayShape` | `"photos"` \| `"empty"` | 010 도구로 심은 합성 하루. 품질 결론 금지 |
| `photoCount` | 정수 (dayShape=photos일 때) | 캡션 장수 |
| `coldOrWarm` | `"cold"` \| `"warm"` | cold = 앱 재시작 직후 첫 트리거(적재 포함) |
| `wallClockMs` | 정수 | 진입~완주(또는 failed 확정) 벽시계. **적재 시간 포함** |
| `engineRunMs` | 정수 | `engine.run()` 구간만(`GENERATION_TIMEOUT_MS` 대비용) |
| `visionMs` | 정수 (dayShape=photos일 때) | 캡션 단계 소요 |
| `result` | `"success"` \| `"failed"` \| `"timeout"` | `timeout` = `runWithTimeout()`에서 끊김 |
| `triggeredAt` | ISO8601 | 트리거 진입 시각 |
| `finalDiaryCount` | 정수 | 그 날짜의 저장된 일기 수(1이어야 함, SC-001) |
| `verdictPassed` | boolean | 판정 4갈래 통과 여부 |
| `notes` | 문자열 | 특이사항 |

**용도**: SC-001·SC-002. `wallClockMs`의 최댓값 M이 §5 규칙의 입력.

---

## §2 배터리 라운드 관측 (findings.md 표 행 — 문서 전용)

| 필드 | 값 | 비고 |
|---|---|---|
| `batteryException` | boolean | `deviceidle whitelist` +/− |
| `targetHour` | 0–23 | 설정한 목표 시각(현재+몇 분에 맞춘 시) |
| `roundStartedAt` | ISO8601 | 라운드 시작(예외 부여/해제 시각) |
| `triggerEnteredAt` | ISO8601[] | 각 `task-entered` 시각 |
| `delayFromTargetMin` | 정수[] | 목표 시각으로부터 각 시도까지 분 |
| `standbyBucket` | 정수 | `am get-standby-bucket` (예외 시 5=EXEMPTED) |
| `minLatencyReported` | 문자열 | `dumpsys jobscheduler`의 `Minimum latency` (예: `+14m59s...`) |
| `screenTouchedDuringRound` | boolean | 24시간 소크는 반드시 false여야 유효 |

**용도**: SC-003(예외: 첫 시도 ≤ 60분 MUST, 과반 ≤ 40분 SHOULD),
SC-004(무예외: 24시간 안 ≥ 1회 MUST).

---

## §3 재부팅 복구 관측 (findings.md 표 행 — 문서 전용)

| 필드 | 값 | 비고 |
|---|---|---|
| `autoDiaryEnabled` | boolean | 재부팅 전 설정 상태 |
| `phase` | `"before-reboot"` \| `"after-reboot-app-closed"` \| `"after-reboot-app-opened"` | 조회 시점 |
| `jobSchedulerRegistered` | boolean | `dumpsys jobscheduler`에 해당 Job 존재 |
| `directBootObserved` | boolean | 첫 잠금 해제 전 트리거 시 `run-as`/저장소 실패 관측 여부 |
| `notes` | 문자열 | |

**용도**: SC-006. 기대: enabled=true면 `after-reboot-app-opened`에서
`registered=true`. `after-reboot-app-closed`의 값은 한계로 문서화(보장
안 됨). enabled=false면 어느 phase에서도 `registered=false`.

---

## §4 권한 회수 재현 관측 (findings.md 표 행 — 문서 전용)

| 필드 | 값 | 비고 |
|---|---|---|
| `axis` | `"photos"` \| `"location"` | 회수한 권한 축 |
| `revokedDuringRun` | boolean | 실행 창 안에서 회수했는가 |
| `permissionQueryResult` | `PermissionState` | 회수 후 `photoPermission()` 반환값(§5 연구) |
| `storedSignalKind` | `"unknown"` \| `"none"` \| `"known"` | 저장된 일기의 해당 신호. **`"none"`이면 위반** |
| `otherAxisSurvived` | boolean | 사진 회수 시 위치가, 위치 회수 시 사진이 살아 있는가(FR-007) |
| `bodyHasAssertion` | boolean | 본문에 "사진을 안 찍었다" 류 단정. **true면 위반** |
| `verdictOrRejected` | `"passed"` \| `"rejected-echo"` \| `"rejected-empty"` | 신호 빈약 시 거부도 정상(FR-008) |
| `fileUntouchedOnReject` | boolean | 거부 시 기존 파일 보존(원칙 I) |

**용도**: SC-005. 기대: `storedSignalKind === "unknown"` 100%,
`bodyHasAssertion === false` 100%, `otherAxisSurvived === true`.

---

## §5 `STALE_LOCK_MS` 갱신 규칙 (코드에 반영되는 유일한 규칙)

### 규칙

```
M = §1 레코드의 wallClockMs 최댓값 (narrative, cold)
새_STALE_LOCK_MS = ceil(M × 2 / 60_000) × 60_000   // 분 단위 올림

if 새_STALE_LOCK_MS <= 현재값(5 * 60 * 1000):
    값 무변경. lock.ts의 근거 주석만 024 실측을 참조하도록 교체.
else:
    값을 새_STALE_LOCK_MS로 상향. 근거 주석도 교체.
```

### 제약 (contracts/stale-lock-basis.md가 잠금)

- `STALE_LOCK_MS`는 `src/schedule/lock.ts`에 **정확히 한 번** 정의(SL1).
  `pipeline.ts`·`task.ts`에 `300000`/`5 * 60 * 1000` 같은 리터럴 없음.
- 근거 주석이 `narrative` 실측을 참조(SL2). "`quiet` 2분 27초"만 남아
  있으면 위반.
- `decideAcquire`는 순수 함수 유지 — `nowMs` 인자, `Date.now()` 안 부름,
  100회 무작위 순서에서 두 `granted` 동시 유효 0건(SL3, 020 SC-005).
- 값 상향 시 새 값이 `M × 2` 이상이고 분 단위(SL4).

### 관계

- **입력**: §1 레코드 `wallClockMs` 최댓값 (research.md §1·§2).
- **영향받는 코드**: `src/schedule/lock.ts`만. `pipeline.ts`·`task.ts`는
  `STALE_LOCK_MS`를 import해 쓸 뿐 값을 모른다(020 L8).
- **검증**: `__tests__/schedule/lock.test.ts`(020 T038 확장) — SL1~SL5.

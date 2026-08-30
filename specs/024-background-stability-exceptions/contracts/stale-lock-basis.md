# Contract: `STALE_LOCK_MS` 실측 종속 규칙 (US1)

**대상 스펙**: [spec.md](../spec.md) FR-003 · [data-model.md](../data-model.md) §5

**대상 코드**: `src/schedule/lock.ts` (020이 만든 경합 잠금 만료 상수)

**성격**: 상수의 **근거**와 **단일 정의**를 잠그는 계약. 값 자체는 실기기
`narrative` 완주 실측(quickstart.md §1) 뒤에 규칙에 따라 정한다.

대상 스위트: `__tests__/schedule/lock.test.ts` (020 T038 확장).

---

## SL1 — 단일 정의

`STALE_LOCK_MS`는 `src/schedule/lock.ts`에 **정확히 한 번** 정의된다.
`src/diary/pipeline.ts`·`src/schedule/task.ts`의 소스에 `300000`,
`5 * 60 * 1000`, `4 * 60 * 1000` 같은 잠금 만료 시간 리터럴이 **없다**
(020 L8). 두 파일은 `STALE_LOCK_MS`를 import해 쓸 뿐이다.

**검사 방법**: `readFileSync`로 `pipeline.ts`·`task.ts`를 읽어 잠금 만료
리터럴 정규식이 안 걸리는지 확인.

---

## SL2 — 근거 주석이 `narrative` 실측을 참조

`src/schedule/lock.ts`의 `STALE_LOCK_MS` 위 주석이 `narrative` 백그라운드
완주 실측을 근거로 든다. 다음 중 하나에 해당하는 문구가 있어야 한다:

- "`narrative` ... 완주 ... 최댓값 ... × 2"
- "024 실측 ... narrative"

**위반**: 주석이 여전히 "019 실측 ... `quiet` ... 2분 27초의 2배"만 근거로
들고 `narrative` 실측 참조가 없으면 실패.

**왜**: 020의 `lock.ts` 주석이 명시한 게이트("narrative 백그라운드 완주가
4분을 넘으면 이 상수를 재검토")를 이 스펙이 실제로 수행했음을 소스가
드러내야 한다.

---

## SL3 — `decideAcquire`는 순수 함수 유지

- `decideAcquire(input)`는 `input.nowMs`를 인자로 받고 `Date.now()`/`new
  Date()`를 안 부른다(소스 검사).
- `input.existing === null` 또는 `input.nowMs - input.existing.acquiredAtMs >
  STALE_LOCK_MS`이면 `{ granted: true, record: {...} }`, 그 외 `{ granted:
  false }`.
- **100회 무작위 순서 시뮬레이션**: 두 owner(`"screen"`/`"background"`)가
  무작위 순서로 취득/해제를 시도할 때, 두 `granted`가 동시에 유효한 시점이
  0건이다(020 SC-005 재확인).

---

## SL4 — 값 규칙

`M` = quickstart.md §1의 `wallClockMs` 최댓값(`narrative`, cold).

- `ceil(M × 2 / 60_000) × 60_000 <= 300_000`(현재 5분)이면:
  **값·구조 무변경**, SL2 주석만 갱신.
- 초과하면: `STALE_LOCK_MS`를 `ceil(M × 2 / 60_000) × 60_000`으로 상향.
  새 값이 `M × 2` 이상이고 60000의 배수(분 단위)여야 한다.

**검사 방법**: 값이 상향됐다면 `STALE_LOCK_MS % 60000 === 0`이고
`findings.md`에 기록된 `M`에 대해 `STALE_LOCK_MS >= M * 2`. 무변경이면
`STALE_LOCK_MS === 5 * 60 * 1000` 그대로.

---

## SL5 — 위반 주입

| 주입 | 잡는 계약 |
|---|---|
| `pipeline.ts`에서 `STALE_LOCK_MS` import를 지우고 `300000` 리터럴로 대체 | SL1 실패 |
| `task.ts`에 `const STALE = 4 * 60 * 1000` 추가 | SL1 실패 |
| `lock.ts`의 근거 주석을 019 `quiet` 문구만 남기고 되돌림 | SL2 실패 |
| `decideAcquire` 안에서 `Date.now()`를 부르도록 수정 | SL3 실패 (소스 검사) |
| 값을 `M × 2` 미만으로(예: 초 단위 어긋난 값) 설정 | SL4 실패 |

각 주입 후 되돌린다.

---

## 실기기와의 관계 (quickstart.md §1)

1. `narrative` 캐릭터로 사진 있는 날/없는 날, cold/warm 백그라운드 완주
   시간을 잰다.
2. cold의 `wallClockMs` 최댓값 `M`을 `findings.md` §1 표에 기록한다.
3. SL4 규칙으로 `STALE_LOCK_MS`를 정한다. 상향이면 `lock.ts` 값+주석,
   무변경이면 주석만.
4. `lock.test.ts`(SL1~SL5)와 `npm run lint`(헌법 검사)가 통과하는지 확인.
5. `M`이 `GENERATION_TIMEOUT_MS`(180초) + 적재 시간에 근접하거나 초과하면
   그 사실을 `findings.md`에 기록하고 `VISION_PHOTO_LIMIT` 판단 근거로
   남긴다(FR-014 — 이 스펙은 상한·한도를 바꾸지 않는다).

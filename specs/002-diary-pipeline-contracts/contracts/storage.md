# 계약: 일기 저장

**대상**: `src/diary/store.ts`
**관련 요구사항**: FR-018f, FR-022~FR-024

---

## 인터페이스

```ts
type SaveResult =
  | { ok: true; overwrote: boolean }
  | { ok: false; reason: string }

interface DiaryStore {
  save(entry: DiaryEntry): Promise<SaveResult>
  load(day: DayDate): Promise<DiaryEntry | null>
  has(day: DayDate): Promise<boolean>
  listDays(): Promise<DayDate[]>
}
```

**저장은 인터페이스 뒤에 둔다.** 파일 방식이 맞지 않으면 구현만 갈아끼우고 파이프라인은
그대로 둔다. 테스트는 메모리 대역으로 돈다.

`overwrote`가 결과에 있는 이유: 덮어썼다는 사실이 호출자에게 드러나야 한다(FR-023a).
조용히 덮어쓰지 않는다.

---

## 검증 표

| 동작 | 상황 | 기대 | 근거 |
| --- | --- | --- | --- |
| `save` | 그 날짜에 일기 없음 | `ok: true, overwrote: false` | FR-022 |
| `save` | 그 날짜에 일기 있음 | `ok: true, overwrote: true` | FR-023, FR-023a |
| `save` | 쓰기 실패 | `ok: false, reason` | FR-024 |
| `load` | 저장한 날짜 | 저장한 것과 같은 값 | SC-007 |
| `load` | 없는 날짜 | `null` | — |
| `has` | 저장한 날짜 | `true` | FR-018f |
| `has` | 없는 날짜 | `false` | FR-018f |
| `listDays` | 세 날짜 저장 | 세 날짜 | FR-018f, SC-012 |

---

## 불변식

1. **한 날짜에 일기는 하나**(FR-023). 같은 날짜로 저장하면 덮어쓴다. 여러 개를 쌓지 않는다.
2. **저장한 것과 꺼낸 것이 같다**(SC-007). 왕복 후 값이 달라지는 경우가 없어야 한다.
   `signalsUsed`의 `unknown` 상태도 그대로 살아남아야 한다 — 직렬화가 `unknown`을
   `null`로 뭉개면 헌법 원칙 V가 깨진다.
3. **덮어쓰기는 성공한 저장에서만 일어난다**(FR-023b). 쓰기가 중간에 실패해도 기존 일기가
   남아야 한다. 임시 파일에 쓰고 옮기는 방식으로 지킨다.
4. **저장 실패가 드러난다**(FR-024). 조용히 사라지지 않는다. 예외를 삼키지 않는다.

2번이 이 계약에서 가장 놓치기 쉬운 지점이다. `SignalValue`가 합 타입이므로 직렬화·역직렬화
왕복 테스트가 반드시 필요하다.

---

## 구현 방향

`expo-file-system`의 `File`/`Paths`로 `Paths.document` 아래 날짜별 JSON 파일 하나씩
(research.md §3).

**왜 날짜별 파일인가**:

- 파일명이 곧 날짜 키 → `has`와 `listDays`가 디렉터리 조회로 끝난다
- 일기 하나 저장에 전체를 다시 쓰지 않는다
- `Paths.document`는 시스템이 저장 공간 부족 시 지우지 않는다(`Paths.cache`와 다름).
  일기는 사라지면 안 되는 값이다

**실기기에서 확인됨 (2026-08-13, SM-G986N)**: `expo-file-system` 57의 `File`/`Paths`
API가 예상대로 동작했다. 저장·조회·덮어쓰기·목록과 **`unknown`의 왕복 보존**을 모두
확인했다(quickstart.md F절). 인터페이스를 고칠 일은 없었다.

---

## 이 계약이 다루지 않는 것

- 일기 삭제 — 요구된 적이 없다. 필요해지면 그때 더한다
- 검색·필터 — 조회 요구가 "날짜로 하나"와 "어느 날짜가 비었나"뿐이다
- 백업·동기화 — 온디바이스 제품이므로 기기 밖으로 내보내지 않는다
- 캐릭터별 보관 — 한 날짜에 일기 하나로 정했다(FR-023)

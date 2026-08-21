# Phase 1 — 데이터 모형

**기능**: 010 가상의 하루를 기기에 심는 도구

**이 문서의 타입은 전부 `scripts/seed/` 안에 산다.** 앱(`src/`)의 타입을 바꾸지 않으며,
읽기만 하는 방향으로 `day-boundary.ts` 하나를 쓴다.

---

## 합성 하루 (SyntheticDay)

「어느 하루에 무엇을 심을까」의 명세. **도구의 입력이다.**

```
SyntheticDay = {
  day: DayDate                 // "YYYY-MM-DD". src/config/day-boundary.ts의 것
  photos: PlannedPhoto[]       // 심을 사진들. 빈 배열이면 「사진 0장인 하루」
}
```

**불변식**:

1. `day`는 `selectableDays(now)`에 들어 있어야 한다(FR-005a). 아니면 **심기 전에
   거부된다.**
2. 모든 `PlannedPhoto.takenAtMs`는 `dayBounds(day)`의 `[startMs, endMs)` 안에 있다.
   **경계를 도구가 다시 계산하지 않는다**(FR-005b).
3. `photos`가 빈 배열인 것은 **정상이다** — 「사진이 실제로 0장인 하루」(`none`)를 만드는
   길이며, 007이 미확인으로 남기고 009가 우연히 본 갈래다.

### 왜 `DaySignals`가 아닌가

`src/signals/types.ts`의 `DaySignals`를 쓰지 않는다. **그것은 앱이 관측한 결과이고,
이것은 기기에 심을 것의 명세다.** 같은 타입을 쓰면 「도구가 신호를 만든다」로 읽히고,
그것이 FR-004(앱에 신호를 주입하지 않는다)가 금지한 것이다.

**도구는 `known`/`none`/`unknown`을 만들지 않는다.** 그 판정은 앱의 `collect.ts`가
심어진 사진을 실제로 조회해서 내린다.

---

## 심을 사진 (PlannedPhoto)

```
PlannedPhoto = {
  takenAtMs: number                          // 찍힌 시각
  location: { latitude, longitude } | null    // null이면 좌표를 안 박는다
}
```

**불변식**:

1. `location`이 `null`인 사진은 **GPS 태그가 없는 템플릿**에서 만들어진다. 태그를 지우면
   IFD 엔트리 수가 바뀌어 오프셋이 움직인다(research.md §4).
2. 좌표는 `(0,0)`이 될 수 없다 — 004의 `isUsableCoordinate()`가 그것을 「못 읽음」으로
   보고 버린다. 심은 좌표가 버려지면 검증이 헛돈다.

---

## 하루 모양 (DayShape)

FR-008이 요구하는 「이름으로 부를 수 있는 하루」. **에이전트가 부르므로 이름이 곧
계약이다.**

```
DayShape = {
  name: string                                  // 에이전트가 쓰는 이름
  description: string                           // 사람이 읽는 한 줄
  build: (day: DayDate) => PlannedPhoto[]       // 그 하루의 사진들
}
```

### 정해 둔 모양 (FR-008a — 004가 가른 갈래와 대응한다)

| 이름 | 무엇 | 004의 어느 갈래 | 확인하려는 것 |
| --- | --- | --- | --- |
| `rich` | 사진 3장, 서로 100m 넘게 떨어진 좌표 2곳 | `photos: known`, `places: known` | **SC-002** — 신호가 있는 하루의 일기 |
| `empty` | 사진 0장 | `photos: none` | **SC-003** — 「사진 없음」을 의도적으로 |
| `partial-location` | 사진 5장, 그중 2장에만 좌표 | `places` — `photosConsidered=5, photosWithLocation=2` | **SC-004** — 한계가 값에 붙어 다니는가 |
| `one-place` | 사진 4장, 좌표가 전부 100m 안 | `visitCount: 1` | `SAME_PLACE_METERS`가 실기기에서 도는가 |
| `over-limit` | 사진 201장 | `complete: false` | **SC-005** — 잘린 하루 |

**`unknown`을 만드는 모양은 없다.** 그것은 **권한을 거두어** 만드는 것이며, 도구가 권한을
건드리지 않는다(FR-014). quickstart가 `pm revoke`로 안내한다.

**⚠️ `over-limit`은 201장을 심는다.** 시간을 재 보지 않았다(research.md 짐작 표) —
느리면 quickstart에 실측을 적는다.

---

## 심은 사진 (SeededPhoto)

기기에 실제로 들어간 사진 하나. **도구의 산출물이자 되돌리기의 대상이다.**

```
SeededPhoto = {
  devicePath: string        // /sdcard/Pictures/<전용폴더>/<파일명>
  takenAtMs: number         // 심으려 한 시각
  hasLocation: boolean
  mediaStoreId: string      // 색인 확인에서 얻은 것
  observedDatetaken: number // ★ 되읽은 값. takenAtMs와 같아야 한다
}
```

**`observedDatetaken`이 이 타입의 핵심이다**(FR-018d). 「심으려 한 것」과 「기기가 실제로
가진 것」을 **따로 담는다** — 같은 자리에 담으면 어긋난 것을 알 수 없다.

research.md §1이 보여준 실패가 정확히 이것이다: 파일은 있고 행도 있는데 `datetaken`이
`NULL`이었다. **두 값을 갈라 두지 않으면 그 상태를 성공으로 보고한다.**

---

## 심은 기록 (SeedLedger)

**개발 기계에 남는다.** 기기에 두면 앱이 볼 수 있는 자리가 되고 FR-017이 위태로워진다.

```
SeedLedger = {
  entries: SeedEntry[]
}

SeedEntry = {
  day: DayDate
  shape: string             // 어느 모양으로 심었나
  seededAtMs: number        // 언제 심었나 (심은 시각이지 사진의 시각이 아니다)
  photos: SeededPhoto[]
}
```

**불변식**:

1. 되돌리기는 **이 기록과 전용 폴더 둘 다**를 본다. 기록에 없어도 폴더 안에 있으면
   지운다 — **폴더가 경계이고 기록은 편의다**(FR-016a).

   **왜 그런가**: 기록이 사라져도(개발 기계를 바꿈) 폴더로 치울 수 있어야 한다. 반대로
   기록만 믿으면 「기록에 없는데 폴더에 있는」 것이 영영 남는다.
2. 기록이 기기의 실제와 어긋날 수 있다 — 기기를 초기화했거나 사람이 손으로 지웠을 때.
   **어긋나면 조용히 넘기지 않고 알린다**(FR-012b).

---

## 실행 결과 (RunResult)

**에이전트가 읽는 것이다**(FR-018b, 명확화 Q3).

```
RunResult =
  | { ok: true
      day: DayDate
      shape: string
      seeded: number            // 이번에 심은 수
      withLocation: number      // 그중 좌표가 박힌 수
      existing: number          // ★ 심기 전부터 폴더에 있던 수 (FR-011b)
    }
  | { ok: false
      reason: FailureReason
      detail: string            // 에이전트가 다음을 정할 수 있을 만큼(FR-019)
    }
```

**`existing`이 명확화 Q4의 귀결이다.** 자동으로 치우지 않기로 했으므로 **남은 것이 보이지
않는 일이 없어야 한다.** 이 숫자가 0이 아니면 에이전트가 「기대한 수와 다를 수 있다」를
안다.

### 실패의 갈래 (FailureReason)

```
"no-device"          // 기기가 안 붙어 있다
"day-out-of-range"   // 고를 수 있는 하루가 아니다 (FR-005a)
"unknown-shape"      // 그런 이름의 모양이 없다
"push-failed"        // 파일을 못 넣었다
"index-failed"       // ★ 넣었는데 색인이 안 됐다 (research.md §1)
"verify-mismatch"    // ★ 색인은 됐는데 datetaken이 그 하루가 아니다
"cleanup-failed"     // 실패 뒤 치우다 실패했다 — 기기가 어긋난 채로 남았다
```

**`index-failed`와 `verify-mismatch`가 이 기능의 존재 이유에 가깝다.** 둘 다 「파일은
있는데 앱은 못 본다」이며, 확인하지 않으면 성공으로 보인다.

**불변식**: `ok: true`인데 `seeded`가 요청한 수보다 적은 결과는 **만들 수 없다**
(FR-018c). 부분 성공은 실패다 — 타입에 자리를 두지 않는다.

---

## 앱의 타입과의 관계

**도구는 앱의 타입을 하나만 쓴다:**

```
import { selectableDays, dayBounds, type DayDate } from "../src/config/day-boundary";
```

`DaySignals`·`SignalValue`·`PhotoObservation`·`ModelAsset`은 **쓰지 않는다.**

| 안 쓰는 것 | 왜 |
| --- | --- |
| `DaySignals`, `SignalValue` | 도구는 신호를 만들지 않는다(FR-004). 판정은 앱의 몫 |
| `PhotoObservation`, `PhotoPlaces` | 같은 이유. `complete`도 앱이 정한다 |
| `src/models/*` | 도구는 캐릭터·모델을 모른다(원칙 III) |
| `src/diary/*` | **도구는 일기를 읽지도 쓰지도 않는다**(FR-003·022, 원칙 IV) |

**마지막 줄이 헌법 검사로 강제된다**(plan.md 「헌법 검사 확장」).

---

## 상태 전이 — 한 번의 심기

```
   시작
    │
    ├─ 기기 확인 ────────────── 실패 → no-device
    ├─ 하루 확인 (selectableDays) ─ 실패 → day-out-of-range
    ├─ 모양 확인 ────────────── 실패 → unknown-shape
    │
    ├─ 폴더에 이미 있는 것 세기 → existing
    │
    ├─ EXIF 패치 (템플릿 → 임시 파일들)     [순수·기계 안]
    ├─ push ─────────────────── 실패 → push-failed  → 치운다
    ├─ scan_file ─────────────────────────────────┐
    ├─ datetaken 되읽기 ──────── 없음 → index-failed ┤ → 치운다
    ├─ 그 하루의 구간 안인가 ─── 아님 → verify-mismatch ┘
    │
    └─ 기록에 남기고 ok: true
```

**되돌리기는 별도 흐름이며 사람이 지시할 때만 돈다**(FR-011a, 명확화 Q4).

```
   시작 → 폴더의 파일 목록 → rm -rf 폴더 → 볼륨 스캔 → 유령 행 확인 → 기록 비우기
```

**볼륨 스캔을 빠뜨리면 MediaStore에 유령 행이 남는다**(research.md §5 실측).

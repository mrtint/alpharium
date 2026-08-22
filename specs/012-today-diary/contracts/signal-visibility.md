# Contract: 신호를 어디까지 보여주는가

**Date**: 2026-08-22 | **Data model**: [../data-model.md](../data-model.md) §2·§4

**이 계약이 지키는 것**: 헌법 원칙 V(코드가 판정하지 않는다, 관측 실패를
감추지 않는다), FR-006~010·014~016.

**전부 기기 없이 검증된다.** 상수와 순수 함수뿐이다.

---

## 1. 축 제외 — `src/signals/types.ts`

```
USER_VISIBLE_SIGNAL_AXES: { photos: true, places: true, steps: false,
                             battery: false, connectivity: false }
```

**사람이 적은 상수다**(FR-010, MUST NOT — 코드가 판정하지 않는다). `prompt.ts`와
`DiaryDetailScreen.tsx`가 이 상수를 본다. `SignalProbe.tsx`(진단)는 이 상수를
**보지 않고** 다섯 축을 전부 그린다.

### 검증 표

| # | 대상 | 축 | `DaySignals`에 값이 있는가 | 프롬프트/상세 화면에 보이는가 | 진단 화면에 보이는가 |
| --- | --- | --- | --- | --- | --- |
| 1 | `prompt.ts` | 걸음 | `known`(예: 5000걸음) | **아니오** | (진단은 별개) |
| 2 | `prompt.ts` | 사진 | `known`(3장) | 예 | (진단은 별개) |
| 3 | `DiaryDetailScreen` | 배터리 | `unknown` | **아니오** | 예 |
| 4 | `SignalProbe`(진단) | 연결 | `unknown` | (사용자 화면 아님) | **예 — 값과 사유가 그대로 보인다** |

**★ 1번이 이 계약의 핵심이다.** 걸음 수가 실제로 `known`이어도(향후 통로가
생겼을 때를 가정) 상수가 `false`인 한 프롬프트·화면에 실리지 않는다 — **"값이
있는가"가 아니라 "이 축을 사람이 노출하기로 정했는가"가 기준이다.**

### 불변식

| # | 불변식 | 왜 |
| --- | --- | --- |
| S1 | `USER_VISIBLE_SIGNAL_AXES.steps === false`(지금 시점) | FR-006 — 안드로이드가 기간 걸음 수를 안 준다 |
| S2 | `USER_VISIBLE_SIGNAL_AXES.battery === false`, `.connectivity === false`(지금 시점) | FR-007 — 기록 계층이 없다 |
| S3 | `DaySignals` 타입에 `steps`·`battery`·`connectivity` 필드가 여전히 있다 | FR-009 — 값 자체는 안 지운다 |
| S4 | `SignalProbe.tsx`는 `USER_VISIBLE_SIGNAL_AXES`를 import하지 않는다 | 진단은 전부 보여준다(FR-009) |

**S4는 소스를 직접 읽어 검사한다**(008의 "주석을 걷어내고 검사한다" 방식) —
"import하지 않는다"를 그냥 안 부르는 것으로 우연히 지키면, 나중에 리팩터링
중에 조용히 새로 import될 수 있다.

### 금지

- **`signal.kind === "unknown"`을 보고 빼는 코드를 만들지 않는다**(FR-010, MUST
  NOT) — 이것은 값을 보고 판정하는 것이며 임계값이다. 상수는 값과 무관하게
  미리 정해진다.
- **`USER_VISIBLE_SIGNAL_AXES`를 여러 파일에 각자 복제하지 않는다** — `prompt.ts`와
  `DiaryDetailScreen.tsx`가 같은 상수를 import한다.

---

## 2. "하루의 끝" 문장 — `src/diary/prompt.ts`

```
DAY_STILL_OPEN: string  // 아직 끝나지 않은 하루에 붙는 고정 문구
```

### 검증 표

| # | `request.dayStillOpen` | `request.signals.photos.kind` | 기대 |
| --- | --- | --- | --- |
| 1 | `true` | `known` | `DAY_STILL_OPEN`이 프롬프트에 있다 |
| 2 | `true` | `unknown`(권한 없음) | **`DAY_STILL_OPEN`이 여전히 있다** — 사진 권한과 무관하다(FR-004) |
| 3 | `false`(지난 하루) | `known` | `DAY_STILL_OPEN`이 **없다**, 프롬프트가 011까지의 것과 바이트 단위로 같다 |

**★ 2번이 이 계약의 핵심이다**(FR-004). 사진 축에 얹었다면 권한이 없는 사용자는
이 사실을 전달받지 못했을 것이다 — 그래서 하루에 대한 독립된 문장으로 둔다(로드맵
결정 (c)).

### 불변식

| # | 불변식 | 지키는 것 |
| --- | --- | --- |
| P1 | `dayStillOpen: false`이면 프롬프트가 011까지의 결과와 바이트 단위로 같다 | 기존 회귀 없음(005 P-1과 같은 패턴) |
| P2 | `DAY_STILL_OPEN`이 `instructionLines()`의 되뱉기 비교 대상에 포함된다 | 005 FR-016b-1 패턴 — 지시문이 판정에서 안 빠진다 |
| P3 | `buildPrompt()`는 `dayStillOpen`을 인자로**만** 받고 내부에서 `now`나 `isDayClosed()`를 부르지 않는다 | P6 — 결정적이어야 한다 |

### 금지

- **캡션·신호 값을 담은 문구를 되뱉기 비교 대상으로 넣지 않는다**(005의 기존
  제약, 011에서도 지켜졌다) — `DAY_STILL_OPEN`은 신호 값을 담지 않는 고정
  문구이므로 이 제약에 해당하지 않는다.

---

## 3. 사진 상한 제거 — `src/signals/collect.ts`·`port.ts`·`expo-port.ts`

```
// 지금
photosBetween(fromMs: number, toMs: number, limit: number): Promise<PhotoFacts[]>

// 이 기능이 만드는 것
photosBetween(fromMs: number, toMs: number): Promise<PhotoFacts[]>
```

### 검증 표

| # | 상황 | 기대 | FR |
| --- | --- | --- | --- |
| 1 | 하루에 사진 3장 | `photos.value.photos.length === 3`, `complete: true` | 회귀 없음 |
| 2 | 하루에 사진 300장(과거엔 200에서 잘렸을 상황) | `photos.value.photos.length === 300`, 이른 시각·늦은 시각 사진이 모두 포함 | **FR-014, 이 계약의 핵심** |
| 3 | 조회 자체가 예외를 던진다(타임아웃 등) | `photos.kind === "unknown"`, 부분 결과가 `known`으로 오지 않는다 | **FR-016** |

**★ 2번이 이 계약의 핵심이다.** `DEFAULT_PHOTO_LIMIT`과 "이른 시각부터 자르는"
로직이 사라지므로, `TRUNCATED_WARNING`을 촉발하는 조건(`!complete`)이 사진 개수
때문에 발생하는 일이 없어진다.

### 불변식

| # | 불변식 | 지키는 것 |
| --- | --- | --- |
| L1 | `collect.ts`에 `DEFAULT_PHOTO_LIMIT` 상수가 더 이상 없다 | FR-014 — 상한 자체가 없다 |
| L2 | `PhotoObservation.complete`는 여전히 타입에 있다(FR-016의 `unknown` 경로와 별개로, 조회 성공 시 항상 `true`가 되거나 그 전에 `unknown`으로 갈린다) | data-model.md 「사진 상한을 어떻게 없애는가」 — 타입을 지우지 않는다 |
| L3 | 사진 수가 많다는 이유만으로는 `TRUNCATED_WARNING`이 프롬프트에 붙지 않는다 | FR-015 |
| L4 | 조회 실패는 예외로 새지 않고 `{ kind: "unknown", reason }`으로 돌아온다 | FR-016, 004의 기존 규칙(FR-012) 계승 |

### 금지

- **잘라서 일부만 주는 새 경로를 만들지 않는다**(FR-016) — 실패는 잘림이 아니라
  `unknown`이어야 한다.
- **상한을 큰 수로 바꿔치기하지 않는다**(research.md §3) — "왜 그 수인가"라는
  새 짐작값이 헌법 원칙 V를 다시 건드린다.

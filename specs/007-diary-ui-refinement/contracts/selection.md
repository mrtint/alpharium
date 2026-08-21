# Contract: 캐릭터 선택

**Date**: 2026-08-20 | **Data model**: [../data-model.md](../data-model.md) §1·§2·§6

**이 계약이 지키는 것**: 헌법 원칙 III(모델은 캐릭터다), FR-001~009, FR-005a~c.

---

## 1. 순수 규칙 — `src/app/selection.ts`

**기기에 닿지 않는다.** 전 갈래가 기기 없이 검증된다.

```
resolveSelection(
  stored: Character | null,
  ready: readonly Character[],
): SelectionState
```

### 검증 표 (전부 기기 불필요)

| # | `stored` | `ready` | 기대 | FR |
| --- | --- | --- | --- | --- |
| 1 | `quiet` | `[quiet, narrative]` | `selected(quiet)`, `movedFrom` 없음 | FR-001 |
| 2 | `quiet` | `[quiet]` | `selected(quiet)` | FR-001 |
| 3 | `quiet` | `[narrative]` | `selected(narrative, movedFrom: quiet)` | FR-005, 005a |
| 4 | `quiet` | `[]` | `none` | FR-005c |
| 5 | `null` | `[narrative]` | **`none`** | **FR-008** |
| 6 | `null` | `[]` | `none` | — |
| 7 | `quiet` | `[narrative, english]` | `selected(narrative, movedFrom: quiet)` — 배열 첫 준비된 것 | FR-005 |

**★ 5번이 이 표의 핵심이다.** 준비된 것이 있어도 고른 적이 없으면 고르지 않는다 —
그것이 지금의 결함이고 FR-008이 금지한 것이다.

**★ 1번과 3번의 차이**: `movedFrom`의 유무가 「알릴 것이 있는가」를 가른다.
1번에서 `movedFrom`이 붙으면 **바뀌지 않았는데 「바뀌었다」고 알리게 된다.**

### 금지

- `resolveSelection()`이 **파일을 읽지 않는다.** 저장된 값을 인자로 받는다
- `ready` 목록을 **스스로 판정하지 않는다.** 003의 `readinessOf()`가 낸 결과를 받는다
- **성격·품질을 근거로 고르지 않는다**(FR-008). 순서에서 첫 준비된 것일 뿐이다

---

## 2. 영속화 — `src/app/selection-store.ts`

**기기에 닿는 유일한 자리.** 002의 `FileSystemPort`, 003의 `MetadataPort`와 같은 구조로
통로를 주입받는다.

```
interface SelectionPort {
  read(): Promise<string | null>;      // 없으면 null
  write(serialized: string): Promise<void>;
}

loadSelection(port: SelectionPort): Promise<Character | null>
saveSelection(port: SelectionPort, character: Character): Promise<void>
```

### 검증 표

| # | 상황 | 기대 | 기기 | FR |
| --- | --- | --- | --- | --- |
| 1 | 저장 후 조회 | 같은 캐릭터가 나온다 | 불필요 (대역) | FR-003 |
| 2 | 저장한 적 없음 | `null` | 불필요 | FR-008 |
| 3 | 파일 내용이 깨졌다 | **`null`** — 예외를 던지지 않는다 | 불필요 | 원칙 V |
| 4 | 알 수 없는 캐릭터 이름이 들어 있다 | **`null`** — 로스터 밖은 받지 않는다 | 불필요 | 원칙 V |
| 5 | 통로가 예외를 던진다 | **`null`** — 화면이 무너지지 않는다 | 불필요 | — |
| 6 | 앱 재시작 뒤 조회 | 같은 캐릭터 | **필요** | FR-003, SC-002 |
| 7 | 덮어 저장 | 마지막 값이 나온다 | 불필요 | FR-001 |

**3·4·5번이 「모르면 없다로 떨어진다」를 못 박는다.** 깨진 파일에서 캐릭터를
지어내지 않으며, 그때는 사용자가 다시 고른다.

### 저장 방식

- **임시 파일에 쓰고 옮긴다** — 003의 [expo-port.ts:115](../../../src/models/expo-port.ts#L115) 패턴.
  쓰는 도중 앱이 죽어도 반쯤 쓰인 파일이 남지 않는다
- **일기 디렉터리 밖에 둔다** — 안에 두면 `listDays()`가 날짜로 파싱하려 든다

---

## 3. 배선 — `select.ts` / `wiring.ts`

**⚠️ 007이 잇는 끊긴 배선이다**([../research.md](../research.md) §3).

```
selectBackend(...): { ok: true; backend: InferenceBackend & { stop?(): Promise<void> } } | { ok: false; ... }
createAppPipeline(...): { ok: true; pipeline; location; stop?: () => Promise<void> } | { ok: false; ... }
```

### 검증 표

| # | 상황 | 기대 | 기기 | FR |
| --- | --- | --- | --- | --- |
| 1 | 온디바이스로 조립 | **`stop`이 있다** | 불필요 (대역) | FR-013 |
| 2 | 데스크톱으로 조립 | `stop`이 없어도 된다 | 불필요 | 005 FR-025 |
| 3 | 조립 실패 | `stop`도 `pipeline`도 없다 | 불필요 | 006 FR-035a |
| 4 | `App.tsx`가 화면에 `stop`을 넘긴다 | 넘어간다 | 불필요 | **이 결함의 재발 방지** |

**★ 1번과 4번이 이 결함을 다시 만들지 않게 한다.** `stop?`이 옵셔널이라 넘기지 않아도
타입이 통과했고, 화면 테스트가 prop을 직접 주입해 초록불이었다 — **조립 결과에서
화면까지 실제로 이어지는 것**을 검사해야 잡힌다.

### 금지

- `InferenceBackend`에 `stop()`을 **넣어 넓히지 않는다**(005 FR-025). 데스크톱에는
  끊을 것이 없고 파이프라인이 알 필요가 없다
- 화면이 `on-device.ts`를 **직접 import 하지 않는다**(001 FR-025). `select.ts`를 거친다
- 파이프라인이 `stop`을 **받지 않는다.** 끊는 것은 화면의 일이다

---

## 4. 화면 — `src/ui/CharacterPicker.tsx`

### 받는 것

```
{
  characters: readonly { character: Character; ready: boolean }[];
  selected: Character | null;
  onSelect: (character: Character) => void;
}
```

**바이트·주소·지문·모델 식별자를 받지 않는다.** 003의 `CharacterListScreen`과 같은
방어이며 — **조심해서 안 쓰는 것이 아니라 받지 못하므로 쓸 수 없다.**

### 검증 표

| # | 상황 | 기대 | FR |
| --- | --- | --- | --- |
| 1 | 준비된 것 둘, 하나 선택됨 | 어느 것이 선택됐는지 보인다 | FR-002 |
| 2 | 준비되지 않은 캐릭터 | 고를 수 있는 것으로 보이지 않는다 | FR-004 |
| 3 | 준비된 것을 누른다 | `onSelect`가 그 캐릭터로 불린다 | FR-001 |
| 4 | 준비되지 않은 것을 누른다 | `onSelect`가 **불리지 않는다** | FR-004 |
| 5 | 화면 전체를 훑는다 | 모델 식별자·크기·속도가 **0건** | FR-007, SC-011 |
| 6 | 아무것도 준비되지 않았다 | 「캐릭터를 먼저 준비해야 한다」와 가는 길 | FR-006 |
| 7 | `imaginative`가 보인다 | 「상상을 섞는다」 고지가 함께 있다 | FR-009 예외 (헌법 로스터 MUST) |

**★ 5번은 모듈 그래프로도 검증한다** — 이 파일이 `roster.ts`·`ModelAsset`을
import 하지 않는 것을 검사하면 실수로도 새지 않는다.

### 금지

- **성격·문체 설명 문안을 짓지 않는다**(FR-009). 유일한 예외가 `imaginative`이며
  근거는 헌법 로스터 본문이다
- **추천 표시를 두지 않는다**(FR-008). 다섯이 같은 자격으로 보인다
- **표시 이름을 짓지 않는다.** 헌법이 「이름은 사람이 짓는다」고 했고 003이 이미
  자리표시 식별자를 그대로 보인다

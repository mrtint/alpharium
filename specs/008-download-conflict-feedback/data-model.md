# Phase 1 — Data Model: 내려받기 충돌을 사용자에게 알린다

**Date**: 2026-08-21 | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

**이 기능은 기기에 아무것도 새로 저장하지 않는다.** 아래는 전부 **메모리에만 사는
상태**이며, 그것이 의도다 — 거부 통지를 파일로 남기면 앱을 껐다 켰을 때 참이 아닌
안내가 뜬다(003이 `running`을 메모리에만 둔 것과 같은 판단).

---

## 이미 있는 것 (그대로 쓴다)

### `DownloadProgress` — [src/models/types.ts](../../src/models/types.ts)

```ts
type DownloadProgress = {
  character: Character;
  fraction: number | null;   // 0~1, 모르면 null
};
```

**손대지 않는다.** 003이 세운 불변식이 이 기능의 방어선이기 때문이다:

| 불변식 | 이 기능에서의 뜻 |
| --- | --- |
| 캐릭터 단위다 (바이트·파일명 없음) | 진행 표시를 고치면서 바이트를 더할 **자리가 없다** |
| 시간 관련 필드가 없다 | 「남은 시간」을 넣고 싶어도 **담을 곳이 없다**(원칙 IV) |
| `fraction`이 `null`일 수 있다 | 탭에서 돌아온 직후 백분율을 모르는 상태를 **이미 표현할 수 있다**(research §5) |

**★ 셋째 불변식이 이 기능을 쉽게 만든다.** `null` 백분율의 표시 모양(`받는 중…`)이
003에 이미 있어서, 되찾은 진행 상태를 그릴 새 모양을 만들 필요가 없다.

### `DownloadFailure` — [src/models/types.ts](../../src/models/types.ts)

```ts
type DownloadFailure =
  | { kind: "insufficient-space" }
  | { kind: "network"; reason: string }
  | { kind: "verification-failed" }
  | { kind: "busy"; busyWith: Character };
```

**손대지 않는다.** `busy`가 이미 **무엇을 받는 중인지 캐릭터로** 말한다 — FR-002가
요구하는 것이 여기 이미 있다. 끊긴 곳은 이 값이 화면까지 가는 길뿐이다.

### `Acquisition.busyWith()` — [src/models/acquisition.ts](../../src/models/acquisition.ts)

```ts
busyWith(): Character | null;
```

**손대지 않는다.** FR-013(돌아왔을 때 되찾기)의 재료가 이미 공개돼 있다.

---

## 새로 만드는 것

### 1. `DownloadRejection` — 거부 통지

```ts
/**
 * 방금 거부된 요청.
 *
 * **일시적이며 기기에 남지 않는다.** 앱을 껐다 켜면 사라지는 것이 옳다 —
 * 「받는 중이라 거부했다」는 그때 참이었던 말이고 지금도 참이라는 보장이 없다.
 */
type DownloadRejection = {
  /** 거부당한 것 — 사용자가 받으려던 캐릭터 */
  requested: Character;
  /** 그때 받는 중이던 것 — 사용자가 멈춰야 할 캐릭터 (FR-002) */
  busyWith: Character;
};
```

**필드가 둘뿐인 것이 방어다.** 시각(`at`)을 넣으면 「3초 전에 거부됨」을 보이고 싶어지고
그것이 원칙 IV로 가는 길이다. 까닭(`reason` 문자열)도 넣지 않는다 — 갈래가 `busy`
하나뿐이므로 담을 것이 없고, 넣으면 다른 실패까지 이 통로로 흘러든다.

**왜 `requested`가 필요한가**: FR-010·FR-007이 「거부당한 캐릭터가 받는 중으로 보이지
않는다」·「준비 상태가 바뀌지 않는다」를 요구한다. 어느 줄이 거부당했는지 알아야
그 줄을 **평소대로** 그릴 수 있다.

**⚠️ `busy` 외의 실패는 이 타입으로 오지 않는다.** `insufficient-space`·`network`·
`verification-failed`는 이 기능의 범위가 아니다(spec이 `busy`만 다룬다). 그것들을
화면에 알리는 것은 별개의 일이며, **여기에 얹으면 spec에 없는 것을 만드는 것이다.**

### 2. `DownloadView` — 화면이 그릴 것

```ts
/**
 * 화면이 무엇을 보일지. **순수 함수가 만들고 화면은 그리기만 한다.**
 */
type DownloadView = {
  /** 지금 받는 중인 것. 없으면 null. 이것이 있는 줄에만 진행률·멈추기가 붙는다 */
  active: DownloadProgress | null;
  /** 보여야 할 거부 안내. 없으면 null (FR-005·FR-006 — 하나뿐이다) */
  notice: DownloadRejection | null;
};
```

**불변식**:

1. **`notice`가 하나다**(FR-006). 배열이 아니므로 쌓일 수 없다 — 여러 번 거부당해도
   마지막 것만 남는다. **타입에 자리가 없다.**
2. **`active`와 `notice.requested`는 절대 같지 않다**(FR-010). 받는 중인 것이 동시에
   거부당한 것일 수 없다 — 003이 같은 캐릭터의 재요청을 허용하므로 거부가 나지 않는다.
   **순수 함수가 이것을 보장하고 테스트가 확인한다.**
3. **시간·속도·바이트가 없다**(FR-016, 원칙 IV). `DownloadProgress`가 담지 않으므로
   여기도 담기지 않는다. **007의 `ActivityIndicator`와 같은 구조적 방어다** — 담고
   싶어도 담을 자리가 없다.
4. **모델 정보가 없다**(FR-004, 원칙 III). 캐릭터 식별자만 흐르며 자산키·주소·크기가
   지나갈 통로가 없다.

---

## 상태 전이

**받는 중인 것**(`active`):

```
없음 ──prepare 시작──▶ 받는 중(fraction: null)
                          │
                    ──진행 콜백──▶ 받는 중(fraction: 0~1)
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   완료(ok)          멈춤(paused)      실패(network 등)
        │                 │                 │
        └────────────▶ 없음 ◀──────────────┘         (FR-012)
```

**⚠️ 거부(`busy`)는 이 전이에 등장하지 않는다.** 그것이 버그 ②의 핵심이다 — 지금
코드는 거부를 「끝남」으로 취급해 `active`를 지운다. **거부는 받는 중인 것을 건드리지
않는다**(FR-008).

**거부 통지**(`notice`):

```
없음 ──busy 거부──▶ 있음
                     │
      ┌──────────────┼──────────────┬──────────────┐
      │              │              │              │
 사용자가 닫음   또 거부당함    받던 것이 끝남/멈춤   ─
      │              │              │
      ▼              ▼              ▼
    없음        새 것으로 덮어씀    없음
   (FR-005)      (FR-006)      (FR-005, Edge Case)
```

**「받던 것이 끝나면 안내가 사라진다」가 순수 함수여야 하는 이유**: 「quiet을 받는
중이라 거부했다」는 quiet이 끝나는 순간 **거짓이 된다.** 화면의 `useEffect`로 지우려
하면 타이밍 버그가 들어오고, 그 버그는 기기에서만 보인다(research §3).

---

## 소유 관계 — 무엇이 어디에 사는가

**★ research §2가 찾은 셋째 결함이 여기서 고쳐진다.**

| 상태 | 지금 사는 곳 | 옮길 곳 | 왜 |
| --- | --- | --- | --- |
| `Acquisition` 인스턴스 | `ModelSection` | **`AppFrame`** | 탭을 옮기면 언마운트되어 `running`·`handle`이 통째로 사라진다 |
| `ModelPorts` | `ModelSection` | **`AppFrame`** | `Acquisition`이 이것으로 만들어진다 |
| `DownloadProgress` | `ModelSection` | **`AppFrame`** | 여기 있어야 백분율이 탭 왕복을 넘어 산다 |
| `DownloadRejection` | (없음) | **`AppFrame`** | 위와 같은 이유. 탭을 옮겼다 와도 안내가 남는 편이 낫다 |
| `Readiness` | `ModelSection` | **그대로** | 화면에 들어올 때 다시 읽으면 되는 것이며, 오래된 값을 들고 있을 이유가 없다 |

**`expoModelPorts()`를 `AppFrame`에서 만들어도 안전하다** (2026-08-21, 코드 확인):
[expo-port.ts:235](../../src/models/expo-port.ts#L235)가 **클로저 객체 네 개를 만들 뿐**이고,
파일 시스템에 닿는 것은 전부 메서드 안의 `await import("expo-file-system")`이다.
**생성 시점에 기기 통로를 열지 않으므로** 일기 탭에서도 만들어지는 것이 비용이 아니다.

**⚠️ 지연 생성(`useState(() => …)`)은 유지한다.** 모듈 수준 싱글턴으로 바꾸면 모듈
로드 시점에 불려 기기 통로가 없는 환경에서 터진다(research §2).

---

## 이 기능이 만들지 않는 것

**타입에 자리를 만들지 않는 것이 방어다**(005의 `GenerationFailure`에 `text`가 없는 것,
007의 `AppScreen`에 `stage`가 없는 것과 같은 구조):

- **진행 이력** — 「지금」만 있고 지나간 진척을 쌓지 않는다. 쌓으면 그래프를 그리고
  싶어지고 그것이 속도이며 원칙 IV다
- **거부 목록** — `notice`가 하나뿐이다(FR-006)
- **거부 횟수** — 세면 「3번 거부됨」을 보이고 싶어진다. 사용자가 원하는 정보가 아니다
- **예상 완료 시각·남은 시간·속도** — 원칙 IV
- **바이트 수** — `DownloadProgress`가 003부터 막고 있다
- **거부의 영속 기록** — 기기에 남기지 않는다

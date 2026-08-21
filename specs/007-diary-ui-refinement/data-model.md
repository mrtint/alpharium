# Phase 1 — Data Model: 최소버전 일기의 UI/UX 개선

**Date**: 2026-08-20 | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

**타입이 곧 방어다.** 006이 `AppScreen`의 `writing`에 필드를 두지 않아 원칙 IV를
지킨 것과 같은 구조를 007도 따른다 — **자리가 없으면 담을 수 없다.**

---

## §1. 고른 캐릭터 (`SelectedCharacter`)

사용자가 일기를 쓸 때 쓰겠다고 정한 캐릭터. **준비 상태와 다른 것이다** —
준비는 파일의 사실이고 선택은 사용자의 뜻이다.

```
type StoredSelection = {
  character: Character;   // 사용자가 고른 것
};
```

**필드가 하나뿐인 이유**: 준비 여부·바이트·모델 정보를 여기 담으면 그것이 화면까지
따라간다. **준비 상태는 언제나 003의 `readinessOf()`에서 새로 읽는다** — 저장된
준비 상태는 곧 거짓이 되기 때문이다(사용자가 캐릭터를 지울 수 있다).

### 저장 자리

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 통로 | `expo-file-system`의 `File`/`Paths` | research §2 — 새 의존 0개 |
| 자리 | 문서 디렉터리, **일기 디렉터리 밖** | 안에 두면 `listDays()`가 날짜로 파싱하려 든다 |
| 쓰기 | 임시 파일에 쓰고 옮긴다 | 003의 [expo-port.ts:115](../../src/models/expo-port.ts#L115) 패턴 |
| 앱 삭제 시 | 함께 사라진다 | 캐릭터 파일도 사라지므로 그것이 옳다 |

**읽지 못하면 「고른 것 없음」이다.** 파일이 깨졌을 때 지어내지 않는다(원칙 V).

---

## §2. 선택 판정 결과 (`SelectionState`)

**`resolveSelection()`이 돌려주는 값.** 007에서 갈래가 가장 많은 판단이며
**순수 함수가 낸다**(research §7).

```
type SelectionState =
  | { kind: "selected"; character: Character; movedFrom?: Character }
  | { kind: "none" };
```

### 갈래가 둘뿐인 이유

「고른 것이 있다」와 「없다」로 충분하다. **옮겨졌다는 것은 별도 갈래가 아니라
`movedFrom`이라는 사실**이다 — 옮겨진 뒤에도 상태는 「골라져 있다」이고, 다른 점은
**사용자에게 알릴 것이 있다**는 것뿐이다.

**`movedFrom`이 「알린다」를 값으로 만든다**(FR-005a). 화면이 스스로 이전 값과 비교해
판단하면 같은 규칙이 두 곳에 생긴다.

### 전이표 — `resolveSelection(저장된 선택, 준비된 캐릭터들)`

| 저장된 선택 | 준비된 것 | 결과 | 근거 |
| --- | --- | --- | --- |
| `quiet` | `quiet` 포함 | `selected(quiet)` | 그대로 |
| `quiet` | `quiet` 없음, `narrative` 있음 | `selected(narrative, movedFrom: quiet)` | FR-005·005a |
| `quiet` | 아무것도 없음 | `none` | FR-005c |
| 없음 | `narrative` 있음 | **`none`** | **FR-008 — 자동으로 고르지 않는다** |
| 없음 | 없음 | `none` | — |
| 읽기 실패 | 무엇이든 | `none` | 원칙 V — 지어내지 않는다 |

**⚠️ 넷째 줄이 이 표의 핵심이다.** 준비된 것이 있어도 **고른 적이 없으면 고르지
않는다** — 그것이 지금의 결함(앱이 말없이 집는 것)이며 FR-008이 금지한 것이다.
「옮김」은 사용자가 이미 고른 뒤에만 일어난다.

### 여럿이 준비돼 있을 때 어디로 옮기는가

**`CHARACTERS` 배열 순서에서 첫 번째 준비된 것.** 성격을 근거로 고르지 않으므로
추천이 아니다(FR-008). 순서 자체에 의미를 두지 않으며, **어디로 옮겼든 사용자에게
알리고 바꿀 수 있으므로**(FR-005a·b) 이 선택이 사용자를 가두지 않는다.

---

## §3. 화면 상태 (`AppScreen`) — 006의 것을 넓힌다

```
type AppScreen =
  | { kind: "build-error" }
  | { kind: "list"; items: DiaryListItem[]; write: WritePrompt }   // ✏️ write 추가
  | { kind: "detail"; day: DayDate; entry: DiaryEntry }
  | { kind: "unreadable"; day: DayDate }
  | { kind: "writing" }                                            // ✅ 그대로 — 필드 없음
  | { kind: "written"; entry: DiaryEntry; saved: boolean; overwrote: boolean }
  | { kind: "failed"; message: string };
```

### ★ `writing`에 필드를 더하지 않는다 (FR-010a, 원칙 IV)

**이것이 007에서 가장 중요한 한 줄이다.** 회전 표시는 「돌고 있다」는 사실만 필요하고
그 사실은 **`kind === "writing"` 자체가 이미 말한다.** 진행률·경과 시간·단계 이름을
담을 자리가 **없으므로 담을 수 없다.**

단계 이름을 보이려면 `{ kind: "writing"; stage: PipelineStage }`가 되어야 하고,
**그 순간 진행 정보가 화면 상태에 들어온다.** clarify에서 명시적으로 거부됐다(FR-010b).

### ★ 그만두기가 새 갈래를 만들지 않는다

그만두면 **`list`로 간다.** `{ kind: "cancelled" }`를 만들지 않는다 — 만들면
「거기까지 쓴 글을 담을까」라는 물음이 생기고, 그 자리가 FR-014a를 뚫는 통로가 된다.
**갈래가 없으면 담을 수 없다.**

---

## §4. 쓰기 자리 (`WritePrompt`)

「일기 쓰기」를 누르면 무슨 일이 일어나는가. **clarify Q5의 결정으로 셋이 한자리에
모인다**(FR-002a).

```
type WritePrompt = {
  day: DayDate;              // 쓰게 될 하루 (FR-023)
  overwrites: boolean;       // 그 하루에 이미 일기가 있는가 (FR-024)
  selection: SelectionState; // 누가 쓰는가 (FR-002)
};
```

### ⚠️ `overwrites`가 원칙 I을 뚫지 않는 이유

**`overwrites: true`는 「이미 있다」는 사실을 *알리는* 데만 쓰인다.**
`onWrite`는 이 값을 **보지 않으며**, 언제나 실제 생성을 돈다(FR-025).

006이 `toWriting()`에 인자를 두지 않은 방어를 **그대로 유지한다**:

```
toWriting(): AppScreen        // ← 인자 없음. 저장 상태를 볼 수 없으므로 그것으로 갈릴 수 없다
```

**즉 「이미 있는가」를 아는 것은 화면이고, 쓰기를 시작하는 함수는 여전히 모른다.**
안다는 것과 그것으로 갈리는 것은 다르며, 후자만이 원칙 I 위반이다.

---

## §5. 목록의 한 줄 (`DiaryListItem`) — 사진 갈래를 더한다

```
type DiaryListItem = {
  day: DayDate;
  readable: boolean;
  photos: PhotoHint;   // ✏️ 추가
};

type PhotoHint =
  | { kind: "known"; count: number }  // 「사진 3장」
  | { kind: "none" }                  // 「사진 없음」
  | { kind: "unknown" };               // 「사진 모름」
```

### 세 갈래를 그대로 옮기는 이유 (FR-019, 원칙 V)

`SignalValue<T>`의 세 갈래와 **일대일로 대응한다.** 004가 값에서 지킨 구분이
목록에서 무너지면 무의미해진다 — 권한이 없어 모르는 것을 「사진 없음」으로 적으면
화면이 거짓을 말한다.

**불리언으로 뭉개지 않는다.** `hasPhotos: boolean`이면 `none`과 `unknown`이 같은
`false`가 되고, 그것이 정확히 원칙 V가 막는 것이다.

### 읽을 수 없는 일기의 사진

**`readable: false`면 `photos`는 `unknown`이다.** 파일을 읽지 못했으므로 사진이
있었는지 **모른다** — 「없었다」가 아니다(원칙 V).

### 비용

**추가 읽기가 0이다**(research §5). `listDiaries()`가 `readable` 판정을 위해 이미
`store.load()`로 전체를 역직렬화하고 있고, `signalsUsed.photos`는 그 안에 있다.
**버리던 것을 살리는 것뿐이다.**

---

## §6. 조립 결과 (`AppPipelineResult`) — 끊긴 배선을 잇는다

```
type AppPipelineResult =
  | { ok: true; pipeline: Pipeline; location: InferenceLocation;
      stop?: () => Promise<void> }        // ✏️ 추가
  | { ok: false; reason: SelectionFailure; detail: string; pipeline?: undefined };
```

**`stop`이 옵셔널인 이유**: 데스크톱 경로에는 끊을 것이 없다(005 FR-025).
온디바이스만 `StoppableBackend`를 만든다.

**⚠️ 옵셔널이 이 결함을 숨긴 원인이기도 하다**(research §3) — 넘기지 않아도 타입이
통과했다. 그래서 **계약에 「온디바이스면 반드시 있다」를 못 박고 테스트가 그것을
검사한다**([contracts/selection.md](contracts/selection.md) 참조).

**파이프라인은 여전히 `stop`을 모른다.** 끊는 것은 화면의 일이고 파이프라인은
`interrupted`를 결과로 받을 뿐이다 — 005의 판단을 뒤집지 않는다.

---

## §7. 불변식 요약

| # | 불변식 | 지키는 자리 | 어기면 |
| --- | --- | --- | --- |
| 1 | `writing`에 필드가 없다 | `AppScreen` 타입 | 원칙 IV — 진행률이 들어온다 |
| 2 | `toWriting()`에 인자가 없다 | `state.ts` | 원칙 I — 저장된 것이 생성을 대신한다 |
| 3 | 그만둠 갈래가 없다 | `AppScreen` 타입 | FR-014a — 부분 결과가 화면에 오른다 |
| 4 | 선택 화면이 `roster.ts`를 import 하지 않는다 | 모듈 그래프 | 원칙 III — 모델 정보가 샌다 |
| 5 | `photos`가 세 갈래다 | `PhotoHint` 타입 | 원칙 V — 모름이 없음으로 뭉개진다 |
| 6 | 고른 적 없으면 자동으로 고르지 않는다 | `resolveSelection()` | FR-008 — 지금의 결함이 남는다 |

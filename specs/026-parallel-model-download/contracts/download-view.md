# 계약: download-view.ts — active 복수화

**대응 요구사항**: FR-005, FR-010, FR-029

**구현 위치**: `src/models/download-view.ts`, `src/models/types.ts`

**확장하는 계약**: `specs/008-download-conflict-feedback/contracts/download-view.md`

---

## 이 계약이 지키는 것

008의 네 불변식을 **전부 유지**하고, `active`가 단수에서 복수로 바뀌는 것만 반영한다.

| 008 불변식                                          | 026에서                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1. `notice`가 하나다(배열 아님) — 쌓이지 않는다     | **유지**                                                                                |
| 2. `active`와 `notice.requested`가 같은 경우가 없다 | **유지** — `active[]`의 어느 원소도 `notice.requested`와 같은 `character`를 갖지 않는다 |
| 3. 시간·속도·바이트가 없다                          | **유지** — `DownloadProgress` 무변경, 세그먼트 정보도 없음                              |
| 4. 모델 정보가 없다                                 | **유지** — `Character`만 흐른다                                                         |

---

## 바뀌는 시그니처

```
// 008
resolveDownloadView(
  active: DownloadProgress | null,
  rejection: DownloadRejection | null,
): DownloadView

// 026
resolveDownloadView(
  active: DownloadProgress[],
  rejection: DownloadRejection | null,
): DownloadView
```

```
// 008
type DownloadView = { active: DownloadProgress | null; notice: DownloadRejection | null }

// 026
type DownloadView = { active: DownloadProgress[]; notice: DownloadRejection | null }
```

---

## `noticeFor` — 008의 핵심 로직을 배열로

008의 "거부가 아직 참인가"는 다음 순서였다:

```
1. rejection === null            → null
2. active === null               → null   ("받는 중이라 거부"인데 받는 게 없으면 거짓말)
3. active.character !== rejection.busyWith → null   (받던 것이 바뀜)
4. active.character === rejection.requested → null  (같은 것을 요청한 거부는 안 보임)
5. else                          → rejection
```

026 대응:

```
1. rejection === null            → null
2. !active.some(p => p.character === rejection.busyWith) → null
     // busyWith였던 캐릭터가 더 이상 받는 중 목록에 없으면, 거부는 거짓이 됐다.
     // 그 캐릭터가 다 받았거나 멈췄으면 사용자는 그냥 다시 누르면 된다(008 I4).
3. active.some(p => p.character === rejection.requested) → null
     // 요청했던 캐릭터가 지금 받는 중이면(= 재시도가 성공함) 옛 거부는 안 보인다(008 I2).
4. else                          → rejection
```

**008의 3번(받던 것이 바뀜)이 2번에 흡수된다** — 배열에서는 "busyWith가 목록에 있는가"
하나로 "받는 중인가 + 그게 그 캐릭터인가"를 함께 본다.

026에서 `busy` 거부는 **같은 캐릭터 중복 요청**에서만 난다(concurrent-acquisition.md).
따라서 `rejection.requested === rejection.busyWith`인 경우가 대부분이며, 3번이 그 캐릭터의
재시도 성공을 자동 소멸시킨다.

---

## 검증 표 (기기 없이 — `__tests__/models/download-view.test.ts`)

| #   | 입력                                                  | 기대                                                                                            |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| V1  | `active=[]`, `rejection=null`                         | `{ active: [], notice: null }`                                                                  |
| V2  | `active=[A,B]`, `rejection=null`                      | `{ active: [A,B], notice: null }`                                                               |
| V3  | `active=[]`, `rejection={requested:A, busyWith:A}`    | `notice: null` (받는 게 없으니 거부는 거짓)                                                     |
| V4  | `active=[A]`, `rejection={requested:A, busyWith:A}`   | `notice: null` (재시도 성공 — 008 I2, 026의 3번)                                                |
| V5  | `active=[B]`, `rejection={requested:A, busyWith:A}`   | `notice: null` (busyWith A가 목록에 없음 — 026의 2번)                                           |
| V6  | `active=[A]`, `rejection={requested:B, busyWith:A}`   | `notice: {requested:B, busyWith:A}` (008의 원형 케이스 — A 받는 중, B 거부됨)                   |
| V7  | `active=[A,C]`, `rejection={requested:B, busyWith:A}` | `notice` 실림 (A가 목록에 있고 B는 없음)                                                        |
| V8  | `active`에 같은 `character`가 두 번                   | (상위에서 보장 — 불변식 4) 계약 테스트가 `acquisition`이 그런 배열을 안 만드는 것을 A3에서 검사 |
| V9  | `DownloadView` 타입에 시간·속도·바이트·구간 필드 없음 | `readFileSync`로 `types.ts` 검사 (008 불변식 3 + FR-016)                                        |

---

## 화면 (`CharacterListScreen.tsx`) 영향 — 계약 아님, 참고

- `const busy = view.active?.character === character` → `const inFlight = view.active.find(p => p.character === character)`
- `inFlight`가 있으면 그 줄에 `progressText(inFlight.fraction)` + "멈추기". **여러 줄이 동시에** 이 상태일 수 있다.
- "멈추기" `onPress` → `onPause(character)` (008은 인자 없는 `onPause`).
- `App.tsx`: `progress` 상태를 `Map<Character, DownloadProgress>`로. `resolveDownloadView([...progress.values()], rejection)`.
- 탭 복귀: `acquisition.busyWith()`(배열)를 순회해 없는 것마다 `progress.set(c, { character: c, fraction: null })` (008의 단수 복원을 배열로).

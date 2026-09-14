# Contract: 사진이 있으면 반드시 보고, 없으면 열지 않는다

**Phase 1** | 2026-09-14 | [plan.md](../plan.md) · [data-model.md](../data-model.md)

이 계약이 잠그는 것은 **캡션이 도는가**가 아니라 **캡션을 건너뛸 수 있는 길이
남아 있는가**다. 길이 하나라도 남으면 헌법 MUST NOT이 깨진다.

---

## C1. 사진을 볼지 말지 고르는 자리가 없다 (FR-005·FR-006)

**검증**: 소스를 읽어 확인한다(주석은 걷어낸 뒤 — 011이 세운 관용구).

- `src/`에 `VisionPicker`가 없다
- `src/`에 `vision-setting-store`가 없다
- `src/ui/`·`App.tsx`에 사진 보기 설정을 읽거나 쓰는 호출이 없다
- `VisionSetting`의 멤버가 **하나**다

**위반 주입**: `VisionSetting`에 `"none"`을 되살린다 → `tsc`는 통과할 수 있으나
(유니온이 넓어지는 것뿐) **계약 테스트 C1이 멤버 수에서 잡는다.**

> `tsc`만으로는 부족한 자리다 — 유니온을 **넓히는** 것은 타입 오류가 아니다.

---

## C2. 깊이가 하나다 (FR-009·FR-010)

- `VisionDepth`의 멤버가 **하나**(`"quick"`)
- `IMAGE_TOKENS`의 키가 **하나**, 값이 256
- 소스 어디에도 `"detailed"` 문자열이 없다(주석 제외)
- 깊이를 고르는 환경 변수·플래그가 없다

**위반 주입**: `IMAGE_TOKENS`에 `detailed: 1024`를 더한다 → `tsc`가 잉여 속성으로
잡는다(`Record<VisionDepth, number>`).

**기존 테스트의 주장이 뒤집힌다**:
[types.test.ts:123](../../__tests__/vision/types.test.ts#L123)이 "`quick`과
`detailed` 둘뿐이다"를 주장한다. **지우지 않고 「하나뿐이며 `none`이 아니다」로
바꾼다** — 지우면 "깊이가 `none`인 캡션은 뜻이 없다"는 011의 판단이 함께 사라진다.

---

## C3. 사진이 있으면 캡션이 돈다 — 모든 경로에서 (FR-001·FR-004·FR-004a)

**경로가 넷이고 전부 같은 규칙을 따른다.**

| 경로 | 지금 | 축소 후 |
|---|---|---|
| 화면 「일기 쓰기」 | 설정이 `none`이면 안 봄 | **항상 봄** |
| 백그라운드 자동 생성 | 「자동」·설정 없음 → **전부 안 봄** | **항상 봄** |
| 개발자 탭 「지금 생성」 | 기본값이 `none` → **안 봄** | **항상 봄** |
| 최초 실행 자동 생성 | `"quick"` 고정 → 봄 | 그대로(이미 맞음) |

**검증**: 소스를 읽어 **사진 설정으로 캡션을 거르는 분기가 0개**임을 확인한다.

- `task.ts`에 사진 설정을 읽는 호출이 없다
- `GenerationProbeProps`에 `vision` 필드가 없다
- 캡션 진입 조건이 **사진 신호 하나**다

**위반 주입**: `task.ts`에 `vision = "none"` 분기를 되살린다 → 계약 테스트가
소스에서 잡는다.

---

## C4. 볼 것이 없으면 열지 않는다 (FR-002·FR-003)

**011이 세운 것을 그대로 유지한다** — 이 기능이 뒤집지 않는다.

```
photos.kind !== "known"  → no-photos   (권한 없음 = 「모른다」)
photos.value.length === 0 → no-photos  (0장 = 「없다」)
```

**두 갈래를 뭉개지 않는다**: 캡션을 안 돈 이유는 `no-photos` 하나지만,
**프롬프트는 `photos` 신호를 그대로 적는다** — 「사진: 없었다」 / 「사진: 모른다」.
원칙 V의 자리이며 이 구분이 일기 본문까지 도달한다.

**검증**: 기기 없는 테스트가 두 입력으로 각각 돌려 (a) 엔진 로드 0회, (b) 프롬프트
문구가 서로 다름을 확인한다.

**위반 주입**: `photos.kind !== "known"`을 `photos.value.length === 0`으로 합친다
→ 「모른다」가 「없다」로 바뀌어 테스트가 잡는다.

---

## C5. 018 두 갈래가 살아 있다 ★ 이 기능의 조용한 실패 지점 (FR-011·FR-012·FR-012a)

**지금 두 갈래를 가르는 것**: `outcome.params.vision === "none"`
**축소 후**: `outcome.params.hasPhotos`

| 갈래 | 조건 | 하는 일 |
|---|---|---|
| 1단계 | `hasPhotos === false` | 캐릭터만 데운다(`prepare`) |
| 2단계 | `hasPhotos === true` | 캡션을 먼저 읽고(`captionDay`), **끝난 뒤에만** 데운다 |

**왜 계약이 필요한가**: 판별자가 사라져도 **타입은 계속 맞는다.** 두 갈래가
한쪽으로 붕괴하면 —

- 사진을 미리 안 읽어 **느려질 뿐 오류가 없다**, 또는
- 캡션이 끝나기 전에 모델을 열어 **018 E1(엔진 하나만 열림)이 깨진다**

셋 다 조용하다. `tsc`·`lint`·실기기 육안 어느 것도 못 잡는다.

**검증**(기기 없는 테스트, `diary-home.test.tsx`):

| 케이스 | 기대 |
|---|---|
| `hasPhotos: false` | `prepare` 호출 1회, `captionDay` **0회** |
| `hasPhotos: true` | `captionDay` 먼저, 그 `Promise`가 풀린 **뒤에** `prepare` |
| `hasPhotos: true`, 캡션 도중 「쓰기」 | 새로 안 읽고 **기존 `Promise`를 기다린다** |

**위반 주입**: 두 `useEffect`의 조건을 같게 만든다 → 위 세 케이스가 잡는다.

> ⚠️ 기존 테스트([diary-home.test.tsx:920·938](../../__tests__/ui/diary-home.test.tsx#L920))는
> 이름부터 `vision: none` / `vision: quick/detailed`에 묶여 있다. **어느 설계를
> 골랐든 다시 써야 한다.**

---

## C6. 판정이 설정을 보지 않는다 (FR-012a)

`resolveGenerationParams`의 소스 불변식 (029 R7을 잇는다):

- `visionPreference`를 받지 않는다
- `photoSignalPresent`는 **받는다**
- `hasPhotos`를 결과에 담는다
- `new Date(` 없음 / `signals/`·`models/`·`diary/prompt` import 없음 (029 유지)

**화면에 신호를 따로 내려보내지 않는다** — `DiaryHomeScreenProps`에
`photoSignalPresent` 같은 prop이 **없어야** 한다. 있으면 같은 사실이 두 곳이 되고
둘이 어긋나도 `tsc`가 못 잡는다("두 개의 진실").

**위반 주입**: 화면에 `photoSignalPresent` prop을 더한다 → 계약 테스트가
`DiaryHomeScreenProps` 선언을 읽어 잡는다.

---

## C7. 기기에 남은 옛 설정을 읽지도 지우지도 않는다 (FR-007)

- `src/`에 `vision-setting.json` 문자열이 없다
- 그 파일을 지우는 코드가 없다(`delete`·`remove` 호출 없음)

**위반 주입**: 정리 코드를 넣는다 → 계약 테스트가 소스에서 잡는다.

> 008(받다 만 모델)·037(로스터 밖 모델 파일)과 같은 **의도적 빈자리**다.
> 앱이 사용자 저장물에 손대는 판단을 코드가 하지 않는다.

---

## C8. `VisionOutcome`의 갈래가 다섯이며 전부 도달 가능하다 (R3)

- 갈래: `no-photos` · `seen` · `not-ready` · `failed` · `cancelled`
- `skipped`가 **없다**
- 실패 갈래에 대신 쓸 캡션이 없다(기존 방어 유지, 원칙 I)

**위반 주입**: `skipped`를 되살린다 → 갈래 수를 세는 테스트가 잡는다.

---

## C9. 화면이 사진 설정을 모른다 (기존 경계 유지)

`src/ui/`가 `vision-setting-store`를 import하지 않는다 — **파일이 사라지므로
자동으로 성립한다.** 새 헌법 검사 규칙을 더하지 않는다(R9): 없는 심볼은 쓸 수
없고, `tsc`가 이미 막는다.

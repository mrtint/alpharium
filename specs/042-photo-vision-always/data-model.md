# Data Model: 사진이 있는 하루는 VLM을 반드시 거친다

**Phase 1** | 2026-09-14 | [plan.md](./plan.md) · [research.md](./research.md)

**새 저장 필드가 없다. 새 파일 형식이 없다.** 이 기능이 바꾸는 것은 **타입의
넓이**이며, 그 축소가 코드의 어느 자리를 무너뜨리는지가 여기 있다.

---

## E1. `VisionSetting` — 사진을 어떻게 다룰지 ★ 축소의 시작점

`src/diary/types.ts`

| | 지금 | 축소 후 |
|---|---|---|
| 유니온 | `"none" \| "quick" \| "detailed"` | `"quick"` |
| `VISION_SETTINGS` | `["none","quick","detailed"]` | `["quick"]` |

**이 한 줄이 `tsc`에게 나머지 전부를 짚게 한다**(R1). 아래 E2~E7은 그 결과다.

**`VISION_SETTINGS`를 남기는가**: 남긴다. 순회·검증에 쓰는 자리가 있고
(`request.test.ts:65`), 배열이 하나짜리가 되는 것은 037이 `CHARACTERS`를
`["quiet"]`로 둔 것과 같다. **하나인 것이 비정상이 아니다.**

---

## E2. `VisionDepth` · `IMAGE_TOKENS` — 내부 깊이

`src/vision/types.ts` · `src/vision/vision-port.ts`

| | 지금 | 축소 후 |
|---|---|---|
| `VisionDepth` | `"quick" \| "detailed"` | `"quick"` |
| `IMAGE_TOKENS` | `{ quick: 256, detailed: 1024 }` | `{ quick: 256 }` |

**불변식**: `IMAGE_TOKENS`의 키 집합 == `VisionDepth`의 멤버. `Readonly<Record<
VisionDepth, number>>`라 하나만 줄이면 `tsc`가 잡는다.

**이 수는 밖으로 나가지 않는다**(원칙 III, 기존 방어 유지) — 화면에 256이
보이면 모델 설정 노출이다.

---

## E3. `VisionOutcome` — 사진 읽기가 어떻게 끝났는가 ★ 갈래가 준다

`src/vision/types.ts`

| 갈래 | 축소 후 | 사유 |
|---|---|---|
| `skipped` | **제거** | 「설정이 보지 않음이라 시작하지 않았다」 — 그 설정이 사라져 **도달 불가**(R3). 제품 코드가 한 번도 반환한 적 없다 |
| `no-photos` | 유지 | 「볼 것이 없었다」 — 0장·권한 없음이 여기로 온다 |
| `seen` | 유지 | 「보았다」(전부 실패해 `captions`가 비어도 여기) |
| `not-ready` · `failed` · `cancelled` | 유지 | 실패 갈래. **대신 쓸 캡션이 없다**(원칙 I) |

**갈래 수: 6 → 5.** [types.test.ts:100](../../__tests__/vision/types.test.ts#L100)이
이 수를 직접 센다.

**`seen`과 `no-photos`의 갈림은 그대로다** — 011이 세운 핵심이며 이 기능이
건드리지 않는다.

---

## E4. `ResolvedParams` — 판정 결과 ★ FR-012a의 자리

`src/app/resolve-generation.ts`

| 필드 | 지금 | 축소 후 |
|---|---|---|
| `character` | `Character` | 그대로 |
| `day` | `DayDate` | 그대로 |
| `vision` | `VisionSetting` | **제거** — 고를 것이 없으므로 판정할 것도 없다 |
| `geocodingEnabled` | `boolean` | 그대로 |
| `movedFrom?` | `Character` | 그대로 |
| **`hasPhotos`** | — | **신규 `boolean`** — 「이 하루에 사진이 있는가」 |

### `hasPhotos`가 `photoSignalPresent`와 이름이 달라야 하는 이유

| | 이름 | 성격 |
|---|---|---|
| 입력 | `photoSignalPresent` | 배선이 신호에서 **계산해 넣는 것** |
| 출력 | `hasPhotos` | 판정이 **결론으로 내놓는 것** |

같은 이름이면 "입력을 그대로 통과시킨 것"과 "판정한 것"이 구분되지 않는다(R2).
**지금은 값이 같지만 그것은 R5가 단순해서지 같아야 해서가 아니다.**

### R5 규칙의 변화 (029 계약 supersede)

```
지금: visionPreference !== "auto" → vision = visionPreference
      visionPreference === "auto" → vision = photoSignalPresent ? "quick" : "none"

축소 후: vision 없음
        hasPhotos = photoSignalPresent        ← 설정을 보지 않는다
```

**`photoSignalPresent`는 남는다**(헌법이 유지하라고 한 「볼 것이 없으면 열지
않는다」의 입력). 사라지는 것은 **설정을 보는 것**이다.

---

## E5. `ResolveInput` — 판정 입력

| 필드 | 축소 후 |
|---|---|
| `visionPreference` | **제거** — 읽을 설정이 없다 |
| `photoSignalPresent` | **유지** ★ |
| 나머지 7개 | 그대로 |

---

## E6. `DiaryRequest` · 파이프라인 입력 — 타입만 좁는다

| 자리 | 변화 |
|---|---|
| `DiaryRequest.vision` | `VisionSetting`(하나짜리) — **필드는 남는다** |
| `pipeline.run({ vision })` | 그대로, 타입만 좁음 |
| `InferenceBackend.generate` | 그대로 |
| `captionDay(day, character, vision)` | 그대로 |

**왜 `DiaryRequest.vision`을 지우지 않는가**: `on-device.ts`가 이 값으로 깊이를
정한다. 값이 하나여도 **"이 요청이 사진을 어떻게 다루는가"는 여전히 요청의
속성**이다. 지우면 깊이가 포트 안에 숨어 나중에 되살릴 때 자리가 없다.

**다만 `on-device.ts:221`의 삼항은 사라진다** — `request.vision === "detailed"`가
타입상 불가능해지므로 `tsc`가 잡는다.

---

## E7. `GenerationProbeProps` — 진단 화면 (FR-004a)

| 필드 | 축소 후 |
|---|---|
| `vision?: VisionSetting` (기본 `"none"`) | **제거** |

**지금 이 기본값 때문에 개발자 탭의 생성이 사진을 한 장도 안 본다**(R8).

---

## E8. 사라지는 것들

| 자리 | 처분 |
|---|---|
| `src/app/vision-setting-store.ts` | **파일 삭제** — `VisionPreference`·`isVisionSetting`·`loadVisionSetting`·`saveVisionSetting`·`expoVisionSettingPort` 전부 |
| `src/ui/VisionPicker.tsx` | **파일 삭제** |
| `__tests__/app/vision-setting-store.test.ts` | **파일 삭제**(대상이 없다) |
| `__tests__/ui/vision-picker.test.tsx` | **파일 삭제**(대상이 없다) |
| 설정 탭 「사진 보기」 섹션 | 제거 |
| `App.tsx`의 `visionPreference`·`visionPref` state 둘 | 제거 |

**`__tests__/jest-projects.test.ts`는 손댈 필요가 없다**(2026-09-14 확인). 그
가드는 하드코딩된 기대 수가 아니라 `__tests__/`를 직접 훑어(`testFilesUnder`)
`package.json`의 `testMatch`와 맞춰 본다 — **파일이 줄면 줄어든 채로 맞는다.**
잡으려는 것은 "어느 프로젝트에도 안 잡힌 파일"이지 파일 수의 변화가 아니다.

---

## E9. 기기에 남는 것 — 건드리지 않는다

| 파일 | 처분 |
|---|---|
| `preferences/vision-setting.json` | **그대로 둔다.** 읽지 않고 지우지 않는다(R5, FR-007) |
| `files/diary/*.json` | **무변경** — 사진 설정 필드가 애초에 없다(R6) |

---

## 불변식 요약

1. `IMAGE_TOKENS`의 키 == `VisionDepth`의 멤버 (`tsc`)
2. `VISION_SETTINGS`의 원소 == `VisionSetting`의 멤버 (계약 테스트)
3. `VisionOutcome`의 갈래는 다섯이며 **전부 도달 가능하다** (계약 테스트)
4. 판정 결과의 `hasPhotos`가 018 두 갈래의 **유일한** 판별자다 (계약 테스트 C5)
5. 사진 유무를 판정하는 자리는 **파이프라인 하나**다 — 화면·백그라운드·진단이
   각자 판정하지 않는다

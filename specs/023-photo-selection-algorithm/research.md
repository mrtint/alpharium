# Phase 0 Research: 사진 선별 알고리즘 고도화

**Feature**: `023-photo-selection-algorithm` | **Date**: 2026-08-29

이 문서는 spec.md의 Clarifications에서 이미 확정된 결정의 **근거**와, plan을
쓰기 위해 코드에서 확인한 사실을 모은다. spec의 6개 Clarification이 대부분의
NEEDS CLARIFICATION을 이미 닫았으므로, 여기서는 "코드가 실제로 어떻게 생겼나"를
중심으로 정리한다.

---

## §1. 현재 선별·캡션 경로 (코드 확인, 2026-08-29)

`src/inference/on-device.ts`의 `readPhotos()`(180~235행):

```
photos = request.signals.photos            // SignalValue<PhotoObservation>
if (photos.kind !== "known" || photos.value.photos.length === 0) return { kind: "no-photos" }
...
selected = selectForVision(photos.value.photos)                       // ← 순수, 인덱스 균등
onStage?.("vision", reachedVisionLimit(photos.value.photos.length) ? "many" : "normal")
result = await captionAll(vision.engine, selected, photos.value.photos.length,
                          vision.resolvePath, cancel, vision.resize, vision.cleanupResized, onPhotoStart)
```

- **`selectForVision(photos)`** — `src/vision/select.ts`. 인자 하나(`readonly Photo[]`).
  `Photo = { id: string; takenAt: Date }`(`src/signals/types.ts`). `VISION_PHOTO_LIMIT = 5`
  는 파일 로컬 상수, export 안 함(011 S1). 현재 알고리즘: `round(k·(n-1)/(limit-1))`
  인덱스 균등.
- **`reachedVisionLimit(count)`** — 016이 추가. `count >= VISION_PHOTO_LIMIT`.
  숫자를 밖으로 내보내지 않고 판정만 준다.
- **`captionAll(...)`** — `src/vision/caption.ts`. 넘어온 `selected`를 한 장씩:
  `resolvePath(photo)` → (있으면) `resizePhoto` → `engine.caption(path)`.
  `resolvePath`는 `vision.resolvePath`로 주입되며 `on-device.ts` 598행에서
  `expoPhotoPort().filePathOf(photo.id)`로 배선된다.

**결론**: 분류·시간 분포 선별은 `selectForVision()`이 하기에 자연스러운 자리다.
단, 분류에는 **파일 경로(폴더 이름)** 가 필요한데 지금 `Photo`에는 그 정보가
없다 — `filePathOf()`는 `captionAll` 안에서 *선택이 끝난 뒤* 개별 사진에만
불린다. 그래서 폴더 이름을 **선택 이전에** `Photo`(정확히는 `PhotoFacts`)에
실어 올려야 한다.

---

## §2. `filePathOf()`가 돌려주는 값 (코드 + 011·013 실측)

`src/signals/expo-port.ts` 167~178행:

```ts
async filePathOf(photoId: string): Promise<string | null> {
  try {
    const uri = await new lib.Asset(photoId).getUri();
    if (typeof uri !== "string" || uri === "") return null;
    return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
  } catch { return null; }
}
```

- **설치본 타입 주석의 안드로이드 예시**:
  `file:///storage/emulated/0/DCIM/Camera/IMG_20230915_123456.jpg` →
  `file://` 제거 후 `/storage/emulated/0/DCIM/Camera/IMG_...jpg`.
- **011 실기기 실측(2026-08-22)**: 안드로이드에서 `Asset.id`는
  `content://media/external/images/media/1000000871` 꼴이라 그대로는 파일로 못
  연다 — 그래서 `filePathOf()`가 `getUri()`를 부르도록 011에서 고쳤다.
  `getUri()`가 `content://`를 돌려주는 경우도 있으며(기기·안드로이드 버전에
  따라), 그때는 `file://` prefix가 없어 그대로 반환된다.
- **결론**: 상위 폴더 이름을 얻으려면 반환 문자열이 `/`로 구분된 파일
  경로여야 한다. `content://...` 형태면 마지막 `/` 뒤가 숫자 id이지 폴더가
  아니다 → **"분류 불가"**(spec Clarification, FR-004). `file://` prefix
  유무와 무관하게, `/storage/.../<폴더>/<파일>.jpg` 패턴에서 `<폴더>`만
  뽑는다.

---

## §3. 안드로이드 표준 폴더 이름 (구현 단계 실측 필요)

경로 기반 분류의 대조 목록. **spec Clarification대로 실기기에서 재확인 후
확정**하되, 알려진 값에서 출발한다:

| 분류 | 상위 폴더 이름 (알려진 값) | 근거 |
|---|---|---|
| 카메라 원본 | `Camera` (`DCIM/Camera/`) | 안드로이드 표준 카메라 저장 경로 |
| 잡사진 — 스크린샷 | `Screenshots` (`Pictures/Screenshots/`, `DCIM/Screenshots/`) | 안드로이드 표준 스크린샷 경로(11+에서 `Pictures/Screenshots`) |
| 잡사진 — 다운로드 | `Download` | 브라우저·앱 다운로드 표준 경로 |
| 잡사진 — 메신저 | `KakaoTalk`, `WhatsApp Images`(또는 `WhatsApp/Media/WhatsApp Images`), `Telegram` | 각 앱이 `Pictures/` 아래에 만드는 저장 폴더 |

- **잡사진 목록은 `readonly` 상수 배열**(FR-002). 012의
  `USER_VISIBLE_SIGNAL_AXES`, 021의 `PERMISSION_REQUIREMENTS` 선례 — 사람이
  못 박고, 새 앱의 새 폴더가 나오면 사람이 고친다.
- **판정 방향**(FR-003): "잡사진 폴더 목록에 정확히 매칭되는 것"만 잡사진.
  나머지(카메라 폴더, 서드파티 카메라 앱 폴더, 목록 밖 이름)는 전부 "카메라
  원본". 놓친 잡사진 한 장이 잘못 걸러낸 진짜 사진 한 장보다 낫다.
- **실측 절차**: quickstart의 D1 — 합성/실촬 사진 각 종류를 심고
  `adb logcat`에 `filePathOf()`가 실제로 돌려주는 문자열을 찍어 폴더 이름을
  확인한다. 안드로이드 16(SM-S901N)이 1차 대상.

---

## §4. `PhotoFacts` 확장 (spec Clarification 확정)

`src/signals/port.ts`의 `PhotoFacts`:

```ts
export type PhotoFacts = {
  id: string;
  takenAtMs: number | null;
};
```

→ 확장:

```ts
export type PhotoFacts = {
  id: string;
  takenAtMs: number | null;
  /** 023 — 파일 경로의 상위 폴더 이름. 분류(카메라 원본 vs 잡사진)의 재료.
   *  풀 수 없으면(파일 경로가 아님·content:// URI·못 얻음) undefined. */
  folderName?: string;
};
```

- **선택적 필드**(FR-024). 004의 `collectPhotos()`는 이 필드를 읽지 않으므로
  신호 수집 경로의 동작·테스트가 바뀌지 않는다(SC-009).
- **`Photo`에도 실어야 한다** — `collect.ts`의 `usablePhotos()`가
  `PhotoFacts → Photo`로 옮길 때 `folderName`을 함께 옮긴다. `Photo`는
  `src/signals/types.ts`:

```ts
export type Photo = {
  id: string;
  takenAt: Date;
  folderName?: string;   // 023
};
```

- **채우는 자리**: `src/signals/expo-port.ts`의 `photosBetween()`. 지금은
  `metadata.map((asset) => ({ id, takenAtMs }))` — 여기에 폴더 이름을 더해야
  하는데, `exeForMetadata()`가 주는 `AssetMetadata`에 파일 경로가 있는지
  확인이 필요하다(§5).

---

## §5. `photosBetween()`에서 폴더 이름을 얻을 수 있는가 (구현 단계 확인 필요)

`photosBetween()`은 `new Query()...exeForMetadata()`를 쓴다(픽셀에 닿지 않는
경로, 004 research §1). `AssetMetadata`가 파일 경로/URI를 포함하는지는 설치본
타입으로 확인해야 한다. 두 갈래:

- **(a) `AssetMetadata`에 경로가 있다** → `photosBetween()`이 거기서 폴더
  이름을 바로 뽑는다. 사진 한 장당 추가 호출 없음.
- **(b) `AssetMetadata`에 경로가 없다** → 사진마다 `filePathOf()`(= `getUri()`)를
  한 번씩 더 불러야 한다. `photosBetween()`이 `N`번의 `getUri()`를 병렬로
  돌리거나(비용 실측 필요), 아니면 폴더 이름 수집을 별도 포트 메서드로 빼서
  "선택 후보를 좁히기 전에 전부에 대해" 부른다.

**plan의 결정**: (a)를 먼저 시도하고, 안 되면 (b)로 간다. (b)일 때
`getUri()` N회의 비용이 크면(수백 장인 하루) "카메라 원본 필터링을 위해 하루
전체 사진의 URI를 읽는" 비용이 이득을 넘을 수 있다 — 그 경우 상한 이하인
하루는 어차피 전부 캡션하므로 분류를 건너뛰고(FR-013 경로), 상한 초과인
하루에만 분류를 돈다. 이 최적화 여부는 실측(quickstart D1)이 정한다.

**중요**: 어느 갈래든 폴더 이름 뽑기는 `expo-port.ts` 안에서 문자열 처리로
끝난다 — `expo-port.ts`는 그 문자열을 잡사진 목록과 대조하지 **않는다**(그건
`select.ts`의 몫, spec Clarification).

---

## §6. 시간 칸(Time Bucket) 개수 — 사람이 정함, 실측 없음

spec Clarification: 고정 시간 간격. 04:00~다음날 04:00의 24시간을 사람이 못
박은 개수로 나눈다.

- **출발값 제안: 6칸(4시간 간격)** — 04–08(이른 아침), 08–12(오전),
  12–16(오후), 16–20(저녁), 20–24(밤), 24–04(심야). 하루를 사람이
  자연스럽게 나누는 시간대와 대략 맞고, 상한이 5~12장일 때 "칸 수 ≈ 상한"
  근처라 최소 커버리지가 예산을 거의 다 쓰지 않는다.
- **왜 실측하지 않나**: "몇 칸이 최적인가"를 사진 분포로 찾으면 임계값을
  데이터에서 뽑는 것이고 원칙 IV·V로 간다. 상식적인 값에서 출발하고 사람이
  필요하면 고친다(FR-008). `RESIZE_TARGET = { maxLongEdge: 1024 }`가 한 하루
  실측 후 사람이 고정한 것과 같은 성격.
- **경계**: 04:00 경계는 `src/config/day-boundary.ts`의 `dayBounds(day)`가
  이미 준다(`{ startMs, endMs }`). `select.ts`는 이 값을 인자로 받지
  않는다(순수, 인자는 사진 목록 하나) — 대신 `Photo.takenAt`이 이미 그 하루
  구간 안이라는 것을 전제하고(`collect.ts`가 보장), **하루의 시작을 가장 이른
  사진, 끝을 가장 늦은 사진으로 잡거나**, 아니면 `takenAt`에서 "그 하루의
  04:00"을 유도한다. 후자가 더 안정적이다(사진이 한 시간대에 몰려도 칸
  경계가 고정) — `takenAt` 하나로 "그 하루의 04:00 기준 몇 시간째인가"는
  순수 계산으로 나온다(시:분을 읽어 04:00을 빼고 24로 모듈러). plan에서
  이 유도 함수를 `select.ts` 안 순수 헬퍼로 둔다.

---

## §7. 상한 확장 실측 (quickstart D3, 값은 구현 단계)

spec Clarification: 시간·컨텍스트 두 제약을 다 재고 작은 쪽에서 여유를 뺀다.

- **시간 제약**: `on-device.ts`의 `runWithTimeout()`이 `engine.run()` 구간에
  180초 한도를 건다(AGENTS.md). 캡션은 그 전 단계지만, 캡션 + 생성이 한
  요청 안에서 이어지므로 캡션이 길어지면 전체가 위험하다. 013 실측:
  리사이즈 후 장당 1.3~1.5초(SM-G986N, quiet). 12장이면 ~18초 — 시간은 아직
  여유. **단 콜드 스타트 VLM 적재(~1초) + 캐릭터 모델 콜드(narrative 최대
  242초)를 합치면** 여유가 줄어든다.
- **컨텍스트 제약**: 캡션 텍스트가 캐릭터 모델 프롬프트에 재료로 들어간다
  (`src/diary/prompt.ts`). `n_ctx`는 `src/inference/`의 llama 설정에 있다
  (구현 단계에서 정확한 값 확인). 캡션 한 장이 대략 1~2문장이면 12장 ≈
  12~24문장 → 토큰으로 수백~1천 남짓. `n_ctx`가 2048~4096이면 화자 규칙 +
  신호 + 캡션이 그 안에 드는지 여유율을 봐야 한다.
- **plan의 게이트**: quickstart D3가 debug 실기기에서 (1) 상한 후보 N장의
  캡션 누적 시간, (2) 그 N장 캡션이 들어간 캐릭터 프롬프트의 토큰 수 대
  `n_ctx`를 재고, 작은 쪽에서 여유를 뺀 값을 `VISION_PHOTO_LIMIT`으로
  확정한다. 어느 제약이 걸렸는지 상수 주석에 남긴다(FR-017a).
- **narrative 미확인 위험**: 019·020이 이미 남긴 것 — narrative(exaone)
  백그라운드/콜드 완주를 이 저장소에서 재본 적 없다. 상한을 크게 잡으면
  narrative에서 캡션+생성이 180초를 넘길 수 있다. quickstart D3는 quiet뿐
  아니라 **가능하면 narrative로도** 한 번 확인하고, 못 하면 미확인으로
  명시한다.

---

## §8. 헌법 경계 — 새로 막을 것

`scripts/constitution-rules.ts`의 `checkVisionFile()`(356행)이 이미
`src/vision/`을 대상으로 돈다. 023이 더할 것:

1. **`select.ts`/분류 로직이 픽셀·이미지 채점에 닿지 못하게**(FR-023). 현재
   `VISION_TOUCHES_DIARY`·`VISION_SHARES_SAMPLING`만 본다. 픽셀/디코드/채점
   토큰(`decode`, `pixel`, `Buffer` on image, `score`, `quality`, `histogram`
   등)을 `src/vision/`에서 잡는 규칙을 추가한다. 단, `resize.ts`가
   "리사이즈"라는 정당한 이미지 처리를 하므로 규칙이 그것을 오탐하지 않게
   좁혀야 한다(리사이즈는 `ResizeExecutor` 주입으로 이미 격리됨 — 순수
   계약엔 픽셀 어휘가 없다).
2. **`expo-port.ts`가 잡사진 폴더 목록을 참조하지 못하게**(spec
   Clarification — 분류 판정은 순수 계층에만). `checkSourceFile` 또는
   새 규칙으로 `src/signals/expo-port.ts`에서 폴더 목록 상수 이름이나
   "잡사진/스크린샷 판정" 어휘가 나오면 잡는다.
3. **위반 주입 3종**(007~021 관례): (a) `select.ts`에 픽셀 채점 코드 한 줄,
   (b) `expo-port.ts`가 폴더 목록 import, (c) `selectForVision`에 둘째 인자
   추가(`tsc`가 잡는지) — 셋 다 실제로 잡히는지 확인.

---

## §9. 미결로 남기는 것 (구현/실측 단계)

| 항목 | 언제 닫히나 |
|---|---|
| 잡사진 폴더 이름 정확한 목록 | quickstart D1 (실기기 `adb logcat`) |
| `AssetMetadata`에 경로가 있는가 (§5 (a)/(b)) | 구현 시작 시 설치본 타입 확인 |
| 시간 칸 개수 최종값 | 사람이 정함 — plan은 6칸에서 출발 제안 |
| `VISION_PHOTO_LIMIT` 최종값 | quickstart D3 (실기기 실측) |
| narrative로 상한 검증 | quickstart D3, 못 하면 미확인 명시 |
| §5 (b)일 때 URI N회 비용 최적화 필요 여부 | quickstart D1 실측 |

# Phase 1 Data Model: 사진 선별 알고리즘 고도화

**Feature**: `023-photo-selection-algorithm` | **Date**: 2026-08-29

---

## 1. `PhotoFacts` 확장 (`src/signals/port.ts`)

```ts
export type PhotoFacts = {
  id: string;
  takenAtMs: number | null;
  /**
   * 023 — 파일 경로의 상위 폴더 이름 (예: "Camera", "Screenshots", "Download").
   *
   * 분류(카메라 원본 vs 잡사진)의 유일한 재료다. `expo-port.ts`가 경로에서
   * 마지막 "/" 앞 세그먼트를 뽑아 넣는다 — 그 이름이 잡사진 폴더인지는
   * `expo-port.ts`가 판정하지 않는다(경계).
   *
   * **풀 수 없으면 undefined**: 경로를 못 얻음 · content:// URI(폴더 구간
   * 없음) · 빈 문자열. undefined는 "분류 불가"라는 명시적 의미이며(원칙 V의
   * none/unknown 계열), 선별에서는 "카메라 원본"과 같은 취급(남긴다)을 받는다.
   */
  folderName?: string;
};
```

- **선택적**(FR-024). `collectPhotos()`(`collect.ts`)는 이 필드를 읽지
  않으므로 004 신호 수집 경로의 타입·동작·테스트가 바뀌지 않는다(SC-009).
- **기본값으로 채우지 않는다**(원칙 V) — 없으면 `undefined`이고 그것이
  "분류 불가"다. `folderName ?? "Camera"` 같은 코드를 두지 않는다.

---

## 2. `Photo` 확장 (`src/signals/types.ts`)

```ts
export type Photo = {
  id: string;
  takenAt: Date;
  /** 023 — PhotoFacts.folderName을 그대로 이월. select.ts가 분류에 쓴다. */
  folderName?: string;
};
```

- `collect.ts`의 `usablePhotos()`가 `PhotoFacts → Photo` 변환 시
  `folderName`을 함께 옮긴다:
  ```ts
  .map((f) => ({ id: f.id, takenAt: new Date(f.takenAtMs), folderName: f.folderName }))
  ```
- `Photo`를 쓰는 다른 계층(`select.ts`, `caption.ts`)은 `folderName`을
  안 읽으면 그대로 동작한다 — `caption.ts`는 읽지 않는다.

---

## 3. `select.ts` 내부 타입·상수 (전부 파일 로컬, export 안 함)

### 3.1 분류 결과

```ts
/** 사진 한 장의 분류. select.ts 안에서만 쓴다. */
type PhotoClass = "camera" | "non-camera" | "unclassifiable";
```

- `"camera"` — 폴더 이름이 잡사진 목록에 없다(카메라 폴더 포함, 목록 밖
  이름 포함 — FR-003).
- `"non-camera"` — 폴더 이름이 잡사진 목록에 **정확히** 매칭.
- `"unclassifiable"` — `folderName === undefined`.

**선별에서**: `"camera"`와 `"unclassifiable"`은 남긴다. `"non-camera"`만
뺀다. (진단에서 둘을 구분할 수 있도록 값은 셋으로 유지 — 원칙 V.)

### 3.2 잡사진 폴더 목록

```ts
/**
 * 잡사진(카메라로 찍지 않은 사진)이 저장되는 폴더 이름.
 *
 * **사람이 못 박은 상수**(FR-002, 012의 USER_VISIBLE_SIGNAL_AXES 선례).
 * 코드가 경로·사진 수를 보고 이 목록을 만들거나 조정하지 않는다.
 * 새 앱의 새 저장 폴더가 나오면 사람이 여기 추가한다.
 *
 * **실기기 실측으로 확정**(quickstart D1, 2026-08-29 SM-S901N).
 * 대소문자 정확히 일치로 대조한다 — 안드로이드 폴더 이름은 고정.
 */
const NON_CAMERA_FOLDERS = [
  "Screenshots",       // Pictures/Screenshots, DCIM/Screenshots
  "Download",           // 브라우저·앱 다운로드
  "KakaoTalk",          // Pictures/KakaoTalk
  "WhatsApp Images",    // Pictures/WhatsApp Images (또는 .../WhatsApp/Media/...)
  "Telegram",           // Pictures/Telegram
  // quickstart D1에서 실제 경로 확인 후 최종 확정
] as const;
```

### 3.3 시간 칸 개수

```ts
/**
 * 하루를 나누는 고정 시간 칸의 수 (FR-007·FR-008).
 *
 * **6 = 4시간 간격**: 04–08, 08–12, 12–16, 16–20, 20–24, 24–04(=00–04).
 * 사람이 하루를 자연스럽게 나누는 시간대와 대략 맞고, 상한(5~12장)과
 * 비슷한 크기라 최소 커버리지가 예산을 거의 다 쓰지 않는다.
 *
 * **사람이 정한 값이며 실측하지 않았다**(원칙 V, RESIZE_TARGET와 같은
 * 성격). "몇 칸이 최적인가"를 분포로 찾으면 임계값이 되고 원칙 IV로 간다.
 */
const BUCKET_COUNT = 6;
```

### 3.4 상한

```ts
/**
 * 캡션 대상 사진의 수 (선택 예산).
 *
 * **export 하지 않는다**(011 S1). "닿았는가"는 reachedVisionLimit().
 *
 * ─────────────────────────────────────────────────────────────────────
 * **8 — quickstart D3 실측**(2026-08-29, SM-S901N/Galaxy S22, debug,
 * `quiet`, `many-camera` 12장 하루로 상한 5·8 두 번 생성):
 *  - **시간(걸린 제약)**: 캡션 8장 = 46초(`DiaryEntry.timing.visionMs`
 *    =45652, 장당 ~5.7초, IMAGE 청크 1개/장 — 013 리사이즈 유효), 생성
 *    92초 → 총 ~138초 / 한도 180초(`runWithTimeout()`), 여유 42초.
 *    10장 초과 시 한도 근접, `narrative`(exaone 콜드 최대 242초) 미확인
 *    → 8에서 멈춤.
 *  - **컨텍스트(여유)**: 캡션 5장 프롬프트 852~855토큰. 캐릭터
 *    `n_ctx`=2048, `n_predict`=512 → 상한 1536. 8장 ≈ 1030토큰(67%).
 * ─────────────────────────────────────────────────────────────────────
 */
const VISION_PHOTO_LIMIT = 8; // 5 → 8 (quickstart D3, 2026-08-29)
```

`reachedVisionLimit()`는 그대로:
```ts
export function reachedVisionLimit(availableCount: number): boolean {
  return availableCount >= VISION_PHOTO_LIMIT;
}
```

---

## 4. `select.ts` 순수 함수 (신규·수정)

### 4.1 `bucketIndexOf(takenAt): number` — 신규, 파일 로컬

`Photo.takenAt` 하나로 "그 하루의 04:00 기준 몇 번째 시간 칸인가"를 순수
계산한다. `day-boundary.ts`를 import하지 않는다(순수 유지).

```
h = takenAt의 시(0–23), m = 분
minutesSince4am = ((h - 4) * 60 + m + 1440) % 1440    // 04:00을 0으로
bucket = floor(minutesSince4am / (1440 / BUCKET_COUNT))   // 0 .. BUCKET_COUNT-1
```

- 결정적(같은 `takenAt` → 같은 칸). `Date.now()` 안 읽음.
- 04:00 경계와 일관 — 00:30은 전날 칸(20–04 그룹의 마지막), 04:00은 첫 칸.

### 4.2 `classifyPhotos(photos): { kept: Photo[]; classes: Map<id, PhotoClass> }` — 신규

각 사진을 `folderName`으로 분류하고, 선별에 넘길 목록(`kept`)을 만든다.

```
for each photo:
  cls = photo.folderName === undefined            ? "unclassifiable"
      : NON_CAMERA_FOLDERS.includes(photo.folderName) ? "non-camera"
      :                                              "camera"
kept = photos where cls !== "non-camera"
if kept.length === 0: kept = [...photos]      // FR-005·FR-004a 되돌림
```

- 되돌림은 저장·타이머·`useEffect` 없이 이 함수 안에서 매번 재계산(FR-006).
- `classes`는 진단·테스트용(어느 사진이 왜 걸러졌나). 선별 결과에는 안 실림.

### 4.3 `distributeByTime(photos, budget): Photo[]` — 신규

`photos`(시각 순, 이미 분류로 걸러진 목록)를 시간 칸에 배분해 `budget`장을
고른다.

```
if photos.length <= budget: return [...photos]        // FR-013

buckets = group photos by bucketIndexOf(p.takenAt)    // 사진 있는 칸만
nonEmpty = buckets sorted by bucket index

if nonEmpty.length >= budget:
  # FR-011 — 칸 수가 예산과 같거나 많다(경계 == 포함). 시간축 균등으로 칸을 고른다.
  chosenBuckets = pick `budget` buckets by round(k*(len-1)/(budget-1))  # 양 끝 포함
  take 1 photo from each chosen bucket = 인덱스 중앙값 photos[floor((n-1)/2)]
                                          (n = 그 칸 사진 수, 짝수면 앞쪽)
else:
  # 최소 커버리지 + 최대 잔여법
  alloc[b] = 1 for each nonEmpty bucket b               # FR-009
  remaining = budget - nonEmpty.length
  total = sum(photos count in nonEmpty buckets)
  ideal[b] = remaining * count[b] / total
  alloc[b] += floor(ideal[b])
  leftover = remaining - sum(floor(ideal[b]))
  # FR-010a — 소수부 큰 칸부터, 동점은 count 많은 칸 → 이른 칸
  sort buckets by (frac(ideal[b]) desc, count[b] desc, bucket index asc)
  give +1 to first `leftover` buckets
  for each bucket: take alloc[b] photos by round(k*(n-1)/(alloc[b]-1))  # FR-012, 011 R2

result = all taken photos, sorted by takenAt asc, deduped   # FR-014
```

- **양 끝 포함**(FR-011) — `round(k*(len-1)/(budget-1))`가 `k=0`에서 첫 칸,
  `k=budget-1`에서 마지막 칸을 준다(011 R3의 칸판).
- **"칸 1장" 규칙은 인덱스 중앙값 하나로 고정**한다 — `photos[floor((n-1)/2)]`.
  n이 짝수면 두 중앙 원소 중 **앞(이른) 것**. "시각 중앙값"이 아니라 인덱스
  중앙값을 쓴다(사진 간격이 불균일해도 결정적, FR-015). D5·D6 공통.
- 한 칸에서 여러 장 뽑을 때 011 R2 재사용(FR-012).
- 결정적 — 정렬 키가 전부 고정, 난수·시각 없음(FR-015).

### 4.4 `selectForVision(photos): Photo[]` — 수정 (시그니처 불변)

```ts
export function selectForVision(photos: readonly Photo[]): Photo[] {
  if (photos.length <= VISION_PHOTO_LIMIT) return [...photos];   // R1 유지
  const { kept } = classifyPhotos(photos);
  return distributeByTime(kept, VISION_PHOTO_LIMIT);
}
```

- **인자는 여전히 하나**(011 S1). `VISION_PHOTO_LIMIT`·`BUCKET_COUNT`·
  `NON_CAMERA_FOLDERS`는 파일 로컬.
- `photos.length <= LIMIT`이면 분류도 분포도 안 한다(R1) — 어차피 전부
  캡션하므로 잡사진 필터링의 이득이 없고, `folderName` 없는 기기에서 불필요한
  일을 피한다.
- 되돌림 후 `kept`가 여전히 `LIMIT` 이하일 수 있다(스크린샷 빼고 3장 남음)
  → `distributeByTime`의 `photos.length <= budget` 갈래가 받는다.

---

## 5. `expo-port.ts` — 폴더 이름 (`src/signals/expo-port.ts`)

**구현 확정 (T003·T041, 2026-08-29)**: `AssetMetadata`(= `exeForMetadata()`
반환)에 경로/URI 필드가 없음을 확인 — `id`·`filename`·`mediaType`·`width`·
`height`·`duration`·`creationTime`·`modificationTime`·`isFavorite`뿐. 타입
주석이 명시: "without resolving file paths ... Use Asset getters ... such as
URI". 그래서 폴더 이름은 asset마다 `getUri()`를 불러 얻어야 한다.

**`photosBetween()`은 폴더 이름을 채우지 않는다**(T041 — analyze F1 수용).
`filePathOf()`가 세운 경계("PhotoFacts에 담지 않고 함수로 둔다. 부르지 않는
쪽은 경로를 얻을 수 없다")를 잇는다. 장수만 세는 004 경로가 N번의 `getUri()`를
치르지 않게 하려는 것이다.

```ts
// src/signals/expo-port.ts
export function folderNameOf(pathOrUri: string | null | undefined): string | undefined {
  if (typeof pathOrUri !== "string" || pathOrUri === "") return undefined;
  if (pathOrUri.startsWith("content://")) return undefined;   // 폴더 구간 없음
  const path = pathOrUri.startsWith("file://") ? pathOrUri.slice("file://".length) : pathOrUri;
  const parts = path.split("/").filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : undefined;  // 파일명 앞 폴더
}

// PhotoPort 계약에 추가: 여러 사진의 폴더 이름을 한 번에
async folderNamesFor(photoIds: readonly string[]): Promise<Map<string, string | undefined>>
```

- **경계**: `folderNameOf()`는 폴더 이름 문자열만 돌려준다. `NON_CAMERA_FOLDERS`
  대조는 `select.ts`. 헌법 검사 `checkPhotoPortFile`이 `expo-port.ts`에서
  분류 어휘·폴더 목록 import를 막는다.
- **누가 부르나** (T041): `on-device.ts`의 `readPhotos()`가 **상한에 닿은
  하루만**(`reachedVisionLimit(dayPhotos.length)`) `resolveFolders`를 통해
  `folderNamesFor()`를 부른다. 상한 이하인 하루(R1 빠른 경로)·사진 보기가
  꺼진 요청·장수만 세는 004 경로는 이 자리에 닿지 않아 `getUri()` 왕복이
  없다. `VisionSupport.resolveFolders?`는 옵셔널 — 주입 안 되면 폴더 없이
  선별(잡사진 필터링 no-op).
- **`content://` 반환 시** `content://` prefix면 바로 `undefined`("분류
  불가" = 카메라 원본 취급, FR-004a).
- **비용 실측**: `many-camera`(12장) 또는 `--bursts`로 더 많은 하루에서
  `folderNamesFor()`의 `getUri()` N회 지연을 `adb logcat`으로 잰다
  (quickstart D1). 크면 게이트를 더 좁힌다.

---

## 6. 상태 전이 없음

이 기능은 상태 기계를 추가하지 않는다. 모든 판정은 매 `selectForVision()`
호출에서 입력만으로 재계산된다(009의 "되돌림을 지우는 코드 없이 매 렌더
재판정"과 같은 방식).

---

## 7. 계약 테스트가 잠그는 것

| 대상 | 검사 방식 |
|---|---|
| `selectForVision` 인자 1개, 상수 export 없음 | 소스 `readFileSync` 직접 읽기 (011·009 관례) |
| `VISION_PHOTO_LIMIT`·`BUCKET_COUNT`·`NON_CAMERA_FOLDERS` 미노출 | export 목록 검사 |
| 분류: 카메라/잡사진/분류불가 3갈래, 목록 밖 이름 → 카메라 | 표 기반 케이스 |
| 되돌림: 전부 잡사진 → 원본, 전부 분류불가 → 원본 | 케이스 |
| 최대 잔여법: research §의 예시(예산 8, A2·B30·C5·D3 → A1 B4 C2 D1) | 정확한 기대값 |
| 결정성: 같은 입력 2회 → 동일 | 반복 실행 비교 |
| 시각 순·중복 없음 | 출력 검사 |
| `PhotoFacts` 확장이 004 경로 회귀 없음 | `collect.test.ts` 기존 케이스 통과 |
| 폴더 이름 추출: `file://`·`content://`·경로 없음·정상 | `expo-port.test.ts` |
| 헌법: `src/vision/` 픽셀·채점 어휘 차단, `expo-port.ts` 잡사진 판정 차단 | `check-constitution.test.ts` + 위반 주입 3종 |

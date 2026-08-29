/**
 * 읽을 사진을 고른다.
 *
 * 계약: specs/011-photo-vision-summary/contracts/selection.md
 *       specs/023-photo-selection-algorithm/contracts/classification.md
 *       specs/023-photo-selection-algorithm/contracts/time-distribution.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **023이 011의 인덱스 균등 선별을 두 단계로 바꿨다.**
 *
 *  1. **분류**(`classifyPhotos`) — 파일 경로의 상위 폴더 이름으로 "카메라 원본 /
 *     잡사진(스크린샷·다운로드·메신저) / 분류 불가"를 가르고, 잡사진을 뺀다.
 *     전부 빠지면 원본으로 되돌린다(스크린샷뿐인 하루도 그것을 봐야 정직하다).
 *  2. **시간 분포 배분**(`distributeByTime`) — 하루를 고정 시간 칸으로 나누고,
 *     사진이 있는 칸마다 최소 1장 + 남은 예산을 칸별 사진 수에 비례(최대
 *     잔여법) 배분한다. 011은 "몇 번째 사진"을 균등하게 골랐고, 사진이 한
 *     시간대에 몰리면 고른 것도 몰렸다("아침 카페만 본 채 하루를 쓴다").
 *     이것은 **시각**을 보고 하루에 걸쳐 훑되 뭉친 데는 더 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **순수 함수다.** 기기를 모르고, 시각을 읽지 않고(`Date.now()`/`new Date()`
 * 금지), 난수를 쓰지 않고, 파일을 열지 않는다 — 읽으면 같은 하루를 두 번 쓸
 * 때 **다른 사진을 보게 되어** 「신호가 같은데 출력이 다르다」가 된다
 * (006 FR-037a가 경계한 상태).
 *
 * **인자는 사진 목록 하나뿐이다**(011 S1, 023 FR-016). 상한·칸 개수·폴더
 * 목록을 밖에서 정할 수 없다 — 전부 파일 로컬 상수이며 export하지 않는다.
 */

import type { Photo } from "../signals/types";

/**
 * 하루에서 내용을 읽는 사진의 수 (선택 예산).
 *
 * **export 하지 않는다**(contracts/selection.md S1, 023 FR-018). 하면 테스트가
 * 이 값을 읽어 계산하게 되고, 그때 테스트는 「상수와 같은가」를 보게 된다.
 * "상한에 닿았는가"라는 질문에는 `reachedVisionLimit()`이 답한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **8 — 023 quickstart D3 실측(2026-08-29, SM-S901N/Galaxy S22, debug, `quiet`).**
 *
 * 011의 근거("장당 약 1.9초 × 5 ≈ 10초", research.md §6)는 013 리사이즈로
 * 낡았다. 023이 두 물리 한계를 `many-camera`(12장) 하루로 실측했다 — 「빠르게
 * 봄」으로 상한 5(정정 전)와 8(정정 후) 두 번 생성하고 `DiaryEntry.timing`과
 * `adb logcat`(`RNLlama` 태그)을 읽었다:
 *
 *  - **시간** (걸린 제약):
 *    · 캡션 5장 = 34초(`visionMs=33999`), 캐릭터 로드+생성 105초
 *      (`writingMs=98824`) → 총 ~133초
 *    · 캡션 8장 = 46초(`visionMs=45652`, 장당 ~5.7초), 생성 92초
 *      (`writingMs=91663`) → 총 ~138초
 *    생성 시간 한도는 180초(`on-device.ts` `runWithTimeout()`)이고 8장에서
 *    여유 42초. **10장을 넘으면 한도에 근접하고, `narrative`(exaone 콜드
 *    최대 242초, AGENTS.md)는 미확인 — 그래서 8에서 멈춘다.**
 *    IMAGE 청크는 장당 1개(n_tokens 234~252) — 013 리사이즈가 유효.
 *  - **컨텍스트** (여유 큼): 캡션 5장이 들어간 캐릭터 프롬프트 = **852~855
 *    토큰**(신호 포함, 12장 하루). 캐릭터 모델 `n_ctx`=2048(`llama-port.ts`
 *    CONTEXT_SIZE), `n_predict`=512(`sampling.ts`) → 프롬프트 상한 1536.
 *    신호없음 골격 ~550토큰, 캡션 장당 ~60토큰 → 8장이면 ~1030토큰
 *    (n_ctx의 50%, 상한 1536의 67%). VLM `n_ctx`=4096(`on-device.ts`
 *    VISION_CONTEXT_SIZE)은 캡션이 사진 1장씩 처리라 무관.
 *
 * 잰 기기·날짜: SM-S901N, 2026-08-29. `distributeByTime`은 budget을 인자로
 * 받으므로 이 값만 바꾸면 된다(023 FR-020). 상한을 더 올리려면 narrative
 * 백그라운드/포그라운드 완주를 먼저 재고 이 주석을 갱신한다(023 FR-019).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const VISION_PHOTO_LIMIT = 8;

/**
 * 하루를 나누는 고정 시간 칸의 수 (023 FR-007·FR-008).
 *
 * **6 = 4시간 간격**: 04–08, 08–12, 12–16, 16–20, 20–24, 00–04. 사람이 하루를
 * 자연스럽게 나누는 시간대와 대략 맞고, 상한(5~12장)과 비슷한 크기라 최소
 * 커버리지가 예산을 거의 다 쓰지 않는다.
 *
 * **사람이 정한 값이며 실측하지 않았다**(원칙 V, `RESIZE_TARGET`와 같은 성격).
 * "몇 칸이 최적인가"를 사진 분포로 찾으면 임계값이 되고 원칙 IV로 간다.
 * 통로가 생기거나 다른 값이 낫다고 사람이 판단하면 여기를 고친다.
 *
 * **export 하지 않는다**(023 FR-016).
 */
const BUCKET_COUNT = 6;

/**
 * 잡사진(카메라로 찍지 않은 사진)이 저장되는 폴더 이름.
 *
 * **사람이 못 박은 상수**(023 FR-002, 012의 `USER_VISIBLE_SIGNAL_AXES`,
 * 021의 `PERMISSION_REQUIREMENTS` 선례). 코드가 경로·사진 수·분포를 보고 이
 * 목록을 만들거나 조정하지 않는다(원칙 V). 새 앱의 새 저장 폴더가 나오면
 * 사람이 여기 추가한다.
 *
 * **대소문자까지 정확히 일치**로 대조한다 — 안드로이드 표준 폴더 이름은
 * 고정이며, 느슨하게(부분 일치·정규식) 잡으면 사용자 폴더를 오분류한다
 * (contracts/classification.md C1).
 *
 * ⚠️ **quickstart D1 실측 후 확정한다** — 안드로이드 버전·제조사에 따라
 * 경로가 다를 수 있어, 실기기에서 `filePathOf()`가 실제로 돌려주는 문자열을
 * 보고 이 목록과 `folderNameOf()`의 파싱을 확정한다(011·013에서 URI 계약이
 * 반복 함정이었다).
 *
 * **export 하지 않는다**(023 FR-016, spec Clarification — 분류 판정은 이
 * 파일에만 있어야 하며 `expo-port.ts`가 이것을 참조하면 분류가 기기 계층으로
 * 샌 것이다).
 */
const NON_CAMERA_FOLDERS: readonly string[] = [
  "Screenshots", // Pictures/Screenshots, DCIM/Screenshots
  "Download", // 브라우저·앱 다운로드
  "KakaoTalk", // Pictures/KakaoTalk
  "WhatsApp Images", // Pictures/WhatsApp Images (또는 .../WhatsApp/Media/...)
  "Telegram", // Pictures/Telegram
];

/**
 * 사진 한 장의 분류. 이 파일 안에서만 쓴다.
 *
 * - `"camera"` — 폴더 이름이 잡사진 목록에 없다(카메라 폴더 포함, 목록 밖
 *   이름 포함 — 023 FR-003).
 * - `"non-camera"` — 폴더 이름이 잡사진 목록에 정확히 매칭.
 * - `"unclassifiable"` — `folderName`이 `undefined`(경로를 못 얻음).
 *
 * 선별에서 `"camera"`와 `"unclassifiable"`은 남고 `"non-camera"`만 빠진다.
 * 값이 셋인 것은 진단에서 "잡사진 아님"과 "모름"을 구분하기 위해서다
 * (원칙 V의 none/unknown 계열).
 */
type PhotoClass = "camera" | "non-camera" | "unclassifiable";

/**
 * 그날 사진 수가 캡션 상한에 닿았는가 — 사진 보기 갈래(많음/보통) 판정
 * (016, spec Clarifications).
 *
 * **"닿았다"는 상한과 같거나 그 이상이라는 뜻이다.** 숫자 자체는 이 함수
 * 밖으로 나가지 않는다 — 011의 S1이 지키려던 것이 그대로 유지된다. 023이
 * 상한을 바꾸면 이 판정도 자동으로 새 상한을 따른다(023 FR-021).
 */
export function reachedVisionLimit(availableCount: number): boolean {
  return availableCount >= VISION_PHOTO_LIMIT;
}

/**
 * 사진 한 장을 분류한다 (contracts/classification.md C1).
 *
 * 폴더 이름 하나로만 판정한다 — EXIF·픽셀·파일 크기를 보지 않는다(원칙 IV).
 */
function classOf(photo: Photo): PhotoClass {
  if (photo.folderName === undefined) return "unclassifiable";
  return NON_CAMERA_FOLDERS.includes(photo.folderName) ? "non-camera" : "camera";
}

/**
 * 각 사진을 분류하고, 선별에 넘길 목록을 만든다
 * (contracts/classification.md C1~C4, 023 FR-001·FR-003·FR-004·FR-005·FR-006).
 *
 * **되돌림은 이 함수 안에서 매번 재계산된다** — 저장·타이머·`useEffect`
 * 없이(009 선례). `"non-camera"`를 뺀 목록이 비면 필터링 전 원본으로 되돌린다
 * (스크린샷뿐인 하루도 그것을 봐야 정직하다, 023 User Story 1 Scenario 2).
 *
 * @returns `kept` — 선별에 넘길 목록. `classes` — 진단·테스트용(어느 사진이
 *   왜 걸러졌나). 선별 결과에는 `classes`가 실리지 않는다.
 */
function classifyPhotos(photos: readonly Photo[]): {
  kept: Photo[];
  classes: Map<string, PhotoClass>;
} {
  const classes = new Map<string, PhotoClass>();
  for (const photo of photos) classes.set(photo.id, classOf(photo));

  const kept = photos.filter((p) => classes.get(p.id) !== "non-camera");

  // C3·FR-004a — 카메라 원본이 0장이면(또는 전부 잡사진이면) 원본으로 되돌린다.
  return { kept: kept.length === 0 ? [...photos] : kept, classes };
}

/**
 * 그 하루의 04:00을 0으로 놓았을 때 `takenAt`이 몇 번째 시간 칸인가
 * (contracts/time-distribution.md D1).
 *
 * **`day-boundary.ts`를 import하지 않는다** — `takenAt`의 시:분에서 04:00
 * 기준 경과 분을 직접 유도한다(순수 유지). 04:00 경계와 일관: 00:30은 전날
 * 칸 그룹의 마지막, 04:00은 첫 칸.
 */
function bucketIndexOf(takenAt: Date): number {
  const minutesSince4am = ((takenAt.getHours() - 4) * 60 + takenAt.getMinutes() + 1440) % 1440;
  const bucketSpan = 1440 / BUCKET_COUNT;
  return Math.min(BUCKET_COUNT - 1, Math.floor(minutesSince4am / bucketSpan));
}

/**
 * 시각 순 `n`장에서 `count`장을 균등 분위로 고른다 (011 R2를 칸 내부에 재적용,
 * contracts/time-distribution.md D6).
 *
 * `i(k) = round(k * (n-1) / (count-1))`. `count === 1`이면 인덱스 중앙값 하나
 * (`floor((n-1)/2)`, 짝수면 앞쪽) — D5·D6 공통.
 */
function pickEvenly(sorted: readonly Photo[], count: number): Photo[] {
  const n = sorted.length;
  if (count >= n) return [...sorted];
  if (count <= 1) return [sorted[Math.floor((n - 1) / 2)]];

  const indices = Array.from({ length: count }, (_, k) => Math.round((k * (n - 1)) / (count - 1)));
  return [...new Set(indices)].map((i) => sorted[i]);
}

/**
 * 시각 분포로 `budget`장을 배분해 고른다
 * (contracts/time-distribution.md D2~D8, 023 FR-007~FR-015·FR-020).
 *
 * @param photos 시각 순, 이미 분류로 걸러진 목록
 * @param budget 선택 예산(`VISION_PHOTO_LIMIT`). 상한이 바뀌면 같은 규칙에
 *   이 값만 바뀐다 — "밀집 가산량"을 따로 두지 않는다(023 FR-020).
 */
function distributeByTime(photos: readonly Photo[], budget: number): Photo[] {
  // D2 — 상한 이하면 분포 계산을 하지 않는다(011 R1 유지).
  if (photos.length <= budget) return [...photos];

  // 사진이 있는 칸만, 칸 인덱스 순으로. 각 칸 안은 시각 순(입력이 이미 시각 순).
  const byBucket = new Map<number, Photo[]>();
  for (const photo of photos) {
    const b = bucketIndexOf(photo.takenAt);
    const list = byBucket.get(b);
    if (list) list.push(photo);
    else byBucket.set(b, [photo]);
  }
  const nonEmpty = [...byBucket.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => list);

  let taken: Photo[];

  if (nonEmpty.length >= budget) {
    // D5 — 칸 수가 예산과 같거나 많다(경계 == 포함). 최소 커버리지를 다 줄 수
    // 없으므로 시간축에 걸쳐 균등하게 budget개의 칸을 고르고 각 1장.
    //
    // 각 칸에서 인덱스 중앙값 하나를 고르되, **첫 칸은 가장 이른 장, 마지막
    // 칸은 가장 늦은 장**을 골라 011 R3(하루의 시작과 끝을 반드시 포함)을
    // 사진 단위로 유지한다 — 마지막 칸에 여러 장이 있으면 중앙값은 하루의
    // 끝이 아니다.
    const idx = [
      ...new Set(
        Array.from({ length: budget }, (_, k) =>
          Math.round((k * (nonEmpty.length - 1)) / (budget - 1)),
        ),
      ),
    ];
    taken = idx.map((bucketPos, k) => {
      const bucket = nonEmpty[bucketPos];
      if (k === 0) return bucket[0];
      if (k === idx.length - 1) return bucket[bucket.length - 1];
      return bucket[Math.floor((bucket.length - 1) / 2)];
    });
  } else {
    // D3·D4 — 최소 커버리지(칸마다 1장) + 남은 예산을 최대 잔여법으로 비례 배분.
    const remaining = budget - nonEmpty.length;
    const total = nonEmpty.reduce((sum, b) => sum + b.length, 0);

    const rows = nonEmpty.map((bucket, index) => {
      const ideal = (remaining * bucket.length) / total;
      return { bucket, index, floor: Math.floor(ideal), frac: ideal - Math.floor(ideal) };
    });

    let leftover = remaining - rows.reduce((sum, r) => sum + r.floor, 0);
    // D4 — 소수부 큰 칸부터. 동점은 (1) 사진 많은 칸, (2) 이른 칸 (023 FR-010a).
    const order = [...rows].sort(
      (a, b) => b.frac - a.frac || b.bucket.length - a.bucket.length || a.index - b.index,
    );
    const bonus = new Set<number>();
    for (const row of order) {
      if (leftover <= 0) break;
      bonus.add(row.index);
      leftover -= 1;
    }

    const lastIndex = rows.length - 1;
    taken = rows.flatMap((r) => {
      const count = 1 + r.floor + (bonus.has(r.index) ? 1 : 0);
      const picked = pickEvenly(r.bucket, count);
      // D5와 같은 011 R3 보정: 첫 칸에 이른 장이, 마지막 칸에 늦은 장이
      // 들어오도록 강제한다 — `count === 1`이면 `pickEvenly`가 중앙값을 주므로
      // 그것만으로는 하루의 시작·끝이 빠질 수 있다.
      if (r.index === 0 && picked[0] !== r.bucket[0]) picked[0] = r.bucket[0];
      if (r.index === lastIndex && picked[picked.length - 1] !== r.bucket[r.bucket.length - 1]) {
        picked[picked.length - 1] = r.bucket[r.bucket.length - 1];
      }
      return picked;
    });
  }

  // D7 — 시각 순 정렬, 중복 제거(011 R4·R5).
  const seen = new Set<string>();
  return taken
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
}

/**
 * 읽을 사진을 고른다.
 *
 * **인자가 하나뿐이다**(011 S1, 023 FR-016). 상한을 밖에서 정할 수 있으면 값이
 * 두 곳에 생기고, 부르는 쪽마다 다른 범위를 쓸 수 있다 — 009가 `selectableDays`
 * 에서 같은 함정을 겪었다.
 *
 * @param photos 찍힌 시각 순으로 정렬된 목록 (004가 이미 정렬해 준다).
 *   `folderName`은 023이 더한 선택적 필드 — 없으면 "분류 불가"로 다뤄 남긴다.
 * @returns 최대 `VISION_PHOTO_LIMIT`장. 찍힌 시각 순.
 */
export function selectForVision(photos: readonly Photo[]): Photo[] {
  // R1 — 상한 이하면 전부. 분류도 분포도 하지 않는다 — 어차피 전부 캡션하므로
  // 잡사진을 걸러도 대상이 안 줄고, `folderName` 없는 기기에서 불필요한 일을
  // 피한다(contracts/classification.md C5).
  if (photos.length <= VISION_PHOTO_LIMIT) return [...photos];

  const { kept } = classifyPhotos(photos);
  return distributeByTime(kept, VISION_PHOTO_LIMIT);
}

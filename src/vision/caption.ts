/**
 * 하루의 사진을 한 장씩 읽어 모은다.
 *
 * 계약: specs/011-photo-vision-summary/contracts/vision-engine.md E4·E5
 *       specs/011-photo-vision-summary/data-model.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **한 장씩 읽는 것이 FR-001a이며, 그것이 세 수를 셀 수 있게 한다.**
 *
 * 여러 장을 한 번에 넣어 하루의 요약 하나를 만들면 **몇 장이 실제로 읽혔는지 셀 수
 * 없다.** 그러면 「다섯 장 중 두 장만 읽혔다」를 값에 남길 수 없고, FR-006이 성립하지
 * 않는다 — 004가 `photosWithLocation`/`photosConsidered`를 함께 둔 것과 같은 구조가
 * 한 겹 위에서 반복되는 자리다.
 *
 * **그리고 한 장의 실패가 나머지를 무너뜨리지 않는다**(E4, FR-005a). 손상된 사진 한
 * 장이 하루 전체를 「모른다」로 만들지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Photo } from "../signals/types";
import { resizePhoto, type ResizeExecutor } from "./resize";
import type { PhotoCaption, PhotoVision } from "./types";
import type { VisionEngine } from "./vision-port";

/**
 * 사진 파일의 실제 경로를 얻는 함수.
 *
 * **004의 `Photo.id`는 미디어 라이브러리 id일 수도 파일 경로일 수도 있다**(004의 주석).
 * 네이티브가 읽으려면 실제 경로가 필요하므로 그 변환을 밖에서 주입받는다 — 이 모듈이
 * 기기를 모르게 하려는 것이며, 004·003의 포트 주입과 같은 구조다.
 */
export type PhotoPathResolver = (photo: Photo) => Promise<string | null>;

/**
 * 리사이즈 사본을 지우는 함수 (013).
 *
 * **`path === sourcePath`(C1 — 이미 작아 그대로 쓴 경우)면 부르지 않는다** — 원본을
 * 지우는 경로가 있으면 안 되기 때문이다(FR-006). 그 판정은 `captionAll` 안에서 한다.
 */
export type ResizedPhotoCleaner = (path: string) => Promise<void>;

/** 그만두라는 신호. 있으면 매 장 앞에서 본다 */
export type CancelSignal = { cancelled: boolean };

/**
 * 사진 전환 신호 (015).
 *
 * 인자를 받지 않는다 — 순번·`Photo.id`·남은 장수 어느 것도 넘기지 않는다.
 * "무언가 바뀌었다"는 사실만 전달한다(data-model.md 「사진 전환 신호」).
 */
export type PhotoAdvanceSignal = () => void;

/**
 * 고른 사진들을 한 장씩 읽는다.
 *
 * @param engine 이미 `load()`된 엔진. **이 함수는 열지도 닫지도 않는다** — E1의 순서는
 *   호출자가 지킨다(research §2)
 * @param photos `selectForVision()`이 고른 것. 찍힌 시각 순
 * @param available 그 하루에 있던 사진의 수. `photos.length`보다 클 수 있다(FR-012)
 * @param resolvePath 사진 id를 실제 파일 경로로 바꾼다(011)
 * @param cancel 그만두라는 신호
 * @param resize 사진을 캡션 전에 줄인다(013). **주입하지 않으면 리사이즈를 건너뛰고
 *   원본 경로를 그대로 쓴다** — 013 이전 동작과 같다. 테스트가 011 시절의 케이스를
 *   그대로 재사용할 수 있게 하는 하위 호환이다(contracts/resize.md는 필수를 요구하지
 *   않는다 — 013이 새로 여는 것은 "리사이즈가 있으면 거친다"는 조건부 경로다)
 * @param cleanup 리사이즈 사본을 지운다(013). `resize`가 없으면 부르지 않는다
 * @param onPhotoStart 사진 전환 신호(015). `for` 루프 매 반복 시작(취소 검사 직후)에
 *   부른다 — 사진마다 정확히 1회, 그만둔 뒤 남은 장은 부르지 않는다
 *   (contracts/photo-advance.md)
 * @returns 읽은 결과. **`captions`가 비어도 그것은 「사진이 없다」가 아니다**
 */
export async function captionAll(
  engine: VisionEngine,
  photos: readonly Photo[],
  available: number,
  resolvePath: PhotoPathResolver,
  cancel?: CancelSignal,
  resize?: ResizeExecutor,
  cleanup?: ResizedPhotoCleaner,
  onPhotoStart?: PhotoAdvanceSignal,
): Promise<PhotoVision | null> {
  const captions: PhotoCaption[] = [];

  for (const photo of photos) {
    // E5 — 그만두면 **거기까지 읽은 것을 버린다**(FR-009).
    //
    // **`null`을 돌려주는 것이 「버린다」의 구현이다.** 여기까지의 `captions`를 담아
    // 돌려주면 호출자가 그것을 쓸 수 있고, 그러면 「적게 본 일기」가 나온다 —
    // 그만둔 것은 취소이지 그것이 아니다.
    if (cancel?.cancelled === true) return null;

    // 015 — 사진 전환 신호. 취소 검사 직후, 경로 해석 이전.
    onPhotoStart?.();

    // 경로를 얻지 못하면 이 장은 읽지 못한 것이다. **나머지는 계속 읽는다**(E4).
    let path: string | null;
    try {
      path = await resolvePath(photo);
    } catch {
      path = null;
    }
    if (path === null) continue;

    // ─────────────────────────────────────────────────────────────────────
    // 013 — 캡션 전에 줄인다. **원본 경로를 캡션에 직접 넘기지 않는다.**
    //
    // `resize`가 없으면(테스트가 주입하지 않은 경우) 리사이즈를 건너뛰고 원본
    // 경로를 그대로 쓴다 — 013 이전과 같은 동작이다.
    //
    // 리사이즈에 실패하면(`ok: false`) **이 장을 못 읽은 것으로 다룬다** — 011의
    // "경로를 못 얻음" 분기와 같은 자리에 합류시킨다(contracts/resize.md 「호출자
    // 쪽 계약」). 새 판정 갈래를 만들지 않는다(FR-019, 원칙 IV).
    // ─────────────────────────────────────────────────────────────────────
    let captionPath = path;
    let shouldCleanup = false;
    if (resize !== undefined) {
      const resized = await resizePhoto(path, resize);
      if (!resized.ok) continue;
      captionPath = resized.path;
      // C1 — 원본과 같은 경로를 그대로 쓴 경우(이미 목표보다 작음)는 지우지
      // 않는다. 원본을 지우는 경로가 있으면 안 된다(FR-006).
      shouldCleanup = resized.path !== path;
    }

    try {
      // **엔진이 던지지 않기로 되어 있지만**(vision-engine.md E3) 여기서도 감싼다.
      //
      // 계약을 믿고 감싸지 않으면, 엔진이 한 번 어겼을 때 **그 하루의 나머지 사진이
      // 통째로 사라진다** — E4가 막으려던 바로 그 일이 계약 위반 한 번으로 일어난다.
      // 방어가 둘이면 하나가 뚫려도 남는다.
      let result: { text: string };
      try {
        result = await engine.caption(captionPath);
      } catch {
        result = { text: "" };
      }

      // **빈 것은 담지 않는다.** 비었다는 것이 곧 실패이며(vision-engine.md V1),
      // `considered`와 `captions.length`의 차이가 그 사실을 말한다.
      //
      // **지어내지 않는다** — 「사진을 보았으나 설명할 수 없다」 같은 문장을 만들어
      // 넣으면 그것이 기록에 없는 것이 되고, 헌법 원칙 II 위반이다.
      if (result.text === "") continue;

      captions.push({ photoId: photo.id, takenAt: photo.takenAt, text: result.text });
    } finally {
      // 013 FR-008 — 그 장의 캡션이 끝나면(성공·실패 무관) 리사이즈 사본을 지운다.
      // 그만두기(E5)로 이 장을 못 마쳐도 finally가 돈다.
      if (shouldCleanup && cleanup !== undefined) {
        await cleanup(captionPath).catch(() => {});
      }
    }
  }

  // 마지막으로 한 번 더 본다 — 마지막 장을 읽는 동안 그만뒀을 수 있다.
  if (cancel?.cancelled === true) return null;

  return { captions, considered: photos.length, available };
}

/**
 * 사진을 보는 모델에 넘기기 전에 사진을 줄인다.
 *
 * 계약: specs/013-photo-resize-caption/contracts/resize.md
 *       specs/013-photo-resize-caption/data-model.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 011의 캡션 129초 중 96%가 사진 처리였다**(013 실측, AGENTS.md 「VLM 캡션
 * 60초의 원인」). 원인은 해상도 — 사진 한 장이 IMAGE 청크 7~9개를 만들고, 그
 * 개수를 정하는 것은 `image_max_tokens`(장당 상한이 아니라 타일당 상한)가 아니라
 * 원본 해상도다. 이 파일이 그 원인에 대한 유일한 대응이다.
 *
 * **순수 계약이다.** 기기를 모르고, 실제 리사이즈 구현(`execute`)을 주입받는다 —
 * 011의 `VisionLoader`, 005의 포트 주입과 같은 구조. 실제 구현은
 * `src/inference/on-device.ts`에만 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 목표 크기 — 긴 변의 최대 픽셀 수.
 *
 * **export 하지 않는다**(FR-002 — 「한 자리에만 있어야 하며 부르는 쪽이 정할 수
 * 없다」). 011의 `VISION_PHOTO_LIMIT`과 같은 성격이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **1024 — 실측 근거가 있다**(2026-08-22, SM-G986N, `quiet`, 헌법 원칙 V).
 *
 * 같은 하루·같은 실행 안에서 원본(4032×3024)과 나란히 캡션된 대조군이었다:
 *
 * | | 원본 | 1024px로 줄인 것 |
 * | --- | ---: | ---: |
 * | IMAGE 청크 | 9 | **1** |
 * | 장당 시간 | 30.9초 | **1.3~1.5초** |
 *
 * **캡션 품질도 유지됐다** — 1024px 사본에서 나온 일기가 "붉은 선반 위에 꽃이
 * 가득한 큰 화병"·"윗부분에는 노란빛의 직선"을 말했고, 원본 사진을 눈으로 확인해
 * 정확함을 검증했다.
 *
 * **다만 이것은 한 하루·한 캐릭터의 관측이며 품질이 무너지는 하한을 잰 값이
 * 아니다** — 512·768에서도 같은지는 재지 않았다(spec Assumptions, Out of Scope
 * "품질이 무너지는 해상도 하한을 찾는 것" — 여러 해상도를 비교해 승자를 고르는
 * 일이므로 원칙 IV가 이 저장소에 두지 못하게 한 측정이다).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const RESIZE_TARGET: ResizeTarget = { maxLongEdge: 1024 };

/** 목표 크기. 긴 변만 받는다 — 짧은 변은 항상 비율로 계산되므로 FR-004(비율
 * 유지)를 어길 조합 자체가 타입에 없다. */
export type ResizeTarget = {
  maxLongEdge: number;
};

/**
 * 리사이즈 한 번의 결과.
 *
 * **자리가 `path` 하나뿐이다**(FR-015, contracts/resize.md C3). 시간·원본/결과
 * 크기를 요청해도 담을 자리가 없다 — 011의 `VisionRunResult`가 `{ text }` 하나뿐인
 * 것과 같은 방어 구조다.
 *
 * **예외를 던지지 않는다**(FR-012). 실패는 `{ ok: false }`다.
 *
 * **`ok: false`에 이유를 담지 않는다.** 호출자(`caption.ts`)가 이유와 무관하게
 * "이 장은 못 읽음"으로만 다루므로(FR-011), 이유를 가르는 것 자체가 갈래를
 * 늘리는 일이다(FR-019, 원칙 IV).
 */
export type ResizeResult = { ok: true; path: string } | { ok: false };

/**
 * 실제 리사이즈를 수행하는 함수. 기기에 닿는 유일한 자리(`on-device.ts`)가
 * 이것을 구현한다.
 *
 * **이미 목표보다 작은 사진은 그대로 쓴다**(FR-003, contracts/resize.md C1) —
 * 이 판정은 `execute` 안에서 한다. 리사이즈 라이브러리가 이미 원본 크기를
 * 읽으므로, 이 계약이 다시 읽으면 같은 파일을 두 번 여는 비용이 든다. 이미
 * 작으면 `execute`가 `{ ok: true, path: sourcePath }`를 돌려준다 — 결과 경로가
 * 원본과 같을 수 있으며, 그것은 실패가 아니다.
 */
export type ResizeExecutor = (sourcePath: string, target: ResizeTarget) => Promise<ResizeResult>;

/**
 * 사진 한 장을 줄인다.
 *
 * @param sourcePath 011의 `PhotoPathResolver`가 이미 돌려준 파일 경로. 이 함수는
 *   그 경로가 유효한 파일을 가리키는지 검증하지 않는다 — 검증은 `execute`의 몫이다
 * @param execute 실제 리사이즈 함수. 테스트는 대역을 주입한다
 */
export async function resizePhoto(
  sourcePath: string,
  execute: ResizeExecutor,
): Promise<ResizeResult> {
  // C2 — 예외를 던지지 않는다. 011의 `caption.ts`가 이미 남긴 교훈과 같다:
  // 계약을 믿고 감싸지 않으면, 구현이 한 번 어겼을 때 그 장 하나가 아니라
  // 하루 전체가 무너진다.
  try {
    return await execute(sourcePath, RESIZE_TARGET);
  } catch {
    return { ok: false };
  }
}

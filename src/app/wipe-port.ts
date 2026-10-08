/**
 * 058 — 일기 모두 지우기의 기기 통로: 사진 리사이즈 사본 자리를 비운다.
 *
 * 계약: specs/058-settings-this-phone/research.md R5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `vision-cache`(013·017)에는 저장된 일기가 참조하는 사본과, 정리되지 못하고 남은 사본만 놓인다(이름이 결정론이라 쌓이지 않는다).
 * 일기를 모두 지우면 그 사본들도 아무도 참조하지 않으므로 **디렉터리 안의 파일을 모두 지운다**(디렉터리는 남긴다).
 *
 * **남는 위험**: 지우는 순간 018 미리 캡션이 돌고 있으면 그것이 지우기 뒤에 사본을 새로 만들 수 있다. 홈은 지운 뒤 다시
 * 마운트되어 그 캡션 결과를 버린다 — 그 사본은 아무도 참조하지 않는 파일로 남고 같은 사진을 다시 읽으면 같은 이름으로 덮인다.
 * 미리 캡션까지 기다리면 지우기가 수십 초 멈출 수 있어 기다리지 않는다.
 *
 * 지연 import — 모듈을 읽는 것만으로 `expo-file-system`이 해석되지 않게 한다(`store.ts`와 같은 판단).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { VISION_CACHE_DIRECTORY } from "../diary/photo-path";

export async function clearPhotoCopies(): Promise<void> {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, VISION_CACHE_DIRECTORY);
  if (!dir.exists) return;

  let first: unknown;
  for (const item of dir.list()) {
    if (!(item instanceof File)) continue;
    try {
      item.delete();
    } catch (error) {
      first ??= error;
    }
  }
  if (first !== undefined) throw first;
}

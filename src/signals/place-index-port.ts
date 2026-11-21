/**
 * 121 — 앱에 함께 들어간 장소 데이터(`assets/places/kr-places.bin`)를 바이트로 읽는 기기 통로.
 *
 * 계약: specs/121-richer-day-places/contracts/place-index.md 「포트」 PP1·PP2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일만 번들 자산과 `expo-asset`을 안다.** `expo-asset`이 자산의 로컬 파일 경로를 주고
 * `expo-file-system` `File`의 **동기** 읽기(`bytesSync`)로 읽는다 — `File`의 비동기 호출은 GC가 네이티브 객체를
 * 먼저 놓아 실패한다(AGENTS, `expo-file-sync` 계약).
 *
 * `load()`는 동기 계약이라, 경로 얻기(`downloadAsync`)는 `prepare()`로 미리 한다. 파이프라인이 이름을 찾기 전에
 * 한 번 `await prepare()`를 부른다. 실패는 던진다 — 받는 쪽(`placeNamer`)이 이름을 「모름」으로 접는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PlaceIndexPort } from "./place-names";

export type PreparedPlaceIndexPort = PlaceIndexPort & {
  /** 자산의 로컬 경로를 얻는다. 여러 번 불러도 한 번만 한다 */
  prepare(): Promise<void>;
};

type FileClass = typeof import("expo-file-system").File;

export function expoPlaceIndexPort(): PreparedPlaceIndexPort {
  let localUri: string | null = null;
  let FileCtor: FileClass | null = null;
  let pending: Promise<void> | null = null;

  return {
    prepare() {
      if (localUri !== null) return Promise.resolve();
      if (pending === null) {
        pending = (async () => {
          // 지연 import — 모듈을 읽는 것만으로 네이티브 모듈이 해석되면 테스트 환경이 무너진다(store.ts와 같은 방식).
          // 자산의 `require()`는 Metro가 번들 자산으로 바꾸는 정적 표시라 그대로 둔다.
          const { Asset } = await import("expo-asset");
          const { File } = await import("expo-file-system");
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const asset = Asset.fromModule(require("../../assets/places/kr-places.bin"));
          await asset.downloadAsync();
          if (asset.localUri === null) throw new Error("장소 데이터의 경로를 얻지 못했다");
          FileCtor = File;
          localUri = asset.localUri;
        })().finally(() => {
          pending = null;
        });
      }
      return pending;
    },
    load() {
      if (localUri === null || FileCtor === null)
        throw new Error("장소 데이터를 아직 준비하지 않았다");
      return new FileCtor(localUri).bytesSync();
    },
  };
}

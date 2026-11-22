/**
 * 126 — 앱에 함께 들어간 지도 데이터(`assets/map/kr-map.bin`)를 바이트로 읽는 기기 통로.
 *
 * 계약: specs/126-route-map-illustration/contracts/day-map.md DM13·DM16, research R4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`src/map/`에서 기기(`expo-asset`·`expo-file-system`)를 아는 파일은 이것 하나다**(DM16). `expo-asset`이 자산의 로컬 파일 경로를 주고
 * `expo-file-system` `File`의 **동기** 읽기(`bytesSync`)로 읽는다 — `File`의 비동기 호출은 GC가 네이티브 객체를 먼저 놓아 실패한다
 * (AGENTS, `expo-file-sync` 계약).
 *
 * `load()`는 동기 계약이라 경로 얻기(`downloadAsync`)는 `prepare()`로 미리 한다. **바이트는 프로세스 안에서 한 번만 읽어 둔다**
 * (지면을 열 때마다 약 10MB를 다시 읽지 않는다, research R4). 앱 시작에는 읽지 않고 첫 쓴 날 지면에서만 읽는다.
 * 실패는 던진다 — 받는 쪽(`wiring.routeDay`)이 「지도 없음」으로 접는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type MapPort = {
  /** 자산의 로컬 경로를 얻는다. 여러 번 불러도 한 번만 한다 */
  prepare(): Promise<void>;
  /** 지도 파일 바이트. `prepare()` 뒤에 부르며 처음 한 번만 읽는다 */
  load(): Uint8Array;
};

type FileClass = typeof import("expo-file-system").File;

/** 기기 모듈을 얻는 방법 — 기본은 지연 import다. 테스트가 대역을 넣는다 */
export type MapModules = {
  /** 자산의 로컬 경로를 얻는다(`downloadAsync` 뒤). 못 얻으면 던진다 */
  localUri(): Promise<string>;
  File: FileClass;
};

/** 지연 import — 모듈을 읽는 것만으로 네이티브 모듈이 해석되면 테스트 환경이 무너진다(place-index-port.ts와 같은 방식) */
async function deviceModules(): Promise<MapModules> {
  const { Asset } = await import("expo-asset");
  const { File } = await import("expo-file-system");
  return {
    File,
    async localUri() {
      // 자산의 `require()`는 Metro가 번들 자산으로 바꾸는 정적 표시라 그대로 둔다.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asset = Asset.fromModule(require("../../assets/map/kr-map.bin"));
      await asset.downloadAsync();
      if (asset.localUri === null) throw new Error("지도 데이터의 경로를 얻지 못했다");
      return asset.localUri;
    },
  };
}

export function expoMapPort(): MapPort {
  return makeMapPort(deviceModules);
}

export function makeMapPort(modules: () => Promise<MapModules>): MapPort {
  let localUri: string | null = null;
  let FileCtor: FileClass | null = null;
  let pending: Promise<void> | null = null;
  let bytes: Uint8Array | null = null;

  return {
    prepare() {
      if (localUri !== null) return Promise.resolve();
      if (pending === null) {
        pending = (async () => {
          const m = await modules();
          const uri = await m.localUri();
          FileCtor = m.File;
          localUri = uri;
        })().finally(() => {
          pending = null;
        });
      }
      return pending;
    },
    load() {
      if (bytes !== null) return bytes;
      if (localUri === null || FileCtor === null)
        throw new Error("지도 데이터를 아직 준비하지 않았다");
      bytes = new FileCtor(localUri).bytesSync();
      return bytes;
    },
  };
}

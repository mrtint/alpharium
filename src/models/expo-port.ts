/**
 * `expo-file-system` 57로 모델 통로를 구현한다.
 *
 * 계약: specs/003-character-model-files/contracts/acquisition.md
 *       specs/003-character-model-files/contracts/storage.md
 *
 * **이 파일이 이 기능에서 기기에 닿는 유일한 자리다.** 판정·규칙은 순수 함수로 떼어
 * 놓았으므로 기기 없이 검증되고, 여기만 실기기에서 확인하면 된다(FR-036).
 *
 * **지연 import 하는 이유**: 001의 on-device 어댑터, 002의 저장과 같다. 모듈 해석 자체가
 * 실패할 수 있는 환경(웹·테스트)에서 이 파일을 불러오는 것만으로 무너지지 않게 한다.
 *
 * **`Paths.document` 아래에 둔다** — `Paths.cache`는 시스템이 공간 부족 시 지우는 자리이고
 * (타입 정의에 명시), 모델은 다시 받는 비용이 크다. 다만 document도 절대 안전하지는
 * 않으므로(사용자가 지울 수 있다) FR-021e가 필요하다.
 */

import type {
  DiskSpacePort,
  DownloadPort,
  MetadataPort,
  ModelFilePort,
  ModelPorts,
  RangeFetchPort,
  RangeOutcome,
  TransferHandle,
  TransferOutcome,
  TransferProgress,
} from "./port";
import { runSegmented } from "./segmented/transfer";
import type { RangeSupport, Segment, SegmentedResume } from "./segmented/types";
import type { AssetKey } from "./types";

/** 모델이 놓이는 디렉터리 이름. 002의 `diary/`와 나란한 자리다 */
const DIRECTORY = "models";
/** 메타데이터 파일. 검증 결과와 중단 상태가 함께 들어간다(research.md §4) */
const STATE_FILE = "state.json";

/**
 * 파일 이름.
 *
 * **자산키를 그대로 쓴다.** 자산키는 로스터가 정하는 불투명한 값이며 캐릭터 식별자와
 * 다르므로(FR-004), 파일 관리자로 열어도 어느 캐릭터의 무슨 모델인지 알 수 없다.
 */
const fileNameFor = (key: AssetKey) => `${key}.bin`;
/** 받다 만 파일. 지울 때 함께 지워야 공간이 실제로 빈다(FR-029) */
const partialNameFor = (key: AssetKey) => `${key}.bin.part`;

async function openDirectory() {
  const { Directory, File, FileMode, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File, FileMode, Paths };
}

export function expoModelFilePort(): ModelFilePort {
  return {
    async facts(key) {
      const { dir, File } = await openDirectory();
      const file = new File(dir, fileNameFor(key));
      if (!file.exists) return { exists: false, bytes: null };
      return { exists: true, bytes: file.size ?? null };
    },

    /**
     * 내용 지문.
     *
     * **GB 전체를 읽으므로 내려받기 직후 한 번만 부른다**(FR-021a). 상태 조회는 이것을
     * 부르지 않고 `facts`만 쓴다 — 그래야 조회가 파일 크기와 무관하게 끝난다(SC-016).
     */
    async contentHash(key) {
      const { dir, File } = await openDirectory();
      const file = new File(dir, fileNameFor(key));
      if (!file.exists) return null;

      const info = await file.info({ md5: true });
      return info.exists ? (info.md5 ?? null) : null;
    },

    /** 모델 파일과 **부분 파일을 함께** 지운다(FR-029). 없으면 조용히 넘어간다 */
    async remove(key) {
      const { dir, File } = await openDirectory();
      for (const name of [fileNameFor(key), partialNameFor(key)]) {
        const file = new File(dir, name);
        if (file.exists) file.delete();
      }
    },

    /** 부분 파일도 합산한다 — 사용자가 보는 것은 "지금 차지하는 자리"다(FR-028) */
    async bytesUsed(key) {
      const { dir, File } = await openDirectory();
      let total = 0;
      for (const name of [fileNameFor(key), partialNameFor(key)]) {
        const file = new File(dir, name);
        if (file.exists) total += file.size ?? 0;
      }
      return total;
    },
  };
}

export function expoMetadataPort(): MetadataPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, STATE_FILE);
      return file.exists ? file.text() : null;
    },

    /**
     * 임시 파일에 쓰고 제자리로 옮긴다.
     *
     * 바로 덮어쓰면 쓰기 도중 앱이 죽었을 때 반쯤 쓰인 파일이 남아 검증 결과 전체를
     * 잃는다. 002의 `writeAtomically`와 같은 방식이다.
     */
    async writeAtomically(contents) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${STATE_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(contents);

      const target = new File(dir, STATE_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}

export function expoDiskSpacePort(): DiskSpacePort {
  return {
    async availableBytes() {
      const { Paths } = await import("expo-file-system");
      return Paths.availableDiskSpace;
    },
  };
}

/**
 * 내려받기.
 *
 * **재개를 우리가 만들지 않고 보관한다**(research.md §1). `savable()`이 준 값을 저장하고
 * `fromSavable()`로 되살리는 왕복이 FR-016(앱 종료 후 이어받기)을 성립시킨다.
 *
 * **`savable()`은 `paused` 상태에서만 부를 수 있다**(타입 정의에 명시). 앱이 갑자기 죽으면
 * 부를 기회가 없고, 그때는 부분 파일만 남아 `partial`이되 이어받을 수 없는 상태가 된다 —
 * 그것도 판정이 구분한다.
 */
/**
 * 개발 전용 강제 폴백 스위치 (026 SC-004, quickstart Q3·Q4).
 *
 * `__DEV__ && globalThis.__FORCE_DOWNLOAD_FALLBACK__`가 참이면 `probeRange`를 부르지
 * 않고 곧바로 `unsupported`로 취급해 단일 스트림 경로를 탄다. 프로덕션 번들에서는
 * `__DEV__`가 거짓이라 이 분기가 트리셰이킹된다. 개발자 탭이나 콘솔에서 플래그를
 * 토글해 세그먼트 켬/끔 대조(Q3)와 폴백 완주(Q4)를 같은 앱에서 확인한다.
 *
 * **이 스위치는 `probeRange` 결과만 가로챈다** — 세그먼트 코어(`runSegmented`)와 순수
 * 함수는 이 플래그를 모른다.
 */
function forcedFallback(): boolean {
  return (
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    (globalThis as { __FORCE_DOWNLOAD_FALLBACK__?: boolean }).__FORCE_DOWNLOAD_FALLBACK__ === true
  );
}

/**
 * 세그먼트 병렬 수신 통로 (026).
 *
 * **`Character`를 모른다** — `AssetKey`만. `fileNameFor(key)`로 파일 이름을 만든다(003과 동일).
 *
 * **부분 쓰기는 멱등이다** — 받은 청크를 `segment.start` 오프셋부터 이어 쓰고, 앱이 죽으면
 * 이미 쓰인 바이트는 남는다. 재개 시 `receivedBytes`가 저장돼 있으면 그 지점부터, 없으면
 * 다시 받아 덮어쓴다.
 */
export function expoRangeFetchPort(): RangeFetchPort {
  return {
    async probeRange(url: string): Promise<RangeSupport> {
      if (forcedFallback()) return { kind: "unsupported" };
      try {
        // `Range: bytes=0-0`으로 한 바이트만 요청해 서버 지원을 본다. `fetch`가
        // 리다이렉트를 따라가므로 최종 응답 헤더를 본다.
        const res = await fetch(url, { headers: { Range: "bytes=0-0" } });
        const acceptRanges = res.headers.get("accept-ranges");
        const contentRange = res.headers.get("content-range");
        // 206 + Content-Range: bytes 0-0/<total> 이면 확실히 지원.
        if (res.status === 206 && contentRange) {
          const match = /\/(\d+)\s*$/.exec(contentRange);
          const total = match ? Number(match[1]) : NaN;
          if (Number.isFinite(total) && total > 0) return { kind: "supported", totalBytes: total };
        }
        // 200이지만 Accept-Ranges: bytes + Content-Length가 있으면 지원으로 본다.
        if (acceptRanges === "bytes") {
          const len = Number(res.headers.get("content-length"));
          if (Number.isFinite(len) && len > 0) return { kind: "supported", totalBytes: len };
        }
        // 애매하면 지어내지 않는다 (원칙 V).
        return { kind: "unsupported" };
      } catch {
        return { kind: "unsupported" };
      }
    },

    async fetchRange(
      key: AssetKey,
      url: string,
      segment: Segment,
      onBytes: (delta: number) => void,
      signal?: AbortSignal,
    ): Promise<RangeOutcome> {
      const { dir, File, FileMode } = await openDirectory();
      const target = new File(dir, fileNameFor(key));
      if (!target.exists) target.create();

      // 파일 핸들을 열어 `offset`을 이 구간의 시작으로 옮긴 뒤 받은 청크를 이어 쓴다
      // (expo-file-system 57 `File.open()` → `FileHandle`, T-Q0 실측 확인 대상).
      const handle = target.open(FileMode.ReadWrite);
      handle.offset = segment.start;
      try {
        const res = await fetch(url, {
          headers: { Range: `bytes=${segment.start}-${segment.end}` },
          signal,
        });
        if (!res.ok && res.status !== 206) {
          return { kind: "failed", reason: `HTTP ${res.status}` };
        }
        if (!res.body) {
          const buf = new Uint8Array(await res.arrayBuffer());
          handle.writeBytes(buf);
          onBytes(buf.byteLength);
          return { kind: "completed" };
        }

        // 스트림으로 받아 이어 쓴다 — 구간 전체를 메모리에 담지 않는다.
        const reader = res.body.getReader();
        for (;;) {
          if (signal?.aborted) {
            await reader.cancel().catch(() => {});
            return { kind: "aborted" };
          }
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.byteLength > 0) {
            handle.writeBytes(value);
            onBytes(value.byteLength);
          }
        }
        return { kind: "completed" };
      } catch (error) {
        if (signal?.aborted) return { kind: "aborted" };
        return { kind: "failed", reason: error instanceof Error ? error.message : String(error) };
      } finally {
        handle.close();
      }
    },
  };
}

export function expoDownloadPort(range: RangeFetchPort = expoRangeFetchPort()): DownloadPort {
  const wrap = (
    createTask: () => Promise<{
      task: {
        downloadAsync?: () => Promise<unknown>;
        resumeAsync?: () => Promise<unknown>;
        pauseAsync: () => Promise<void>;
        savable: () => unknown;
        state: string;
      };
      run: () => Promise<unknown>;
    }>,
  ): TransferHandle => {
    let pending: Promise<TransferOutcome> | null = null;
    let taskRef: { pauseAsync: () => Promise<void>; savable: () => unknown; state: string } | null =
      null;

    const ensure = async (): Promise<TransferOutcome> => {
      const { task, run } = await createTask();
      taskRef = task;
      try {
        const result = await run();
        // `downloadAsync`/`resumeAsync`는 중단되면 null을 돌려준다(타입 정의).
        if (result === null) {
          return { kind: "paused", state: task.savable() };
        }
        return { kind: "completed" };
      } catch (error) {
        return { kind: "failed", reason: error instanceof Error ? error.message : String(error) };
      }
    };

    return {
      wait() {
        pending ??= ensure();
        return pending;
      },
      async pause() {
        await taskRef?.pauseAsync();
      },
    };
  };

  /**
   * `runSegmented`의 `fraction`을 003 `TransferProgress` 모양으로 되돌린다.
   *
   * `acquisition.ts`의 `fractionOf`가 그대로 동작하도록 — `totalBytes`를 그대로 넘기고
   * `bytesWritten`을 `fraction * total`로 재구성한다. **세그먼트 코어는 바이트를 모른
   * 채 `fraction`만 냈고**(원칙 III), 이 어댑터가 경계에서 다시 바이트로 바꾼다.
   */
  const wrapProgress =
    (total: number, onProgress: (p: TransferProgress) => void) => (fraction: number | null) => {
      if (fraction === null) {
        onProgress({ bytesWritten: 0, totalBytes: -1 });
        return;
      }
      onProgress({ bytesWritten: Math.round(fraction * total), totalBytes: total });
    };

  /**
   * 세그먼트/폴백 어느 쪽이든 하나의 `TransferHandle`로 감싼다.
   *
   * 세그먼트를 먼저 시도하고, `{ fallback }`이면 003의 `createDownloadTask` 경로로.
   */
  const segmentedOrFallback = (
    key: AssetKey,
    url: string,
    onProgress: (p: TransferProgress) => void,
    resume?: SegmentedResume,
  ): TransferHandle => {
    let pending: Promise<TransferOutcome> | null = null;
    const pauseCtl = new AbortController();
    let fallbackHandle: TransferHandle | null = null;

    const run = async (): Promise<TransferOutcome> => {
      // `runSegmented`가 `onSizeResolved`로 전체 크기를 알려주면 그때부터 003의
      // `TransferProgress { bytesWritten, totalBytes }` 모양을 정확히 복원한다.
      // 그 전까지는 `fraction`을 그대로 흘려보낸다(003의 `fractionOf`가 total<=0을
      // "모름"으로 다루므로 안전).
      let total = resume?.totalBytes ?? 0;
      const result = await runSegmented({ range }, key, url, {
        onProgress: (f) => {
          if (total > 0) {
            wrapProgress(total, onProgress)(f);
          } else {
            onProgress({ bytesWritten: 0, totalBytes: -1 });
          }
        },
        onSizeResolved: (t) => {
          total = t;
        },
        pauseSignal: pauseCtl.signal,
        resume,
      });

      if (result.kind === "fallback") {
        // 003의 단일 스트림 경로.
        fallbackHandle = plainDownload(key, url, onProgress);
        return fallbackHandle.wait();
      }
      if (result.kind === "completed") return { kind: "completed" };
      if (result.kind === "failed") return { kind: "failed", reason: result.reason };
      // paused — SegmentedResume를 003의 unknown state 자리에 담는다.
      return { kind: "paused", state: result.resume };
    };

    return {
      wait() {
        pending ??= run();
        return pending;
      },
      async pause() {
        if (fallbackHandle) {
          await fallbackHandle.pause();
          return;
        }
        pauseCtl.abort();
      },
    };
  };

  /** 003의 단일 스트림 다운로드 (폴백 경로). */
  const plainDownload = (key: AssetKey, url: string, onProgress: (p: TransferProgress) => void) =>
    wrap(async () => {
      const { dir, File } = await openDirectory();
      const target = new File(dir, fileNameFor(key));
      const task = File.createDownloadTask(url, target, {
        onProgress: (p: TransferProgress) => onProgress(p),
      });
      return { task: task as never, run: () => task.downloadAsync() };
    });

  return {
    start(key, url, onProgress) {
      return segmentedOrFallback(key, url, onProgress);
    },

    resume(key, url, state, onProgress) {
      // 026 — 세그먼트 재개 상태면 세그먼트 경로로, 003의 불투명 값이면 단일 스트림
      // 이어받기로 (contracts/segmented-transfer.md 「resume」).
      if (isSegmentedResume(state)) {
        return segmentedOrFallback(key, url, onProgress, state);
      }
      return wrap(async () => {
        const { DownloadTask } = await import("expo-file-system");
        void key;
        const task = DownloadTask.fromSavable(state as never, {
          onProgress: (p: TransferProgress) => onProgress(p),
        });
        return { task: task as never, run: () => task.resumeAsync() };
      });
    },
  };
}

/** `resume`의 `state`가 026의 `SegmentedResume`인지 본다 (003의 불투명 값과 구분). */
function isSegmentedResume(state: unknown): state is SegmentedResume {
  return (
    typeof state === "object" &&
    state !== null &&
    "segmentCount" in state &&
    "receivedBytes" in state &&
    Array.isArray((state as { receivedBytes: unknown }).receivedBytes)
  );
}

/** 실기기에서 쓰는 통로 묶음. 테스트는 이것을 쓰지 않고 대역을 넣는다. */
/**
 * 모델 파일의 실제 경로.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **005가 더한 자리다.** `ModelFilePort`는 일부러 경로를 내주지 않는다 — 자산키로만
 * 다루면 부르는 쪽이 파일을 직접 열 수 없기 때문이다.
 *
 * 그런데 `llama.rn`의 `initLlama`는 **경로 문자열을 요구한다.** 005가 자기 쪽에서
 * 디렉터리 규칙을 다시 만들면 경로 지식이 두 곳에 생기고, 한쪽을 고칠 때 다른 쪽이
 * 어긋난다. **그래서 이미 아는 이 자리가 내준다.**
 *
 * **돌려주는 값은 안쪽 값이다**(003 types.ts의 경계). 화면으로 나가지 않는다 —
 * 파일 이름이 자산키이므로 그것이 새면 캐릭터→모델 매핑을 역추적할 실마리가 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function modelFilePath(key: AssetKey): Promise<string> {
  const { dir, File } = await openDirectory();
  return new File(dir, fileNameFor(key)).uri;
}

export function expoModelPorts(): ModelPorts {
  const range = expoRangeFetchPort();
  return {
    files: expoModelFilePort(),
    metadata: expoMetadataPort(),
    disk: expoDiskSpacePort(),
    download: expoDownloadPort(range),
    range,
  };
}

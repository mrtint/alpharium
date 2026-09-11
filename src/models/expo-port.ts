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
/**
 * 구간 하나가 받는 동안 쓰는 임시 파일 (041).
 *
 * 네이티브 `DownloadTask`가 목적지에 직접 쓰므로, 구간들이 같은 파일을 동시에
 * 건드리지 않게 구간마다 갈라 둔다. 수신이 끝나면 최종 파일로 옮겨 붙이고 지운다.
 */
const segmentNameFor = (key: AssetKey, index: number) => `${key}.bin.seg${index}`;

/**
 * 옮겨 붙일 때 한 번에 드는 바이트 (041).
 *
 * **사람이 정한 상수다**(원칙 V) — 파일 크기·구간 크기로 계산하지 않는다. 이 값이
 * 곧 이 경로의 상주 메모리 상한이며, 구간이 380MB이든 1.5GB이든 힙에 올라오는 것은
 * 언제나 이만큼뿐이다. 1MiB는 복사 횟수와 건당 비용이 모두 적당한 자리다.
 */
const COPY_CHUNK_BYTES = 1024 * 1024;

/**
 * 이 자산이 디스크에 남길 수 있는 모든 이름 (041).
 *
 * 최종 파일 + 003의 부분 파일 + 구간 임시 파일들. 지우기(FR-029)와 용량 합산
 * (FR-028)이 같은 목록을 봐야 한 쪽만 갱신되어 어긋나지 않는다.
 *
 * 구간 수는 `SEGMENT_COUNT`가 아니라 **저장 당시 값일 수 있다**(재개는 저장된
 * `segmentCount`로 계획을 복원한다). 상수가 나중에 줄어도 예전 구간 파일이 남지
 * 않도록 넉넉한 상한까지 훑는다 — 없는 파일은 조용히 건너뛴다.
 */
function leftoverNamesFor(key: AssetKey): string[] {
  const names = [fileNameFor(key), partialNameFor(key)];
  for (let i = 0; i < MAX_TRACKED_SEGMENTS; i++) names.push(segmentNameFor(key, i));
  return names;
}

/**
 * 정리·합산이 훑는 구간 파일 개수의 상한.
 *
 * **사람이 정한 상수다**(원칙 V). `SEGMENT_COUNT`(현재 4)보다 넉넉히 잡아, 그 값이
 * 나중에 줄어도 예전에 만들어진 구간 파일이 지워지지 않고 남는 일이 없게 한다.
 */
const MAX_TRACKED_SEGMENTS = 16;

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

    /**
     * 모델 파일과 **부분 파일·구간 임시 파일을 함께** 지운다(FR-029, 041 FR-005).
     * 없으면 조용히 넘어간다.
     */
    async remove(key) {
      const { dir, File } = await openDirectory();
      for (const name of leftoverNamesFor(key)) {
        const file = new File(dir, name);
        if (file.exists) file.delete();
      }
    },

    /**
     * 부분 파일·구간 임시 파일도 합산한다 — 사용자가 보는 것은 "지금 차지하는
     * 자리"다(FR-028). 앱이 수신 도중 죽으면 구간 파일이 남으므로 여기 포함되지
     * 않으면 GB 단위가 사용자 눈에 안 보이는 채로 남는다(041).
     */
    async bytesUsed(key) {
      const { dir, File } = await openDirectory();
      let total = 0;
      for (const name of leftoverNamesFor(key)) {
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

    /**
     * 한 구간을 받아 최종 파일의 `segment.start` 오프셋에 놓는다 (041).
     *
     * ─────────────────────────────────────────────────────────────────────────
     * **바이트가 JS 힙을 거치지 않는다.** 네이티브 `DownloadTask`에 `Range` 헤더를
     * 주어 구간 요청 자체를 네이티브가 수행하고, 받은 바이트를 곧바로 임시 파일에
     * 쓴다. 다 받으면 `FileHandle`로 청크(`COPY_CHUNK_BYTES`)씩 최종 파일의 제자리로
     * 옮겨 붙인다 — 옮기는 동안에도 힙에 올라오는 것은 청크 하나뿐이다.
     *
     * **왜 `fetch`를 쓰지 않는가** (041 근본 원인): RN 0.86의 전역 `fetch`는
     * `whatwg-fetch` 폴리필이고 그 응답에는 `body` 속성이 **아예 없다**(XHR 기반이라
     * `ReadableStream`이 없다). 그래서 예전 코드의 `if (!res.body)` 분기가 언제나
     * 참이 되어 모든 구간이 `arrayBuffer()`로 약 380MB를 통째로 힙에 올렸고,
     * 4구간이 동시에 그것을 시도해 `OutOfMemoryError`가 났다(힙 한계 268MB 관측).
     * 그 아래 스트리밍 루프는 **한 번도 실행된 적이 없는 죽은 코드**였다 —
     * 011의 `has_media=0`, 013의 URI 계약 불일치와 같은 계열의 조용한 실패다.
     * ─────────────────────────────────────────────────────────────────────────
     */
    async fetchRange(
      key: AssetKey,
      url: string,
      segment: Segment,
      onBytes: (delta: number) => void,
      signal?: AbortSignal,
    ): Promise<RangeOutcome> {
      const { dir, File, FileMode } = await openDirectory();
      const { DownloadTask } = await import("expo-file-system");

      const target = new File(dir, fileNameFor(key));
      if (!target.exists) target.create();

      // 구간마다 제 임시 파일로 받는다 — 네이티브가 목적지에 직접 쓰므로
      // 구간들이 같은 파일을 동시에 건드리지 않게 갈라 둔다.
      const scratch = new File(dir, segmentNameFor(key, segment.index));
      if (scratch.exists) scratch.delete();

      try {
        // 이 구간이 이미 보고한 바이트. 네이티브 진행 보고는 누적값이므로
        // 증분으로 바꿔 `onBytes(delta)` 계약을 지킨다(FR-002).
        let reported = 0;
        const task = new DownloadTask(url, scratch, {
          headers: { Range: `bytes=${segment.start}-${segment.end}` },
          signal,
          onProgress: ({ bytesWritten }: TransferProgress) => {
            const delta = bytesWritten - reported;
            if (delta > 0) {
              reported = bytesWritten;
              onBytes(delta);
            }
          },
        });

        const downloaded = await task.downloadAsync();
        if (downloaded === null) return { kind: "aborted" };
        if (signal?.aborted) return { kind: "aborted" };

        // 받은 구간을 최종 파일의 제자리로 옮겨 붙인다. 진행 보고는 수신
        // 단계에서 이미 끝났으므로 여기서는 보고하지 않는다.
        copyInto(target, scratch, segment.start, FileMode);
        return { kind: "completed" };
      } catch (error) {
        if (signal?.aborted) return { kind: "aborted" };
        // `AbortSignal`로 취소되면 네이티브가 AbortError로 거부한다.
        if (error instanceof Error && error.name === "AbortError") return { kind: "aborted" };
        return { kind: "failed", reason: error instanceof Error ? error.message : String(error) };
      } finally {
        // 성공·실패·취소 어느 경로에서도 임시 파일을 남기지 않는다(FR-005).
        if (scratch.exists) scratch.delete();
      }
    },
  };
}

/**
 * 받아 둔 구간 파일을 최종 파일의 `offset` 자리로 옮겨 붙인다 (041).
 *
 * **청크 단위로 옮긴다** — `COPY_CHUNK_BYTES`씩 읽어 쓰므로 구간이 아무리 커도
 * 힙에 올라오는 것은 청크 하나뿐이다. 이것이 FR-001을 성립시키는 자리다.
 *
 * 두 핸들 모두 `finally`에서 닫는다 — 열어 둔 채 예외가 나면 파일 서술자가 샌다.
 */
function copyInto(
  target: ExpoFile,
  source: ExpoFile,
  offset: number,
  FileMode: ExpoFileModeEnum,
): void {
  const reader = source.open(FileMode.ReadOnly);
  let writer: ReturnType<ExpoFile["open"]> | null = null;
  try {
    writer = target.open(FileMode.ReadWrite);
    writer.offset = offset;
    for (;;) {
      const chunk = reader.readBytes(COPY_CHUNK_BYTES);
      if (chunk.byteLength === 0) break;
      writer.writeBytes(chunk);
    }
  } finally {
    reader.close();
    writer?.close();
  }
}

/**
 * `openDirectory()`가 내주는 `File`·`FileMode`의 타입.
 *
 * 모듈을 지연 import 하므로(파일 머리 주석) 값은 런타임에 오고 타입만 여기서 빌린다.
 */
type ExpoFile = InstanceType<Awaited<typeof import("expo-file-system")>["File"]>;
type ExpoFileModeEnum = Awaited<typeof import("expo-file-system")>["FileMode"];

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

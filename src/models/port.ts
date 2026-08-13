/**
 * 모델 파일이 바깥 세계에 닿는 통로.
 *
 * 계약: specs/003-character-model-files/contracts/acquisition.md
 *       specs/003-character-model-files/contracts/storage.md
 *
 * `expo-file-system`을 직접 부르지 않고 이 모양을 주입받는다. 002의 `FileSystemPort`와
 * 같은 방식이며, 그래야 기기 없이 테스트할 수 있다(계약의 검증 표 57행 중 대부분이
 * 기기 없이 돈다).
 *
 * **여기가 이 기능에서 기기에 의존하는 유일한 자리다.** 판정·규칙은 순수 함수로 떼어
 * 놓았다.
 */

import type { AssetKey } from "./types";

/* ──────────────────────────── 파일 ──────────────────────────── */

/** 파일 하나의 지금 상태. 내용을 읽지 않고 알 수 있는 것만 담는다. */
export type FileFacts = {
  exists: boolean;
  /** 없으면 null */
  bytes: number | null;
};

/**
 * 모델 파일과 메타데이터가 놓이는 자리.
 *
 * **`Paths.document` 아래에 둔다** — `Paths.cache`는 시스템이 공간 부족 시 지우는
 * 자리이고, 모델은 다시 받는 비용이 크다. 다만 document도 절대 안전하지는 않으므로
 * (사용자가 지울 수 있다) FR-021e가 필요하다.
 */
export interface ModelFilePort {
  /**
   * 파일의 존재와 크기. **내용을 읽지 않는다** — 상태 조회가 파일 크기에 비례해
   * 느려지면 안 된다(SC-016, FR-021d).
   */
  facts(key: AssetKey): Promise<FileFacts>;

  /**
   * 파일의 내용 지문. **GB 전체를 읽으므로 내려받기 직후 한 번만 부른다**(FR-021a).
   * 파일이 없으면 null.
   */
  contentHash(key: AssetKey): Promise<string | null>;

  /** 모델 파일과 그 부분 파일을 지운다(FR-029). 없으면 조용히 넘어간다 */
  remove(key: AssetKey): Promise<void>;

  /** 이 자산이 지금 차지하는 바이트. 부분 파일을 포함한다(FR-028) */
  bytesUsed(key: AssetKey): Promise<number>;
}

/* ─────────────────────────── 메타데이터 ─────────────────────────── */

/**
 * 검증 결과와 중단 상태를 담는 파일.
 *
 * **한 파일에 모은다**(research.md §4). 002의 일기는 항목이 계속 늘어나 날짜별로
 * 쪼갰지만, 여기는 캐릭터가 다섯으로 고정이고 늘 전부를 조회하므로 모으는 쪽이 낫다.
 */
export interface MetadataPort {
  /** 없으면 null. 읽을 수 없는 파일도 null로 다룬다 */
  read(): Promise<string | null>;
  /** 임시 파일에 쓰고 옮긴다. 쓰다 죽어도 기존 것이 남아야 한다(002와 동형) */
  writeAtomically(contents: string): Promise<void>;
}

/* ──────────────────────────── 공간 ──────────────────────────── */

export interface DiskSpacePort {
  /** 기기에 남은 바이트 (FR-019) */
  availableBytes(): Promise<number>;
}

/* ─────────────────────────── 내려받기 ─────────────────────────── */

/** 진행 보고. **바이트가 여기까지만 오고 밖으로 나가지 않는다**(FR-013a) */
export type TransferProgress = {
  bytesWritten: number;
  /** 서버가 Content-Length를 주지 않으면 -1 (research.md §1) */
  totalBytes: number;
};

/**
 * 내려받기 결과.
 *
 * **`paused`가 성공도 실패도 아닌 셋째 갈래인 것이 중요하다** — 사용자가 멈춘 것은
 * 실패가 아니고, 이어받을 수 있는 상태다(FR-014, FR-015).
 */
export type TransferOutcome =
  | { kind: "completed" }
  | { kind: "paused"; state: unknown }
  | { kind: "failed"; reason: string };

/**
 * 하나의 내려받기 작업.
 *
 * `expo-file-system`의 `DownloadTask`를 감싼다. **재개를 우리가 만들지 않고
 * 보관한다**(research.md §1) — `savable()`이 준 값을 저장하고 `fromSavable()`로
 * 되살리는 왕복이 FR-016(앱 종료 후 이어받기)을 성립시킨다.
 */
export interface TransferHandle {
  /** 끝날 때까지 기다린다 */
  wait(): Promise<TransferOutcome>;
  /** 멈춘다. 이어받을 수 있는 상태로 남긴다 */
  pause(): Promise<void>;
}

export interface DownloadPort {
  /** 처음부터 받는다 */
  start(
    key: AssetKey,
    url: string,
    onProgress: (progress: TransferProgress) => void,
  ): TransferHandle;

  /** 보관해 둔 상태에서 이어받는다(FR-015, FR-016) */
  resume(
    key: AssetKey,
    state: unknown,
    onProgress: (progress: TransferProgress) => void,
  ): TransferHandle;
}

/* ──────────────────────────── 묶음 ──────────────────────────── */

/** 이 기능이 기기에 의존하는 전부. 테스트는 이것을 통째로 대역으로 바꾼다. */
export type ModelPorts = {
  files: ModelFilePort;
  metadata: MetadataPort;
  disk: DiskSpacePort;
  download: DownloadPort;
};

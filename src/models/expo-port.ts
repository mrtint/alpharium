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
  TransferHandle,
  TransferOutcome,
  TransferProgress,
} from "./port";
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
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File, Paths };
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
export function expoDownloadPort(): DownloadPort {
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

  return {
    start(key, url, onProgress) {
      return wrap(async () => {
        const { dir, File } = await openDirectory();
        const target = new File(dir, fileNameFor(key));
        const task = File.createDownloadTask(url, target, {
          onProgress: (p: TransferProgress) => onProgress(p),
        });
        return { task: task as never, run: () => task.downloadAsync() };
      });
    },

    resume(key, state, onProgress) {
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
  return {
    files: expoModelFilePort(),
    metadata: expoMetadataPort(),
    disk: expoDiskSpacePort(),
    download: expoDownloadPort(),
  };
}

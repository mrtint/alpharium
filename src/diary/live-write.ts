/**
 * 살아 있는 쓰기 등록부 (080).
 *
 * 계약: specs/080-live-write-registry/contracts/live-write.md R1~R10
 *       spec.md FR-001~FR-005·FR-019
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **무엇인가**: 지금 돌고 있는 쓰기 하나(또는 「일기 모두 지우기」 하나)가 드는 칸이다. 파이프라인이
 * 쓰기를 시작할 때 차지하고 끝나면 비운다. 칸이 차 있으면 다른 쓰기는 시작하지 않는다 — 온디바이스
 * 추론은 한 번에 모델 하나다(005 E1).
 *
 * **왜 파일도 나이도 없는가**: 020은 이 일을 잠금 파일로 했고, 쓰기 시작 때 적은 시각의 나이로
 * 「죽은 잠금」을 가렸다. 나이는 살아 있다는 증거가 아니었다 — 오래 도는 쓰기는 죽어 보였고(그 위에
 * 두 번째 쓰기가 섰다), 죽은 쓰기는 살아 보였다(10분 동안 쓰기를 막았다). 두 틈은 값을 어떻게 골라도
 * 서로 반대 방향이다.
 *
 * 앱 프로세스는 하나이고 런타임도 한 번에 하나다. 안드로이드의 헤드리스 태스크는 앱의 하나뿐인
 * 호스트에서 돌고 액티비티가 뜨면 그것을 넘겨받으며, iOS의 백그라운드 실행은 앱 프로세스를 평소대로
 * 띄운다. 그러니 **이 모듈이 모르는 쓰기는 살아 있지 않다** — 프로세스가 죽으면 이 값도 함께 사라지고,
 * 그것이 「죽은 쓰기는 다음 쓰기를 막지 않는다」의 전부다.
 *
 * ★ 위 전제는 라이브러리 소스를 읽은 것이고 078의 실기기 관찰과 맞지만, 직접 잰 값은 아니다
 * (research R1). 런타임만 갈리고 네이티브 생성이 남는 경우(개발 중 번들 다시 불러오기)는 막지 못한다.
 *
 * **이 파일은 순수하다.** 벽시계·타이머·파일·기기를 읽지 않는다(R9) — 읽는 순간 「얼마나 됐는가」로
 * 판정하는 길이 다시 열린다. 차지에는 비동기 경계가 없다(R2) — 확인과 넣기 사이에 다른 쓰기가
 * 끼어들 수 없다.
 *
 * **화면에 닿는 값은 날·주체·단계·끝·끊기뿐이다**(FR-019). 어느 것이 열렸는지, 얼마나 걸렸는지는
 * 여기 실리지 않는다(원칙 III·IV).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import type { AssemblyOwner } from "../inference/assembly";
import type { MonologueBranch, ProgressStage } from "../inference/types";

/** 쓰기의 끝. `cancelled`는 사용자가(또는 지우기가) 그 쓰기를 끊었다는 뜻이다 */
export type LiveWriteEnd = { ok: boolean; cancelled: boolean };

/** 쓰기가 지금 있는 단계 — 홈의 혼잣말이 고르는 갈래 */
export type LiveProgress = { stage: ProgressStage; branch?: MonologueBranch };

/** 칸에 든 쓰기. 들여다보는 쪽(홈·지우기)이 받는 모양이다 */
export type LiveWrite = {
  kind: "write";
  day: DayDate;
  owner: AssemblyOwner;
  /** 끝. 칸이 빈 뒤에 풀리고 던지지 않는다(R3·R6) */
  done: Promise<LiveWriteEnd>;
  /** 최근 단계. 한 번도 실리지 않았으면 `null` */
  progress(): LiveProgress | null;
  /** 단계가 바뀔 때마다 듣는다. 돌려준 함수로 끊는다 */
  onProgress(listener: (progress: LiveProgress) => void): () => void;
  /** 그만둠을 세우고 멈춤을 부른다. 끝남을 기다리지 않는다(R5) */
  cancel(): void;
};

export type LiveSlot = LiveWrite | { kind: "wipe" };

/** 쓰기를 차지한 쪽(파이프라인)이 쥐는 손잡이 */
export type WriteHandle = {
  publish(stage: ProgressStage, branch?: MonologueBranch): void;
  isCancelled(): boolean;
  end(result: { ok: boolean }): void;
};

/** 지우기를 차지한 쪽이 쥐는 손잡이 */
export type WipeHandle = { end(): void };

export interface LiveWrites {
  /** 칸에 든 것. 비었으면 `null` */
  current(): LiveSlot | null;
  /** 쓰기로 칸을 차지한다. 차 있으면 `null`(R1) */
  beginWrite(spec: {
    day: DayDate;
    owner: AssemblyOwner;
    stop?: () => unknown;
  }): WriteHandle | null;
  /** 지우기로 칸을 차지한다. 차 있으면 `null` */
  beginWipe(): WipeHandle | null;
  /** 칸이 차거나 빌 때마다 듣는다. 돌려준 함수로 끊는다 */
  onChange(listener: () => void): () => void;
}

/** 구독자 하나가 던져도 나머지와 부른 쪽은 이어진다 */
function notify<T>(listeners: ReadonlySet<(value: T) => void>, value: T): void {
  for (const listener of [...listeners]) {
    try {
      listener(value);
    } catch {
      // 듣는 쪽의 실패가 쓰기를 막지 않는다(R7·R8)
    }
  }
}

/**
 * 등록부를 만든다.
 *
 * **앱이 쓰는 것은 아래 `liveWrites` 하나다**(R10) — 이 함수는 테스트가 새 등록부를 얻는 자리다.
 */
export function createLiveWrites(): LiveWrites {
  let slot: LiveSlot | null = null;
  const changeListeners = new Set<(value: void) => void>();

  const changed = () => notify(changeListeners, undefined);

  return {
    current() {
      return slot;
    },

    beginWrite(spec) {
      if (slot !== null) return null;

      let cancelled = false;
      let ended = false;
      let latest: LiveProgress | null = null;
      const progressListeners = new Set<(progress: LiveProgress) => void>();
      let settle: (end: LiveWriteEnd) => void = () => {};
      const done = new Promise<LiveWriteEnd>((resolve) => {
        settle = resolve;
      });

      const view: LiveWrite = {
        kind: "write",
        day: spec.day,
        owner: spec.owner,
        done,
        progress: () => latest,
        onProgress(listener) {
          progressListeners.add(listener);
          return () => {
            progressListeners.delete(listener);
          };
        },
        cancel() {
          // 끝난 쓰기와 이미 끊은 쓰기에는 아무 일도 하지 않는다 — 멈춤은 한 번이다.
          if (ended || cancelled) return;
          cancelled = true;
          try {
            // 멈춤이 거부로 끝나도 잡히지 않은 거부로 남기지 않는다.
            void Promise.resolve(spec.stop?.()).catch(() => {});
          } catch {
            // 멈춤이 던져도 그만둠은 섰다 — 저장 직전 확인이 본다(P5)
          }
        },
      };
      slot = view;
      changed();

      return {
        publish(stage, branch) {
          latest = branch === undefined ? { stage } : { stage, branch };
          notify(progressListeners, latest);
        },
        isCancelled: () => cancelled,
        end(result) {
          if (ended) return;
          ended = true;
          // 그 사이 남이 차지한 칸은 건드리지 않는다(R4) — 이 쓰기가 든 칸일 때만 비운다.
          if (slot === view) slot = null;
          progressListeners.clear();
          settle({ ok: result.ok, cancelled });
          changed();
        },
      };
    },

    beginWipe() {
      if (slot !== null) return null;

      const mine: LiveSlot = { kind: "wipe" };
      let ended = false;
      slot = mine;
      changed();

      return {
        end() {
          if (ended) return;
          ended = true;
          if (slot === mine) slot = null;
          changed();
        },
      };
    },

    onChange(listener) {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },
  };
}

/** 앱이 쓰는 등록부. 화면·백그라운드 태스크·지우기가 모두 이 하나를 본다 */
export const liveWrites: LiveWrites = createLiveWrites();

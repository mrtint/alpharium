/**
 * 092 — iPhone 이어 쓰기 세션. 홈의 쓰기 하나에 하나다.
 *
 * 계약: specs/092-ios-continued-write/contracts/continued-write.md CW3·FR-007
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 홈이 쓰기를 시작할 때 시스템에 이어 하기를 신청하고(`start`), 진행 단계(`progress`)와 박동(`inference/heartbeat.ts`)을 시스템 진행 표시의
 * 보조 줄·막대로 옮기며, 쓰기가 끝나면 한 번 닫는다(`finish`). 시스템이 끝내면(만료) 홈에 쓰기를 끊으라고 알린다.
 *
 * **막대는 실제 일이 끝날 때만 움직인다**(FR-003, 원칙 V) — 단계가 바뀌거나 박동(사진 한 장·글 한 조각)이 올 때뿐이고 타이머가 없다.
 * 장 수·조각 수를 미리 모르므로(박동은 종류뿐, FR-004) 단계 몫 안에서 박동마다 남은 몫의 일부만큼 다가간다. 끝나기 전에는 가득 차지
 * 않는다 — 끝은 `finish`가 닫는다. 몫과 비율은 사람이 정한 값이다(research R3). 이 값은 밖으로 나가 표시에만 쓰인다 — 저장하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import { text } from "../i18n/current";
import { onBeat, type Beat } from "../inference/heartbeat";
import type { ProgressStage } from "../inference/types";
import { continuedWritePort, type ContinuedWritePort } from "./continued-write-port";

/** 시스템 진행 표시의 단계 — 보조 줄 문구 셋과 짝이다 */
export type ContinuedStage = "prepare" | "photos" | "writing";

/**
 * 막대의 전체 칸 수(네이티브 `progress.totalUnitCount`). 보고마다 값이 적어도 한 칸 올라야 하므로 넉넉하게 둔다 — 시스템은 보고 횟수가
 * 아니라 값이 오르는지를 보고, 값이 그대로인 공백이 익힌 간격보다 길면 멈춘 작업으로 끝낸다(2026-10-21 run I: 1000칸일 때 남은 몫에
 * 다가가는 걸음이 한 칸 아래로 줄어 947에서 36초 머문 뒤 만료).
 */
export const PROGRESS_TOTAL = 1_000_000;

/** 단계 몫 [시작, 끝] (칸). 글 단계가 끝까지 가도 95%다 — 사람이 정한 값(research R3) */
const SPANS: Readonly<Record<ContinuedStage, readonly [number, number]>> = {
  prepare: [0, 50_000],
  photos: [50_000, 450_000],
  writing: [450_000, 950_000],
};

const ORDER: readonly ContinuedStage[] = ["prepare", "photos", "writing"];

/**
 * 박동 하나가 단계의 남은 몫 중 채우는 비율 — 사진은 많아야 8장(023), 조각은 본문·제목 합쳐 열 개 남짓, 토큰은 수백 개다(짐작, 사람이
 * 정한 값). 토큰과 조각이 함께 오므로 둘 다 작게 둔다.
 */
const BEAT_SHARE: Readonly<Record<Beat, number>> = { photo: 1 / 4, chunk: 1 / 16, token: 1 / 400 };

/**
 * 092 — 박동에 따른 보고의 최소 간격(ms). 토큰 박동은 1초에 여러 번 올 수 있다 — 막대는 박동마다 앞으로 가되 네이티브 보고는 이 간격으로
 * 줄인다(사람이 정한 값). 단계가 바뀐 보고는 곧바로 보낸다. 시스템은 보고 간격을 익혀 그보다 크게 늦으면 멈춘 작업으로 끝내므로
 * (2026-10-21 실측, dasd `ProgressTracker`) 간격이 고르면 된다 — 줄이는 것은 그 간격을 망가뜨리지 않는다.
 */
export const MIN_REPORT_MS = 2_000;

/** 파이프라인 단계 → 진행 표시 단계. 캐릭터 모델 열기(`load`)는 글 단계에 든다 — 사진 뒤에 준비로 돌아가 보이지 않게 */
export function continuedStageOf(stage: ProgressStage): ContinuedStage {
  switch (stage) {
    case "signals":
      return "prepare";
    case "vision":
      return "photos";
    case "load":
    case "generation":
      return "writing";
  }
}

function subtitleOf(stage: ContinuedStage): string {
  return text().continued.stage[stage];
}

export type ContinuedSession = {
  /** 시스템이 받아들였는가. 참일 때만 홈은 앞을 벗어나도 쓰기를 끊지 않는다(FR-001) */
  readonly accepted: boolean;
  /** 파이프라인의 진행 단계 */
  progress(stage: ProgressStage): void;
  /** 쓰기가 끝났다. 한 번만 닫는다 — 이미 닫혔으면(만료 포함) 아무 일도 없다 */
  finish(ok: boolean): void;
};

export type ContinuedWrite = {
  /** 쓰기 하나를 신청한다. `onExpired`는 시스템이 끝냈을 때 한 번 불린다 — 그 쓰기를 끊는다(FR-006) */
  start(write: { name: string; day: DayDate }, onExpired: () => void): Promise<ContinuedSession>;
};

export function createContinuedWrite(
  port: ContinuedWritePort = continuedWritePort(),
  subscribe: (listener: (beat: Beat) => void) => () => void = onBeat,
  clock: () => number = () => Date.now(),
): ContinuedWrite {
  return {
    async start({ name, day }, onExpired) {
      const [, month, date] = day.split("-").map(Number);
      const title = text().continued.title(name, month, date);
      let stage: ContinuedStage = "prepare";
      const accepted = await port.begin(title, subtitleOf(stage)).catch(() => false);
      if (!accepted) {
        return { accepted: false, progress: () => {}, finish: () => {} };
      }

      let closed = false;
      let fraction = SPANS.prepare[0];
      let lastSent = Number.NEGATIVE_INFINITY;
      let lastCompleted = -1;
      const send = () => {
        lastSent = clock();
        // 보고마다 적어도 한 칸 오른다 — 끝(가득 참)은 `finish`의 몫이라 그 앞에서 멈춘다
        lastCompleted = Math.min(
          Math.max(Math.round(fraction), lastCompleted + 1),
          PROGRESS_TOTAL - 1,
        );
        fraction = Math.max(fraction, lastCompleted);
        port.report(subtitleOf(stage), lastCompleted, PROGRESS_TOTAL);
      };
      const close = () => {
        closed = true;
        offBeat();
        offExpired();
      };

      const offBeat = subscribe((kind) => {
        if (closed) return;
        const end = SPANS[stage][1];
        fraction += (end - fraction) * BEAT_SHARE[kind];
        if (clock() - lastSent >= MIN_REPORT_MS) send();
      });
      const offExpired = port.onExpired(() => {
        if (closed) return;
        // 네이티브가 이미 끝냈다 — 다시 닫지 않는다.
        close();
        onExpired();
      });
      send();

      return {
        accepted: true,
        progress(next) {
          if (closed) return;
          const mapped = continuedStageOf(next);
          if (ORDER.indexOf(mapped) <= ORDER.indexOf(stage)) return;
          stage = mapped;
          fraction = Math.max(fraction, SPANS[stage][0]);
          send();
        },
        finish(ok) {
          if (closed) return;
          close();
          port.finish(ok);
        },
      };
    },
  };
}
